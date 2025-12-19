#!/bin/bash

# Quick uptime check script
# Checks site health and response time

SITE_URL="https://rewriteme.app"

echo "🔍 Checking $SITE_URL"
echo ""

# Check HTTP status
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$SITE_URL")
RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" "$SITE_URL")

echo "HTTP Status: $HTTP_STATUS"
echo "Response Time: ${RESPONSE_TIME}s"

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Site is UP"

  # Check if React app loaded
  CONTENT=$(curl -s "$SITE_URL")

  if echo "$CONTENT" | grep -q "root"; then
    echo "✅ HTML structure present"
  else
    echo "⚠️  Warning: Root element not found"
  fi

  if echo "$CONTENT" | grep -q "vendor-react"; then
    echo "✅ React bundle referenced"
  else
    echo "⚠️  Warning: React bundle not found"
  fi

  exit 0
else
  echo "❌ Site is DOWN (HTTP $HTTP_STATUS)"
  exit 1
fi
