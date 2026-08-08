const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(4000);
  await p.evaluate(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('매트리스')); if(el) el.click();});
  await p.waitForTimeout(3000);
  for(let i=0;i<10;i++){ await p.evaluate(()=>window.scrollBy(0,900)); await p.waitForTimeout(700); }
  await p.waitForTimeout(3000);
  const r = await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll('img')].filter(i=>i.offsetParent!==null);
    const broken=imgs.filter(i=>i.naturalWidth===0 && !i.src.includes('placeholder'));
    return { total:imgs.length, broken:broken.length, brokenSrcs: broken.slice(0,8).map(i=>i.src.slice(0,75)) };
  });
  console.log('최종 카드 이미지:',r.total,'| 진짜깨진:',r.broken);
  console.log('깨진샘플:',JSON.stringify(r.brokenSrcs));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
