#!/bin/bash
# Status: ACTIVE
# Purpose: AWS CloudWatch 모니터링 설정 (초기 설정용, 한 번만 실행)
# Usage: ./deploy/setup-cloudwatch-monitoring.sh

# AWS CloudWatch 모니터링 설정 스크립트
# 서버가 다운되어도 AWS 콘솔에서 확인 가능

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
DOMAIN="iam-vet.com"

echo "=========================================="
echo "AWS CloudWatch 모니터링 설정"
echo "=========================================="
echo ""

# 1. CloudWatch Agent 설치 및 설정
echo "=== CloudWatch Agent 설정 ==="
ssh -i $KEY_FILE ubuntu@$PUBLIC_IP << 'EOF'
set -e

# CloudWatch Agent 설치
if ! command -v amazon-cloudwatch-agent &> /dev/null; then
    echo "CloudWatch Agent 설치 중..."
    wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
    sudo dpkg -i -E ./amazoncloudwatch-agent.deb
    rm ./amazoncloudwatch-agent.deb
    echo "✅ CloudWatch Agent 설치 완료"
else
    echo "✅ CloudWatch Agent 이미 설치됨"
fi

# CloudWatch Agent 설정 파일 생성
sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null << 'CONFIGEOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/iamvet/logs/pm2-error.log",
            "log_group_name": "/aws/ec2/iamvet/pm2-error",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          },
          {
            "file_path": "/home/ubuntu/iamvet/logs/pm2-out.log",
            "log_group_name": "/aws/ec2/iamvet/pm2-out",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          },
          {
            "file_path": "/home/ubuntu/iamvet/logs/health-check.log",
            "log_group_name": "/aws/ec2/iamvet/health-check",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/aws/ec2/iamvet/nginx-error",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "/aws/ec2/iamvet/nginx-access",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "IAMVET/Server",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_USAGE_IDLE",
            "unit": "Percent"
          },
          {
            "name": "cpu_usage_iowait",
            "rename": "CPU_USAGE_IOWAIT",
            "unit": "Percent"
          },
          {
            "name": "cpu_usage_user",
            "rename": "CPU_USAGE_USER",
            "unit": "Percent"
          },
          {
            "name": "cpu_usage_system",
            "rename": "CPU_USAGE_SYSTEM",
            "unit": "Percent"
          }
        ],
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED_PERCENT",
            "unit": "Percent"
          }
        ],
        "resources": [
          "*"
        ]
      },
      "diskio": {
        "measurement": [
          {
            "name": "io_time"
          }
        ],
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED_PERCENT",
            "unit": "Percent"
          }
        ]
      },
      "netstat": {
        "measurement": [
          {
            "name": "tcp_established",
            "rename": "TCP_ESTABLISHED",
            "unit": "Count"
          },
          {
            "name": "tcp_time_wait",
            "rename": "TCP_TIME_WAIT",
            "unit": "Count"
          }
        ]
      },
      "processes": {
        "measurement": [
          {
            "name": "running",
            "rename": "PROCESSES_RUNNING",
            "unit": "Count"
          },
          {
            "name": "sleeping",
            "rename": "PROCESSES_SLEEPING",
            "unit": "Count"
          }
        ]
      }
    }
  }
}
CONFIGEOF

# CloudWatch Agent 시작
sudo systemctl enable amazon-cloudwatch-agent
sudo systemctl restart amazon-cloudwatch-agent

echo "✅ CloudWatch Agent 설정 완료"
echo ""
echo "CloudWatch 로그 그룹:"
echo "  - /aws/ec2/iamvet/pm2-error"
echo "  - /aws/ec2/iamvet/pm2-out"
echo "  - /aws/ec2/iamvet/health-check"
echo "  - /aws/ec2/iamvet/nginx-error"
echo "  - /aws/ec2/iamvet/nginx-access"
echo ""
echo "CloudWatch 메트릭 네임스페이스: IAMVET/Server"
EOF

echo ""
echo "✅ CloudWatch 모니터링 설정 완료"
echo ""
echo "AWS 콘솔에서 확인:"
echo "  - 로그: https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-2#logsV2:log-groups"
echo "  - 메트릭: https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-2#metricsV2"

