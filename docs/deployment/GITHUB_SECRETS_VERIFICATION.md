# GitHub Secrets 확인 방법

## ⚠️ 중요: Secrets는 빈 값으로 보이는 것이 정상입니다

GitHub Secrets는 **보안상의 이유로 저장된 값을 다시 표시하지 않습니다**. 이것은 정상적인 동작입니다.

## Secrets가 설정되었는지 확인하는 방법

### 방법 1: GitHub CLI로 확인

```bash
gh secret list --repo fornerds/iamvet
```

이 명령어는 Secrets 목록과 마지막 업데이트 시간을 보여줍니다. 값은 표시되지 않지만 존재 여부를 확인할 수 있습니다.

### 방법 2: GitHub Actions 워크플로우에서 확인

워크플로우에 검증 단계를 추가하여 Secrets가 제대로 전달되는지 확인:

```yaml
- name: Validate Secrets
  run: |
    if [ -z "${{ secrets.DATABASE_URL }}" ]; then
      echo "❌ DATABASE_URL이 비어있습니다"
      exit 1
    fi
    echo "✅ DATABASE_URL 존재 (값은 보안상 표시하지 않음)"
    echo "✅ DATABASE_URL 길이: $(echo -n '${{ secrets.DATABASE_URL }}' | wc -c) 문자"
```

### 방법 3: 워크플로우 로그에서 확인

GitHub Actions 워크플로우를 실행하면:
- Secrets가 비어있으면: 검증 단계에서 오류 발생
- Secrets가 설정되어 있으면: 정상적으로 진행

## 현재 설정된 Secrets 확인

터미널에서 다음 명령어를 실행:

```bash
gh secret list --repo fornerds/iamvet
```

출력 예시:
```
NAME                          UPDATED
ADMIN_JWT_SECRET              about 3 weeks ago
AWS_ACCESS_KEY_ID             about 3 weeks ago
DATABASE_URL                  a few minutes ago  ← 방금 설정됨
JWT_SECRET                    about 3 weeks ago
...
```

## Secrets가 제대로 설정되었는지 테스트

GitHub Actions 워크플로우를 실행하여 확인:

1. GitHub 저장소 → **Actions** 탭
2. **Deploy to AWS EC2** 워크플로우 선택
3. **Run workflow** 클릭
4. **Validate Secrets** 단계에서 확인:
   - ✅ 통과 = Secrets가 제대로 설정됨
   - ❌ 실패 = Secrets가 비어있거나 잘못됨

## 왜 웹 인터페이스에서 빈 값으로 보이나요?

GitHub의 보안 정책:
- Secrets는 **한 번 설정하면 다시 볼 수 없습니다**
- Update 버튼을 클릭해도 현재 값이 표시되지 않습니다
- 이는 누군가가 Secrets를 볼 수 없도록 하기 위함입니다

## Secrets가 실제로 설정되었는지 확인하는 방법

### ✅ 설정됨 (정상)
- GitHub CLI: `gh secret list`에서 Secrets 이름이 표시됨
- Last updated 시간이 최근으로 표시됨
- GitHub Actions 워크플로우가 정상 실행됨

### ❌ 설정 안 됨 (문제)
- GitHub Actions 워크플로우에서 "Secret이 비어있습니다" 오류 발생
- 빌드 실패 (환경 변수 없음)

## 현재 상태 확인

다음 명령어로 확인:

```bash
# Secrets 목록 확인
gh secret list --repo fornerds/iamvet

# 특정 Secret 존재 여부 확인 (값은 표시되지 않음)
gh secret get DATABASE_URL --repo fornerds/iamvet 2>&1 | grep -q "secret not found" && echo "❌ 없음" || echo "✅ 있음"
```

## 결론

**GitHub 웹 인터페이스에서 Secrets가 빈 값으로 보이는 것은 정상입니다.** 

Secrets가 제대로 설정되었는지 확인하려면:
1. GitHub CLI로 목록 확인
2. GitHub Actions 워크플로우 실행하여 검증
3. 워크플로우가 정상 실행되면 Secrets가 제대로 설정된 것입니다

