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
    """매트리스: 공통 로직 위임 (category='mattress')"""
    from crawl_common import crawl_product_detail as _common
    return _common(session, url, category='mattress')

def main():
    print("="*70)
    print("🚀 렌탈세계 [매트리스] 상품 상세 정보 크롤링 시작")
    print("="*70)
    
    csv_file = '매트리스.csv'
    json_file = 'mattress_data.json'
    fail_file = 'failed_매트리스.txt'
    
    session = get_session()
    
    print(f"\n📂 [{csv_file}] 크롤링 시작")
    urls = extract_urls_from_csv(csv_file)
    
    if not urls:
        print(f"  ⚠️ 크롤링을 건너니다. (URL 없음)")
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
            print(f"✅ 성공 (사이즈: {len(data['colors'])}개, 주기: {len(data['maintenance_cycles'])}개)")
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
    print("🎉 매트리스 크롤링 완료!")
    print("="*70)

if __name__ == '__main__':
    main()
