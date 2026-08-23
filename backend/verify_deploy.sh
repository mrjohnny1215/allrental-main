#!/usr/bin/env bash
# Vercel 빌드 대기 + 라이브 검증
set -e
echo "Vercel 빌드 대기 중... (60초)"
sleep 60
LIVE="https://allrental-xi.vercel.app"
echo "=== 라이브 fee_table.json fetch ==="
curl -sSL "$LIVE/fee_table.json" --max-time 20 -o /tmp/live_fee.json
if [ -s /tmp/live_fee.json ]; then
  echo "다운로드 OK, 크기: $(wc -c < /tmp/live_fee.json) bytes"
  python3 - <<'PY'
import json
d=json.load(open('/tmp/live_fee.json',encoding='utf-8'))
def depth(o):
    if isinstance(o,dict) and o: return 1+max(depth(v) for v in o.values())
    return 0
print("라이브 fee_table 모델 수:", len(d))
print("라이브 fee_table 깊이:", depth(d), "(3=3차원 OK, 2=이전구조/미반영)")
m=next(iter(d))
print("라이브 샘플:", m, "->", json.dumps(d[m], ensure_ascii=False)[:160])
# 관리주기 차원 포함 여부
has_cycle=any(isinstance(v,dict) and any(isinstance(vv,dict) for vv in v.values()) for v in d.values())
print("관리주기 차원 포함:", has_cycle)
PY
else
  echo "!! fee_table.json 다운로드 실패 (빌드 미완료 or 경로 변경)"
fi
echo "=== 라이브 index.html 번들명 ==="
curl -sSL "$LIVE/" --max-time 20 | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
echo "=== done ==="