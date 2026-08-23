const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
const nos=["42059","46877","46886"];
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  for(const no of nos){
    const p=await b.newPage({viewport:{width:1280,height:900}});
    await p.goto(`https://rentalsegye.com/products.php?no=${no}&cid=1378&gid=1404`,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(3000);
    const info=await p.evaluate(()=>{
      const t=document.body.innerText;
      const idx=t.indexOf('최저 월 렌탈료');
      const slice=t.slice(idx, idx+80).replace(/\s+/g,' ');
      const m=slice.match(/([\d,]+) 원 할인적용 ([)\d,]+) 원/);
      return {slice, m:m?[m[1].replace(/,/g,''),m[2].replace(/,/g,'')]:null};
    });
    console.log(no,JSON.stringify(info));
    await p.close();
  }
  await b.close();
})();
