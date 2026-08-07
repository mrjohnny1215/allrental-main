const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  for (const cat of ['water','air','bidet','mattress']) {
    await p.goto('https://allrental-xi.vercel.app/?cat='+cat+'&v='+Date.now(),{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(2500);
    // 카테고리 클릭
    const clicked = await p.evaluate((c)=>{
      const btns=[...document.querySelectorAll('button')];
      const t=btns.find(b=>b.textContent.includes(c==='water'?'정수기':c==='air'?'공기청정기':c==='bidet'?'비데':'매트리스'));
      if(t){t.click();return true;} return false;
    }, cat);
    await p.waitForTimeout(800);
    const labels = await p.evaluate(()=>[...document.querySelectorAll('span')].map(s=>s.textContent.trim()).filter(t=>['브랜드','기능','타입','정수방식','렌탈료','평형'].includes(t)));
    console.log(cat, '-> 필터라벨:', labels.join(','));
  }
  await b.close();
})();
