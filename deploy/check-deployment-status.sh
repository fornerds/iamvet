#!/bin/bash
# Status: ACTIVE
# Purpose: 상세한 배포 상태 확인 (문제 진단용)
# Usage: ./deploy/check-deployment-status.sh

# 배포 상태 확인 스크립트
# 사용법: ./check-deployment-status.sh

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정 파일 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo -e "${RED}❌ 설정 파일(config.sh)을 찾을 수 없습니다.${NC}"
    exit 1
fi

# KEY_FILE 경로 수정 (스크립트 디렉토리 기준)
if [ -f "$SCRIPT_DIR/$KEY_PATH/$KEY_NAME.pem" ]; then
    KEY_FILE="$SCRIPT_DIR/$KEY_PATH/$KEY_NAME.pem"
elif [ -f "$SCRIPT_DIR/keys/$KEY_NAME.pem" ]; then
    KEY_FILE="$SCRIPT_DIR/keys/$KEY_NAME.pem"
else
    KEY_FILE="$KEY_PATH/$KEY_NAME.pem"
fi
PUBLIC_IP="3.38.238.205"
DOMAIN="iam-vet.com"

echo "=========================================="
echo "배포 상태 확인"
echo "=========================================="
echo ""

# 1. GitHub Actions 상태 확인
echo -e "${BLUE}1. GitHub Actions 상태 확인${NC}"
echo "------------------------------------------"
echo "GitHub Actions 워크플로우를 확인하려면:"
echo "  https://github.com/fornerds/iamvet/actions"
echo ""
echo "최근 배포 실행 여부를 확인하세요."
echo ""

# 2. DNS 확인
echo -e "${BLUE}2. DNS 전파 확인${NC}"
echo "------------------------------------------"
DNS_IP=$(dig +short $DOMAIN | tail -1)
if [ "$DNS_IP" = "$PUBLIC_IP" ]; then
    echo -e "${GREEN}✅ DNS 정상: $DOMAIN → $DNS_IP${NC}"
else
    echo -e "${YELLOW}⚠️  DNS 불일치: $DOMAIN → $DNS_IP (예상: $PUBLIC_IP)${NC}"
fi
echo ""

# 3. EC2 인스턴스 접속 테스트
echo -e "${BLUE}3. EC2 인스턴스 접속 테스트${NC}"
echo "------------------------------------------"
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $KEY_FILE${NC}"
    exit 1
fi

if ssh -i $KEY_FILE -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP "echo '연결 성공'" &> /dev/null; then
    echo -e "${GREEN}✅ EC2 인스턴스 접속 가능${NC}"
else
    echo -e "${RED}❌ EC2 인스턴스 접속 실패${NC}"
    echo "   - 인스턴스가 실행 중인지 확인"
    echo "   - 보안 그룹에서 22번 포트가 열려있는지 확인"
    exit 1
fi
echo ""

# 4. 서버 상태 확인
echo -e "${BLUE}4. 서버 상태 확인${NC}"
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
    PM2_STATUS=$(pm2 status | grep -E "iamvet|online|stopped|errored" || echo "PM2 프로세스 없음")
    if echo "$PM2_STATUS" | grep -q "online"; then
        echo "✅ PM2 프로세스 실행 중"
        pm2 status | grep iamvet
    elif echo "$PM2_STATUS" | grep -q "stopped\|errored"; then
        echo "❌ PM2 프로세스 중지됨 또는 오류"
        pm2 status | grep iamvet
        echo ""
        echo "최근 로그:"
        pm2 logs iamvet --lines 20 --nostream || true
    else
        echo "❌ PM2 프로세스가 없습니다"
    fi
else
    echo "❌ PM2가 설치되지 않음"
fi
echo ""

echo "=== Nginx 상태 ==="
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx 실행 중"
    sudo systemctl status nginx --no-pager | head -3
else
    echo "❌ Nginx가 실행되지 않음"
    sudo systemctl status nginx --no-pager | head -5 || true
fi
echo ""

echo "=== 포트 확인 ==="
if command -v ss &> /dev/null; then
    PORT_STATUS=$(sudo ss -tlnp | grep -E ':(80|443|3000)' || echo "포트가 열려있지 않음")
    echo "$PORT_STATUS"
elif command -v netstat &> /dev/null; then
    PORT_STATUS=$(sudo netstat -tlnp | grep -E ':(80|443|3000)' || echo "포트가 열려있지 않음")
    echo "$PORT_STATUS"
else
    echo "포트 확인 도구가 없음"
fi
echo ""

echo "=== Next.js 로컬 테스트 ==="
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Next.js 정상 작동 (localhost:3000)"
else
    echo "❌ Next.js 오류 (localhost:3000)"
    echo "응답:"
    curl -v http://localhost:3000 2>&1 | head -10 || true
fi
echo ""

echo "=== 프로젝트 디렉토리 확인 ==="
if [ -d "/home/ubuntu/iamvet" ]; then
    echo "✅ 프로젝트 디렉토리 존재"
    cd /home/ubuntu/iamvet
    echo "현재 브랜치: $(git branch --show-current 2>/dev/null || echo 'N/A')"
    echo "최근 커밋: $(git log -1 --oneline 2>/dev/null || echo 'N/A')"
    echo ""
    echo "빌드 디렉토리 확인:"
    if [ -d ".next" ]; then
        echo "✅ .next 디렉토리 존재"
        ls -lh .next | head -5
    else
        echo "❌ .next 디렉토리가 없음 (빌드 필요)"
    fi
else
    echo "❌ 프로젝트 디렉토리가 없음"
fi
echo ""

echo "=== 환경 변수 확인 ==="
if [ -f "/home/ubuntu/iamvet/.env.production" ]; then
    echo "✅ .env.production 파일 존재"
    echo "주요 환경 변수 확인:"
    grep -E "^(NODE_ENV|DATABASE_URL|NEXT_PUBLIC)" /home/ubuntu/iamvet/.env.production | head -5 || true
else
    echo "❌ .env.production 파일이 없음"
fi
EOF

echo ""
echo -e "${BLUE}5. 외부 접속 테스트${NC}"
echo "------------------------------------------"

# HTTP 접속 테스트
echo "HTTP 접속 테스트 ($PUBLIC_IP):"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://$PUBLIC_IP 2>&1 || echo "000")
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo -e "${GREEN}✅ HTTP 접속 가능 (상태 코드: $HTTP_STATUS)${NC}"
else
    echo -e "${RED}❌ HTTP 접속 실패 (상태 코드: $HTTP_STATUS)${NC}"
fi
echo ""

# HTTPS 접속 테스트
echo "HTTPS 접속 테스트 ($PUBLIC_IP):"
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -k https://$PUBLIC_IP 2>&1 || echo "000")
if [ "$HTTPS_STATUS" = "200" ] || [ "$HTTPS_STATUS" = "301" ] || [ "$HTTPS_STATUS" = "302" ]; then
    echo -e "${GREEN}✅ HTTPS 접속 가능 (상태 코드: $HTTPS_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS 접속 실패 (상태 코드: $HTTPS_STATUS)${NC}"
fi
echo ""

# 도메인 접속 테스트
if [ -n "$DOMAIN" ]; then
    echo "도메인 접속 테스트 ($DOMAIN):"
    DOMAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://$DOMAIN 2>&1 || echo "000")
    if [ "$DOMAIN_STATUS" = "200" ] || [ "$DOMAIN_STATUS" = "301" ] || [ "$DOMAIN_STATUS" = "302" ]; then
        echo -e "${GREEN}✅ 도메인 접속 가능 (상태 코드: $DOMAIN_STATUS)${NC}"
    else
        echo -e "${RED}❌ 도메인 접속 실패 (상태 코드: $DOMAIN_STATUS)${NC}"
    fi
    echo ""
fi

echo "=========================================="
echo -e "${BLUE}진단 완료${NC}"
echo "=========================================="
echo ""
echo "문제가 발견된 경우:"
echo "1. GitHub Actions 로그 확인: https://github.com/fornerds/iamvet/actions"
echo "2. PM2 로그 확인: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 logs iamvet --lines 50'"
echo "3. Nginx 로그 확인: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'sudo tail -50 /var/log/nginx/error.log'"
echo "4. 수동 배포 실행: ./deploy/deploy-to-ec2.sh"



