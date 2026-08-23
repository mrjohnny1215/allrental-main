import requests, re, json
r=requests.get('https://rentalsegye.com/sitemap.xml',timeout=20,verify=False,headers={'User-Agent':'Mozilla/5.0'})
urls=re.findall(r'<loc>([^<]+)</loc>', r.text)
lists=[u.replace('&amp;','&') for u in urls if 'product_list' in u]
json.dump(lists, open('/opt/data/allrental/backend/sitemap_lists.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print('목록 URL:', len(lists),'개')
