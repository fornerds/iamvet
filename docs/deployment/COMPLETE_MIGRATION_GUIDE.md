# Vercel → AWS 완전 전환 가이드

Vercel에서 AWS로 완전히 전환하는 전체 가이드입니다.

## 📋 전환 체크리스트

> **⚠️ 중요**: 클라이언트가 관리하는 AWS 및 OAuth 서비스 설정 변경이 필요합니다.
> 
> **클라이언트용 가이드**: [클라이언트 설정 가이드](CLIENT_SETUP_GUIDE.md) | [클라이언트 설정 체크리스트](CLIENT_SETUP_CHECKLIST.md)

### 1단계: 환경 변수 마이그레이션 (개발팀)
- [ ] Vercel 환경 변수 확인 및 복사
- [ ] `deploy/config.sh` 업데이트
- [ ] EC2에 환경 변수 적용

### 2단계: DNS 및 OAuth 설정 (클라이언트)
- [ ] Route 53 호스팅 영역 생성
- [ ] 도메인 등록 기관에서 네임서버 변경
- [ ] A 레코드 생성 (루트 도메인)
- [ ] A 레코드 생성 (www 서브도메인)
- [ ] 카카오 개발자 콘솔 Redirect URI 변경
- [ ] 구글 클라우드 콘솔 Redirect URI 변경
- [ ] 네이버 개발자 센터 Callback URL 변경
- [ ] DNS 전파 확인

### 3단계: SSL 인증서 설정
- [ ] Certbot 설치
- [ ] SSL 인증서 발급
- [ ] 자동 갱신 설정

### 4단계: Nginx 설정
- [ ] Nginx SSL 설정 적용
- [ ] www/non-www 리다이렉트 설정
- [ ] HTTPS 강제 리다이렉트 설정

### 5단계: 최종 확인
- [ ] 도메인 접속 테스트
- [ ] SSL 인증서 확인
- [ ] www 리다이렉트 확인
- [ ] 애플리케이션 기능 테스트

## 🚀 빠른 시작 가이드

### 1. 환경 변수 마이그레이션

```bash
# Vercel에서 환경 변수 확인
# Vercel 대시보드 > Settings > Environment Variables

# deploy/config.sh 업데이트
nano deploy/config.sh
# Vercel에서 가져온 환경 변수 값들을 입력

# 배포 (환경 변수 자동 적용)
cd deploy
./deploy-to-ec2.sh 3.38.238.205
```

자세한 내용: [Vercel 환경 변수 마이그레이션 가이드](VERCEL_ENV_MIGRATION.md)

### 2. DNS 설정

```bash
# Route 53 콘솔에서:
# 1. 호스팅 영역 생성 (iam-vet.com)
# 2. A 레코드 생성 (루트 도메인 → 3.38.238.205)
# 3. A 레코드 생성 (www → 3.38.238.205)
```

자세한 내용: [AWS DNS 설정 가이드](AWS_DNS_SETUP.md)

### 3. SSL 인증서 설정

```bash
# SSL 인증서 발급
cd deploy
./setup-ssl.sh 3.38.238.205 iam-vet.com
```

### 4. Nginx SSL 설정

```bash
# Nginx SSL 설정 (www/non-www 처리 포함)
cd deploy
./setup-nginx-ssl.sh 3.38.238.205 iam-vet.com
```

## 📝 단계별 상세 가이드

### Step 1: Vercel 환경 변수 확인

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. Settings > Environment Variables
4. 모든 환경 변수를 복사

### Step 2: deploy/config.sh 업데이트

```bash
# deploy/config.sh 파일 열기
nano deploy/config.sh

# 다음 변수들을 Vercel에서 가져온 값으로 업데이트:
# - JWT_SECRET
# - NEXTAUTH_SECRET
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - OAuth 클라이언트 ID/Secret
# - 기타 모든 환경 변수
```

### Step 3: Route 53 DNS 설정 (클라이언트 작업)

> **클라이언트가 수행해야 할 작업입니다.** 자세한 내용은 [클라이언트 설정 가이드](CLIENT_SETUP_GUIDE.md#1-aws-route-53-dns-설정)를 참조하세요.

1. **Route 53 콘솔 접속**
   - https://console.aws.amazon.com/route53

2. **호스팅 영역 생성**
   - 호스팅 영역 > 호스팅 영역 생성
   - 도메인 이름: `iam-vet.com`
   - 유형: 공용 호스팅 영역

3. **A 레코드 생성**
   - 레코드 생성
   - 레코드 이름: (비워두기 - 루트 도메인)
   - 레코드 유형: A
   - 값: `3.38.238.205` (EC2 Elastic IP)

4. **www A 레코드 생성**
   - 레코드 생성
   - 레코드 이름: `www`
   - 레코드 유형: A
   - 값: `3.38.238.205`

### Step 4: SSL 인증서 발급

```bash
# EC2에 SSH 접속
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205

# Certbot 설치
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d iam-vet.com -d www.iam-vet.com

# 또는 스크립트 사용
cd deploy
./setup-ssl.sh 3.38.238.205 iam-vet.com
```

### Step 5: Nginx SSL 설정

```bash
# Nginx SSL 설정 스크립트 실행
cd deploy
./setup-nginx-ssl.sh 3.38.238.205 iam-vet.com
```

이 스크립트는:
- HTTP → HTTPS 리다이렉트
- www → non-www 리다이렉트
- SSL 인증서 설정
- 보안 헤더 추가

### Step 6: OAuth 리다이렉트 URI 업데이트 (클라이언트 작업)

> **클라이언트가 수행해야 할 작업입니다.** 자세한 내용은 [클라이언트 설정 가이드](CLIENT_SETUP_GUIDE.md)를 참조하세요.

#### 카카오
- [클라이언트 설정 가이드 - 카카오](CLIENT_SETUP_GUIDE.md#2-카카오-개발자-콘솔-설정)
- Redirect URI: `https://iam-vet.com/api/auth/kakao/callback`

#### 구글
- [클라이언트 설정 가이드 - 구글](CLIENT_SETUP_GUIDE.md#3-구글-클라우드-콘솔-설정)
- Redirect URI: `https://iam-vet.com/api/auth/google/callback`

#### 네이버
- [클라이언트 설정 가이드 - 네이버](CLIENT_SETUP_GUIDE.md#4-네이버-개발자-센터-설정)
- Callback URL: `https://iam-vet.com/api/auth/naver/callback`

### Step 7: 환경 변수 URL 업데이트

`deploy/config.sh`에서 다음 변수들을 업데이트:

```bash
NEXT_PUBLIC_SITE_URL="https://iam-vet.com"
NEXT_PUBLIC_API_URL="https://iam-vet.com/api"
NEXT_PUBLIC_BASE_URL="https://iam-vet.com"
NEXTAUTH_URL="https://iam-vet.com"
CORS_ORIGIN="https://iam-vet.com"
KAKAO_REDIRECT_URI="https://iam-vet.com/api/auth/kakao/callback"
GOOGLE_REDIRECT_URI="https://iam-vet.com/api/auth/google/callback"
NAVER_REDIRECT_URI="https://iam-vet.com/api/auth/naver/callback"
```

그리고 다시 배포:

```bash
cd deploy
./deploy-to-ec2.sh 3.38.238.205
```

## ✅ 최종 확인

### 1. 도메인 접속 테스트

```bash
# HTTP 접속 (HTTPS로 리다이렉트되어야 함)
curl -I http://iam-vet.com
curl -I http://www.iam-vet.com

# HTTPS 접속
curl -I https://iam-vet.com

# www 접속 (non-www로 리다이렉트되어야 함)
curl -I https://www.iam-vet.com
```

### 2. 브라우저에서 확인

- https://iam-vet.com 접속
- https://www.iam-vet.com 접속 (자동으로 non-www로 리다이렉트)
- SSL 인증서 확인 (자물쇠 아이콘)
- 모든 기능 테스트

### 3. OAuth 로그인 테스트

- 카카오 로그인
- 구글 로그인
- 네이버 로그인

## 🔄 Vercel 비활성화

모든 것이 정상 작동하는 것을 확인한 후:

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. Settings > General > Delete Project
4. 또는 도메인 연결 해제

## 🛠️ 문제 해결

### DNS가 전파되지 않음

- 최대 48시간까지 소요될 수 있습니다
- `dig iam-vet.com` 명령어로 확인

### SSL 인증서 발급 실패

- 도메인이 EC2를 가리키고 있는지 확인
- 방화벽에서 80, 443 포트가 열려있는지 확인

### www 리다이렉트가 작동하지 않음

- Nginx 설정 확인: `sudo nginx -t`
- Nginx 재시작: `sudo systemctl restart nginx`

## 📚 관련 문서

### 개발팀용 문서
- [Vercel 환경 변수 마이그레이션](VERCEL_ENV_MIGRATION.md)
- [AWS DNS 설정](AWS_DNS_SETUP.md)
- [AWS 배포 가이드](AWS_DEPLOYMENT.md)

### 클라이언트용 문서
- [클라이언트 설정 가이드](CLIENT_SETUP_GUIDE.md) - 상세한 단계별 가이드
- [클라이언트 설정 체크리스트](CLIENT_SETUP_CHECKLIST.md) - 빠른 체크리스트

