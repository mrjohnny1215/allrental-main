#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 4: 기존 서빙본 vs 신규 전수 크롤 Diff Audit
- 기준키: model_code (+ contract_period + service_cycle 가 있는 경우)
- 불일치: 가격 오기재, 프로모션/카드 누락, 신규/단종 품목
- 산출물: diff_audit_report.json + diff_audit_report.md
"""
import json, os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
NEW = json.load(open(os.path.join(HERE, 'rental_world_full_latest.json'), encoding='utf-8'))
OLD = json.load(open('/opt/data/allrental/products_data.json', encoding='utf-8'))

new_prods = NEW['products']

# 기존: model -> record
old_by_model = {}
for p in OLD:
    m = (p.get('model') or '').strip().upper()
    if m:
        old_by_model.setdefault(m, []).append(p)

# 신규: model -> record
new_by_model = {}
for url, p in new_prods.items():
    m = (p.get('model_code') or '').strip().upper()
    if m:
        new_by_model.setdefault(m, []).append(p)

old_models = set(old_by_model.keys())
new_models = set(new_by_model.keys())

# 1) 신규 품목 (기존에 없던 model)
added = sorted(new_models - old_models)
# 2) 단종 품목 (신규에 없는 model)
removed = sorted(old_models - new_models)
# 3) 공통 model 가격 불일치
price_mismatch = []
promo_mismatch = []
for m in sorted(old_models & new_models):
    o_rec = old_by_model[m][0]
    n_rec = new_by_model[m][0]
    o_price = o_rec.get('price') or o_rec.get('it_price') or 0
    n_price = n_rec.get('price') or 0
    try: o_price = int(o_price); n_price = int(n_price)
    except: o_price = str(o_price); n_price = str(n_price)
    if o_price != n_price and n_price:
        price_mismatch.append({
            'model': m,
            'product_name': n_rec.get('product_name') or o_rec.get('title'),
            'old_price': o_price,
            'new_price': n_price,
            'diff': (n_price - o_price) if isinstance(n_price,int) and isinstance(o_price,int) else 'N/A',
        })
    # 프로모션 누락
    o_promo = o_rec.get('promotion') or []
    n_promo = n_rec.get('promotion') or []
    if o_promo and not n_promo:
        promo_mismatch.append({'model': m, 'old_promo': o_promo})

# 4) 매트릭스 기반 정밀 Diff (model+period+cycle)
matrix_diff = []
for m in sorted(old_models & new_models):
    o_rec = old_by_model[m][0]
    n_rec = new_by_model[m][0]
    n_matrix = n_rec.get('rental_fee_matrix') or []
    if not n_matrix:
        continue
    # 신규 매트릭스 키셋
    for row in n_matrix:
        key = (m, row.get('contract_period'), row.get('service_cycle'))
        matrix_diff.append({
            'model': m,
            'contract_period': row.get('contract_period'),
            'service_cycle': row.get('service_cycle'),
            'original_monthly_fee': row.get('original_monthly_fee'),
            'discounted_monthly_fee': row.get('discounted_monthly_fee'),
            'card_count': len(row.get('cards') or []),
        })

summary = {
    'old_total': len(OLD),
    'new_total': len(new_prods),
    'common_models': len(old_models & new_models),
    'added_models': len(added),
    'removed_models': len(removed),
    'price_mismatch': len(price_mismatch),
    'promo_mismatch': len(promo_mismatch),
    'matrix_rows_collected': len(matrix_diff),
}

report = {
    'summary': summary,
    'added_models': added,
    'removed_models': removed,
    'price_mismatch': price_mismatch,
    'promo_mismatch': promo_mismatch,
    'matrix_sample': matrix_diff[:50],
}

json.dump(report, open(os.path.join(HERE, 'diff_audit_report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# Markdown
lines = []
lines.append('# Diff Audit Report — 렌탈세계 전수 크롤 vs 기존 사이트\n')
lines.append(f'- 생성 시각: {NEW.get("crawled_at")}`')
lines.append('')
lines.append('## 요약')
lines.append('| 항목 | 건수 |')
lines.append('|------|------|')
lines.append(f'| 기존 서빙본 상품 | {summary["old_total"]} |')
lines.append(f'| 신규 전수 크롤 | {summary["new_total"]} |')
lines.append(f'| 공통 모델 | {summary["common_models"]} |')
lines.append(f'| **신규 품목(기존 미존재)** | {summary["added_models"]} |')
lines.append(f'| **단종 품목(신규 미존재)** | {summary["removed_models"]} |')
lines.append(f'| **가격 불일치** | {summary["price_mismatch"]} |')
lines.append(f'| 프로모션 누락 | {summary["promo_mismatch"]} |')
lines.append(f'| 수집된 요금 매트릭스 행 | {summary["matrix_rows_collected"]} |')
lines.append('')
lines.append('## 신규 품목 (기존 사이트에 없던 모델)')
lines.append('')
if added:
    for m in added[:100]:
        rec = new_by_model[m][0]
        lines.append(f'- `{m}` — {rec.get("product_name")} ({rec.get("category")})')
else:
    lines.append('(없음)')
lines.append('')
lines.append('## 단종 품목 (신규 크롤에서 사라진 모델)')
lines.append('')
if removed:
    for m in removed[:100]:
        rec = old_by_model[m][0]
        lines.append(f'- `{m}` — {rec.get("title")} ({rec.get("category")})')
else:
    lines.append('(없음)')
lines.append('')
lines.append('## 가격 불일치 (기존 vs 신규)')
lines.append('')
if price_mismatch:
    lines.append('| 모델 | 상품명 | 기존가 | 신규가 | 차이 |')
    lines.append('|------|--------|-------|-------|------|')
    for r in price_mismatch[:200]:
        lines.append(f'| `{r["model"]}` | {r["product_name"]} | {r["old_price"]} | {r["new_price"]} | {r["diff"]} |')
else:
    lines.append('(불일치 없음)')
lines.append('')
lines.append('## 프로모션 누락 (기존엔 있으나 신규에서 비어있음)')
lines.append('')
if promo_mismatch:
    for r in promo_mismatch[:50]:
        lines.append(f'- `{r["model"]}` — 기존: {r["old_promo"]}')
else:
    lines.append('(없음)')

open(os.path.join(HERE, 'diff_audit_report.md'), 'w', encoding='utf-8').write('\n'.join(lines))

print('=== Diff 리포트 생성 완료 ===')
print(json.dumps(summary, ensure_ascii=False, indent=2))
print('파일:', os.path.join(HERE, 'diff_audit_report.json'), os.path.join(HERE, 'diff_audit_report.md'))
