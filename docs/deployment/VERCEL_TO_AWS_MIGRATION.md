# Vercel → AWS EC2 배포 전환 가이드

Vercel에서 AWS EC2로 배포를 전환하는 단계별 가이드입니다.

## 📋 현재 상태

- **EC2 인스턴스**: 실행 중 (`i-0ec8600586ba05cb9`, IP: `3.38.238.205`)
- **RDS 데이터베이스**: 마이그레이션 완료
- **S3 버킷**: 클라이언트 AWS 계정으로 이전 완료

## 🔧 1단계: 환경 변수 업데이트

### 1.1 .env.production 업데이트

**파일**: `.env.production`

**변경 사항**:
```bash
# 변경 전 (Neon Database)
DATABASE_URL="postgresql://neondb_owner:npg_stzc9ESNIAf4@ep-fancy-cherry-a1179pkn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# 변경 후 (AWS RDS)
DATABASE_URL="postgresql://iamvet_admin:[비밀번호_URL인코딩]@iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com:5432/iamvet?sslmode=require"
```

**비밀번호 URL 인코딩**:
- 비밀번호에 특수문자가 있으면 URL 인코딩 필요
- 예: `Iamvet!2025@` → `Iamvet%212025%40`

### 1.2 deploy/config.sh 업데이트

**파일**: `deploy/config.sh`

**변경 사항**:
- 79번째 줄: `DATABASE_URL` 업데이트
- 83-87번째 줄: 개별 DB 설정 업데이트 (선택사항)

## 🚀 2단계: EC2 배포

### 방법 1: 자동 배포 스크립트 사용 (권장)

```bash
cd deploy
./deploy-to-ec2.sh 3.38.238.205
```

스크립트가 자동으로:
1. 서버 환경 설정
2. 프로젝트 클론
3. 환경 변수 파일 생성
4. Next.js 빌드
5. PM2로 애플리케이션 시작
6. Nginx 설정

### 방법 2: 수동 배포

#### 2.1 SSH 접속

```bash
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205
```

#### 2.2 프로젝트 디렉토리로 이동

```bash
cd /home/ubuntu/iamvet
```

#### 2.3 환경 변수 업데이트

```bash
nano .env.production
```

다음 내용으로 업데이트:
```bash
DATABASE_URL="postgresql://iamvet_admin:[비밀번호_URL인코딩]@iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com:5432/iamvet?sslmode=require"
```

#### 2.4 코드 업데이트 (필요시)

```bash
git pull origin main
```

#### 2.5 의존성 설치 및 빌드

```bash
# NVM 환경 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 의존성 설치
npm ci --production=false

# Prisma 클라이언트 생성
npx prisma generate

# Next.js 빌드
npm run build
```

#### 2.6 PM2 재시작

```bash
pm2 restart iamvet
# 또는
pm2 delete iamvet
pm2 start ecosystem.config.js
```

#### 2.7 로그 확인

```bash
pm2 logs iamvet --lines 50
```

## ✅ 3단계: 배포 확인

### 3.1 서비스 상태 확인

```bash
# PM2 상태
pm2 status

# Nginx 상태
sudo systemctl status nginx

# 포트 확인
sudo ss -tlnp | grep -E ':(80|3000)'
```

### 3.2 웹 접속 테스트

```bash
# 로컬에서 테스트
curl http://3.38.238.205

# 브라우저에서 접속
http://3.38.238.205
```

### 3.3 데이터베이스 연결 확인

```bash
# EC2에서 데이터베이스 연결 테스트
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

## 🔄 4단계: Vercel 비활성화 (선택사항)

Vercel 배포를 완전히 중단하려면:

1. Vercel 대시보드 접속
2. 프로젝트 설정 → 배포 중지
3. 또는 도메인 연결 해제

## 📝 체크리스트

- [ ] `.env.production`의 `DATABASE_URL` 업데이트
- [ ] `deploy/config.sh`의 `DATABASE_URL` 업데이트
- [ ] EC2 인스턴스의 `.env.production` 업데이트
- [ ] 애플리케이션 빌드 및 재시작
- [ ] 웹 접속 테스트
- [ ] 데이터베이스 연결 확인
- [ ] 기능 테스트
- [ ] Vercel 배포 중지 (선택사항)

## 🔗 참고

- EC2 인스턴스 IP: `3.38.238.205`
- RDS 엔드포인트: `iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com`
- 배포 스크립트: `deploy/deploy-to-ec2.sh`



