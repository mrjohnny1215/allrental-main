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
import re

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
            'price': '',
            'discount': '',
            'rental_periods': [],
            'maintenance_cycles': [],
            'colors': [],
            'sizes': [],
            'care_types': [],
            'detail_images': [],
            'partner_cards': [],
            'promotion': [],
            'breadcrumb': [],
            'recommendations': [],
        }

        # 1. 상품명
        h1 = soup.select_one('h1.product-title') or soup.select_one('h1')
        if h1:
            data['title'] = h1.get_text(strip=True)

        # 1-2. 가격 (월 렌탈료 / 할인적용가) — 렌탈세계와 동일하게 단일 기본 월료 표시
        cp = soup.select_one('.card-price-normal') or soup.select_one('.price-normal')
        if cp:
            ptxt = cp.get_text(strip=True).replace(',', '').replace('원', '').strip()
            if ptxt.isdigit():
                data['price'] = int(ptxt)
        dc = soup.select_one('.discount.highlight') or soup.select_one('.card-price.discount')
        if dc:
            dtxt = dc.get_text(strip=True).replace(',', '').replace('원', '').strip()
            if dtxt.isdigit():
                data['discount'] = int(dtxt)

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

        # 7. 제휴카드 (AJAX) — 렌탈세계 UI와 동일하게 카드별 구조화
        btn = soup.select_one('.btn-card-infomation')
        if btn:
            iid = btn.get('data-iid', '')
            if iid:
                try:
                    cr = session.get(CARD_URL.format(iid=iid), timeout=15, verify=False)
                    if cr.status_code == 200:
                        csoup = BeautifulSoup(cr.text, 'html.parser')
                        cont = csoup.select_one('.card-information-container')
                        card_items = cont.select('.card-information-item') if cont else []
                        if card_items:
                            for ci in card_items:
                                img = ci.select_one('.card-information-image img')
                                cname = (img.get('alt') or '').strip() if img else ''
                                if not cname:
                                    nm = ci.select_one('.card-information-name')
                                    cname = nm.get_text(strip=True) if nm else ''
                                if not cname:
                                    cname = ci.get_text(strip=True).split('\n')[0][:30]
                                benefits = [l.strip() for l in ci.get_text('\n', strip=True).split('\n') if l.strip()]
                                # 카드명 줄은 benefits에서 제외
                                benefits = [b for b in benefits if b != cname]
                                rec = {
                                    'name': cname,
                                    'image': ('https:' + img.get('src')) if (img and img.get('src', '').startswith('//')) else (img.get('src') if img else ''),
                                    'benefits': benefits,
                                }
                                if rec['name'] and rec not in data['partner_cards']:
                                    data['partner_cards'].append(rec)
                        else:
                            # 폴백: 일반 텍스트
                            full = csoup.get_text('\n', strip=True)
                            if full:
                                data['partner_cards'].append({'name': '제휴카드', 'image': '', 'benefits': [full[:400]]})
                except Exception:
                    pass

        # 8. 브레드크럼 (HOME > 카테고리 > ...) — 상품명은 제외하고 경로만
        for nav in soup.select('nav, .location, ol, ul'):
            links = [a.get_text(strip=True) for a in nav.find_all('a')]
            txt = nav.get_text(' > ', strip=True)
            if 'HOME' in txt and ('주방' in txt or '정수' in txt or '비데' in txt or '공기' in txt or '가구' in txt or '환경' in txt):
                # HOME 이후 실제 카테고리 경로
                parts = [p.strip() for p in txt.split('>')]
                # 마지막 요소는 상품명이므로 제외
                cats = [p for p in parts if p and p != 'HOME' and not p.startswith('[')]
                if cats:
                    data['breadcrumb'] = cats
                break

        # 9. 추천상품 (자동 회전 캐러셀용) — 상품별 관련 상품 10개
        # '.swiper-wrapper a[href*=product.php]' 패턴 수집
        seen = set()
        for a in soup.select('a[href*="product.php"]'):
            t = a.get_text(' ', strip=True)
            href = a.get('href', '')
            if '월 렌탈료' in t and href and href not in seen:
                seen.add(href)
                # 가격 파싱
                m_price = re.search(r'월 렌탈료\s*([\d,]+)', t)
                m_disc = re.search(r'할인적용\s*([\d,]+)', t)
                img = a.select_one('img')
                name = t.split('월 렌탈료')[0].strip()
                data['recommendations'].append({
                    'name': name,
                    'price': m_price.group(1).replace(',', '') if m_price else '',
                    'discount': (m_disc.group(1).replace(',', '') if m_disc and m_disc.group(1) != '0' else ''),
                    'image': ('https:' + img.get('src')) if (img and img.get('src', '').startswith('//')) else (img.get('src') if img else ''),
                    'url': href if href.startswith('http') else ('https://rentalsegye.com' + href),
                })
                if len(data['recommendations']) >= 12:
                    break

        return data
    except Exception as e:
        return {'url': url, 'error': str(e)}
