#!/usr/bin/env bash
# Manual sanity-check script for FuelStats production API
# Requires: bash, curl, jq
#
# Usage:
#   chmod +x test_prod.sh
#   ./test_prod.sh [BASE_URL]
#
# If BASE_URL is not provided, defaults to https://api.fuelstats.example.com

set -euo pipefail

# Base URL of your production API
BASE_URL="${1:-https://api.fuelstats.example.com}"

# Test user credentials (change for real tests)
EMAIL="qa+$(date +%s)@example.com"
PASSWORD="TestPass123!"
USERNAME="QA User"

echo "▶️  Base URL: $BASE_URL"
echo

# 1) Sign up a new user
echo "1) Signing up user $EMAIL …"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
      --arg email "$EMAIL" \
      --arg password "$PASSWORD" \
      --arg username "$USERNAME" \
      '{email: $email, password: $password, username: $username}')" )
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n1)

echo "→ HTTP $STATUS"
echo "$BODY" | jq .
echo

# 2) Sign in with the same user
echo "2) Signing in user $EMAIL …"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/signin" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
      --arg email "$EMAIL" \
      --arg password "$PASSWORD" \
      '{email: $email, password: $password}')" )
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n1)

echo "→ HTTP $STATUS"
echo "$BODY" | jq .

# Extract token
TOKEN=$(echo "$BODY" | jq -r '.token // .data.token // empty')
if [[ -z "$TOKEN" ]]; then
  echo "❌ Failed to obtain JWT token; aborting."
  exit 1
fi
echo "✅ Token acquired: ${TOKEN:0:20}…"
echo

# 3) Fetch the authenticated user's profile
echo "3) Fetching user profile with token …"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/v1/user/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n1)

echo "→ HTTP $STATUS"
echo "$BODY" | jq .
echo

echo "🎉 All checks completed."

