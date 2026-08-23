import json, re, os
from urllib.parse import urlparse, parse_qs
ROOT='/opt/data/allrental'
d=json.load(open(os.path.join(ROOT,'backend','crawl_all_browser.json'),encoding='utf-8'))

def no(u):
    m=re.search(r'no=(\d+)',u or ''); return m.group(1) if m else None
def cid_gid(u):
    qs=parse_qs(urlparse(u).query)
    return qs.get('cid',[''])[0], qs.get('gid',[''])[0]

CAT_MAP = {
    ('1376',''):'package',('1376','1431'):'washer',('1376','1433'):'washer',('1376','1435'):'robot',('1376','2217'):'package',
    ('1377',''):'water',('1377','1383'):'fridge',('1377','1384'):'kimchi',('1377','1385'):'induction',('1377','1386'):'disposal',('1377','1387'):'dishwasher',('1377','1388'):'ricecooker',('1377','1389'):'ice',('1377','1390'):'coffee',('1377','1391'):'sink',('1377','1392'):'oven',('1377','1424'):'water',('1377','1766'):'wine',('1377','1905'):'freezer',('1377','2237'):'airfryer',
    ('1378',''):'cleaner',('1378','1398'):'washer',('1378','1399'):'dryer',('1378','1400'):'tv',('1378','1401'):'ac',('1378','1402'):'heater',('1378','1403'):'cloth',('1378','1404'):'massage',('1378','1405'):'pet',('1378','1406'):'piano',('1378','1427'):'piano',('1378','1430'):'laptop',('1378','1751'):'styler',('1378','1840'):'printer',('1378','2188'):'cleaner',('1378','2216'):'board',
    ('1379',''):'bidet',('1379','1407'):'air',('1379','1408'):'bidet',('1379','1409'):'water',('1379','1426'):'air',('1379','1767'):'air',('1379','2035'):'air',('1379','2045'):'air',('1379','2064'):'air',
    ('1381',''):'beauty',('1381','1410'):'gym',('1381','1411'):'beauty',('1381','1549'):'sauna',('1381','1844'):'massage',('1381','1897'):'bike',
    ('1486',''):'furniture',('1486','1487'):'mattress',('1486','1488'):'sofa',('1486','1489'):'table',('1486','1580'):'mattress',('1486','2032'):'chair',('1486','2052'):'furniture',
    ('2144',''):'sangjo',('2144','2207'):'sangjo',('2144','2208'):'robot',('2144','2209'):'air',('2144','2212'):'beauty',('2144','2213'):'sofa',('2144','2214'):'robot',
}
TARGET={'bidet','water','air','mattress'}

merged={}
products_list=[]
for r in d:
    if 'error' in r: continue
    u=r.get('url','')
    cid,gid=cid_gid(u)
    cat=CAT_MAP.get((cid,gid)) or CAT_MAP.get((cid,'')) or 'other'
    detail={
        'url':u,'title':r.get('title',''),'category':cat,
        'it_price':r.get('it_price',''),
        'rental_periods':r.get('rental_periods',[]),
        'maintenance_cycles':r.get('maintenance_cycles',[]),
        'colors':r.get('colors',[]),'sizes':r.get('sizes',[]),'care_types':r.get('care_types',[]),
        'detail_images':r.get('detail_images',[]),
        'period_prices':r.get('period_prices',{}),
        'not_available':r.get('not_available',False),
        'brand':r.get('brand',''),'model':r.get('model',''),
    }
    merged[u]=detail
    if cat in TARGET:
        products_list.append({'url':u,'category':cat,'title':r.get('title',''),'it_price':r.get('it_price',''),'not_available':r.get('not_available',False)})

# 저장
for f,data in [('merged_products.json',merged),('public/merged_products.json',merged)]:
    json.dump(data, open(os.path.join(ROOT,f),'w',encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump(products_list, open(os.path.join(ROOT,'products_data.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=2)

print('merged:',len(merged),'개 (전체)')
print('products_data(4종):',len(products_list),'개')
for c in TARGET:
    print(f'  {c}:',sum(1 for p in products_list if p['category']==c))
