const { chromium } = require('playwright');
const fs = require('fs');
const EXE = '/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';

const BASE = '/opt/data/allrental';
const MERGED = BASE + '/merged_products.json';
// 누락된 매트리스 no
const nos = JSON.parse(fs.readFileSync(BASE + '/backend/mattress_missing2.json', 'utf-8'));
const urls = nos.map(no => `https://rentalsegye.com/product.php?no=${no}&cid=1486&gid=1580`);

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const merged = JSON.parse(fs.readFileSync(MERGED, 'utf-8'));
  const results = [];
  const failed = [];
  const total = urls.length;

  for (let i = 0; i < total; i++) {
    const url = urls[i];
    const no = url.match(/no=(\d+)/)[1];
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(1500);
        const data = await page.evaluate(async (url) => {
          const out = { url, title: '', image: '', detail_images: [], rental_periods: [], sizes: [], care_types: [], period_prices: {} };
          const h1 = document.querySelector('h1.product-title') || document.querySelector('h1');
          if (h1) out.title = h1.textContent.trim();
          // 카드 썸네일: item_product thumb 이미지
          const allImgs = [...document.querySelectorAll('img')].map(img => img.getAttribute('src') || '').filter(s => s.includes('item_product') && s.includes('speedycdn'));
          if (allImgs.length) {
            let src = allImgs[0];
            out.image = src.startsWith('//') ? 'https:' + src : src;
          }
          // 상세 이미지
          ['#section-info', '#section-detail'].forEach(sel => {
            const sec = document.querySelector(sel);
            if (sec) sec.querySelectorAll('img').forEach(img => {
              let src = img.getAttribute('src') || '';
              if (src.includes('speedycdn') || src.startsWith('//tlpartner')) {
                let full = src.startsWith('http') ? src : (src.startsWith('//') ? 'https:' + src : src);
                if (!out.detail_images.includes(full)) out.detail_images.push(full);
              }
            });
          });
          return out;
        }, url);
        if (data && data.image) {
          // merged에 반영 (URL 키)
          const key = Object.keys(merged).find(k => k.includes('no=' + no));
          if (key) {
            merged[key].image = data.image;
            if (data.detail_images.length) merged[key].detail_images = data.detail_images;
            results.push(no);
          }
          ok = true;
          console.log(`  [${i + 1}/${total}] OK no=${no} img=${data.image.slice(0, 60)} detail=${data.detail_images.length}`);
        } else {
          console.log(`  [${i + 1}/${total}] empty no=${no} (attempt ${attempt + 1})`);
        }
      } catch (e) {
        console.log(`  [${i + 1}/${total}] ERR no=${no} ${e.message.slice(0, 60)} (attempt ${attempt + 1})`);
      } finally {
        await page.close();
      }
      if (!ok && attempt < 2) await sleep(1500);
    }
    if (!ok) { failed.push(url); console.log(`  [${i + 1}/${total}] FAILED no=${no}`); }
    await sleep(800 + Math.random() * 1200);
    // 5개마다 저장
    if ((i + 1) % 5 === 0) fs.writeFileSync(MERGED, JSON.stringify(merged, null, 2));
  }
  fs.writeFileSync(MERGED, JSON.stringify(merged, null, 2));
  fs.writeFileSync(BASE + '/backend/mattress_fill_failed.json', JSON.stringify(failed, null, 2));
  console.log(`\n=== DONE === filled=${results.length} failed=${failed.length}`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
