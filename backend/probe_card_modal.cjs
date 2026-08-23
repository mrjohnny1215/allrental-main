const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  await p.goto("https://rentalsegye.com/product.php?no=42059&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  // 제휴카드 안내 버튼/링크 클릭
  const clicked=await p.evaluate(()=>{
    const el=[...document.querySelectorAll("a,button,span,div")].find(e=>/제휴카드 안내/.test(e.textContent)&&e.children.length<=1);
    if(el){ el.click(); return true; }
    return false;
  });
  await p.waitForTimeout(2000);
  const modal=await p.evaluate(()=>{
    // 모달 팝업 찾기
    const modals=[...document.querySelectorAll("div")].filter(e=>{
      const t=e.innerText||'';
      return /(신한|삼성|현대|국민|롯데|우리|BC|카카오|하나|비씨)/.test(t) && t.length<500;
    });
    return modals.slice(0,3).map(m=>m.innerText.replace(/\s+/g,' ').slice(0,200));
  });
  console.log("CLICKED:",clicked);
  console.log("MODAL CARDS:",JSON.stringify(modal,null,1));
  await b.close();
})();
