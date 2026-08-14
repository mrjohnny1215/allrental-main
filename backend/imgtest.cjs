const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const fails = [];
  p.on('requestfailed', r => { if (r.resourceType()==='image') fails.push(r.url()+' :: '+ (r.failure()&&r.failure().errorText)); });
  p.on('response', r => { try { if (r.request().resourceType()==='image' && r.status()>=400) fails.push(r.url()+' :: HTTP '+r.status()); } catch(e){} });
  await p.goto('https://allrental-xi.vercel.app/?v=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  const stats = await p.evaluate(() => {
    const imgs=[...document.querySelectorAll('img')];
    const broken=imgs.filter(i=>i.naturalWidth===0);
    return { total:imgs.length, broken:broken.length, sample: imgs.slice(0,3).map(i=>i.src) };
  });
  console.log('IMG STATS:', JSON.stringify(stats));
  console.log('FAILS:', fails.length);
  fails.slice(0,6).forEach(f=>console.log(' -',f));
  await b.close();
})();
