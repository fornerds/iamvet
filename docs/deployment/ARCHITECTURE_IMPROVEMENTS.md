# 지속적 운영을 위한 아키텍처 개선 방안

## 🎯 목표

**서버가 다운되어도 자동으로 복구되고, 문제 원인을 즉시 파악할 수 있는 시스템**

## 📊 현재 아키텍처

```
[사용자] 
    ↓
[Route 53 DNS]
    ↓
[EC2 단일 인스턴스 (t3.medium)]
    ├─ Nginx (리버스 프록시)
    ├─ PM2 (프로세스 관리)
    ├─ Next.js 애플리케이션
    └─ 헬스체크 스크립트 (Cron)
    ↓
[RDS PostgreSQL]
```

### 문제점

1. **단일 장애점 (SPOF)**
   - EC2 인스턴스 하나만 사용
   - 인스턴스 다운 시 전체 서비스 중단

2. **수동 복구 필요**
   - 문제 발생 시 수동으로 SSH 접속하여 확인
   - 원인 파악이 어려움

3. **모니터링 부족**
   - 서버 다운 시 상태 확인 불가
   - 로그 확인이 어려움

## ✅ 개선 방안

### 방안 1: AWS 네이티브 모니터링 (즉시 적용 가능, 비용 최소)

#### 구성

```
[사용자]
    ↓
[EC2 인스턴스]
    ├─ CloudWatch Agent (로그/메트릭 수집)
    ├─ SSM Agent (원격 관리)
    └─ 기존 애플리케이션
    ↓
[CloudWatch]
    ├─ 로그 그룹
    ├─ 메트릭
    └─ 알람
    ↓
[SNS] → [이메일/SMS 알림]
    ↓
[SSM 자동 복구] → [복구 시도]
```

#### 장점

- ✅ 서버 다운되어도 AWS 콘솔에서 확인 가능
- ✅ 문제 발생 시 자동 알림
- ✅ 자동 복구 시도
- ✅ 비용: 거의 없음 (CloudWatch 기본 무료 티어)

#### 설정 방법

```bash
# 1. CloudWatch 모니터링 설정
./deploy/setup-cloudwatch-monitoring.sh

# 2. SNS 알림 설정
./deploy/setup-sns-alerts.sh

# 3. SSM 자동 복구 설정
./deploy/setup-ssm-automatic-recovery.sh
```

### 방안 2: Load Balancer + Auto Scaling (고가용성)

#### 구성

```
[사용자]
    ↓
[Application Load Balancer (ALB)]
    ↓
[Auto Scaling Group]
    ├─ EC2 인스턴스 1 (최소 1개)
    ├─ EC2 인스턴스 2 (최대 3개)
    └─ Health Check
    ↓
[CloudWatch] → [SNS] → [알림]
    ↓
[자동 복구/스케일링]
    ↓
[RDS (Multi-AZ)]
```

#### 장점

- ✅ 인스턴스 장애 시 자동 교체
- ✅ 트래픽 증가 시 자동 확장
- ✅ 고가용성 (99.9% 이상)
- ✅ 로드 밸런싱

#### 비용

- ALB: 약 $16/월
- 추가 EC2 인스턴스: 사용 시에만
- **총 예상: $30-50/월 추가**

#### 설정 방법

1. **ALB 생성**
   ```bash
   aws elbv2 create-load-balancer \
     --name iamvet-alb \
     --subnets subnet-xxx subnet-yyy \
     --security-groups sg-xxx
   ```

2. **Target Group 생성**
   ```bash
   aws elbv2 create-target-group \
     --name iamvet-targets \
     --protocol HTTP \
     --port 3000 \
     --vpc-id vpc-xxx \
     --health-check-path /api/health-external
   ```

3. **Auto Scaling Group 생성**
   ```bash
   aws autoscaling create-auto-scaling-group \
     --auto-scaling-group-name iamvet-asg \
     --min-size 1 \
     --max-size 3 \
     --desired-capacity 1 \
     --target-group-arns arn:aws:elasticloadbalancing:...
   ```

### 방안 3: ECS Fargate (서버리스, 권장)

#### 구성

```
[사용자]
    ↓
[Application Load Balancer]
    ↓
[ECS Fargate]
    ├─ Task 1 (Next.js)
    ├─ Task 2 (Next.js) - 자동 스케일링
    └─ Task 3 (Next.js) - 필요 시
    ↓
[CloudWatch] → [SNS] → [알림]
    ↓
[자동 스케일링/복구]
    ↓
[RDS]
```

#### 장점

- ✅ 서버 관리 불필요
- ✅ 자동 스케일링
- ✅ 높은 가용성
- ✅ 컨테이너 기반 격리
- ✅ 빠른 배포

#### 비용

- ALB: 약 $16/월
- Fargate: 사용량 기반 (약 $30-50/월)
- **총 예상: $50-70/월**

#### 설정 방법

1. **Dockerfile 생성**
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY . .
   RUN npm ci --production=false
   RUN npx prisma generate
   RUN npm run build
   CMD ["npm", "start"]
   ```

2. **ECS 클러스터 및 서비스 생성**
   - AWS 콘솔 또는 Terraform 사용

### 방안 4: Vercel + RDS (가장 간단)

#### 구성

```
[사용자]
    ↓
[Vercel (글로벌 CDN)]
    ├─ Edge Functions
    ├─ 자동 스케일링
    └─ 무료 SSL
    ↓
[RDS PostgreSQL]
```

#### 장점

- ✅ 서버 관리 완전 불필요
- ✅ 자동 스케일링
- ✅ 글로벌 CDN
- ✅ 무료 SSL
- ✅ 무료 티어 제공
- ✅ 가장 빠른 배포

#### 비용

- Vercel: 무료 ~ $20/월 (사용량에 따라)
- RDS: 기존과 동일
- **총 예상: 기존과 동일 또는 더 저렴**

#### 설정 방법

1. **Vercel 프로젝트 생성**
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

2. **환경 변수 설정**
   - Vercel 대시보드에서 GitHub Secrets와 동일하게 설정

3. **도메인 연결**
   - Route 53에서 CNAME 레코드 추가

## 📋 단계별 마이그레이션 계획

### Phase 1: 즉시 적용 (비용 없음)

1. ✅ CloudWatch 모니터링 설정
2. ✅ SNS 알림 설정
3. ✅ SSM 자동 복구 설정
4. ✅ 외부 헬스체크 엔드포인트 추가

**예상 시간:** 30분
**비용:** $0

### Phase 2: 모니터링 강화 (비용 최소)

1. UptimeRobot 외부 헬스체크 설정
2. CloudWatch 대시보드 생성
3. 자동 알림 규칙 추가

**예상 시간:** 1시간
**비용:** $0 (UptimeRobot 무료 티어)

### Phase 3: 고가용성 구축 (비용 발생)

**옵션 A: ALB + Auto Scaling**
- 비용: $30-50/월 추가
- 가용성: 99.9%
- 설정 시간: 2-3시간

**옵션 B: ECS Fargate**
- 비용: $50-70/월
- 가용성: 99.95%
- 설정 시간: 4-6시간

**옵션 C: Vercel 마이그레이션**
- 비용: $0-20/월
- 가용성: 99.99%
- 설정 시간: 1-2시간

## 🎯 권장 사항

### 즉시 적용 (무료)

```bash
# 1. CloudWatch 모니터링
./deploy/setup-cloudwatch-monitoring.sh

# 2. SNS 알림
./deploy/setup-sns-alerts.sh

# 3. SSM 자동 복구
./deploy/setup-ssm-automatic-recovery.sh
```

### 중기 개선 (1-2개월 내)

**Vercel 마이그레이션을 권장합니다:**
- 가장 간단하고 안정적
- 비용 효율적
- 관리 부담 최소

### 장기 개선 (6개월 이상)

- Multi-AZ 배포
- 자동 백업 시스템
- 재해 복구 계획
- 성능 최적화

## 💡 결론

**현재 상황에서 가장 빠르고 효과적인 방법:**

1. **즉시**: CloudWatch + SNS + SSM 설정 (무료)
2. **1주일 내**: UptimeRobot 외부 헬스체크 설정 (무료)
3. **1개월 내**: Vercel 마이그레이션 검토 (비용 절감 가능)

이렇게 하면 **서버가 다운되어도 자동으로 감지하고 복구를 시도하며, 문제 원인을 즉시 파악**할 수 있습니다.

