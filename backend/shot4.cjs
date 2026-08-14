const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?v=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  // filter container = the div containing '스마트 필터'
  const el = await p.$('div:has(> div > span:text("스마트 필터"))');
  if (!el) { console.log('no container'); await b.close(); return; }
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: 'backend/shot_filter_full.png' });
  console.log('saved');
  await b.close();
})();
