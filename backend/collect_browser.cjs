const fs = require('fs');
const { chromium } = require('playwright');

const lists = JSON.parse(fs.readFileSync('/opt/data/allrental/backend/sitemap_lists.json','utf-8'));

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
  const page = await ctx.newPage();
  await page.goto('https://rentalsegye.com/', { waitUntil: 'domcontentloaded' });
  const out = {};
  for (let i = 0; i < lists.length; i++) {
    const u = lists[i];
    try {
      await page.goto(u, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(300);
      // 스크롤하면서 동적 로딩 확인
      let prev = 0;
      for (let s = 0; s < 15; s++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        const cnt = await page.$$eval('a[href*="product.php"]', els => els.filter(e => e.href.includes('no=')).length);
        if (cnt === prev) break; // 더 이상 안 늘면 종료
        prev = cnt;
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      const items = await page.$$eval('a[href*="product.php"]', els => els
        .filter(e => e.href.includes('no='))
        .map(e => ({ url: e.href, name: e.textContent.replace(/\s+/g,' ').trim() })));
      out[u] = items;
    } catch (e) {
      out[u] = [{ url: 'ERR', name: e.message }];
    }
    const tag = u.includes('gid=') ? u.split('gid=')[1] : u.slice(-6);
    console.log('[' + (i+1) + '/' + lists.length + '] gid=' + tag + ' -> ' + out[u].length);
  }
  await browser.close();
  fs.writeFileSync('/opt/data/allrental/backend/collected_named.json', JSON.stringify(out, null, 2));
  console.log('저장: collected_named.json');
})();
