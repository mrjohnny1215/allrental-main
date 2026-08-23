const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const t0 = Date.now();
  await p.goto("https://allrental-xi.vercel.app?z="+Date.now(), { waitUntil: "domcontentloaded" });
  // 0.8초, 1.5초, 2.5초 지점 캡처
  await p.waitForTimeout(800); await p.screenshot({ path: "/tmp/ld_1.png" });
  await p.waitForTimeout(1000); await p.screenshot({ path: "/tmp/ld_2.png" });
  let gone=null;
  for(let i=0;i<40;i++){ const still=await p.evaluate(()=>document.body.innerText.includes("ALL렌탈")&&document.querySelector("[class*='min-h-screen']")?.className.includes("gradient")); if(!still){gone=Date.now()-t0;break;} await p.waitForTimeout(150);}
  console.log("LOADING DURATION(ms):", gone);
  await b.close();
})();
