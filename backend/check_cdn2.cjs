const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto("https://allrental-xi.vercel.app?d="+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await (await p.$("button:has-text('안마의자')")).click();
  await p.waitForTimeout(2000);
  await (await p.$("button:has-text('상세보기')")).click().catch(()=>{});
  await p.waitForTimeout(2500);
  const res=await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll("img")].map(i=>i.src);
    const bad=imgs.filter(s=>s.includes('0533ab58f4d314b763860ba8c1b34c9b')||s.includes('data/editor/rentalworld3'));
    return {total:imgs.length, badCount:bad.length};
  });
  console.log("CDN CHECK:",JSON.stringify(res));
  await b.close();
})();
