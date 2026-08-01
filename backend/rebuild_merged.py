import json, sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import requests, urllib3
urllib3.disable_warnings()
import crawl_bidet, crawl_water, crawl_air, crawl_mattress

ROOT = os.path.dirname(os.path.dirname(__file__))
PROD = json.load(open(os.path.join(ROOT, 'products_data.json'), encoding='utf-8'))

mods = {
    'bidet': crawl_bidet,
    'water': crawl_water,
    'air': crawl_air,
    'mattress': crawl_mattress,
}

sess = requests.Session()
merged = {}
total = len(PROD)
done = 0
for item in PROD:
    cat = item['category']
    url = item['url']
    try:
        d = mods[cat].crawl_product_detail(sess, url)
        d['category'] = cat  # 통계/프론트용 카테고리 병합
    except Exception as e:
        d = {'url': url, 'error': str(e), 'category': cat}
    merged[url] = d
    done += 1
    if done % 20 == 0:
        print(f'  {done}/{total} 완료', flush=True)
    time.sleep(0.3)

out = os.path.join(ROOT, 'merged_products.json')
json.dump(merged, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'DONE: {total}개 -> {out}', flush=True)

# 통계
for c in ['bidet', 'water', 'air', 'mattress']:
    items = [v for v in merged.values() if v.get('category') == c]
    n = len(items)
    p = sum(1 for x in items if x.get('rental_periods'))
    cy = sum(1 for x in items if x.get('maintenance_cycles'))
    sz = sum(1 for x in items if x.get('sizes'))
    ct = sum(1 for x in items if x.get('care_types'))
    co = sum(1 for x in items if x.get('colors'))
    di = sum(1 for x in items if x.get('detail_images'))
    pr = sum(1 for x in items if x.get('promotion'))
    ca = sum(1 for x in items if x.get('partner_cards'))
    err = sum(1 for x in items if x.get('error'))
    print(f'  [{c}] {n}개 periods={p} cycles={cy} sizes={sz} care={ct} colors={co} detailImg={di} promo={pr} cards={ca} err={err}', flush=True)
