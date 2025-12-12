# 새로운 EC2 인스턴스 설정 가이드

## 개요
이 가이드는 새로운 EC2 인스턴스를 생성하고 깨끗한 환경에서 배포를 설정하는 방법을 설명합니다.

## 사전 준비

### 1. AWS 콘솔에서 EC2 인스턴스 생성

#### 인스턴스 설정
- **이름**: iamvet-production-v2
- **AMI**: Ubuntu Server 22.04 LTS
- **인스턴스 타입**: t3.large (8GB RAM)
- **키 페어**: 새로 생성하거나 기존 키 사용
- **네트워크 설정**: 
  - VPC: 기본 VPC 또는 기존 VPC
  - 서브넷: 퍼블릭 서브넷
  - 퍼블릭 IP 자동 할당: 활성화

#### 보안 그룹 설정
- **SSH (22)**: 관리자 IP만 허용
- **HTTP (80)**: 0.0.0.0/0 (모든 IP)
- **HTTPS (443)**: 0.0.0.0/0 (모든 IP)
- **Custom TCP (3000)**: 127.0.0.1/32 (localhost만, Nginx용)

### 2. Elastic IP 할당 (선택사항)
- EC2 콘솔 → Elastic IPs → Allocate Elastic IP address
- 생성된 인스턴스에 연결

### 3. 도메인 연결
- Route 53 또는 도메인 제공업체에서 A 레코드 설정
- `iam-vet.com` → Elastic IP 또는 퍼블릭 IP

## 초기 설정

### Step 1: 서버 접속
```bash
cd /path/to/iamvet/deploy
chmod 600 keys/your-key.pem
ssh -i keys/your-key.pem ubuntu@YOUR_EC2_IP
```

### Step 2: 초기 설정 스크립트 실행

#### 로컬에서 실행 (권장)
```bash
cd /path/to/iamvet
./deploy/setup-server.sh
```

#### 또는 서버에서 직접 실행
```bash
# 서버에 접속한 후
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
npm install -g pm2
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git build-essential
```

### Step 3: 배포 정보 저장
```bash
# 로컬에서
cd deploy
cat > keys/deployment-info.txt << EOF
Public IP: YOUR_EC2_IP
Instance ID: i-xxxxxxxxx
Region: ap-northeast-2
Created: $(date)
EOF
```

## 배포 실행

### 방법 1: GitHub Actions (권장)
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 다음 Secrets 확인/설정:
   - `EC2_HOST`: EC2 인스턴스 IP 또는 도메인
   - `EC2_SSH_PRIVATE_KEY`: SSH 개인 키 내용
   - `DATABASE_URL`: 데이터베이스 연결 문자열
   - 기타 필요한 환경 변수들

3. GitHub Actions 워크플로우 실행:
   - Actions 탭 → Deploy to AWS EC2 → Run workflow

### 방법 2: 수동 배포
```bash
cd /path/to/iamvet
./deploy/deploy.sh
```

## 배포 검증

### 배포 후 검증 스크립트 실행
```bash
./deploy/verify.sh
```

### 수동 검증
```bash
# 서버 접속
ssh -i deploy/keys/your-key.pem ubuntu@YOUR_EC2_IP

# PM2 상태 확인
pm2 status

# 포트 확인
ss -tlnp | grep 3000

# API 테스트
curl http://localhost:3000/api/jobs?limit=5

# 로그 확인
pm2 logs iamvet --lines 50
```

## Nginx 설정

### SSL 인증서 설정 (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d iam-vet.com -d www.iam-vet.com
```

### Nginx 설정 파일
`/etc/nginx/sites-available/iamvet`:
```nginx
server {
    listen 80;
    server_name iam-vet.com www.iam-vet.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name iam-vet.com www.iam-vet.com;

    ssl_certificate /etc/letsencrypt/live/iam-vet.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iam-vet.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 문제 해결

### DATABASE_URL이 로드되지 않는 경우
1. `.env.production` 파일 확인
2. `ecosystem.config.js`가 올바르게 생성되었는지 확인
3. PM2 재시작: `pm2 restart iamvet`

### PM2가 시작되지 않는 경우
1. PM2 로그 확인: `pm2 logs iamvet`
2. `ecosystem.config.js` 문법 확인: `node ecosystem.config.js`
3. 환경 변수 확인: `pm2 env 0`

### 빌드가 실패하는 경우
1. 메모리 확인: `free -h`
2. 디스크 공간 확인: `df -h`
3. Node.js 버전 확인: `node --version`

## 모니터링

### PM2 모니터링
```bash
pm2 monit
```

### 로그 확인
```bash
# 실시간 로그
pm2 logs iamvet

# 에러만 확인
pm2 logs iamvet --err

# 최근 100줄
pm2 logs iamvet --lines 100
```

### 시스템 리소스 모니터링
```bash
# CPU 및 메모리
htop

# 디스크 사용량
df -h

# 네트워크
iftop
```

## 백업 및 복구

### 정기 백업 설정
1. 데이터베이스 백업 (RDS 자동 백업 사용)
2. 환경 변수 백업: `.env.production` 파일을 안전한 곳에 저장
3. 코드 백업: Git 저장소 사용

### 복구 절차
1. 새 EC2 인스턴스 생성
2. 초기 설정 스크립트 실행
3. 환경 변수 복원
4. 배포 실행

