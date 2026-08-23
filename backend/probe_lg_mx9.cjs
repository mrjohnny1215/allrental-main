const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  await p.goto("https://rentalsegye.com/product.php?no=42059&cid=1378&gid=1404",{waitUntil:'networkidle'});
  await p.waitForTimeout(3000);
  const info=await p.evaluate(()=>{
    const cs=document.querySelector('input[name=card_sale_amount]');
    const ip=document.querySelector('input#it_price');
    const ro1=[...document.querySelectorAll('input[name="rental_option_1"]')].map(o=>o.value);
    const txt=document.body.innerText.match(/할인적용\s*(\d{1,3}(?:,\d{3})*원)/);
    return {card_sale:cs?cs.value:null, it_price:ip?ip.value:null, rental_option_1:ro1.slice(0,3), 할인적용화면:txt?txt[1]:'없음'};
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
