const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  const res = await p.evaluate(()=>{
    const labels=['렌탈사','기능','타입','렌탈료'];
    const found=labels.filter(l=>[...document.querySelectorAll('span')].some(s=>s.textContent.trim()===l));
    // 네모(rounded-md) 칩이 있는지 대략 확인: 필터 영역 버튼들의 border-radius
    const btns=[...document.querySelectorAll('button')].filter(x=>x.textContent.trim()&&['전체','코웨이','냉온전용','스탠드형'].includes(x.textContent.trim()));
    return {labels:found, sampleBtns:btns.slice(0,5).map(x=>x.textContent.trim())};
  });
  console.log('결과:', JSON.stringify(res));
  await b.close();
})();
