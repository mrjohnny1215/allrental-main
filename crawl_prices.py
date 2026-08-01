import requests
from bs4 import BeautifulSoup
import csv
import time
import json
import os

# 렌탈세계 상품 URL 패턴
BASE_URL = "https://rentalsegye.com"

# CSV 파일 목록c
CSV_FILES = ['비데.csv', '정수기.csv', '공기청정기.csv', '매트리스.csv']

# 요청 헤더 (브라우저처럼 보이게)
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
}

def crawl_product_price(url):
    """상품 상세 페이지에서 약정별 가격 크롤링"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 약정 택 옵션 찾기 (보통 select 태그나 button으로 구현됨)
        prices = {
            '3년': None,
            '5년': None,
            '6년': None
        }
        
        # 방법 1: 약정 선택 드롭다운에서 가격 추출
        select_elements = soup.find_all('select')
        for select in select_elements:
            if '약정' in select.get('name', '') or 'period' in select.get('name', '').lower():
                options = select.find_all('option')
                for option in options:
                    value = option.get('value', '')
                    text = option.text.strip()
                    if '3년' in text:
                        prices['3년'] = extract_price_from_option(option)
                    elif '5년' in text:
                        prices['5년'] = extract_price_from_option(option)
                    elif '6년' in text:
                        prices['6년'] = extract_price_from_option(option)
        
        # 방법 2: AJAX로 가격 정보 가져오기 (렌탈세계가 동적으로 가격을 변경하는 경우)
        if not any(prices.values()):
            prices = crawl_prices_via_ajax(url, soup)
        
        return prices
        
    except Exception as e:
        print(f"  ❌ 크롤링 실패: {e}")
        return {'3년': None, '5년': None, '6년': None}

def extract_price_from_option(option):
    """옵션에서 가격 추출"""
    # data-price 속성이나 텍스트에서 가격 추출
    price = option.get('data-price', '')
    if not price:
        # 텍스트에서 숫자만 추출
        import re
        match = re.search(r'[\d,]+', option.text)
        if match:
            price = match.group()
    return price if price else None

def crawl_prices_via_ajax(url, soup):
    """AJAX 요청으로 가격 정보 가져오기"""
    prices = {'3년': None, '5년': None, '6년': None}
    
    # 상품 번호 추출
    import re
    match = re.search(r'no=(\d+)', url)
    if not match:
        return prices
    
    product_no = match.group(1)
    
    # 렌탈세계 가격 조회 API (예시 - 실제 URL은 개발자 도구로 확인 필요)
    ajax_url = f"{BASE_URL}/ajax/price.php?no={product_no}"
    
    try:
        response = requests.get(ajax_url, headers=HEADERS, timeout=10)
        data = response.json()
        
        # 응답 구조에 따라 조정 필요
        if 'prices' in data:
            for period, price in data['prices'].items():
                if period in prices:
                    prices[period] = price
        
    except Exception as e:
        print(f"  ⚠️ AJAX 요청 실패: {e}")
    
    return prices

def process_csv_file(csv_file):
    """CSV 파일 처리 및 가격 정보 추가"""
    if not os.path.exists(csv_file):
        print(f"❌ 파일 없음: {csv_file}")
        return
    
    print(f"\n📂 처리 중: {csv_file}")
    
    # 원본 CSV 읽기
    products = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            products.append(row)
    
    print(f"  총 {len(products)}개 상품")
    
    # 각 상품 가격 크롤링
    for i, product in enumerate(products, 1):
        url = product.get('product-card href', '')
        if not url:
            continue
        
        print(f"  [{i}/{len(products)}] {product.get('card-desc', 'Unknown')}")
        
        # 가격 크롤링
        prices = crawl_product_price(url)
        
        # CSV에 컬럼 추가
        product['contract_36'] = prices.get('3년', '')
        product['contract_48'] = prices.get('5년', '')
        product['contract_60'] = prices.get('6년', '')
        
        # 1초 대기 (서버 부하 방지)
        time.sleep(1)
    
    # 수정된 CSV 저장
    output_file = csv_file.replace('.csv', '_updated.csv')
    fieldnames = list(products[0].keys()) if products else []
    
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(products)
    
    print(f"  ✅ 저장 완료: {output_file}")

def main():
    """메인 실행"""
    print("🚀 렌탈세계 약정별 가격 크롤링 시작")
    print("=" * 50)
    
    for csv_file in CSV_FILES:
        process_csv_file(csv_file)
    
    print("\n" + "=" * 50)
    print("✅ 모든 CSV 파일 처리 완료!")
    print("\n📝 생성된 파일:")
    for csv_file in CSV_FILES:
        output_file = csv_file.replace('.csv', '_updated.csv')
        if os.path.exists(output_file):
            print(f"  - {output_file}")

if __name__ == '__main__':
    main()