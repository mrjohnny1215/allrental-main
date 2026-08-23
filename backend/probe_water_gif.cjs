const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const urls=[
    "https://rentalsegye.com/product.php?no=11470&cid=1379&gid=1408", // 코웨이 비데(아까 JPG였음)
    "https://rentalsegye.com/product.php?no=17552&cid=1379&gid=1408", // 정수기 다른거
    "https://rentalsegye.com/product.php?no=18729&cid=1379&gid=1408",
  ];
  for(const u of urls){
    const p=await b.newPage({viewport:{width:1280,height:900}});
    await p.goto(u,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(2000);
    const info=await p.evaluate(()=>{
      const imgs=[...document.querySelectorAll("img")].map(i=>i.src).filter(s=>/item_product/.test(s));
      const gif=imgs.filter(s=>/gif/i.test(s));
      const main=imgs.find(s=>/item_product\/(?!thumb)/.test(s))||imgs[0];
      return {gifCount:gif.length, mainIsGif:/gif/i.test(main||''), main:main?main.slice(-45):'none'};
    });
    console.log(u.split('no=')[1].split('&')[0], '->', JSON.stringify(info));
    await p.close();
  }
  await b.close();
})();
