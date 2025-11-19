#!/bin/bash

# Nginx SSL 설정 스크립트 (www와 non-www 모두 처리)
# 사용법: ./setup-nginx-ssl.sh <PUBLIC_IP> <DOMAIN_NAME>
# 예: ./setup-nginx-ssl.sh 3.38.238.205 iam-vet.com

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "사용법: ./setup-nginx-ssl.sh <PUBLIC_IP> <DOMAIN_NAME>"
    echo "예: ./setup-nginx-ssl.sh 3.38.238.205 iam-vet.com"
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

echo "Nginx SSL 설정 시작: $DOMAIN_NAME"

# Nginx SSL 설정
ssh -i $KEY_FILE ubuntu@$PUBLIC_IP << EOF
set -e

# SSL 인증서 존재 여부 확인
SSL_CERT="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"

if [ ! -f "\$SSL_CERT" ] || [ ! -f "\$SSL_KEY" ]; then
    echo "SSL 인증서가 없습니다. 먼저 setup-ssl.sh를 실행하세요."
    exit 1
fi

# Nginx 설정 파일 생성
sudo tee /etc/nginx/sites-available/iamvet > /dev/null << 'NGINXEOF'
# HTTP에서 HTTPS로 리다이렉트 (www 포함)
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;
    
    # Let's Encrypt 인증을 위한 경로
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # 나머지는 HTTPS로 리다이렉트
    location / {
        return 301 https://DOMAIN_PLACEHOLDER\$request_uri;
    }
}

# HTTPS 서버 (non-www)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;
    
    # SSL 인증서 설정
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    
    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    client_max_body_size 50M;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    
    # Next.js 프록시
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # 정적 파일 캐싱
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
    
    # 폰트 파일 캐싱
    location /fonts {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Access-Control-Allow-Origin "*";
    }
    
    # 이미지 파일 캐싱
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }
}

# HTTPS 서버 (www -> non-www 리다이렉트)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.DOMAIN_PLACEHOLDER;
    
    # SSL 인증서 설정
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    
    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # www를 non-www로 리다이렉트
    return 301 https://DOMAIN_PLACEHOLDER\$request_uri;
}
NGINXEOF

# 도메인 이름 치환
sudo sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN_NAME/g" /etc/nginx/sites-available/iamvet

# 심볼릭 링크 생성
sudo ln -sf /etc/nginx/sites-available/iamvet /etc/nginx/sites-enabled/

# 기본 설정 제거
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo "Nginx SSL 설정 완료"
else
    echo "Nginx 설정 오류 발생"
    sudo nginx -t
    exit 1
fi
EOF

echo "Nginx SSL 설정이 완료되었습니다."
echo "도메인: https://$DOMAIN_NAME"
echo "도메인 (www): https://www.$DOMAIN_NAME (자동으로 non-www로 리다이렉트)"

