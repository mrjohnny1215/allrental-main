import json
import os

input_file = 'merged_products.json'
output_file = 'merged_products_fixed.json'

if not os.path.exists(input_file):
    print(f"❌ {input_file} 파일을 찾을 수 없습니다.")
else:
    try:
        # 깨진 JSON 파일을 텍스트로 읽어서 공백을 정리한 후 다시 파싱
        with open(input_file, 'r', encoding='utf-8') as f:
            raw_text = f.read()
            
        # 불필요한 공백 제거 (예: "no=123 &cid=1377" -> "no=123&cid=1377")
        # JSON 구조를 유지하면서 키와 값의 공백을 정리하는 로직
        # 간단한 방법: json.loads 시 오류가 나므로, 정규식이나 replace로 URL 공백 제거
        import re
        
        # URL 내 공백 제거 (예: ?no=123 &cid=1377 -> ?no=123&cid=1377)
        fixed_text = re.sub(r'(\?no=\d+)\s+(&cid=\d+)', r'\1\2', raw_text)
        fixed_text = re.sub(r'(&cid=\d+)\s+(&gid=\d+)', r'\1\2', fixed_text)
        
        # 키와 값의 공백 제거 (예: "title ": "abc " -> "title": "abc")
        # 이 부분은 json.loads 후 처리하는 것이 안전합니다.
        
        # 먼저 JSON으로 로드 시도
        data = json.loads(fixed_text)
        
        # 데이터 정리 (키/값 공백 제거 및 오류 데이터 필터링)
        cleaned_data = {}
        for url, info in data.items():
            clean_url = url.strip()
            if not clean_url or "오류" in str(info.get('title', '')):
                continue # 오류가 있는 항목은 건너뜁니다.
                
            cleaned_info = {}
            for k, v in info.items():
                clean_key = k.strip()
                if isinstance(v, str):
                    cleaned_info[clean_key] = v.strip()
                elif isinstance(v, list):
                    cleaned_info[clean_key] = [item.strip() for item in v if isinstance(item, str)]
                else:
                    cleaned_info[clean_key] = v
                    
            cleaned_data[clean_url] = cleaned_info
            
        # 정리된 데이터 저장
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
            
        print(f"✅ 정리 완료! 총 {len(cleaned_data)}개 상품이 '{output_file}'에 저장되었습니다.")
        print(f"기존 '{input_file}' 파일을 '{output_file}'로 교체하여 사용하세요.")
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON 파일 형식이 심각하게 깨져 있습니다. 수동 수정이 필요할 수 있습니다.")
        print(f"오류 위치: {e}")