const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'})).newPage();
  try {
    await p.goto('https://rentalsegye.com/product_list.php?&cid=1377&gid=1424',{waitUntil:'networkidle', timeout:25000});
    await p.waitForTimeout(4000);
    const info = await p.evaluate(()=>{
      const cards=document.querySelectorAll('.product-item, .prd-item, .item, [class*=product], [class*=goods], li');
      // 상품명 보이는 요소 수
      const names=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && /\[.*\]/.test(e.textContent||'') && (e.textContent||'').length<60);
      return {
        url: location.href,
        title: document.title,
        bodyText: document.body.innerText.slice(0,300),
        cardCount: cards.length,
        nameLike: names.length
      };
    });
    console.log('실제URL:', info.url);
    console.log('타이틀:', info.title);
    console.log('카드류 요소:', info.cardCount, '| 이름후보:', info.nameLike);
    console.log('--- body 앞 300자 ---');
    console.log(info.bodyText);
  } catch(e){ console.log('ERR',e.message); }
  await b.close();
})();
