# AWS EC2 배포 가이드

이 프로젝트는 AWS EC2에서 자동 배포되도록 설정되어 있습니다.

## 🚀 자동 배포 (GitHub Actions)

### 설정 방법

1. **GitHub Secrets 설정**
   
   GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 Secrets를 추가하세요:

   - `EC2_HOST`: EC2 인스턴스의 Public IP (예: `3.38.238.205`)
   - `EC2_SSH_PRIVATE_KEY`: EC2 인스턴스 접속용 SSH 개인 키 전체 내용
     - `deploy/keys/iamvet-key-new.pem` 파일의 전체 내용을 복사하여 추가

2. **자동 배포 트리거**
   
   - `main` 브랜치에 푸시하면 자동으로 배포됩니다
   - GitHub Actions 탭에서 수동으로도 실행할 수 있습니다

### 배포 프로세스

자동 배포는 다음 단계를 수행합니다:

1. ✅ 코드 체크아웃
2. ✅ SSH 연결 설정
3. ✅ EC2에 접속하여 최신 코드 가져오기
4. ✅ 의존성 설치 (`npm ci`)
5. ✅ Prisma 클라이언트 생성
6. ✅ 데이터베이스 마이그레이션 실행
7. ✅ Next.js 애플리케이션 빌드
8. ✅ PM2로 애플리케이션 재시작
9. ✅ 헬스 체크

## 🔧 수동 배포

자동 배포가 작동하지 않을 경우 수동으로 배포할 수 있습니다.

### 방법 1: 배포 스크립트 사용 (권장)

```bash
cd deploy
./deploy-to-ec2.sh 3.38.238.205
```

### 방법 2: SSH로 직접 배포

```bash
# 1. SSH 접속
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205

# 2. 프로젝트 디렉토리로 이동
cd /home/ubuntu/iamvet

# 3. NVM 환경 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 4. 최신 코드 가져오기
git pull origin main

# 5. 의존성 설치
npm ci --production=false

# 6. Prisma 클라이언트 생성
npx prisma generate

# 7. 마이그레이션 실행
npx prisma migrate deploy

# 8. 빌드
npm run build

# 9. PM2 재시작
pm2 restart iamvet
```

## 📊 배포 상태 확인

### PM2 상태 확인

```bash
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 'pm2 status'
```

### 로그 확인

```bash
# PM2 로그
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 'pm2 logs iamvet --lines 50'

# Nginx 로그
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 'sudo tail -f /var/log/nginx/error.log'
```

### 서비스 상태 확인

```bash
# Next.js 서버 확인
curl http://3.38.238.205

# 포트 확인
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 'sudo ss -tlnp | grep -E ":(80|3000)"'
```

## 🔄 롤백

배포에 문제가 발생한 경우 이전 버전으로 롤백할 수 있습니다:

```bash
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 << 'EOF'
cd /home/ubuntu/iamvet
git log --oneline -10  # 이전 커밋 확인
git reset --hard <이전_커밋_해시>
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm ci --production=false
npx prisma generate
npm run build
pm2 restart iamvet
EOF
```

## 🛠️ 문제 해결

### 빌드 실패

1. EC2 인스턴스의 디스크 공간 확인:
   ```bash
   ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 'df -h'
   ```

2. Node.js 버전 확인:
   ```bash
   ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 'node --version'
   ```

### PM2 프로세스가 시작되지 않음

```bash
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 << 'EOF'
cd /home/ubuntu/iamvet
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 delete iamvet
pm2 start ecosystem.config.js
pm2 save
EOF
```

### Nginx 502 에러

```bash
# Nginx 재시작
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 'sudo systemctl restart nginx'

# Nginx 설정 확인
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 'sudo nginx -t'
```

## 📝 참고 정보

- **EC2 인스턴스 IP**: `3.38.238.205`
- **RDS 엔드포인트**: `iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com`
- **S3 버킷**: `iamvet`
- **도메인**: `iam-vet.com` (설정된 경우)

## 🔐 보안 주의사항

- SSH 키 파일은 절대 Git에 커밋하지 마세요
- GitHub Secrets에 민감한 정보를 안전하게 저장하세요
- 프로덕션 환경에서는 IAM 역할을 사용하는 것을 권장합니다

