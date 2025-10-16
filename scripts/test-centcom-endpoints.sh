#!/bin/bash

# Test script for Centcom missing endpoints
# Run this after implementing the endpoints to verify they work correctly

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3594}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Centcom Endpoints Verification Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  No AUTH_TOKEN environment variable set${NC}"
  echo -e "${YELLOW}Please set it with a valid Centcom user token:${NC}"
  echo -e "${YELLOW}  export AUTH_TOKEN='eyJhbGci...'${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}API Base URL: ${API_BASE_URL}${NC}"
echo ""

# Test counter
PASSED=0
FAILED=0

# Function to test an endpoint
test_endpoint() {
  local METHOD=$1
  local ENDPOINT=$2
  local DATA=$3
  local DESCRIPTION=$4

  echo -e "${BLUE}Testing: ${DESCRIPTION}${NC}"
  echo -e "  ${METHOD} ${ENDPOINT}"

  if [ "$METHOD" = "GET" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X GET \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      "${API_BASE_URL}${ENDPOINT}")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X POST \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${DATA}" \
      "${API_BASE_URL}${ENDPOINT}")
  fi

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "  ${GREEN}✅ PASSED (HTTP ${HTTP_CODE})${NC}"
    echo -e "  Response: ${BODY}" | head -c 200
    echo ""
    ((PASSED++))
  else
    echo -e "  ${RED}❌ FAILED (HTTP ${HTTP_CODE})${NC}"
    echo -e "  Response: ${BODY}"
    echo ""
    ((FAILED++))
  fi
  echo ""
}

# Test 1: CORS Preflight
echo -e "${BLUE}Test 1: CORS Preflight (OPTIONS)${NC}"
CORS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X OPTIONS \
  -H "Origin: http://localhost:3003" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  "${API_BASE_URL}/api/centcom/auth/session-update")

CORS_CODE=$(echo "$CORS_RESPONSE" | tail -n1)
CORS_HEADERS=$(echo "$CORS_RESPONSE" | head -n-1)

if [ "$CORS_CODE" = "200" ]; then
  echo -e "${GREEN}✅ CORS Preflight PASSED${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ CORS Preflight FAILED (HTTP ${CORS_CODE})${NC}"
  ((FAILED++))
fi
echo ""

# Test 2: Session Update
test_endpoint \
  "POST" \
  "/api/centcom/auth/session-update" \
  '{
    "version": "1.0.0",
    "instance_id": "test-123",
    "user_agent": "CentCom/1.0.0",
    "platform": "Windows",
    "build": "2024.12.001",
    "session_id": "test-session-'$(date +%s)'",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
  }' \
  "Session Update Endpoint"

# Test 3: Admin Session Update
test_endpoint \
  "POST" \
  "/api/admin/sessions/update" \
  '{
    "version": "1.0.0",
    "instance_id": "test-admin-123",
    "user_agent": "CentCom/1.0.0",
    "platform": "Windows",
    "build": "2024.12.001",
    "session_id": "test-admin-session-'$(date +%s)'",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
  }' \
  "Admin Session Update Endpoint"

# Test 4: Session Sync (Simple)
# Note: You need to get the user_id first - this is a placeholder
USER_ID="REPLACE_WITH_ACTUAL_USER_ID"

test_endpoint \
  "POST" \
  "/api/centcom/sessions/sync" \
  '{
    "session_id": "test-sync-'$(date +%s)'",
    "user_id": "'${USER_ID}'",
    "status": "active",
    "last_activity": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
    "platform": "Windows",
    "version": "1.0.0"
  }' \
  "Session Sync Endpoint (Simple Format)"

# Test 5: Dashboard Stats
test_endpoint \
  "GET" \
  "/api/user/dashboard/stats" \
  "" \
  "Dashboard Stats Endpoint"

# Test 6: Onboarding Sessions
test_endpoint \
  "GET" \
  "/api/user/onboarding/sessions" \
  "" \
  "Onboarding Sessions Endpoint"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed. Check the output above.${NC}"
  exit 1
fi
