#!/bin/bash
# Status: ACTIVE
# Purpose: AWS SNS 알림 시스템 설정 (초기 설정용, 한 번만 실행)
# Usage: ./deploy/setup-sns-alerts.sh

# AWS SNS 알림 시스템 설정
# 서버 문제 발생 시 이메일/SMS 알림

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo "❌ 설정 파일(config.sh)을 찾을 수 없습니다."
    exit 1
fi

echo "=========================================="
echo "AWS SNS 알림 시스템 설정"
echo "=========================================="
echo ""

# 이메일 주소 입력
read -p "알림을 받을 이메일 주소를 입력하세요: " EMAIL

if [ -z "$EMAIL" ]; then
    echo "❌ 이메일 주소가 필요합니다."
    exit 1
fi

echo ""
echo "SNS 토픽 및 알림 설정 중..."

# SNS 토픽 생성
TOPIC_ARN=$(aws sns create-topic --name iamvet-alerts --region $AWS_REGION --query 'TopicArn' --output text 2>/dev/null || \
    aws sns list-topics --region $AWS_REGION --query "Topics[?contains(TopicArn, 'iamvet-alerts')].TopicArn" --output text | head -1)

if [ -z "$TOPIC_ARN" ]; then
    echo "❌ SNS 토픽 생성 실패"
    exit 1
fi

echo "✅ SNS 토픽 생성: $TOPIC_ARN"

# 이메일 구독
aws sns subscribe \
    --topic-arn $TOPIC_ARN \
    --protocol email \
    --notification-endpoint $EMAIL \
    --region $AWS_REGION

echo "✅ 이메일 구독 완료: $EMAIL"
echo ""
echo "⚠️  이메일에서 확인 링크를 클릭하여 구독을 활성화하세요!"
echo ""

# CloudWatch 알람 생성 스크립트 생성
cat > /tmp/create-cloudwatch-alarms.sh << EOF
#!/bin/bash

# CloudWatch 알람 생성
TOPIC_ARN="$TOPIC_ARN"
INSTANCE_ID=\$(aws ec2 describe-instances \
    --filters "Name=ip-address,Values=3.38.238.205" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text \
    --region $AWS_REGION)

echo "인스턴스 ID: \$INSTANCE_ID"

# 1. CPU 사용률 알람
aws cloudwatch put-metric-alarm \
    --alarm-name iamvet-high-cpu \
    --alarm-description "CPU 사용률이 80%를 초과할 때 알림" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions \$TOPIC_ARN \
    --dimensions Name=InstanceId,Value=\$INSTANCE_ID \
    --region $AWS_REGION

# 2. 메모리 사용률 알람 (CloudWatch Agent 메트릭)
aws cloudwatch put-metric-alarm \
    --alarm-name iamvet-high-memory \
    --alarm-description "메모리 사용률이 85%를 초과할 때 알림" \
    --metric-name MEM_USED_PERCENT \
    --namespace IAMVET/Server \
    --statistic Average \
    --period 300 \
    --threshold 85 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions \$TOPIC_ARN \
    --region $AWS_REGION

# 3. 인스턴스 상태 체크 실패 알람
aws cloudwatch put-metric-alarm \
    --alarm-name iamvet-instance-status-check-failed \
    --alarm-description "인스턴스 상태 체크 실패 시 알림" \
    --metric-name StatusCheckFailed \
    --namespace AWS/EC2 \
    --statistic Maximum \
    --period 60 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 1 \
    --alarm-actions \$TOPIC_ARN \
    --dimensions Name=InstanceId,Value=\$INSTANCE_ID \
    --region $AWS_REGION

# 4. 디스크 사용률 알람
aws cloudwatch put-metric-alarm \
    --alarm-name iamvet-high-disk \
    --alarm-description "디스크 사용률이 90%를 초과할 때 알림" \
    --metric-name DISK_USED_PERCENT \
    --namespace IAMVET/Server \
    --statistic Average \
    --period 300 \
    --threshold 90 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions \$TOPIC_ARN \
    --region $AWS_REGION

echo "✅ CloudWatch 알람 생성 완료"
EOF

chmod +x /tmp/create-cloudwatch-alarms.sh

echo "CloudWatch 알람을 생성하시겠습니까? (y/n)"
read -p "> " CREATE_ALARMS

if [ "$CREATE_ALARMS" = "y" ] || [ "$CREATE_ALARMS" = "Y" ]; then
    /tmp/create-cloudwatch-alarms.sh
    echo ""
    echo "✅ 알람 생성 완료"
else
    echo "나중에 다음 명령어로 알람을 생성할 수 있습니다:"
    echo "  /tmp/create-cloudwatch-alarms.sh"
fi

echo ""
echo "=========================================="
echo "✅ SNS 알림 시스템 설정 완료"
echo "=========================================="
echo ""
echo "설정된 알림:"
echo "  - 이메일: $EMAIL"
echo "  - SNS 토픽: $TOPIC_ARN"
echo ""
echo "AWS 콘솔에서 확인:"
echo "  - SNS: https://console.aws.amazon.com/sns/v3/home?region=$AWS_REGION#/topics"
echo "  - CloudWatch 알람: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#alarmsV2:"

