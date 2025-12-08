#!/bin/bash
# Status: MAINTENANCE
# Purpose: Cursor Remote SSH 디렉토리 문제 해결
# Usage: ./deploy/fix-cursor-remote-dirs.sh

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

echo "🔧 Cursor Remote SSH 디렉토리 문제 해결"
echo "서버: ${EC2_USER}@${PUBLIC_IP}"
echo ""

chmod 600 "$KEY_FILE" 2>/dev/null || true

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ${EC2_USER}@${PUBLIC_IP} << 'ENDSSH'
set -e

echo "=== 1. 디렉토리 생성 ==="
mkdir -p ~/.cursor-server
sudo mkdir -p /tmp/.cursor-server
sudo chown ubuntu:ubuntu /tmp/.cursor-server
chmod 755 ~/.cursor-server
sudo chmod 755 /tmp/.cursor-server

echo "✅ 홈 디렉토리: ~/.cursor-server"
ls -ld ~/.cursor-server
echo "✅ 임시 디렉토리: /tmp/.cursor-server"
ls -ld /tmp/.cursor-server

echo ""
echo "=== 2. 기존 파일 확인 ==="
if [ -d ~/.cursor-server ] && [ "$(ls -A ~/.cursor-server 2>/dev/null)" ]; then
    echo "홈 디렉토리 파일:"
    ls -lh ~/.cursor-server/ | head -5
    
    # 홈 디렉토리의 파일을 임시 디렉토리로 복사
    echo ""
    echo "=== 3. 파일 복사 ==="
    sudo cp -r ~/.cursor-server/* /tmp/.cursor-server/ 2>/dev/null && echo "✅ 파일 복사 완료" || echo "⚠️  복사할 파일 없음"
    
    echo ""
    echo "임시 디렉토리 파일:"
    ls -lh /tmp/.cursor-server/ | head -5
else
    echo "홈 디렉토리에 파일이 없습니다."
fi

echo ""
echo "=== 4. 최종 확인 ==="
echo "두 디렉토리 모두 준비되었습니다:"
echo "  - ~/.cursor-server (Cursor가 파일 복사하는 위치)"
echo "  - /tmp/.cursor-server (설치 스크립트가 찾는 위치)"

echo ""
echo "✅ 설정 완료!"
ENDSSH

echo ""
echo "✅ 완료! Cursor에서 Remote SSH 연결을 다시 시도하세요."

