const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  // 정수기 상품 1개
  await p.goto("https://rentalsegye.com/product.php?no=11470&cid=1379&gid=1408",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  const info=await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll("img")].map(i=>({src:i.src,cls:i.className.slice(0,30)}));
    const gif=imgs.filter(i=>/gif/i.test(i.src));
    const main=imgs.filter(i=>/item_product/.test(i.src));
    return {totalImgs:imgs.length, gifCount:gif.length, gifSample:gif.slice(0,3).map(i=>i.src.slice(-40)), mainSample:main.slice(0,2).map(i=>i.src.slice(-40))};
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
