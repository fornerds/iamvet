#!/bin/bash
# Status: MAINTENANCE
# Purpose: Node.js/PM2 런타임 완전 복구 (문제 발생 시 사용)
# Usage: ./deploy/fix-system-and-node.sh

# 시스템 복구 및 Node.js 설치 스크립트
# 사용법: ./fix-system-and-node.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_FILE="$SCRIPT_DIR/keys/iamvet-key-new.pem"
PUBLIC_IP="3.38.238.205"

if [ ! -f "$KEY_FILE" ]; then
    echo "❌ SSH 키 파일을 찾을 수 없습니다: $KEY_FILE"
    exit 1
fi

echo "=========================================="
echo "시스템 복구 및 Node.js 설치"
echo "=========================================="
echo ""

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP << 'EOF'
set -e

cd /home/ubuntu

echo "=== 1. 현재 상태 확인 ==="
echo ""
echo "메모리 상태:"
free -h | grep Mem
echo ""

echo "=== 2. 필수 도구 재설치 ==="
echo ""
# apt-get 업데이트
sudo apt-get update -qq

# curl, wget 재설치
sudo apt-get install --reinstall -y curl wget ca-certificates

# 설치 확인
echo "curl 확인:"
which curl || echo "curl 설치 실패"
curl --version 2>&1 | head -1 || echo "curl 실행 실패"

echo ""
echo "wget 확인:"
which wget || echo "wget 설치 실패"
wget --version 2>&1 | head -1 || echo "wget 실행 실패"
echo ""

echo "=== 3. 기존 Node.js 완전 제거 ==="
echo ""
# 모든 Node.js 관련 패키지 제거
sudo apt-get remove -y nodejs npm 2>/dev/null || true
sudo apt-get purge -y nodejs npm 2>/dev/null || true
sudo apt-get autoremove -y 2>/dev/null || true

# 수동 설치된 Node.js 제거
sudo rm -rf /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx 2>/dev/null || true
sudo rm -rf /usr/local/lib/node_modules 2>/dev/null || true
sudo rm -rf /opt/nodejs 2>/dev/null || true

# NVM 제거
rm -rf "$HOME/.nvm" 2>/dev/null || true

# .bashrc에서 NVM 설정 제거
if [ -f "$HOME/.bashrc" ]; then
    sed -i '/NVM_DIR/d' "$HOME/.bashrc" 2>/dev/null || true
    sed -i '/nvm.sh/d' "$HOME/.bashrc" 2>/dev/null || true
fi

echo "✅ 기존 Node.js 제거 완료"
echo ""

echo "=== 4. Node.js 설치 (NodeSource 저장소) ==="
echo ""
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 설치
sudo apt-get install -y nodejs

echo ""
echo "=== 5. 설치 확인 ==="
echo ""
node -v
npm -v
echo ""

echo "=== 6. NPM 업데이트 ==="
echo ""
sudo npm install -g npm@latest
npm -v
echo ""

echo "=== 7. PM2 설치 ==="
echo ""
sudo npm install -g pm2@latest
pm2 -v
echo ""

echo "=== 8. PM2 시스템 서비스 설정 ==="
echo ""
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || echo "PM2 startup 설정 (이미 설정되어 있을 수 있음)"
echo ""

echo "=== 9. 프로젝트 디렉토리로 이동 ==="
echo ""
cd /home/ubuntu/iamvet

echo "=== 10. 최종 확인 ==="
echo ""
echo "Node.js 버전:"
node -v
echo ""

echo "NPM 버전:"
npm -v
echo ""

echo "PM2 버전:"
pm2 -v
echo ""

echo "메모리 상태:"
free -h | grep Mem
echo ""

echo "✅ Node.js 및 PM2 설치 완료"
echo ""
echo "다음 단계:"
echo "  1. 애플리케이션 시작:"
echo "     cd /home/ubuntu/iamvet"
echo "     pm2 start ecosystem.config.js"
EOF

echo ""
echo "=========================================="
echo "설치 완료"
echo "=========================================="
echo ""
echo "다음 명령어로 애플리케이션을 시작하세요:"
echo "  ./deploy/restart-app-after-fix.sh"



