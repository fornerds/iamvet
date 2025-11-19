# SSL 인증서 정보

## 💰 비용

**Let's Encrypt SSL 인증서는 완전히 무료입니다.**

- ✅ 추가 결제 불필요
- ✅ 무료로 발급 및 갱신
- ✅ 상업적 사용 가능
- ✅ 모든 주요 브라우저에서 신뢰

## 🔒 Let's Encrypt란?

Let's Encrypt는 무료로 SSL/TLS 인증서를 제공하는 비영리 인증 기관입니다.

### 특징

- **무료**: 인증서 발급 및 갱신 모두 무료
- **자동 갱신**: 90일마다 자동으로 갱신 (Certbot 사용 시)
- **광범위한 지원**: 모든 주요 브라우저에서 신뢰
- **간편한 설정**: Certbot을 사용하면 몇 분 안에 설정 가능

## 📋 SSL 인증서 설정 방법

### 자동 설정 (권장)

```bash
cd deploy
./setup-ssl.sh 3.38.238.205 iam-vet.com
./setup-nginx-ssl.sh 3.38.238.205 iam-vet.com
```

### 수동 설정

```bash
# EC2에 SSH 접속
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205

# Certbot 설치
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (무료)
sudo certbot --nginx -d iam-vet.com -d www.iam-vet.com
```

## 🔄 자동 갱신

Let's Encrypt 인증서는 90일마다 만료되지만, Certbot이 자동으로 갱신합니다.

### 자동 갱신 확인

```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# 자동 갱신 cron 작업 확인
sudo systemctl status certbot.timer
```

## ⚠️ 주의사항

1. **도메인 소유권 확인 필요**
   - Let's Encrypt는 도메인 소유권을 확인합니다
   - DNS가 올바르게 설정되어 있어야 합니다

2. **인증서 갱신 제한**
   - 주당 5회까지 발급 가능 (테스트용)
   - 프로덕션 환경에서는 자동 갱신만 사용

3. **도메인 제한**
   - 와일드카드 인증서는 DNS-01 챌린지 필요
   - 일반 도메인은 HTTP-01 챌린지로 충분

## 💡 대안 (유료)

Let's Encrypt 외에도 유료 SSL 인증서를 사용할 수 있습니다:

- **AWS Certificate Manager (ACM)**: AWS에서 제공하는 무료 SSL 인증서 (ALB/CloudFront 사용 시)
- **상업용 인증서**: 더 긴 유효기간, 와일드카드 지원 등 (유료)

하지만 대부분의 경우 **Let's Encrypt로 충분**하며, 추가 비용이 발생하지 않습니다.

## 📞 문의

SSL 인증서 설정에 대한 질문이 있으면 개발팀에 문의해주세요.

