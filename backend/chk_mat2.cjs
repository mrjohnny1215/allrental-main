const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('매트리스')); if(el) el.click();});
  await p.waitForTimeout(2000);
  // 스크롤 다운
  for(let i=0;i<8;i++){ await p.evaluate(()=>window.scrollBy(0,800)); await p.waitForTimeout(500); }
  await p.waitForTimeout(2000);
  const r = await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll('img')].filter(i=>i.offsetParent!==null);
    const broken=imgs.filter(i=>i.naturalWidth===0);
    return { total:imgs.length, broken:broken.length, brokenSrcs: broken.slice(0,5).map(i=>i.src.slice(0,70)) };
  });
  console.log('스크롤 후 카드 이미지:',r.total,'| 깨진:',r.broken);
  console.log('깨진 샘플:',JSON.stringify(r.brokenSrcs));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
