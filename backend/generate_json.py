import csv
import json
import os

# 변환할 CSV 파일 목록
csv_files = {
    'bidet': '비데.csv',
    'water': '정수기.csv',
    'air': '공기청정기.csv',
    'mattress': '매트리스.csv'
}

all_products = []

for category, filename in csv_files.items():
    if not os.path.exists(filename):
        print(f"⚠️ {filename} 파일을 찾을 수 없습니다. 건너뜁니다.")
        continue

    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader, None)
        if not headers:
            continue

        # 헤더 정리 (따옴표 및 공백 제거)
        headers = [h.strip().strip('"') for h in headers]

        # 컬럼 순서가 파일마다 다르므로 이름으로 인덱스를 동적 찾음 (안정성 100%)
        idx_href = headers.index('product-card href') if 'product-card href' in headers else 0
        idx_logo = headers.index('card-logo src') if 'card-logo src' in headers else 1
        idx_img = headers.index('card-img src') if 'card-img src' in headers else 2
        idx_model = headers.index('card-model') if 'card-model' in headers else 3
        idx_desc = headers.index('card-desc') if 'card-desc' in headers else 4
        idx_price = headers.index('card-price') if 'card-price' in headers else 5
        idx_price2 = headers.index('card-price 2') if 'card-price 2' in headers else 6
        idx_label = headers.index('card-label') if 'card-label' in headers else 7
        idx_label2 = headers.index('card-label 2') if 'card-label 2' in headers else -1

        for row in reader:
            if not row or len(row) < 5: 
                continue

            clean_row = [cell.strip().strip('"') for cell in row]

            product = {
                'category': category,
                'url': clean_row[idx_href] if idx_href < len(clean_row) else '',
                'logo': clean_row[idx_logo] if idx_logo < len(clean_row) else '',
                'image': clean_row[idx_img] if idx_img < len(clean_row) else '',
                'model': clean_row[idx_model] if idx_model < len(clean_row) else '',
                'desc': clean_row[idx_desc] if idx_desc < len(clean_row) else '',
                'price': clean_row[idx_price] if idx_price < len(clean_row) else '0',
                'discount': clean_row[idx_price2] if idx_price2 < len(clean_row) else '0',
                'label': clean_row[idx_label] if idx_label < len(clean_row) else '',
                'label2': clean_row[idx_label2] if idx_label2 != -1 and idx_label2 < len(clean_row) else ''
            }
            all_products.append(product)

# 최종 JSON 파일 저장
with open('products_data.json', 'w', encoding='utf-8') as f:
    json.dump(all_products, f, ensure_ascii=False, indent=2)

print(f"✅ 성공! 총 {len(all_products)}개의 상품이 'products_data.json' 파일로 저장되었습니다.")
