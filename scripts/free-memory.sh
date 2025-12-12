#!/bin/bash
# 서버 메모리 정리 스크립트

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# SSH 키 파일 자동 찾기
if [ -f "deploy/keys/iamvet-key-new.pem" ]; then
    KEY_FILE="deploy/keys/iamvet-key-new.pem"
elif [ -f "deploy/keys/iamvet-key.pem" ]; then
    KEY_FILE="deploy/keys/iamvet-key.pem"
else
    echo "❌ SSH 키 파일을 찾을 수 없습니다."
    exit 1
fi

# 연결 정보 파일에서 IP 확인
if [ -f "deploy/keys/deployment-info.txt" ]; then
    PUBLIC_IP=$(grep "Public IP:" deploy/keys/deployment-info.txt | awk '{print $3}' | head -1)
elif [ -f "deploy/keys/connection-info.txt" ]; then
    PUBLIC_IP=$(grep "Public IP:" deploy/keys/connection-info.txt | awk '{print $3}' | head -1)
else
    PUBLIC_IP="3.38.238.205"
fi

EC2_USER="ubuntu"

echo "=========================================="
echo "🧹 서버 메모리 정리"
echo "=========================================="
echo "서버: ${EC2_USER}@${PUBLIC_IP}"
echo ""

chmod 600 "$KEY_FILE" 2>/dev/null || true

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ${EC2_USER}@${PUBLIC_IP} << 'ENDSSH'
set -e

echo "=== 1. 현재 메모리 상태 ==="
free -h

echo ""
echo "=== 2. 메모리 사용 상위 프로세스 ==="
ps aux --sort=-%mem | head -10

echo ""
echo "=== 3. 불필요한 프로세스 정리 ==="
# PM2 프로세스는 유지
# 다른 Node.js 프로세스 종료 (필요시)
pkill -f "node.*install" 2>/dev/null || true
pkill -f "npm.*install" 2>/dev/null || true

echo ""
echo "=== 4. 캐시 정리 ==="
# npm 캐시 정리
npm cache clean --force 2>/dev/null || true

# 시스템 캐시 정리 (루트 권한 필요하지만 시도)
sync
echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 || echo "시스템 캐시 정리 권한 없음 (무시)"

echo ""
echo "=== 5. 정리 후 메모리 상태 ==="
free -h

echo ""
echo "=== 6. 스왑 사용량 ==="
swapon --show

echo ""
echo "=========================================="
echo "✅ 메모리 정리 완료"
echo "=========================================="
ENDSSH

echo ""
echo "✅ 메모리 정리 완료"

