const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  const res = await p.evaluate(()=>{
    const funcBtns=[...document.querySelectorAll('button')].filter(x=>['냉수전용','냉온전용','얼음냉온','얼음냉정','정수전용','커피정수기','탄산정수기'].includes(x.textContent.trim()));
    // 상단 FAB: fixed top-20 right-3 a 태그
    const fab=[...document.querySelectorAll('a')].find(a=>a.getAttribute('title')==='상담하기');
    return {funcChips:funcBtns.map(x=>x.textContent.trim()), consultFab:!!fab};
  });
  console.log('결과:', JSON.stringify(res));
  await b.close();
})();
