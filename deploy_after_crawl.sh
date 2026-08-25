#!/usr/bin/env bash
# merge → build → deploy 자동화 (크롤 완료 후 실행)
set -e

ROOT="/opt/data/allrental"
BACKEND="$ROOT/backend"
DIST="$ROOT/dist"
LOG="$ROOT/build_deploy_$(date +%Y%m%d_%H%M%S).log"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG"; }

cd "$ROOT"

# 1) 크롤 완료 확인
if [ ! -f "$BACKEND/rental_world_full_latest.json" ]; then
    log "ERROR: rental_world_full_latest.json 없음 — 크롤 먼저"
    exit 1
fi

# 2) merge_to_site.py → products_data.json 갱신
log "=== merge_to_site.py ==="
source "$BACKEND/.venv/bin/activate"
python3 "$BACKEND/merge_to_site.py" 2>&1 | tee -a "$LOG"
log "merge 완료"

# 3) dist/ 복사본 최신화
log "=== dist 데이터 동기화 ==="
cp "$ROOT/products_data.json" "$DIST/products_data.json"
cp "$BACKEND/fee_table.json" "$DIST/fee_table.json" 2>/dev/null || true
# merged_products.json은 merge_to_site.py에서 재생성됐는지 확인
if [ -f "$BACKEND/merged_products.json" ]; then
    cp "$BACKEND/merged_products.json" "$DIST/merged_products.json"
    log "merged_products.json 복사 완료"
fi

# 4) Vite 빌드
log "=== vite build ==="
npm run build 2>&1 | tee -a "$LOG"
log "빌드 완료"

# 5) Vercel 배포
log "=== vercel deploy ==="
vercel --prod --token="$VERCEL_TOKEN" 2>&1 | tee -a "$LOG" || {
    log "Vercel 배포 실패 — 수동 확인 필요"
    exit 1
}
log "배포 완료: $(vercel info --json 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("url","?"))' 2>/dev/null || echo '확인 불가')"
