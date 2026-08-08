const { chromium } = require('playwright');
const EXE = '/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  await p.goto('https://rentalsegye.com/product.php?no=47186&cid=1486&gid=1580',{waitUntil:'domcontentloaded',timeout:25000});
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => {
    const og = document.querySelector('meta[property="og:image"]');
    const imgs = [...document.querySelectorAll('.product-img img, .product-image img, #sit_pvi_img, .item_photo_big img, img')]
      .map(i=>i.getAttribute('src'))
      .filter(s=>s && /speedycdn|tlpartner/.test(s))
      .slice(0,8);
    return { og: og?og.getAttribute('content'):'', imgs };
  });
  console.log('og:image=',info.og);
  console.log('speedycdn imgs=',JSON.stringify(info.imgs,null,1));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
