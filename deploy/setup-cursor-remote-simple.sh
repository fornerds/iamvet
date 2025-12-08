#!/bin/bash
# Status: MAINTENANCE
# Purpose: Cursor Remote SSH 연결을 위한 간단한 설정 (메모리 부족 시 사용)
# Usage: ./deploy/setup-cursor-remote-simple.sh

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

echo "🔧 Cursor Remote SSH 간단 설정"
echo "서버: ${EC2_USER}@${PUBLIC_IP}"
echo ""

chmod 600 "$KEY_FILE" 2>/dev/null || true

# 간단한 명령으로 디렉토리만 생성
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ${EC2_USER}@${PUBLIC_IP} << 'ENDSSH'
# PATH 설정
export PATH=/usr/bin:/bin:/usr/local/bin:$PATH

# curl/wget 확인
echo "=== 설치 확인 ==="
if command -v curl >/dev/null 2>&1 || [ -f /usr/bin/curl ]; then
    echo "✅ curl 사용 가능"
    /usr/bin/curl --version 2>/dev/null | head -1 || echo "curl 설치됨"
else
    echo "⚠️  curl 없음 (설치 필요)"
fi

if command -v wget >/dev/null 2>&1 || [ -f /usr/bin/wget ]; then
    echo "✅ wget 사용 가능"
    /usr/bin/wget --version 2>/dev/null | head -1 || echo "wget 설치됨"
else
    echo "⚠️  wget 없음 (설치 필요)"
fi

echo ""
echo "=== Cursor 서버 디렉토리 생성 ==="
mkdir -p ~/.cursor-server
chmod 755 ~/.cursor-server
ls -ld ~/.cursor-server

echo ""
echo "✅ 설정 완료!"
ENDSSH

echo ""
echo "✅ 완료! Cursor에서 Remote SSH 연결을 다시 시도하세요."

