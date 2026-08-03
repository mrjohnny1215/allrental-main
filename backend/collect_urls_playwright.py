import json
from playwright.sync_api import sync_playwright

urls = json.load(open('/opt/data/allrental/backend/sitemap_lists.json', encoding='utf-8'))

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--no-sandbox'])
    ctx = browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    page = ctx.new_page()
    page.goto('https://rentalsegye.com/', wait_until='domcontentloaded')
    out = {}
    for i, u in enumerate(urls, 1):
        try:
            page.goto(u, wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(500)
            links = page.eval_on_selector_all(
                'a[href*="product.php"]',
                'els => els.map(e => e.href).filter(h => h.includes("no="))'
            )
            out[u] = links
        except Exception as e:
            out[u] = ['ERR:' + str(e)]
        print(f'  [{i}/{len(urls)}] {u.split("gid=")[-1] if "gid" in u else u[-6:]} -> {len(out[u])}', flush=True)
    browser.close()

# 중복 제거 통합
all_urls = []
seen = set()
for u, links in out.items():
    for l in links:
        if l.startswith('http') and l not in seen:
            seen.add(l); all_urls.append(l)
json.dump(out, open('/opt/data/allrental/backend/collected_lists.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump(all_urls, open('/opt/data/allrental/backend/all_product_urls.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'\n목록별 수집 완료. 전체 상품 URL(중복제거): {len(all_urls)}개')
