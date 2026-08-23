#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
107건 매칭실패 품목 렌탈세계 직접 재크롤 -> 기존 427건 갱신
- 대상: 기존 427건 중 rental_world_full_final.json에 모델 매칭 안 된 107건
- 각 URL에서 model/price/periods/관리주기 추가금 재추출
- 산출물: products_data.json + public/products_data.json 갱신
"""
import json, os, re, sys, time, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crawl_common import crawl_product_detail, get_session, normalize_url

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
BK = os.path.join(ROOT, 'backup', 'checkpoint-pre-crawl-20260823_015424', 'products_data.json')
SRC = os.path.join(HERE, 'rental_world_full_final.json')
OUT = os.path.join(ROOT, 'products_data.json')
PUB = os.path.join(ROOT, 'public', 'products_data.json')

base = json.load(open(BK, encoding='utf-8'))
src = json.load(open(SRC, encoding='utf-8'))
src_prods = src['products']
src_models = {(p.get('model_code') or '').strip().upper() for p in src_prods.values() if p.get('model_code')}

# 대상 107건
targets = [p for p in base if (p.get('model') or '').strip().upper() not in src_models]
print(f'재크롤 대상: {len(targets)}건', flush=True)

session = get_session()
ok = 0
for p in targets:
    url = normalize_url(p.get('url'))
    try:
        d = crawl_product_detail(session, url)
        if d.get('error') and not d.get('title'):
            print(f'  SKIP {p.get("model")} :: {d.get("error")}', flush=True)
            continue
        # model
        m = d.get('model') or p.get('model')
        # price
        price = d.get('price') or d.get('it_price') or p.get('price')
        try: price = int(price)
        except: price = p.get('price')
        if price:
            p['price'] = price
            p['it_price'] = price
        if d.get('discount'):
            p['discount'] = d.get('discount')
        # period_prices 재구성 (raw)
        pp = d.get('period_prices') or {}
        if isinstance(pp, dict) and pp:
            p['period_prices'] = pp
            p['rentalPeriods'] = list(pp.keys())
            p['rental_periods'] = list(pp.keys())
            p['maintenance_cycles'] = list({c for per in pp.values() for c in per.keys()})
        ok += 1
    except Exception as e:
        print(f'  EXC {p.get("model")} :: {e}', flush=True)
    time.sleep(random.uniform(0.4, 1.0))

json.dump(base, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(base, open(PUB, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'DONE: {ok}/{len(targets)}건 갱신 -> {OUT}', flush=True)
