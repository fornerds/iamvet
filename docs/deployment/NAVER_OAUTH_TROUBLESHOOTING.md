# 네이버 OAuth 로그인 문제 해결 가이드

## 에러: "wrong client id / client secret pair"

### 원인 분석

1. **네이버 개발자 센터 설정 불일치**
   - Client ID/Secret이 네이버 개발자 센터에 등록된 값과 다름
   - Redirect URI가 네이버 개발자 센터에 등록되지 않음

2. **환경 변수 로딩 문제**
   - PM2가 환경 변수를 제대로 로드하지 못함
   - `.env.production` 파일이 업데이트되지 않음

3. **Redirect URI 불일치**
   - 서버의 `NEXT_PUBLIC_SITE_URL`과 네이버 개발자 센터의 Redirect URI가 다름

### 해결 방법

#### Step 1: 네이버 개발자 센터 확인

1. **네이버 개발자 센터** 접속: https://developers.naver.com/apps/#/list
2. 애플리케이션 선택
3. **API 설정** → **서비스 URL** 확인:
   - `https://www.iam-vet.com` 또는 `https://iam-vet.com`
4. **Callback URL** 확인:
   - `https://www.iam-vet.com/api/auth/naver/callback`
   - 또는 `https://iam-vet.com/api/auth/naver/callback`
5. **Client ID** 및 **Client Secret** 확인

#### Step 2: 서버 환경 변수 확인

```bash
ssh ec2-prd-iamvet
cd /home/ubuntu/iamvet

# .env.production 확인
grep -E "NAVER_CLIENT_ID|NAVER_CLIENT_SECRET|NEXT_PUBLIC_SITE_URL" .env.production
```

**예상 값:**
```
NAVER_CLIENT_ID="S7LUJ3tRlc7Q3X1nAj_4"
NAVER_CLIENT_SECRET="eDBBw3h5bz"
NEXT_PUBLIC_SITE_URL="https://www.iam-vet.com"
```

#### Step 3: PM2 환경 변수 확인

```bash
ssh ec2-prd-iamvet
cd /home/ubuntu/iamvet
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

node -e "
const config = require('./ecosystem.config.js');
const env = config.apps[0].env;
console.log('NAVER_CLIENT_ID:', env.NAVER_CLIENT_ID);
console.log('NAVER_CLIENT_SECRET:', env.NAVER_CLIENT_SECRET);
console.log('NEXT_PUBLIC_SITE_URL:', env.NEXT_PUBLIC_SITE_URL);
console.log('예상 Redirect URI:', env.NEXT_PUBLIC_SITE_URL + '/api/auth/naver/callback');
"
```

#### Step 4: 환경 변수 불일치 시 수정

**서버 `.env.production` 수정:**
```bash
ssh ec2-prd-iamvet
cd /home/ubuntu/iamvet
nano .env.production
# 또는
vi .env.production
```

**수정 후 PM2 재시작:**
```bash
pm2 restart iamvet
```

#### Step 5: 네이버 개발자 센터 설정 업데이트

1. **Callback URL** 확인 및 추가:
   - `https://www.iam-vet.com/api/auth/naver/callback`
   - `https://iam-vet.com/api/auth/naver/callback` (www 없이도 추가)

2. **서비스 URL** 확인:
   - `https://www.iam-vet.com`

### 체크리스트

- [ ] 네이버 개발자 센터 Client ID/Secret 확인
- [ ] 서버 `.env.production`의 NAVER_CLIENT_ID/NAVER_CLIENT_SECRET 확인
- [ ] PM2 환경 변수 확인 (ecosystem.config.js)
- [ ] 네이버 개발자 센터 Callback URL 확인
- [ ] NEXT_PUBLIC_SITE_URL 확인
- [ ] PM2 재시작

### 주의사항

1. **Client Secret 보안**
   - Client Secret은 절대 공개하지 마세요
   - GitHub에 커밋하지 마세요 (`.env.production`은 `.gitignore`에 포함)

2. **Redirect URI 정확성**
   - HTTP/HTTPS 구분
   - www 유무
   - 경로 정확성 (`/api/auth/naver/callback`)

3. **환경 변수 형식**
   - 따옴표 포함 여부 확인
   - 공백 없음 확인
   - 특수 문자 이스케이프 확인

### 디버깅

**PM2 로그 확인:**
```bash
pm2 logs iamvet --lines 50
```

**네이버 OAuth 토큰 교환 테스트:**
```bash
curl -X POST "https://nid.naver.com/oauth2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=authorization_code" \
  -d "code=TEST_CODE" \
  -d "redirect_uri=https://www.iam-vet.com/api/auth/naver/callback"
```

### 참고

- 네이버 개발자 센터: https://developers.naver.com/apps/#/list
- 네이버 OAuth 2.0 문서: https://developers.naver.com/docs/login/overview/

