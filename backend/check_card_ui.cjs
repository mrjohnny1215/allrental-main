const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto("https://allrental-xi.vercel.app?g="+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await (await p.$("button:has-text('정수기')")).click();
  await p.waitForTimeout(2000);
  const res=await p.evaluate(()=>{
    const cards=[...document.querySelectorAll("[data-testid='card']")];
    const c=cards[0];
    const html=c.innerHTML;
    return {
      cardCount:cards.length,
      hasLogo: /<img[^>]*item_code/.test(html) || /max-w-\[64px\]/.test(html),
      hasPromoTag: /반값할인|타사보상|BEST|NEW/.test(html),
      hasCertMark: /공식/.test(html),
      sample: c.innerText.replace(/\n+/g,' | ').slice(0,150)
    };
  });
  console.log("CARD UI:",JSON.stringify(res,null,1));
  await b.close();
})();
