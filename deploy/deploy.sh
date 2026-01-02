#!/bin/bash
# 통합 배포 스크립트
# GitHub Actions 또는 수동 배포 시 사용

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# SSH 키 파일 자동 찾기 (iam-vet.pem 우선)
if [ -f "keys/iam-vet.pem" ]; then
    KEY_FILE="keys/iam-vet.pem"
elif [ -f "keys/iamvet-key-new.pem" ]; then
    KEY_FILE="keys/iamvet-key-new.pem"
elif [ -f "keys/iamvet-key.pem" ]; then
    KEY_FILE="keys/iamvet-key.pem"
else
    echo "❌ SSH 키 파일을 찾을 수 없습니다."
    echo "다음 위치를 확인하세요:"
    echo "  - keys/iam-vet.pem (권장)"
    echo "  - keys/iamvet-key-new.pem"
    echo "  - keys/iamvet-key.pem"
    exit 1
fi

# 연결 정보 파일에서 IP 확인 (탄력적 IP 우선)
if [ -f "keys/deployment-info.txt" ]; then
    # 탄력적 IP가 있으면 우선 사용
    ELASTIC_IP=$(grep "Elastic IP:" keys/deployment-info.txt | awk '{print $3}' | head -1)
    PUBLIC_IP=$(grep "Public IP:" keys/deployment-info.txt | awk '{print $3}' | head -1)
    # 탄력적 IP가 설정되어 있으면 사용, 없으면 퍼블릭 IP 사용
    if [ -n "$ELASTIC_IP" ]; then
        PUBLIC_IP="$ELASTIC_IP"
    fi
elif [ -f "keys/connection-info.txt" ]; then
    PUBLIC_IP=$(grep "Public IP:" keys/connection-info.txt | awk '{print $3}' | head -1)
else
    echo "⚠️ IP 주소를 찾을 수 없습니다. PUBLIC_IP 환경 변수를 사용하거나 keys/deployment-info.txt 파일을 확인하세요."
    if [ -z "$PUBLIC_IP" ]; then
        read -p "EC2 인스턴스 IP 주소를 입력하세요: " PUBLIC_IP
    fi
fi

# 환경 변수로 덮어쓸 수 있도록 허용
if [ -n "$PUBLIC_IP_ENV" ]; then
    PUBLIC_IP="$PUBLIC_IP_ENV"
fi

EC2_USER="ubuntu"
PROJECT_DIR="/home/ubuntu/iamvet"

echo "=========================================="
echo "🚀 통합 배포"
echo "=========================================="
echo "서버: ${EC2_USER}@${PUBLIC_IP}"
echo "프로젝트 디렉토리: ${PROJECT_DIR}"
echo ""

chmod 600 "$KEY_FILE" 2>/dev/null || true

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ${EC2_USER}@${PUBLIC_IP} << 'ENDSSH'
set -e

# NVM 환경 로드 (가장 먼저)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
else
    echo "❌ NVM이 설치되지 않았습니다."
    echo "setup-server.sh를 먼저 실행하세요."
    exit 1
fi

# Node.js 버전 확인 및 설정
if ! command -v node &> /dev/null; then
    echo "Node.js를 찾을 수 없습니다. Node.js 20을 설치합니다..."
    nvm install 20
fi

# Node.js 20 사용
nvm use 20 || nvm install 20
nvm alias default 20

# PATH에 Node.js 추가
export PATH="$HOME/.nvm/versions/node/$(nvm current)/bin:$PATH"

# 확인
echo "Node.js 버전: $(node --version)"
echo "npm 버전: $(npm --version)"

PROJECT_DIR="/home/ubuntu/iamvet"
cd "$PROJECT_DIR"

echo "=== 1. 기존 프로세스 중지 ==="

# 모든 포트에서 실행 중인 프로세스 중지
if ss -tlnp | grep -E ":(3000|3001)" > /dev/null 2>&1; then
    echo "포트 3000/3001에서 실행 중인 프로세스 중지 중..."
    pkill -f "next-server" 2>/dev/null || true
    pkill -f "next start" 2>/dev/null || true
    sleep 2
fi

# PM2 프로세스 중지 (NVM 환경에서 실행)
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q iamvet; then
        pm2 stop iamvet || true
        pm2 delete iamvet || true
        sleep 2
    fi
else
    echo "⚠️ PM2를 찾을 수 없습니다. (아직 설치되지 않았거나 PATH 문제)"
fi

echo ""
echo "=== 2. 최신 코드 가져오기 ==="
# Git 저장소가 없으면 클론
if [ ! -d ".git" ]; then
    echo "Git 저장소가 없습니다. 클론합니다..."
    # 기존 디렉토리가 비어있지 않으면 백업 후 클론
    if [ -n "$(ls -A $PROJECT_DIR 2>/dev/null)" ]; then
        echo "기존 파일이 있습니다. 백업 후 클론합니다..."
        cd /home/ubuntu
        BACKUP_NAME="iamvet.backup.$(date +%Y%m%d_%H%M%S)"
        mv iamvet "$BACKUP_NAME" 2>/dev/null || true
        mkdir -p iamvet
        cd iamvet
    fi
    git clone https://github.com/fornerds/iamvet.git .
else
    echo "Git 저장소가 있습니다. 최신 코드를 가져옵니다..."
    git fetch origin
    git reset --hard origin/main
    git clean -fd
fi

echo ""
echo "=== 3. 환경 변수 파일 확인 ==="
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production 파일이 없습니다!"
    echo "GitHub Actions를 통해 배포하거나, 수동으로 .env.production 파일을 생성하세요."
    exit 1
fi

# 환경 변수 검증
if ! grep -q "^DATABASE_URL=" .env.production || grep -q "^DATABASE_URL=\"\"" .env.production; then
    echo "❌ DATABASE_URL이 설정되지 않았거나 빈 값입니다!"
    echo ".env.production 파일을 확인하세요."
    exit 1
fi

echo "✅ .env.production 파일 확인 완료"

echo ""
echo "=== 4. 의존성 설치 ==="
# node_modules가 없거나 package.json이 변경된 경우에만 설치
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "의존성 설치 중..."
    npm ci --production=false || npm install --production=false
    echo "✅ 의존성 설치 완료"
else
    echo "✅ node_modules가 최신 상태입니다"
fi

echo ""
echo "=== 5. Prisma 클라이언트 생성 ==="
npx prisma generate
echo "✅ Prisma 클라이언트 생성 완료"

echo ""
echo "=== 6. 빌드 ==="
# .next 디렉토리가 없거나 BUILD_ID가 없거나 소스 코드가 변경된 경우에만 빌드
if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ] || [ "src" -nt ".next" ] || [ "package.json" -nt ".next" ]; then
    echo "빌드 중..."
    rm -rf .next
    
    # .env.production 파일에서 환경 변수 로드
    if [ -f ".env.production" ]; then
        echo ".env.production 파일에서 환경 변수 로드 중..."
        set -a
        source .env.production 2>/dev/null || true
        set +a
        echo "✅ 환경 변수 로드 완료"
        
        # DATABASE_URL 확인
        if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = '""' ] || [ "$DATABASE_URL" = "''" ]; then
            echo "❌ DATABASE_URL이 설정되지 않았거나 빈 값입니다!"
            echo ".env.production 파일을 확인하세요."
            exit 1
        fi
        echo "✅ DATABASE_URL 확인 완료: ${DATABASE_URL:0:50}..."
    else
        echo "❌ .env.production 파일이 없습니다!"
        exit 1
    fi
    
    # 빌드 실행 (환경 변수 명시적으로 전달)
    echo "빌드 실행 중 (DATABASE_URL 포함)..."
    export DATABASE_URL
    npm run build || {
        echo "❌ 빌드 실패"
        # BUILD_ID가 생성되었는지 확인
        if [ ! -f ".next/BUILD_ID" ]; then
            echo "❌ BUILD_ID가 생성되지 않았습니다. 빌드가 실패했습니다."
            exit 1
        fi
    }
    echo "✅ 빌드 완료"
else
    echo "✅ 빌드가 최신 상태입니다"
fi

echo ""
echo "=== 7. ecosystem.config.js 생성 ==="
mkdir -p logs
cat > ecosystem.config.js << 'ECOSYSTEMEOF'
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.production');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    // 주석과 빈 줄 건너뛰기
    if (!trimmedLine || trimmedLine.startsWith('#')) return;
    
    const match = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // 따옴표 제거 (시작과 끝의 따옴표만)
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  });
}

// 필수 환경 변수 검증
const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredVars.filter(v => !envVars[v] || envVars[v] === '');
if (missingVars.length > 0) {
  console.error('❌ 필수 환경 변수가 없습니다:', missingVars.join(', '));
  process.exit(1);
}

console.log('✅ 환경 변수 로드 완료:', Object.keys(envVars).length, '개');

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
    max_memory_restart: '3G',
    node_args: '--max-old-space-size=3072',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.next'],
    min_uptime: '10s',
    max_restarts: 10
  }]
};
ECOSYSTEMEOF

echo "✅ ecosystem.config.js 생성 완료"

echo ""
echo "=== 8. PM2 시작 ==="
# PM2 확인 및 설치
if ! command -v pm2 &> /dev/null; then
    echo "PM2를 찾을 수 없습니다. 설치합니다..."
    npm install -g pm2
    echo "✅ PM2 설치 완료"
fi

echo "PM2 버전: $(pm2 --version)"

pm2 start ecosystem.config.js
pm2 save
echo "✅ PM2 시작 완료"

echo ""
echo "=== 9. 상태 확인 ==="
sleep 5
pm2 status

echo ""
echo "=== 10. 헬스 체크 ==="
# 포트 3000 응답 확인
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 포트 3000에서 서버가 정상적으로 응답합니다."
else
    echo "❌ 포트 3000에서 서버가 응답하지 않습니다."
    echo "PM2 로그 확인:"
    pm2 logs iamvet --lines 20 --nostream
    exit 1
fi

# API 헬스 체크
if curl -f http://localhost:3000/api/jobs?limit=1 > /dev/null 2>&1; then
    echo "✅ API가 정상적으로 응답합니다."
else
    echo "⚠️ API 응답 확인 실패 (로그 확인 필요)"
    pm2 logs iamvet --lines 10 --nostream
fi

echo ""
echo "=========================================="
echo "✅ 배포 완료"
echo "=========================================="
ENDSSH

echo ""
echo "✅ 배포 완료"

