const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto("https://allrental-xi.vercel.app?f="+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await (await p.$("button:has-text('안마의자')")).click();
  await p.waitForTimeout(2000);
  const card=await p.evaluate(()=>document.body.innerText.includes('할인적용')?'RED BLOCK OK':'no red');
  console.log("CARD RED BLOCK:",card);
  await (await p.$("button:has-text('상세보기')")).click().catch(()=>{});
  await p.waitForTimeout(2500);
  const modal=await p.evaluate(()=>{
    const els=[...document.querySelectorAll("div")].filter(e=>e.className.includes("fixed")&&e.className.includes("inset-0"));
    if(!els.length) return "no modal";
    const t=els[0].innerText;
    const cardIdx=t.indexOf('제휴카드');
    const cardSec=t.slice(cardIdx, cardIdx+100).replace(/\n+/g,' ');
    return {hasRed:/할인적용/.test(t), partnerCardSec:cardSec};
  });
  console.log("MODAL:",JSON.stringify(modal));
  await b.close();
})();
