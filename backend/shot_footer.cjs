const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?f=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  const footer = await p.$('footer');
  if (footer) await footer.screenshot({ path: 'backend/shot_footer.png' });
  // footer 텍스트 추출
  const txt = await p.evaluate(() => {
    const f=document.querySelector('footer'); return f? f.innerText.replace(/\n+/g,' | '):'NO FOOTER';
  });
  console.log('FOOTER TEXT:', txt);
  await b.close();
})();
