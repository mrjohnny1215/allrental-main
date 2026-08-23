const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  await p.goto("https://rentalsegye.com/product.php?no=21408&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  const info=await p.evaluate(()=>{
    // 카드 배너 이미지 (item_banner)
    const banners=[...document.querySelectorAll("img")].map(i=>i.src).filter(s=>/item_banner/.test(s));
    // 카드사명 텍스트 (배너 옆)
    const cardNames=[...document.querySelectorAll("*")].map(e=>e.textContent.trim()).filter(t=>/카드$/.test(t)&&t.length<20);
    return {banners:banners.slice(0,5), cardNames:[...new Set(cardNames)].slice(0,8)};
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
