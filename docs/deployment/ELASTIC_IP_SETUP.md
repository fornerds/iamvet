# 탄력적 IP 설정 가이드

## 탄력적 IP 할당 및 연결

### Step 1: 탄력적 IP 할당

1. AWS 콘솔 → EC2 → Network & Security → Elastic IPs
2. "Allocate Elastic IP address" 클릭
3. 설정:
   - **Network border group**: 기본값 유지
   - **Public IPv4 address pool**: Amazon's pool
4. "Allocate" 클릭

### Step 2: 탄력적 IP 연결

1. 할당된 Elastic IP 선택
2. "Actions" → "Associate Elastic IP address"
3. 설정:
   - **Resource type**: Instance
   - **Instance**: `i-0a510fa440754cb0e` (새 인스턴스) 선택
   - **Private IP address**: 자동 선택
4. "Associate" 클릭

### Step 3: 기존 퍼블릭 IP 해제 (선택사항)

탄력적 IP를 연결하면 기존 퍼블릭 IP는 자동으로 해제됩니다.

## EC2 Instance Connect 오류 해결

**EC2 Instance Connect는 AWS 콘솔에서 직접 접속하는 기능**이며, SSH 키가 필요 없습니다. 하지만 권한 문제로 실패할 수 있습니다.

### 해결 방법: SSH 키를 사용한 직접 접속 (권장)

```bash
# 로컬 터미널에서
ssh -i deploy/keys/iam-vet.pem ubuntu@3.35.8.129
```

또는 탄력적 IP를 연결한 후:

```bash
ssh -i deploy/keys/iam-vet.pem ubuntu@<탄력적-IP-주소>
```

### EC2 Instance Connect 사용하려면

1. IAM 권한 확인:
   - `ec2-instance-connect:SendSSHPublicKey` 권한 필요
   - 인스턴스에 연결된 IAM 역할 확인

2. 보안 그룹 확인:
   - SSH (22) 포트가 열려있는지 확인

3. 대안: SSH 키 사용 (더 안전하고 권장)

## 도메인 연결

탄력적 IP를 할당한 후:

1. Route 53 또는 도메인 제공업체에서
2. A 레코드 설정:
   - **Name**: `iam-vet.com` (또는 `@`)
   - **Type**: A
   - **Value**: `<탄력적-IP-주소>`
   - **TTL**: 300

## 주의사항

- 탄력적 IP는 **인스턴스가 실행 중일 때만 무료**
- 인스턴스를 중지하면 탄력적 IP 요금이 발생할 수 있음
- 인스턴스를 종료하면 탄력적 IP가 해제됨

