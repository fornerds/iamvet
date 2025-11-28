# GitHub Secrets 설정 체크리스트

GitHub Actions 자동 배포를 위해 필요한 모든 Secrets 목록입니다.

## ✅ 필수 Secrets

다음 Secrets를 GitHub 저장소에 추가하세요:

### EC2 접속 정보
- [ ] `EC2_HOST` - EC2 인스턴스 IP (예: `3.38.238.205`)
- [ ] `EC2_SSH_PRIVATE_KEY` - SSH 개인 키 전체 내용

### 데이터베이스
- [ ] `DATABASE_URL` - PostgreSQL 연결 문자열

### JWT 설정
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET` (선택사항)
- [ ] `ADMIN_JWT_SECRET`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL`

### AWS 설정
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `AWS_REGION`
- [ ] `AWS_S3_BUCKET_NAME`
- [ ] `NEXT_PUBLIC_S3_BUCKET_NAME`
- [ ] `NEXT_PUBLIC_AWS_REGION`

### 도메인 및 URL
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_BASE_URL`
- [ ] `CORS_ORIGIN`

### OAuth 설정
- [ ] `KAKAO_CLIENT_ID`
- [ ] `KAKAO_CLIENT_SECRET`
- [ ] `KAKAO_REDIRECT_URI`

### 카카오 알림톡 설정
- [ ] `USE_KAKAO_BUSINESS_API` - 카카오 비즈니스 API 활성화 (값: "true")
- [ ] `KAKAO_ALIMTALK_TEMPLATE_ID` - 알림톡 템플릿 ID (값: "126382")
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI`
- [ ] `NAVER_CLIENT_ID`
- [ ] `NAVER_CLIENT_SECRET`
- [ ] `NAVER_REDIRECT_URI`

### 네이버 맵
- [ ] `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`
- [ ] `NAVER_MAP_CLIENT_SECRET`

### 이메일 설정
- [ ] `SMTP_HOST`
- [ ] `SMTP_PORT`
- [ ] `SMTP_USER`
- [ ] `SMTP_PASS`
- [ ] `SMTP_FROM`
- [ ] `EMAIL_USER`
- [ ] `EMAIL_APP_PASSWORD`

## 📝 설정 방법

1. GitHub 저장소 접속
2. Settings > Secrets and variables > Actions
3. "New repository secret" 클릭
4. Name과 Secret 값 입력
5. "Add secret" 클릭

## 🔍 확인 방법

모든 Secrets를 추가한 후:

1. GitHub Actions 탭에서 워크플로우 실행
2. 로그에서 환경 변수 오류 확인
3. 배포 성공 여부 확인

## ⚠️ 주의사항

- Secrets는 암호화되어 저장됩니다
- 로그에 출력되지 않도록 주의하세요
- 값에 특수문자가 있으면 그대로 입력하세요 (자동 이스케이프됨)

