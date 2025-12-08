# 외부 모니터링 및 지속적 운영 가이드

**서버가 다운되어도 확인 가능한 모니터링 시스템**

## 🚨 문제점

### 기존 방식의 한계
- ❌ 서버가 다운되면 웹 대시보드도 확인 불가
- ❌ 배포가 실패하면 상태 확인 불가
- ❌ 문제 발생 원인 파악 어려움
- ❌ 수동으로만 복구 가능

## ✅ 해결 방안

### 1. AWS CloudWatch 모니터링 (필수)

**서버가 다운되어도 AWS 콘솔에서 확인 가능**

#### 설정 방법

```bash
./deploy/setup-cloudwatch-monitoring.sh
```

#### 확인 가능한 정보

**로그:**
- PM2 에러 로그
- PM2 출력 로그
- 헬스체크 로그
- Nginx 에러/접근 로그

**메트릭:**
- CPU 사용률
- 메모리 사용률
- 디스크 사용률
- 네트워크 상태
- 프로세스 상태

#### AWS 콘솔에서 확인

- **로그**: https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-2#logsV2:log-groups
- **메트릭**: https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-2#metricsV2

### 2. AWS SNS 알림 시스템 (필수)

**문제 발생 시 즉시 이메일/SMS 알림**

#### 설정 방법

```bash
./deploy/setup-sns-alerts.sh
```

#### 알림 항목

1. **CPU 사용률 80% 초과**
2. **메모리 사용률 85% 초과**
3. **인스턴스 상태 체크 실패**
4. **디스크 사용률 90% 초과**

#### 알림 받기

1. 스크립트 실행 시 이메일 주소 입력
2. 이메일에서 확인 링크 클릭하여 구독 활성화
3. 문제 발생 시 자동으로 이메일 알림 수신

### 3. AWS Systems Manager 자동 복구 (권장)

**서버가 다운되어도 AWS에서 자동 복구 시도**

#### 설정 방법

```bash
./deploy/setup-ssm-automatic-recovery.sh
```

#### 자동 복구 프로세스

1. 서버 응답 확인
2. 응답 없으면 PM2 재시작
3. PM2 프로세스 없으면 시작
4. 복구 실패 시 알림

#### 수동 실행

```bash
# 인스턴스 ID 확인
INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=ip-address,Values=3.38.238.205" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text \
    --region ap-northeast-2)

# 자동 복구 실행
aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "IAMVET-AutoRecovery" \
    --region ap-northeast-2
```

### 4. 외부 헬스체크 서비스 (추가 권장)

**서버 외부에서 지속적으로 모니터링**

#### UptimeRobot (무료)

1. https://uptimerobot.com 가입
2. 새 모니터 추가:
   - **Monitor Type**: HTTP(s)
   - **URL**: https://iam-vet.com
   - **Interval**: 5분
   - **Alert Contacts**: 이메일 추가
3. 서버 다운 시 자동 알림

#### Pingdom (유료, 더 많은 기능)

- 더 상세한 모니터링
- 성능 분석
- 트랜잭션 모니터링

### 5. EventBridge를 통한 자동 복구 (고급)

**CloudWatch 알람 발생 시 자동으로 복구 시도**

#### 설정 방법

```bash
# Lambda 함수 생성 (자동 복구 로직)
# EventBridge 규칙 생성 (알람 → Lambda 트리거)
```

자세한 설정은 AWS 콘솔에서 EventBridge 규칙을 생성하세요.

## 🏗️ 지속적 운영을 위한 아키텍처 개선

### 현재 아키텍처의 한계

```
[사용자] → [EC2 단일 인스턴스] → [RDS]
```

**문제점:**
- 단일 장애점 (SPOF)
- 인스턴스 다운 시 전체 서비스 중단
- 수동 복구 필요

### 개선된 아키텍처 (권장)

#### 옵션 1: Load Balancer + Auto Scaling (중간 비용)

```
[사용자] → [ALB] → [EC2 Auto Scaling Group] → [RDS]
                      ↓
                  [CloudWatch]
                      ↓
                  [자동 복구]
```

**장점:**
- 인스턴스 장애 시 자동 교체
- 트래픽 증가 시 자동 확장
- 고가용성

**비용:** 약 $20-30/월 추가

#### 옵션 2: ECS Fargate (서버리스, 권장)

```
[사용자] → [ALB] → [ECS Fargate] → [RDS]
                      ↓
                  [CloudWatch]
```

**장점:**
- 서버 관리 불필요
- 자동 스케일링
- 높은 가용성
- 컨테이너 기반으로 격리

**비용:** 사용량 기반 (약 $30-50/월)

#### 옵션 3: Vercel + RDS (가장 간단)

```
[사용자] → [Vercel] → [RDS]
```

**장점:**
- 서버 관리 완전 불필요
- 자동 스케일링
- 글로벌 CDN
- 무료 티어 제공

**비용:** 무료 ~ $20/월

## 📋 단계별 마이그레이션 가이드

### 1단계: 즉시 적용 (비용 없음)

```bash
# CloudWatch 모니터링 설정
./deploy/setup-cloudwatch-monitoring.sh

# SNS 알림 설정
./deploy/setup-sns-alerts.sh

# SSM 자동 복구 설정
./deploy/setup-ssm-automatic-recovery.sh
```

### 2단계: 외부 헬스체크 설정 (무료)

1. UptimeRobot 가입 및 모니터 설정
2. 이메일 알림 설정

### 3단계: 아키텍처 개선 (선택)

**ECS Fargate 마이그레이션 가이드:**
- `docs/deployment/ECS_MIGRATION_GUIDE.md` 참조

**Vercel 마이그레이션 가이드:**
- `docs/deployment/VERCEL_MIGRATION_GUIDE.md` 참조

## 🔍 문제 발생 시 확인 순서

### 1. 외부 헬스체크 확인
- UptimeRobot/Pingdom에서 서버 상태 확인
- 다운타임 기록 확인

### 2. AWS CloudWatch 확인
- 로그에서 에러 메시지 확인
- 메트릭에서 리소스 사용률 확인
- 알람 상태 확인

### 3. SNS 알림 확인
- 이메일에서 알림 내용 확인
- 어떤 리소스가 문제인지 파악

### 4. SSM 자동 복구 실행
- AWS 콘솔에서 수동 실행
- 또는 자동으로 실행됨

### 5. 수동 복구 (필요 시)
- SSH 접속하여 직접 확인
- 로그 확인 및 문제 해결

## 💰 비용 비교

| 옵션 | 월 비용 | 가용성 | 관리 부담 |
|------|---------|--------|-----------|
| 현재 (EC2 단일) | $30 | 낮음 | 높음 |
| EC2 + 모니터링 | $30 | 중간 | 중간 |
| EC2 + ALB + Auto Scaling | $50-60 | 높음 | 중간 |
| ECS Fargate | $50-70 | 높음 | 낮음 |
| Vercel | $0-20 | 매우 높음 | 매우 낮음 |

## 🎯 권장 사항

### 즉시 적용 (무료)
1. ✅ CloudWatch 모니터링
2. ✅ SNS 알림
3. ✅ SSM 자동 복구
4. ✅ UptimeRobot 외부 헬스체크

### 중기 개선 (비용 발생)
1. ECS Fargate로 마이그레이션
2. 또는 Vercel로 마이그레이션

### 장기 개선
1. Multi-AZ 배포
2. 자동 백업 시스템
3. 재해 복구 계획

## 📚 관련 문서

- [CloudWatch 모니터링 설정](setup-cloudwatch-monitoring.sh)
- [SNS 알림 설정](setup-sns-alerts.sh)
- [SSM 자동 복구 설정](setup-ssm-automatic-recovery.sh)
- [ECS 마이그레이션 가이드](ECS_MIGRATION_GUIDE.md)
- [Vercel 마이그레이션 가이드](VERCEL_MIGRATION_GUIDE.md)

