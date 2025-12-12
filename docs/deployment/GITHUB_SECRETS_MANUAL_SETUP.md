# GitHub Secrets 수동 설정 가이드

## 문제: Secrets가 빈 값으로 저장됨

GitHub Secrets에 값을 입력해도 빈 값으로 저장되는 경우가 있습니다. 이는 주로 다음과 같은 원인 때문입니다:

1. **특수 문자 이스케이프 문제**: DATABASE_URL에 포함된 `!`, `#`, `@` 등의 특수 문자
2. **브라우저 문제**: 일부 브라우저에서 긴 값이나 특수 문자가 제대로 전달되지 않음
3. **네트워크 문제**: 값이 전송 중 손실됨

## 해결 방법

### 방법 1: GitHub CLI 사용 (권장)

가장 안정적인 방법은 GitHub CLI를 사용하는 것입니다:

```bash
# 1. GitHub CLI 설치
brew install gh

# 2. GitHub 로그인
gh auth login

# 3. 스크립트 실행
chmod +x scripts/setup-github-secrets.sh
./scripts/setup-github-secrets.sh
```

### 방법 2: 수동 설정 (DATABASE_URL 주의)

#### DATABASE_URL 설정

`.env.production` 파일의 DATABASE_URL:
```
DATABASE_URL="postgresql://iamvet_admin:Iamvet%212025%23@iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com:5432/iamvet?sslmode=require"
```

**GitHub Secrets에 저장할 값 (URL 디코딩):**
```
postgresql://iamvet_admin:Iamvet!2025#@iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com:5432/iamvet?sslmode=require
```

**변환 규칙:**
- `%21` → `!`
- `%23` → `#`

#### 수동 설정 단계

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. 각 Secret을 하나씩 업데이트:
   - **Update** 버튼 클릭
   - `.env.production` 파일에서 해당 값 복사
   - **주의**: DATABASE_URL은 URL 디코딩된 값 사용
   - **Update secret** 클릭
   - 저장 확인

### 방법 3: 브라우저 개발자 도구 사용

브라우저에서 직접 값을 설정하는 대신, 개발자 도구를 사용하여 값을 확인:

1. GitHub Secrets 페이지에서 **Update** 클릭
2. 개발자 도구 (F12) 열기
3. Network 탭에서 요청 확인
4. 값이 제대로 전송되는지 확인

## DATABASE_URL 특수 문자 처리

DATABASE_URL에 포함된 특수 문자:

| 인코딩 | 원본 문자 | 설명 |
|--------|----------|------|
| `%21` | `!` | 느낌표 |
| `%23` | `#` | 해시 |
| `%40` | `@` | 앳 기호 (URL에 이미 포함) |

**중요**: GitHub Secrets에는 **원본 문자**를 저장해야 합니다.

## 검증

Secrets 설정 후 확인:

```bash
# GitHub CLI로 확인 (값은 표시되지 않지만 존재 여부 확인)
gh secret list --repo fornerds/iamvet

# 또는 GitHub Actions 워크플로우에서 확인
# 워크플로우에 다음 단계 추가:
- name: Validate Secrets
  run: |
    if [ -z "${{ secrets.DATABASE_URL }}" ]; then
      echo "❌ DATABASE_URL이 비어있습니다"
      exit 1
    fi
    echo "✅ DATABASE_URL 존재 (값은 보안상 표시하지 않음)"
```

## 문제 해결 체크리스트

- [ ] DATABASE_URL의 특수 문자를 원본으로 변환했는가?
- [ ] 각 Secret을 하나씩 업데이트했는가?
- [ ] 브라우저를 새로고침하고 다시 확인했는가?
- [ ] GitHub Actions 워크플로우에서 Secrets 검증 단계가 통과하는가?

## 추가 팁

1. **한 번에 하나씩**: 여러 Secrets를 동시에 업데이트하지 말고 하나씩 진행
2. **값 복사**: `.env.production`에서 값을 복사할 때 따옴표 제거 확인
3. **저장 확인**: Update secret 후 페이지를 새로고침하여 Last updated 시간 확인
4. **백업**: Secrets 값을 안전한 곳에 백업 (비밀 관리 도구 사용 권장)

