import json, re, os
ROOT='/opt/data/allrental'
d=json.load(open(os.path.join(ROOT,'backend','crawl_all_browser.json'),encoding='utf-8'))

def split_name_add(v):
    v=(v or '').strip()
    if ',' in v:
        p=v.split(',')
        name=p[0].strip()
        add=0
        if len(p)>=2 and p[1].strip().isdigit(): add=int(p[1])
        return name, add
    return v, 0

fixed=0
for r in d:
    if 'error' in r: continue
    periods=r.get('rental_periods') or []
    mc=r.get('maintenance_cycles') or []
    sizes=r.get('sizes') or []
    pp=r.get('period_prices') or {}
    # 빈 period_prices (빈 객체 포함) 보강
    need_fix = (not pp) or all(not v for v in pp.values())
    if need_fix:
        combos = mc if mc else (sizes if sizes else ['기본'])
        new_pp={}
        for period in periods:
            new_pp[period]={c:0 for c in combos}
        if not mc and not sizes:
            r['maintenance_cycles']=['기본']
        r['period_prices']=new_pp
        fixed+=1
    # rental_periods 쉼표 제거 (혹시 모르니)
    r['rental_periods']=[split_name_add(p)[0] for p in periods]

json.dump(d, open(os.path.join(ROOT,'backend','crawl_all_browser.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=2)
ok=[r for r in d if 'error' not in r]
pp=sum(1 for r in ok if r.get('period_prices') and any(r['period_prices'].values()))
print('보강:',fixed,'개')
print('period_prices 유효:',pp,'/',len(ok))
