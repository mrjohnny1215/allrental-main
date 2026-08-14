const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  // 정수기 카테고리 클릭
  const waterBtn = await p.$('button:has-text("정수기")');
  if(waterBtn) await waterBtn.click();
  await p.waitForTimeout(1500);
  // 첫 카드 클릭
  const card = await p.$('div.cursor-pointer');
  if(card) await card.click();
  await p.waitForTimeout(1500);
  const res = await p.evaluate(()=>{
    const txt=document.body.innerText;
    const m=txt.match(/제품종류\s*([^\n]+)/);
    const headerFab=[...document.querySelectorAll('header a[title="상담하기"]')].length;
    return {productType:m?m[1].trim():'(없음)', headerConsultFab:headerFab>0};
  });
  console.log('결과:', JSON.stringify(res));
  await b.close();
})();
