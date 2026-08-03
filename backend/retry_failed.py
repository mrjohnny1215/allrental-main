"""실패한 상품(에러 있음)만 재크롤 — 간격 크게.
렌탈세계 대량요청 차단(400) 우회용."""
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

def water_detail(s, u): return crawl_water.crawl_product_detail(s, u)
def bidet_detail(s, u): return crawl_bidet.crawl_product_detail(s, u)
def air_detail(s, u): return crawl_common.crawl_product_detail(s, u, category='air')
def mattress_detail(s, u): return crawl_common.crawl_product_detail(s, u, category='mattress')

mods = {'bidet': bidet_detail, 'water': water_detail, 'air': air_detail, 'mattress': mattress_detail}

merged_path = os.path.join(ROOT, 'merged_products.json')
merged = json.load(open(merged_path, encoding='utf-8'))

# 에러 있는 항목만
failed = [(u, v['category']) for u, v in merged.items() if v.get('error')]
print(f"재시도 대상: {len(failed)}개", flush=True)

sess = requests.Session()
done = 0
for url, cat in failed:
    try:
        d = mods[cat](sess, url)
        d['category'] = cat
        if d.get('it_price') and not d.get('error'):
            merged[url] = d
            done += 1
            print(f"  성공 {done}/{len(failed)}: {url[:50]}", flush=True)
        else:
            merged[url] = d  # 실패 갱신
    except Exception as e:
        merged[url]['error'] = str(e)
    time.sleep(2.0)  # 간격 크게

json.dump(merged, open(merged_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"DONE: 성공 {done}/{len(failed)}개 복구", flush=True)
for c in ['water','bidet','air','mattress']:
    items=[v for v in merged.values() if v.get('category')==c]
    print(f"  [{c}] {len(items)}개 it_price={sum(1 for x in items if x.get('it_price'))} err={sum(1 for x in items if x.get('error'))}")
