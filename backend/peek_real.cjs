const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  // 50207 (프리모) - 내가 채운 18개 중 하나
  await p.goto('https://rentalsegye.com/product.php?no=50207&cid=1486&gid=1580',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2000);
  const info = await p.evaluate(() => {
    const imgs=[...document.querySelectorAll('img')].map(i=>i.getAttribute('src')||'').filter(s=>s.includes('item_product')&&s.includes('speedycdn'));
    // 메인 썸네일? .product-img / .item_photo
    const main = document.querySelector('.product-img img, .item_photo_big img, #sit_pvi_img, .sit_pvi_img img, .product-thumb img');
    return { allImgs: imgs.slice(0,5), mainSrc: main?main.getAttribute('src'):'(none)' };
  });
  console.log('50207 all item_product imgs:', JSON.stringify(info.allImgs,null,1));
  console.log('50207 main thumb:', info.mainSrc);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
