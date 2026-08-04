const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
  const page = await ctx.newPage();
  await page.goto('https://rentalsegye.com/product.php?no=42272&cid=1377&gid=1424', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const res = await page.evaluate(async () => {
    const fd = new URLSearchParams();
    fd.set('iid','42272'); fd.set('ro_id','3년'); fd.set('ro_idx','0'); fd.set('rental_count','3'); fd.set('ro_title','3년5년6년');
    const r = await fetch('https://rentalsegye.com/page/product_option.php', {method:'POST', body:fd, headers:{'X-Requested-With':'XMLHttpRequest'}});
    const t = await r.text();
    return { status: r.status, len: t.length, head: t.slice(0,200) };
  });
  console.log(JSON.stringify(res, null, 2));
  await browser.close();
})();
