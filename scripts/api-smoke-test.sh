#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:8080}
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

expect_status() {
    local expected=$1 actual=$2 label=$3
    if [[ "$expected" != "$actual" ]]; then
        echo "FAIL: $label (expected HTTP $expected, got $actual)" >&2
        exit 1
    fi
    echo "ok: $label"
}

http_status() {
    curl -s -o /dev/null -w '%{http_code}' "$@"
}

VALID_LAYOUT='{"name":"Smoke Test","sections":[{"title":"Revenue","gridColumn":1,"gridRow":1,"columnSpan":8,"rowSpan":30,"elements":[{"elementType":"chart","offsetXPercent":0,"offsetYPercent":0,"widthPercent":100,"heightPercent":100,"zIndex":1,"content":{"chartType":"bar","title":"Revenue","labels":["Jan","Feb"],"values":[10,20.5]}}]}]}'
INVALID_LAYOUT='{"name":"Smoke Test","sections":[{"title":"Broken","gridColumn":0,"gridRow":1,"columnSpan":8,"rowSpan":30,"elements":[]}]}'

CREATE_BODY=$(mktemp)
trap 'rm -f "$CREATE_BODY"' EXIT

create_status=$(curl -s -o "$CREATE_BODY" -w '%{http_code}' -X POST "$BASE_URL/api/dashboards" \
    -H 'Content-Type: application/json' -d '{"name":"Smoke Test"}')
expect_status 201 "$create_status" "create dashboard"
dashboard_id=$(grep -o '"id":[0-9]*' "$CREATE_BODY" | head -1 | cut -d: -f2)

expect_status 200 "$(http_status -X PUT "$BASE_URL/api/dashboards/$dashboard_id/layout" \
    -H 'Content-Type: application/json' -d "$VALID_LAYOUT")" "save layout"

loaded_body=$(curl -s "$BASE_URL/api/dashboards/$dashboard_id")
if [[ "$loaded_body" != *'"chartType":"bar"'* ]]; then
    echo "FAIL: loaded dashboard does not contain the saved chart" >&2
    exit 1
fi
echo "ok: load returns saved chart"

expect_status 404 "$(http_status "$BASE_URL/api/dashboards/999999")" "unknown dashboard"
expect_status 422 "$(http_status -X PUT "$BASE_URL/api/dashboards/$dashboard_id/layout" \
    -H 'Content-Type: application/json' -d "$INVALID_LAYOUT")" "invalid layout rejected"
expect_status 400 "$(http_status -X PUT "$BASE_URL/api/dashboards/$dashboard_id/layout" \
    -H 'Content-Type: application/json' -d '{bad')" "malformed json rejected"
expect_status 422 "$(http_status -X POST "$BASE_URL/api/images" \
    -F "image=@$PROJECT_ROOT/public/assets/images/sample-banner.svg")" "svg upload rejected"

echo "All smoke checks passed"
