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
    """차단 우회를 위한 세션 생성 (400 에러 재시도 제거)"""
    session = requests.Session()
    
    # 400, 403 에러는 재시도하지 않음 (차단 유발 요인)
    retry = Retry(
        total=2,
        backoff_factor=2,
        status_forcelist=[429, 500, 502, 503, 504]
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
    """정수기: 공통 로직 위임 (category='water')"""
    from crawl_common import crawl_product_detail as _common
    return _common(session, url, category='water')

def main():
    print("="*70)
    print("🚀 렌탈세계 [정수기] 상품 상세 정보 크롤링 시작 (차단 우회 모드)")
    print("="*70)
    
    csv_file = '정수기.csv'
    json_file = 'water_data.json'
    fail_file = 'failed_정수기.txt'
    
    print(f"\n📂 [{csv_file}] 크롤링 시작")
    urls = extract_urls_from_csv(csv_file)
    
    if not urls:
        print(f"  ⚠️ 크롤링을 건너뜁니다. (URL 없음)")
        return
        
    print(f"  📊 총 {len(urls)}개 상품 크롤링 예정")
    
    # 초기 세션 생성
    session = get_session()
    
    category_data = []
    success_count = 0
    fail_count = 0
    failed_urls = []
    
    for i, url in enumerate(urls, 1):
        print(f"  [{i}/{len(urls)}] 크롤링 중... ", end="")
        
        # 🛡️ 핵심 1: 20개마다 세션을 완전히 새로 생성하여 차단 해제 유도
        if i > 1 and i % 20 == 0:
            print("\n  🔄 세션 초기화 중... (보안 차단 방지)")
            session.close()
            session = get_session()
            time.sleep(5)  # 세션 변경 시 5초 추가 대기
            
        data = crawl_product_detail(session, url)
        
        if 'error' in data:
            # 🛡️ 핵심 2: 400 에러는 재시도하지 않고 즉시 실패 처리
            if '400' in data['error'] or '403' in data['error']:
                print(f"🚫 차단됨 ({data['error']}) - 다음으로 넘어갑니다.")
            else:
                print(f"❌ 실패 ({data['error']})")
            
            fail_count += 1
            failed_urls.append(url)
        else:
            print(f"✅ 성공 (색상: {len(data['colors'])}개, 주기: {len(data['maintenance_cycles'])}개)")
            category_data.append(data)
            success_count += 1
        
        # 🛡️ 핵심 3: 대기 시간을 4~8초로 늘려 인간적인 패턴 시뮬레이션
        time.sleep(random.uniform(4.0, 8.0))
    
    # 1. JSON 저장 (중간 결과라도 반드시 저장)
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
    print("🎉 정수기 크롤링 완료!")
    print("="*70)

if __name__ == '__main__':
    main()