const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  await p.goto("https://rentalsegye.com/product.php?no=42059&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  const info=await p.evaluate(()=>{
    const out={};
    const secs=[...document.querySelectorAll("section,div,li")].filter(e=>/제휴카드/.test(e.textContent));
    out.sections=secs.slice(0,2).map(s=>({cls:s.className.slice(0,40), html:s.innerHTML.replace(/\s+/g,' ').slice(0,400)}));
    out.popup=[...document.querySelectorAll("[class*='popup'],[class*='layer'],[class*='modal'],[id*='card']")].map(e=>({id:e.id,cls:e.className.slice(0,30),txt:e.innerText.replace(/\s+/g,' ').slice(0,80)}));
    return out;
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
