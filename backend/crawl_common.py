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
import time

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
OPTION_URL = 'https://rentalsegye.com/page/product_option.php'


def get_session():
    return requests.Session()


def normalize_url(u):
    """프론트(App.jsx)와 동일한 URL 정규화."""
    if not u:
        return ''
    return (
        u.replace('https://www.rentalsegye.com', 'https://rentalsegye.com')
        .replace('http://www.rentalsegye.com', 'http://rentalsegye.com')
        .replace('https://rentalsegye.com', 'https://rentalsegye.com')
    )


def _extract_iid(u):
    """URL에서 상품 iid(no 파라미터) 추출."""
    m = re.search(r'[?&]no=(\d+)', u or '')
    if m:
        return m.group(1)
    m = re.search(r'/product\.php/(\d+)', u or '')
    return m.group(1) if m else ''


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


def crawl_product_detail(session, url, category=None, max_retries=3):
    """카테고리별로 정확히 매핑해 상세 정보를 추출한다.

    렌탈세계는 대량 요청 시 일시적으로 HTTP 400(Blocked)를 뱉는다.
    그래서 최대 max_retries 회 재시도(지수 백오프)한다.
    """
    last_err = None
    for attempt in range(max_retries):
        try:
            session.headers.update({'User-Agent': random.choice(USER_AGENTS), **HEADERS})
            r = session.get(url, timeout=(5,8), verify=False)
            if r.status_code == 200:
                break
            last_err = f'HTTP {r.status_code}'
            # 400/429/5xx 는 잠시 뒤 재시도
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt + random.uniform(0.5, 1.5))
                continue
            return {'url': url, 'error': last_err}
        except Exception as e:
            last_err = str(e)
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt + random.uniform(0.5, 1.5))
                continue
            return {'url': url, 'error': last_err}
    else:
        return {'url': url, 'error': last_err or 'unknown'}

    r.encoding = 'utf-8'
    soup = BeautifulSoup(r.text, 'html.parser')

    # 렌탈 불가 상품 판별 ("현재 렌탈중인 상품이 아닙니다" alert 등)
    page_text = r.text
    if '현재 렌탈중인 상품이 아닙니다' in page_text or '렌탈중인 상품이 아닙니다' in page_text:
        return {
            'url': url,
            'not_available': True,
            'title': (soup.select_one('h1.product-title') or soup.select_one('h1')).get_text(strip=True) if (soup.select_one('h1.product-title') or soup.select_one('h1')) else '',
            'rental_periods': [], 'maintenance_cycles': [], 'colors': [],
            'sizes': [], 'care_types': [], 'detail_images': [], 'partner_cards': [],
            'promotion': [], 'breadcrumb': [], 'recommendations': [],
        }

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
        'brand': '',
        'it_price': '',
        'period_prices': {},
        'product_type': '',
        'as_period': '',
    }

    # 1. 상품명
    h1 = soup.select_one('h1.product-title') or soup.select_one('h1')
    if h1:
        data['title'] = h1.get_text(strip=True)

    # 1-2. 가격 (월 렌탈료 / 할인적용가)
    # 렌탈세계 메인 상품 기본가 = input#it_price (추천캐러셀 가격 아님!)
    it_price_el = soup.select_one('input#it_price')
    if it_price_el and it_price_el.get('value'):
        v = it_price_el.get('value').replace(',', '').strip()
        if v.isdigit():
            data['price'] = int(v)
            data['it_price'] = int(v)
    # 할인적용가 (card_sale_amount 차감 또는 별도 표시)
    cs = soup.select_one('input[name=card_sale_amount]')
    if cs and cs.get('value'):
        cv = cs.get('value').replace(',', '').strip()
        if cv.isdigit() and int(cv) > 0:
            # 카드할인 적용가 = 기본가 - card_sale_amount (렌탈세계 방식)
            if data['price']:
                discounted = data['price'] - int(cv)
                data['discount'] = discounted if discounted > 0 else 0
            else:
                data['discount'] = int(cv)

    # 2. 모델명
    for row in soup.select('.product-spec-list dl'):
        dt = row.select_one('dt'); dd = row.select_one('dd')
        if dt and dd and '모델명' in dt.get_text(strip=True):
            data['model'] = dd.get_text(strip=True)
            break

    # 3. 렌탈 기간 (공통)
    # 렌탈세계는 상품마다 value 형태가 다름:
    #   - 단순: "3년"
    #   - 복합: "3년,36500,0" (기간, 기간추가금, 타입)
    # 기간만 clean 하게 저장하고, 기간추가금은 period_prices[기간]={'기본': 추가금} 로 보관
    def _split_period(v):
        v = (v or '').strip()
        if ',' in v:
            parts = v.split(',')
            period = parts[0].strip()
            add = 0
            if len(parts) >= 2 and parts[1].strip().isdigit():
                add = int(parts[1])
            return period, add
        return v, 0

    period_base_add = {}
    for opt in soup.select('input[name="rental_option_1"]'):
        v = (opt.get('value') or '').strip()
        if not v:
            continue
        period, add = _split_period(v)
        if period and period not in data['rental_periods']:
            data['rental_periods'].append(period)
            period_base_add[period] = add

    # 4. 카테고리별 옵션 매핑
    opt2 = soup.select_one('#rental_option_2')
    opt3 = soup.select_one('#rental_option_3')
    opt2_label = ''
    if opt2:
        lbl = soup.find('label', attrs={'for': opt2.get('id')})
        if lbl:
            opt2_label = lbl.get_text(strip=True)

    # 옵션 value 에서 이름만 추출 (렌탈세계는 "이름,추가금,타입" 형태일 수 있음)
    def _opt_names(sel):
        out = []
        if not sel:
            return out
        for o in sel.find_all('option'):
            v = (o.get('value') or '').strip()
            t = o.get_text(strip=True)
            if not v and not t:
                continue
            if t == '선택' or v == '선택':
                continue
            name = v.split(',')[0].strip() if ',' in v else (t or v)
            if name and name not in out:
                out.append(name)
        return out

    if category == 'mattress':
        # #rental_option_2 = 사이즈, #rental_option_3 = 관리유형
        data['sizes'] = _opt_names(opt2)
        data['care_types'] = _opt_names(opt3)
    else:
        # water/bidet/air : #rental_option_2 = 관리주기
        data['maintenance_cycles'] = _opt_names(opt2)
        # 색상 (정수기 등) : #rental_supply_1
        supply = soup.select_one('#rental_supply_1')
        if supply:
            for o in supply.find_all('option'):
                v = (o.get('value') or '').strip()
                t = o.get_text(strip=True)
                if v and t and t != '선택':
                    name = v.split(',')[0].strip() if ',' in v else t
                    if name and name not in data['colors']:
                        data['colors'].append(name)

    # 4-2. 기간별 옵션 추가금 수집 (렌탈세계 실시간 가격 계산용)
    # 렌탈세계: 최종월료 = it_price + 관리주기추가금(기간별 상이)
    # 기간마다 product_option.php AJAX 호출 → 관리주기/사이즈별 추가금 파싱
    try:
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        iid = qs.get('no', [None])[0]
        if iid and data['rental_periods']:
            ref = url
            for period in data['rental_periods']:
                try:
                    post_data = {
                        'iid': iid,
                        'ro_id': period,
                        'ro_idx': '0',
                        'rental_count': '2',
                        'ro_title': ''.join(data['rental_periods']),
                    }
                    pr = session.post(
                        'https://rentalsegye.com/page/product_option.php',
                        data=post_data, timeout=(5,8), verify=False, headers={'Referer': ref, **HEADERS}
                    )
                    if pr.status_code == 200:
                        # option value 형태: "셀프관리,12500,0" or "슈퍼싱글" (추가금 없음)
                        opts = re.findall(r'<option value="([^"]*)">([^<]*)</option>', pr.text)
                        price_map = {}
                        for val, txt in opts:
                            if not val or txt == '선택':
                                continue
                            parts = val.split(',')
                            name = parts[0].strip()
                            add = 0
                            if len(parts) >= 2 and parts[1].strip().isdigit():
                                add = int(parts[1])
                            if name:
                                price_map[name] = add
                        if price_map:
                            data['period_prices'][period] = price_map
                except Exception:
                    continue
    except Exception:
        pass

    # 4-3. period_prices 보강 (UI 가격 계산/관리주기 표시용)
    # (a) AJAX로 채워진 기간은 그대로 유지
    # (b) 비어있는 기간은: 관리주기가 있으면 {관리주기:0}, 없으면 {기본:기간추가금} 로 채움
    for period in data['rental_periods']:
        if period not in data['period_prices'] or not data['period_prices'][period]:
            if data['maintenance_cycles'] or data['sizes']:
                combos = data['maintenance_cycles'] or data['sizes']
                data['period_prices'][period] = {c: 0 for c in combos}
            else:
                data['period_prices'][period] = {'기본': period_base_add.get(period, 0)}
                if '기본' not in data['maintenance_cycles']:
                    data['maintenance_cycles'].append('기본')

    # 5. 제품상세 이미지 — 실제 구조: #section-info / #section-detail 내 speedycdn img
    for sec_id in ('#section-info', '#section-detail'):
        sec = soup.select_one(sec_id)
        if sec:
            for img in sec.find_all('img'):
                src = img.get('src') or ''
                if 'speedycdn' in src or src.startswith('//tlpartner'):
                    full = src if src.startswith('http') else ('https:' + src if src.startswith('//') else src)
                    if full not in data['detail_images']:
                        data['detail_images'].append(full)

    # 5-2. 상품 스펙 (브랜드 / 모델명 / 제품종류 / AS기간) — 렌탈세계 <dl><dt>라벨</dt><dd>값</dd>
    for dl in soup.select('dl'):
        dts = [d.get_text(strip=True) for d in dl.select('dt')]
        dds = [d.get_text(strip=True) for d in dl.select('dd')]
        for dt, dd in zip(dts, dds):
            if not dd:
                continue
            if dt == '브랜드' and not data['brand']:
                data['brand'] = dd
            elif dt == '제품종류' and not data['product_type']:
                data['product_type'] = dd
            elif dt in ('AS기간', 'A/S기간', '사후지원') and not data['as_period']:
                data['as_period'] = dd

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
                cr = session.get(CARD_URL.format(iid=iid), timeout=(5,8), verify=False)
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

    # 10. 약정별 관리주기 추가금 (실시간 금액 계산용)
    # 렌탈세계: 최종월료 = it_price + 관리주기추가금, 관리주기추가금은 기간별 상이
    # 기간 선택 시 AJAX로 옵션 재로드 -> value="이름,추가금,타입"
    if data['rental_periods'] and (data['maintenance_cycles'] or data['sizes']):
        periods = data['rental_periods']
        ro_title = ''.join(periods)
        for period in periods:
            try:
                payload = {
                    'iid': _extract_iid(url),
                    'ro_id': period,
                    'ro_idx': '0',
                    'rental_count': str(len(periods)),
                    'ro_title': ro_title,
                }
                orsp = session.post(OPTION_URL, data=payload, headers=HEADERS, timeout=(5,8), verify=False)
                if orsp.status_code == 200:
                    osoup = BeautifulSoup(orsp.text, 'html.parser')
                    for o in osoup.find_all('option'):
                        val = o.get('value', '')
                        if ',' in val:
                            parts = val.split(',')
                            name = parts[0].strip()
                            add = parts[1].strip() if len(parts) > 1 else '0'
                            if name and add.isdigit():
                                data['period_prices'].setdefault(period, {})[name] = int(add)
            except Exception:
                continue

    return data
