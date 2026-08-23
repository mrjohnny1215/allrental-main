const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  const ajaxData=[];
  p.on('response',async r=>{
    const u=r.url();
    if(/card/i.test(u)&&r.request().method()==='POST'){
      try{ const t=await r.text(); if(t.length>30&&/card|혜택|할인|benefit/i.test(t)) ajaxData.push({url:u.slice(0,90),body:t.slice(0,500)}); }catch(e){}
    }
  });
  await p.goto("https://rentalsegye.com/product.php?no=21408&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  // btn-card-infomation 정보
  const btn=await p.evaluate(()=>{
    const el=document.querySelector('.btn-card-infomation');
    return el?{iid:el.dataset.iid, href:el.getAttribute('href'), cls:el.className}:'no btn';
  });
  console.log("BTN:",JSON.stringify(btn));
  // 클릭
  if(btn!=='no btn'){
    await p.evaluate(()=>document.querySelector('.btn-card-infomation').click());
    await p.waitForTimeout(3000);
  }
  console.log("AJAX:",JSON.stringify(ajaxData.slice(0,3),null,1));
  await b.close();
})();
