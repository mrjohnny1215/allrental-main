const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:1200}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  // 헤더 영역 스크린샷
  const header = await p.$('header');
  if(header) await header.screenshot({path:'/opt/data/allrental/backend/shot_header.png'});
  // 카테고리 버튼 스타일 덤프
  const styles = await p.evaluate(()=>{
    const btns=[...document.querySelectorAll('header button')];
    return btns.slice(0,6).map(x=>({txt:x.textContent.trim(), cls:x.className.slice(0,80), bg:getComputedStyle(x).backgroundColor}));
  });
  console.log(JSON.stringify(styles,null,1));
  await b.close();
})();
