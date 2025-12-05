# 데이터베이스 연결 풀 문제 해결 가이드

## 발견된 문제

### 1. Prisma 연결 풀 미설정
- Prisma는 기본적으로 연결 풀을 사용하지만, `DATABASE_URL`에 연결 수 제한이 없으면 무제한 연결 가능
- 연결이 제대로 닫히지 않으면 연결 누수 발생

### 2. 중복 Pool 생성
- `src/lib/database.ts`와 `src/lib/db.ts`에서 각각 Pool 생성
- 두 개의 독립적인 연결 풀이 존재

### 3. 연결 모니터링 부재
- 현재 활성 연결 수를 확인할 방법이 없음
- 연결 누수 감지 어려움

## 해결 방법

### 1. DATABASE_URL에 연결 풀 파라미터 추가

**현재**:
```
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

**수정 후**:
```
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=10&pool_timeout=20&connect_timeout=10"
```

**파라미터 설명**:
- `connection_limit=10`: 최대 10개의 연결만 허용
- `pool_timeout=20`: 연결 풀에서 연결을 기다리는 최대 시간 (초)
- `connect_timeout=10`: 연결 시도 최대 시간 (초)

### 2. Prisma Client 재생성

연결 풀 설정을 적용하려면 Prisma Client를 재생성해야 합니다:

```bash
npx prisma generate
```

### 3. 서버 재시작

설정 변경 후 서버를 재시작합니다:

```bash
pm2 restart iamvet
```

## 배포 워크플로우에 반영

`.github/workflows/deploy-aws.yml`에서 환경 변수 설정 시:

```yaml
DATABASE_URL="$DATABASE_URL?connection_limit=10&pool_timeout=20&connect_timeout=10"
```

또는 GitHub Secrets에서 `DATABASE_URL`을 수정하여 연결 풀 파라미터를 포함시킵니다.

## 모니터링

### 연결 수 확인

```bash
# 서버에서 실행
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

### 연결 상세 정보

```bash
psql "$DATABASE_URL" -c "SELECT datname, usename, state, count(*) FROM pg_stat_activity GROUP BY datname, usename, state;"
```

## 예상 효과

1. **연결 누수 방지**: 최대 연결 수 제한으로 무한 증가 방지
2. **메모리 사용량 감소**: 불필요한 연결 제거
3. **성능 향상**: 연결 풀 관리 최적화
4. **안정성 향상**: 연결 타임아웃으로 무한 대기 방지

## 체크리스트

- [ ] DATABASE_URL에 연결 풀 파라미터 추가
- [ ] Prisma Client 재생성
- [ ] 서버 재시작
- [ ] 연결 수 모니터링
- [ ] 메모리 사용량 확인

