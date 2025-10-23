#!/bin/bash

# Lyceum Backend Fix Verification Script
# Purpose: Test that JWT authentication now accepts Lyceum tokens
# Date: 2025-10-20

echo "=========================================="
echo "Lyceum Backend Authentication Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="https://lyceum-sable.vercel.app"

# Check if credentials are provided
if [ -z "$TEST_EMAIL" ] || [ -z "$TEST_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  Please set credentials:${NC}"
    echo "export TEST_EMAIL=\"admin@lyceum-analytics.com\""
    echo "export TEST_PASSWORD=\"your-password\""
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "Using credentials:"
echo "Email: $TEST_EMAIL"
echo ""

# Step 1: Test Health Endpoint
echo "----------------------------------------"
echo "Step 1: Testing Health Endpoint (no auth)"
echo "----------------------------------------"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/centcom/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

echo "HTTP Status: $HEALTH_CODE"
echo "Response: $HEALTH_BODY" | jq '.' 2>/dev/null || echo "$HEALTH_BODY"
echo ""

if [ "$HEALTH_CODE" == "200" ] || [ "$HEALTH_CODE" == "503" ]; then
    echo -e "${GREEN}✅ Health endpoint responding${NC}"
else
    echo -e "${RED}❌ Health endpoint not responding${NC}"
fi
echo ""

# Step 2: Test Authentication
echo "----------------------------------------"
echo "Step 2: Testing Authentication Endpoint"
echo "----------------------------------------"
echo ""

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/centcom/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"client_info\": {
      \"version\": \"1.0.0\",
      \"platform\": \"Windows\",
      \"device_name\": \"TEST-MACHINE\",
      \"license_type\": \"enterprise\"
    }
  }")

LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)

echo "HTTP Status: $LOGIN_CODE"
echo ""

if [ "$LOGIN_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Authentication successful!${NC}"
    echo ""
    echo "Response:"
    echo "$LOGIN_BODY" | jq '.' 2>/dev/null || echo "$LOGIN_BODY"
    echo ""

    # Extract access token
    ACCESS_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.session.access_token' 2>/dev/null)

    if [ ! -z "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
        echo -e "${GREEN}✅ Received access_token${NC}"
        echo "Token (first 50 chars): ${ACCESS_TOKEN:0:50}..."
        echo ""

        # Decode and show token payload
        TOKEN_PAYLOAD=$(echo "$ACCESS_TOKEN" | cut -d '.' -f 2)
        # Add padding if needed
        while [ $((${#TOKEN_PAYLOAD} % 4)) -ne 0 ]; do
            TOKEN_PAYLOAD="${TOKEN_PAYLOAD}="
        done

        echo "Token Payload:"
        echo "$TOKEN_PAYLOAD" | base64 -d 2>/dev/null | jq '.' || echo "Could not decode"
        echo ""

        # Step 3: Test Cluster Discovery
        echo "----------------------------------------"
        echo "Step 3: Testing Cluster Discovery (THE FIX)"
        echo "----------------------------------------"
        echo ""
        echo "This should now return 200 (was 401 before fix)"
        echo ""

        CLUSTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/centcom/clusters/discover" \
          -H "Authorization: Bearer $ACCESS_TOKEN")

        CLUSTER_CODE=$(echo "$CLUSTER_RESPONSE" | tail -n 1)
        CLUSTER_BODY=$(echo "$CLUSTER_RESPONSE" | head -n -1)

        echo "HTTP Status: $CLUSTER_CODE"
        echo ""

        if [ "$CLUSTER_CODE" == "200" ]; then
            echo -e "${GREEN}✅✅✅ CLUSTER DISCOVERY WORKS! (FIX VERIFIED)${NC}"
            echo ""
            echo "Response:"
            echo "$CLUSTER_BODY" | jq '.' 2>/dev/null || echo "$CLUSTER_BODY"
        elif [ "$CLUSTER_CODE" == "401" ]; then
            echo -e "${RED}❌ Still getting 401 - Fix may not be deployed yet${NC}"
            echo "Response:"
            echo "$CLUSTER_BODY" | jq '.' 2>/dev/null || echo "$CLUSTER_BODY"
        else
            echo -e "${YELLOW}⚠️  Unexpected status: $CLUSTER_CODE${NC}"
            echo "Response:"
            echo "$CLUSTER_BODY" | jq '.' 2>/dev/null || echo "$CLUSTER_BODY"
        fi
        echo ""

        # Step 4: Test Usage Sync
        echo "----------------------------------------"
        echo "Step 4: Testing Usage Sync Endpoint"
        echo "----------------------------------------"
        echo ""

        USAGE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/centcom/usage/sync" \
          -H "Authorization: Bearer $ACCESS_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{
            "machine_fingerprint": "test-machine-123",
            "storage_used_gb": 5,
            "queries_this_month": 1000,
            "clickhouse_version": "23.3",
            "machine_info": {
              "os": "Windows",
              "memory_gb": 16,
              "cpu_cores": 8
            }
          }')

        USAGE_CODE=$(echo "$USAGE_RESPONSE" | tail -n 1)
        USAGE_BODY=$(echo "$USAGE_RESPONSE" | head -n -1)

        echo "HTTP Status: $USAGE_CODE"
        echo ""

        if [ "$USAGE_CODE" == "200" ]; then
            echo -e "${GREEN}✅ Usage sync works!${NC}"
            echo ""
            echo "Response:"
            echo "$USAGE_BODY" | jq '.' 2>/dev/null || echo "$USAGE_BODY"
        elif [ "$USAGE_CODE" == "401" ]; then
            echo -e "${RED}❌ Still getting 401${NC}"
            echo "Response:"
            echo "$USAGE_BODY" | jq '.' 2>/dev/null || echo "$USAGE_BODY"
        else
            echo -e "${YELLOW}⚠️  Unexpected status: $USAGE_CODE${NC}"
            echo "Response:"
            echo "$USAGE_BODY" | jq '.' 2>/dev/null || echo "$USAGE_BODY"
        fi
        echo ""

    else
        echo -e "${RED}❌ No access_token in response${NC}"
    fi

else
    echo -e "${RED}❌ Authentication failed${NC}"
    echo "Response:"
    echo "$LOGIN_BODY" | jq '.' 2>/dev/null || echo "$LOGIN_BODY"
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
