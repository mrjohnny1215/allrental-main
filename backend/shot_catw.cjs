const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?cw=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const el = await p.$('header');
  if (el) await el.screenshot({ path: 'backend/shot_catwidth.png' });
  console.log('saved');
  await b.close();
})();
