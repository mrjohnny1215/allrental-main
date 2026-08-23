const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  // 정수기 클릭
  await p.evaluate(()=>{ [...document.querySelectorAll('button')].find(b=>b.textContent.includes('정수기'))?.click(); });
  await p.waitForTimeout(1000);
  const before = await p.evaluate(()=>document.querySelectorAll('[data-testid=card]').length);
  // '냉온전용' 칩 클릭
  const clicked = await p.evaluate(()=>{
    const btns=[...document.querySelectorAll('button')];
    const t=btns.find(b=>b.textContent.trim()==='냉온전용');
    if(t){t.click();return true;} return false;
  });
  await p.waitForTimeout(1000);
  const after = await p.evaluate(()=>document.querySelectorAll('[data-testid=card]').length);
  // 샘플 상품 desc 확인
  const sample = await p.evaluate(()=>[...document.querySelectorAll('[data-testid=card] .font-bold')].slice(0,3).map(e=>e.textContent.slice(0,40)));
  console.log('냉온전용 칩찾음:',clicked,'| 카드 before:',before,'after:',after);
  console.log('after 샘플:',JSON.stringify(sample));
  console.log('JS에러:',errs.slice(0,5));
  await b.close();
})();
