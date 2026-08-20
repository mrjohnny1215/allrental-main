const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const url = process.argv[2] || 'https://allrental-xi.vercel.app';
  await p.goto(url + '?x=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await p.waitForTimeout(2500);
  const txt = await p.evaluate(() => {
    const f=document.querySelector('footer');
    return f? f.innerText.replace(/\n+/g,' | ') : 'NO FOOTER; h='+document.body.scrollHeight;
  });
  console.log('['+url+'] FOOTER:', txt);
  const f = await p.$('footer');
  if (f) await f.screenshot({ path: 'backend/shot_footer.png' });
  await b.close();
})();
