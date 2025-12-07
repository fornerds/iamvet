# 메모리 부족 문제 근본 해결 가이드

## 🚨 현재 문제

- **메모리 부족 (OOM)**: PM2 프로세스가 "Killed"됨
- **502 Bad Gateway**: 서버가 응답하지 않음
- **재부팅만으로는 해결 안 됨**: 근본적인 해결 필요

## 🎯 근본 해결 방법

### 1. 서버 사양 업그레이드 (필수)

**현재**: t3.medium (2 vCPU, 3.7GB 메모리)  
**권장**: t3.large (2 vCPU, 8GB 메모리)

#### 업그레이드 방법

##### 방법 1: AWS 콘솔 사용 (권장)

1. **AWS 콘솔 접속**
   - https://console.aws.amazon.com/ec2
   - 로그인

2. **EC2 인스턴스 선택**
   - EC2 > Instances 메뉴
   - 인스턴스 ID: `i-0ec8600586ba05cb9` 또는 IP: `3.38.238.205` 선택

3. **인스턴스 타입 변경**
   - Actions > Instance Settings > Change Instance Type
   - 새 인스턴스 타입: **t3.large** 선택
   - Apply 클릭

4. **인스턴스 재시작**
   - 인스턴스가 자동으로 재시작됨 (약 5분 소요)
   - 재시작 중에는 서비스 일시 중단

##### 방법 2: AWS CLI 사용

```bash
# 1. 인스턴스 중지
aws ec2 stop-instances --instance-ids i-0ec8600586ba05cb9

# 2. 인스턴스 타입 변경
aws ec2 modify-instance-attribute \
  --instance-id i-0ec8600586ba05cb9 \
  --instance-type Value=t3.large

# 3. 인스턴스 시작
aws ec2 start-instances --instance-ids i-0ec8600586ba05cb9
```

### 2. 메모리 최적화 설정

서버 사양 업그레이드 후 다음 설정을 적용합니다:

#### PM2 메모리 제한 증가

```javascript
// ecosystem.config.js
max_memory_restart: '1.5G'  // 400M → 1.5G
```

#### Node.js 힙 메모리 제한

```javascript
// ecosystem.config.js
node_args: '--max-old-space-size=1536'  // 1.5GB 힙 메모리
```

### 3. 자동 최적화 스크립트 실행

```bash
# 서버 사양 업그레이드 후 실행
./deploy/apply-memory-optimization.sh
```

이 스크립트가 자동으로:
- PM2 메모리 제한을 1.5GB로 증가
- Node.js 힙 메모리 옵션 추가
- PM2 재시작

## 📊 업그레이드 옵션 비교

| 인스턴스 타입 | vCPU | 메모리 | 비용/월 | 추천 |
|--------------|------|--------|--------|------|
| **t3.medium** (현재) | 2 | 3.7GB | $30 | ❌ 부족 |
| **t3.large** | 2 | 8GB | $60 | ✅ 권장 |
| **t3.xlarge** | 4 | 16GB | $120 | 대규모 |
| **t3a.large** | 2 | 8GB | $54 | 비용 효율 |

## 🔄 업그레이드 프로세스

### 1단계: 서버 사양 업그레이드

1. AWS 콘솔에서 인스턴스 타입 변경
2. 인스턴스 재시작 (약 5분)
3. 서비스 복구 확인

### 2단계: 메모리 최적화 설정

```bash
# 메모리 최적화 설정 적용
./deploy/apply-memory-optimization.sh
```

### 3단계: 검증

```bash
# 서버 상태 확인
./deploy/check-server-status.sh

# 메모리 사용량 확인
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 "free -h"
```

## ✅ 예상 효과

### 업그레이드 전

- 메모리: 3.7GB (부족)
- PM2 메모리 제한: 400MB
- 문제: OOM 킬러로 프로세스 종료
- 안정성: 낮음

### 업그레이드 후

- 메모리: 8GB (충분)
- PM2 메모리 제한: 1.5GB
- 문제: 해결됨
- 안정성: 높음

## 💰 비용

### 현재 (t3.medium)

- 월 비용: 약 $30
- 문제: 메모리 부족으로 불안정

### 업그레이드 후 (t3.large)

- 월 비용: 약 $60
- 장점: 안정적인 운영 가능

**비용 증가**: $30/월 (하루 약 $1)

## 🎯 권장 사항

### 즉시 조치

1. **서버 사양 업그레이드**: t3.medium → t3.large
2. **메모리 최적화 설정 적용**: `./deploy/apply-memory-optimization.sh`
3. **서비스 복구 확인**: 웹사이트 접속 테스트

### 장기 조치

1. **모니터링 설정**: 메모리 사용량 모니터링
2. **알림 설정**: 메모리 사용량 80% 이상 시 알림
3. **정기 재시작**: 매일 새벽 자동 재시작 (선택사항)

## 📝 체크리스트

- [ ] AWS 콘솔에서 인스턴스 타입 변경 (t3.large)
- [ ] 인스턴스 재시작 완료 대기 (약 5분)
- [ ] 서비스 복구 확인
- [ ] 메모리 최적화 설정 적용 (`./deploy/apply-memory-optimization.sh`)
- [ ] PM2 상태 확인
- [ ] 웹사이트 접속 테스트
- [ ] 메모리 사용량 모니터링

## 🚀 빠른 시작

```bash
# 1. 서버 사양 업그레이드 가이드 확인
./deploy/upgrade-server-spec.sh

# 2. AWS 콘솔에서 인스턴스 타입 변경 (수동)
#    - EC2 > Instances > Actions > Change Instance Type > t3.large

# 3. 업그레이드 완료 후 메모리 최적화 적용
./deploy/apply-memory-optimization.sh

# 4. 서버 상태 확인
./deploy/check-server-status.sh
```

## ⚠️ 주의사항

1. **다운타임**: 업그레이드 중 약 5분 서비스 중단
2. **DB 안전성**: RDS는 별도 인스턴스로 영향 없음
3. **비용**: 월 $30 증가 ($60/월)
4. **복구 시간**: 업그레이드 후 자동 복구 (PM2 설정)

## 📚 관련 문서

- [서버 재부팅 안전성 가이드](REBOOT_SAFETY.md)
- [안정적인 운영 방안](STABLE_OPERATION_OPTIONS.md)
- [최종 권장 사항](FINAL_RECOMMENDATION.md)

