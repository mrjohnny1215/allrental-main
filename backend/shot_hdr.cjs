const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?h=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const h = await p.evaluate(() => {
    const header=document.querySelector('header');
    return header? Math.round(header.getBoundingClientRect().height):0;
  });
  console.log('HEADER HEIGHT:', h, 'px');
  const el = await p.$('header');
  if (el) await el.screenshot({ path: 'backend/shot_header2.png' });
  console.log('saved');
  await b.close();
})();
