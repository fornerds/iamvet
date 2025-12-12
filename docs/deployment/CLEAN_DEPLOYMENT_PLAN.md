# 깨끗한 배포 계획서

## 목표
EC2 인스턴스를 새로 생성하여 깨끗한 환경에서 안정적인 배포 시스템 구축

## 현재 문제점 분석

### 1. DATABASE_URL 누락 문제
- **원인**: `.env.production` 파일이 GitHub Actions에서 생성되지만, 서버에서 수동 수정 시 덮어씌워짐
- **영향**: 모든 API가 500 에러 발생

### 2. PM2 관리 문제
- **원인**: PM2가 환경 변수를 제대로 로드하지 못함
- **영향**: 서버 재시작 시 환경 변수 손실

### 3. ecosystem.config.js 누락
- **원인**: 배포 스크립트가 실행되지 않거나 실패 시 파일이 생성되지 않음
- **영향**: PM2가 제대로 시작되지 않음

### 4. 로컬/서버 환경 차이
- **원인**: 로컬 `.env.production`과 서버 `.env.production`이 동기화되지 않음
- **영향**: 환경 변수 불일치로 인한 오류

## 해결 방안

### Phase 1: 새로운 EC2 인스턴스 준비

#### 1.1 EC2 인스턴스 생성
- **인스턴스 타입**: t3.large (8GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **보안 그룹**: 
  - SSH (22): 특정 IP만 허용
  - HTTP (80): 모든 IP 허용
  - HTTPS (443): 모든 IP 허용
  - Custom TCP (3000): localhost만 허용 (Nginx용)

#### 1.2 초기 설정
```bash
# 1. 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 2. 필수 패키지 설치
sudo apt install -y curl git build-essential

# 3. Node.js 설치 (NVM 사용)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# 4. PM2 설치
npm install -g pm2
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# 5. Nginx 설치
sudo apt install -y nginx

# 6. Git 설정
git config --global user.name "Deployment"
git config --global user.email "deploy@iam-vet.com"
```

### Phase 2: 배포 스크립트 개선

#### 2.1 통합 배포 스크립트 생성
- **목적**: 모든 배포 과정을 하나의 스크립트로 통합
- **기능**:
  - 환경 변수 검증
  - 의존성 설치
  - 빌드
  - PM2 설정 및 시작
  - 헬스 체크

#### 2.2 환경 변수 관리 개선
- **방법**: GitHub Secrets에서 직접 로드하여 `.env.production` 생성
- **검증**: 필수 환경 변수 존재 여부 확인
- **백업**: 기존 `.env.production` 자동 백업

### Phase 3: GitHub Actions 워크플로우 개선

#### 3.1 배포 전 검증 단계 추가
- Secrets 존재 여부 확인
- 환경 변수 형식 검증
- 서버 연결 테스트

#### 3.2 배포 후 검증 단계 추가
- PM2 상태 확인
- 포트 응답 확인
- API 헬스 체크

### Phase 4: 문서화 및 표준화

#### 4.1 배포 가이드 작성
- 초기 설정 가이드
- 배포 프로세스 문서
- 문제 해결 가이드

#### 4.2 모니터링 설정
- PM2 모니터링
- 로그 관리
- 알림 설정

## 구현 계획

### Step 1: 새로운 배포 스크립트 작성
- `deploy/setup-server.sh`: 서버 초기 설정
- `deploy/deploy.sh`: 통합 배포 스크립트
- `deploy/verify.sh`: 배포 검증 스크립트

### Step 2: GitHub Actions 워크플로우 개선
- 환경 변수 검증 강화
- 배포 후 검증 추가
- 롤백 메커니즘 추가

### Step 3: 환경 변수 관리 개선
- `.env.production.template` 생성
- 환경 변수 검증 로직 추가
- 자동 백업 메커니즘

### Step 4: 테스트 및 검증
- 스테이징 환경에서 테스트
- 프로덕션 배포
- 모니터링 설정

## 예상 소요 시간
- **Phase 1**: 30분 (EC2 인스턴스 생성 및 초기 설정)
- **Phase 2**: 1-2시간 (배포 스크립트 작성 및 테스트)
- **Phase 3**: 1시간 (GitHub Actions 개선)
- **Phase 4**: 30분 (문서화)
- **총 소요 시간**: 약 3-4시간

## 우선순위
1. **높음**: 환경 변수 관리 개선 (DATABASE_URL 문제 해결)
2. **높음**: PM2 설정 자동화 (ecosystem.config.js 자동 생성)
3. **중간**: 배포 스크립트 통합
4. **중간**: 배포 후 검증 자동화
5. **낮음**: 모니터링 설정

## 다음 단계
1. 새로운 EC2 인스턴스 생성
2. 초기 설정 스크립트 실행
3. 개선된 배포 스크립트 작성
4. GitHub Actions 워크플로우 업데이트
5. 테스트 배포 실행

