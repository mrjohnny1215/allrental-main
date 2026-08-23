const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  await p.goto("https://rentalsegye.com/products.php?no=42059&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  const info=await p.evaluate(()=>{
    const t=document.body.innerText.replace(/\n+/g,' ').slice(0,500);
    const h=document.querySelector('h1,h2,H1.product-title');
    return {title:h?h.textContent.slice(0,40):'NO H1', text:t};
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
