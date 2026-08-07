const { chromium } = require('playwright');
const urls = [
 'https://www.rentalsegye.com/product.php?no=19904&cid=1379&gid=1408',
 'https://www.rentalsegye.com/product.php?no=22092&cid=1379&gid=1408',
 'https://www.rentalsegye.com/product.php?no=25600&cid=1377&gid=1424',
 'https://www.rentalsegye.com/product.php?no=11309&cid=1377&gid=1424',
 'https://www.rentalsegye.com/product.php?no=19899&cid=1377&gid=1424',
 'https://www.rentalsegye.com/product.php?no=41405&cid=1377&gid=1424'
];
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const ctx = await b.newContext({viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'});
  const p = await ctx.newPage();
  for (const u of urls) {
    try {
      await p.goto(u,{waitUntil:'domcontentloaded', timeout:20000});
      await p.waitForTimeout(2500);
      const info = await p.evaluate(()=>{
        const nameSel=['h1','.product_name','.view_name','.item_name','.prd_name','.goods_name','.p_name'];
        let name='';
        for(const s of nameSel){const e=document.querySelector(s);if(e&&e.textContent.trim()){name=e.textContent.trim();break;}}
        // 가격: it_price hidden or .price
        let price='';
        const pe=document.querySelector('input[name=it_price]')||document.querySelector('[id*=it_price]');
        if(pe) price=pe.value||pe.getAttribute('value')||'';
        if(!price){const px=document.querySelector('.price, [class*=price]');if(px)price=px.textContent.trim().replace(/[^0-9]/g,'');}
        const cat=document.querySelector('.location, .breadcrumb, .navi')?.textContent?.trim().slice(0,40)||'';
        return {name, price, cat, url2:location.href};
      });
      console.log('URL:',u);
      console.log('  실제URL:',info.url2);
      console.log('  이름:',info.name||'(없음)','| 가격:',info.price||'(없음)','| 위치:',info.cat);
    } catch(e){ console.log(u,'ERR',e.message); }
  }
  await b.close();
})();
