"""렌탈세계 상품 크롤 → merged_products.json + products_data.json 갱신.
검증된 단순 구조 (hang 방지): 매 상품 독립 크롤, 타임아웃 strict."""
import json, sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import requests, urllib3
urllib3.disable_warnings()
import crawl_water, crawl_bidet
import crawl_common

ROOT = os.path.dirname(os.path.dirname(__file__))
PROD = json.load(open(os.path.join(ROOT, 'products_data.json'), encoding='utf-8'))

def norm_url(u):
    return u.replace('https://www.rentalsegye.com', 'https://rentalsegye.com').replace('http://www.rentalsegye.com', 'http://rentalsegye.com')

def water_detail(s, u):
    return crawl_water.crawl_product_detail(s, u)
def bidet_detail(s, u):
    return crawl_bidet.crawl_product_detail(s, u)
def air_detail(s, u):
    return crawl_common.crawl_product_detail(s, u, category='air')
def mattress_detail(s, u):
    return crawl_common.crawl_product_detail(s, u, category='mattress')

mods = {
    'bidet': bidet_detail,
    'water': water_detail,
    'air': air_detail,
    'mattress': mattress_detail,
}

# 기존 merged 로드 (이미 있으면 보존 → it_price 있으면 스킵)
merged_path = os.path.join(ROOT, 'merged_products.json')
if os.path.exists(merged_path):
    merged = json.load(open(merged_path, encoding='utf-8'))
else:
    merged = {}

sess = requests.Session()
total = len(PROD)
done = 0

for item in PROD:
    cat = item['category']
    url = norm_url(item['url'])
    # 이미 it_price 있으면 스킵 (이어하기)
    if merged.get(url, {}).get('it_price'):
        done += 1
        continue
    try:
        d = mods[cat](sess, url)
        d['category'] = cat
    except Exception as e:
        d = {'url': url, 'error': str(e), 'category': cat}
    merged[url] = d
    done += 1
    if done % 10 == 0:
        print(f'  {done}/{total} 완료', flush=True)
    time.sleep(0.3)

# products_data.json url 정규화 반영
for item in PROD:
    item['url'] = norm_url(item['url'])
json.dump(PROD, open(os.path.join(ROOT, 'products_data.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

out = os.path.join(ROOT, 'merged_products.json')
json.dump(merged, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'DONE: {total}개 -> {out}', flush=True)

# 통계
for c in ['bidet', 'water', 'air', 'mattress']:
    items = [v for v in merged.values() if v.get('category') == c]
    n = len(items)
    p = sum(1 for x in items if x.get('rental_periods'))
    cy = sum(1 for x in items if x.get('maintenance_cycles'))
    di = sum(1 for x in items if x.get('detail_images'))
    pr = sum(1 for x in items if x.get('promotion'))
    cd = sum(1 for x in items if x.get('cards'))
    er = sum(1 for x in items if x.get('error'))
    print(f"  [{c}] {n}개 periods={p} cycles={cy} detailImg={di} promo={pr} cards={cd} err={er}", flush=True)
