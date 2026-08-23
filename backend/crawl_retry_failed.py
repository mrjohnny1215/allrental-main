#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 2/3 재시도: 실패 URL 배치 재크롤 + 누적 병합
- 렌탈세계 HTTP 400 차단 대응: 배치(50건)마다 세션 교체 + 긴 대기
- 기존 rental_world_full_latest.json 성공분 보존 + 실패분만 재시도
- 산출물: rental_world_full_latest.json (갱신), retry_failed.log
"""
import json, time, random, sys, os, re
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from crawl_common import crawl_product_detail, get_session, normalize_url

OUT = os.path.join(HERE, 'rental_world_full_latest.json')
LOG = os.path.join(HERE, 'retry_failed.log')
BATCH = 50
BATCH_PAUSE = 20  # 배치间 대기(초)
REQ_MIN, REQ_MAX = 0.5, 1.2  # 요청간 딜레이

# 기존 결과 로드 (성공분 보존)
existing = json.load(open(OUT, encoding='utf-8'))
results = existing.get('products', {})
prev_errors = existing.get('errors', [])
print(f'기존 성공 보존: {len(results)}건', flush=True)

# 실패 URL 추출
fail_urls = [e['url'] for e in prev_errors if e.get('url')]
# 이미 성공한 URL 제외 (중복 방지)
fail_urls = [u for u in fail_urls if normalize_url(u) not in results]
print(f'재시도 대상: {len(fail_urls)}건', flush=True)

def infer_category(url, title):
    t = (title or '')
    for cat, kws in [('water',['정수','삼투','얼음냉','청수']),('air',['공기청정','에어로','퓨리케어','클리어']),
                     ('bidet',['비데']),('mattress',['매트리스','침대','드림']),('washer',['세탁','건조']),
                     ('robot',['로봇청소','청소로봇']),('package',['패키지','꿀조합','세트'])]:
        if any(k in t for k in kws): return cat
    return 'unknown'

def normalize_record(d):
    url = d.get('url','')
    cat = d.get('category') or infer_category(url, d.get('title'))
    it_price = d.get('it_price') or d.get('price') or 0
    try: it_price = int(it_price)
    except: it_price = 0
    periods = d.get('rental_periods',[]) or []
    cycles = d.get('maintenance_cycles',[]) or d.get('sizes',[]) or []
    period_prices = d.get('period_prices',{}) or {}
    cards = d.get('partner_cards',[]) or []
    fee_matrix=[]
    for p in periods:
        base_add = period_prices.get(p,{})
        for c in (cycles or ['기본']):
            add=0
            if isinstance(base_add,dict): add=base_add.get(c,0)
            elif isinstance(base_add,(int,float)): add=base_add
            try: add=int(add)
            except: add=0
            original=it_price+add
            card_rows=[]
            for card in cards:
                benefits=card.get('benefits',[]) if isinstance(card,dict) else []
                disc=0
                for btxt in benefits:
                    m=re.search(r'([0-9,]+)\s*원',btxt)
                    if m: disc=max(disc,int(m.group(1).replace(',','')))
                final=original-disc if disc else original
                card_rows.append({'card_company':card.get('name','') if isinstance(card,dict) else '',
                                  'spending_tier':' / '.join(benefits) if benefits else '',
                                  'discount_amount':disc,'final_discounted_fee':final})
            fee_matrix.append({'contract_period':p,
                'service_type':'셀프관리' if '셀프' in c else ('방문관리' if '방문' in c else ''),
                'service_cycle':c,'original_monthly_fee':original,
                'discounted_monthly_fee':d.get('discount',original) if d.get('discount') else original,
                'cards':card_rows})
    return {'url':url,'category':cat,'brand':d.get('brand',''),'product_name':d.get('title',''),
        'model_code':d.get('model',''),'colors':d.get('colors',[]) or d.get('sizes',[]),
        'rental_fee_matrix':fee_matrix,'card_promotions':cards,'promotion':d.get('promotion',[]),
        'detail_images':d.get('detail_images',[]),'not_available':d.get('not_available',False),
        'price':it_price,'raw':{k:d.get(k) for k in ('rental_periods','maintenance_cycles','period_prices','as_period','product_type')}}

new_ok=0; still_fail=[]
total=len(fail_urls); t0=time.time()
with open(LOG,'w',encoding='utf-8') as lf:
    for bi in range(0, total, BATCH):
        batch = fail_urls[bi:bi+BATCH]
        # 배치마다 새 세션 (IP는 같지만 쿠키/헤더 리셋)
        session = get_session()
        for url in batch:
            nu = normalize_url(url)
            if nu in results:  # 이미 있으면 스킵
                continue
            try:
                d = crawl_product_detail(session, nu)
                if d.get('error') and not d.get('title'):
                    still_fail.append({'url':nu,'reason':d.get('error')})
                    lf.write(f'FAIL {nu} :: {d.get("error")}\n'); lf.flush()
                    continue
                d['category']=infer_category(nu,d.get('title'))
                results[nu]=normalize_record(d)
                new_ok+=1
            except Exception as e:
                still_fail.append({'url':nu,'reason':str(e)})
                lf.write(f'EXC {nu} :: {e}\n'); lf.flush()
            time.sleep(random.uniform(REQ_MIN,REQ_MAX))
            # 진행률 매 10건 기록
            done_in_batch = sum(1 for _ in batch[:batch.index(url)+1]) if url in batch else 0
            if (bi + batch.index(url) + 1) % 10 == 0 or url == batch[-1]:
                el=time.time()-t0
                lf.write(f'[진행 {bi + batch.index(url) + 1}/{total}] 신규 {new_ok} / 실패 {len(still_fail)} ({el:.0f}s, {el/max(1,bi+batch.index(url)+1):.2f}s/건)\n'); lf.flush()
        # 배치 완료 후 긴 대기 (차단 회피)
        el=time.time()-t0
        lf.write(f'[batch {bi//BATCH+1}] 완료: 신규 {new_ok}건 / 잔여실패 {len(still_fail)} / 경과 {el:.0f}s\n'); lf.flush()
        if bi+BATCH < total:
            time.sleep(BATCH_PAUSE)

# 병합 저장
out={'total':len(results),'by_category':defaultdict(int),'errors':still_fail,
     'products':results,'crawled_at':time.strftime('%Y-%m-%d %H:%M:%S'),'retry':True}
for v in results.values(): out['by_category'][v['category']]+=1
out['by_category']=dict(out['by_category'])
json.dump(out, open(OUT,'w',encoding='utf-8'), ensure_ascii=False, indent=1)
el=time.time()-t0
print(f'DONE 재시도: 신규 {new_ok}건 / 잔여실패 {len(still_fail)}건 / 총성공 {len(results)}건 ({el:.0f}s) -> {OUT}', flush=True)
