/**
 * 카카오 비즈니스 API 서비스
 * 알림톡 템플릿 기반 메시지 발송 기능 제공
 */

interface KakaoBusinessTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
  scope?: string;
}

interface AlimTalkTemplateRequest {
  template_id: string;
  template_args?: Record<string, string>;
}

interface SendMessageResult {
  success: boolean;
  message?: string;
  error?: string;
}

export class KakaoBusinessService {
  private static accessToken: string | null = null;
  private static tokenExpiresAt: number = 0;

  /**
   * 카카오 비즈니스 API 액세스 토큰 발급
   * 클라이언트 자격 증명 방식 사용
   */
  private static async getAccessToken(): Promise<string> {
    // 토큰이 유효한 경우 재사용
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const clientId = process.env.KAKAO_CLIENT_ID;
    const clientSecret = process.env.KAKAO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("KAKAO_CLIENT_ID 또는 KAKAO_CLIENT_SECRET 환경 변수가 설정되지 않았습니다.");
    }

    try {
      const response = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `카카오 비즈니스 API 토큰 발급 실패: ${errorData.error_description || errorData.error}`
        );
      }

      const data: KakaoBusinessTokenResponse = await response.json();
      this.accessToken = data.access_token;
      // 토큰 만료 시간 설정 (5분 여유를 두고 갱신)
      this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error("카카오 비즈니스 API 토큰 발급 오류:", error);
      throw error;
    }
  }

  /**
   * 카카오 알림톡 템플릿 발송
   * @param phoneNumber 수신자 전화번호 (하이픈 없이 숫자만)
   * @param templateId 템플릿 ID (카카오 비즈니스 관리자 센터에서 등록한 템플릿)
   * @param templateArgs 템플릿 변수 (템플릿에 사용된 변수명과 값)
   */
  static async sendAlimTalk(
    phoneNumber: string,
    templateId: string,
    templateArgs?: Record<string, string>
  ): Promise<SendMessageResult> {
    try {
      // 카카오 비즈니스 API 사용 여부 확인
      const useKakaoBusiness = process.env.USE_KAKAO_BUSINESS_API === "true";
      if (!useKakaoBusiness) {
        console.log("카카오 비즈니스 API가 비활성화되어 있습니다.");
        return {
          success: false,
          error: "카카오 비즈니스 API가 비활성화되어 있습니다.",
        };
      }

      // 필수 환경 변수 확인
      if (!process.env.KAKAO_CLIENT_ID || !process.env.KAKAO_CLIENT_SECRET) {
        console.error("카카오 API 클라이언트 정보가 설정되지 않았습니다.");
        return {
          success: false,
          error: "카카오 API 클라이언트 정보가 설정되지 않았습니다.",
        };
      }

      // 템플릿 ID 확인
      if (!templateId) {
        console.error("알림톡 템플릿 ID가 설정되지 않았습니다.");
        return {
          success: false,
          error: "알림톡 템플릿 ID가 설정되지 않았습니다.",
        };
      }

      // 액세스 토큰 발급
      const accessToken = await this.getAccessToken();

      // 전화번호 형식 정리 (하이픈 제거)
      const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, "");

      // 알림톡 발송 API 호출
      // 참고: https://developers.kakao.com/docs/latest/ko/kakaotalk-rest-api/alimtalk
      const requestBody: AlimTalkTemplateRequest = {
        template_id: templateId,
      };

      if (templateArgs && Object.keys(templateArgs).length > 0) {
        requestBody.template_args = templateArgs;
      }

      const response = await fetch(
        "https://kapi.kakao.com/v1/api/talk/memo/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            receiver_phone_number: cleanPhoneNumber,
            template_id: templateId,
            ...(templateArgs && Object.keys(templateArgs).length > 0
              ? { template_args: JSON.stringify(templateArgs) }
              : {}),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("카카오 알림톡 발송 실패:", errorData);
        return {
          success: false,
          error: errorData.msg || errorData.error_description || "알림톡 발송 실패",
        };
      }

      const result = await response.json();
      console.log("카카오 알림톡 발송 성공:", result);

      return {
        success: true,
        message: "알림톡이 성공적으로 발송되었습니다.",
      };
    } catch (error) {
      console.error("카카오 알림톡 발송 오류:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "카카오 알림톡 발송 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 카카오 회원가입 환영 알림톡 발송
   * @param phoneNumber 수신자 전화번호
   */
  static async sendWelcomeMessage(phoneNumber: string): Promise<SendMessageResult> {
    // 환경 변수에서 템플릿 ID 가져오기
    const templateId = process.env.KAKAO_ALIMTALK_TEMPLATE_ID;
    
    if (!templateId) {
      console.error("KAKAO_ALIMTALK_TEMPLATE_ID 환경 변수가 설정되지 않았습니다.");
      return {
        success: false,
        error: "알림톡 템플릿 ID가 설정되지 않았습니다.",
      };
    }

    // 템플릿 변수 (템플릿에 따라 조정 필요)
    // 예시: 템플릿에 #{사이트명} 같은 변수가 있다면
    const templateArgs: Record<string, string> = {
      // 템플릿에 정의된 변수명과 값
      // 예: site_name: "아이엠벳"
    };

    return this.sendAlimTalk(phoneNumber, templateId, templateArgs);
  }
}
