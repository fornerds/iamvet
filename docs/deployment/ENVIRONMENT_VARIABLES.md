# 환경 변수 관리 가이드

## 개요
이 문서는 프로덕션 환경에서 환경 변수를 관리하는 방법을 설명합니다.

## 환경 변수 소스

### 1. GitHub Secrets
- **위치**: GitHub 저장소 → Settings → Secrets and variables → Actions
- **용도**: GitHub Actions 배포 시 사용
- **형식**: 원본 값 (URL 인코딩 제거)

### 2. 서버 `.env.production`
- **위치**: `/home/ubuntu/iamvet/.env.production`
- **용도**: PM2가 애플리케이션 실행 시 로드
- **생성**: GitHub Actions 배포 시 자동 생성
- **백업**: 자동 백업 (`.env.production.backup.YYYYMMDD_HHMMSS`)

### 3. PM2 환경 변수
- **소스**: `ecosystem.config.js`가 `.env.production`에서 로드
- **용도**: Next.js 애플리케이션 실행 시 사용

## 필수 환경 변수

### 데이터베이스
- `DATABASE_URL`: PostgreSQL 연결 문자열
  - **형식**: `postgresql://user:password@host:port/database?sslmode=require`
  - **주의**: 특수 문자(`!`, `#`)는 URL 인코딩하지 않고 원본 사용

### 인증
- `JWT_SECRET`: JWT 토큰 서명 키
- `ADMIN_JWT_SECRET`: 관리자 JWT 토큰 서명 키
- `NEXTAUTH_SECRET`: NextAuth 시크릿 키
- `NEXTAUTH_URL`: NextAuth URL

### AWS
- `AWS_ACCESS_KEY_ID`: AWS 액세스 키 ID
- `AWS_SECRET_ACCESS_KEY`: AWS 시크릿 액세스 키
- `AWS_REGION`: AWS 리전
- `AWS_S3_BUCKET_NAME`: S3 버킷 이름
- `NEXT_PUBLIC_S3_BUCKET_NAME`: 클라이언트용 S3 버킷 이름
- `NEXT_PUBLIC_AWS_REGION`: 클라이언트용 AWS 리전

### OAuth
- `GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 클라이언트 시크릿
- `KAKAO_CLIENT_ID`: Kakao OAuth 클라이언트 ID
- `KAKAO_CLIENT_SECRET`: Kakao OAuth 클라이언트 시크릿
- `NAVER_CLIENT_ID`: Naver OAuth 클라이언트 ID
- `NAVER_CLIENT_SECRET`: Naver OAuth 클라이언트 시크릿

### 기타
- `NEXT_PUBLIC_SITE_URL`: 사이트 URL
- `NEXT_PUBLIC_API_URL`: API URL
- `EMAIL_USER`: 이메일 사용자명
- `EMAIL_APP_PASSWORD`: 이메일 앱 비밀번호

## 환경 변수 설정 방법

### GitHub Secrets 설정
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. New repository secret 클릭
3. Name과 Value 입력
4. **주의**: DATABASE_URL은 URL 디코딩된 값 사용

### 서버에서 직접 설정 (비권장)
```bash
# 서버 접속
ssh -i deploy/keys/your-key.pem ubuntu@YOUR_EC2_IP

# .env.production 편집
cd /home/ubuntu/iamvet
nano .env.production

# PM2 재시작
pm2 restart iamvet
```

## 환경 변수 검증

### GitHub Actions에서 검증
```yaml
- name: Validate Secrets
  run: |
    if [ -z "${{ secrets.DATABASE_URL }}" ]; then
      echo "❌ DATABASE_URL Secret이 설정되지 않았습니다!"
      exit 1
    fi
```

### 서버에서 검증
```bash
# .env.production 확인
grep "^DATABASE_URL" .env.production

# ecosystem.config.js 테스트
node -e "const config = require('./ecosystem.config.js'); console.log('DATABASE_URL:', config.apps[0].env.DATABASE_URL ? '설정됨' : '없음');"

# PM2 환경 변수 확인
pm2 env 0 | grep DATABASE_URL
```

## 문제 해결

### DATABASE_URL이 로드되지 않는 경우
1. `.env.production` 파일 확인
2. `ecosystem.config.js`가 올바르게 생성되었는지 확인
3. PM2 재시작: `pm2 restart iamvet`
4. PM2 완전 재시작: `pm2 delete iamvet && pm2 start ecosystem.config.js`

### 환경 변수가 덮어씌워지는 경우
- GitHub Actions 배포 시 `.env.production` 파일이 자동 생성됨
- 수동 수정은 배포 시 덮어씌워질 수 있음
- 환경 변수 변경은 GitHub Secrets에서 수정 후 재배포

## 보안 주의사항

1. **절대 커밋하지 않기**: `.env.production` 파일은 `.gitignore`에 포함되어야 함
2. **백업 보관**: 환경 변수 값을 안전한 곳에 백업 (비밀 관리 도구 사용 권장)
3. **정기 변경**: JWT_SECRET 등은 정기적으로 변경
4. **접근 제한**: `.env.production` 파일 권한 확인 (`chmod 600 .env.production`)

