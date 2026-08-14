const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?c5=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const h = await p.evaluate(() => {
    const btns=[...document.querySelectorAll('header button.w-16')];
    if(!btns.length) return 'NO w-16 btn';
    const r=btns[0].getBoundingClientRect();
    return Math.round(r.height);
  });
  console.log('CATEGORY BTN HEIGHT (w-16):', h);
  await b.close();
})();
