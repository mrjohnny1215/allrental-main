"""
상품 스펙(브랜드/제품종류/AS기간) 재크롤.
- 매 상품 처리 후 즉시 merged_products.json 저장 (중간 결과 보존)
- 400(Blocked) 시 30초 대기 후 해당 상품 재시도
- 딜레이 5초
"""
import json, sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import requests, urllib3
urllib3.disable_warnings()
import crawl_common
import crawl_bidet, crawl_water, crawl_air, crawl_mattress

ROOT = os.path.dirname(os.path.dirname(__file__))
PROD = json.load(open(os.path.join(ROOT, 'products_data.json'), encoding='utf-8'))
merged = json.load(open(os.path.join(ROOT, 'merged_products.json'), encoding='utf-8'))
mods = {'bidet': crawl_bidet, 'water': crawl_water, 'air': crawl_air, 'mattress': crawl_mattress}
OUT = os.path.join(ROOT, 'merged_products.json')

def needs(v):
    if not v or v.get('not_available'): return False
    if not v.get('rental_periods'): return False
    return not (v.get('brand') and v.get('product_type') and v.get('as_period'))

targets = [(url, v) for url, v in merged.items() if needs(v)]
print(f'스펙 재크롤 대상: {len(targets)}개', flush=True)

sess = requests.Session()
fixed = 0
for i, (url, v) in enumerate(targets, 1):
    item = next((p for p in PROD if crawl_common.normalize_url(p['url']) == crawl_common.normalize_url(url)), None)
    if not item: continue
    cat = item['category']
    d = None
    for attempt in range(5):
        try:
            d = mods[cat].crawl_product_detail(sess, url)
            if 'error' not in d:
                break
            # 차단 시 대기
            print(f'  [{i}] 차단({d.get("error")}) → 30초 대기', flush=True)
            time.sleep(30)
        except Exception as e:
            print(f'  [{i}] 예외 {e} → 10초 대기', flush=True)
            time.sleep(10)
    if d and 'error' not in d:
        v['brand'] = d.get('brand') or v.get('brand', '')
        v['product_type'] = d.get('product_type') or v.get('product_type', '')
        v['as_period'] = d.get('as_period') or v.get('as_period', '')
        merged[url] = v
        if v.get('brand') and v.get('product_type') and v.get('as_period'):
            fixed += 1
    # 매 상품 즉시 저장
    json.dump(merged, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if i % 5 == 0:
        print(f'  {i}/{len(targets)} (완전채움 {fixed})', flush=True)
    time.sleep(5)

filled = sum(1 for v in merged.values() if v.get('brand') and v.get('product_type') and v.get('as_period'))
print(f'DONE -> 스펙 완전채움 상품: {filled}개', flush=True)
