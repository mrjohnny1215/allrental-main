import requests
from bs4 import BeautifulSoup
import json
import time
import csv
import urllib3
import random
import os
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

# SSL 경고 무시
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 랜덤 User-Agent 목록 (차단 회피용)
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
]

def get_session():
    """강화된 재시도 로직이 포함된 세션 생성"""
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=3,  # 재시도 대기 시간 증가 (3초, 9초, 27초)
        status_forcelist=[400, 403, 429, 500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

def extract_urls_from_csv(filename):
    """CSV 파일에서 URL만 추출"""
    urls = []
    if not os.path.exists(filename):
        print(f"⚠️ 파일을 찾을 수 없습니다: {filename}")
        return urls
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            for row in reader:
                if row and len(row) > 0:
                    url = row[0].strip().strip('"')
                    if 'http' in url and 'rentalsegye.com' in url:
                        urls.append(url)
        print(f"  ✅ {len(urls)}개 URL 추출 완료")
    except Exception as e:
        print(f"  ❌ {filename} 읽기 오류: {e}")
    
    # 중복 제거 및 순서 랜덤화 (차단 방지)
    return list(dict.fromkeys(urls))

def crawl_product_detail(session, url):
    """상품 상세 페이지에서 모든 정보 추출"""
    try:
        # 요청마다 랜덤 User-Agent 적용
        session.headers.update({
            'User-Agent': random.choice(USER_AGENTS),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://rentalsegye.com/',
        })
        
        response = session.get(url, timeout=20, verify=False)
        if response.status_code != 200:
            return {'url': url, 'error': f'HTTP {response.status_code}'}

        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        product_data = {
            'url': url,
            'title': '',
            'model': '',
            'rental_periods': [],
            'maintenance_cycles': [],
            'colors': [],
            'partner_cards': [],
            'promotion': []
        }
        
        # 1. 상품명 추출
        title_el = soup.select_one('h1.product-title') or soup.select_one('h1')
        if title_el:
            product_data['title'] = title_el.get_text(strip=True)
        
        # 2. 모델명 추출
        spec_rows = soup.select('.product-spec-list dl')
        for row in spec_rows:
            dt = row.select_one('dt')
            dd = row.select_one('dd')
            if dt and dd:
                label = dt.get_text(strip=True)
                value = dd.get_text(strip=True)
                if '모델명' in label:
                    product_data['model'] = value

        # 3. 렌탈 기간 추출
        rental_options = soup.select('input[name="rental_option_1"]')
        for option in rental_options:
            value = option.get('value', '').strip()
            if value:
                product_data['rental_periods'].append(value)

        # 4. 관리 주기 추출
        cycle_select = soup.select_one('#rental_option_2')
        if cycle_select:
            for option in cycle_select.find_all('option'):
                value = option.get('value', '').strip()
                text = option.get_text(strip=True)
                if value and text != '선택':
                    product_data['maintenance_cycles'].append(text)

        # 5. 색상/사이즈 추출 (여러 가능한 셀렉트 id/class를 모두 시도)
        color_found = False
        candidate_ids = [
            '#rental_supply_1', '#rental_supply_2', '#rental_supply_3',
            '#rental_option_3', '#rental_option_4',
            '#product_color', '#product_option_color',
        ]
        for cid in candidate_ids:
            sel = soup.select_one(cid)
            if sel:
                for option in sel.find_all('option'):
                    value = option.get('value', '').strip()
                    text = option.get_text(strip=True)
                    if value and text and text != '선택':
                        color_name = value.split(',')[0] if ',' in value else text
                        if color_name and color_name not in product_data['colors']:
                            product_data['colors'].append(color_name)
                            color_found = True

        if not color_found:
            for label in soup.select('label'):
                lbl_text = label.get_text(strip=True)
                if '색상' in lbl_text or '컬러' in lbl_text or 'color' in lbl_text.lower():
                    sel = label.find_next('select')
                    if sel:
                        for option in sel.find_all('option'):
                            value = option.get('value', '').strip()
                            text = option.get_text(strip=True)
                            if value and text and text != '선택':
                                color_name = value.split(',')[0] if ',' in value else text
                                if color_name and color_name not in product_data['colors']:
                                    product_data['colors'].append(color_name)

        # 5-3. 프로모션 추출 (<span class="form-label">프로모션</span> 다음 radio-group)
        promo_label = soup.find('span', class_='form-label', string=lambda t: t and '프로모션' in t)
        if promo_label:
            group = promo_label.find_next(class_='radio-group') or promo_label.find_next('div')
            if group:
                for lbl in group.find_all('label'):
                    txt = lbl.get_text(strip=True)
                    if txt and txt not in product_data['promotion']:
                        product_data['promotion'].append(txt)

        # 6. 제휴카드 안내 추출 (AJAX)
        card_button = soup.select_one('.btn-card-infomation')
        if card_button:
            iid = card_button.get('data-iid', '')
            if iid:
                card_url = f'https://rentalsegye.com/theme/tlpartner11/page/get_card_data.php?iid={iid}'
                try:
                    card_response = session.get(card_url, timeout=15, verify=False)
                    if card_response.status_code == 200:
                        card_soup = BeautifulSoup(card_response.text, 'html.parser')
                        card_items = card_soup.select('.card-item, .partner-card, li, tr')
                        for item in card_items:
                            text = item.get_text(' ', strip=True)
                            if text and len(text) > 3 and text not in product_data['partner_cards']:
                                product_data['partner_cards'].append(text)
                        
                        if not product_data['partner_cards']:
                            full_text = card_soup.get_text('\n', strip=True)
                            if full_text:
                                product_data['partner_cards'].append(full_text[:300])
                except Exception:
                    pass

        return product_data
        
    except Exception as e:
        return {'url': url, 'error': str(e)}

def main():
    print("="*70)
    print("🚀 렌탈세계 [공기청정기] 상품 상세 정보 크롤링 시작")
    print("="*70)
    
    csv_file = '공기청정기.csv'
    json_file = 'air_data.json'
    fail_file = 'failed_공기청정기.txt'
    
    session = get_session()
    
    print(f"\n📂 [{csv_file}] 크롤링 시작")
    urls = extract_urls_from_csv(csv_file)
    
    if not urls:
        print(f"  ⚠️ 크롤링을 건너뜁니다. (URL 없음)")
        return
        
    print(f"  📊 총 {len(urls)}개 상품 크롤링 예정")
    
    category_data = []
    success_count = 0
    fail_count = 0
    failed_urls = []
    
    for i, url in enumerate(urls, 1):
        print(f"  [{i}/{len(urls)}] 크롤링 중... ", end="")
        
        data = crawl_product_detail(session, url)
        
        if 'error' in data:
            print(f"❌ 실패 ({data['error']})")
            fail_count += 1
            failed_urls.append(url)
        else:
            print(f"✅ 성공 (색상: {len(data['colors'])}개, 주기: {len(data['maintenance_cycles'])}개)")
            category_data.append(data)
            success_count += 1
        
        # 서버 부하 방지 (2~4초 랜덤 대기)
        time.sleep(random.uniform(2.0, 4.0))
    
    # 1. JSON 저장
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(category_data, f, ensure_ascii=False, indent=2)
    print(f"\n  💾 데이터 저장 완료: {json_file}")
    
    # 2. 실패한 URL 저장
    if failed_urls:
        with open(fail_file, 'w', encoding='utf-8') as f:
            for url in failed_urls:
                f.write(url + '\n')
        print(f"  ⚠️ 실패한 URL {len(failed_urls)}개를 '{fail_file}'에 저장했습니다.")
    
    print(f"\n  📊 결과: 성공 {success_count}개 / 실패 {fail_count}개")
    print("\n" + "="*70)
    print("🎉 공기청정기 크롤링 완료!")
    print("="*70)

if __name__ == '__main__':
    main()
