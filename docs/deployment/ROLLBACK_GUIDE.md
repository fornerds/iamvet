# 배포 롤백 가이드

## 방금 배포한 변경사항 되돌리기

### 커밋 정보
- **커밋 해시**: `eb2e702`
- **커밋 메시지**: `feat: 채용공고 상세설명을 QuillEditor로 변경 및 HTML 렌더링 지원`
- **변경된 파일**:
  - `src/app/dashboard/hospital/my-jobs/[id]/edit/page.tsx`
  - `src/app/dashboard/hospital/my-jobs/create/page.tsx`
  - `src/app/jobs/[id]/page.tsx`
  - `src/components/QuillEditor.tsx`
  - `src/hooks/api/useJobDetail.ts`

---

## 방법 1: Git Revert (권장 - 히스토리 보존)

이 방법은 새로운 커밋을 생성하여 이전 변경사항을 되돌립니다. 히스토리가 보존되어 안전합니다.

### 로컬에서 실행:

```bash
# 1. 최신 코드 가져오기
git pull origin main

# 2. 마지막 커밋 되돌리기 (새로운 커밋 생성)
git revert HEAD

# 3. 커밋 메시지 확인 후 저장 (기본 메시지 사용하거나 수정)
# 4. 원격 저장소에 푸시
git push origin main
```

### 서버에서 배포:

```bash
# SSH로 서버 접속 후
cd /home/ubuntu/iamvet

# 최신 코드 가져오기
git pull origin main

# 의존성 설치 (필요한 경우)
npm install

# 빌드
rm -rf .next
npm run build

# PM2 재시작
pm2 restart iamvet
```

---

## 방법 2: Git Reset (히스토리 삭제)

⚠️ **주의**: 이미 원격 저장소에 푸시된 커밋을 reset하면 다른 개발자들에게 영향을 줄 수 있습니다.

### 로컬에서 실행:

```bash
# 1. 마지막 커밋 제거 (변경사항은 유지)
git reset --soft HEAD~1

# 또는 변경사항도 완전히 제거하려면
git reset --hard HEAD~1

# 2. 원격 저장소에 강제 푸시 (주의!)
git push origin main --force
```

### 서버에서 배포:

```bash
# SSH로 서버 접속 후
cd /home/ubuntu/iamvet

# 원격 저장소와 동기화
git fetch origin
git reset --hard origin/main

# 의존성 설치 (필요한 경우)
npm install

# 빌드
rm -rf .next
npm run build

# PM2 재시작
pm2 restart iamvet
```

---

## 방법 3: 특정 커밋으로 되돌리기

이전 커밋으로 완전히 되돌리려면:

```bash
# 1. 이전 커밋으로 되돌리기 (8e7a33a는 이전 커밋)
git reset --hard 8e7a33a

# 2. 원격 저장소에 강제 푸시 (주의!)
git push origin main --force
```

---

## 빠른 롤백 스크립트

다음 스크립트를 사용하면 빠르게 롤백할 수 있습니다:

```bash
#!/bin/bash
# rollback.sh

echo "=== 롤백 시작 ==="

# 1. Git revert
git pull origin main
git revert HEAD --no-edit
git push origin main

echo "=== Git 롤백 완료 ==="
echo "이제 서버에서 배포를 실행하세요:"
echo "ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205"
echo "cd /home/ubuntu/iamvet && git pull && npm run build && pm2 restart iamvet"
```

---

## 서버 롤백 스크립트

서버에서 직접 실행할 수 있는 스크립트:

```bash
#!/bin/bash
# 서버에서 실행

cd /home/ubuntu/iamvet

# NVM 환경 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 이전 커밋으로 되돌리기
git fetch origin
git reset --hard 8e7a33a

# 빌드
rm -rf .next
npm run build

# PM2 재시작
pm2 restart iamvet

echo "=== 롤백 완료 ==="
pm2 list
```

---

## 주의사항

1. **Git Revert (방법 1) 권장**: 히스토리를 보존하고 안전합니다.
2. **Force Push 주의**: `--force` 옵션은 팀원들에게 영향을 줄 수 있으므로 신중하게 사용하세요.
3. **데이터베이스 변경사항**: 이 롤백은 코드만 되돌립니다. 데이터베이스 스키마 변경이 있었다면 별도로 처리해야 합니다.
4. **환경 변수**: 서버의 `.env.production` 파일은 변경되지 않습니다.

---

## 롤백 확인

롤백 후 다음을 확인하세요:

1. 서버 로그 확인:
   ```bash
   pm2 logs iamvet --lines 50
   ```

2. 애플리케이션 상태 확인:
   ```bash
   pm2 status
   ```

3. 웹사이트 접속하여 기능 확인

---

## 문의

롤백 중 문제가 발생하면 개발팀에 문의하세요.


