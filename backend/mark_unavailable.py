"""
차단(Blocked)으로 누락된 상품들을 '렌탈 불가/정보 없음'으로 마킹한다.
실제로는 렌탈세계에서 판매 중단된 상품이거나 일시 차단된 것.
프론트에서 빈 모달 대신 안내 배너가 뜨도록 한다.
나중에 차단이 풀리면 rebuild_failed.py 로 실제 데이터를 채우면 된다.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(__file__))
merged = json.load(open(os.path.join(ROOT, 'merged_products.json'), encoding='utf-8'))

n = 0
for url, v in merged.items():
    if 'error' in v or not v.get('rental_periods'):
        merged[url] = {
            'url': url,
            'not_available': True,
            'title': v.get('title', ''),
            'rental_periods': [], 'maintenance_cycles': [], 'colors': [],
            'sizes': [], 'care_types': [], 'detail_images': [], 'partner_cards': [],
            'promotion': [], 'breadcrumb': [], 'recommendations': [],
        }
        n += 1

out = os.path.join(ROOT, 'merged_products.json')
json.dump(merged, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{n}개를 not_available(정보 없음)으로 마킹 완료 -> {out}')
err = sum(1 for v in merged.values() if v.get('error'))
print(f'남은 error: {err}')
