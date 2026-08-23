#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 2/3: 렌탈세계 전 품목 Full Crawl + 정규화
- 대상: backend/all_product_urls.json (2,543 URL)
- 재활용: backend/crawl_common.crawl_product_detail
- Rate limit: 지수 백오프 + 요청간 딜레이
- 산출물: rental_world_full_latest.json (URL키 딕셔너리, 태스크 스키마 정규화)
- 진행 로그: crawl_full_latest.log (줄 단위 flush)
"""
import json, time, random, sys, os, re
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from crawl_common import crawl_product_detail, get_session, normalize_url

URLS = json.load(open(os.path.join(HERE, 'all_product_urls.json'), encoding='utf-8'))
OUT = os.path.join(HERE, 'rental_world_full_latest.json')
LOG = os.path.join(HERE, 'crawl_full_latest.log')

# 기존 597건 category 매핑 (cid 혼재라 URL 기준 재사용)
OLD = json.load(open(os.path.join(HERE, 'rentalsegye_all_products.json'), encoding='utf-8'))
OLD_PRODS = OLD.get('products', OLD) if isinstance(OLD, dict) else OLD
OLD_CAT = {normalize_url(u): v.get('category', '') for u, v in (OLD_PRODS.items() if isinstance(OLD_PRODS, dict) else [])}

CAT_KEYWORDS = [
    ('water', ['정수', '삼투', '얼음냉', '청수']),
    ('air', ['공기청정', '에어로', '퓨리케어', '클리어']),
    ('bidet', ['비데']),
    ('mattress', ['매트리스', '침대', '드림']),
    ('washer', ['세탁', '건조']),
    ('robot', ['로봇청소', '청소로봇']),
    ('package', ['패키지', '꿀조합', '세트']),
]

def infer_category(url, title):
    u = normalize_url(url)
    if u in OLD_CAT and OLD_CAT[u]:
        return OLD_CAT[u]
    t = (title or '')
    for cat, kws in CAT_KEYWORDS:
        if any(k in t for k in kws):
            return cat
    # breadcrumb 기반은 crawl_product_detail 결과의 breadcrumb로 후처리
    return 'unknown'

def normalize_record(d):
    """크롤 결과 -> 태스크 스키마(contract_period x service_cycle x card 매트릭스) 정규화"""
    url = d.get('url', '')
    cat = d.get('category') or infer_category(url, d.get('title'))
    it_price = d.get('it_price') or d.get('price') or 0
    try: it_price = int(it_price)
    except: it_price = 0
    periods = d.get('rental_periods', []) or []
    cycles = d.get('maintenance_cycles', []) or d.get('sizes', []) or []
    period_prices = d.get('period_prices', {}) or {}
    cards = d.get('partner_cards', []) or []

    # 렌탈 요금 매트릭스
    fee_matrix = []
    for p in periods:
        base_add = period_prices.get(p, {})
        for c in (cycles or ['기본']):
            add = 0
            if isinstance(base_add, dict):
                add = base_add.get(c, 0)
            elif isinstance(base_add, (int, float)):
                add = base_add
            try: add = int(add)
            except: add = 0
            original = it_price + add
            # 카드사별 최종 체감료
            card_rows = []
            for card in cards:
                benefits = card.get('benefits', []) if isinstance(card, dict) else []
                # benefits 텍스트에서 월 할인액 추출 시도
                disc = 0
                for btxt in benefits:
                    m = re.search(r'([0-9,]+)\s*원', btxt)
                    if m:
                        disc = max(disc, int(m.group(1).replace(',', '')))
                final = original - disc if disc else original
                card_rows.append({
                    'card_company': card.get('name', '') if isinstance(card, dict) else '',
                    'spending_tier': ' / '.join(benefits) if benefits else '',
                    'discount_amount': disc,
                    'final_discounted_fee': final,
                })
            fee_matrix.append({
                'contract_period': p,
                'service_type': '셀프관리' if '셀프' in c else ('방문관리' if '방문' in c else ''),
                'service_cycle': c,
                'original_monthly_fee': original,
                'discounted_monthly_fee': d.get('discount', original) if d.get('discount') else original,
                'cards': card_rows,
            })
    return {
        'url': url,
        'category': cat,
        'brand': d.get('brand', ''),
        'product_name': d.get('title', ''),
        'model_code': d.get('model', ''),
        'colors': d.get('colors', []) or d.get('sizes', []),
        'rental_fee_matrix': fee_matrix,
        'card_promotions': cards,
        'promotion': d.get('promotion', []),
        'detail_images': d.get('detail_images', []),
        'not_available': d.get('not_available', False),
        'price': it_price,
        'raw': {k: d.get(k) for k in ('rental_periods', 'maintenance_cycles', 'period_prices', 'as_period', 'product_type')},
    }

def _snap(results, errors, OUT, t0):
    snap = {
        'total': len(results),
        'errors': len(errors),
        'elapsed_sec': int(time.time() - t0),
        'snapshot': True,
        'products': results,
    }
    json.dump(snap, open(OUT + '.snap', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def main():
    session = get_session()
    results = {}
    errors = []
    total = len(URLS)
    t0 = time.time()
    with open(LOG, 'w', encoding='utf-8') as lf:
        for i, url in enumerate(URLS):
            nu = normalize_url(url)
            try:
                d = crawl_product_detail(session, nu)
                if d.get('error') and not d.get('title'):
                    errors.append({'url': nu, 'reason': d.get('error')})
                    lf.write(f'[{i+1}/{total}] ERR {nu} :: {d.get("error")}\n'); lf.flush()
                    continue
                d['category'] = infer_category(nu, d.get('title'))
                results[nu] = normalize_record(d)
            except Exception as e:
                errors.append({'url': nu, 'reason': str(e)})
                lf.write(f'[{i+1}/{total}] EXC {nu} :: {e}\n'); lf.flush()
            # 진행률 매 건 기록 (경량)
            if (i + 1) % 10 == 0:
                el = time.time() - t0
                lf.write(f'[{i+1}/{total}] OK {len(results)} / ERR {len(errors)} ({el:.0f}s, {el/max(1,i+1):.2f}s/건)\n'); lf.flush()
            # 200건마다 중간 스냅샷
            if (i + 1) % 200 == 0:
                _snap(results, errors, OUT, t0)
            # Rate limit: 요청간 딜레이
            time.sleep(random.uniform(0.3, 0.8))
    # 저장
    out = {
        'total': len(results),
        'by_category': defaultdict(int),
        'errors': errors,
        'products': results,
        'crawled_at': time.strftime('%Y-%m-%d %H:%M:%S'),
    }
    for v in results.values():
        out['by_category'][v['category']] += 1
    out['by_category'] = dict(out['by_category'])
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    el = time.time() - t0
    with open(LOG, 'a', encoding='utf-8') as lf:
        lf.write(f'\n완료: {len(results)}건 / 실패 {len(errors)}건 ({el:.0f}초)\nSAVED: {OUT}\n')
    print(f'DONE {len(results)}건 / {len(errors)}실패 -> {OUT}')

if __name__ == '__main__':
    main()
