const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?f2=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await p.waitForTimeout(2000);
  const txt = await p.evaluate(() => {
    const f=document.querySelector('footer');
    if(!f) return 'NO FOOTER; total height='+document.body.scrollHeight;
    return f.innerText.replace(/\n+/g,' | ');
  });
  console.log('FOOTER TEXT:', txt);
  const f = await p.$('footer');
  if (f) await f.screenshot({ path: 'backend/shot_footer.png' });
  await b.close();
})();
