const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto("https://allrental-xi.vercel.app?c="+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await (await p.$("button:has-text('안마의자')")).click();
  await p.waitForTimeout(2000);
  await (await p.$("button:has-text('상세보기')")).click().catch(()=>{});
  await p.waitForTimeout(2500);
  const res=await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll("img")].map(i=>i.src);
    const bad=imgs.filter(s=>s.includes("e3d96c1d1a54033549765d5c144a9b67"));
    return {total:imgs.length, badCount:bad.length, bad:bad.slice(0,2)};
  });
  console.log("CDN IMG CHECK:",JSON.stringify(res));
  await b.close();
})();
