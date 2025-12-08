#!/bin/bash
# Status: MAINTENANCE
# Purpose: Cursor 서버 파일을 두 디렉토리 간 동기화
# Usage: ./deploy/sync-cursor-server-files.sh
# 이 스크립트는 cron으로 실행하거나 Cursor 연결 전에 실행

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# SSH 키 파일 자동 찾기
if [ -f "keys/iamvet-key-new.pem" ]; then
    KEY_FILE="keys/iamvet-key-new.pem"
elif [ -f "keys/iamvet-key.pem" ]; then
    KEY_FILE="keys/iamvet-key.pem"
else
    echo "❌ SSH 키 파일을 찾을 수 없습니다."
    exit 1
fi

# 연결 정보 파일에서 IP 확인
if [ -f "keys/deployment-info.txt" ]; then
    PUBLIC_IP=$(grep "Public IP:" keys/deployment-info.txt | awk '{print $3}' | head -1)
elif [ -f "keys/connection-info.txt" ]; then
    PUBLIC_IP=$(grep "Public IP:" keys/connection-info.txt | awk '{print $3}' | head -1)
else
    PUBLIC_IP="3.38.238.205"
fi

EC2_USER="ubuntu"

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ${EC2_USER}@${PUBLIC_IP} << 'ENDSSH'
# 홈 디렉토리에서 임시 디렉토리로 파일 복사
if [ -d ~/.cursor-server ] && [ "$(ls -A ~/.cursor-server 2>/dev/null)" ]; then
    # 임시 디렉토리 확인 및 생성
    sudo mkdir -p /tmp/.cursor-server
    sudo chown ubuntu:ubuntu /tmp/.cursor-server
    sudo chmod 755 /tmp/.cursor-server
    
    # 파일 복사
    for file in ~/.cursor-server/*; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            if [ ! -f "/tmp/.cursor-server/$filename" ]; then
                sudo cp "$file" /tmp/.cursor-server/
                sudo chown ubuntu:ubuntu "/tmp/.cursor-server/$filename"
                echo "✅ 복사됨: $filename"
            fi
        fi
    done
fi
ENDSSH

