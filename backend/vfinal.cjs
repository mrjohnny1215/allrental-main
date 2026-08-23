const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:800}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3500);
  const r = await p.evaluate(()=>{
    const cards=[...document.querySelectorAll('[data-testid=card]')].slice(0,8);
    return cards.map(c=>{const i=c.querySelector('img');return i?(i.naturalWidth>0?'OK '+i.naturalWidth:'FAIL'):'NOIMG';});
  });
  const fail=await p.evaluate(()=>[...document.querySelectorAll('[data-testid=card] img')].filter(i=>i.naturalWidth===0).length);
  console.log('카드 이미지(상위8):', JSON.stringify(r));
  console.log('실패 img 수:', fail);
  await b.close();
})();
