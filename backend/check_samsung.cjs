const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
  const page = await ctx.newPage();
  const url='https://rentalsegye.com/product.php?no=41886&cid=1377&gid=1424';
  await page.goto(url, { waitUntil:'networkidle', timeout:30000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const r={};
    r.title=document.querySelector('h1')?.textContent.trim();
    r.periods=Array.from(document.querySelectorAll('input[name="rental_option_1"]')).map(o=>o.value);
    r.opt2=document.querySelector('#rental_option_2')?Array.from(document.querySelector('#rental_option_2').options).map(o=>o.textContent.trim()):'없음';
    // 렌탈 신청 버튼 / 가격 영역
    r.bodyHasRental = document.body.innerText.includes('렌탈');
    r.itPrice = document.querySelector('input#it_price')?.value;
    r.productOptionRaw = document.querySelector('#product_option')?.innerText?.slice(0,200) || '없음';
    return r;
  });
  console.log(JSON.stringify(info,null,2));
  await browser.close();
})();
