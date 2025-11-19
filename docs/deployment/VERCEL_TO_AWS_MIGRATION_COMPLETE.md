# Vercel → AWS 전환 완료

이 프로젝트는 Vercel에서 AWS EC2로 완전히 전환되었습니다.

## ✅ 전환 완료 사항

1. **GitHub Actions 자동 배포 설정**
   - `.github/workflows/deploy-aws.yml` 생성
   - `main` 브랜치 푸시 시 자동 배포

2. **Vercel 설정 제거**
   - `vercel.json` 파일 삭제
   - Vercel 배포 비활성화

3. **배포 문서 업데이트**
   - `docs/deployment/AWS_DEPLOYMENT.md` 생성
   - 자동/수동 배포 가이드 포함

4. **README 업데이트**
   - 배포 섹션에 AWS EC2 정보 추가

## 🚀 다음 단계

### 1. GitHub Secrets 설정

GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 Secrets를 추가하세요:

1. **EC2_HOST**
   - 값: `3.38.238.205` (EC2 인스턴스 Public IP)

2. **EC2_SSH_PRIVATE_KEY**
   - 값: `deploy/keys/iamvet-key-new.pem` 파일의 전체 내용
   - 파일을 열어서 전체 내용을 복사하여 추가

### 2. Vercel 배포 중지 (선택사항)

Vercel 대시보드에서:
1. 프로젝트 설정 접속
2. Settings > General > Delete Project
3. 또는 도메인 연결 해제

### 3. 첫 배포 테스트

```bash
# main 브랜치에 푸시하면 자동 배포됩니다
git push origin main

# 또는 GitHub Actions에서 수동 실행
# Actions 탭 > Deploy to AWS EC2 > Run workflow
```

## 📝 참고

- 자동 배포는 `main` 브랜치에만 적용됩니다
- 배포 상태는 GitHub Actions 탭에서 확인할 수 있습니다
- 배포 실패 시 로그를 확인하여 문제를 해결하세요

## 🔗 관련 문서

- [AWS 배포 가이드](AWS_DEPLOYMENT.md)
- [EC2 인스턴스 설정 가이드](../deployment/EC2-INSTANCE-SETUP-GUIDE.md)
- [수동 배포 가이드](../deployment/MANUAL_DEPLOYMENT_GUIDE.md)

