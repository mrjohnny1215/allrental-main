#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 2/3 정밀수집(B): 전체 2543건 옵션 조합 순회로 요금 매트릭스 완전 채움
- 기간(rental_option_1) × 관리주기/사이즈(rental_option_2) 모든 조합을
  product_option.php AJAX로 순회하여 추가금(옵션 value 콤마분리) 캡처
- 최종월료 = it_price + Σ(옵션추가금)
- 배치(30건)마다 세션교체 + 대기(차단회피)
- 산출물: rental_world_full_precise.json (별도 보관, 기존 병합용)
"""
import json, time, random, sys, os, re, requests
from collections import defaultdict
from crawl_common import get_session, normalize_url, _extract_iid

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'rental_world_full_latest.json')
OUT = os.path.join(HERE, 'rental_world_full_precise.json')
LOG = os.path.join(HERE, 'precise_crawl.log')
BATCH = 30
BATCH_PAUSE = 15
REQ_MIN, REQ_MAX = 0.4, 1.0

requests.packages.urllib3.disable_warnings()
import bs4

def get_options(session, iid, period, periods):
    """기간 선택 시 관리주기/사이즈 옵션 목록 AJAX"""
    try:
        post = {'iid': iid, 'ro_id': period, 'ro_idx': '0',
                'rental_count': str(len(periods)), 'ro_title': ''.join(periods)}
        r = session.post('https://rentalsegye.com/page/product_option.php',
                         data=post, timeout=(5,8), verify=False)
        if r.status_code == 200:
            soup = bs4.BeautifulSoup(r.text, 'html.parser')
            opts = []
            for o in soup.find_all('option'):
                v = (o.get('value') or '').strip()
                t = o.get_text(strip=True)
                if not v or t == '선택':
                    continue
                # value 형태: "방문관리/4개월" 또는 "방문관리/4개월,12500,0"
                name = v.split(',')[0].strip()
                add = 0
                if ',' in v:
                    parts = v.split(',')
                    if len(parts) >= 2 and parts[1].strip().isdigit():
                        add = int(parts[1])
                if name:
                    opts.append((name, add))
            return opts
    except Exception:
        pass
    return []

def main():
    src = json.load(open(SRC, encoding='utf-8'))
    prods = src['products']
    urls = list(prods.keys())
    results = {}
    errors = []
    total = len(urls)
    t0 = time.time()
    with open(LOG, 'w', encoding='utf-8') as lf:
        for bi in range(0, total, BATCH):
            batch = urls[bi:bi+BATCH]
            session = get_session()
            for url in batch:
                nu = normalize_url(url)
                rec = prods.get(nu, {})
                iid = _extract_iid(url)
                it_price = rec.get('price') or 0
                try: it_price = int(it_price)
                except: it_price = 0
                periods = rec.get('raw', {}).get('rental_periods') or []
                if not iid or not periods:
                    results[nu] = rec
                    continue
                # 각 기간별 관리주기 옵션 수집
                matrix = []
                ok = True
                for p in periods:
                    opts = get_options(session, iid, p, periods)
                    if not opts:
                        ok = False
                    for name, add in opts:
                        original = it_price + add
                        matrix.append({
                            'contract_period': p,
                            'service_type': '셀프관리' if '셀프' in name else ('방문관리' if '방문' in name else ''),
                            'service_cycle': name,
                            'original_monthly_fee': original,
                            'option_add': add,
                            'discounted_monthly_fee': rec.get('discount') or original,
                        })
                    time.sleep(random.uniform(REQ_MIN, REQ_MAX))
                rec = dict(rec)
                rec['rental_fee_matrix'] = matrix
                rec['precise'] = ok
                results[nu] = rec
                if not ok:
                    errors.append({'url': nu, 'reason': '옵션수집누락'})
            el = time.time() - t0
            lf.write(f'[batch {bi//BATCH+1}/{total//BATCH+1}] {bi+BATCH}/{total} 완료 ({el:.0f}s)\n'); lf.flush()
            if bi + BATCH < total:
                time.sleep(BATCH_PAUSE)
    out = {'total': len(results), 'by_category': defaultdict(int), 'errors': errors,
           'products': results, 'crawled_at': time.strftime('%Y-%m-%d %H:%M:%S'), 'precise': True}
    for v in results.values():
        out['by_category'][v.get('category', 'unknown')] += 1
    out['by_category'] = dict(out['by_category'])
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    el = time.time() - t0
    print(f'DONE 정밀수집: {len(results)}건 / 옵션누락 {len(errors)}건 ({el:.0f}s) -> {OUT}', flush=True)

if __name__ == '__main__':
    main()
