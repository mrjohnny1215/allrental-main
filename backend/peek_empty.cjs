const { chromium } = require('playwright');
const urls = [
 'https://www.rentalsegye.com/product.php?no=19904&cid=1379&gid=1408',
 'https://www.rentalsegye.com/product.php?no=25600&cid=1377&gid=1424'
];
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'})).newPage();
  for (const u of urls) {
    try {
      await p.goto(u,{waitUntil:'domcontentloaded', timeout:20000});
      await p.waitForTimeout(2500);
      const info = await p.evaluate(()=>{
        const title=document.querySelector('h1, .product_name, .view_name, .item_name')?.textContent?.trim()||'';
        const price=document.querySelector('.product_price, .price, [class*=price]')?.textContent?.trim()||'';
        return {title, price, bodyLen:document.body.innerText.length};
      });
      console.log(u);
      console.log('  title:',info.title,'| price:',info.price,'| bodyLen:',info.bodyLen);
    } catch(e){ console.log(u,'ERR',e.message); }
  }
  await b.close();
})();
