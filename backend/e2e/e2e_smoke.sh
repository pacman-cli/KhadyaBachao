#!/usr/bin/env bash
# Khadya Bachao — live end-to-end smoke test (master prompt §32 scenarios A–H)
# Repeatable live smoke suite (59 checks). Usage:
#   1) docker compose up -d postgres
#   2) SERVER_PORT=18080 DB_PORT=5433 SPRING_PROFILES_ACTIVE=dev RATE_LIMIT_MAX_REQUESTS=500 ./mvnw spring-boot:run
#   3) bash backend/e2e/e2e_smoke.sh   (override target with KB_BASE_URL)
# Flow notes from live runs:
# - claim() AUTO-ACCEPTS the first claim (request status ACCEPTED), so approve
#   is only attempted when the request is still PENDING.
# - handover completion lives on the listing (status COMPLETED); the request
#   intentionally stays ACCEPTED.
# - verification approve must target the caller's OWN org id, not queue[0].
BASE="${KB_BASE_URL:-http://localhost:18080}"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  PASS: $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL: $1  [$2]"; echo "        body: $(head -c 220 "$3" 2>/dev/null)"; }
check() { # check <desc> <expected-codes-csv> <actual-code> <body-file>
  if [[ ",$2," == *",$3,"* ]]; then ok "$1 (HTTP $3)"; else bad "$1" "$3" "$4"; fi
}
code() { # last arg = output file, all other args = curl args; prints http code
  # Index-based access (no ${@:n:m} slicing): the slice variant intermittently
  # mis-split arguments and turned the output file into a second curl URL.
  local n=$#
  local out="${!n}"
  local args=()
  local i=1
  while [ "$i" -lt "$n" ]; do args+=("${!i}"); i=$((i+1)); done
  curl -s -o "$out" -w "%{http_code}" "${args[@]}"
}

D=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DL_PLUS_2H=$(date -u -v+2H +%Y-%m-%dT%H:%M:%SZ)
DL_PLUS_1H=$(date -u -v+1H +%Y-%m-%dT%H:%M:%SZ)
DL_PLUS_75S=$(date -u -v+75S +%Y-%m-%dT%H:%M:%SZ)

echo "== 0. Health =="
check "GET /api/health" "200" "$(code "$BASE/api/health" /tmp/e.json)" /tmp/e.json

echo "== 1. AuthN: anonymous access rejected =="
check "nearby without token -> 401" "401" "$(code "$BASE/api/listings/nearby?lat=23.8&lng=90.4" /tmp/e.json)" /tmp/e.json

echo "== 2. Scenario A: Donor login + profile =="
D_CODE=$(code -s -X POST "$BASE/api/auth/dev/login" -H 'Content-Type: application/json' \
  -d '{"email":"e2e-donor@khadyabachao.test","name":"E2E Donor","role":"DONOR"}' /tmp/donor.json)
check "donor dev login" "200" "$D_CODE" /tmp/donor.json
DONOR=$(jq -r .accessToken /tmp/donor.json)
check "GET /api/users/me" "200" "$(code -s "$BASE/api/users/me" -H "Authorization: Bearer $DONOR" /tmp/me.json)" /tmp/me.json
echo "      role=$(jq -r .role /tmp/me.json) name=$(jq -r .name /tmp/me.json)"
P_CODE=$(code -s -X PUT "$BASE/api/users/me" -H "Authorization: Bearer $DONOR" -H 'Content-Type: application/json' \
  -d '{"name":"E2E Donor","phone":"+8801711000001"}' /tmp/me.json)
check "PUT /api/users/me profile update" "200" "$P_CODE" /tmp/me.json

echo "== 3. Security: role escalation blocked (B15) =="
check "donor self-assigns ADMIN -> rejected" "400,403" "$(code -s -X PUT "$BASE/api/users/me/role" -H "Authorization: Bearer $DONOR" -H 'Content-Type: application/json' -d '{"role":"ADMIN"}' /tmp/e.json)" /tmp/e.json

echo "== 4. Scenario A: create listing (Dhaka) + validation =="
L_CODE=$(code -s -X POST "$BASE/api/listings" -H "Authorization: Bearer $DONOR" -H 'Content-Type: application/json' \
  -d "{\"title\":\"E2E Biryani 50 plates\",\"description\":\"Fresh leftover from catering\",\"foodType\":\"COOKED\",\"quantityValue\":50,\"quantityUnit\":\"plates\",\"photoUrls\":[],\"preparedAt\":\"$D\",\"pickupDeadline\":\"$DL_PLUS_2H\",\"pickupLat\":23.8103,\"pickupLng\":90.4125,\"pickupAddress\":\"Dhanmondi 27, Dhaka\"}" /tmp/listing.json)
check "create listing" "200,201" "$L_CODE" /tmp/listing.json
LID=$(jq -r .id /tmp/listing.json)
echo "      id=$LID status=$(jq -r .status /tmp/listing.json)"
check "create with past deadline -> 400" "400" "$(code -s -X POST "$BASE/api/listings" -H "Authorization: Bearer $DONOR" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Bad\",\"foodType\":\"COOKED\",\"quantityValue\":1,\"quantityUnit\":\"kg\",\"pickupDeadline\":\"2020-01-01T00:00:00Z\",\"pickupLat\":23.8,\"pickupLng\":90.4}" /tmp/e.json)" /tmp/e.json
check "create with pickupLat=200 -> 400" "400" "$(code -s -X POST "$BASE/api/listings" -H "Authorization: Bearer $DONOR" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Bad\",\"foodType\":\"COOKED\",\"quantityValue\":1,\"quantityUnit\":\"kg\",\"pickupDeadline\":\"$DL_PLUS_2H\",\"pickupLat\":200,\"pickupLng\":90.4}" /tmp/e.json)" /tmp/e.json

echo "== 5. Image upload: real PNG ok, disguised text rejected (B39) =="
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > /tmp/kb_ok.png
echo "definitely not an image, just text pretending to be png" > /tmp/kb_fake.png
U_CODE=$(code -s -X POST "$BASE/api/uploads" -H "Authorization: Bearer $DONOR" -F "file=@/tmp/kb_ok.png;type=image/png" /tmp/up.json)
check "upload real PNG" "200" "$U_CODE" /tmp/up.json
UPURL=$(jq -r .url /tmp/up.json); echo "      url=$UPURL"
check "disguised text with image/png header -> 400" "400" "$(code -s -X POST "$BASE/api/uploads" -H "Authorization: Bearer $DONOR" -F "file=@/tmp/kb_fake.png;type=image/png" /tmp/e.json)" /tmp/e.json

echo "== 6. Scenario G: nearby discovery + distance + filters =="
N_CODE=$(code -s "$BASE/api/listings/nearby?lat=23.8103&lng=90.4125&radiusKm=5" -H "Authorization: Bearer $DONOR" /tmp/near.json)
check "nearby Dhaka radius 5km" "200" "$N_CODE" /tmp/near.json
FOUND=$(jq --arg id "$LID" '[.[] | select(.id == $id)] | length' /tmp/near.json)
if [ "$FOUND" -ge 1 ]; then ok "Dhaka listing found nearby"; else bad "Dhaka listing found nearby" "not found" /tmp/near.json; fi
check "nearby filtered foodType=COOKED" "200" "$(code -s "$BASE/api/listings/nearby?lat=23.8103&lng=90.4125&radiusKm=5&foodType=COOKED" -H "Authorization: Bearer $DONOR" /tmp/near2.json)" /tmp/near2.json

echo "== 7. Scenario B: recipient discovers + claims =="
R_CODE=$(code -s -X POST "$BASE/api/auth/dev/login" -H 'Content-Type: application/json' \
  -d '{"email":"e2e-recipient1@khadyabachao.test","name":"E2E Recipient One","role":"RECIPIENT_INDIVIDUAL"}' /tmp/r1.json)
check "recipient1 dev login" "200" "$R_CODE" /tmp/r1.json
R1=$(jq -r .accessToken /tmp/r1.json)
C_CODE=$(code -s -X POST "$BASE/api/listings/$LID/claim" -H "Authorization: Bearer $R1" /tmp/claim.json)
check "recipient1 claims listing" "200,201" "$C_CODE" /tmp/claim.json
RID=$(jq -r .id /tmp/claim.json)
RSTATUS=$(jq -r .status /tmp/claim.json)
echo "      requestId=$RID status=$RSTATUS"

echo "== 8. Scenario C: second recipient cannot claim (single-claim invariant) =="
R2C=$(code -s -X POST "$BASE/api/auth/dev/login" -H 'Content-Type: application/json' \
  -d '{"email":"e2e-recipient2@khadyabachao.test","name":"E2E Recipient Two","role":"RECIPIENT_INDIVIDUAL"}' /tmp/r2.json)
check "recipient2 dev login" "200" "$R2C" /tmp/r2.json
R2=$(jq -r .accessToken /tmp/r2.json)
check "recipient2 claims same listing -> 409" "409" "$(code -s -X POST "$BASE/api/listings/$LID/claim" -H "Authorization: Bearer $R2" /tmp/e.json)" /tmp/e.json

echo "== 9. True concurrent race on a fresh listing (exactly one 200) =="
L2_CODE=$(code -s -X POST "$BASE/api/listings" -H "Authorization: Bearer $DONOR" -H 'Content-Type: application/json' \
  -d "{\"title\":\"E2E Race Cakes\",\"foodType\":\"PACKAGED\",\"quantityValue\":5,\"quantityUnit\":\"boxes\",\"pickupDeadline\":\"$DL_PLUS_2H\",\"pickupLat\":23.7925,\"pickupLng\":90.4043,\"pickupAddress\":\"Green Road\"}" /tmp/l2.json)
check "create race listing" "200,201" "$L2_CODE" /tmp/l2.json
LID2=$(jq -r .id /tmp/l2.json)
(c1=$(curl -s -o /tmp/rc1.json -w "%{http_code}" -X POST "$BASE/api/listings/$LID2/claim" -H "Authorization: Bearer $R1"); echo $c1 > /tmp/rc1.code) &
(c2=$(curl -s -o /tmp/rc2.json -w "%{http_code}" -X POST "$BASE/api/listings/$LID2/claim" -H "Authorization: Bearer $R2"); echo $c2 > /tmp/rc2.code) &
wait
C1=$(cat /tmp/rc1.code); C2=$(cat /tmp/rc2.code)
count200=0
{ [ "$C1" = 200 ] || [ "$C1" = 201 ]; } && count200=$((count200+1))
{ [ "$C2" = 200 ] || [ "$C2" = 201 ]; } && count200=$((count200+1))
if [ "$count200" -eq 1 ]; then ok "concurrent claims: exactly one won ($C1/$C2)"; else bad "concurrent claims race" "got $C1 and $C2" /tmp/rc1.json; fi

echo "== 10. IDOR: outsider cannot read chat / confirm schedule =="
check "outsider GET messages -> 403/404" "403,404" "$(code -s "$BASE/api/requests/$RID/messages" -H "Authorization: Bearer $R2" /tmp/e.json)" /tmp/e.json
check "outsider confirm schedule -> 403/404" "403,404" "$(code -s -X PATCH "$BASE/api/requests/$RID/schedule/confirm" -H "Authorization: Bearer $R2" /tmp/e.json)" /tmp/e.json

echo "== 11. Scenario E: approve (if needed) -> chat -> schedule -> complete -> stats =="
if [ "$RSTATUS" = "PENDING" ]; then
  check "donor approves claim" "200" "$(code -s -X POST "$BASE/api/requests/$RID/approve" -H "Authorization: Bearer $DONOR" /tmp/app.json)" /tmp/app.json
else
  ok "claim auto-accepted at claim time (status=$RSTATUS); approve not required"
fi
check "recipient sends chat message" "200,201" "$(code -s -X POST "$BASE/api/requests/$RID/messages" -H "Authorization: Bearer $R1" -H 'Content-Type: application/json' -d '{"message":"We will arrive at 6pm, gate 2."}' /tmp/e.json)" /tmp/e.json
check "donor sends chat message" "200,201" "$(code -s -X POST "$BASE/api/requests/$RID/messages" -H "Authorization: Bearer $DONOR" -H 'Content-Type: application/json' -d '{"message":"Confirmed. Call on arrival."}' /tmp/e.json)" /tmp/e.json
check "GET messages (participant)" "200" "$(code -s "$BASE/api/requests/$RID/messages" -H "Authorization: Bearer $DONOR" /tmp/hist.json)" /tmp/hist.json
echo "      history page size: $(jq -r '.content | length' /tmp/hist.json 2>/dev/null || echo parse-fail)"
S_CODE=$(code -s -X POST "$BASE/api/requests/$RID/schedule" -H "Authorization: Bearer $DONOR" -H 'Content-Type: application/json' \
  -d "{\"agreedTime\":\"$DL_PLUS_1H\",\"agreedLocation\":\"Gate 2, Dhanmondi 32\"}" /tmp/sched.json)
check "donor proposes pickup schedule" "200" "$S_CODE" /tmp/sched.json
check "recipient confirms schedule" "200" "$(code -s -X PATCH "$BASE/api/requests/$RID/schedule/confirm" -H "Authorization: Bearer $R1" /tmp/s1.json)" /tmp/s1.json
echo "      after recipient confirm: recipient=$(jq -r .confirmedByRecipient /tmp/s1.json) donor=$(jq -r .confirmedByDonor /tmp/s1.json)"
check "donor confirms schedule" "200" "$(code -s -X PATCH "$BASE/api/requests/$RID/schedule/confirm" -H "Authorization: Bearer $DONOR" /tmp/s2.json)" /tmp/s2.json
echo "      schedule status now: $(jq -r .status /tmp/s2.json)"
check "donor completes handover" "200" "$(code -s -X PATCH "$BASE/api/requests/$RID/complete" -H "Authorization: Bearer $DONOR" /tmp/comp.json)" /tmp/comp.json
LFINAL=$(curl -s "$BASE/api/listings/$LID" -H "Authorization: Bearer $DONOR" | jq -r .status)
if [ "$LFINAL" = "COMPLETED" ]; then ok "listing status COMPLETED after handover"; else bad "listing completed" "status=$LFINAL" /tmp/comp.json; fi
check "donor impact stats" "200" "$(code -s "$BASE/api/stats/me" -H "Authorization: Bearer $DONOR" /tmp/st.json)" /tmp/st.json
echo "      donor stats: $(jq -c . /tmp/st.json | head -c 300)"
RESCUED=$(jq -r .quantityRescued /tmp/st.json)
if [ "$RESCUED" != "null" ] && [ "$(echo "$RESCUED > 0" | bc 2>/dev/null)" = "1" ]; then ok "impact stats count rescued quantity ($RESCUED)"; else bad "impact stats rescued quantity" "quantityRescued=$RESCUED" /tmp/st.json; fi
check "system stats public" "200" "$(code -s "$BASE/api/stats/system" /tmp/stsys.json)" /tmp/stsys.json

echo "== 12. Ratings: rate, duplicate rejected, bounds =="
check "donor rates recipient" "200" "$(code -s -X POST "$BASE/api/requests/$RID/rate" -H "Authorization: Bearer $DONOR" -H 'Content-Type: application/json' -d '{"rating":5,"comment":"Great coordination"}' /tmp/rat1.json)" /tmp/rat1.json
check "recipient rates donor" "200" "$(code -s -X POST "$BASE/api/requests/$RID/rate" -H "Authorization: Bearer $R1" -H 'Content-Type: application/json' -d '{"rating":4,"comment":"Tasty food"}' /tmp/rat2.json)" /tmp/rat2.json
check "duplicate rating by donor -> 400/409" "400,409" "$(code -s -X POST "$BASE/api/requests/$RID/rate" -H "Authorization: Bearer $DONOR" -H 'Content-Type: application/json' -d '{"rating":1,"comment":"changed my mind"}' /tmp/e.json)" /tmp/e.json
check "rating 6 -> 400" "400" "$(code -s -X POST "$BASE/api/requests/$RID/rate" -H "Authorization: Bearer $R1" -H 'Content-Type: application/json' -d '{"rating":6}' /tmp/e.json)" /tmp/e.json

echo "== 13. Scenario F: verification + pending resubmission guard (B46) =="
check "recipient1 submits org doc" "200" "$(code -s -X POST "$BASE/api/verification/submit" -H "Authorization: Bearer $R1" -H 'Content-Type: application/json' -d '{"orgName":"E2E Hope NGO","orgType":"NGO","registrationDocUrl":"'"$UPURL"'"}' /tmp/ver.json)" /tmp/ver.json
echo "      verification status: $(jq -r .verificationStatus /tmp/ver.json)"
check "resubmit while PENDING -> 409" "409" "$(code -s -X POST "$BASE/api/verification/submit" -H "Authorization: Bearer $R1" -H 'Content-Type: application/json' -d '{"orgName":"E2E Hope NGO","orgType":"NGO","registrationDocUrl":"'"$UPURL"'"}' /tmp/e.json)" /tmp/e.json

echo "== 14. Admin: seeded admin login + approve OUR verification =="
A_CODE=$(code -s -X POST "$BASE/api/auth/dev/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin1@khadyabachao.org","name":"Admin One"}' /tmp/admin.json)
check "seeded admin dev login (no role override)" "200" "$A_CODE" /tmp/admin.json
ADMIN=$(jq -r .accessToken /tmp/admin.json)
ADMINROLE=$(curl -s "$BASE/api/users/me" -H "Authorization: Bearer $ADMIN" | jq -r .role)
if [ "$ADMINROLE" = "ADMIN" ]; then ok "admin token carries ADMIN role"; else bad "admin role" "role=$ADMINROLE" /tmp/admin.json; fi
check "non-admin blocked from admin API" "403" "$(code -s "$BASE/api/admin/verifications" -H "Authorization: Bearer $DONOR" /tmp/e.json)" /tmp/e.json
V_CODE=$(code -s "$BASE/api/admin/verifications?status=PENDING" -H "Authorization: Bearer $ADMIN" /tmp/pver.json)
check "admin lists pending verifications" "200" "$V_CODE" /tmp/pver.json
ORGID=$(curl -s "$BASE/api/verification/me" -H "Authorization: Bearer $R1" | jq -r .id)
if [ -n "$ORGID" ] && [ "$ORGID" != "null" ]; then
  check "admin approves OUR verification ($ORGID)" "200" "$(code -s -X PATCH "$BASE/api/admin/verifications/$ORGID/approve" -H "Authorization: Bearer $ADMIN" /tmp/av.json)" /tmp/av.json
  VERIFIED=$(curl -s "$BASE/api/users/me" -H "Authorization: Bearer $R1" | jq -r .verified)
  if [ "$VERIFIED" = "true" ]; then ok "NGO user now verified=true"; else bad "NGO user verified" "verified=$VERIFIED" /tmp/av.json; fi
else
  bad "our pending verification found" "orgId=$ORGID" /tmp/ver.json
fi

echo "== 15. Reports + moderation =="
jq -n --arg id "$LID2" '{targetType: "LISTING", targetId: $id, reason: "This looks like a fake listing"}' > /tmp/repbody.json
echo "      report payload: $(cat /tmp/repbody.json)"
check "recipient2 reports race listing" "200,201" "$(code -s -X POST "$BASE/api/reports" -H "Authorization: Bearer $R2" -H 'Content-Type: application/json' -d @/tmp/repbody.json /tmp/rep.json)" /tmp/rep.json
CREATEDAT=$(jq -r .createdAt /tmp/rep.json)
if [ "$CREATEDAT" != "null" ] && [ -n "$CREATEDAT" ]; then ok "report response carries createdAt"; else bad "report createdAt" "null" /tmp/rep.json; fi
check "admin lists open reports" "200" "$(code -s "$BASE/api/admin/reports?status=OPEN" -H "Authorization: Bearer $ADMIN" /tmp/reps.json)" /tmp/reps.json
REP_ID=$(jq -r --arg l "$LID2" '(.content // .)[] | select(.targetId == $l) | .id' /tmp/reps.json 2>/dev/null | head -1)
if [ -n "$REP_ID" ]; then
  check "admin resolves report" "200" "$(code -s -X PATCH "$BASE/api/admin/reports/$REP_ID/resolve" -H "Authorization: Bearer $ADMIN" /tmp/rr.json)" /tmp/rr.json
  L2STATUS=$(curl -s "$BASE/api/listings/$LID2" -H "Authorization: Bearer $DONOR" | jq -r .status)
  if [ "$L2STATUS" = "CANCELLED" ]; then ok "reported listing auto-cancelled by moderation"; else bad "reported listing cancelled" "status=$L2STATUS" /tmp/rr.json; fi
else
  bad "open report found for our listing" "no report row" /tmp/reps.json
fi

echo "== 16. Device tokens: ownership guard (B34) =="
check "recipient1 registers FCM token" "200" "$(code -s -X POST "$BASE/api/devices/register" -H "Authorization: Bearer $R1" -H 'Content-Type: application/json' -d '{"token":"fcm-e2e-token-001","platform":"ANDROID"}' /tmp/e.json)" /tmp/e.json
check "recipient2 steals same token -> 409" "409" "$(code -s -X POST "$BASE/api/devices/register" -H "Authorization: Bearer $R2" -H 'Content-Type: application/json' -d '{"token":"fcm-e2e-token-001","platform":"ANDROID"}' /tmp/e.json)" /tmp/e.json

echo "== 17. Scenario D: expiry job + expired claim rejection =="
L3_CODE=$(code -s -X POST "$BASE/api/listings" -H "Authorization: Bearer $DONOR" -H 'Content-Type: application/json' \
  -d "{\"title\":\"E2E Short-lived Fuchka\",\"foodType\":\"COOKED\",\"quantityValue\":10,\"quantityUnit\":\"plates\",\"pickupDeadline\":\"$DL_PLUS_75S\",\"pickupLat\":23.7806,\"pickupLng\":90.2794,\"pickupAddress\":\"Lalmatia\"}" /tmp/l3.json)
check "create short-deadline listing" "200,201" "$L3_CODE" /tmp/l3.json
LID3=$(jq -r .id /tmp/l3.json)
echo "      waiting up to 130s for expiry job (60s cadence)..."
EXPIRED="no"; ST=""
for i in $(seq 1 26); do
  sleep 5
  ST=$(curl -s "$BASE/api/listings/$LID3" -H "Authorization: Bearer $R1" | jq -r .status)
  if [ "$ST" = "EXPIRED" ]; then EXPIRED="yes"; ok "listing marked EXPIRED after ~$((i*5))s"; break; fi
done
[ "$EXPIRED" = "no" ] && bad "listing expiry" "status=$ST after 130s" /tmp/l3.json
check "claim expired listing -> 409/400" "409,400" "$(code -s -X POST "$BASE/api/listings/$LID3/claim" -H "Authorization: Bearer $R2" /tmp/e.json)" /tmp/e.json

echo "== 18. Admin deactivation + JWT active check =="
R2ID=$(curl -s "$BASE/api/users/me" -H "Authorization: Bearer $R2" | jq -r .id)
check "admin deactivates recipient2" "200" "$(code -s -X POST "$BASE/api/admin/users/$R2ID/deactivate" -H "Authorization: Bearer $ADMIN" /tmp/e.json)" /tmp/e.json
check "deactivated user's JWT now 401" "401" "$(code -s "$BASE/api/users/me" -H "Authorization: Bearer $R2" /tmp/e.json)" /tmp/e.json

echo "== 19. Notifications were dispatched (dev-log push) =="
PUSHES=$(grep -c "PUSH (dev-log)" /tmp/kb-backend.log 2>/dev/null)
[ -z "$PUSHES" ] && PUSHES=0
if [ "$PUSHES" -ge 1 ]; then ok "push notifications logged ($PUSHES entries)"; else bad "push notification log" "no PUSH entries" /tmp/kb-backend.log; fi

echo
echo "==================================="
echo "E2E RESULT: PASS=$PASS FAIL=$FAIL"
echo "==================================="
