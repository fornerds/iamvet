# AWS Route 53 DNS 설정 가이드

AWS에서 구매한 도메인을 EC2 인스턴스에 연결하는 방법입니다.

## 📋 사전 준비

- AWS에서 도메인 구매 완료 (예: `iam-vet.com`)
- EC2 인스턴스 실행 중 (Public IP: `3.38.238.205`)
- Elastic IP 할당 완료 (권장)

## 🔧 1단계: Route 53 호스팅 영역 생성

### AWS 콘솔에서 설정

1. **Route 53 콘솔 접속**
   - https://console.aws.amazon.com/route53 접속

2. **호스팅 영역 생성**
   - 왼쪽 메뉴에서 "호스팅 영역" 클릭
   - "호스팅 영역 생성" 버튼 클릭
   - 도메인 이름 입력: `iam-vet.com`
   - 유형: "공용 호스팅 영역" 선택
   - "호스팅 영역 생성" 클릭

3. **NS 레코드 확인**
   - 생성된 호스팅 영역에서 NS 레코드 확인
   - 이 값들을 도메인 등록 기관에 설정해야 합니다

## 🌐 2단계: 도메인 등록 기관에서 네임서버 설정

### Route 53에서 도메인을 구매한 경우

자동으로 설정되므로 추가 작업이 필요 없습니다.

### 다른 등록 기관에서 구매한 경우

1. **도메인 등록 기관 콘솔 접속**
   - 예: 가비아, 후이즈, GoDaddy 등

2. **네임서버 변경**
   - 도메인 관리 > DNS 설정 > 네임서버 변경
   - Route 53에서 확인한 NS 레코드 4개를 입력
   - 예:
     ```
     ns-123.awsdns-12.com
     ns-456.awsdns-45.net
     ns-789.awsdns-78.org
     ns-012.awsdns-01.co.uk
     ```

3. **변경 사항 저장**
   - 네임서버 변경은 최대 48시간까지 소요될 수 있습니다
   - 보통 몇 시간 내에 반영됩니다

## 📝 3단계: Route 53 레코드 생성

### A 레코드 생성 (루트 도메인)

1. **호스팅 영역에서 레코드 생성**
   - `iam-vet.com` 호스팅 영역 선택
   - "레코드 생성" 버튼 클릭

2. **레코드 설정**
   - **레코드 이름**: 비워두기 (루트 도메인)
   - **레코드 유형**: A
   - **값/트래픽 라우팅 대상**: 
     - "IP 주소 또는 다른 값" 선택
     - EC2 인스턴스의 Elastic IP 입력: `3.38.238.205`
   - **TTL**: 300 (5분) 또는 원하는 값
   - "레코드 생성" 클릭

### A 레코드 생성 (www 서브도메인)

1. **레코드 생성**
   - "레코드 생성" 버튼 클릭

2. **레코드 설정**
   - **레코드 이름**: `www`
   - **레코드 유형**: A
   - **값/트래픽 라우팅 대상**: 
     - "IP 주소 또는 다른 값" 선택
     - EC2 인스턴스의 Elastic IP 입력: `3.38.238.205`
   - **TTL**: 300
   - "레코드 생성" 클릭

### CNAME 레코드로 www 리다이렉트 (선택사항)

www를 non-www로 리다이렉트하려면 Nginx 설정에서 처리합니다 (다음 단계 참조).

## 🔒 4단계: SSL 인증서 설정 (Let's Encrypt)

> **💰 비용**: Let's Encrypt SSL 인증서는 **완전히 무료**입니다. 추가 결제가 필요 없습니다.
> 
> 자세한 내용: [SSL 인증서 정보](SSL_CERTIFICATE_INFO.md)

### Certbot 설치 및 인증서 발급

```bash
# EC2에 SSH 접속
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205

# Certbot 설치
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (www와 non-www 모두 포함)
sudo certbot --nginx -d iam-vet.com -d www.iam-vet.com

# 인증서 자동 갱신 설정
sudo certbot renew --dry-run
```

Certbot이 자동으로:
- SSL 인증서 발급
- Nginx 설정 업데이트
- 자동 갱신 설정

### 수동으로 인증서 발급 (고급)

```bash
# 인증서만 발급 (Nginx 설정은 수동)
sudo certbot certonly --nginx -d iam-vet.com -d www.iam-vet.com

# 인증서 위치
# /etc/letsencrypt/live/iam-vet.com/fullchain.pem
# /etc/letsencrypt/live/iam-vet.com/privkey.pem
```

## 🌍 5단계: Nginx 설정 업데이트

www와 non-www 모두 처리하도록 Nginx 설정을 업데이트합니다.

### Nginx 설정 파일 생성

```bash
# EC2에 SSH 접속
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205

# Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/iamvet
```

다음 내용을 입력:

```nginx
# HTTP에서 HTTPS로 리다이렉트 (www 포함)
server {
    listen 80;
    listen [::]:80;
    server_name iam-vet.com www.iam-vet.com;
    
    # Let's Encrypt 인증을 위한 경로
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # 나머지는 HTTPS로 리다이렉트
    location / {
        return 301 https://iam-vet.com$request_uri;
    }
}

# HTTPS 서버 (non-www)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name iam-vet.com;
    
    # SSL 인증서 설정
    ssl_certificate /etc/letsencrypt/live/iam-vet.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iam-vet.com/privkey.pem;
    
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
    server_name www.iam-vet.com;
    
    # SSL 인증서 설정
    ssl_certificate /etc/letsencrypt/live/iam-vet.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iam-vet.com/privkey.pem;
    
    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # www를 non-www로 리다이렉트
    return 301 https://iam-vet.com$request_uri;
}
```

### Nginx 설정 활성화

```bash
# 심볼릭 링크 생성
sudo ln -sf /etc/nginx/sites-available/iamvet /etc/nginx/sites-enabled/

# 기본 설정 제거
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## ✅ 6단계: DNS 전파 확인

```bash
# DNS 전파 확인
dig iam-vet.com
dig www.iam-vet.com

# 또는
nslookup iam-vet.com
nslookup www.iam-vet.com
```

## 🔍 7단계: 도메인 접속 테스트

1. **HTTP 접속 테스트**
   ```bash
   curl -I http://iam-vet.com
   curl -I http://www.iam-vet.com
   ```
   - 둘 다 HTTPS로 리다이렉트되어야 합니다

2. **HTTPS 접속 테스트**
   ```bash
   curl -I https://iam-vet.com
   curl -I https://www.iam-vet.com
   ```
   - `www.iam-vet.com`은 `iam-vet.com`으로 리다이렉트되어야 합니다

3. **브라우저에서 확인**
   - https://iam-vet.com 접속
   - https://www.iam-vet.com 접속 (자동으로 non-www로 리다이렉트)

## 📝 체크리스트

- [ ] Route 53 호스팅 영역 생성
- [ ] 도메인 등록 기관에서 네임서버 변경
- [ ] A 레코드 생성 (루트 도메인)
- [ ] A 레코드 생성 (www 서브도메인)
- [ ] SSL 인증서 발급 (Certbot)
- [ ] Nginx 설정 업데이트
- [ ] DNS 전파 확인
- [ ] 도메인 접속 테스트

## 🔄 자동 갱신 설정 확인

Let's Encrypt 인증서는 90일마다 갱신해야 합니다. Certbot이 자동으로 갱신하도록 설정되어 있는지 확인:

```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# 자동 갱신 cron 작업 확인
sudo systemctl status certbot.timer
```

## ⚠️ 문제 해결

### DNS가 전파되지 않음

- 최대 48시간까지 소요될 수 있습니다
- 네임서버 설정이 올바른지 확인
- Route 53 NS 레코드와 도메인 등록 기관의 네임서버가 일치하는지 확인

### SSL 인증서 발급 실패

- 도메인이 EC2 인스턴스를 가리키고 있는지 확인
- 방화벽에서 80, 443 포트가 열려있는지 확인
- Nginx가 실행 중인지 확인

### www 리다이렉트가 작동하지 않음

- Nginx 설정 파일의 server_name이 올바른지 확인
- Nginx 설정 테스트: `sudo nginx -t`
- Nginx 재시작: `sudo systemctl restart nginx`

