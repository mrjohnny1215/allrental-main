#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
정밀수집 결과 재가공: raw.period_prices -> rental_fee_matrix 변환
(이미 1차 크롤에서 period_prices에 기간×관리주기 추가금이 다 잡혀있음)
- 오류/삭제 상품(model/price 없음) 제외
- 산출물: rental_world_full_final.json
"""
import json, os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'rental_world_full_precise.json')
OUT = os.path.join(HERE, 'rental_world_full_final.json')

d = json.load(open(SRC, encoding='utf-8'))
prods = d['products']

results = {}
dropped = 0
for url, p in prods.items():
    model = p.get('model_code') or p.get('model') or ''
    price = p.get('price') or 0
    try: price = int(price)
    except: price = 0
    if not model or not price:
        dropped += 1
        continue
    # period_prices 기반 매트릭스 재구성
    pp = p.get('raw', {}).get('period_prices') or {}
    matrix = []
    if isinstance(pp, dict):
        for period, cycles in pp.items():
            if not isinstance(cycles, dict):
                continue
            for cycle, add in cycles.items():
                try: add = int(add)
                except: add = 0
                original = price + add
                matrix.append({
                    'contract_period': period,
                    'service_type': '셀프관리' if '셀프' in cycle else ('방문관리' if '방문' in cycle else ''),
                    'service_cycle': cycle,
                    'original_monthly_fee': original,
                    'option_add': add,
                    'discounted_monthly_fee': p.get('discount') or original,
                })
    rec = dict(p)
    rec['rental_fee_matrix'] = matrix
    rec['precise'] = True
    results[url] = rec

out = {
    'total': len(results),
    'by_category': defaultdict(int),
    'dropped_errors': dropped,
    'products': results,
    'crawled_at': d.get('crawled_at'),
    'final': True,
}
for v in results.values():
    out['by_category'][v.get('category', 'unknown')] += 1
out['by_category'] = dict(out['by_category'])
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# 통계
matrix_ok = sum(1 for p in results.values() if p.get('rental_fee_matrix'))
print(f'=== 최종 가공 완료 ===')
print(f'유효 상품: {len(results)}건 (오류/삭제 제외 {dropped}건)')
print(f'매트릭스 채워짐: {matrix_ok}건')
print(f'카테고리: {out["by_category"]}')
print(f'-> {OUT}')
