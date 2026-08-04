import json, re, os
ROOT='/opt/data/allrental'

# 기존 정상 493개 (git HEAD)
base=json.load(open(os.path.join(ROOT,'backend','recrawl_all.json'),encoding='utf-8'))
base_by_no={}
for r in base:
    if 'error' in r: continue
    m=re.search(r'no=(\d+)',r.get('url',''))
    if m: base_by_no[m.group(1)]=r

# 새 크롤 2543개 중 정상(period_prices 있거나 title이 Bad Request 아님)만
new=json.load(open(os.path.join(ROOT,'backend','crawl_all_browser.json'),encoding='utf-8'))
new_good=[]
for r in new:
    if 'error' in r: continue
    title=r.get('title','')
    if title=='Bad Request' or 'Bad Request' in title: continue
    if not r.get('rental_periods'): continue
    new_good.append(r)

from urllib.parse import urlparse, parse_qs
CAT_MAP = {
    ('1376',''):'package',('1376','1431'):'washer',('1376','1433'):'washer',('1376','1435'):'robot',('1376','2217'):'package',
    ('1377',''):'water',('1377','1383'):'fridge',('1377','1384'):'kimchi',('1377','1385'):'induction',('1377','1386'):'disposal',('1377','1387'):'dishwasher',('1377','1388'):'ricecooker',('1377','1389'):'ice',('1377','1390'):'coffee',('1377','1391'):'sink',('1377','1392'):'oven',('1377','1424'):'water',('1377','1766'):'wine',('1377','1905'):'freezer',('1377','2237'):'airfryer',
    ('1378',''):'cleaner',('1378','1398'):'washer',('1378','1399'):'dryer',('1378','1400'):'tv',('1378','1401'):'ac',('1378','1402'):'heater',('1378','1403'):'cloth',('1378','1404'):'massage',('1378','1405'):'pet',('1378','1406'):'piano',('1378','1427'):'piano',('1378','1430'):'laptop',('1378','1751'):'styler',('1378','1840'):'printer',('1378','2188'):'cleaner',('1378','2216'):'board',
    ('1379',''):'bidet',('1379','1407'):'air',('1379','1408'):'bidet',('1379','1409'):'water',('1379','1426'):'air',('1379','1767'):'air',('1379','2035'):'air',('1379','2045'):'air',('1379','2064'):'air',
    ('1381',''):'beauty',('1381','1410'):'gym',('1381','1411'):'beauty',('1381','1549'):'sauna',('1381','1844'):'massage',('1381','1897'):'bike',
    ('1486',''):'furniture',('1486','1487'):'mattress',('1486','1488'):'sofa',('1486','1489'):'table',('1486','1580'):'mattress',('1486','2032'):'chair',('1486','2052'):'furniture',
    ('2144',''):'sangjo',('2144','2207'):'sangjo',('2144','2208'):'robot',('2144','2209'):'air',('2144','2212'):'beauty',('2144','2213'):'sofa',('2144','2214'):'robot',
}
def cat_of(u):
    qs=parse_qs(urlparse(u).query)
    cid,gid=qs.get('cid',[''])[0],qs.get('gid',[''])[0]
    return CAT_MAP.get((cid,gid)) or CAT_MAP.get((cid,'')) or 'other'

# 기존 493개를 merged 형태로 (category 보정)
merged={}
for r in base:
    if 'error' in r: continue
    r=dict(r); r['category']=cat_of(r['url'])
    merged[r['url']]=r

added=0
for r in new_good:
    m=re.search(r'no=(\d+)',r.get('url',''))
    if m and m.group(1) not in base_by_no:
        r=dict(r); r['category']=cat_of(r['url'])
        merged[r['url']]=r
        added+=1

print('기존 493개 + 새 정상 추가:',added)
print('최종 merged:',len(merged))

# products_data (4종만)
CAT={'bidet','water','air','mattress'}
products_list=[{'url':u,'category':v.get('category'),'title':v.get('title',''),'it_price':v.get('it_price'),'not_available':v.get('not_available',False)} for u,v in merged.items() if v.get('category') in CAT]
json.dump(merged, open(os.path.join(ROOT,'merged_products.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump(merged, open(os.path.join(ROOT,'public','merged_products.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump(products_list, open(os.path.join(ROOT,'products_data.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=2)
print('products_data(4종):',len(products_list))
for c in CAT:
    print(f'  {c}:',sum(1 for p in products_list if p['category']==c))
