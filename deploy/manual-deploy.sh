#!/bin/bash
# Status: MAINTENANCE
# Purpose: SSH를 통한 수동 배포 스크립트
# Usage: ./deploy/manual-deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# SSH 키 파일 자동 찾기
if [ -f "keys/iamvet-key-new.pem" ]; then
    KEY_FILE="keys/iamvet-key-new.pem"
elif [ -f "keys/iamvet-key.pem" ]; then
    KEY_FILE="keys/iamvet-key.pem"
else
    echo "❌ SSH 키 파일을 찾을 수 없습니다."
    exit 1
fi

# 연결 정보 파일에서 IP 확인
if [ -f "keys/deployment-info.txt" ]; then
    PUBLIC_IP=$(grep "Public IP:" keys/deployment-info.txt | awk '{print $3}' | head -1)
elif [ -f "keys/connection-info.txt" ]; then
    PUBLIC_IP=$(grep "Public IP:" keys/connection-info.txt | awk '{print $3}' | head -1)
else
    PUBLIC_IP="3.38.238.205"
fi

EC2_USER="ubuntu"
PROJECT_DIR="/home/ubuntu/iamvet"

echo "=========================================="
echo "🚀 IAMVET 수동 배포"
echo "=========================================="
echo "서버: ${EC2_USER}@${PUBLIC_IP}"
echo "프로젝트 디렉토리: ${PROJECT_DIR}"
echo ""

chmod 600 "$KEY_FILE" 2>/dev/null || true

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ${EC2_USER}@${PUBLIC_IP} << 'ENDSSH'
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

PROJECT_DIR="/home/ubuntu/iamvet"

echo "=== 1. 프로젝트 디렉토리 확인 ==="
if [ ! -d "$PROJECT_DIR" ]; then
    echo "프로젝트 디렉토리가 없습니다. 생성 중..."
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    echo "Git 저장소 클론 중..."
    git clone https://github.com/kangpungyun/iamvet.git . || {
        echo "❌ Git 클론 실패. 수동으로 클론해야 합니다."
        exit 1
    }
else
    echo "✅ 프로젝트 디렉토리 존재"
    cd "$PROJECT_DIR"
fi

echo ""
echo "=== 2. 최신 코드 가져오기 ==="
rm -f .git/index.lock .git/refs/heads/main.lock
git fetch origin
git reset --hard origin/main
git clean -fd
echo "✅ 코드 업데이트 완료"

echo ""
echo "=== 3. 환경 변수 파일 확인 ==="
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production 파일이 없습니다."
    echo "   기존 환경 변수 파일을 확인하거나 GitHub Secrets에서 가져와야 합니다."
    if [ -f ".env" ]; then
        echo "   .env 파일을 .env.production으로 복사합니다."
        cp .env .env.production
    else
        echo "❌ 환경 변수 파일이 없습니다. 배포를 중단합니다."
        exit 1
    fi
else
    echo "✅ .env.production 파일 존재"
fi

echo ""
echo "=== 4. 의존성 설치 ==="
npm ci --production=false
echo "✅ 의존성 설치 완료"

echo ""
echo "=== 5. Prisma 클라이언트 생성 ==="
npx prisma generate
echo "✅ Prisma 클라이언트 생성 완료"

echo ""
echo "=== 6. 데이터베이스 마이그레이션 ==="
npx prisma migrate deploy || echo "⚠️  마이그레이션 실패 (계속 진행)"
echo "✅ 마이그레이션 완료"

echo ""
echo "=== 7. 빌드 캐시 삭제 ==="
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache
rm -rf .swc
echo "✅ 빌드 캐시 삭제 완료"

echo ""
echo "=== 8. Next.js 빌드 ==="
npm run build
if [ ! -d ".next" ]; then
    echo "❌ 빌드 실패: .next 디렉토리가 생성되지 않았습니다."
    exit 1
fi
echo "✅ 빌드 완료"

echo ""
echo "=== 9. PM2 프로세스 관리 ==="
# PM2 설치 확인
if ! command -v pm2 &> /dev/null; then
    echo "PM2가 설치되어 있지 않습니다. 설치 중..."
    npm install -g pm2
fi

# 기존 PM2 프로세스 중지
if pm2 list | grep -q iamvet; then
    echo "기존 PM2 프로세스 중지 중..."
    pm2 stop iamvet || true
    pm2 delete iamvet || true
    sleep 3
fi

# ecosystem.config.js 확인 및 생성
if [ ! -f "ecosystem.config.js" ]; then
    echo "ecosystem.config.js 생성 중..."
    mkdir -p logs
    cat > ecosystem.config.js << 'ECOSYSTEMEOF'
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.production');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  });
}

const nodeBinPath = path.join(__dirname, 'node_modules', '.bin');
const nextPath = path.join(nodeBinPath, 'next');

module.exports = {
  apps: [{
    name: 'iamvet',
    script: nextPath,
    args: 'start',
    cwd: '/home/ubuntu/iamvet',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
      PATH: process.env.PATH + ':' + nodeBinPath,
      ...envVars
    },
    error_file: '/home/ubuntu/iamvet/logs/pm2-error.log',
    out_file: '/home/ubuntu/iamvet/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1.5G',
    node_args: '--max-old-space-size=1536',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.next'],
    min_uptime: '10s',
    max_restarts: 10
  }]
};
ECOSYSTEMEOF
    echo "✅ ecosystem.config.js 생성 완료"
fi

echo ""
echo "=== 10. PM2 시작 ==="
pm2 start ecosystem.config.js
pm2 save
echo "✅ PM2 시작 완료"

echo ""
echo "=== 11. PM2 상태 확인 ==="
pm2 status
sleep 3
pm2 logs iamvet --lines 20 --nostream

echo ""
echo "=========================================="
echo "✅ 배포 완료!"
echo "=========================================="
ENDSSH

echo ""
echo "✅ 배포가 완료되었습니다!"
echo ""
echo "서버 상태 확인:"
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ${EC2_USER}@${PUBLIC_IP} 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && pm2 status'

