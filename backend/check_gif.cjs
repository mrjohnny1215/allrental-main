const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto("https://allrental-xi.vercel.app?h="+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await (await p.$("button:has-text('안마의자')")).click();
  await p.waitForTimeout(2000);
  const res=await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll("[data-testid='card'] img")].map(i=>i.src);
    const gif=imgs.filter(s=>s.endsWith('.gif'));
    return {total:imgs.length, gifCount:gif.length, gifSample:gif.slice(0,3)};
  });
  console.log("ANMA GIF:",JSON.stringify(res));
  await b.close();
})();
