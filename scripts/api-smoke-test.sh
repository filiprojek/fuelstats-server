#!/usr/bin/env bash
# Expanded smoke-test script for FuelStats API
# Requires: bash, curl, jq
#
# Usage:
#   chmod +x scripts/api-smoke-test.sh
#   ./scripts/api-smoke-test.sh [BASE_URL]
#
# If BASE_URL is not provided, defaults to https://api.fuelstats.example.com

set -euo pipefail

BASE_URL="${1:-https://api.fuelstats.example.com}"
EMAIL="qa+$(date +%s)@example.com"
PASSWORD="TestPass123!"
USERNAME="QA User"

echo "▶️  Base URL: $BASE_URL"
echo

# Helper to parse curl response
request() {
  local method=$1 url=$2 data=$3 token=$4
  local headers=(-H "Content-Type: application/json")
  [[ -n "$token" ]] && headers+=(-H "Authorization: Bearer $token")
  local resp
  resp=$(curl -s -w "\n%{http_code}" -X "$method" "$url" "${headers[@]}" ${data:+-d "$data"})
  echo "$resp"
}

# 1) Sign up a new user
echo "1) Signing up user $EMAIL …"
resp=$(request POST "$BASE_URL/api/v1/auth/signup" \
  "$(jq -n --arg email "$EMAIL" --arg password "$PASSWORD" --arg username "$USERNAME" \
    '{email: $email, password: $password, username: $username}')" "")
body=$(echo "$resp" | sed '$d'); status=$(echo "$resp" | tail -n1)
echo "→ HTTP $status"; echo "$body" | jq .; echo

# 2) Signing up same user again → expect 409
echo "2) Signing up same user (should 409)…"
resp=$(request POST "$BASE_URL/api/v1/auth/signup" \
  "$(jq -n --arg email "$EMAIL" --arg password "$PASSWORD" --arg username "$USERNAME" \
    '{email: $email, password: $password, username: $username}')" "")
body=$(echo "$resp" | sed '$d'); status=$(echo "$resp" | tail -n1)
echo "→ HTTP $status"; echo "$body" | jq .; echo

# 3) Sign in with correct credentials
echo "3) Signing in user $EMAIL …"
resp=$(request POST "$BASE_URL/api/v1/auth/signin" \
  "$(jq -n --arg email "$EMAIL" --arg password "$PASSWORD" \
    '{email: $email, password: $password}')" "")
body=$(echo "$resp" | sed '$d'); status=$(echo "$resp" | tail -n1)
echo "→ HTTP $status"; echo "$body" | jq .; echo
TOKEN=$(echo "$body" | jq -r '.token // .data.token // empty')
if [[ -z "$TOKEN" ]]; then
  echo "❌ Failed to obtain JWT; aborting."; exit 1
fi
echo "✅ Token acquired: ${TOKEN:0:20}…"
echo

# 4) Sign in with wrong password → expect 401
echo "4) Signing in with wrong password …"
resp=$(request POST "$BASE_URL/api/v1/auth/signin" \
  "$(jq -n --arg email "$EMAIL" --arg password "WrongPass" \
    '{email: $email, password: $password}')" "")
body=$(echo "$resp" | sed '$d'); status=$(echo "$resp" | tail -n1)
echo "→ HTTP $status"; echo "$body" | jq .; echo

# 5) Fetch /user/me without token → expect 401
echo "5) Fetching /user/me without token …"
resp=$(request GET "$BASE_URL/api/v1/user/me" "" "")
body=$(echo "$resp" | sed '$d'); status=$(echo "$resp" | tail -n1)
echo "→ HTTP $status"; echo "$body" | jq .; echo

# 6) Fetch /user/me with invalid token → expect 401
echo "6) Fetching /user/me with invalid token …"
resp=$(request GET "$BASE_URL/api/v1/user/me" "" "invalid.token.here")
body=$(echo "$resp" | sed '$d'); status=$(echo "$resp" | tail -n1)
echo "→ HTTP $status"; echo "$body" | jq .; echo

# 7) Fetch /user/me with valid token
echo "7) Fetching /user/me with valid token …"
resp=$(request GET "$BASE_URL/api/v1/user/me" "" "$TOKEN")
body=$(echo "$resp" | sed '$d'); status=$(echo "$resp" | tail -n1)
echo "→ HTTP $status"; echo "$body" | jq .; echo

# 8) Create vehicle without token → expect 401
echo "8) Creating vehicle without token …"
resp=$(request POST "$BASE_URL/api/v1/vehicles" \
  "$(jq -n \
    --arg name "Test Car" \
    --arg plate "XYZ-123" \
    --arg fuel "diesel" \
    --arg note "smoke test" \
    '{name: $name, registrationPlate: $plate, fuelType: $fuel, note: $note, isDefault: false}')" \
  "")
body=$(echo "$resp" | sed '$d'); status=$(echo "$resp" | tail -n1)
echo "→ HTTP $status"; echo "$body" | jq .; echo

# 9) Create vehicle with valid token → expect 201
echo "9) Creating vehicle with valid token …"
resp=$(request POST "$BASE_URL/api/v1/vehicles" \
  "$(jq -n \
    --arg name "Test Car" \
    --arg plate "XYZ-123" \
    --arg fuel "diesel" \
    --arg note "smoke test" \
    '{name: $name, registrationPlate: $plate, fuelType: $fuel, note: $note, isDefault: false}')" \
  "$TOKEN")
body=$(echo "$resp" | sed '$d'); status=$(echo "$resp" | tail -n1)
echo "→ HTTP $status"; echo "$body" | jq .; echo

echo "🎉 All checks completed."

