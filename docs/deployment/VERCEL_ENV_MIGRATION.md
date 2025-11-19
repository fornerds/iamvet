# Vercel 환경 변수 → AWS EC2 마이그레이션 가이드

Vercel에서 사용하던 환경 변수를 AWS EC2로 옮기는 방법입니다.

## 📋 1단계: Vercel 환경 변수 확인

### Vercel 대시보드에서 환경 변수 내보내기

1. Vercel 대시보드 접속: https://vercel.com/dashboard
2. 프로젝트 선택
3. Settings > Environment Variables 이동
4. 모든 환경 변수를 복사하거나 스크린샷으로 저장

또는 Vercel CLI 사용:

```bash
# Vercel CLI 설치 (아직 설치하지 않은 경우)
npm i -g vercel

# 로그인
vercel login

# 환경 변수 확인
vercel env ls
```

## 📝 2단계: 환경 변수 목록 작성

다음 환경 변수들이 있는지 확인하고 EC2로 옮겨야 합니다:

### 필수 환경 변수

```bash
# 데이터베이스
DATABASE_URL=

# JWT 설정
JWT_SECRET=
JWT_REFRESH_SECRET=
ADMIN_JWT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# AWS 설정
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET_NAME=
NEXT_PUBLIC_S3_BUCKET_NAME=
NEXT_PUBLIC_AWS_REGION=

# 도메인 및 URL
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_BASE_URL=
CORS_ORIGIN=

# OAuth 설정
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
NAVER_REDIRECT_URI=

# 네이버 맵
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=
NAVER_MAP_CLIENT_SECRET=

# 이메일 설정
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
EMAIL_USER=
EMAIL_APP_PASSWORD=

# 기타
NODE_ENV=production
```

## 🔧 3단계: deploy/config.sh 업데이트

`deploy/config.sh` 파일에 Vercel에서 가져온 환경 변수 값을 입력하세요:

```bash
# 예시: Vercel에서 가져온 값으로 업데이트
JWT_SECRET="vercel에서_가져온_값"
NEXTAUTH_SECRET="vercel에서_가져온_값"
# ... 나머지 환경 변수들도 동일하게 업데이트
```

## 🚀 4단계: EC2에 환경 변수 적용

### 방법 1: 배포 스크립트 사용 (권장)

`deploy/config.sh`를 업데이트한 후 배포 스크립트를 실행하면 자동으로 환경 변수가 적용됩니다:

```bash
cd deploy
./deploy-to-ec2.sh 3.38.238.205
```

### 방법 2: 수동으로 EC2에 환경 변수 설정

```bash
# SSH 접속
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205

# 환경 변수 파일 편집
cd /home/ubuntu/iamvet
nano .env.production

# Vercel에서 가져온 환경 변수들을 입력하고 저장
# Ctrl+X, Y, Enter로 저장

# PM2 재시작
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 restart iamvet
```

## ✅ 5단계: 환경 변수 확인

```bash
# EC2에 접속하여 환경 변수 확인
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 'cat /home/ubuntu/iamvet/.env.production | grep -v "^#" | grep -v "^$"'
```

## 🔄 6단계: OAuth 리다이렉트 URI 업데이트

Vercel에서 AWS로 전환했으므로 OAuth 리다이렉트 URI도 업데이트해야 합니다:

### 카카오 개발자 콘솔
1. https://developers.kakao.com 접속
2. 내 애플리케이션 > 앱 설정 > 플랫폼
3. Redirect URI를 `https://iam-vet.com/api/auth/kakao/callback`로 변경

### 구글 클라우드 콘솔
1. https://console.cloud.google.com 접속
2. API 및 서비스 > 사용자 인증 정보
3. OAuth 2.0 클라이언트 ID > 승인된 리디렉션 URI
4. `https://iam-vet.com/api/auth/google/callback` 추가

### 네이버 개발자 센터
1. https://developers.naver.com 접속
2. 내 애플리케이션 > API 설정 > 서비스 URL 및 Callback URL
3. Callback URL을 `https://iam-vet.com/api/auth/naver/callback`로 변경

## 📝 체크리스트

- [ ] Vercel에서 모든 환경 변수 확인 및 복사
- [ ] `deploy/config.sh` 파일 업데이트
- [ ] EC2에 환경 변수 적용 (배포 스크립트 또는 수동)
- [ ] 환경 변수 확인
- [ ] OAuth 리다이렉트 URI 업데이트
- [ ] 애플리케이션 재시작 및 테스트

## ⚠️ 주의사항

1. **민감한 정보 보호**: 환경 변수에는 비밀키, API 키 등이 포함되어 있으므로 Git에 커밋하지 마세요
2. **URL 변경**: `NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL` 등은 Vercel 도메인에서 AWS 도메인으로 변경해야 합니다
3. **OAuth 설정**: 모든 OAuth 제공자에서 리다이렉트 URI를 업데이트해야 합니다

