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
  // 제휴카드 안내 자세히 보기
  const btn=await p.$("button:has-text('자세히 보기')");
  if(btn){ await btn.click(); await p.waitForTimeout(1500); }
  const res=await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll("img")].map(i=>i.src);
    const cardImgs=imgs.filter(s=>/item_banner/.test(s));
    const els=[...document.querySelectorAll("div")].filter(e=>e.className.includes("fixed")&&e.className.includes("inset-0"));
    const t=els.length?els[0].innerText:'';
    return {cardBannerImgs:cardImgs.length, benefitsShown:/전월실적/.test(t)};
  });
  console.log("CARD IMG CHECK:",JSON.stringify(res));
  await b.close();
})();
