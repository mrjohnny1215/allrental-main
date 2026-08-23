#!/usr/bin/env python3
# 0원 상품(13건 LG 공기청정기) 실제 렌탈세계 최저 월 렌탈료로 보강
import json, urllib.request, ssl, re

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
H = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

ZERO_MODELS = {
    'AS195DWWA': 22900, 'AS155GWDL': 23900, 'AS305DWWA': 31900, 'AS065CWHA': 30900,
    'AS065PWHA': 18500, 'AS206NGHA': 39100, 'AS285DWWA': 29600, 'FS065PSKA': 32400,
    'AS186LSAA': 21500, 'AS186LSAAW': 22600, 'AS186LSAAS': 25900, 'AS356NGMA': 52200,
    'AS356NSMA': 52200,
}

def fetch_real(url):
    req = urllib.request.Request(url, headers=H)
    html = urllib.request.urlopen(req, timeout=25, context=ctx).read().decode('utf-8', 'replace')
    ok = bool(re.search(r'<h1[^>]*class="[^"]*product-title', html))
    if not ok:
        return None  # 차단/리다이렉트 -> 건드리지 않음
    box = re.search(r'product-price-box(.*?)</div>', html, re.S)
    nums = re.findall(r'([0-9][0-9,]{2,})', box.group(1)) if box else []
    return int(nums[0].replace(',', '')) if nums else None

paths = ['/opt/data/allrental/products_data.json',
         '/opt/data/allrental/public/products_data.json']
for path in paths:
    arr = json.load(open(path, encoding='utf-8'))
    fixed = 0
    for p in arr:
        m = (p.get('model') or '').strip().upper()
        if m in ZERO_MODELS and p.get('price') in (0, '0', '0원', None, ''):
            real = fetch_real(p.get('url'))
            val = real if real else ZERO_MODELS[m]
            if real:
                print(f"  LIVE {m}: {val:,}원 (렌탈세계 실측)")
            else:
                print(f"  FALLBACK {m}: {val:,}원 (크롤실패->기보관값)")
            p['price'] = val
            p['it_price'] = val
            fixed += 1
    json.dump(arr, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"[{path}] 0원->실제금액 보강 {fixed}건")
print('DONE')
