#!/bin/bash

# EC2 서버 상태 확인 스크립트
# 사용법: ./check-server-status.sh

set -e

# 설정 파일 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo "설정 파일(config.sh)을 찾을 수 없습니다."
    exit 1
fi

KEY_FILE="$KEY_PATH/$KEY_NAME.pem"
PUBLIC_IP="3.38.238.205"

echo "=========================================="
echo "EC2 서버 상태 확인"
echo "=========================================="
echo ""

# 1. DNS 확인
echo "1. DNS 전파 확인"
echo "------------------------------------------"
nslookup iam-vet.com 2>/dev/null | grep -A 2 "Name:" || dig iam-vet.com +short
echo ""

# 2. EC2 인스턴스 접속 테스트
echo "2. EC2 인스턴스 접속 테스트"
echo "------------------------------------------"
if ssh -i $KEY_FILE -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP "echo '연결 성공'" &> /dev/null; then
    echo "✅ EC2 인스턴스 접속 가능"
else
    echo "❌ EC2 인스턴스 접속 실패"
    echo "   - 인스턴스가 실행 중인지 확인"
    echo "   - 보안 그룹에서 22번 포트가 열려있는지 확인"
    exit 1
fi
echo ""

# 3. 서버 상태 확인
echo "3. 서버 상태 확인"
echo "------------------------------------------"
ssh -i $KEY_FILE ubuntu@$PUBLIC_IP << 'EOF'
set -e

# NVM 환경 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "=== 시스템 상태 ==="
uptime
echo ""

echo "=== PM2 상태 ==="
if command -v pm2 &> /dev/null; then
    pm2 status || echo "PM2가 실행되지 않음"
else
    echo "PM2가 설치되지 않음"
fi
echo ""

echo "=== Nginx 상태 ==="
sudo systemctl status nginx --no-pager | head -5 || echo "Nginx가 실행되지 않음"
echo ""

echo "=== 포트 확인 ==="
if command -v ss &> /dev/null; then
    sudo ss -tlnp | grep -E ':(80|443|3000)' || echo "포트가 열려있지 않음"
elif command -v netstat &> /dev/null; then
    sudo netstat -tlnp | grep -E ':(80|443|3000)' || echo "포트가 열려있지 않음"
else
    echo "포트 확인 도구가 없음"
fi
echo ""

echo "=== Next.js 로컬 테스트 ==="
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Next.js 정상 작동"
else
    echo "❌ Next.js 오류"
fi
echo ""

echo "=== Nginx 로컬 테스트 ==="
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Nginx 정상 작동"
else
    echo "❌ Nginx 오류"
fi
echo ""

echo "=== 프로젝트 디렉토리 확인 ==="
if [ -d "/home/ubuntu/iamvet" ]; then
    echo "✅ 프로젝트 디렉토리 존재"
    cd /home/ubuntu/iamvet
    echo "현재 디렉토리: $(pwd)"
    echo "디렉토리 내용:"
    ls -la | head -10
else
    echo "❌ 프로젝트 디렉토리가 없음"
fi
EOF

echo ""
echo "4. 외부 접속 테스트"
echo "------------------------------------------"
echo "HTTP 접속 테스트:"
if curl -I http://$PUBLIC_IP --max-time 5 2>&1 | head -1; then
    echo "✅ HTTP 접속 가능"
else
    echo "❌ HTTP 접속 실패"
fi
echo ""

echo "HTTPS 접속 테스트:"
if curl -I https://$PUBLIC_IP --max-time 5 -k 2>&1 | head -1; then
    echo "✅ HTTPS 접속 가능"
else
    echo "❌ HTTPS 접속 실패 (SSL 인증서 미설정 가능)"
fi
echo ""

echo "=========================================="
echo "진단 완료"
echo "=========================================="

