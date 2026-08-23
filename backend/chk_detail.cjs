const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:800}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  // 첫 카드 클릭
  const btn = await p.$('[data-testid=card]');
  if(btn){ await btn.click(); await p.waitForTimeout(2000); }
  const detailImgs = await p.evaluate(()=>{
    const all=[...document.querySelectorAll('img')].map(i=>i.getAttribute('src')||'');
    const rental=all.filter(s=>s.includes('editor/rentalworld')||s.includes('rentalworld'));
    const prod=all.filter(s=>s.includes('item_product'));
    return {rentalworld:rental.length, item_product:prod.length, sample:prod.slice(0,2)};
  });
  console.log('상세페이지 이미지:', JSON.stringify(detailImgs));
  await b.close();
})();
