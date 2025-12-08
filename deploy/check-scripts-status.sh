#!/bin/bash

# 스크립트 상태 확인 스크립트
# deploy/ 디렉토리의 모든 스크립트 상태를 확인

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo "=========================================="
echo "📋 Deploy 스크립트 상태 확인"
echo "=========================================="
echo ""

# 스크립트 파일 목록
SCRIPTS=$(find . -maxdepth 1 -name "*.sh" -type f | sort)

# 상태별 카운트
ACTIVE_COUNT=0
MAINTENANCE_COUNT=0
ARCHIVED_COUNT=0
DEPRECATED_COUNT=0
UNKNOWN_COUNT=0

echo "스크립트 목록:"
echo "----------------------------------------"
echo ""

for script in $SCRIPTS; do
    script_name=$(basename "$script")
    
    # 스크립트 헤더에서 상태 확인
    status_line=$(grep -E "^#\s*Status:" "$script" 2>/dev/null | head -1)
    if [ -n "$status_line" ]; then
        status=$(echo "$status_line" | sed 's/^#\s*Status:\s*//' | tr '[:lower:]' '[:upper:]' | tr -d ' ')
    else
        status="UNKNOWN"
    fi
    
    # 목적 확인
    purpose_line=$(grep -E "^#\s*Purpose:" "$script" 2>/dev/null | head -1)
    if [ -n "$purpose_line" ]; then
        purpose=$(echo "$purpose_line" | sed 's/^#\s*Purpose:\s*//')
    else
        purpose="설명 없음"
    fi
    
    # 실행 권한 확인
    if [ -x "$script" ]; then
        exec_status="✅ 실행 가능"
    else
        exec_status="❌ 실행 불가"
    fi
    
    # 파일 크기
    size=$(du -h "$script" | cut -f1)
    
    # 마지막 수정 시간
    modified=$(stat -f "%Sm" -t "%Y-%m-%d" "$script" 2>/dev/null || stat -c "%y" "$script" 2>/dev/null | cut -d' ' -f1)
    
    # 상태별 색상 및 아이콘
    case "$status" in
        "ACTIVE")
            icon="✅"
            color=$GREEN
            ((ACTIVE_COUNT++))
            ;;
        "MAINTENANCE")
            icon="🔧"
            color=$YELLOW
            ((MAINTENANCE_COUNT++))
            ;;
        "ARCHIVED")
            icon="📦"
            color=$GRAY
            ((ARCHIVED_COUNT++))
            ;;
        "DEPRECATED")
            icon="⚠️"
            color=$YELLOW
            ((DEPRECATED_COUNT++))
            ;;
        *)
            icon="❓"
            color=$BLUE
            ((UNKNOWN_COUNT++))
            ;;
    esac
    
    echo -e "${color}${icon} ${script_name}${NC}"
    echo -e "   상태: ${color}${status}${NC}"
    echo -e "   목적: ${purpose}"
    echo -e "   ${exec_status} | 크기: ${size} | 수정: ${modified}"
    echo ""
done

echo "=========================================="
echo "📊 통계"
echo "=========================================="
echo -e "${GREEN}✅ ACTIVE (사용 중): ${ACTIVE_COUNT}${NC}"
echo -e "${YELLOW}🔧 MAINTENANCE (유지보수용): ${MAINTENANCE_COUNT}${NC}"
echo -e "${GRAY}📦 ARCHIVED (보관): ${ARCHIVED_COUNT}${NC}"
echo -e "${YELLOW}⚠️  DEPRECATED (사용 중단): ${DEPRECATED_COUNT}${NC}"
echo -e "${BLUE}❓ UNKNOWN (상태 미지정): ${UNKNOWN_COUNT}${NC}"
echo ""

# 상태 미지정 스크립트가 있으면 알림
if [ $UNKNOWN_COUNT -gt 0 ]; then
    echo "⚠️  상태가 미지정된 스크립트가 있습니다."
    echo "   각 스크립트 파일에 다음 헤더를 추가하세요:"
    echo ""
    echo "   #!/bin/bash"
    echo "   # Status: ACTIVE | MAINTENANCE | ARCHIVED | DEPRECATED"
    echo "   # Purpose: 스크립트 목적 설명"
    echo ""
fi

echo "=========================================="
echo "📚 자세한 정보"
echo "=========================================="
echo "   - 스크립트 인덱스: deploy/SCRIPTS_INDEX.md"
echo "   - 기본 가이드: deploy/README.md"
echo ""

