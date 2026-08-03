import json, re, os
from urllib.parse import urlparse, parse_qs
ROOT='/opt/data/allrental'
existing = json.load(open(os.path.join(ROOT,'products_data.json'),encoding='utf-8'))
merged = json.load(open(os.path.join(ROOT,'merged_products.json'),encoding='utf-8'))

def norm(u):
    u=(u or '').replace('https://www.rentalsegye.com','https://rentalsegye.com')
    return u
def no(u):
    m=re.search(r'no=(\d+)',u or ''); return m.group(1) if m else None

# 기존 category 맵
cat_map={norm(p['url']): p.get('category') for p in existing}

# 4카테고리만
TARGET={'bidet':'비데','water':'정수기','air':'공기청정기','mattress':'매트리스'}
out={c:[] for c in TARGET}

for url, det in merged.items():
    cat=cat_map.get(norm(url))
    if cat not in TARGET: continue
    # 약정별 금액 계산
    period_prices=det.get('period_prices') or {}
    it_price=det.get('it_price') or det.get('price') or 0
    # 약정(렌탈기간) × 관리주기 조합 월료
    contracts=[]
    for period, cycle_map in period_prices.items():
        for cycle, add in cycle_map.items():
            monthly = (it_price if isinstance(it_price,int) else 0) + (add if isinstance(add,int) else 0)
            contracts.append({'rental_period':period,'maintenance_cycle':cycle,'monthly_fee':monthly})
    rec={
        'url':url,
        'title':det.get('title',''),
        'brand':det.get('brand',''),
        'model':det.get('model',''),
        'product_type':det.get('product_type',''),
        'as_period':det.get('as_period',''),
        'base_price':it_price,
        'discount_price':det.get('discount',''),
        'rental_periods':det.get('rental_periods',[]),
        'maintenance_cycles':det.get('maintenance_cycles',[]),
        'colors':det.get('colors',[]),
        'sizes':det.get('sizes',[]),
        'care_types':det.get('care_types',[]),
        'detail_images':det.get('detail_images',[]),
        'partner_cards':det.get('partner_cards',[]),
        'promotion':det.get('promotion',[]),
        'recommendations':det.get('recommendations',[]),
        'contracts':contracts,  # 약정별 금액
        'not_available':det.get('not_available',False),
    }
    out[cat].append(rec)

# 저장
for c in TARGET:
    json.dump(out[c], open(os.path.join(ROOT,'backend',f'all_{c}.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'{TARGET[c]}({c}): {len(out[c])}개')

# 통합 단일 JSON
combined={'generated_at':'rentalsegye full crawl','categories':{c:TARGET[c] for c in TARGET},'counts':{c:len(out[c]) for c in TARGET},'products':out}
json.dump(combined, open(os.path.join(ROOT,'backend','rentalsegye_all_products.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=2)
print('\n통합 JSON: rentalsegye_all_products.json')
print('총:', sum(len(v) for v in out.values()),'개')
