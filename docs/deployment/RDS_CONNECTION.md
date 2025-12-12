# RDS 연결 가이드

## 기존 RDS 사용

**기존 RDS를 그대로 사용하면 됩니다.** 새 EC2 인스턴스에서도 동일한 RDS에 연결할 수 있습니다.

## RDS 연결 설정

### 1. RDS 보안 그룹 확인

기존 RDS의 보안 그룹에 **새 EC2 인스턴스의 보안 그룹**을 추가해야 합니다.

#### 방법 A: EC2 보안 그룹을 RDS 보안 그룹에 추가

1. AWS 콘솔 → RDS → Databases
2. 기존 데이터베이스 선택 → "Connectivity & security" 탭
3. "VPC security groups" → 보안 그룹 클릭
4. "Inbound rules" → "Edit inbound rules"
5. 규칙 추가:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Custom
   - **Custom**: 새 EC2 인스턴스의 보안 그룹 ID 선택
6. "Save rules"

#### 방법 B: EC2 인스턴스의 프라이빗 IP 추가

1. RDS 보안 그룹 → Inbound rules → Edit
2. 규칙 추가:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Custom
   - **Custom**: `172.31.44.216/32` (새 EC2 인스턴스의 프라이빗 IP)
3. "Save rules"

### 2. DATABASE_URL 확인

기존 `.env.production` 파일의 `DATABASE_URL`을 확인하세요:

```bash
grep "^DATABASE_URL" .env.production
```

형식:
```
DATABASE_URL="postgresql://username:password@rds-endpoint:5432/database?sslmode=require"
```

### 3. GitHub Secrets 확인

GitHub Actions 배포를 사용하는 경우:

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. `DATABASE_URL` Secret 확인
3. 기존 RDS 엔드포인트가 포함되어 있는지 확인

### 4. 연결 테스트

배포 후 서버에서 연결 테스트:

```bash
ssh -i deploy/keys/iam-vet.pem ubuntu@<IP-주소>

# 서버에서
cd /home/ubuntu/iamvet
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# DATABASE_URL 확인
grep "^DATABASE_URL" .env.production

# Prisma로 연결 테스트
npx prisma db pull
```

## RDS 엔드포인트 확인

기존 RDS 엔드포인트를 확인하려면:

1. AWS 콘솔 → RDS → Databases
2. 기존 데이터베이스 선택
3. "Connectivity & security" 탭
4. "Endpoint" 값 확인 (예: `iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com`)

## 문제 해결

### 연결 실패 시

1. **보안 그룹 확인**:
   ```bash
   # EC2 인스턴스의 보안 그룹 ID 확인
   aws ec2 describe-instances --instance-ids i-0a510fa440754cb0e --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId'
   ```

2. **RDS 보안 그룹에 EC2 보안 그룹 추가** (위의 방법 A 사용)

3. **네트워크 확인**:
   - EC2와 RDS가 같은 VPC에 있는지 확인
   - 서브넷 그룹 확인

### DATABASE_URL 형식

올바른 형식:
```
postgresql://username:password@host:5432/database?sslmode=require
```

특수 문자 처리:
- `!` → 그대로 사용 (URL 인코딩하지 않음)
- `#` → 그대로 사용 (URL 인코딩하지 않음)
- `@` → 그대로 사용

## 기존 데이터베이스 사용

기존 RDS를 그대로 사용하므로:
- ✅ 데이터는 그대로 유지
- ✅ 마이그레이션 불필요
- ✅ DATABASE_URL만 올바르게 설정하면 됨

