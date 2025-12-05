# HTTPS 타임아웃 문제 해결 가이드

HTTPS 접속 시 타임아웃이 발생하는 문제를 해결하는 방법입니다.

## 문제 증상

- HTTPS 접속 시 타임아웃 발생
- `curl: (28) Operation timed out`
- 브라우저에서 `ERR_CONNECTION_TIMED_OUT`

## 원인

1. **SSL 인증서 미설정**: SSL 인증서가 없거나 만료됨
2. **Nginx SSL 설정 누락**: HTTPS(443) 포트 설정이 없음
3. **보안 그룹 설정**: AWS 보안 그룹에서 포트 443이 열려있지 않음
4. **Nginx 미실행**: Nginx가 실행되지 않음

## 해결 방법

### 방법 1: 자동 해결 스크립트 실행 (권장)

```bash
cd deploy
./fix-timeout-issue.sh
```

이 스크립트는 다음을 자동으로 수행합니다:
- SSL 인증서 상태 확인
- Certbot 설치 (없는 경우)
- SSL 인증서 발급/갱신
- Nginx SSL 설정 확인 및 수정
- Nginx 재시작

### 방법 2: 수동 해결

#### 1단계: 서버 접속

```bash
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205
```

#### 2단계: SSL 인증서 확인

```bash
# SSL 인증서 파일 확인
sudo ls -la /etc/letsencrypt/live/iam-vet.com/

# 인증서 만료일 확인
sudo openssl x509 -in /etc/letsencrypt/live/iam-vet.com/fullchain.pem -noout -enddate
```

#### 3단계: SSL 인증서 발급 (없는 경우)

```bash
# Certbot 설치
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d iam-vet.com -d www.iam-vet.com
```

인증서 발급 시:
- 이메일 주소 입력
- 이용 약관 동의
- 도메인 소유권 확인 (자동)

#### 4단계: Nginx SSL 설정 확인

```bash
# Nginx 설정 파일 확인
sudo cat /etc/nginx/sites-available/iamvet | grep -A 5 "listen 443"

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

#### 5단계: 포트 확인

```bash
# 포트 443이 열려있는지 확인
sudo ss -tlnp | grep 443

# 로컬 HTTPS 테스트
curl -k https://localhost:443
```

#### 6단계: AWS 보안 그룹 확인

1. AWS 콘솔 접속: https://console.aws.amazon.com/ec2
2. 보안 그룹 선택
3. 인바운드 규칙 확인:
   - **포트 443 (HTTPS)**: 0.0.0.0/0 허용
   - **포트 80 (HTTP)**: 0.0.0.0/0 허용

포트 443이 없으면 추가:
- 유형: HTTPS
- 프로토콜: TCP
- 포트 범위: 443
- 소스: 0.0.0.0/0

## 문제별 해결 방법

### 문제 1: SSL 인증서 발급 실패

**증상**: `certbot` 실행 시 오류 발생

**원인**:
- DNS가 올바르게 설정되지 않음
- 포트 80이 열려있지 않음
- 도메인이 EC2를 가리키지 않음

**해결**:
```bash
# DNS 확인
dig iam-vet.com

# 포트 80 확인
sudo ss -tlnp | grep 80

# Nginx 실행 확인
sudo systemctl status nginx
```

### 문제 2: Nginx 설정 오류

**증상**: `nginx -t` 실행 시 오류 발생

**해결**:
```bash
# 설정 파일 확인
sudo nginx -t

# 오류 메시지 확인 후 수정
sudo nano /etc/nginx/sites-available/iamvet

# 다시 테스트
sudo nginx -t
```

### 문제 3: 포트 443이 열려있지 않음

**증상**: `ss -tlnp | grep 443` 결과 없음

**해결**:
1. Nginx 설정에 `listen 443` 확인
2. AWS 보안 그룹에서 포트 443 허용 확인
3. Nginx 재시작: `sudo systemctl restart nginx`

### 문제 4: 보안 그룹 설정

**증상**: 외부에서 접속 불가, 로컬에서는 접속 가능

**해결**:
1. AWS 콘솔 > EC2 > 보안 그룹
2. 인바운드 규칙 편집
3. 포트 443 추가:
   - 유형: HTTPS
   - 프로토콜: TCP
   - 포트: 443
   - 소스: 0.0.0.0/0
4. 규칙 저장

## 확인 방법

### 1. 로컬 테스트

```bash
# HTTP 테스트
curl -I http://localhost:80

# HTTPS 테스트
curl -I -k https://localhost:443
```

### 2. 외부 테스트

```bash
# HTTP 테스트
curl -I http://3.38.238.205

# HTTPS 테스트
curl -I -k https://3.38.238.205

# 도메인 테스트
curl -I https://iam-vet.com
```

### 3. 브라우저 테스트

- https://iam-vet.com 접속
- 브라우저 주소창에 자물쇠 아이콘 표시 확인
- SSL 인증서 정보 확인

## 예방 방법

### 1. SSL 인증서 자동 갱신 확인

```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# 자동 갱신 cron 확인
sudo systemctl status certbot.timer
```

### 2. 정기적인 상태 확인

```bash
# 서버 상태 확인 스크립트 실행
./deploy/check-server-status.sh
```

### 3. 모니터링 설정

- AWS CloudWatch로 포트 443 모니터링
- SSL 인증서 만료 알림 설정

## 체크리스트

- [ ] SSL 인증서 파일 존재 확인
- [ ] SSL 인증서 만료일 확인
- [ ] Nginx SSL 설정 확인
- [ ] 포트 443 열림 확인
- [ ] AWS 보안 그룹 포트 443 허용 확인
- [ ] Nginx 실행 중 확인
- [ ] 로컬 HTTPS 접속 테스트
- [ ] 외부 HTTPS 접속 테스트
- [ ] 브라우저에서 HTTPS 접속 확인

## 참고

- [SSL 인증서 정보](./SSL_CERTIFICATE_INFO.md)
- [Nginx SSL 설정](./AWS_DNS_SETUP.md#4단계-ssl-인증서-설정-lets-encrypt)
- [문제 해결 가이드](./TROUBLESHOOTING.md)

