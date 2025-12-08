#!/bin/bash
# Status: ACTIVE
# Purpose: AWS Systems Manager 자동 복구 설정 (초기 설정용, 한 번만 실행)
# Usage: ./deploy/setup-ssm-automatic-recovery.sh

# AWS Systems Manager를 통한 자동 복구 설정
# 서버가 다운되어도 AWS에서 자동으로 복구 시도

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo "❌ 설정 파일(config.sh)을 찾을 수 없습니다."
    exit 1
fi

KEY_FILE="$SCRIPT_DIR/keys/$KEY_NAME.pem"
if [ ! -f "$KEY_FILE" ]; then
    KEY_FILE="$SCRIPT_DIR/$KEY_PATH/$KEY_NAME.pem"
fi

PUBLIC_IP="3.38.238.205"

echo "=========================================="
echo "AWS Systems Manager 자동 복구 설정"
echo "=========================================="
echo ""

# 1. SSM Agent 설치 확인 및 설치
echo "=== SSM Agent 설정 ==="
ssh -i $KEY_FILE ubuntu@$PUBLIC_IP << 'EOF'
set -e

# SSM Agent 설치 확인
if ! command -v amazon-ssm-agent &> /dev/null; then
    echo "SSM Agent 설치 중..."
    sudo snap install amazon-ssm-agent --classic
    sudo systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
    sudo systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service
    echo "✅ SSM Agent 설치 완료"
else
    echo "✅ SSM Agent 이미 설치됨"
    sudo systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
    sudo systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service
fi

# SSM Agent 상태 확인
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service --no-pager | head -5
EOF

echo ""
echo "=== 자동 복구 문서 생성 ==="

# SSM 자동 복구 문서 생성
cat > /tmp/iamvet-auto-recovery-document.json << 'DOCEOF'
{
  "schemaVersion": "2.2",
  "description": "IAMVET 서버 자동 복구 문서",
  "parameters": {},
  "mainSteps": [
    {
      "action": "aws:runShellScript",
      "name": "CheckServerStatus",
      "precondition": {
        "StringEquals": ["platformType", "Linux"]
      },
      "inputs": {
        "runCommand": [
          "#!/bin/bash",
          "export NVM_DIR=\"$HOME/.nvm\"",
          "[ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"",
          "cd /home/ubuntu/iamvet",
          "",
          "echo \"=== 서버 상태 확인 ===\"",
          "if curl -f http://localhost:3000 > /dev/null 2>&1; then",
          "  echo \"✅ 서버 정상 작동 중\"",
          "  exit 0",
          "fi",
          "",
          "echo \"❌ 서버 응답 없음, 복구 시도...\"",
          "",
          "# PM2 상태 확인",
          "if pm2 list | grep -q iamvet; then",
          "  echo \"PM2 프로세스 재시작 중...\"",
          "  pm2 restart iamvet",
          "  sleep 10",
          "  ",
          "  if curl -f http://localhost:3000 > /dev/null 2>&1; then",
          "    echo \"✅ PM2 재시작 후 서버 정상 작동\"",
          "    exit 0",
          "  fi",
          "else",
          "  echo \"PM2 프로세스 없음, 시작 중...\"",
          "  if [ -f ecosystem.config.js ]; then",
          "    pm2 start ecosystem.config.js",
          "    sleep 10",
          "    ",
          "    if curl -f http://localhost:3000 > /dev/null 2>&1; then",
          "      echo \"✅ PM2 시작 후 서버 정상 작동\"",
          "      exit 0",
          "    fi",
          "  fi",
          "fi",
          "",
          "echo \"❌ 자동 복구 실패, 수동 확인 필요\"",
          "exit 1"
        ]
      }
    }
  ]
}
DOCEOF

# SSM 문서 생성
aws ssm create-document \
    --name "IAMVET-AutoRecovery" \
    --document-type "Command" \
    --document-format "JSON" \
    --content file:///tmp/iamvet-auto-recovery-document.json \
    --region $AWS_REGION 2>/dev/null || \
aws ssm update-document \
    --name "IAMVET-AutoRecovery" \
    --content file:///tmp/iamvet-auto-recovery-document.json \
    --region $AWS_REGION

echo "✅ SSM 자동 복구 문서 생성 완료"
echo ""
echo "인스턴스 ID 확인 중..."

INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=ip-address,Values=$PUBLIC_IP" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text \
    --region $AWS_REGION)

if [ "$INSTANCE_ID" = "None" ] || [ -z "$INSTANCE_ID" ]; then
    echo "⚠️  인스턴스 ID를 찾을 수 없습니다. 수동으로 확인하세요."
    echo "   Public IP: $PUBLIC_IP"
else
    echo "✅ 인스턴스 ID: $INSTANCE_ID"
    echo ""
    echo "수동으로 자동 복구를 실행하려면:"
    echo "  aws ssm send-command \\"
    echo "    --instance-ids $INSTANCE_ID \\"
    echo "    --document-name \"IAMVET-AutoRecovery\" \\"
    echo "    --region $AWS_REGION"
fi

echo ""
echo "=========================================="
echo "✅ SSM 자동 복구 설정 완료"
echo "=========================================="
echo ""
echo "AWS 콘솔에서 확인:"
echo "  - SSM 문서: https://console.aws.amazon.com/systems-manager/documents?region=$AWS_REGION"
echo "  - SSM 실행: https://console.aws.amazon.com/systems-manager/run-command/executing-commands?region=$AWS_REGION"

