# 서버 메모리 최적화 가이드

## 문제 상황

서버 메모리 부족으로 인한 배포 실패:
- 총 메모리: 3.7GB
- 사용 가능 메모리: ~969MB
- esbuild 설치 시 SIGKILL 발생 (메모리 부족)

## 해결 방법

### 1. GitHub Actions 배포 시 메모리 최적화

`.github/workflows/deploy-aws.yml`에 메모리 최적화 적용:

#### 의존성 설치 최적화
```bash
# 기존 node_modules 유지하고 업데이트만
if [ -d "node_modules" ]; then
  npm install --production=false --prefer-offline --no-audit
else
  NODE_OPTIONS="--max-old-space-size=1024" npm install --production=false --no-audit
fi
```

#### 빌드 시 메모리 제한
```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

### 2. 서버 메모리 정리

메모리 정리 스크립트 실행:
```bash
./scripts/free-memory.sh
```

이 스크립트는:
- 불필요한 프로세스 종료
- npm 캐시 정리
- 시스템 캐시 정리
- 메모리 상태 확인

### 3. 배포 전 메모리 확인

배포 전에 메모리 상태 확인:
```bash
ssh -i deploy/keys/iamvet-key-new.pem ubuntu@3.38.238.205 'free -h'
```

**권장 사항:**
- 사용 가능 메모리가 1GB 이상일 때 배포
- 스왑 사용량이 50% 이하일 때 배포

### 4. 장기 해결책

#### 옵션 1: EC2 인스턴스 업그레이드
- t3.small (2GB) → t3.medium (4GB)
- 또는 t3.large (8GB)

#### 옵션 2: 스왑 메모리 증가
```bash
# 스왑 파일 크기 증가 (2GB → 4GB)
sudo swapoff /swapfile
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 옵션 3: 빌드를 GitHub Actions에서 수행
- GitHub Actions는 더 많은 메모리 사용 가능
- 서버에서는 빌드된 파일만 배포

## 현재 적용된 최적화

1. ✅ GitHub Actions 워크플로우에 메모리 제한 추가
2. ✅ 기존 node_modules 유지하여 재설치 방지
3. ✅ npm audit 건너뛰기 (메모리 절약)
4. ✅ 빌드 시 메모리 제한 설정

## 모니터링

배포 시 메모리 사용량 모니터링:
```bash
# 실시간 메모리 모니터링
watch -n 1 free -h

# 메모리 사용 상위 프로세스
ps aux --sort=-%mem | head -10
```

## 예상 결과

메모리 최적화 후:
- npm install 성공률 증가
- 빌드 성공률 증가
- 배포 시간 단축
- 서버 안정성 향상

