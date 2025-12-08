# Deploy 스크립트 인덱스

이 문서는 `deploy/` 디렉토리의 모든 스크립트 상태를 관리합니다.

## 📊 스크립트 상태

| 상태 | 의미 |
|------|------|
| ✅ **ACTIVE** | 현재 사용 중이며 정기적으로 사용됨 |
| 🔧 **MAINTENANCE** | 유지보수/문제 해결용 (필요 시 사용) |
| 📦 **ARCHIVED** | 더 이상 사용하지 않지만 참고용으로 보관 |
| ⚠️ **DEPRECATED** | 사용 중단, 다른 방법으로 대체됨 |

---

## ✅ ACTIVE - 현재 사용 중

### 자동 배포
- **`.github/workflows/deploy-aws.yml`** - GitHub Actions 자동 배포 워크플로우
  - `main` 브랜치 푸시 시 자동 실행
  - 모든 배포 프로세스를 자동화

### 모니터링 및 상태 확인
- **`check-status.sh`** ✅ - 간단한 배포 상태 확인
  - 웹사이트 접속 확인
  - 서버 상태 확인
  - PM2 프로세스 확인

- **`check-deployment-status.sh`** ✅ - 상세한 배포 상태 확인
  - DNS 확인
  - EC2 접속 테스트
  - 서버 상태 상세 확인
  - 외부 접속 테스트

### 설정 및 초기화
- **`setup-pm2-startup.sh`** ✅ - PM2 재부팅 후 자동 시작 설정
  - 서버 재부팅 시 PM2 자동 시작
  - 한 번만 실행하면 됨

- **`setup-cloudwatch-monitoring.sh`** ✅ - AWS CloudWatch 모니터링 설정
  - 로그 수집
  - 메트릭 수집
  - 서버 다운되어도 AWS 콘솔에서 확인 가능

- **`setup-sns-alerts.sh`** ✅ - AWS SNS 알림 시스템 설정
  - 문제 발생 시 이메일/SMS 알림
  - CloudWatch 알람 연동

- **`setup-ssm-automatic-recovery.sh`** ✅ - AWS Systems Manager 자동 복구 설정
  - 서버 문제 발생 시 자동 복구 시도

- **`config.sh`** ✅ - 프로젝트 설정 파일
  - 모든 스크립트에서 사용
  - 필수 파일

---

## 🔧 MAINTENANCE - 유지보수/문제 해결용

### 문제 해결 (필요 시 사용)
- **`fix-system-and-node.sh`** 🔧 - Node.js/PM2 런타임 완전 복구
  - Node.js 바이너리 손상 시 사용
  - 시스템 도구 재설치

- **`fix-node-runtime.sh`** 🔧 - Node.js 런타임 복구
  - Node.js 실행 문제 해결

- **`fix-node-direct-install.sh`** 🔧 - Node.js 직접 설치
  - NVM 문제 시 사용

- **`fix-node-runtime-complete.sh`** 🔧 - Node.js 완전 복구
  - 모든 Node.js 관련 문제 해결

- **`restart-app-after-fix.sh`** 🔧 - 복구 후 애플리케이션 재시작
  - 런타임 복구 후 사용

### 네트워크/SSL 문제 해결
- **`fix-ssl-nginx.sh`** 🔧 - SSL 인증서 및 Nginx 설정 수정
  - SSL 인증서 문제 해결

- **`check-and-fix-ssl.sh`** 🔧 - SSL 인증서 확인 및 재발급
  - 인증서 만료/문제 시 사용

- **`apply-nginx-ssl.sh`** 🔧 - Nginx SSL 설정 적용
  - SSL 설정 적용

- **`fix-timeout-issue.sh`** 🔧 - 타임아웃 문제 해결
  - 504 Gateway Timeout 해결

- **`fix-nextjs-timeout.sh`** 🔧 - Next.js 타임아웃 해결
  - Next.js 서버 응답 없음 해결

- **`diagnose-and-fix-https.sh`** 🔧 - HTTPS 문제 진단 및 해결
  - HTTPS 접속 문제 종합 진단

- **`fix-502.sh`** 🔧 - 502 Bad Gateway 해결
  - Nginx 502 에러 해결

### 데이터베이스 문제 해결
- **`fix-database-connections.sh`** 🔧 - 데이터베이스 연결 문제 해결
  - 연결 풀 문제 해결

- **`verify-db-safety.sh`** 🔧 - 데이터베이스 안전성 확인
  - 재부팅 전 DB 안전성 확인

### 메모리 문제 해결
- **`analyze-memory-usage.sh`** 🔧 - 메모리 사용량 분석
  - 메모리 부족 문제 진단

- **`apply-memory-optimization.sh`** 🔧 - 메모리 최적화 적용
  - 메모리 설정 최적화

- **`optimize-memory.sh`** 🔧 - 메모리 최적화
  - 메모리 사용량 최적화

- **`quick-fix-memory.sh`** 🔧 - 메모리 문제 빠른 해결
  - 긴급 메모리 문제 해결

- **`emergency-fix-oom.sh`** 🔧 - OOM(Out Of Memory) 긴급 해결
  - 메모리 부족 긴급 해결

### 기타 문제 해결
- **`diagnose-root-cause.sh`** 🔧 - 근본 원인 진단
  - 문제의 근본 원인 파악

- **`check-server-status.sh`** 🔧 - 서버 상태 확인
  - 서버 전반적인 상태 확인

- **`safe-restart-pm2.sh`** 🔧 - PM2 안전 재시작
  - PM2 프로세스 안전하게 재시작

- **`reboot-server.sh`** 🔧 - 서버 재부팅
  - 서버 재부팅 (주의해서 사용)

- **`setup-cursor-remote.sh`** 🔧 - Cursor Remote SSH 연결 설정
  - Cursor Remote SSH 연결을 위한 필수 도구 설치
  - `curl`, `wget` 설치
  - `.cursor-server` 디렉토리 생성

---

## 📦 ARCHIVED - 더 이상 사용하지 않음 (참고용)

### 초기 설정 (이미 완료됨)
- **`aws-ec2-setup.sh`** 📦 - EC2 인스턴스 초기 생성
  - 이미 인스턴스가 생성되어 있음
  - 새 인스턴스 생성 시 참고용

- **`setup-aws-cli.sh`** 📦 - AWS CLI 초기 설정
  - 이미 설정되어 있음
  - 새 환경 설정 시 참고용

- **`setup-nginx-ssl.sh`** 📦 - Nginx SSL 초기 설정
  - 이미 설정되어 있음
  - 새 서버 설정 시 참고용

- **`setup-ssl.sh`** 📦 - SSL 인증서 초기 설정
  - 이미 설정되어 있음
  - 새 도메인 설정 시 참고용

- **`setup-auto-recovery.sh`** 📦 - 자동 복구 시스템 초기 설정
  - 배포 워크플로우에 통합됨
  - 수동 설정 시 참고용

- **`improve-health-check.sh`** 📦 - 헬스체크 개선
  - 배포 워크플로우에 통합됨
  - 참고용

### 마이그레이션 (완료됨)
- **`migrate-s3-data.sh`** 📦 - S3 데이터 마이그레이션
  - 마이그레이션 완료
  - 참고용

- **`recreate-instance-with-new-key.sh`** 📦 - 새 키로 인스턴스 재생성
  - 이미 완료됨
  - 참고용

- **`setup-vercel-deployment.sh`** 📦 - Vercel 배포 설정
  - 현재 AWS 사용 중
  - Vercel 마이그레이션 시 참고용

### 기타
- **`deploy-to-ec2.sh`** 📦 - 수동 배포 스크립트
  - GitHub Actions 자동 배포 사용 중
  - 수동 배포 필요 시 참고용

- **`add-ssh-key-to-instance.sh`** 📦 - SSH 키 추가
  - 이미 완료됨
  - 참고용

- **`create-rds-instance.sh`** 📦 - RDS 인스턴스 생성
  - 이미 생성되어 있음
  - 새 RDS 생성 시 참고용

- **`upgrade-server-spec.sh`** 📦 - 서버 사양 업그레이드
  - AWS 콘솔에서 직접 업그레이드 권장
  - 참고용

---

## ⚠️ DEPRECATED - 사용 중단

없음 (현재 모든 스크립트는 유지보수용으로 보관)

---

## 📋 스크립트 사용 가이드

### 일상적인 사용

1. **배포 상태 확인**
   ```bash
   ./deploy/check-status.sh
   ```

2. **상세 상태 확인**
   ```bash
   ./deploy/check-deployment-status.sh
   ```

### 문제 발생 시

1. **문제 진단**
   ```bash
   ./deploy/check-deployment-status.sh  # 전체 상태 확인
   ```

2. **특정 문제 해결**
   - 메모리 문제: `analyze-memory-usage.sh` → `apply-memory-optimization.sh`
   - Node.js 문제: `fix-system-and-node.sh`
   - SSL 문제: `check-and-fix-ssl.sh`
   - 데이터베이스 문제: `fix-database-connections.sh`

### 초기 설정 (한 번만)

1. **PM2 자동 시작**
   ```bash
   ./deploy/setup-pm2-startup.sh
   ```

2. **CloudWatch 모니터링**
   ```bash
   ./deploy/setup-cloudwatch-monitoring.sh
   ```

3. **SNS 알림**
   ```bash
   ./deploy/setup-sns-alerts.sh
   ```

4. **SSM 자동 복구**
   ```bash
   ./deploy/setup-ssm-automatic-recovery.sh
   ```

---

## 🔍 스크립트 상태 확인 방법

### 자동 확인 스크립트

```bash
# 스크립트 상태 확인
./deploy/check-scripts-status.sh
```

### 수동 확인

1. 이 문서 (`SCRIPTS_INDEX.md`) 확인
2. 각 스크립트 파일의 헤더 주석 확인
3. GitHub Actions 워크플로우 확인

---

## 📝 스크립트 추가/수정 시

새 스크립트를 추가하거나 기존 스크립트를 수정할 때:

1. 이 문서 (`SCRIPTS_INDEX.md`) 업데이트
2. 스크립트 파일에 헤더 주석 추가:
   ```bash
   #!/bin/bash
   # Status: ACTIVE | MAINTENANCE | ARCHIVED | DEPRECATED
   # Purpose: 스크립트 목적 설명
   # Usage: 사용 방법
   ```

---

## 🗂️ 디렉토리 구조 권장사항

```
deploy/
├── SCRIPTS_INDEX.md          # 이 파일
├── README.md                 # 기본 가이드
├── config.sh                 # 설정 파일
│
├── active/                   # 현재 사용 중인 스크립트 (선택사항)
│   ├── check-status.sh
│   ├── setup-pm2-startup.sh
│   └── ...
│
├── maintenance/              # 유지보수용 스크립트 (선택사항)
│   ├── fix-*.sh
│   └── ...
│
└── archived/                 # 보관용 스크립트 (선택사항)
    ├── aws-ec2-setup.sh
    └── ...
```

**참고**: 현재는 모든 스크립트를 `deploy/` 루트에 유지하고, 이 인덱스 파일로 관리합니다.

---

**최종 업데이트**: 2025-12-08
**관리자**: 배포 시스템

