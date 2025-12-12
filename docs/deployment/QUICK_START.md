# 새 EC2 인스턴스 빠른 시작 가이드

## 현재 인스턴스 정보

- **IP 주소**: 3.35.8.129
- **인스턴스 ID**: i-0a510fa440754cb0e
- **키 페어**: iam-vet
- **상태**: 실행 중 ✅

## 즉시 시작하기

### 1단계: SSH 키 확인

새 인스턴스의 키 페어 이름이 "iam-vet"이므로, 다음 중 하나를 수행하세요:

**옵션 A: AWS 콘솔에서 키 다운로드**
1. EC2 콘솔 → Key Pairs
2. "iam-vet" 키 페어 선택
3. "Actions" → "Download key pair"
4. 다운로드한 파일을 `deploy/keys/iam-vet.pem`으로 저장

**옵션 B: 기존 키 사용 (키가 동일한 경우)**
```bash
# 기존 키를 새 이름으로 복사
cp deploy/keys/iamvet-key-new.pem deploy/keys/iam-vet.pem
chmod 600 deploy/keys/iam-vet.pem
```

### 2단계: 서버 초기 설정

```bash
./deploy/setup-new-server.sh
```

또는 수동으로:

```bash
ssh -i deploy/keys/iam-vet.pem ubuntu@3.35.8.129

# 서버에서 실행
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
npm install -g pm2
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git build-essential python3
```

### 3단계: GitHub Secrets 업데이트

**중요**: GitHub Actions 배포를 사용하려면 반드시 업데이트해야 합니다.

1. GitHub 저장소 → Settings → Secrets and variables → Actions

2. **EC2_HOST** 업데이트:
   - 기존: `3.38.238.205`
   - 새 값: `3.35.8.129`

3. **EC2_SSH_PRIVATE_KEY** 업데이트:
   ```bash
   # 로컬에서 키 파일 내용 확인
   cat deploy/keys/iam-vet.pem
   ```
   - 전체 내용을 복사하여 GitHub Secret에 붙여넣기

### 4단계: 배포 실행

**방법 1: GitHub Actions (권장)**
1. GitHub → Actions → "Deploy to AWS EC2 (v2)"
2. "Run workflow" → main 브랜치 선택 → 실행

**방법 2: 수동 배포**
```bash
# deploy.sh 수정 필요 (EC2_IP를 3.35.8.129로 변경)
# 또는 환경 변수 설정
export PUBLIC_IP=3.35.8.129
./deploy/deploy.sh
```

### 5단계: 배포 검증

```bash
./deploy/verify.sh
```

또는 직접 확인:

```bash
ssh -i deploy/keys/iam-vet.pem ubuntu@3.35.8.129 'cd /home/ubuntu/iamvet && export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && pm2 status && curl -s http://localhost:3000/api/jobs?limit=5 | head -20'
```

## 주의사항

### 인스턴스 타입
현재 **t2.medium** (4GB RAM)입니다. 빌드 시 메모리 부족이 발생할 수 있습니다.

**권장**: t3.large (8GB RAM)로 업그레이드

**임시 해결책**: 스왑 메모리 추가
```bash
ssh -i deploy/keys/iam-vet.pem ubuntu@3.35.8.129 << 'ENDSSH'
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
ENDSSH
```

### 보안 그룹 설정 확인
다음 포트가 열려있는지 확인:
- **22 (SSH)**: 관리자 IP만
- **80 (HTTP)**: 모든 IP
- **443 (HTTPS)**: 모든 IP
- **3000**: localhost만 (Nginx용)

## 문제 해결

### SSH 접속 실패
```bash
# 키 파일 권한 확인
chmod 600 deploy/keys/iam-vet.pem

# 접속 테스트
ssh -i deploy/keys/iam-vet.pem -v ubuntu@3.35.8.129
```

### 키 파일이 다른 경우
AWS 콘솔에서 인스턴스의 키 페어를 확인하고, 해당 키를 다운로드하세요.

## 다음 단계

1. ✅ 인스턴스 생성 완료
2. ⏳ SSH 키 확인 및 설정
3. ⏳ 서버 초기 설정
4. ⏳ GitHub Secrets 업데이트
5. ⏳ 배포 실행
6. ⏳ 배포 검증

