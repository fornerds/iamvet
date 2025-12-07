# Node.js 런타임 복구 가이드

## 🚨 문제 상황

- `node -v` → Killed
- `npm -v` → Killed  
- `pm2 -v` → Killed
- 메모리는 6% 사용, swap도 여유 → OOM 아님
- 재부팅 후에도 동일한 문제

## 🔍 원인 분석

**결론**: 기존에 설치된 Node/PM2 바이너리가 손상되었거나, 환경이 꼬여서 실행 즉시 크래시

### 증상

1. Node.js 실행 시 즉시 "Killed" 발생
2. 메모리 부족이 아님 (메모리 사용률 6%)
3. 재부팅 후에도 동일한 문제
4. 바이너리 손상 또는 환경 문제로 판단

## ✅ 해결 방법

### 1. 시스템 복구 및 Node.js 재설치

```bash
./deploy/fix-system-and-node.sh
```

이 스크립트가 수행하는 작업:
1. 필수 도구 재설치 (curl, wget)
2. 기존 Node.js 완전 제거
3. NodeSource 저장소에서 Node.js 20 LTS 설치
4. NPM 업데이트
5. PM2 재설치

### 2. 애플리케이션 재시작

```bash
./deploy/restart-app-after-fix.sh
```

또는 수동으로:

```bash
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205
cd /home/ubuntu/iamvet
pm2 delete all
pm2 kill
pm2 start ecosystem.config.js
```

## 📋 설치된 버전

- **Node.js**: v20.19.6
- **NPM**: 11.6.4
- **PM2**: 6.0.14

## 🔄 복구 프로세스

### 1단계: 시스템 복구

```bash
# 필수 도구 재설치
sudo apt-get update
sudo apt-get install --reinstall -y curl wget ca-certificates
```

### 2단계: 기존 Node.js 제거

```bash
# 모든 Node.js 관련 패키지 제거
sudo apt-get remove -y nodejs npm
sudo apt-get purge -y nodejs npm
sudo apt-get autoremove -y

# 수동 설치된 Node.js 제거
sudo rm -rf /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx
sudo rm -rf /usr/local/lib/node_modules
rm -rf ~/.nvm
```

### 3단계: Node.js 재설치

```bash
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 설치
sudo apt-get install -y nodejs
```

### 4단계: NPM 및 PM2 설치

```bash
# NPM 업데이트
sudo npm install -g npm@latest

# PM2 설치
sudo npm install -g pm2@latest
```

### 5단계: 애플리케이션 재시작

```bash
cd /home/ubuntu/iamvet
pm2 delete all
pm2 kill
pm2 start ecosystem.config.js
```

## ✅ 확인 사항

### Node.js 버전 확인

```bash
node -v  # v20.19.6
npm -v   # 11.6.4
pm2 -v   # 6.0.14
```

### PM2 상태 확인

```bash
pm2 status
pm2 describe iamvet
```

### 서버 응답 확인

```bash
curl -I http://localhost:3000
curl -I https://iam-vet.com
```

## 🎯 예방 조치

### 1. 정기적인 백업

- Node.js 바이너리 백업
- PM2 설정 백업
- 환경 변수 백업

### 2. 모니터링

- Node.js 프로세스 모니터링
- 메모리 사용량 모니터링
- PM2 로그 모니터링

### 3. 자동 복구 설정

- PM2 자동 재시작 설정
- 헬스체크 스크립트
- 알림 설정

## 📚 관련 문서

- [메모리 업그레이드 가이드](MEMORY_UPGRADE_GUIDE.md)
- [서버 재부팅 안전성](REBOOT_SAFETY.md)
- [안정적인 운영 방안](STABLE_OPERATION_OPTIONS.md)

## 🚀 빠른 복구

문제 발생 시 다음 명령어로 즉시 복구:

```bash
# 1. 시스템 복구 및 Node.js 재설치
./deploy/fix-system-and-node.sh

# 2. 애플리케이션 재시작
./deploy/restart-app-after-fix.sh

# 3. 서비스 확인
curl -I https://iam-vet.com
```

