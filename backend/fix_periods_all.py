import json, os
ROOT = '/opt/data/allrental'
files = ['merged_products.json', 'public/merged_products.json']
for f in files:
    path = os.path.join(ROOT, f)
    if not os.path.exists(path):
        print('skip', f); continue
    d = json.load(open(path, encoding='utf-8'))
    fixed1 = 0; fixed2 = 0
    for url, v in d.items():
        rp = v.get('rental_periods') or []
        # 1) 쉼표 포함 기간 파싱
        if any(',' in str(x) for x in rp):
            new_periods = []; period_prices = {}
            for item in rp:
                item = str(item)
                if ',' in item:
                    parts = item.split(',')
                    period = parts[0].strip()
                    add = int(parts[1]) if len(parts)>1 and parts[1].strip().isdigit() else 0
                    new_periods.append(period); period_prices[period] = {'기본관리': add}
                else:
                    new_periods.append(item); period_prices.setdefault(item, {})
            v['rental_periods'] = new_periods
            v['period_prices'] = period_prices
            if not v.get('maintenance_cycles'): v['maintenance_cycles'] = ['기본관리']
            fixed1 += 1
        # 2) 기간/관리주기 있는데 period_prices 비면 채움
        elif (v.get('rental_periods') and (v.get('maintenance_cycles') or v.get('rental_periods'))) and not v.get('period_prices'):
            mc = v.get('maintenance_cycles') or ['기본관리']
            v['period_prices'] = {p: {c: 0 for c in mc} for p in v['rental_periods']}
            if not v.get('maintenance_cycles'): v['maintenance_cycles'] = ['기본관리']
            fixed2 += 1
    json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'{f}: 기간파싱 {fixed1}개 + 빈값채움 {fixed2}개 보정')
