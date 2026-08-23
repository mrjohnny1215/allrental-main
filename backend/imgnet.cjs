const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const imgResponses = [];
  p.on('response', async r => {
    try { if (r.request().resourceType()==='image' && r.url().includes('/products/')) {
      imgResponses.push({ url: r.url().split('/').pop(), status: r.status(), ct: r.headers()['content-type'] });
    }} catch(e){}
  });
  await p.goto('https://allrental-xi.vercel.app/?net=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(5000);
  console.log('PRODUCT IMG RESPONSES (first 10):');
  imgResponses.slice(0,10).forEach(r=>console.log(' ', r.status, r.ct, r.url));
  console.log('total product img responses:', imgResponses.length);
  await b.close();
})();
