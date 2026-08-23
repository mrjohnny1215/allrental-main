const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  let fail=0, ok=0;
  const matUrls = JSON.parse(require('fs').readFileSync('/opt/data/allrental/backend/mattress_missing2.json','utf-8'));
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  // 매트리스 카테고리 클릭
  await p.evaluate(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('매트리스')); if(el) el.click();});
  await p.waitForTimeout(2000);
  const imgs = await p.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>i.offsetParent!==null).map(i=>({src:i.src, w:i.naturalWidth})));
  const loaded = imgs.filter(i=>i.w>0).length;
  const broken = imgs.filter(i=>i.src.includes('placeholder')||i.w===0).length;
  console.log('매트리스 카드 이미지 수:',imgs.length,'| 정상로드:',loaded,'| 깨진:',broken);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
