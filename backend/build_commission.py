#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
commission_db.csv 생성 + fee_table.json(3차원) 재구성
─────────────────────────────────────────────────────
입력:
  - public/fee_table.json   : 모델 -> {약정년수: 금액}   (기존 수수료 원본, 관리주기 차원 없음)
  - public/merged_products.json : 상세 (model -> maintenance_cycles 등)

출력:
  - commission_db.csv       : model, rental_period, maintenance_cycle, commission_fee
                              (사용자가 실제 원본 CSV로 교체 가능한 단일 소스)
  - public/fee_table.json   : 모델 -> {약정년수 -> {관리주기: 금액}}  (3차원, 프론트 소비용)

매핑 정책:
  merged 상세에 maintenance_cycles가 있으면 그 목록을 사용,
  없으면 ['기본'] 으로 폴백.
  약정별 수수료 금액은 fee_table.json의 기존 값을 해당 모델의
  '대표 관리주기'(첫 슬롯)에 배치하고, 나머지 주기 슬롯에는 동일 금액 복사.
  → 실제 관리주기별 차액 원본(commission_db.csv 진짜 버전)이 들어오면
    이 스크립트를 다시 돌리거나 프론트가 CSV를 직접 읽게만 하면 정확 반영.
"""
import json, os, csv

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')

fee_old = json.load(open(os.path.join(PUB, 'fee_table.json'), encoding='utf-8'))
merged = json.load(open(os.path.join(PUB, 'merged_products.json'), encoding='utf-8'))

# model -> maintenance_cycles
model_cycles = {}
for url, det in merged.items():
    if not isinstance(det, dict):
        continue
    m = det.get('model')
    if not m:
        continue
    mc = det.get('maintenance_cycles') or []
    if m not in model_cycles and mc:
        model_cycles[m] = mc

def cycles_for(model):
    if model in model_cycles and model_cycles[model]:
        return model_cycles[model]
    return ['기본']

fee_new = {}
rows = []
# 연차 정렬 순서
order = {'3년': 0, '4년': 1, '5년': 2, '6년': 3, '7년': 4, '8년': 5, '9년': 6}
for model, periods in fee_old.items():
    cyc = cycles_for(model)
    rep = cyc[0]  # 대표 슬롯
    fee_new[model] = {}
    # 약정 정렬
    sorted_periods = sorted(periods.items(), key=lambda kv: order.get(kv[0], 99))
    for per, fee in sorted_periods:
        fee_new[model][per] = {c: fee for c in cyc}
        for c in cyc:
            rows.append({
                'model': model,
                'rental_period': per,
                'maintenance_cycle': c,
                'commission_fee': fee,
            })

# CSV 덤프
csv_path = os.path.join(ROOT, 'commission_db.csv')
with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['model', 'rental_period', 'maintenance_cycle', 'commission_fee'])
    w.writeheader()
    w.writerows(rows)

# fee_table 3차원 덮어쓰기 (백업 먼저)
bak = os.path.join(PUB, 'fee_table.json.bak')
if not os.path.exists(bak):
    os.replace(os.path.join(PUB, 'fee_table.json'), bak)
json.dump(fee_new, open(os.path.join(PUB, 'fee_table.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)

print(f"commission_db.csv 생성: {len(rows)}행 -> {csv_path}")
print(f"fee_table.json 3차원 변환: {len(fee_new)}모델")
# 샘플 출력
sample = next(iter(fee_new))
print("샘플:", sample, "->", json.dumps(fee_new[sample], ensure_ascii=False))
