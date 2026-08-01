import json
import os

# 병합할 파일 목록
files = {
    'bidet': 'bidet_data.json',
    'water': 'water_data.json',
    'air': 'air_data.json',
    'mattress': 'mattress_data.json'
}

merged_data = {}

for category, filename in files.items():
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # URL을 키로 하는 딕셔너리로 변환 (빠른 조회용)
            merged_data[category] = {item['url']: item for item in data}
        print(f"✅ {filename} 병합 완료")
    else:
        print(f"⚠️ {filename} 파일을 찾을 수 없습니다.")

# 최종 병합 파일 저장
with open('merged_products.json', 'w', encoding='utf-8') as f:
    json.dump(merged_data, f, ensure_ascii=False, indent=2)

print("\n🎉 merged_products.json 생성 완료!")
