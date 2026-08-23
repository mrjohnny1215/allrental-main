const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:800}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3500);
  const cards = await p.evaluate(()=>{
    return [...document.querySelectorAll('[data-testid=card]')].slice(0,10).map(c=>{
      const i=c.querySelector('img'); const src=i?i.getAttribute('src'):'';
      let kind = src.includes('item_product')?'PRODUCT(제품)':src.includes('rentalworld')||src.includes('editor')?'DETAIL(상세)':'OTHER';
      return {kind, src:src.slice(0,60)};
    });
  });
  cards.forEach((c,i)=>console.log(i, c.kind, c.src));
  await b.close();
})();
