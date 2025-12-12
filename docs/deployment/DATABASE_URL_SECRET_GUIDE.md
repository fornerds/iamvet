# DATABASE_URL GitHub Secret 설정 가이드

## 현재 DATABASE_URL 형식

```
postgresql://iamvet_admin:Iamvet%212025%23@iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com:5432/iamvet?sslmode=require
```

## GitHub Secrets에 저장할 값

### ✅ 올바른 방법

GitHub Secrets에 저장할 때는 **원본 값을 그대로** 저장합니다:

```
postgresql://iamvet_admin:Iamvet!2025#@iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com:5432/iamvet?sslmode=require
```

**주의:** 
- `%21` → `!`로 변환
- `%23` → `#`로 변환
- URL 인코딩된 값(`%XX`)을 원본 문자로 변환하여 저장

### ❌ 잘못된 방법

다음과 같이 URL 인코딩된 값을 그대로 저장하면 안 됩니다:
```
postgresql://iamvet_admin:Iamvet%212025%23@...
```

## GitHub Secrets 설정 방법

1. GitHub 저장소 접속
2. **Settings** → **Secrets and variables** → **Actions**
3. **DATABASE_URL** Secret 찾기
4. **Update** 클릭
5. **원본 값** 입력 (URL 인코딩 제거)
6. **Update secret** 클릭

## DATABASE_URL 값 확인

로컬 `.env.production` 파일의 DATABASE_URL:
```
DATABASE_URL="postgresql://iamvet_admin:Iamvet%212025%23@iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com:5432/iamvet?sslmode=require"
```

GitHub Secrets에 저장할 값:
```
postgresql://iamvet_admin:Iamvet!2025#@iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com:5432/iamvet?sslmode=require
```

## 문제 해결

### Secrets가 사라지는 경우

1. **Secrets 존재 확인**
   - GitHub 저장소 → Settings → Secrets and variables → Actions
   - DATABASE_URL이 목록에 있는지 확인

2. **Secrets 값 확인**
   - Update 버튼을 클릭하면 현재 값이 표시되지 않음 (보안상)
   - 하지만 Secret이 존재하는지 확인 가능

3. **Secrets 재설정**
   - DATABASE_URL Secret 삭제
   - 새로 추가 (원본 값으로)
   - 저장 후 Actions 워크플로우 재실행

### URL 인코딩 변환

로컬 `.env.production`에서 GitHub Secrets로 변환:

```bash
# 로컬 파일의 DATABASE_URL
DATABASE_URL="postgresql://iamvet_admin:Iamvet%212025%23@..."

# GitHub Secrets에 저장할 값 (URL 디코딩)
DATABASE_URL="postgresql://iamvet_admin:Iamvet!2025#@..."
```

변환 규칙:
- `%21` → `!`
- `%23` → `#`
- `%40` → `@` (이미 URL에 포함된 경우는 제외)
- `%25` → `%`

## 검증

GitHub Actions 워크플로우에 검증 단계가 추가되었습니다:

```yaml
- name: Validate Secrets
  run: |
    if [ -z "${{ secrets.DATABASE_URL }}" ]; then
      echo "❌ DATABASE_URL Secret이 설정되지 않았습니다!"
      exit 1
    fi
    echo "✅ 필수 Secrets 확인 완료"
```

이제 Secrets가 없으면 배포가 실패하고 명확한 오류 메시지가 표시됩니다.

