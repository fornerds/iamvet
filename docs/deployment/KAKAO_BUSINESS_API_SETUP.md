# 카카오 알림톡 설정 가이드

카카오톡 SNS 회원가입 시 알림톡 템플릿을 사용한 환영 메시지를 자동으로 발송하기 위한 설정 가이드입니다.

## 사전 준비사항

1. **카카오 비즈니스 채널 개설**
   - [카카오 비즈니스 관리자 센터](https://business.kakao.com/)에서 채널 개설
   - 비즈니스 인증 완료

2. **카카오 개발자 콘솔 설정**
   - [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
   - 앱 설정 > 제품 설정 > 카카오 로그인 활성화

## 알림톡 템플릿 등록

### 1. 카카오 비즈니스 관리자 센터에서 템플릿 등록

1. [카카오 비즈니스 관리자 센터](https://business.kakao.com/) 접속
2. 알림톡 > 템플릿 관리 메뉴 이동
3. 템플릿 만들기 클릭
4. 템플릿 정보 입력:
   - **템플릿명**: 회원가입 환영 메시지
   - **템플릿 내용**:
     ```
     안녕하세요 😊

     수의학 커뮤니티 아이엠벳입니다.

     가입을 환영드리며, 앞으로 채용·강의 소식 등
     유용한 콘텐츠를 카카오톡으로 가장 빠르게 전달해드릴게요!
     ```
   - **버튼**: 선택사항 (예: "아이엠벳 바로가기" - 링크: https://www.iam-vet.com)
5. 템플릿 저장 및 승인 요청
6. 카카오 승인 완료 후 **템플릿 ID** 확인

### 2. 템플릿 변수 사용 (선택사항)

템플릿에 변수를 사용하려면 `#{변수명}` 형식으로 작성:

```
안녕하세요 😊

수의학 커뮤니티 아이엠벳입니다.

#{사용자명}님, 가입을 환영드리며, 앞으로 채용·강의 소식 등
유용한 콘텐츠를 카카오톡으로 가장 빠르게 전달해드릴게요!
```

## 환경 변수 설정

### 필수 환경 변수

다음 환경 변수들을 `.env.production` 또는 GitHub Secrets에 추가하세요:

```bash
# 카카오 OAuth (기존)
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"

# 카카오 비즈니스 API 활성화
USE_KAKAO_BUSINESS_API="true"

# 알림톡 템플릿 ID (카카오 비즈니스 관리자 센터에서 확인)
KAKAO_ALIMTALK_TEMPLATE_ID="your-template-id"
```

### GitHub Secrets 추가

GitHub Actions를 사용하는 경우, 다음 Secrets를 추가하세요:

- `USE_KAKAO_BUSINESS_API` (필수, 값: "true")
- `KAKAO_ALIMTALK_TEMPLATE_ID` (필수, 템플릿 ID)

## 동작 방식

1. **카카오 회원가입 완료**
   - 사용자가 카카오로 회원가입 완료
   - 전화번호 정보가 있는 경우

2. **알림톡 발송**
   - 회원가입 완료 후 자동으로 알림톡 발송
   - 등록된 템플릿을 사용하여 메시지 전송
   - 메시지 발송 실패해도 회원가입은 정상 완료 (비동기 처리)

## 템플릿 변수 설정 (선택사항)

템플릿에 변수를 사용한 경우, `KakaoBusinessService.ts`의 `sendWelcomeMessage` 메서드에서 변수 값을 설정해야 합니다:

```typescript
const templateArgs: Record<string, string> = {
  사용자명: userName,  // 템플릿의 #{사용자명} 변수에 값 전달
  // 다른 변수들...
};
```

## 주의사항

1. **템플릿 승인**
   - 알림톡 템플릿은 카카오 승인이 필요합니다
   - 승인 전까지는 테스트 발송만 가능합니다
   - 승인 완료 후 템플릿 ID를 환경 변수에 설정하세요

2. **전화번호 형식**
   - 전화번호는 하이픈 없이 숫자만 입력해야 합니다
   - 시스템에서 자동으로 하이픈을 제거합니다

3. **API 제한**
   - 카카오 비즈니스 API는 일일 발송량 제한이 있을 수 있습니다
   - 대량 발송 시 카카오 비즈니스 관리자 센터에서 제한 확인 필요

4. **비동기 처리**
   - 메시지 발송은 비동기로 처리되므로 회원가입 성공에 영향을 주지 않습니다
   - 발송 실패 시 로그에 기록됩니다

## 문제 해결

### 메시지가 발송되지 않는 경우

1. **환경 변수 확인**
   ```bash
   echo $USE_KAKAO_BUSINESS_API  # "true" 여야 함
   echo $KAKAO_ALIMTALK_TEMPLATE_ID  # 템플릿 ID 확인
   echo $KAKAO_CLIENT_ID
   echo $KAKAO_CLIENT_SECRET
   ```

2. **템플릿 ID 확인**
   - 카카오 비즈니스 관리자 센터에서 템플릿 ID 확인
   - 템플릿이 승인되었는지 확인

3. **전화번호 확인**
   - 회원가입 시 전화번호가 정상적으로 입력되었는지 확인
   - 전화번호 형식이 올바른지 확인 (하이픈 없이 숫자만)

4. **로그 확인**
   - 서버 로그에서 알림톡 발송 관련 오류 메시지 확인
   - 카카오 API 응답 메시지 확인

### 로그 확인

서버 로그에서 다음 메시지를 확인할 수 있습니다:

- 성공: `카카오 알림톡 환영 메시지 발송 성공`
- 실패: `카카오 알림톡 환영 메시지 발송 실패: {에러 메시지}`

## 참고 자료

- [카카오 비즈니스 관리자 센터](https://business.kakao.com/)
- [카카오 개발자 문서 - 알림톡](https://developers.kakao.com/docs/latest/ko/kakaotalk-rest-api/alimtalk)
- [카카오 비즈니스 API 가이드](https://developers.kakao.com/docs/latest/ko/business-api/overview)
