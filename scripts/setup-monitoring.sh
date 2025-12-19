#!/bin/bash

# UptimeRobot Monitor Setup Script
# Requires: UPTIMEROBOT_API_KEY environment variable

set -e

MONITOR_URL="https://rewriteme.app"
MONITOR_NAME="RewriteMe Production"
ALERT_EMAIL="${ALERT_EMAIL:-your-email@example.com}"

if [ -z "$UPTIMEROBOT_API_KEY" ]; then
  echo "Error: UPTIMEROBOT_API_KEY environment variable not set"
  echo ""
  echo "Get your API key from: https://uptimerobot.com/dashboard#mySettings"
  echo "Then run: export UPTIMEROBOT_API_KEY='your-api-key-here'"
  exit 1
fi

echo "🔍 Setting up UptimeRobot monitor for $MONITOR_URL"

# Create HTTP(S) monitor
RESPONSE=$(curl -s -X POST https://api.uptimerobot.com/v2/newMonitor \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_key=$UPTIMEROBOT_API_KEY" \
  -d "format=json" \
  -d "type=1" \
  -d "url=$MONITOR_URL" \
  -d "friendly_name=$MONITOR_NAME" \
  -d "interval=300" \
  -d "timeout=30" \
  -d "http_method=1")

echo "$RESPONSE" | grep -q '"stat":"ok"'

if [ $? -eq 0 ]; then
  MONITOR_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
  echo "✅ Monitor created successfully! ID: $MONITOR_ID"
  echo ""
  echo "📊 View monitor at: https://uptimerobot.com/dashboard#$MONITOR_ID"
  echo ""
  echo "⚙️  Next steps:"
  echo "1. Add alert contacts in UptimeRobot dashboard"
  echo "2. Configure notification preferences"
  echo "3. Create a public status page (optional)"
else
  echo "❌ Failed to create monitor:"
  echo "$RESPONSE"
  exit 1
fi
