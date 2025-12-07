# Vercel 마이그레이션 가이드

AWS EC2에서 Vercel로 마이그레이션하는 완전한 가이드입니다.

## 🎯 왜 Vercel인가?

### 현재 AWS EC2 문제점

1. **메모리 부족**: 3.7GB 메모리로 부족
2. **수동 관리**: 서버 관리 필요
3. **OOM 킬러**: 메모리 부족 시 프로세스 종료
4. **안정성 문제**: 주기적인 재시작 필요

### Vercel의 장점

1. **자동 스케일링**: 트래픽에 따라 자동 확장
2. **서버리스**: 메모리 문제 없음
3. **무료 티어**: 소규모 프로젝트 무료
4. **자동 배포**: Git 푸시 시 자동 배포
5. **CDN 내장**: 전 세계 빠른 응답
6. **SSL 자동**: Let's Encrypt 자동 설정

## 📋 마이그레이션 단계

### 1단계: Vercel 프로젝트 생성

#### 방법 1: Vercel 대시보드 사용

1. **Vercel 접속**: https://vercel.com
2. **로그인**: GitHub 계정으로 로그인
3. **프로젝트 추가**: "Add New" > "Project"
4. **저장소 선택**: `fornerds/iamvet` 선택
5. **프로젝트 설정**:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
6. **프로젝트 생성**

#### 방법 2: Vercel CLI 사용

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 프로젝트 배포
cd /path/to/iamvet
vercel

# 프로덕션 배포
vercel --prod
```

### 2단계: 환경 변수 설정

Vercel 대시보드에서:

1. **Settings** > **Environment Variables** 이동
2. 다음 환경 변수 추가:

```bash
# 데이터베이스
DATABASE_URL=postgresql://...

# JWT 설정
JWT_SECRET=...
JWT_REFRESH_SECRET=...
ADMIN_JWT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://iam-vet.com

# AWS 설정
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET_NAME=iamvet
NEXT_PUBLIC_S3_BUCKET_NAME=iamvet
NEXT_PUBLIC_AWS_REGION=ap-northeast-2

# 도메인 및 URL
NEXT_PUBLIC_SITE_URL=https://iam-vet.com
NEXT_PUBLIC_API_URL=https://iam-vet.com/api
NEXT_PUBLIC_BASE_URL=https://iam-vet.com
CORS_ORIGIN=https://iam-vet.com

# OAuth 설정
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
KAKAO_REDIRECT_URI=https://iam-vet.com/api/auth/kakao/callback
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://iam-vet.com/api/auth/google/callback
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
NAVER_REDIRECT_URI=https://iam-vet.com/api/auth/naver/callback

# 네이버 맵
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=...
NAVER_MAP_CLIENT_SECRET=...

# 이메일 설정
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
EMAIL_USER=...
EMAIL_APP_PASSWORD=...

# 카카오 알림톡
USE_KAKAO_BUSINESS_API=true
KAKAO_ALIMTALK_TEMPLATE_ID=...

# 기타
NODE_ENV=production
```

### 3단계: 도메인 연결

1. **Vercel 대시보드** > **Settings** > **Domains**
2. **도메인 추가**: `iam-vet.com` 입력
3. **DNS 설정 안내 확인**:
   - CNAME 레코드: `cname.vercel-dns.com`
   - 또는 A 레코드: Vercel이 제공하는 IP 주소

4. **Route 53에서 DNS 설정**:
   ```
   iam-vet.com → CNAME → cname.vercel-dns.com
   www.iam-vet.com → CNAME → cname.vercel-dns.com
   ```

### 4단계: 자동 배포 설정

Vercel은 GitHub 저장소와 연결하면 자동으로 배포됩니다:

1. **Settings** > **Git**
2. **Production Branch**: `main` 설정
3. **자동 배포 활성화**

이제 `main` 브랜치에 푸시하면 자동으로 배포됩니다.

### 5단계: 테스트 및 검증

1. **배포 확인**: Vercel 대시보드에서 배포 상태 확인
2. **기능 테스트**: 모든 주요 기능 테스트
3. **성능 확인**: 응답 시간 및 안정성 확인

### 6단계: AWS EC2 중지 (선택사항)

모든 것이 정상 작동하면:

1. **EC2 인스턴스 중지**: AWS 콘솔에서 인스턴스 중지
2. **비용 절감**: 인스턴스 중지 시 비용 절감

## 🔄 롤백 계획

문제 발생 시:

1. **Vercel 배포 롤백**: 이전 배포로 롤백
2. **AWS EC2 재시작**: 필요 시 EC2 재시작
3. **DNS 되돌리기**: Route 53에서 원래 설정으로 복구

## 📊 비교표

| 항목 | AWS EC2 | Vercel |
|------|---------|--------|
| **설정** | 복잡 | 간단 |
| **메모리 관리** | 수동 | 자동 |
| **스케일링** | 수동 | 자동 |
| **비용** | $30-60/월 | 무료~$20/월 |
| **안정성** | 중간 | 높음 |
| **배포 속도** | 5-10분 | 2-3분 |
| **CDN** | 별도 설정 | 내장 |
| **SSL** | 수동 설정 | 자동 |

## ⚠️ 주의사항

### 1. 서버리스 제한

- **함수 실행 시간**: 최대 10초 (Pro: 60초)
- **메모리**: 함수당 최대 1GB
- **동시 실행**: 제한 있음

### 2. 데이터베이스 연결

- **연결 풀**: 서버리스 환경에서는 연결 풀 관리 필요
- **Prisma**: 연결 풀 설정 필수
- **Cold Start**: 첫 요청 시 지연 가능

### 3. 파일 시스템

- **읽기 전용**: `/tmp`만 쓰기 가능
- **영구 저장**: S3 사용 필요

## 🎯 권장 사항

### Vercel 마이그레이션 권장 시나리오

✅ **권장**:
- 트래픽이 중간 이하
- 서버 관리 부담을 줄이고 싶음
- 비용 절감이 중요
- 빠른 배포가 필요

❌ **비권장**:
- 매우 높은 트래픽
- 긴 실행 시간이 필요한 작업
- 특수한 서버 설정 필요

## 📝 체크리스트

- [ ] Vercel 계정 생성
- [ ] 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] 도메인 연결
- [ ] DNS 설정 (Route 53)
- [ ] 자동 배포 설정
- [ ] 기능 테스트
- [ ] 성능 확인
- [ ] AWS EC2 중지 (선택사항)

## 🚀 빠른 시작

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 로그인
vercel login

# 3. 배포
vercel --prod

# 4. 환경 변수 설정 (대시보드에서)
# 5. 도메인 연결 (대시보드에서)
```

## 💡 팁

1. **단계적 마이그레이션**: 먼저 테스트 도메인으로 배포
2. **모니터링**: Vercel Analytics 사용
3. **비용 관리**: 사용량 모니터링
4. **백업**: 정기적인 데이터베이스 백업

