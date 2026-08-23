const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?c6=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const h = await p.evaluate(() => {
    const btn=[...document.querySelectorAll('header button.w-20')];
    return btn.length? Math.round(btn[0].getBoundingClientRect().height):'none';
  });
  console.log('CATEGORY BTN HEIGHT:', h, 'px (이전 51 → 늘림)');
  const el = await p.$('header');
  if (el) await el.screenshot({ path: 'backend/shot_catbar_taller.png' });
  console.log('saved');
  await b.close();
})();
