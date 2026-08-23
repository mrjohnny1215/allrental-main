const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  const apiCalls=[];
  p.on('response', async r=>{
    const u=r.url();
    if(/card|partner|benefit|popup|ajax/i.test(u) && r.request().method()!=='OPTIONS'){
      try{ const t=await r.text(); if(/신한|삼성|현대|국민|롯데|우리|BC|카카오|하나|비씨|카드/.test(t)) apiCalls.push({url:u.slice(0,80), snippet:t.replace(/\s+/g,' ').slice(0,300)}); }catch(e){}
    }
  });
  await p.goto("https://rentalsegye.com/product.php?no=42059&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  // 제휴카드 안내 클릭
  await p.evaluate(()=>{
    const el=[...document.querySelectorAll("a,button,span,div")].find(e=>/제휴카드 안내/.test(e.textContent)&&e.children.length<=1);
    if(el) el.click();
  });
  await p.waitForTimeout(2500);
  // 모달 내용 직접 읽기
  const modal=await p.evaluate(()=>{
    const c=document.querySelector('#card-information-detail-content');
    return c? c.innerText.replace(/\s+/g,' ').slice(0,400) : 'empty';
  });
  console.log("MODAL TEXT:",modal);
  console.log("API CALLS WITH CARD:",JSON.stringify(apiCalls.slice(0,3),null,1));
  await b.close();
})();
