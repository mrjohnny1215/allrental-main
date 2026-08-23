#!/usr/bin/env bash
# ALL렌탈 전체 크롤링 파이프라인 (백그라운드 실행용)
set -u
cd /opt/data/allrental/backend

LOG=/opt/data/allrental/backend/crawl_pipeline.log
echo "===== 크롤링 파이프라인 시작: $(date) =====" | tee -a "$LOG"

# 기존 데이터 백업
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -f *_data.json products_data.json merged_products.json "$BACKUP_DIR"/ 2>/dev/null || true
echo "[backup] 기존 데이터 백업 -> $BACKUP_DIR" | tee -a "$LOG"

source .venv/bin/activate

for py in crawl_water.py crawl_bidet.py crawl_air.py crawl_mattress.py; do
  echo "" | tee -a "$LOG"
  echo ">>>> 시작: $py ($(date))" | tee -a "$LOG"
  python "$py" >> "$LOG" 2>&1
  echo "<<<< 종료: $py ($(date)) exit=$?" | tee -a "$LOG"
done

echo "" | tee -a "$LOG"
echo ">>>> generate_json.py ($(date))" | tee -a "$LOG"
python generate_json.py >> "$LOG" 2>&1

echo ">>>> merge_json.py ($(date))" | tee -a "$LOG"
python merge_json.py >> "$LOG" 2>&1

echo "" | tee -a "$LOG"
echo "===== 크롤링 파이프라인 완료: $(date) =====" | tee -a "$LOG"
# 결과 요약
python - <<'PY' >> "$LOG" 2>&1
import json, os
for f in ['water_data.json','bidet_data.json','air_data.json','mattress_data.json']:
    try:
        d=json.load(open(f,encoding='utf-8'))
        print(f"{f}: {len(d)}개")
    except Exception as e:
        print(f"{f}: 오류 {e}")
try:
    p=json.load(open('products_data.json',encoding='utf-8'))
    print(f"products_data.json: {len(p)}개")
except Exception as e:
    print(f"products_data.json: 오류 {e}")
try:
    m=json.load(open('merged_products.json',encoding='utf-8'))
    print("merged_products.json 카테고리:", list(m.keys()))
except Exception as e:
    print(f"merged_products.json: 오류 {e}")
PY
