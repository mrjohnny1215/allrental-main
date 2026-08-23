const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  await p.goto("https://rentalsegye.com/product_list.php?cid=1379&gid=1408",{waitUntil:'domcontentloaded'}); // 정수기
  await p.waitForTimeout(3000);
  const info=await p.evaluate(()=>{
    // 카드들
    const cards=[...document.querySelectorAll("a,div,li")].filter(e=>/BEST|NEW|타사보상|반값할인|면제|개월/.test(e.textContent)&&e.children.length<=2);
    const tags=[...new Set(cards.map(e=>e.textContent.trim()))].slice(0,20);
    return {tags};
  });
  console.log("LIST TAGS:",JSON.stringify(info.tags,null,1));
  await b.close();
})();
