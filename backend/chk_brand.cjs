const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:800}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3500);
  // 브랜드 select 찾기
  const opts = await p.evaluate(()=>{
    const sel=document.querySelector('select');
    if(!sel) return ['NO_SELECT'];
    return [...sel.options].map(o=>o.textContent.trim());
  });
  console.log('브랜드 옵션:', JSON.stringify(opts));
  await b.close();
})();
