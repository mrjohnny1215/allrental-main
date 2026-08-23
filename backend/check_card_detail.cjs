const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto("https://allrental-xi.vercel.app?e="+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await (await p.$("button:has-text('안마의자')")).click();
  await p.waitForTimeout(2000);
  await (await p.$("button:has-text('상세보기')")).click().catch(()=>{});
  await p.waitForTimeout(2500);
  const btn=await p.$("button:has-text('자세히 보기')");
  if(btn){ await btn.click(); await p.waitForTimeout(1500); }
  const res=await p.evaluate(()=>{
    const els=[...document.querySelectorAll("div")].filter(e=>e.className.includes("fixed")&&e.className.includes("inset-0"));
    const t=els.length?els[0].innerText:'';
    const imgs=[...document.querySelectorAll("img")].map(i=>i.src).filter(s=>/item_banner/.test(s));
    return {cardImgs:imgs.length, hasFee:/연회비/.test(t), hasTel:/발급신청/.test(t), hasBenefit:/전월실적/.test(t), sample:t.match(/신한카드[\s\S]{0,120}/)?t.match(/신한카드[\s\S]{0,120}/)[0].replace(/\n+/g,' '):'?'};
  });
  console.log("ANMA CHECK:",JSON.stringify(res,null,1));
  await b.close();
})();
