// ============================================================
// ALL렌탈 - 로컬용 정수기 '기능' 태그 크롤 (v1)
// 용도: 렌탈세계 정수기 상세페이지의 "기능 XXX" 태그 수집
// 대상: products_data.json 의 정수기 205개 URL
// 결과: func_tags.json (URL -> func_tag)
// 실행: node local_crawl_func.js
// ============================================================
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PD = path.join(__dirname, 'products_data.json');
const OUT = path.join(__dirname, 'func_tags.json');

const VALID = ['냉수전용','냉온전용','얼음냉온','얼음냉정','온수전용','정수전용','커피정수기','탄산정수기'];

async function crawl(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);
  return await page.evaluate((vals) => {
    const t = document.body.innerText;
    const i = t.indexOf('기능');
    if (i < 0) return '';
    const snip = t.slice(i, i + 30).replace(/\n/g, ' ');
    for (const v of vals) if (snip.includes(v)) return v;
    return '';
  }, VALID);
}

(async () => {
  const pd = JSON.parse(fs.readFileSync(PD, 'utf-8'));
  const water = pd.filter(x => x.category === 'water' && x.url);
  console.log(`정수기 ${water.length}개 기능태그 크롤 시작...`);

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const result = {};
  let ok = 0, skip = 0;
  for (const x of water) {
    try {
      const tag = await crawl(page, x.url);
      if (tag) { result[x.url] = tag; ok++; }
      else { skip++; console.log('  NO-TAG:', x.url); }
    } catch (e) { skip++; console.log('  ERR:', x.url, e.message.slice(0,40)); }
    await page.waitForTimeout(400);
  }

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  await browser.close();
  console.log(`\n=== 완료: 태그수집 ${ok} / 스킵 ${skip} / 전체 ${water.length} ===`);
  console.log('결과:', OUT);
})();
