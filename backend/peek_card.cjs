const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'})).newPage();
  try {
    await p.goto('https://rentalsegye.com/product_list.php?&cid=1377&gid=1424',{waitUntil:'networkidle', timeout:25000});
    await p.waitForTimeout(4000);
    const cards = await p.evaluate(()=>{
      // 상품 카드 후보: 이미지+텍스트 포함 블록
      const items=[...document.querySelectorAll('li, div')].filter(e=>{
        const txt=e.innerText||'';
        return /월 렌탈료|렌탈료/.test(txt) && e.querySelectorAll('img').length>=1 && txt.length<400;
      }).slice(0,3);
      return items.map(it=>{
        const imgs=[...it.querySelectorAll('img')].map(i=>({src:i.src,cls:i.className,w:i.naturalWidth,h:i.naturalHeight}));
        const logoImg=imgs.find(i=>i.src.includes('logo')||i.src.includes('brand')||/logo|brand/i.test(i.cls));
        const prodImg=imgs.find(i=>!logoImg||i!==logoImg);
        return {
          text: it.innerText.replace(/\n+/g,' | '),
          imgCount: imgs.length,
          logo: logoImg?logoImg.src:null,
          productImg: prodImg?prodImg.src:null,
          html: it.outerHTML.slice(0,600)
        };
      });
    });
    cards.forEach((c,i)=>{
      console.log('\n=== 카드 '+i+' ===');
      console.log('텍스트:', c.text);
      console.log('이미지수:', c.imgCount, '| 로고:', c.logo, '| 상품:', c.productImg);
    });
  } catch(e){ console.log('ERR',e.message); }
  await b.close();
})();
