# Vercel 환경 변수 → GitHub Secrets 마이그레이션 가이드

Vercel에서 사용하던 환경 변수를 GitHub Secrets로 옮기는 방법입니다.

## 📋 1단계: Vercel에서 환경 변수 확인

### 방법 1: Vercel 대시보드에서 확인

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard 접속
   - 로그인

2. **프로젝트 선택**
   - 해당 프로젝트 클릭

3. **환경 변수 확인**
   - Settings > Environment Variables 메뉴 이동
   - 모든 환경 변수 목록 확인

4. **환경 변수 내보내기**
   - 각 환경 변수를 하나씩 복사하거나
   - 스크린샷으로 저장

### 방법 2: Vercel CLI 사용

```bash
# Vercel CLI 설치 (아직 설치하지 않은 경우)
npm i -g vercel

# 로그인
vercel login

# 환경 변수 확인
vercel env ls

# 특정 환경 변수 값 확인
vercel env pull .env.vercel
```

## 📝 2단계: 필요한 환경 변수 목록

다음 환경 변수들을 확인하고 GitHub Secrets로 옮겨야 합니다:

### 필수 환경 변수 (GitHub Secrets에 추가 필요)

| Secret 이름 | 설명 | Vercel에서 확인 |
|------------|------|----------------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | ✅ 필수 |
| `JWT_SECRET` | JWT 비밀키 | ✅ 필수 |
| `JWT_REFRESH_SECRET` | JWT 리프레시 토큰 비밀키 | 선택 |
| `ADMIN_JWT_SECRET` | 관리자 JWT 비밀키 | ✅ 필수 |
| `NEXTAUTH_SECRET` | NextAuth 비밀키 | ✅ 필수 |
| `NEXTAUTH_URL` | NextAuth URL | ✅ 필수 |
| `AWS_ACCESS_KEY_ID` | AWS 액세스 키 | ✅ 필수 |
| `AWS_SECRET_ACCESS_KEY` | AWS 시크릿 키 | ✅ 필수 |
| `AWS_REGION` | AWS 리전 | ✅ 필수 |
| `AWS_S3_BUCKET_NAME` | S3 버킷 이름 | ✅ 필수 |
| `NEXT_PUBLIC_S3_BUCKET_NAME` | 공개 S3 버킷 이름 | ✅ 필수 |
| `NEXT_PUBLIC_AWS_REGION` | 공개 AWS 리전 | ✅ 필수 |
| `NEXT_PUBLIC_SITE_URL` | 사이트 URL | ✅ 필수 |
| `NEXT_PUBLIC_API_URL` | API URL | ✅ 필수 |
| `NEXT_PUBLIC_BASE_URL` | 베이스 URL | ✅ 필수 |
| `CORS_ORIGIN` | CORS 허용 도메인 | ✅ 필수 |
| `KAKAO_CLIENT_ID` | 카카오 클라이언트 ID | ✅ 필수 |
| `KAKAO_CLIENT_SECRET` | 카카오 클라이언트 시크릿 | ✅ 필수 |
| `KAKAO_REDIRECT_URI` | 카카오 리다이렉트 URI | ✅ 필수 |
| `GOOGLE_CLIENT_ID` | 구글 클라이언트 ID | ✅ 필수 |
| `GOOGLE_CLIENT_SECRET` | 구글 클라이언트 시크릿 | ✅ 필수 |
| `GOOGLE_REDIRECT_URI` | 구글 리다이렉트 URI | ✅ 필수 |
| `NAVER_CLIENT_ID` | 네이버 클라이언트 ID | ✅ 필수 |
| `NAVER_CLIENT_SECRET` | 네이버 클라이언트 시크릿 | ✅ 필수 |
| `NAVER_REDIRECT_URI` | 네이버 리다이렉트 URI | ✅ 필수 |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | 네이버 맵 클라이언트 ID | ✅ 필수 |
| `NAVER_MAP_CLIENT_SECRET` | 네이버 맵 클라이언트 시크릿 | 선택 |
| `SMTP_HOST` | SMTP 호스트 | 선택 |
| `SMTP_PORT` | SMTP 포트 | 선택 |
| `SMTP_USER` | SMTP 사용자 | 선택 |
| `SMTP_PASS` | SMTP 비밀번호 | 선택 |
| `SMTP_FROM` | 발신자 이메일 | 선택 |
| `EMAIL_USER` | 이메일 사용자 | 선택 |
| `EMAIL_APP_PASSWORD` | 이메일 앱 비밀번호 | 선택 |

**참고**: `NODE_ENV=production`은 자동으로 설정되므로 추가할 필요 없습니다.

## 🔧 3단계: GitHub Secrets에 추가

### GitHub Secrets 설정 방법

1. **GitHub 저장소 접속**
   - https://github.com/fornerds/iamvet 접속
   - Settings 메뉴 클릭

2. **Secrets 메뉴 이동**
   - 왼쪽 메뉴에서 "Secrets and variables" > "Actions" 클릭
   - "New repository secret" 버튼 클릭

3. **환경 변수 추가**
   - **Name**: 환경 변수 이름 입력 (예: `DATABASE_URL`)
   - **Secret**: Vercel에서 가져온 값 입력
   - "Add secret" 클릭

4. **모든 환경 변수 반복**
   - 위의 환경 변수 목록을 하나씩 추가

### 빠른 추가 방법 (여러 개 한 번에)

GitHub CLI를 사용하면 더 빠르게 추가할 수 있습니다:

```bash
# GitHub CLI 설치 (선택사항)
brew install gh  # Mac
# 또는 https://cli.github.com/ 에서 다운로드

# 로그인
gh auth login

# 환경 변수 파일에서 일괄 추가 (예시)
gh secret set DATABASE_URL < .env.vercel
gh secret set JWT_SECRET < .env.vercel
# ... 각 환경 변수마다 반복
```

## 📋 4단계: GitHub Actions에서 환경 변수 사용

GitHub Actions 워크플로우가 자동으로 환경 변수를 EC2에 전달하도록 설정되어 있습니다.

환경 변수는 다음 방식으로 사용됩니다:
- `${{ secrets.ENV_VAR_NAME }}` 형식으로 참조
- EC2에 접속하여 `.env.production` 파일에 자동으로 작성

## ✅ 5단계: 확인

모든 환경 변수를 추가한 후:

1. **Secrets 목록 확인**
   - GitHub 저장소 > Settings > Secrets and variables > Actions
   - 추가한 모든 Secrets가 표시되는지 확인

2. **자동 배포 테스트**
   - `main` 브랜치에 푸시
   - GitHub Actions 탭에서 배포 로그 확인
   - 환경 변수 오류가 없는지 확인

## 🔐 보안 주의사항

1. **민감한 정보 보호**
   - Secrets는 암호화되어 저장됩니다
   - 로그에 출력되지 않도록 주의

2. **접근 권한**
   - 저장소 관리자만 Secrets를 볼 수 있습니다
   - 필요시 팀 멤버에게 접근 권한 부여

3. **정기적 업데이트**
   - 환경 변수가 변경되면 GitHub Secrets도 업데이트
   - 만료된 키나 토큰은 즉시 갱신

## 📝 체크리스트

- [ ] Vercel에서 모든 환경 변수 확인 및 복사
- [ ] GitHub Secrets에 모든 환경 변수 추가
- [ ] Secrets 목록 확인
- [ ] 자동 배포 테스트
- [ ] 배포 로그에서 환경 변수 오류 확인

## 🔗 참고

- [GitHub Secrets 문서](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel 환경 변수 문서](https://vercel.com/docs/concepts/projects/environment-variables)

