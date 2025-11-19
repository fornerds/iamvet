# 문제 해결 가이드

## ERR_CONNECTION_REFUSED 오류 해결

### 원인 분석

`ERR_CONNECTION_REFUSED` 오류는 DNS 전파 문제가 아니라 **서버 측 문제**일 가능성이 높습니다.

가능한 원인:
1. EC2 인스턴스에서 Nginx가 실행되지 않음
2. EC2 인스턴스에서 Next.js (PM2)가 실행되지 않음
3. 보안 그룹에서 80/443 포트가 열려있지 않음
4. SSL 인증서가 설정되지 않아 HTTPS 접속 실패

### 1단계: DNS 전파 확인

먼저 DNS가 올바르게 전파되었는지 확인:

```bash
# 로컬에서 DNS 확인
nslookup iam-vet.com
nslookup www.iam-vet.com

# 또는
dig iam-vet.com
dig www.iam-vet.com
```

**예상 결과**: `3.38.238.205`로 응답해야 합니다.

**DNS가 아직 전파되지 않은 경우**:
- 최대 48시간까지 소요될 수 있지만, 보통 몇 시간 내에 반영됩니다
- Route 53을 사용하는 경우 보통 몇 분 내에 반영됩니다

### 2단계: EC2 인스턴스 상태 확인

#### SSH 접속 테스트

```bash
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205
```

접속이 안 되면:
- EC2 인스턴스가 실행 중인지 확인
- 보안 그룹에서 22번 포트(SSH)가 열려있는지 확인

#### 서비스 상태 확인

EC2에 접속한 후:

```bash
# PM2 상태 확인
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 status

# Nginx 상태 확인
sudo systemctl status nginx

# 포트 확인
sudo ss -tlnp | grep -E ':(80|443|3000)'
```

### 3단계: 문제별 해결 방법

#### 문제 1: PM2가 실행되지 않음

```bash
cd /home/ubuntu/iamvet
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# PM2 시작
pm2 start ecosystem.config.js
pm2 save

# 상태 확인
pm2 status
pm2 logs iamvet --lines 50
```

#### 문제 2: Nginx가 실행되지 않음

```bash
# Nginx 시작
sudo systemctl start nginx
sudo systemctl enable nginx

# 상태 확인
sudo systemctl status nginx

# 설정 테스트
sudo nginx -t
```

#### 문제 3: 보안 그룹 설정 확인

AWS 콘솔에서:
1. EC2 > 보안 그룹 선택
2. 인바운드 규칙 확인:
   - **포트 80 (HTTP)**: 0.0.0.0/0 허용
   - **포트 443 (HTTPS)**: 0.0.0.0/0 허용
   - **포트 22 (SSH)**: 본인 IP 허용

#### 문제 4: SSL 인증서 미설정

HTTPS로 접속하려면 SSL 인증서가 필요합니다:

```bash
# EC2에 접속
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205

# SSL 인증서 발급
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d iam-vet.com -d www.iam-vet.com
```

또는 배포 스크립트 사용:

```bash
cd deploy
./setup-ssl.sh 3.38.238.205 iam-vet.com
./setup-nginx-ssl.sh 3.38.238.205 iam-vet.com
```

#### 문제 5: Nginx 설정 확인

```bash
# Nginx 설정 파일 확인
sudo cat /etc/nginx/sites-available/iamvet

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 4단계: 빠른 진단 스크립트

다음 명령어로 한 번에 확인:

```bash
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 << 'EOF'
echo "=== 시스템 상태 ==="
uptime

echo "=== PM2 상태 ==="
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 status || echo "PM2가 실행되지 않음"

echo "=== Nginx 상태 ==="
sudo systemctl status nginx --no-pager | head -10

echo "=== 포트 확인 ==="
sudo ss -tlnp | grep -E ':(80|443|3000)' || echo "포트가 열려있지 않음"

echo "=== Next.js 로컬 테스트 ==="
curl -f http://localhost:3000 > /dev/null 2>&1 && echo "✅ Next.js 정상" || echo "❌ Next.js 오류"

echo "=== Nginx 로컬 테스트 ==="
curl -f http://localhost:80 > /dev/null 2>&1 && echo "✅ Nginx 정상" || echo "❌ Nginx 오류"
EOF
```

### 5단계: 단계별 해결

#### Step 1: HTTP 접속 테스트

먼저 HTTP로 접속해봅니다:

```bash
curl -I http://3.38.238.205
```

정상이면:
- EC2 인스턴스는 정상 작동
- DNS 전파 문제일 가능성

오류가 나면:
- EC2 인스턴스 문제
- 위의 문제별 해결 방법 참조

#### Step 2: 로컬 서버 테스트

EC2에 접속하여:

```bash
# Next.js 테스트
curl http://localhost:3000

# Nginx 테스트
curl http://localhost:80
```

#### Step 3: 로그 확인

```bash
# PM2 로그
pm2 logs iamvet --lines 100

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log

# Nginx 액세스 로그
sudo tail -f /var/log/nginx/access.log
```

### 일반적인 해결 순서

1. **DNS 전파 확인** (nslookup/dig)
2. **EC2 인스턴스 접속** (SSH)
3. **PM2 상태 확인 및 재시작**
4. **Nginx 상태 확인 및 재시작**
5. **보안 그룹 확인** (80, 443 포트)
6. **SSL 인증서 설정** (HTTPS 접속 시)

### 즉시 해결 방법

모든 것이 정상인데도 접속이 안 되면:

```bash
# 전체 재시작
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 << 'EOF'
cd /home/ubuntu/iamvet
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# PM2 재시작
pm2 restart iamvet || pm2 start ecosystem.config.js
pm2 save

# Nginx 재시작
sudo systemctl restart nginx

# 상태 확인
pm2 status
sudo systemctl status nginx
EOF
```

### 추가 확인 사항

1. **Elastic IP 확인**
   - EC2 인스턴스에 Elastic IP가 할당되어 있는지 확인
   - Elastic IP: `3.38.238.205`

2. **인스턴스 상태**
   - EC2 콘솔에서 인스턴스 상태가 "실행 중"인지 확인

3. **네트워크 ACL**
   - VPC 네트워크 ACL에서 80/443 포트가 허용되어 있는지 확인

### 문의

위 방법으로 해결되지 않으면 다음 정보를 포함하여 개발팀에 문의:
- DNS 확인 결과 (nslookup/dig)
- PM2 상태 (pm2 status)
- Nginx 상태 (systemctl status nginx)
- 포트 확인 결과 (ss -tlnp)
- 에러 로그 (pm2 logs, nginx error.log)

