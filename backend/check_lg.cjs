const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto("https://allrental-xi.vercel.app?f="+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await (await p.$("button:has-text('안마의자')")).click();
  await p.waitForTimeout(2000);
  const brands=await p.evaluate(()=>{
    const chips=[...document.querySelectorAll("button")].map(b=>b.textContent.trim());
    const rentalChips=chips.filter(c=>['코웨이','청호나이스','웰스','LG전자','교원웰스','LG'].includes(c));
    return [...new Set(rentalChips)];
  });
  console.log("RENTAL BRANDS:",JSON.stringify(brands));
  // LG전자 클릭 테스트
  const lg=await p.$("button:has-text('LG전자')");
  if(lg){ await lg.click(); await p.waitForTimeout(1500);
    const cnt=await p.evaluate(()=>{const m=document.body.innerText.match(/(\d+)개 상품/);return m?m[1]:'?';});
    console.log("LG전자 클릭 후 상품수:",cnt);
  } else console.log("LG전자 칩 없음");
  await b.close();
})();
