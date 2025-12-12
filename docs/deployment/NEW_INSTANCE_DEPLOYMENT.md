# 새 EC2 인스턴스 배포 가이드

## 인스턴스 정보

- **인스턴스 ID**: i-0a510fa440754cb0e
- **퍼블릭 IP**: 3.35.8.129
- **인스턴스 타입**: t2.medium (2 vCPU, 4GB RAM)
- **AMI**: Ubuntu 24.04 (noble)
- **키 페어**: iam-vet
- **지역**: ap-northeast-2 (서울)

## 배포 단계

### Step 1: SSH 키 확인

SSH 키 파일이 `deploy/keys/iam-vet.pem`에 있는지 확인하세요.

```bash
ls -la deploy/keys/iam-vet.pem
```

없다면 AWS 콘솔에서 키를 다운로드하거나 기존 키를 복사하세요.

### Step 2: 서버 초기 설정

```bash
./deploy/setup-new-server.sh
```

또는 수동으로:

```bash
# 서버 접속
ssh -i deploy/keys/iam-vet.pem ubuntu@3.35.8.129

# 서버에서 실행
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
npm install -g pm2
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git build-essential
```

### Step 3: GitHub Secrets 업데이트

GitHub 저장소 → Settings → Secrets and variables → Actions에서:

1. **EC2_HOST** 업데이트:
   - 기존 값: `3.38.238.205` (또는 이전 IP)
   - 새 값: `3.35.8.129`

2. **EC2_SSH_PRIVATE_KEY** 업데이트:
   - `deploy/keys/iam-vet.pem` 파일의 전체 내용을 복사하여 설정
   - 파일 내용 확인:
     ```bash
     cat deploy/keys/iam-vet.pem
     ```

### Step 4: 배포 실행

#### 방법 1: GitHub Actions (권장)

1. GitHub 저장소 → Actions 탭
2. "Deploy to AWS EC2 (v2)" 워크플로우 선택
3. "Run workflow" 클릭
4. main 브랜치 선택 후 실행

#### 방법 2: 수동 배포

```bash
# deploy.sh 스크립트 수정 필요
# EC2_IP를 3.35.8.129로 설정하거나
# PUBLIC_IP 환경 변수 설정

export PUBLIC_IP=3.35.8.129
./deploy/deploy.sh
```

### Step 5: 배포 검증

```bash
./deploy/verify.sh
```

또는 수동 확인:

```bash
ssh -i deploy/keys/iam-vet.pem ubuntu@3.35.8.129 << 'ENDSSH'
cd /home/ubuntu/iamvet
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "=== PM2 상태 ==="
pm2 status

echo ""
echo "=== 포트 확인 ==="
ss -tlnp | grep :3000

echo ""
echo "=== API 테스트 ==="
curl -s http://localhost:3000/api/jobs?limit=5 | head -20
ENDSSH
```

## 주의사항

### 인스턴스 타입
현재 인스턴스는 **t2.medium** (4GB RAM)입니다. 
- 빌드 시 메모리 부족이 발생할 수 있습니다.
- 가능하면 **t3.large** (8GB RAM)로 업그레이드하는 것을 권장합니다.

### 메모리 최적화
t2.medium 사용 시:
- 빌드 시 메모리 제한 설정 필요
- `NODE_OPTIONS="--max-old-space-size=2048"` 사용
- 필요시 스왑 메모리 추가

### 보안 그룹 설정
다음 포트가 열려있는지 확인:
- **22 (SSH)**: 관리자 IP만 허용
- **80 (HTTP)**: 모든 IP 허용
- **443 (HTTPS)**: 모든 IP 허용
- **3000 (Custom TCP)**: localhost만 허용 (Nginx용)

## 문제 해결

### SSH 접속 실패
```bash
# 키 파일 권한 확인
chmod 600 deploy/keys/iam-vet.pem

# 접속 테스트
ssh -i deploy/keys/iam-vet.pem -v ubuntu@3.35.8.129
```

### 메모리 부족
```bash
# 스왑 메모리 추가 (서버에서)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### PM2 시작 실패
```bash
# 로그 확인
pm2 logs iamvet --lines 50

# 환경 변수 확인
node -e "const config = require('./ecosystem.config.js'); console.log('DATABASE_URL:', config.apps[0].env.DATABASE_URL ? '설정됨' : '없음');"
```

## 다음 단계

1. ✅ 서버 초기 설정 완료
2. ⏳ GitHub Secrets 업데이트
3. ⏳ 배포 실행
4. ⏳ 배포 검증
5. ⏳ Nginx 설정
6. ⏳ SSL 인증서 설정

