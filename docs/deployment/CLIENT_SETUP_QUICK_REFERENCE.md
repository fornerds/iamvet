# 클라이언트 설정 빠른 참조 가이드

현재 Route 53에 등록된 레코드를 기준으로 변경해야 할 사항입니다.

## 🔄 변경해야 할 레코드

### 1. 루트 도메인 A 레코드

**현재**: `iam-vet.com` → `54.180.160.82`  
**변경**: `iam-vet.com` → `3.38.238.205`

**작업**:
1. Route 53 콘솔에서 `iam-vet.com` 호스팅 영역 선택
2. 레코드 목록에서 `iam-vet.com` A 레코드 찾기
3. 편집 → 값 변경: `3.38.238.205` → 저장

### 2. www 서브도메인 A 레코드

**현재**: `www.iam-vet.com` → `216.198.79.1`  
**변경**: `www.iam-vet.com` → `3.38.238.205`

**작업**:
1. 레코드 목록에서 `www.iam-vet.com` A 레코드 찾기
2. 편집 → 값 변경: `3.38.238.205` → 저장

## ✅ 변경하지 말아야 할 레코드

다음 레코드들은 **그대로 유지**하세요:

- ✅ **MX 레코드**: 이메일 서비스용 (`kr1-aspmx1.worksmobile.com`)
- ✅ **TXT 레코드**: Google 사이트 인증, DMARC
- ✅ **CNAME 레코드**: 
  - ACM 인증서 (`_5c9f12684cfc92b5938fcd4116a752a8.iam-vet.com`)
  - DKIM (`_domainkey.iam-vet.com`)
  - Vercel (`www2.iam-vet.com`)
- ✅ **NS, SOA 레코드**: DNS 기본 설정
- ✅ **api-dev.iam-vet.com, api.iam-vet.com, service.iam-vet.com**: 기타 서비스용

## 📝 OAuth 설정 변경

### 카카오
- Redirect URI: `https://iam-vet.com/api/auth/kakao/callback`

### 구글
- Redirect URI: `https://iam-vet.com/api/auth/google/callback`

### 네이버
- Callback URL: `https://iam-vet.com/api/auth/naver/callback`

## ⏱️ 예상 소요 시간

- A 레코드 수정: 약 5분
- OAuth 설정 변경: 약 15분
- DNS 전파: 최대 48시간 (보통 몇 시간)

## 📞 문의

설정 중 문제가 발생하면 개발팀에 문의해주세요.

