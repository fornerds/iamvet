/**
 * 카카오 비즈니스 API 서비스
 * 플러스친구 메시지 발송 기능 제공
 */

interface KakaoBusinessTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
  scope?: string;
}

interface KakaoTalkMessageRequest {
  receiver_uuids: string[];
  template_object: {
    object_type: string;
    text: string;
    link: {
      web_url?: string;
      mobile_web_url?: string;
    };
    button_title?: string;
  };
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
   * 카카오톡 친구 목록 조회 (UUID 가져오기)
   * @param userAccessToken 사용자 액세스 토큰 (카카오 로그인 시 받은 토큰)
   */
  static async getFriendUuids(userAccessToken: string): Promise<string[]> {
    try {
      const response = await fetch("https://kapi.kakao.com/v1/api/talk/friends", {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("카카오톡 친구 목록 조회 실패:", errorData);
        return [];
      }

      const data = await response.json();
      // 친구 목록에서 UUID 추출
      return data.elements?.map((friend: any) => friend.uuid) || [];
    } catch (error) {
      console.error("카카오톡 친구 목록 조회 오류:", error);
      return [];
    }
  }

  /**
   * 카카오톡 플러스친구 메시지 발송
   * @param receiverUuid 카카오톡 사용자 UUID (카카오 로그인 시 받은 정보 또는 친구 목록에서 조회)
   * @param message 메시지 내용
   * @param linkUrl 링크 URL (선택)
   */
  static async sendPlusFriendMessage(
    receiverUuid: string,
    message: string,
    linkUrl?: string
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

      // 액세스 토큰 발급
      const accessToken = await this.getAccessToken();

      // 메시지 템플릿 구성
      const templateObject: KakaoTalkMessageRequest["template_object"] = {
        object_type: "text",
        text: message,
        link: {
          web_url: linkUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://www.iam-vet.com",
          mobile_web_url: linkUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://www.iam-vet.com",
        },
        button_title: "아이엠벳 바로가기",
      };

      // 카카오톡 메시지 발송 API 호출
      const response = await fetch(
        "https://kapi.kakao.com/v1/api/talk/friends/message/default/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            receiver_uuids: JSON.stringify([receiverUuid]),
            template_object: JSON.stringify(templateObject),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("카카오톡 메시지 발송 실패:", errorData);
        return {
          success: false,
          error: errorData.msg || errorData.error_description || "메시지 발송 실패",
        };
      }

      const result = await response.json();
      console.log("카카오톡 메시지 발송 성공:", result);

      return {
        success: true,
        message: "메시지가 성공적으로 발송되었습니다.",
      };
    } catch (error) {
      console.error("카카오톡 메시지 발송 오류:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "카카오톡 메시지 발송 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 카카오 회원가입 환영 메시지 발송
   * @param receiverUuid 카카오톡 사용자 UUID
   * @param userName 사용자 이름 (현재는 사용하지 않음)
   */
  static async sendWelcomeMessage(
    receiverUuid: string,
    userName: string
  ): Promise<SendMessageResult> {
    const welcomeMessage = `안녕하세요 😊

수의학 커뮤니티 아이엠벳입니다.

가입을 환영드리며, 앞으로 채용·강의 소식 등
유용한 콘텐츠를 카카오톡으로 가장 빠르게 전달해드릴게요!`;

    return this.sendPlusFriendMessage(
      receiverUuid,
      welcomeMessage,
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.iam-vet.com"
    );
  }
}

