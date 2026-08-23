const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  // 안마의자 상품 (GIF 많은 카테고리)
  await p.goto("https://rentalsegye.com/product.php?no=21408&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  const info=await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll("img")].map(i=>i.src).filter(s=>/item_product|editor|speedycdn/.test(s));
    const gif=imgs.filter(s=>/gif/i.test(s));
    return {productImgs:imgs.slice(0,5), gifCount:gif.length, gifSample:gif.slice(0,3)};
  });
  console.log("안마의자 이미지:",JSON.stringify(info,null,1));
  await b.close();
})();
