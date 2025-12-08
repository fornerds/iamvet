#!/bin/bash
# Status: ACTIVE
# Purpose: 간단한 배포 상태 확인 (일상적인 사용)
# Usage: ./deploy/check-status.sh

# 간단한 배포 상태 확인 스크립트
# 사용법: ./deploy/check-status.sh

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

KEY_FILE="$SCRIPT_DIR/keys/$KEY_NAME.pem"
if [ ! -f "$KEY_FILE" ]; then
    KEY_FILE="$SCRIPT_DIR/$KEY_PATH/$KEY_NAME.pem"
fi

PUBLIC_IP="3.38.238.205"
DOMAIN="iam-vet.com"

echo "=========================================="
echo "🚀 아이엠벳 배포 상태 확인"
echo "=========================================="
echo ""

# 1. 도메인 접속 테스트 (가장 빠른 확인)
echo -e "${BLUE}1. 웹사이트 접속 확인${NC}"
DOMAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://$DOMAIN 2>&1 || echo "000")
if [ "$DOMAIN_STATUS" = "200" ] || [ "$DOMAIN_STATUS" = "301" ] || [ "$DOMAIN_STATUS" = "302" ]; then
    echo -e "${GREEN}✅ 웹사이트 정상 작동 (상태 코드: $DOMAIN_STATUS)${NC}"
    echo "   URL: https://$DOMAIN"
    STATUS="정상"
else
    echo -e "${RED}❌ 웹사이트 접속 실패 (상태 코드: $DOMAIN_STATUS)${NC}"
    STATUS="문제"
fi
echo ""

# 2. 서버 상태 확인 (SSH 접속 가능한 경우)
if [ -f "$KEY_FILE" ]; then
    echo -e "${BLUE}2. 서버 상태 확인${NC}"
    if ssh -i $KEY_FILE -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP "echo '연결 성공'" &> /dev/null; then
        echo -e "${GREEN}✅ 서버 접속 가능${NC}"
        
        # PM2 상태 확인
        PM2_STATUS=$(ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && pm2 list 2>/dev/null | grep -E "iamvet|online|stopped" || echo "없음"' 2>/dev/null || echo "확인불가")
        
        if echo "$PM2_STATUS" | grep -q "online"; then
            echo -e "${GREEN}✅ PM2 프로세스 실행 중${NC}"
        elif echo "$PM2_STATUS" | grep -q "stopped\|errored"; then
            echo -e "${RED}❌ PM2 프로세스 중지됨${NC}"
            STATUS="문제"
        else
            echo -e "${YELLOW}⚠️  PM2 상태 확인 불가${NC}"
        fi
        
        # 헬스체크 로그 확인
        HEALTH_LOG=$(ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'tail -1 /home/ubuntu/iamvet/logs/health-check.log 2>/dev/null || echo "없음"' 2>/dev/null || echo "확인불가")
        if echo "$HEALTH_LOG" | grep -q "✅"; then
            echo -e "${GREEN}✅ 최근 헬스체크: 정상${NC}"
        elif echo "$HEALTH_LOG" | grep -q "❌"; then
            echo -e "${RED}❌ 최근 헬스체크: 문제 발견${NC}"
            STATUS="문제"
        fi
    else
        echo -e "${RED}❌ 서버 접속 실패${NC}"
        STATUS="문제"
    fi
    echo ""
fi

# 3. 최종 상태 요약
echo "=========================================="
if [ "$STATUS" = "정상" ]; then
    echo -e "${GREEN}✅ 배포 상태: 정상${NC}"
    echo ""
    echo "모든 서비스가 정상적으로 작동 중입니다."
    echo "웹사이트: https://$DOMAIN"
else
    echo -e "${RED}❌ 배포 상태: 문제 발견${NC}"
    echo ""
    echo "문제가 발견되었습니다. 다음을 확인하세요:"
    echo "1. GitHub Actions: https://github.com/fornerds/iamvet/actions"
    echo "2. 서버 로그: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 logs iamvet --lines 50'"
    echo "3. 헬스체크 로그: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'tail -20 /home/ubuntu/iamvet/logs/health-check.log'"
fi
echo "=========================================="

