const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto("https://allrental-xi.vercel.app?r="+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await (await p.$("button:has-text('안마의자')")).click();
  await p.waitForTimeout(2000);
  const card=await p.evaluate(()=>{
    const el=[...document.querySelectorAll("*")].find(e=>e.textContent.trim()==="할인적용" && e.className.includes("text-red"));
    return el? "RED BLOCK FOUND (card)" : "no red block in card";
  });
  console.log("CARD:",card);
  await (await p.$("button:has-text('상세보기')")).click().catch(()=>{});
  await p.waitForTimeout(2500);
  const modal=await p.evaluate(()=>{
    const els=[...document.querySelectorAll("div")].filter(e=>e.className.includes("fixed")&&e.className.includes("inset-0"));
    if(!els.length) return "no modal";
    const t=els[0].innerText;
    const hasRed=/할인적용/.test(t) && /84,000/.test(t);
    const monthly=t.match(/월 렌탈료\s*(\d{1,3}(?:,\d{3})*원)/);
    return {hasRedBlock:hasRed, monthly:monthly?monthly[1]:'?'};
  });
  console.log("MODAL:",JSON.stringify(modal));
  await b.close();
})();
