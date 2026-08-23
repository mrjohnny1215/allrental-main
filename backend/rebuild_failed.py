"""
에러(Blocked 등)로 누락된 상세 데이터만 재크롤해서 merged_products.json 에 병합한다.
전체를 다시 돌리면 렌탈세계가 또 차단하므로, error 가 있는 항목만 대상으로 한다.
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

mods = {
    'bidet': crawl_bidet,
    'water': crawl_water,
    'air': crawl_air,
    'mattress': crawl_mattress,
}

# error 가 있거나 rental_periods 가 비어있는(실패한) 항목만 대상
failed = [url for url, v in merged.items() if 'error' in v or not v.get('rental_periods')]
print(f'재크롤 대상: {len(failed)}개 (전체 {len(merged)}개 중)', flush=True)

sess = requests.Session()
fixed = 0
for i, url in enumerate(failed, 1):
    # products_data.json 에서 카테고리 찾기
    item = next((p for p in PROD if crawl_common.normalize_url(p['url']) == crawl_common.normalize_url(url)), None)
    cat = item['category'] if item else None
    if not cat:
        # 카테고리 못 찾으면 기존 값 유지
        continue
    try:
        d = mods[cat].crawl_product_detail(sess, url, cat)
        d['category'] = cat
    except Exception as e:
        d = {'url': url, 'error': str(e), 'category': cat}
    merged[url] = d
    if 'error' not in d:
        fixed += 1
    if i % 10 == 0:
        print(f'  {i}/{len(failed)} 처리 (성공 {fixed})', flush=True)
    time.sleep(3.0)  # 차단 방지 딜레이 (0.5 -> 3.0)

out = os.path.join(ROOT, 'merged_products.json')
json.dump(merged, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'DONE: {fixed}/{len(failed)}개 복구 -> {out}', flush=True)

# 통계
err = sum(1 for v in merged.values() if v.get('error'))
di = sum(1 for v in merged.values() if v.get('detail_images'))
rp = sum(1 for v in merged.values() if v.get('rental_periods'))
print(f'  최종 통계: error={err}, rental_periods={rp}/{len(merged)}, detail_images={di}/{len(merged)}', flush=True)
