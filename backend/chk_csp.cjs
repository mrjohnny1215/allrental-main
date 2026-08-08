const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  const errors=[]; const failed=[];
  p.on('requestfailed', r => { if(r.url().includes('speedycdn')) failed.push(r.url().slice(50)+' | '+ (r.failure()&&r.failure().errorText)); });
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('매트리스')); if(el) el.click();});
  await p.waitForTimeout(2000);
  for(let i=0;i<6;i++){ await p.evaluate(()=>window.scrollBy(0,900)); await p.waitForTimeout(600); }
  await p.waitForTimeout(2000);
  const csp = await p.evaluate(()=>{ const m=document.querySelector('meta[http-equiv=Content-Security-Policy]'); return m?m.content:'(meta CSP none)'; });
  const imgTag = await p.evaluate(()=>{ const i=[...document.querySelectorAll('img')].find(x=>x.src.includes('speedycdn')); return i?i.outerHTML.slice(0,200):'(no speedycdn img)'; });
  console.log('meta CSP:', csp);
  console.log('sample img tag:', imgTag);
  console.log('failed speedycdn requests:', failed.length);
  failed.slice(0,4).forEach(f=>console.log('  -',f));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
