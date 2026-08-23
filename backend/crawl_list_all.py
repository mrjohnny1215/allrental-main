import requests, re, json, time, random
from bs4 import BeautifulSoup
from urllib.parse import urlparse, parse_qs
from crawl_common import normalize_url, _extract_iid

CATS = {
    'bidet':    {'cid':'1379','gid':'1408'},
    'water':    {'cid':'1377','gid':'1424'},
    'air':      {'cid':'1379','gid':'1407'},
    'mattress': {'cid':'1486','gid':'1580'},
}

def get_session():
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util import Retry
    s=requests.Session()
    retry=Retry(total=3,backoff_factor=2,status_forcelist=[429,500,502,503,504])
    s.mount('http://',HTTPAdapter(max_retries=retry))
    s.mount('https://',HTTPAdapter(max_retries=retry))
    return s

def collect_list(session, cat):
    c=CATS[cat]
    base=f'https://rentalsegye.com/product_list.php?cid={c["cid"]}&gid={c["gid"]}'
    urls=[]
    page=1
    while True:
        p=base+f'&page={page}' if page>1 else base
        r=session.get(p,timeout=20,verify=False,headers={'User-Agent':random.choice([
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ])})
        if r.status_code!=200:
            print(f'  [{cat}] page {page} HTTP {r.status_code}'); break
        soup=BeautifulSoup(r.text,'html.parser')
        found=0
        for a in soup.select('a[href*="product.php"]'):
            h=a.get('href','')
            if 'no=' in h:
                u=normalize_url(h if h.startswith('http') else 'https://rentalsegye.com'+h)
                if u not in urls:
                    urls.append(u); found+=1
        print(f'  [{cat}] page {page}: +{found} (누적 {len(urls)})')
        if found==0:
            break
        # 다음 페이지 버튼 있는지
        if not soup.select_one('a[href*="page="]') and page>1:
            break
        # 페이지네이션: page=N 링크 중 다음이 없으면 종료
        next_link=soup.find('a',href=re.compile(r'page='+str(page+1)+r'\b'))
        if not next_link:
            # 마지막 페이지면 found가 0이거나 page 링크가 더 없음
            pass
        page+=1
        if page>200: break
        time.sleep(random.uniform(1.0,2.0))
    return urls

if __name__=='__main__':
    s=get_session()
    for cat in CATS:
        print(f'== {cat} 수집 ==')
        urls=collect_list(s,cat)
        print(f'  -> {cat} 총 {len(urls)}개')
        json.dump(urls,open(f'list_{cat}.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
