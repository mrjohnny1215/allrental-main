import json

# 파일 읽기
with open('merged_products.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 공백 제거 함수
def clean_data(obj):
    if isinstance(obj, dict):
        return {k.strip(): clean_data(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_data(item) for item in obj]
    elif isinstance(obj, str):
        return obj.strip()
    else:
        return obj

# 데이터 정리
cleaned_data = clean_data(data)

# 정리된 데이터 저장
with open('merged_products_fixed.json', 'w', encoding='utf-8') as f:
    json.dump(cleaned_data, f, ensure_ascii=False, indent=2)

print("✅ 정리 완료! 'merged_products_fixed.json' 파일이 생성되었습니다.")
print(f"총 {len(cleaned_data)}개의 카테고리")
for category, items in cleaned_data.items():
    print(f"  - {category}: {len(items)}개 상품")
