"""
제휴카드 데이터가 문자열 배열(구 크롤러)로 저장된 상품을 올바른
{name, image, benefits} 구조로 재크롤한다.
대상: partner_cards 가 비어있거나, 첫 요소가 dict 가 아닌 상품.
정상 상품(rental_periods 있음)만 대상으로 해서 차단 위험 최소화.
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

def needs_refresh(v):
    if not v or v.get('not_available'): return False
    if not v.get('rental_periods'): return False
    pc = v.get('partner_cards') or []
    # 첫 요소가 dict 가 아니면(문자열 배열) 재크롤
    return len(pc) == 0 or not isinstance(pc[0], dict)

targets = [(url, v) for url, v in merged.items() if needs_refresh(v)]
print(f'제휴카드 재크롤 대상: {len(targets)}개', flush=True)

sess = requests.Session()
fixed = 0
for i, (url, v) in enumerate(targets, 1):
    item = next((p for p in PROD if crawl_common.normalize_url(p['url']) == crawl_common.normalize_url(url)), None)
    cat = item['category'] if item else None
    if not cat:
        continue
    try:
        # crawl_common.crawl_product_detail 가 전체 detail 를 다시 긁음
        d = mods[cat].crawl_product_detail(sess, url, cat)
        # 기존에 있던 다른 필드(periods 등)는 보존하고 partner_cards 만 교체
        if 'error' not in d:
            v['partner_cards'] = d.get('partner_cards', [])
            merged[url] = v
            if isinstance(v['partner_cards'][0], dict) if v['partner_cards'] else False:
                fixed += 1
    except Exception as e:
        pass
    if i % 10 == 0:
        print(f'  {i}/{len(targets)} (구조화 성공 {fixed})', flush=True)
    time.sleep(2.5)

out = os.path.join(ROOT, 'merged_products.json')
json.dump(merged, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# 통계
dict_cards = 0
str_cards = 0
for v in merged.values():
    pc = v.get('partner_cards') or []
    if pc and isinstance(pc[0], dict):
        dict_cards += 1
    elif pc:
        str_cards += 1
print(f'DONE -> 구조화된 제휴카드 상품: {dict_cards}개, 문자열 잔여: {str_cards}개', flush=True)
