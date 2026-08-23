const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('https://allrental-xi.vercel.app/?v2=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(5000);
  const stats = await p.evaluate(() => {
    const imgs=[...document.querySelectorAll('img')];
    const broken=imgs.filter(i=>i.naturalWidth===0);
    return { total:imgs.length, broken:broken.length, brokenSample: broken.slice(0,3).map(i=>i.src), brokenStatus: broken.slice(0,2).map(i=>({src:i.src,complete:i.complete,nat:i.naturalWidth})) };
  });
  console.log('IMG STATS:', JSON.stringify(stats));
  await b.close();
})();
