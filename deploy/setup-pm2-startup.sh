#!/bin/bash
# Status: ACTIVE
# Purpose: PM2 재부팅 후 자동 시작 설정 (초기 설정용, 한 번만 실행)
# Usage: ./deploy/setup-pm2-startup.sh

# PM2 재부팅 후 자동 시작 설정
# 서버 재부팅 시 PM2가 자동으로 애플리케이션을 시작하도록 설정

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo "❌ 설정 파일(config.sh)을 찾을 수 없습니다."
    exit 1
fi

# SSH 키 파일 자동 찾기
KEY_FILE=""
if [ -f "$SCRIPT_DIR/keys/$KEY_NAME.pem" ]; then
    KEY_FILE="$SCRIPT_DIR/keys/$KEY_NAME.pem"
elif [ -f "$SCRIPT_DIR/$KEY_PATH/$KEY_NAME.pem" ]; then
    KEY_FILE="$SCRIPT_DIR/$KEY_PATH/$KEY_NAME.pem"
else
    echo "❌ SSH 키 파일을 찾을 수 없습니다."
    echo "   찾은 위치:"
    echo "   - $SCRIPT_DIR/keys/$KEY_NAME.pem"
    echo "   - $SCRIPT_DIR/$KEY_PATH/$KEY_NAME.pem"
    exit 1
fi

PUBLIC_IP="3.38.238.205"

echo "=========================================="
echo "PM2 재부팅 후 자동 시작 설정"
echo "=========================================="
echo ""
echo "SSH 키: $KEY_FILE"
echo "서버: ubuntu@$PUBLIC_IP"
echo ""

ssh -i $KEY_FILE ubuntu@$PUBLIC_IP << 'EOF'
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "=== PM2 상태 확인 ==="
pm2 list
echo ""

echo "=== PM2 startup 설정 ==="
# 기존 startup 스크립트 제거 (있다면)
pm2 unstartup 2>/dev/null || true

# 새로운 startup 스크립트 생성
pm2 startup

echo ""
echo "=== ecosystem.config.js 확인 ==="
cd /home/ubuntu/iamvet
if [ ! -f "ecosystem.config.js" ]; then
    echo "❌ ecosystem.config.js 파일이 없습니다."
    echo "배포 워크플로우를 실행하여 파일을 생성하세요."
    exit 1
fi

echo "✅ ecosystem.config.js 파일 존재"
echo ""

echo "=== PM2 프로세스 시작 및 저장 ==="
# PM2 프로세스가 없으면 시작
if ! pm2 list | grep -q iamvet; then
    echo "PM2 프로세스 시작 중..."
    pm2 start ecosystem.config.js
    sleep 5
else
    echo "PM2 프로세스 이미 실행 중"
fi

# PM2 프로세스 목록 저장 (재부팅 후 자동 시작)
pm2 save

echo ""
echo "=== PM2 startup 설정 확인 ==="
# startup 스크립트 확인
if [ -f "/etc/systemd/system/pm2-ubuntu.service" ] || [ -f "/etc/systemd/system/pm2-root.service" ]; then
    echo "✅ PM2 startup 서비스 설정됨"
    sudo systemctl status pm2-ubuntu 2>/dev/null | head -5 || sudo systemctl status pm2-root 2>/dev/null | head -5 || echo "서비스 확인 중..."
else
    echo "⚠️  PM2 startup 서비스 파일을 찾을 수 없습니다."
    echo "다시 설정을 시도합니다..."
    pm2 startup
    pm2 save
fi

echo ""
echo "=== 테스트: PM2 프로세스 목록 확인 ==="
pm2 list

echo ""
echo "=== 재부팅 후 자동 시작 확인 방법 ==="
echo "1. 서버 재부팅: sudo reboot"
echo "2. 재부팅 후 확인: pm2 list"
echo "3. iamvet 프로세스가 자동으로 시작되어야 합니다."
EOF

echo ""
echo "=========================================="
echo "✅ PM2 재부팅 후 자동 시작 설정 완료"
echo "=========================================="
echo ""
echo "이제 서버가 재부팅되어도 PM2가 자동으로 애플리케이션을 시작합니다."
echo ""
echo "테스트 방법:"
echo "  1. 서버 재부팅: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'sudo reboot'"
echo "  2. 재부팅 후 확인: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 list'"

