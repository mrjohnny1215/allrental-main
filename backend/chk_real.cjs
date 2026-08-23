const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('매트리스')); if(el) el.click();});
  await p.waitForTimeout(2500);
  // 모든 speedycdn img 가져와서 각각 로드 대기
  const srcs = await p.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>i.src.includes('speedycdn')&&i.offsetParent!==null).map(i=>i.src));
  let loaded=0, broken=0;
  for(const s of srcs){
    const ok = await p.evaluate(async (src)=>{
      return await new Promise(res=>{
        const im=new Image();
        im.onload=()=>res(true); im.onerror=()=>res(false);
        im.src=src+'?t='+Date.now();
      });
    }, s);
    if(ok) loaded++; else broken++;
  }
  console.log('매트리스 speedycdn 이미지 로드 테스트 | 총:',srcs.length,'| 로드됨:',loaded,'| 깨짐:',broken);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
