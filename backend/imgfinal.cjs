const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?v=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(4500);
  const stats = await p.evaluate(() => {
    const imgs=[...document.querySelectorAll('img')];
    const broken=imgs.filter(i=>i.naturalWidth===0);
    const local=imgs.filter(i=>i.src.includes('/products/'));
    return { total:imgs.length, broken:broken.length, local:local.length, brokenSample: broken.slice(0,3).map(i=>i.src) };
  });
  console.log('IMG STATS:', JSON.stringify(stats));
  await b.close();
})();
