# 자동 복구 시스템 가이드

Next.js 서버가 응답하지 않는 문제를 자동으로 감지하고 복구하는 시스템입니다.

## 문제 상황

### 발생 가능한 문제

1. **서버 Hang 상태**
   - 프로세스는 살아있지만 HTTP 요청에 응답하지 않음
   - PM2는 프로세스가 죽었을 때만 재시작하므로 감지하지 못함
   - 사용자는 504 Gateway Timeout 에러를 경험

2. **메모리 누수**
   - 장기 실행으로 인한 메모리 사용량 증가
   - `max_memory_restart` 설정으로 일부 해결되지만 완벽하지 않음

3. **데이터베이스 연결 끊김**
   - DB 연결 풀 고갈
   - 네트워크 문제

## 자동 복구 시스템

### 구성 요소

1. **헬스체크 스크립트** (`health-check.sh`)
   - 5분마다 Next.js 서버 응답 확인
   - 응답 없으면 PM2 자동 재시작

2. **Cron Job**
   - 주기적으로 헬스체크 실행
   - 로그 자동 기록

3. **PM2 설정 개선**
   - 자동 재시작 강화
   - 메모리 제한 설정

4. **로그 관리**
   - 로그 로테이션으로 디스크 공간 관리
   - 최근 7일 로그 유지

### 설정 방법

```bash
cd deploy
./setup-auto-recovery.sh
```

### 작동 방식

```
[5분마다]
  ↓
헬스체크 실행
  ↓
Next.js 서버 응답 확인 (3회 재시도)
  ↓
응답 없음?
  ↓
PM2 재시작
  ↓
재시작 후 응답 확인
  ↓
로그 기록
```

## 모니터링

### 실시간 모니터링

```bash
# 서버 상태 확인
/home/ubuntu/iamvet/monitor.sh

# 헬스체크 로그 실시간 확인
tail -f /home/ubuntu/iamvet/logs/health-check.log

# PM2 상태 확인
pm2 status
pm2 logs iamvet
```

### 로그 위치

- 헬스체크 로그: `/home/ubuntu/iamvet/logs/health-check.log`
- PM2 에러 로그: `/home/ubuntu/iamvet/logs/pm2-error.log`
- PM2 출력 로그: `/home/ubuntu/iamvet/logs/pm2-out.log`

## 설정 커스터마이징

### 헬스체크 간격 변경

```bash
# Cron job 편집
crontab -e

# 예: 3분마다 실행
*/3 * * * * /home/ubuntu/iamvet/health-check.sh >> /home/ubuntu/iamvet/logs/health-check.log 2>&1
```

### 응답 시간 임계값 변경

`health-check.sh` 파일 수정:

```bash
MAX_RESPONSE_TIME=10  # 10초로 변경
```

### 재시도 횟수 변경

```bash
RETRY_COUNT=5  # 5회로 변경
```

## 문제 해결

### 헬스체크가 작동하지 않는 경우

1. **Cron job 확인**
   ```bash
   crontab -l
   ```

2. **스크립트 실행 권한 확인**
   ```bash
   ls -la /home/ubuntu/iamvet/health-check.sh
   chmod +x /home/ubuntu/iamvet/health-check.sh
   ```

3. **로그 확인**
   ```bash
   tail -50 /home/ubuntu/iamvet/logs/health-check.log
   ```

### 자동 재시작이 너무 자주 발생하는 경우

1. **근본 원인 파악**
   - 메모리 누수 확인
   - 데이터베이스 연결 문제 확인
   - 코드 오류 확인

2. **임계값 조정**
   - 응답 시간 증가
   - 재시도 횟수 증가

## 추가 모니터링 옵션

### PM2 Plus (유료)

- 실시간 모니터링
- 알림 기능
- 성능 메트릭

### 외부 모니터링 서비스

- **UptimeRobot**: 무료 웹사이트 모니터링
- **Pingdom**: 웹사이트 가용성 모니터링
- **Datadog**: 종합 모니터링 (유료)

### 알림 설정 (선택사항)

Slack, Discord, 이메일 등으로 알림을 받을 수 있습니다:

```bash
# health-check.sh에 알림 추가
curl -X POST https://hooks.slack.com/your-webhook-url \
  -d '{"text":"Next.js 서버 응답 없음, 자동 재시작 완료"}'
```

## 예방 조치

### 1. 정기적인 재시작

매일 새벽 자동 재시작 (선택사항):

```bash
# Cron job 추가
0 3 * * * export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && cd /home/ubuntu/iamvet && pm2 restart iamvet
```

### 2. 메모리 모니터링

```bash
# 메모리 사용량 확인
pm2 list | grep iamvet
free -h
```

### 3. 로그 분석

```bash
# 에러 패턴 확인
grep -i "error\|fatal" /home/ubuntu/iamvet/logs/pm2-error.log | tail -20
```

## 체크리스트

- [ ] 자동 복구 시스템 설정 완료
- [ ] 헬스체크 스크립트 실행 권한 확인
- [ ] Cron job 설정 확인
- [ ] 로그 파일 생성 확인
- [ ] 모니터링 스크립트 테스트
- [ ] 알림 설정 (선택사항)

## 요약

이 자동 복구 시스템을 통해:

✅ **자동 감지**: 서버 응답 없음 자동 감지  
✅ **자동 복구**: PM2 자동 재시작  
✅ **로그 관리**: 모든 활동 로그 기록  
✅ **모니터링**: 실시간 상태 확인 가능  

**결과**: 수동 개입 없이 자동으로 운영 가능합니다!

