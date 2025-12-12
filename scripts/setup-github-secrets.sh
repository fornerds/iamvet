#!/bin/bash
# GitHub Secrets 설정 스크립트
# .env.production 파일을 기반으로 GitHub Secrets를 설정합니다

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# GitHub CLI 설치 확인
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh)가 설치되지 않았습니다."
    echo "설치 방법: brew install gh"
    echo "또는 https://cli.github.com/ 에서 설치하세요."
    exit 1
fi

# GitHub 인증 확인
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub에 로그인되지 않았습니다."
    echo "로그인: gh auth login"
    exit 1
fi

# 저장소 확인
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "fornerds/iamvet")
echo "저장소: $REPO"

# .env.production 파일 확인
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production 파일을 찾을 수 없습니다."
    exit 1
fi

echo ""
echo "=========================================="
echo "GitHub Secrets 설정"
echo "=========================================="
echo ""

# DATABASE_URL 처리 (특수 문자 이스케이프)
echo "⚠️  DATABASE_URL의 특수 문자를 확인합니다..."
DATABASE_URL=$(grep "^DATABASE_URL=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')

# URL 인코딩된 값을 디코딩
# %21 -> !, %23 -> #
DATABASE_URL_DECODED=$(echo "$DATABASE_URL" | sed 's/%21/!/g; s/%23/#/g')

echo "원본 (인코딩됨): ${DATABASE_URL:0:50}..."
echo "디코딩됨: ${DATABASE_URL_DECODED:0:50}..."
echo ""

# 각 환경 변수를 GitHub Secret으로 설정
set_secret() {
    local name=$1
    local value=$2
    
    if [ -z "$value" ]; then
        echo "⚠️  $name: 값이 비어있어 건너뜁니다."
        return
    fi
    
    echo "설정 중: $name"
    echo "$value" | gh secret set "$name" --repo "$REPO"
    echo "✅ $name 설정 완료"
    echo ""
}

# 필수 Secrets 설정
echo "=== 필수 Secrets 설정 ==="

# DATABASE_URL (디코딩된 값 사용)
set_secret "DATABASE_URL" "$DATABASE_URL_DECODED"

# JWT Secrets
set_secret "JWT_SECRET" "$(grep "^JWT_SECRET=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "ADMIN_JWT_SECRET" "$(grep "^ADMIN_JWT_SECRET=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"

# AWS 설정
set_secret "AWS_ACCESS_KEY_ID" "$(grep "^AWS_ACCESS_KEY_ID=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "AWS_SECRET_ACCESS_KEY" "$(grep "^AWS_SECRET_ACCESS_KEY=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "AWS_REGION" "$(grep "^AWS_REGION=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "AWS_S3_BUCKET_NAME" "$(grep "^AWS_S3_BUCKET_NAME=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "NEXT_PUBLIC_S3_BUCKET_NAME" "$(grep "^NEXT_PUBLIC_S3_BUCKET_NAME=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "NEXT_PUBLIC_AWS_REGION" "$(grep "^AWS_REGION=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"

# OAuth 설정
set_secret "GOOGLE_CLIENT_ID" "$(grep "^GOOGLE_CLIENT_ID=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "GOOGLE_CLIENT_SECRET" "$(grep "^GOOGLE_CLIENT_SECRET=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "KAKAO_CLIENT_ID" "$(grep "^KAKAO_CLIENT_ID=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "KAKAO_CLIENT_SECRET" "$(grep "^KAKAO_CLIENT_SECRET=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "NAVER_CLIENT_ID" "$(grep "^NAVER_CLIENT_ID=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "NAVER_CLIENT_SECRET" "$(grep "^NAVER_CLIENT_SECRET=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"

# Next.js 설정
set_secret "NEXT_PUBLIC_SITE_URL" "$(grep "^NEXT_PUBLIC_SITE_URL=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "NEXT_PUBLIC_API_URL" "$(grep "^NEXT_PUBLIC_API_URL=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//' || echo "$(grep "^NEXT_PUBLIC_SITE_URL=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')")"
set_secret "NEXT_PUBLIC_BASE_URL" "$(grep "^NEXT_PUBLIC_BASE_URL=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//' || echo "$(grep "^NEXT_PUBLIC_SITE_URL=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')")"
set_secret "NEXT_PUBLIC_NAVER_MAP_CLIENT_ID" "$(grep "^NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"

# Email 설정
set_secret "EMAIL_USER" "$(grep "^EMAIL_USER=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "EMAIL_APP_PASSWORD" "$(grep "^EMAIL_APP_PASSWORD=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"

# 카카오 알림톡
set_secret "USE_KAKAO_BUSINESS_API" "$(grep "^USE_KAKAO_BUSINESS_API=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "KAKAO_ALIMTALK_TEMPLATE_ID" "$(grep "^KAKAO_ALIMTALK_TEMPLATE_ID=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"

# 기타
set_secret "NEXTAUTH_SECRET" "$(grep "^NEXTAUTH_SECRET=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "NEXTAUTH_URL" "$(grep "^NEXTAUTH_URL=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')"
set_secret "CORS_ORIGIN" "$(grep "^CORS_ORIGIN=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//' || echo "$(grep "^NEXT_PUBLIC_SITE_URL=" .env.production | cut -d'=' -f2- | sed 's/^"//;s/"$//')")"

echo ""
echo "=========================================="
echo "✅ GitHub Secrets 설정 완료"
echo "=========================================="
echo ""
echo "다음 단계:"
echo "1. GitHub 저장소의 Settings > Secrets and variables > Actions에서 확인"
echo "2. GitHub Actions 워크플로우 재실행"

