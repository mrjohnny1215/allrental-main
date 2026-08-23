const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:800}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3500);
  const cards = await p.evaluate(()=>{
    return [...document.querySelectorAll('[data-testid=card]')].slice(0,3).map(c=>({
      title: c.querySelector('.font-bold')?.textContent?.slice(0,30),
      sub: c.querySelector('.font-mono')?.textContent,
      price: c.textContent.match(/월 렌탈료\s*([\d,]+)원/)?.[1]
    }));
  });
  console.log(JSON.stringify(cards,null,1));
  await b.close();
})();
