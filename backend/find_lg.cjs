const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  // LG전자 상품 검색
  await p.goto('https://rentalsegye.com/product_search.php?search=LG전자',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  for(let i=0;i<5;i++){ await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight)); await p.waitForTimeout(600); }
  const data = await p.evaluate(() => {
    const out=[];
    [...document.querySelectorAll('a')].filter(a=>a.href.includes('product.php')).forEach(a=>{
      const logo=a.querySelector('.card-logo');
      const m=(a.textContent||'').match(/\[LG전자\]/);
      if(logo && m) out.push(logo.getAttribute('src'));
    });
    return out;
  });
  console.log('LG전자 로고:', data.slice(0,3));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
