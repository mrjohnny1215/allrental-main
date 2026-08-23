const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  const captured=[];
  p.on('request',r=>{
    const u=r.url();
    if(/card|partner|benefit|popup|ajax|modal/i.test(u) && r.method()==='POST' && !u.includes('css') && !u.includes('.js')){
      captured.push({url:u, body:r.postData()});
    }
  });
  p.on('response',async r=>{
    const u=r.url();
    if(/card|partner|benefit/i.test(u) && r.request().method()==='POST'){
      try{ const t=await r.text(); if(t.length>50) captured.push({respUrl:u.slice(0,100), resp:t.slice(0,600)}); }catch(e){}
    }
  });
  await p.goto("https://rentalsegye.com/product.php?no=21408&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  // btn 찾아서 data-iid 확인 + 직접 AJAX 호출 시도
  const iid=await p.evaluate(()=>{const el=document.querySelector('.btn-card-infomation'); return el?el.dataset.iid:null;});
  console.log("IID:",iid);
  // 버튼 클릭
  await p.evaluate(()=>{const el=document.querySelector('.btn-card-infomation'); if(el) el.click();});
  await p.waitForTimeout(3000);
  console.log("CAPTURED:",JSON.stringify(captured.slice(0,5),null,1));
  await b.close();
})();
