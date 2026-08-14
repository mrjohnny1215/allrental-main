const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  const res = await p.evaluate(()=>{
    // 헤더 카테고리 버튼들
    const cats=[...document.querySelectorAll('header button')].map(x=>x.textContent.trim()).filter(t=>['정수기','비데','공기청정기','매트리스'].includes(t));
    // 활성 카테고리 강조 클래스 보유 여부
    const activeCat=[...document.querySelectorAll('header button')].find(x=>x.className.includes('bg-blue-500'));
    // 정수기 클릭 후 필터 라벨 순서
    return {cats, activeHighlighted:!!activeCat};
  });
  console.log('카테고리:',JSON.stringify(res));
  await b.close();
})();
