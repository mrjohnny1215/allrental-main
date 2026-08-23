const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto("https://allrental-xi.vercel.app?m="+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await (await p.$("button:has-text('안마의자')")).click();
  await p.waitForTimeout(2000);
  // 카드 텍스트
  const cardTxt=await p.evaluate(()=>document.body.innerText.match(/월 렌탈료[\s\S]{0,40}/));
  console.log("CARD:", cardTxt?cardTxt[0].replace(/\n+/g,' '):'?');
  // 모달
  await (await p.$("button:has-text('상세보기')")).click().catch(()=>{});
  await p.waitForTimeout(2500);
  const modal=await p.evaluate(()=>{
    const els=[...document.querySelectorAll("div")].filter(e=>e.className.includes("fixed")&&e.className.includes("inset-0"));
    if(!els.length) return "no modal";
    const t=els[0].innerText;
    const m=t.match(/월 렌탈료[\s\S]{0,30}/);
    const disc=t.match(/정가\s*(\d{1,3}(?:,\d{3})*원)/);
    return {monthly:m?m[0].replace(/\n+/g,' '):'?', orig:disc?disc[1]:'?'};
  });
  console.log("MODAL:", JSON.stringify(modal));
  await b.close();
})();
