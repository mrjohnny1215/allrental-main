const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?live=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await p.waitForTimeout(2500);
  const t = await p.evaluate(()=>{ const f=document.querySelector('footer'); return f? f.innerText.replace(/\n+/g,' | ') : 'NO FOOTER (h='+document.body.scrollHeight+')'; });
  console.log('LIVE FOOTER NOW:', t);
  const f = await p.$('footer');
  if (f) await f.screenshot({ path: 'backend/shot_live_footer.png' });
  else await p.screenshot({ path: 'backend/shot_live_bottom.png', fullPage:false });
  await b.close();
})();
