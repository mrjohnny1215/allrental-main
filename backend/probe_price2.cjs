const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  await p.goto("https://rentalsegye.com/product.php?no=21408&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2000);
  // 큰 글씨 가격 (font-size 큰 것)
  const big=await p.evaluate(()=>{
    const els=[...document.querySelectorAll("span,div,strong,b,p")];
    const priced=els.filter(e=>/\d{2,3},?\d{3}/.test(e.textContent)&&e.children.length===0);
    priced.sort((a,b)=>parseFloat(getComputedStyle(b).fontSize)-parseFloat(getComputedStyle(a).fontSize));
    return priced.slice(0,5).map(e=>({txt:e.textContent.trim(),fs:getComputedStyle(e).fontSize,cls:e.className.slice(0,30)}));
  });
  console.log("BIG PRICES:",JSON.stringify(big,null,1));
  await b.close();
})();
