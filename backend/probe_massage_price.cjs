const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  const url="https://rentalsegye.com/product.php?no=21408&cid=1378&gid=1404";
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2000);
  const info=await p.evaluate(()=>{
    const out={};
    // 가격 텍스트들
    const all=[...document.querySelectorAll("*")].map(e=>e.textContent.trim()).filter(t=>/\d{2,3},?\d{3}/.test(t)&&t.length<15);
    out.priceTexts=[...new Set(all)].slice(0,15);
    // it_price input
    const ip=document.querySelector('input#it_price'); out.it_price=ip?ip.value:null;
    // 렌탈 기본가 영역 (보통 .rental-price, .price_box, 또는 테이블)
    out.tables=[...document.querySelectorAll('table')].slice(0,2).map(t=>t.innerText.replace(/\n+/g,' | ').slice(0,200));
    return out;
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
