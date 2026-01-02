# 네이버 OAuth Callback URL 설정 가이드

## 문제: "wrong client id / client secret pair" 에러

이 에러는 대부분 **Callback URL 불일치**로 발생합니다.

## 해결 방법

### Step 1: 네이버 개발자 센터 접속

1. **네이버 개발자 센터** 접속: https://developers.naver.com/apps/#/list
2. 애플리케이션 선택

### Step 2: API 설정 확인

1. **API 설정** 탭 클릭
2. **서비스 URL** 확인:
   - `https://www.iam-vet.com` 또는 `https://iam-vet.com`

### Step 3: Callback URL 등록 (중요!)

**Callback URL** 섹션에서 다음 URL들을 모두 추가:

1. `https://www.iam-vet.com/api/auth/naver/callback`
2. `https://iam-vet.com/api/auth/naver/callback` (www 없이)

**⚠️ 중요 사항:**
- URL은 **정확히 일치**해야 합니다 (대소문자, 슬래시 포함)
- HTTP와 HTTPS를 구분합니다
- www 유무도 구분합니다
- 여러 URL을 등록할 수 있으므로 두 가지 모두 등록하는 것을 권장합니다

### Step 4: Client ID/Secret 확인

**API 설정** → **Client ID** 및 **Client Secret** 확인:

- **Client ID**: `S7LUJ3tRlc7Q3X1nAj_4`
- **Client Secret**: `HsDivx0qXn`

서버의 `.env.production`과 일치하는지 확인하세요.

### Step 5: 저장 및 확인

1. **저장** 버튼 클릭
2. 변경 사항이 적용되는데 몇 분 걸릴 수 있습니다
3. 네이버 로그인 다시 시도

## 서버 설정 확인

서버에서 사용하는 Redirect URI:

```bash
ssh ec2-prd-iamvet
cd /home/ubuntu/iamvet

# 환경 변수 확인
grep "NEXT_PUBLIC_SITE_URL" .env.production
# 결과: NEXT_PUBLIC_SITE_URL="https://www.iam-vet.com"

# 예상 Redirect URI
echo "https://www.iam-vet.com/api/auth/naver/callback"
```

## 디버깅

### 실제 사용되는 Redirect URI 확인

브라우저 개발자 도구에서 네이버 로그인 시도 시:

1. **Network** 탭 열기
2. 네이버 로그인 클릭
3. `https://nid.naver.com/oauth2.0/authorize` 요청 확인
4. `redirect_uri` 파라미터 확인

### 네이버 OAuth 토큰 교환 테스트

```bash
# 실제 code를 받은 후 테스트 (code는 한 번만 사용 가능)
curl -X POST "https://nid.naver.com/oauth2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=S7LUJ3tRlc7Q3X1nAj_4" \
  -d "client_secret=HsDivx0qXn" \
  -d "grant_type=authorization_code" \
  -d "code=ACTUAL_CODE_FROM_NAVER" \
  -d "redirect_uri=https://www.iam-vet.com/api/auth/naver/callback"
```

## 체크리스트

- [ ] 네이버 개발자 센터 접속
- [ ] API 설정 → 서비스 URL 확인
- [ ] Callback URL에 `https://www.iam-vet.com/api/auth/naver/callback` 추가
- [ ] Callback URL에 `https://iam-vet.com/api/auth/naver/callback` 추가 (선택)
- [ ] Client ID 확인: `S7LUJ3tRlc7Q3X1nAj_4`
- [ ] Client Secret 확인: `HsDivx0qXn`
- [ ] 저장 후 네이버 로그인 재시도

## 참고

- 네이버 개발자 센터: https://developers.naver.com/apps/#/list
- 네이버 OAuth 2.0 문서: https://developers.naver.com/docs/login/overview/

