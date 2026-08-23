#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
원본 427건만 유지 + 렌탈세계 실측 금액/할인/관리주기 매트릭스 갱신
- 신규 추가 절대 없음 (1279건 롤백)
- 기존 427건 모델을 rental_world_full_final.json에서 매핑하여 price/discount/period_prices 갱신
- 산출물: products_data.json + public/products_data.json
"""
import json, os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
BK = os.path.join(ROOT, 'backup', 'checkpoint-pre-crawl-20260823_015424', 'products_data.json')
SRC = os.path.join(HERE, 'rental_world_full_final.json')
OLD_OUT = os.path.join(ROOT, 'products_data.json')
PUB_OUT = os.path.join(ROOT, 'public', 'products_data.json')

# 원본 427건 (롤백 베이스)
base = json.load(open(BK, encoding='utf-8'))
# 렌탈세계 실측
src = json.load(open(SRC, encoding='utf-8'))
src_prods = src['products']

# 신규: model -> record
src_by_model = {}
for url, p in src_prods.items():
    m = (p.get('model_code') or '').strip().upper()
    if m:
        src_by_model.setdefault(m, p)

updated = 0
matched_models = set()
for p in base:
    m = (p.get('model') or '').strip().upper()
    if m in src_by_model:
        np = src_by_model[m]
        # 가격/할인 갱신
        if np.get('price'):
            p['price'] = np.get('price')
            p['it_price'] = np.get('price')
        if np.get('discount'):
            p['discount'] = np.get('discount')
        # 매트릭스
        if np.get('rental_fee_matrix'):
            pp = {}
            for row in np['rental_fee_matrix']:
                per = row['contract_period']
                cyc = row['service_cycle']
                pp.setdefault(per, {})[cyc] = row.get('option_add', 0)
            p['period_prices'] = pp
            p['rentalPeriods'] = list(pp.keys())
            p['rental_periods'] = list(pp.keys())
            p['maintenance_cycles'] = list({c for per in pp.values() for c in per.keys()})
        p['not_available'] = False
        updated += 1
        matched_models.add(m)

# 저장 (원본 구조 그대로, 427건)
json.dump(base, open(OLD_OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(base, open(PUB_OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

cats = Counter(p.get('category') for p in base)
print('=== 427건만 갱신 완료 ===')
print(f'총 상품: {len(base)}건 (신규추가 0)')
print(f'렌탈세계 실측 매핑 갱신: {updated}건')
print(f'매칭 실패(실측없음): {len(base)-updated}건')
print(f'카테고리: {dict(cats)}')
print(f'-> {OLD_OUT} + public/products_data.json')
