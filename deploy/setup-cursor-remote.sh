#!/bin/bash
# Status: MAINTENANCE
# Purpose: Cursor Remote SSH 연결을 위한 필수 도구 설치
# Usage: ./deploy/setup-cursor-remote.sh

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
    echo "   다음 위치에서 키 파일을 확인하세요:"
    echo "   - deploy/keys/iamvet-key-new.pem"
    echo "   - deploy/keys/iamvet-key.pem"
    exit 1
fi

# 연결 정보 파일에서 IP 확인
if [ -f "keys/deployment-info.txt" ]; then
    PUBLIC_IP=$(grep "Public IP:" keys/deployment-info.txt | awk '{print $3}' | head -1)
elif [ -f "keys/connection-info.txt" ]; then
    PUBLIC_IP=$(grep "Public IP:" keys/connection-info.txt | awk '{print $3}' | head -1)
else
    # 기본값 사용
    PUBLIC_IP="3.38.238.205"
fi

EC2_USER="ubuntu"

echo "=========================================="
echo "🔧 Cursor Remote SSH 설정"
echo "=========================================="
echo ""
echo "서버: ${EC2_USER}@${PUBLIC_IP}"
echo "SSH 키: ${KEY_FILE}"
echo ""

# SSH 키 권한 확인
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ SSH 키 파일을 찾을 수 없습니다: $KEY_FILE"
    exit 1
fi

chmod 600 "$KEY_FILE" 2>/dev/null || true

echo "서버에 접속하여 필수 도구를 설치합니다..."
echo ""

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ${EC2_USER}@${PUBLIC_IP} << 'ENDSSH'
set -e

echo "=== 1. 시스템 업데이트 ==="
sudo apt-get update -qq

echo ""
echo "=== 2. 필수 도구 설치 확인 ==="

# curl 설치 확인 및 설치
if ! command -v curl &> /dev/null; then
    echo "📦 curl 설치 중..."
    sudo apt-get install -y curl
else
    echo "✅ curl 이미 설치됨: $(curl --version | head -1)"
fi

# wget 설치 확인 및 설치
if ! command -v wget &> /dev/null; then
    echo "📦 wget 설치 중..."
    sudo apt-get install -y wget
else
    echo "✅ wget 이미 설치됨: $(wget --version | head -1)"
fi

echo ""
echo "=== 3. Cursor 서버 디렉토리 생성 ==="
mkdir -p ~/.cursor-server
chmod 755 ~/.cursor-server
echo "✅ ~/.cursor-server 디렉토리 생성 완료"

echo ""
echo "=== 4. 설치 확인 ==="
echo "curl 위치 및 버전:"
if command -v curl &> /dev/null; then
    which curl
    curl --version | head -1
else
    echo "❌ curl을 찾을 수 없습니다"
fi

echo ""
echo "wget 위치 및 버전:"
if command -v wget &> /dev/null; then
    which wget
    wget --version | head -1
else
    echo "❌ wget을 찾을 수 없습니다"
fi

echo ""
echo "디렉토리 확인:"
if [ -d ~/.cursor-server ]; then
    ls -ld ~/.cursor-server
else
    echo "❌ ~/.cursor-server 디렉토리가 없습니다"
    echo "생성 중..."
    mkdir -p ~/.cursor-server
    chmod 755 ~/.cursor-server
    ls -ld ~/.cursor-server
fi

echo ""
echo "=========================================="
echo "✅ Cursor Remote SSH 설정 완료!"
echo "=========================================="
echo ""
echo "이제 Cursor에서 Remote SSH 연결을 시도할 수 있습니다."
echo ""
ENDSSH

echo ""
echo "✅ 설정 완료!"
echo ""
echo "다음 단계:"
echo "1. Cursor에서 Remote SSH 연결을 다시 시도하세요"
echo "2. 호스트: ec2-prd-iamvet 또는 ${PUBLIC_IP}"
echo ""

