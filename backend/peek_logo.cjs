const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  // promotion 있는 상품 찾아서 상세페이지 logo 위치 확인
  await p.goto('https://rentalsegye.com/product.php?no=42272&cid=1377&gid=1424',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    // item_code/logo 이미지
    const logoImgs=[...document.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),cls:i.className})).filter(i=>/item_code/.test(i.src)&&/logo/.test(i.src));
    // card-logo 클래스
    const cardLogo=document.querySelector('.card-logo');
    // 상세페이지 어디에 logo 있는지
    const anyLogo=[...document.querySelectorAll('img')].filter(i=>/logo/i.test(i.className)||/logo/i.test(i.getAttribute('src')||''));
    return { logoImgs, cardLogoSrc: cardLogo?cardLogo.getAttribute('src'):'(none)', anyLogoCount:anyLogo.length };
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
