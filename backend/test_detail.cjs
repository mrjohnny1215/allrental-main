const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
  const page = await ctx.newPage();
  const url = 'https://rentalsegye.com/product.php?no=42272&cid=1377&gid=1424';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  const info = await page.evaluate(() => {
    const res = {};
    // 제목
    const h1 = document.querySelector('h1.product-title') || document.querySelector('h1');
    res.title = h1 ? h1.textContent.trim() : '';
    // it_price
    const ip = document.querySelector('input#it_price');
    res.it_price = ip ? ip.value : '';
    // 렌탈기간
    res.periods = Array.from(document.querySelectorAll('input[name="rental_option_1"]')).map(o => o.value).filter(Boolean);
    // 관리주기 / 사이즈 (select)
    const opt2 = document.querySelector('#rental_option_2');
    res.opt2 = opt2 ? Array.from(opt2.options).map(o => ({v:o.value, t:o.textContent.trim()})).filter(o=>o.t!=='선택') : [];
    const opt3 = document.querySelector('#rental_option_3');
    res.opt3 = opt3 ? Array.from(opt3.options).map(o => ({v:o.value, t:o.textContent.trim()})).filter(o=>o.t!=='선택') : [];
    // 색상
    const sup = document.querySelector('#rental_supply_1');
    res.supply = sup ? Array.from(sup.options).map(o => ({v:o.value, t:o.textContent.trim()})).filter(o=>o.t!=='선택') : [];
    // 상세이미지
    res.images = Array.from(document.querySelectorAll('#section-info img, #section-detail img'))
      .map(img => img.src).filter(src => src.includes('speedycdn') || src.startsWith('//tlpartner'));
    return res;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
