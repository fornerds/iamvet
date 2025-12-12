# 완전한 배포 설정 가이드

## 전체 프로세스 개요

1. ✅ EC2 인스턴스 생성 완료
2. ⏳ 탄력적 IP 할당 및 연결
3. ⏳ RDS 보안 그룹 설정
4. ⏳ 서버 초기 설정
5. ⏳ GitHub Secrets 업데이트
6. ⏳ 배포 실행

## Step 1: 탄력적 IP 할당 및 연결

### AWS 콘솔에서

1. **EC2 콘솔** → **Network & Security** → **Elastic IPs**
2. **"Allocate Elastic IP address"** 클릭
3. 설정:
   - Network border group: 기본값 유지
   - Public IPv4 address pool: Amazon's pool
4. **"Allocate"** 클릭
5. 할당된 Elastic IP 선택
6. **"Actions"** → **"Associate Elastic IP address"**
7. 설정:
   - Resource type: Instance
   - Instance: `i-0a510fa440754cb0e` 선택
   - Private IP address: 자동 선택
8. **"Associate"** 클릭

### 할당된 탄력적 IP 확인

할당 후 새로운 IP 주소를 기록하세요 (예: `54.180.123.45`)

## Step 2: RDS 보안 그룹 설정

### EC2 보안 그룹 ID 확인

1. EC2 콘솔 → Instances
2. 인스턴스 `i-0a510fa440754cb0e` 선택
3. "Security" 탭 → "Security groups" 클릭
4. 보안 그룹 ID 기록 (예: `sg-xxxxxxxxx`)

### RDS 보안 그룹에 EC2 보안 그룹 추가

1. **RDS 콘솔** → **Databases**
2. 기존 데이터베이스 선택 (예: `iamvet-db`)
3. **"Connectivity & security"** 탭
4. **"VPC security groups"** → 보안 그룹 클릭
5. **"Inbound rules"** → **"Edit inbound rules"**
6. **"Add rule"** 클릭:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Custom
   - **Custom**: EC2 인스턴스의 보안 그룹 ID 선택
7. **"Save rules"**

## Step 3: SSH 키 파일 준비

### 옵션 A: AWS 콘솔에서 다운로드

1. EC2 콘솔 → Key Pairs
2. "iam-vet" 키 페어 선택
3. "Actions" → "Download key pair"
4. 다운로드한 파일을 `deploy/keys/iam-vet.pem`으로 저장
5. 권한 설정:
   ```bash
   chmod 600 deploy/keys/iam-vet.pem
   ```

### 옵션 B: 기존 키 사용 (키가 동일한 경우)

```bash
cp deploy/keys/iamvet-key-new.pem deploy/keys/iam-vet.pem
chmod 600 deploy/keys/iam-vet.pem
```

## Step 4: 서버 초기 설정

### 자동 설정 (권장)

```bash
./deploy/setup-elastic-ip.sh
```

스크립트가 탄력적 IP를 묻고, 서버 초기 설정을 자동으로 실행합니다.

### 수동 설정

```bash
# 탄력적 IP 주소 사용
ssh -i deploy/keys/iam-vet.pem ubuntu@<탄력적-IP-주소>

# 서버에서
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
npm install -g pm2
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git build-essential python3
```

## Step 5: GitHub Secrets 업데이트

### 필수 Secrets

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**

2. **EC2_HOST** 업데이트:
   - 기존: `3.38.238.205`
   - 새 값: `<탄력적-IP-주소>` (예: `54.180.123.45`)

3. **EC2_SSH_PRIVATE_KEY** 업데이트:
   ```bash
   # 로컬에서
   cat deploy/keys/iam-vet.pem
   ```
   - 전체 내용을 복사하여 GitHub Secret에 붙여넣기

4. **DATABASE_URL** 확인:
   - 기존 RDS를 사용하므로 변경 불필요
   - 기존 값이 올바른지 확인만 하면 됨

## Step 6: 배포 실행

### 방법 1: GitHub Actions (권장)

1. GitHub → **Actions** 탭
2. **"Deploy to AWS EC2 (v2)"** 워크플로우 선택
3. **"Run workflow"** 클릭
4. main 브랜치 선택 → **"Run workflow"**

### 방법 2: 수동 배포

```bash
# 탄력적 IP 주소 설정
export PUBLIC_IP=<탄력적-IP-주소>

# 배포 실행
./deploy/deploy.sh
```

## Step 7: 배포 검증

```bash
./deploy/verify.sh
```

또는 수동 확인:

```bash
ssh -i deploy/keys/iam-vet.pem ubuntu@<탄력적-IP-주소> << 'ENDSSH'
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
curl -s http://localhost:3000/api/jobs?limit=5 | python3 -m json.tool | head -30
ENDSSH
```

## Step 8: 도메인 연결 (선택사항)

1. Route 53 또는 도메인 제공업체에서
2. A 레코드 설정:
   - **Name**: `iam-vet.com` (또는 `@`)
   - **Type**: A
   - **Value**: `<탄력적-IP-주소>`
   - **TTL**: 300

## 문제 해결

### EC2 Instance Connect 오류

**해결**: SSH 키를 사용한 직접 접속 사용
```bash
ssh -i deploy/keys/iam-vet.pem ubuntu@<탄력적-IP-주소>
```

### RDS 연결 실패

1. RDS 보안 그룹에 EC2 보안 그룹이 추가되었는지 확인
2. EC2와 RDS가 같은 VPC에 있는지 확인
3. DATABASE_URL이 올바른지 확인

### 배포 실패

1. GitHub Secrets 확인 (특히 EC2_HOST, EC2_SSH_PRIVATE_KEY)
2. 서버 로그 확인: `pm2 logs iamvet`
3. 환경 변수 확인: `grep DATABASE_URL .env.production`

## 체크리스트

- [ ] 탄력적 IP 할당 및 연결
- [ ] RDS 보안 그룹에 EC2 보안 그룹 추가
- [ ] SSH 키 파일 준비 (`deploy/keys/iam-vet.pem`)
- [ ] 서버 초기 설정 완료
- [ ] GitHub Secrets 업데이트 (EC2_HOST, EC2_SSH_PRIVATE_KEY)
- [ ] DATABASE_URL 확인 (기존 RDS 사용)
- [ ] 배포 실행
- [ ] 배포 검증
- [ ] 도메인 연결 (선택사항)

