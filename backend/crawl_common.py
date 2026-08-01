"""
렌탈세계 상품 상세 크롤링 공통 로직.
카테고리별 셀렉터 매핑을 한 곳에서 관리한다.
실제 사이트 구조(2026-08 기준)에 검증됨:
  - 렌탈기간 : input[name="rental_option_1"]
  - 관리주기  (water/bidet/air) : #rental_option_2 (라벨 '관리주기')
  - 색상      (water)           : #rental_supply_1
  - 사이즈    (mattress)        : #rental_option_2 (라벨 '사이즈')
  - 관리유형  (mattress)        : #rental_option_3 (라벨 '관리유형')
  - 제품상세 이미지 : #section-detail 내 img(speedycdn)
  - 제휴카드  : .btn-card-infomation -> AJAX get_card_data.php
  - 프로모션  : span.form-label '프로모션' 근처
"""
import requests
from bs4 import BeautifulSoup
import urllib3
import random

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
]

HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://rentalsegye.com/',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
}

CARD_URL = 'https://rentalsegye.com/theme/tlpartner11/page/get_card_data.php?iid={iid}'


def get_session():
    return requests.Session()


def _opt_texts(sel):
    out = []
    if not sel:
        return out
    for o in sel.find_all('option'):
        v = (o.get('value') or '').strip()
        t = o.get_text(strip=True)
        if v and t and t != '선택':
            out.append(t)
    return out


def crawl_product_detail(session, url, category=None):
    """카테고리별로 정확히 매핑해 상세 정보를 추출한다."""
    try:
        session.headers.update({'User-Agent': random.choice(USER_AGENTS), **HEADERS})
        r = session.get(url, timeout=20, verify=False)
        if r.status_code != 200:
            return {'url': url, 'error': f'HTTP {r.status_code}'}
        r.encoding = 'utf-8'
        soup = BeautifulSoup(r.text, 'html.parser')

        data = {
            'url': url,
            'title': '',
            'model': '',
            'rental_periods': [],
            'maintenance_cycles': [],
            'colors': [],
            'sizes': [],
            'care_types': [],
            'detail_images': [],
            'partner_cards': [],
            'promotion': [],
        }

        # 1. 상품명
        h1 = soup.select_one('h1.product-title') or soup.select_one('h1')
        if h1:
            data['title'] = h1.get_text(strip=True)

        # 2. 모델명
        for row in soup.select('.product-spec-list dl'):
            dt = row.select_one('dt'); dd = row.select_one('dd')
            if dt and dd and '모델명' in dt.get_text(strip=True):
                data['model'] = dd.get_text(strip=True)
                break

        # 3. 렌탈 기간 (공통)
        for opt in soup.select('input[name="rental_option_1"]'):
            v = (opt.get('value') or '').strip()
            if v and v not in data['rental_periods']:
                data['rental_periods'].append(v)

        # 4. 카테고리별 옵션 매핑
        opt2 = soup.select_one('#rental_option_2')
        opt3 = soup.select_one('#rental_option_3')
        opt2_label = ''
        if opt2:
            lbl = soup.find('label', attrs={'for': opt2.get('id')})
            if lbl:
                opt2_label = lbl.get_text(strip=True)

        if category == 'mattress':
            # #rental_option_2 = 사이즈, #rental_option_3 = 관리유형
            data['sizes'] = _opt_texts(opt2)
            data['care_types'] = _opt_texts(opt3)
        else:
            # water/bidet/air : #rental_option_2 = 관리주기
            data['maintenance_cycles'] = _opt_texts(opt2)
            # 색상 (정수기 등) : #rental_supply_1
            supply = soup.select_one('#rental_supply_1')
            if supply:
                for o in supply.find_all('option'):
                    v = (o.get('value') or '').strip()
                    t = o.get_text(strip=True)
                    if v and t and t != '선택':
                        name = v.split(',')[0] if ',' in v else t
                        if name and name not in data['colors']:
                            data['colors'].append(name)

        # 5. 제품상세 이미지 (#section-detail 내 모든 img)
        detail = soup.select_one('#section-detail')
        if detail:
            for img in detail.find_all('img'):
                src = img.get('src') or ''
                if 'speedycdn' in src:
                    data['detail_images'].append(src)

        # 6. 프로모션 (span.form-label '프로모션' 근처)
        promo = soup.find('span', class_='form-label', string=lambda t: t and '프로모션' in t)
        if promo:
            grp = promo.find_next(class_='radio-group') or promo.find_next('div')
            if grp:
                for lbl in grp.find_all('label'):
                    txt = lbl.get_text(strip=True)
                    if txt and txt not in data['promotion']:
                        data['promotion'].append(txt)

        # 7. 제휴카드 (AJAX)
        btn = soup.select_one('.btn-card-infomation')
        if btn:
            iid = btn.get('data-iid', '')
            if iid:
                try:
                    cr = session.get(CARD_URL.format(iid=iid), timeout=15, verify=False)
                    if cr.status_code == 200:
                        csoup = BeautifulSoup(cr.text, 'html.parser')
                        items = csoup.select('.card-item, .partner-card, li, tr')
                        for it in items:
                            t = it.get_text(' ', strip=True)
                            if t and len(t) > 3 and t not in data['partner_cards']:
                                data['partner_cards'].append(t)
                        if not data['partner_cards']:
                            full = csoup.get_text('\n', strip=True)
                            if full:
                                data['partner_cards'].append(full[:300])
                except Exception:
                    pass

        return data
    except Exception as e:
        return {'url': url, 'error': str(e)}
