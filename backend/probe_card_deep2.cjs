const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  await p.goto("https://rentalsegye.com/product.php?no=21408&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  // 제휴카드 영역 전체 텍스트 + 배너 이미지 alt/주변
  const info=await p.evaluate(()=>{
    const sec=document.querySelector('.card-information-modal');
    const parent=sec?sec.closest('section,div,li'):null;
    // 배너 이미지들
    const banners=[...document.querySelectorAll("img")].filter(i=>/item_banner/.test(i.src)).map(i=>({src:i.src.slice(-40),alt:i.alt}));
    // 카드 관련 텍스트 (할인/연회비/1588 등)
    const body=document.body.innerText;
    const cardTxt=body.match(/제휴카드[\s\S]{0,600}/);
    return {banners:banners.slice(0,5), cardSectionText: cardTxt?cardTxt[0].replace(/\n+/g,' | ').slice(0,400):'none'};
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
