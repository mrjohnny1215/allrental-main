const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  await p.goto("https://rentalsegye.com/product.php?no=21408&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  const info=await p.evaluate(()=>{
    const out={};
    // card-information 관련 모든 data
    const cardEls=[...document.querySelectorAll("[class*='card-information'],[id*='card']")];
    out.cardEls=cardEls.slice(0,5).map(e=>({id:e.id,cls:e.className.slice(0,30),htmlLen:e.innerHTML.length, html:e.innerHTML.replace(/\s+/g,' ').slice(0,300)}));
    // 전체 HTML에서 카드배너 이미지 찾기
    const imgs=[...document.querySelectorAll("img")].map(i=>i.src).filter(s=>/banner|card/i.test(s));
    out.cardImgs=imgs.slice(0,5);
    // script 변수
    const scripts=[...document.querySelectorAll("script")].map(s=>s.textContent).filter(t=>/card|partner|benefit/i.test(t));
    out.scriptSnippets=scripts.slice(0,2).map(s=>s.slice(0,200));
    return out;
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
