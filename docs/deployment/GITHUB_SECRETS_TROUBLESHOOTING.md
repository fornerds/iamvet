# GitHub Secrets DATABASE_URL 사라짐 문제 해결

## 문제 원인

GitHub Actions Secrets의 DATABASE_URL 값이 사라지는 주요 원인:

### 1. 특수 문자 이스케이프 문제
DATABASE_URL에는 많은 특수 문자가 포함되어 있습니다:
- `@`, `:`, `/`, `?`, `&`, `=`, `%`, `#` 등
- 이러한 특수 문자가 제대로 이스케이프되지 않으면 값이 손상될 수 있습니다

### 2. URL 인코딩 문제
- DATABASE_URL에 URL 인코딩이 필요한 문자가 포함된 경우
- 예: `#` → `%23`, `@` → `%40` 등

### 3. GitHub Secrets 저장소 제한
- Secrets는 최대 64KB까지 저장 가능
- 매우 긴 DATABASE_URL의 경우 문제가 될 수 있음

### 4. Secrets 업데이트 시 문제
- Secrets를 업데이트할 때 값이 제대로 저장되지 않을 수 있음
- 브라우저나 네트워크 문제로 인한 저장 실패

## 해결 방법

### 방법 1: DATABASE_URL URL 인코딩 확인

DATABASE_URL에 특수 문자가 포함된 경우 URL 인코딩이 필요합니다:

```
원본: postgresql://user:pass#word@host:5432/db
인코딩: postgresql://user:pass%23word@host:5432/db
```

특수 문자 인코딩:
- `#` → `%23`
- `@` → `%40` (이미 URL에 포함된 경우는 제외)
- `%` → `%25`
- `&` → `%26`
- `=` → `%3D`

### 방법 2: GitHub Secrets 재설정

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. DATABASE_URL Secret 삭제
3. 새로 추가 (값을 다시 입력)
4. 저장 후 Actions 탭에서 워크플로우 재실행

### 방법 3: DATABASE_URL 검증 스크립트

Secrets에 저장된 DATABASE_URL이 올바른지 확인:

```bash
# 로컬에서 테스트
echo $DATABASE_URL | grep -q "postgresql://" && echo "✅ 올바른 형식" || echo "❌ 잘못된 형식"
```

### 방법 4: 환경 변수 백업

서버의 `.env.production` 파일에 DATABASE_URL이 올바르게 저장되어 있는지 확인:

```bash
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@<서버IP>
cat /home/ubuntu/iamvet/.env.production | grep DATABASE_URL
```

## 예방 조치

1. **Secrets 백업**
   - DATABASE_URL 값을 안전한 곳에 백업
   - 비밀 관리 도구 사용 (1Password, LastPass 등)

2. **Secrets 검증**
   - Secrets 저장 후 Actions 워크플로우에서 값 확인
   - 로그에 실제 값이 아닌 존재 여부만 확인

3. **환경 변수 문서화**
   - 필요한 모든 Secrets 목록 문서화
   - 각 Secret의 형식과 예시 기록

## DATABASE_URL 형식 예시

```
postgresql://username:password@host:port/database?sslmode=require
```

특수 문자가 포함된 경우:
```
postgresql://user:pass%23word@host:5432/db?sslmode=require
```

## 문제 진단

### 1. Secrets 존재 확인
GitHub Actions 로그에서:
```yaml
# Secrets가 없으면 빈 문자열로 전달됨
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL이 설정되지 않았습니다"
fi
```

### 2. Secrets 값 검증
워크플로우에 검증 단계 추가:
```yaml
- name: Validate Secrets
  run: |
    if [ -z "${{ secrets.DATABASE_URL }}" ]; then
      echo "❌ DATABASE_URL Secret이 없습니다"
      exit 1
    fi
    echo "✅ DATABASE_URL Secret 존재 (값은 보안상 표시하지 않음)"
```

## 즉시 조치

1. GitHub Secrets에서 DATABASE_URL 확인
2. 값이 비어있으면 다시 입력
3. URL 인코딩이 필요한 특수 문자 확인
4. Secrets 저장 후 Actions 워크플로우 재실행

