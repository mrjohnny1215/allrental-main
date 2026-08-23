#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
기존 products_data.json(427건) + 신규 rental_world_full_final.json(2282건) 병합
- App.jsx 호환: rentalPeriods (camelCase) + period_prices
- unknown 카테고리 -> title 기반 재추론
- 기존 모델 갱신 / 신규 추가 / 단종(not_available) 처리
- 산출물: products_data.json + public/products_data.json 동기화
"""
import json, os, re
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
OLD = os.path.join(ROOT, 'products_data.json')
NEW = os.path.join(HERE, 'rental_world_full_final.json')

old = json.load(open(OLD, encoding='utf-8'))
newd = json.load(open(NEW, encoding='utf-8'))
new_prods = newd['products']

CAT_KW = [
    ('water', ['정수', '삼투', '얼음냉', '청수', '워터', '스탠드']),
    ('air', ['공기청정', '에어로', '퓨리케어', '클리어', '공기']),
    ('bidet', ['비데']),
    ('mattress', ['매트리스', '침대', '드림', '슬립']),
    ('washer', ['세탁', '건조', '워시']),
    ('robot', ['로봇청소', '청소로봇']),
    ('package', ['패키지', '꿀조합', '세트']),
]
def infer_cat(title, old_cat):
    if old_cat and old_cat != 'unknown':
        return old_cat
    t = (title or '')
    for cat, kws in CAT_KW:
        if any(k in t for k in kws):
            return cat
    return 'unknown'

new_by_model = {}
for url, p in new_prods.items():
    m = (p.get('model_code') or '').strip().upper()
    if m:
        new_by_model.setdefault(m, p)

old_by_model = {}
for p in old:
    m = (p.get('model') or '').strip().upper()
    if m:
        old_by_model.setdefault(m, []).append(p)

def build_matrix_fields(np):
    pp = {}
    if np.get('rental_fee_matrix'):
        for row in np['rental_fee_matrix']:
            per = row['contract_period']
            cyc = row['service_cycle']
            pp.setdefault(per, {})[cyc] = row.get('option_add', 0)
    return pp

merged = []
stats = {'updated': 0, 'added': 0, 'discontinued': 0}

old_models_seen = set()
for p in old:
    m = (p.get('model') or '').strip().upper()
    if m in new_by_model:
        np = new_by_model[m]
        p['price'] = np.get('price') or p.get('price')
        p['it_price'] = np.get('price') or p.get('it_price')
        if np.get('discount'):
            p['discount'] = np.get('discount')
        pp = build_matrix_fields(np)
        if pp:
            p['period_prices'] = pp
            p['rentalPeriods'] = list(pp.keys())
            p['rental_periods'] = list(pp.keys())
            p['maintenance_cycles'] = list({c for per in pp.values() for c in per.keys()})
        p['not_available'] = False
        p['category'] = infer_cat(np.get('product_name'), p.get('category'))
        stats['updated'] += 1
        old_models_seen.add(m)
    else:
        p['not_available'] = True
        stats['discontinued'] += 1
    merged.append(p)

for m, np in new_by_model.items():
    if m in old_models_seen:
        continue
    pp = build_matrix_fields(np)
    cat = infer_cat(np.get('product_name'), np.get('category'))
    rec = {
        'url': np.get('url'),
        'category': cat,
        'title': np.get('product_name', ''),
        'it_price': np.get('price') or 0,
        'not_available': False,
        'image': (np.get('detail_images') or [''])[0] if np.get('detail_images') else '',
        'desc': np.get('product_name', ''),
        'brand': np.get('brand', ''),
        'model': m,
        'price': np.get('price') or 0,
        'logo': '',
        'promotion': np.get('promotion') or [],
    }
    if pp:
        rec['period_prices'] = pp
        rec['rentalPeriods'] = list(pp.keys())
        rec['rental_periods'] = list(pp.keys())
        rec['maintenance_cycles'] = list({c for per in pp.values() for c in per.keys()})
    if np.get('discount'):
        rec['discount'] = np.get('discount')
    merged.append(rec)
    stats['added'] += 1

json.dump(merged, open(OLD, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(merged, open(os.path.join(ROOT, 'public', 'products_data.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

from collections import Counter
cats = Counter(p.get('category') for p in merged)
print('=== 병합 완료 ===')
print(f'기존 갱신: {stats["updated"]}건')
print(f'신규 추가: {stats["added"]}건')
print(f'단종 처리: {stats["discontinued"]}건')
print(f'총 merged: {len(merged)}건')
print(f'카테고리 분포: {dict(cats)}')
print(f'unknown 잔여: {cats.get("unknown",0)}건')
print(f'-> {OLD} + public/products_data.json')
