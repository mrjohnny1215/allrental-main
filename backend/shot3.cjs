const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?v=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const el = await p.$('text=스마트 필터');
  if (el) { await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: 'backend/shot_filter.png' }); }
  await p.screenshot({ path: 'backend/shot_full_top.png', fullPage: false });
  console.log('shot saved');
  await b.close();
})();
