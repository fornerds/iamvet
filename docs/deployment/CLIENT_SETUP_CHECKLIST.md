# 클라이언트 설정 체크리스트

Vercel에서 AWS로 전환하기 위해 클라이언트가 변경해야 할 설정 목록입니다.

## ✅ 설정 완료 체크리스트

### 1. AWS Route 53 DNS 설정

#### 호스팅 영역 확인
- [ ] Route 53 콘솔 접속
- [ ] `iam-vet.com` 호스팅 영역 확인 (이미 생성되어 있음)
- [ ] 레코드 목록 확인

#### A 레코드 수정
- [ ] 루트 도메인 A 레코드 수정 (`iam-vet.com`: `54.180.160.82` → `3.38.238.205`)
- [ ] www 서브도메인 A 레코드 수정 (`www.iam-vet.com`: `216.198.79.1` → `3.38.238.205`)
- [ ] 기존 레코드들 (MX, TXT, CNAME 등)은 변경하지 않음 확인

#### DNS 전파 확인
- [ ] DNS 전파 확인 (최대 48시간 소요)
- [ ] `nslookup iam-vet.com` 명령어로 확인

---

### 2. 카카오 개발자 콘솔

#### 플랫폼 설정
- [ ] 카카오 개발자 콘솔 접속 (https://developers.kakao.com)
- [ ] 내 애플리케이션 선택
- [ ] 앱 설정 > 플랫폼 메뉴 이동
- [ ] 웹 플랫폼 추가/수정
- [ ] 사이트 도메인: `iam-vet.com` 입력

#### Redirect URI 변경
- [ ] 제품 설정 > 카카오 로그인 메뉴 이동
- [ ] 카카오 로그인 활성화 확인
- [ ] Redirect URI 섹션에서 기존 Vercel URI 제거
- [ ] 새 URI 추가: `https://iam-vet.com/api/auth/kakao/callback`
- [ ] 저장

---

### 3. 구글 클라우드 콘솔

#### OAuth 동의 화면
- [ ] 구글 클라우드 콘솔 접속 (https://console.cloud.google.com)
- [ ] 프로젝트 선택
- [ ] API 및 서비스 > OAuth 동의 화면 메뉴 이동
- [ ] 승인된 도메인에 `iam-vet.com` 추가

#### 사용자 인증 정보
- [ ] API 및 서비스 > 사용자 인증 정보 메뉴 이동
- [ ] OAuth 2.0 클라이언트 ID 선택
- [ ] 승인된 리디렉션 URI 섹션에서 기존 Vercel URI 제거
- [ ] 새 URI 추가: `https://iam-vet.com/api/auth/google/callback`
- [ ] 저장

---

### 4. 네이버 개발자 센터

#### API 설정
- [ ] 네이버 개발자 센터 접속 (https://developers.naver.com)
- [ ] 내 애플리케이션 선택
- [ ] API 설정 메뉴 이동
- [ ] 서비스 URL: `https://iam-vet.com` 변경
- [ ] Callback URL: `https://iam-vet.com/api/auth/naver/callback` 변경
- [ ] 저장

#### 환경 설정 확인
- [ ] 환경 설정이 "서비스"로 설정되어 있는지 확인

---

## 📋 설정 정보 요약

### AWS Route 53

| 항목 | 현재 값 | 변경할 값 |
|------|---------|-----------|
| 도메인 | `iam-vet.com` | - |
| 호스팅 영역 | `iam-vet.com` | - |
| 루트 도메인 A 레코드 | `54.180.160.82` | `3.38.238.205` |
| www 서브도메인 A 레코드 | `216.198.79.1` | `3.38.238.205` |

**⚠️ 주의**: 기존 MX, TXT, CNAME 레코드들은 변경하지 마세요.

### 카카오 개발자 콘솔

| 항목 | 값 |
|------|-----|
| 사이트 도메인 | `iam-vet.com` |
| Redirect URI | `https://iam-vet.com/api/auth/kakao/callback` |

### 구글 클라우드 콘솔

| 항목 | 값 |
|------|-----|
| 승인된 도메인 | `iam-vet.com` |
| 승인된 리디렉션 URI | `https://iam-vet.com/api/auth/google/callback` |

### 네이버 개발자 센터

| 항목 | 값 |
|------|-----|
| 서비스 URL | `https://iam-vet.com` |
| Callback URL | `https://iam-vet.com/api/auth/naver/callback` |

---

## 🔄 변경 전/후 비교

### 카카오 Redirect URI

**변경 전 (Vercel)**:
```
https://[vercel-domain]/api/auth/kakao/callback
```

**변경 후 (AWS)**:
```
https://iam-vet.com/api/auth/kakao/callback
```

### 구글 Redirect URI

**변경 전 (Vercel)**:
```
https://[vercel-domain]/api/auth/google/callback
```

**변경 후 (AWS)**:
```
https://iam-vet.com/api/auth/google/callback
```

### 네이버 Callback URL

**변경 전 (Vercel)**:
```
https://[vercel-domain]/api/auth/naver/callback
```

**변경 후 (AWS)**:
```
https://iam-vet.com/api/auth/naver/callback
```

---

## ⏱️ 예상 소요 시간

| 작업 | 예상 소요 시간 |
|------|---------------|
| AWS Route 53 호스팅 영역 생성 | 5분 |
| 네임서버 변경 | 5분 |
| A 레코드 생성 | 5분 |
| DNS 전파 | 최대 48시간 (보통 몇 시간) |
| 카카오 설정 변경 | 5분 |
| 구글 설정 변경 | 5분 |
| 네이버 설정 변경 | 5분 |
| **총 예상 시간** | **약 30분 (DNS 전파 제외)** |

---

## ✅ 최종 확인

모든 설정이 완료되면 다음을 확인하세요:

1. **DNS 전파 확인**
   ```bash
   nslookup iam-vet.com
   nslookup www.iam-vet.com
   ```

2. **웹사이트 접속 테스트**
   - https://iam-vet.com 접속 확인
   - https://www.iam-vet.com 접속 확인 (자동으로 non-www로 리다이렉트)

3. **OAuth 로그인 테스트**
   - 카카오 로그인 테스트
   - 구글 로그인 테스트
   - 네이버 로그인 테스트

---

## 📞 문의

설정 중 문제가 발생하거나 도움이 필요한 경우 개발팀에 문의해주세요.

**참고 문서**: [클라이언트 설정 가이드](CLIENT_SETUP_GUIDE.md)

