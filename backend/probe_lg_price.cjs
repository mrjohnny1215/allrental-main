const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
const urls=["https://rentalsegye.com/products.php?no=42059&cid=1378&gid=1404","https://rentalsegye.com/products.php?no=46877&cid=1378&gid=1404","https://rentalsegye.com/products.php?no=46886&cid=1378&gid=1404"];
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  for(const u of urls){
    const p=await b.newPage({viewport:{width:1280,height:900}});
    await p.goto(u,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(2500);
    const info=await p.evaluate(()=>{
      const t=document.body.innerText;
      // 정가
      const m1=t.match(/정가[^\d]*([\d,]+)원/);
      const m2=t.match(/월\s*렌탈료[^\d]*([\d,]+)원/);
      const m3=t.match(/할인적용[^\d]*([\d,]+)원/);
      const it=document.querySelector('input[name="it_price"]');
      const sale=document.querySelector('input[name="card_sale_amount"]');
      return {it_price:it?it.value:'',card_sale:sale?sale.value:'',정가:m1?m1[1]:'',월료:m2?m2[1]:'',할인:m3?m3[1]:''};
    });
    console.log(u.split('no=')[1].split('&')[0],JSON.stringify(info));
    await p.close();
  }
  await b.close();
})();
