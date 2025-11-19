#!/bin/bash

# SSL 인증서 설정 스크립트
# 사용법: ./setup-ssl.sh <PUBLIC_IP> <DOMAIN_NAME>
# 예: ./setup-ssl.sh 3.38.238.205 iam-vet.com

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "사용법: ./setup-ssl.sh <PUBLIC_IP> <DOMAIN_NAME>"
    echo "예: ./setup-ssl.sh 3.38.238.205 iam-vet.com"
    exit 1
fi

PUBLIC_IP=$1
DOMAIN_NAME=$2

# 설정 파일 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo "설정 파일(config.sh)을 찾을 수 없습니다."
    exit 1
fi

KEY_FILE="$KEY_PATH/$KEY_NAME.pem"

echo "SSL 인증서 설정 시작: $DOMAIN_NAME"

# Certbot 설치 및 SSL 인증서 발급
ssh -i $KEY_FILE ubuntu@$PUBLIC_IP << EOF
set -e

# Certbot 설치
if ! command -v certbot &> /dev/null; then
    echo "Certbot 설치 중..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
else
    echo "Certbot가 이미 설치되어 있습니다."
fi

# SSL 인증서 발급 (www와 non-www 모두 포함)
echo "SSL 인증서 발급 중..."
sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME || {
    echo "Certbot 자동 설정 실패. 수동 설정을 진행합니다."
    
    # 수동으로 인증서만 발급
    sudo certbot certonly --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME || {
        echo "인증서 발급 실패. 도메인이 EC2를 가리키고 있는지 확인하세요."
        exit 1
    }
}

# 자동 갱신 설정 확인
echo "SSL 인증서 자동 갱신 테스트..."
sudo certbot renew --dry-run

echo "SSL 인증서 설정 완료"
EOF

echo "SSL 인증서 설정이 완료되었습니다."
echo "도메인: https://$DOMAIN_NAME"
echo "도메인 (www): https://www.$DOMAIN_NAME"

