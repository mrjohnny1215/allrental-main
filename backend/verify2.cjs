const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  const res = await p.evaluate(()=>({
    rentLabel: [...document.querySelectorAll('span')].some(s=>s.textContent.trim()==='렌탈사'),
    kakaoBtn: [...document.querySelectorAll('a,button')].some(e=>e.textContent.includes('카톡 상담')),
    inquiryBtn: [...document.querySelectorAll('a,button')].some(e=>e.textContent.includes('1:1 문의')),
    brandChip: [...document.querySelectorAll('button')].some(e=>['SK매직','코웨이','청호나이스','쿠쿠','LG'].includes(e.textContent.trim())),
  }));
  console.log('상태:', JSON.stringify(res));
  await b.close();
})();
