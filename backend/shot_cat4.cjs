const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?c4=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const h = await p.evaluate(() => {
    const btns=[...document.querySelectorAll('header button')];
    if(!btns.length) return 0;
    const r=btns[0].getBoundingClientRect();
    return Math.round(r.height);
  });
  console.log('CATEGORY BTN HEIGHT:', h, 'px (이전 44px)');
  const el = await p.$('header');
  if (el) await el.screenshot({ path: 'backend/shot_catbar2.png' });
  console.log('saved');
  await b.close();
})();
