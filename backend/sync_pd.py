import json
from urllib.parse import urlparse, parse_qs
m=json.load(open('merged_products.json',encoding='utf-8'))
def norm(u):
    q=parse_qs(urlparse(u).query); return q.get('no',[''])[0]
md={norm(u):v for u,v in m.items()}
for f in ['products_data.json','public/products_data.json']:
    p=json.load(open(f,encoding='utf-8'))
    c=0
    for x in p:
        mv=md.get(norm(x.get('url','')))
        if mv and mv.get('image'):
            x['image']=mv['image']; c+=1
    json.dump(p,open(f,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
    print(f,'동기화:',c)
