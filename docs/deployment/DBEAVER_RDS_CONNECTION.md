# DBeaver에서 AWS RDS 연결 가이드

DBeaver를 사용하여 AWS RDS PostgreSQL 데이터베이스에 연결하는 방법입니다.

## 📋 RDS 연결 정보

- **호스트**: `iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com`
- **포트**: `5432`
- **데이터베이스**: `iamvet`
- **사용자명**: `iamvet_admin`
- **비밀번호**: (마이그레이션 시 입력한 비밀번호)
- **SSL 모드**: `require`

## 🔧 DBeaver 연결 설정

### 1. 새 데이터베이스 연결 생성

1. DBeaver 실행
2. 상단 메뉴에서 **"데이터베이스"** → **"새 데이터베이스 연결"** 클릭
   - 또는 `Cmd + Shift + N` (macOS) / `Ctrl + Shift + N` (Windows/Linux)
3. 데이터베이스 선택 화면에서 **"PostgreSQL"** 선택
4. **"다음"** 클릭

### 2. 연결 정보 입력

**메인 탭**에서 다음 정보를 입력:

| 항목 | 값 |
|------|-----|
| **호스트** | `iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com` |
| **포트** | `5432` |
| **데이터베이스** | `iamvet` |
| **사용자명** | `iamvet_admin` |
| **비밀번호** | (마이그레이션 시 입력한 비밀번호) |

**참고**: 비밀번호에 특수문자(`!`, `@`, `#` 등)가 포함되어 있어도 그대로 입력하면 됩니다. DBeaver가 자동으로 처리합니다.

### 3. SSL 설정

**SSL 탭**으로 이동:

1. **"SSL 사용"** 체크박스 활성화
2. **"SSL 모드** 드롭다운에서 **"require"** 선택
3. **"SSL 인증서 확인"** 체크박스는 선택 해제 (또는 RDS CA 인증서를 다운로드하여 사용)

**SSL 모드 옵션**:
- `require`: SSL 연결 필수 (권장)
- `prefer`: SSL 선호, 실패 시 일반 연결
- `allow`: SSL 허용
- `disable`: SSL 비활성화 (권장하지 않음)

### 4. 드라이버 설정 (선택사항)

**드라이버 속성** 탭에서:

- **"PostgreSQL JDBC Driver"** 사용 (기본값)
- 필요시 최신 드라이버 버전으로 업데이트

### 5. 연결 테스트

1. **"연결 테스트"** 버튼 클릭
2. 성공 메시지 확인:
   ```
   연결이 성공적으로 설정되었습니다.
   ```
3. 실패 시 오류 메시지 확인:
   - 비밀번호 오류
   - 보안 그룹 설정 문제
   - 네트워크 연결 문제

### 6. 연결 저장

1. **"확인"** 또는 **"완료"** 버튼 클릭
2. 연결이 데이터베이스 탐색기에 추가됨

## 🔍 연결 문제 해결

### 문제 1: 연결 타임아웃

**원인**: 보안 그룹이 로컬 IP를 허용하지 않음

**해결**:
```bash
# 보안 그룹에 로컬 IP 추가
./scripts/add-local-ip-to-rds-sg.sh
```

또는 AWS 콘솔에서:
1. EC2 → 보안 그룹 → `default (sg-0ee0b5b7ad553f05a)`
2. 인바운드 규칙 편집
3. PostgreSQL (포트 5432) 규칙 추가
4. 소스: 내 IP 또는 특정 IP 주소

### 문제 2: 비밀번호 인증 실패

**원인**: 비밀번호 오류

**해결**:
- 비밀번호를 다시 확인
- 대소문자, 특수문자 정확히 입력
- AWS 콘솔에서 RDS 비밀번호 재설정 (필요시)

### 문제 3: SSL 연결 오류

**원인**: SSL 설정 문제

**해결**:
- SSL 모드를 `require`로 설정
- "SSL 인증서 확인" 체크박스 해제 (임시)
- 또는 RDS CA 인증서 다운로드하여 사용

## 📝 연결 문자열 형식

DBeaver에서 사용하는 연결 문자열:

```
jdbc:postgresql://iamvet-db.cpoiq4c6mbhf.ap-northeast-2.rds.amazonaws.com:5432/iamvet?ssl=true&sslmode=require
```

## ✅ 연결 확인

연결 성공 후:

1. **데이터베이스 탐색기**에서 `iamvet` 데이터베이스 확장
2. **스키마** → **public** → **테이블** 확인
3. 테이블 개수 확인 (43개)
4. 데이터 조회 테스트

## 🔒 보안 권장사항

1. **비밀번호 저장**: DBeaver에 비밀번호를 저장할지 선택
   - 개발 환경: 저장 가능
   - 프로덕션 환경: 저장하지 않는 것을 권장

2. **SSL 사용**: 항상 SSL 연결 사용 (require)

3. **보안 그룹**: 로컬 IP만 허용하도록 제한

4. **연결 타임아웃**: 적절한 타임아웃 설정

## 📊 데이터 확인

연결 후 다음 쿼리로 데이터 확인:

```sql
-- 테이블 개수 확인
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- 주요 테이블 레코드 수 확인
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'applications', COUNT(*) FROM applications
UNION ALL
SELECT 'hospitals', COUNT(*) FROM hospitals;
```

## 🔗 참고

- [DBeaver 공식 문서](https://dbeaver.com/docs/)
- [PostgreSQL JDBC 드라이버](https://jdbc.postgresql.org/)
- [AWS RDS PostgreSQL 연결](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ConnectToPostgreSQLInstance.html)
