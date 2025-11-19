# IAMVET - 수의사 구인구직 플랫폼

Next.js 13 App Router와 Prisma를 사용한 수의사 전용 구인구직 플랫폼입니다.

## 주요 기능

- 🔐 수의사/병원 회원가입 및 로그인
- 💼 채용공고 등록 및 검색
- 👨‍⚕️ 인재정보 관리
- 🏥 병원 정보 관리
- 📹 강의영상 서비스
- 🔄 양도양수 게시판
- 📊 대시보드 (수의사/병원별)

## 기술 스택

- **Frontend**: Next.js 15.0.3 (App Router), React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Styling**: Tailwind CSS
- **Validation**: Zod

## 시작하기

### 설치

```bash
npm install
```

### 환경 설정

```bash
cp .env.example .env.local
```

### 데이터베이스 설정

```bash
# 데이터베이스 스키마 적용
npm run db:push

# 시드 데이터 삽입
npm run db:seed
```

### 개발 서버 실행

```bash
npm run dev
```

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지
├── components/             # React 컴포넌트
├── types/                  # TypeScript 타입 정의
├── interfaces/             # Repository 인터페이스
├── repositories/           # 데이터 접근 계층
├── services/              # 비즈니스 로직
├── hooks/                 # React Query & Custom Hooks
├── store/                 # Zustand 스토어
├── lib/                   # 유틸리티 & 설정
└── styles/                # 스타일 파일
```

## 페이지 구조

### 인증

- `/login/veterinarian` - 수의사 로그인
- `/login/hospital` - 병원 로그인
- `/register/veterinarian` - 수의사 회원가입
- `/register/hospital` - 병원 회원가입

### 메인 서비스

- `/` - 홈페이지
- `/jobs` - 채용공고 목록
- `/jobs/[id]` - 채용공고 상세
- `/resumes` - 인재정보 목록
- `/resumes/[id]` - 인재정보 상세
- `/hospitals/[id]` - 병원 상세
- `/lectures` - 강의영상 목록
- `/lectures/[id]` - 강의영상 상세

### 양도양수

- `/transfers` - 양도양수 게시판
- `/transfers/create` - 양도양수 글 작성
- `/transfers/[id]` - 양도양수 상세
- `/transfers/[id]/edit` - 양도양수 수정

### 수의사 대시보드

- `/dashboard/veterinarian` - 수의사 대시보드
- `/dashboard/veterinarian/applications` - 지원내역
- `/dashboard/veterinarian/bookmarks` - 찜한 공고
- `/dashboard/veterinarian/messages` - 메시지
- `/dashboard/veterinarian/profile` - 프로필 설정
- `/dashboard/veterinarian/resume` - 나의 이력서

### 병원 대시보드

- `/dashboard/hospital` - 병원 대시보드
- `/dashboard/hospital/applicants` - 지원자 정보
- `/dashboard/hospital/transfer-bookmarks` - 양도양수 북마크
- `/dashboard/hospital/messages` - 메시지
- `/dashboard/hospital/profile` - 프로필 설정
- `/dashboard/hospital/my-jobs` - 올린 공고 관리
- `/dashboard/hospital/my-jobs/create` - 채용공고 등록
- `/dashboard/hospital/my-jobs/[id]/edit` - 채용공고 수정
- `/dashboard/hospital/talent-management/[id]` - 인재정보 상세 관리
- `/dashboard/hospital/favorite-talents` - 관심인재 목록

## API 엔드포인트

### 인증

- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/logout` - 로그아웃

### 수의사

- `GET /api/veterinarians` - 수의사 목록
- `GET /api/veterinarians/[id]` - 수의사 상세
- `POST /api/veterinarians` - 수의사 등록
- `PUT /api/veterinarians/[id]` - 수의사 수정
- `DELETE /api/veterinarians/[id]` - 수의사 삭제

### 병원

- `GET /api/hospitals` - 병원 목록
- `GET /api/hospitals/[id]` - 병원 상세
- `POST /api/hospitals` - 병원 등록

### 채용공고

- `GET /api/jobs` - 채용공고 목록
- `GET /api/jobs/[id]` - 채용공고 상세
- `POST /api/jobs` - 채용공고 등록

### 인재정보

- `GET /api/resumes` - 인재정보 목록
- `GET /api/resumes/[id]` - 인재정보 상세

### 양도양수

- `GET /api/transfers` - 양도양수 목록
- `GET /api/transfers/[id]` - 양도양수 상세

### 강의영상

- `GET /api/lectures` - 강의영상 목록
- `GET /api/lectures/[id]` - 강의영상 상세

### 지원내역

- `GET /api/applications` - 지원내역 목록

### 북마크

- `GET /api/bookmarks` - 북마크

### 메시지

- `GET /api/messages` - 메시지 목록
- `GET /api/messages/[id]` - 메시지 상세

## 배포

이 프로젝트는 **AWS EC2**에서 배포됩니다.

### 🚀 Vercel에서 AWS로 전환

Vercel에서 AWS로 완전히 전환하는 가이드:

**개발팀용:**
- **[완전 전환 가이드](docs/deployment/COMPLETE_MIGRATION_GUIDE.md)** - 전체 프로세스
- **[환경 변수 마이그레이션](docs/deployment/VERCEL_ENV_MIGRATION.md)** - Vercel 환경 변수 옮기기
- **[DNS 설정](docs/deployment/AWS_DNS_SETUP.md)** - Route 53 DNS 설정
- **[AWS 배포 가이드](docs/deployment/AWS_DEPLOYMENT.md)** - 일반 배포 가이드

**클라이언트용:**
- **[클라이언트 설정 빠른 참조](docs/deployment/CLIENT_SETUP_QUICK_REFERENCE.md)** - 빠른 참조 (추천)
- **[클라이언트 설정 가이드](docs/deployment/CLIENT_SETUP_GUIDE.md)** - 상세한 단계별 가이드
- **[클라이언트 설정 체크리스트](docs/deployment/CLIENT_SETUP_CHECKLIST.md)** - 체크리스트

### 자동 배포

- `main` 브랜치에 푸시하면 GitHub Actions를 통해 자동으로 배포됩니다
- 자세한 내용은 [AWS 배포 가이드](docs/deployment/AWS_DEPLOYMENT.md)를 참조하세요

### 배포 환경

- **인프라**: AWS EC2 (Ubuntu 22.04)
- **데이터베이스**: AWS RDS (PostgreSQL)
- **스토리지**: AWS S3
- **DNS**: AWS Route 53
- **SSL**: Let's Encrypt (자동 갱신)
- **프로세스 관리**: PM2
- **웹 서버**: Nginx (HTTPS, www/non-www 리다이렉트)

### 수동 배포

```bash
cd deploy
./deploy-to-ec2.sh <EC2_IP>
```

### SSL 및 도메인 설정

```bash
# SSL 인증서 발급
cd deploy
./setup-ssl.sh <EC2_IP> <도메인>

# Nginx SSL 설정 (www/non-www 처리)
./setup-nginx-ssl.sh <EC2_IP> <도메인>
```

## 라이센스

MIT License
