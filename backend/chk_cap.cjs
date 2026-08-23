const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:800}})).newPage();
  const resp = await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  console.log('HTTP:', resp.status());
  console.log('최종URL:', p.url());
  // 우클릭 테스트
  try {
    await p.click('body', {button:'right'});
    const menu = await p.evaluate(()=>!!document.querySelector('div[role=menu], .context-menu'));
    console.log('우클릭 컨텍스트메뉴 차단여부:', menu);
  } catch(e){ console.log('우클릭 테스트 에러:', e.message); }
  // user-select CSS
  const us = await p.evaluate(()=>{
    const el=document.body; return getComputedStyle(el).userSelect || getComputedStyle(el).webkitUserSelect;
  });
  console.log('body user-select:', us);
  // Vercel 보호 페이지인지 (제목)
  const title = await p.title();
  console.log('페이지 타이틀:', title);
  await b.close();
})();
