const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  // 정수기로 이동
  await p.evaluate(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('정수기')); if(e)e.click();});
  await p.waitForTimeout(800);
  const chips = await p.evaluate(()=>[...document.querySelectorAll('span')].filter(s=>['기능','타입','정수방식','렌탈료','렌탈사'].includes(s.textContent.trim())).map(s=>s.textContent.trim()));
  console.log('정수기 필터 라벨:', chips.join(','));
  // 기능 칩 값들
  const funcOpts = await p.evaluate(()=>{
    const lbl=[...document.querySelectorAll('span')].find(s=>s.textContent.trim()==='기능');
    if(!lbl) return [];
    let row=lbl.parentElement;
    return [...row.querySelectorAll('button')].map(b=>b.textContent.trim());
  });
  console.log('기능 칩:', funcOpts.join(','));
  // 비교버튼/스크롤업/상담존재
  const feats = await p.evaluate(()=>({
    compare: !!document.querySelector('[title="비교 담기"]'),
    scrollup: !!document.querySelector('[title="위로 올라가기"]'),
    consultFloat: !!document.querySelector('[title="상담하기"]'),
    kakao: [...document.querySelectorAll('a')].some(a=>a.textContent.includes('카톡 상담')||a.textContent.includes('1:1 문의')),
  }));
  console.log('UI:', JSON.stringify(feats));
  await b.close();
})();
