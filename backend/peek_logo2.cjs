const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  // 상세페이지에서 item_code 폴더 이미지 전체
  await p.goto('https://rentalsegye.com/product.php?no=42272&cid=1377&gid=1424',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    const all=[...document.querySelectorAll('img')].map(i=>i.getAttribute('src')||'');
    const itemCode=all.filter(s=>s.includes('item_code'));
    // 브랜드명 텍스트
    const brandEl=document.querySelector('.product-brand, .brand-name, [class*=brand]');
    return { itemCodeImgs: itemCode, brandText: brandEl?brandEl.textContent.trim():'(none)' };
  });
  console.log('상세 item_code imgs:', JSON.stringify(info.itemCodeImgs,null,1));
  console.log('brand text:', info.brandText);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
