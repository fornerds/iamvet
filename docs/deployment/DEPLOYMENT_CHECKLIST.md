# 배포 체크리스트

## 새로운 EC2 인스턴스 배포 전 체크리스트

### Phase 1: EC2 인스턴스 준비

- [ ] EC2 인스턴스 생성 (t3.large, Ubuntu 22.04)
- [ ] Elastic IP 할당 및 연결
- [ ] 보안 그룹 설정 (SSH, HTTP, HTTPS, 포트 3000)
- [ ] 도메인 A 레코드 설정 (iam-vet.com → Elastic IP)
- [ ] SSH 키 페어 생성 및 다운로드
- [ ] `deploy/keys/` 디렉토리에 SSH 키 저장

### Phase 2: 서버 초기 설정

- [ ] 서버 접속 테스트
- [ ] `deploy/setup-server.sh` 실행
- [ ] Node.js 20 설치 확인 (`node --version`)
- [ ] PM2 설치 확인 (`pm2 --version`)
- [ ] Nginx 설치 확인 (`nginx -v`)
- [ ] Git 설정 확인

### Phase 3: GitHub Secrets 설정

- [ ] `EC2_HOST`: 새 EC2 인스턴스 IP 또는 도메인
- [ ] `EC2_SSH_PRIVATE_KEY`: 새 SSH 개인 키 내용
- [ ] `DATABASE_URL`: 데이터베이스 연결 문자열 (URL 디코딩된 값)
- [ ] `JWT_SECRET`: JWT 시크릿 키
- [ ] `ADMIN_JWT_SECRET`: 관리자 JWT 시크릿 키
- [ ] AWS 관련 Secrets (ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION, S3_BUCKET_NAME)
- [ ] OAuth 관련 Secrets (GOOGLE, KAKAO, NAVER)
- [ ] 기타 필수 환경 변수들

### Phase 4: 배포 실행

- [ ] GitHub Actions 워크플로우 실행 또는 `deploy/deploy.sh` 실행
- [ ] 배포 로그 확인
- [ ] `.env.production` 파일 생성 확인
- [ ] `ecosystem.config.js` 파일 생성 확인
- [ ] PM2 프로세스 시작 확인

### Phase 5: 배포 검증

- [ ] `deploy/verify.sh` 실행
- [ ] PM2 상태 확인 (`pm2 status`)
- [ ] 포트 3000 응답 확인 (`curl http://localhost:3000`)
- [ ] API 응답 확인 (`curl http://localhost:3000/api/jobs?limit=5`)
- [ ] 외부 접근 확인 (`curl https://iam-vet.com`)
- [ ] 로그 확인 (`pm2 logs iamvet`)

### Phase 6: Nginx 설정

- [ ] Nginx 설정 파일 생성 (`/etc/nginx/sites-available/iamvet`)
- [ ] SSL 인증서 설정 (Let's Encrypt)
- [ ] Nginx 설정 테스트 (`sudo nginx -t`)
- [ ] Nginx 재시작 (`sudo systemctl restart nginx`)
- [ ] HTTPS 접근 확인

### Phase 7: 모니터링 설정

- [ ] PM2 모니터링 설정 (`pm2 monit`)
- [ ] 로그 로테이션 설정
- [ ] 알림 설정 (선택사항)
- [ ] 백업 스크립트 설정

## 문제 해결 체크리스트

### DATABASE_URL 문제
- [ ] `.env.production` 파일에 DATABASE_URL이 설정되어 있는지 확인
- [ ] `ecosystem.config.js`가 환경 변수를 올바르게 로드하는지 확인
- [ ] PM2 환경 변수 확인 (`pm2 env 0`)
- [ ] PM2 재시작 후 환경 변수 로드 확인

### PM2 문제
- [ ] PM2가 설치되어 있는지 확인 (`pm2 --version`)
- [ ] `ecosystem.config.js` 파일이 존재하는지 확인
- [ ] PM2 로그 확인 (`pm2 logs iamvet`)
- [ ] PM2 완전 재시작 (`pm2 delete all && pm2 kill && pm2 start ecosystem.config.js`)

### 빌드 문제
- [ ] 메모리 확인 (`free -h`)
- [ ] 디스크 공간 확인 (`df -h`)
- [ ] Node.js 버전 확인 (`node --version`)
- [ ] 빌드 로그 확인

### API 500 에러
- [ ] 서버 로그 확인 (`pm2 logs iamvet`)
- [ ] 데이터베이스 연결 확인
- [ ] 환경 변수 확인
- [ ] API 라우트 코드 확인

## 정기 점검 사항

### 일일 점검
- [ ] PM2 상태 확인
- [ ] 서버 응답 확인
- [ ] 에러 로그 확인

### 주간 점검
- [ ] 디스크 사용량 확인
- [ ] 메모리 사용량 확인
- [ ] 보안 업데이트 확인
- [ ] 백업 상태 확인

### 월간 점검
- [ ] 로그 정리
- [ ] 성능 분석
- [ ] 보안 감사
- [ ] 비용 분석

