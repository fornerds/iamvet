# 자동 복구 시스템 상태 확인

## 현재 상태

✅ **자동 복구 시스템 정상 작동 중**

### 확인 사항

1. **헬스체크 스크립트**: `/home/ubuntu/iamvet/health-check.sh`
   - 실행 권한: ✅
   - 파일 크기: 1129 bytes
   - 생성일: Dec 5 10:01

2. **Cron Job**: 정상 설정됨
   ```
   */5 * * * * /home/ubuntu/iamvet/health-check.sh >> /home/ubuntu/iamvet/logs/health-check.log 2>&1
   ```
   - 실행 주기: 5분마다
   - 로그 파일: `/home/ubuntu/iamvet/logs/health-check.log`

3. **헬스체크 로그**: 정상 응답 확인
   ```
   Fri Dec  5 10:05:01 UTC 2025: ✅ Next.js 서버 정상 응답
   ```

## 모니터링 명령어

### 실시간 로그 확인
```bash
tail -f /home/ubuntu/iamvet/logs/health-check.log
```

### 최근 헬스체크 결과 확인
```bash
tail -20 /home/ubuntu/iamvet/logs/health-check.log
```

### Cron Job 확인
```bash
crontab -l | grep health-check
```

### PM2 상태 확인
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
pm2 status
```

## 자동 복구 작동 시나리오

### 정상 상황
```
[매 5분마다]
  ↓
헬스체크 실행
  ↓
Next.js 서버 응답 확인 (3회 재시도)
  ↓
✅ 정상 응답
  ↓
로그 기록: "✅ Next.js 서버 정상 응답"
```

### 문제 발생 시
```
[매 5분마다]
  ↓
헬스체크 실행
  ↓
Next.js 서버 응답 확인 (3회 재시도)
  ↓
❌ 응답 없음
  ↓
PM2 자동 재시작
  ↓
재시작 후 응답 확인
  ↓
✅ 복구 완료
  ↓
로그 기록: "✅ PM2 재시작 후 서버 정상 응답"
```

## 통계 확인

### 헬스체크 통계
```bash
# 총 헬스체크 횟수
wc -l /home/ubuntu/iamvet/logs/health-check.log

# 성공 횟수
grep "✅" /home/ubuntu/iamvet/logs/health-check.log | wc -l

# 재시작 횟수
grep "재시작" /home/ubuntu/iamvet/logs/health-check.log | wc -l

# 실패 횟수
grep "❌" /home/ubuntu/iamvet/logs/health-check.log | wc -l
```

## 문제 발생 시 확인 사항

### 1. 헬스체크가 실행되지 않는 경우
```bash
# Cron 서비스 확인
sudo systemctl status cron

# Cron 로그 확인
sudo grep CRON /var/log/syslog | tail -20
```

### 2. 헬스체크는 실행되지만 재시작이 안 되는 경우
```bash
# 스크립트 수동 실행
/home/ubuntu/iamvet/health-check.sh

# PM2 상태 확인
pm2 status
pm2 logs iamvet --lines 50
```

### 3. 로그 파일이 없는 경우
```bash
# 로그 디렉토리 확인
ls -la /home/ubuntu/iamvet/logs/

# 로그 디렉토리 생성
mkdir -p /home/ubuntu/iamvet/logs
chmod 755 /home/ubuntu/iamvet/logs
```

## 로그 로테이션

로그 파일이 너무 커지지 않도록 자동 로테이션이 설정되어 있습니다:

- **위치**: `/etc/logrotate.d/iamvet-health-check`
- **설정**: 매일 로테이션, 최근 7일 유지, 압축

### 로그 로테이션 확인
```bash
sudo cat /etc/logrotate.d/iamvet-health-check
```

### 수동 로그 로테이션 실행
```bash
sudo logrotate -f /etc/logrotate.d/iamvet-health-check
```

## 알림 설정 (선택사항)

문제 발생 시 알림을 받으려면 `health-check.sh`에 알림 코드를 추가할 수 있습니다:

```bash
# Slack 알림 예시
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"⚠️ Next.js 서버 응답 없음, 자동 재시작 완료"}'
```

## 성능 모니터링

### 메모리 사용량 추적
```bash
# PM2 메모리 사용량
pm2 list | grep iamvet

# 시스템 메모리
free -h
```

### 응답 시간 모니터링
```bash
# 응답 시간 측정
time curl -f -s http://localhost:3000 > /dev/null
```

## 최적화 권장사항

1. **정기적인 모니터링**: 주 1회 로그 확인
2. **패턴 분석**: 재시작이 자주 발생하면 근본 원인 파악
3. **알림 설정**: 중요한 문제 발생 시 즉시 알림
4. **성능 튜닝**: 메모리 사용량이 높으면 코드 최적화 고려

## 체크리스트

- [x] 헬스체크 스크립트 생성 완료
- [x] Cron job 설정 완료
- [x] 로그 파일 생성 확인
- [x] 정상 작동 확인
- [ ] 알림 설정 (선택사항)
- [ ] 정기적인 모니터링 일정 수립

## 요약

현재 자동 복구 시스템은 **정상적으로 작동 중**입니다:

- ✅ 5분마다 자동 헬스체크 실행
- ✅ 서버 정상 응답 확인됨
- ✅ 문제 발생 시 자동 재시작 준비 완료
- ✅ 모든 활동 로그 기록 중

**결론**: 수동 개입 없이 자동으로 운영 가능한 상태입니다.

