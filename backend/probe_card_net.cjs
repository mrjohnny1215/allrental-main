const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  const reqs=[];
  p.on('request',r=>{ const u=r.url(); if(/card/i.test(u)&&!u.includes('css')&&!u.includes('js')) reqs.push(u); });
  const resps=[];
  p.on('response',async r=>{
    const u=r.url();
    if(/card/i.test(u)&&!u.includes('css')&&!u.includes('js')&&r.request().method()!=='OPTIONS'){
      try{ const t=await r.text(); if(t.length>20) resps.push({url:u.slice(0,100),body:t.slice(0,400)}); }catch(e){}
    }
  });
  await p.goto("https://rentalsegye.com/product.php?no=21408&cid=1378&gid=1404",{waitUntil:'domcontentloaded'}); // 코웨이 안마의자
  await p.waitForTimeout(2000);
  // 제휴카드 안내 클릭
  await p.evaluate(()=>{const el=[...document.querySelectorAll("*")].find(e=>/제휴카드 안내/.test(e.textContent)&&e.children.length<=1); if(el) el.click();});
  await p.waitForTimeout(3000);
  console.log("REQUESTS:",JSON.stringify(reqs.slice(0,10),null,1));
  console.log("RESPONSES:",JSON.stringify(resps.slice(0,5),null,1));
  await b.close();
})();
