const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('https://allrental-xi.vercel.app/?s=' + Date.now(), { waitUntil: 'networkidle' });
  // 스크롤을 끝까지 여러 번
  for (let i=0;i<12;i++){ await p.evaluate(()=>window.scrollBy(0,1500)); await p.waitForTimeout(400); }
  await p.waitForTimeout(4000);
  const stats = await p.evaluate(() => {
    const imgs=[...document.querySelectorAll('img')];
    const broken=imgs.filter(i=>i.naturalWidth===0);
    return { total:imgs.length, broken:broken.length, brokenSample: broken.slice(0,3).map(i=>i.src) };
  });
  console.log('AFTER SCROLL IMG STATS:', JSON.stringify(stats));
  await b.close();
})();
