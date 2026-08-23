const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
const urls={"42059":986900,"46877":0,"46886":0};
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  for(const [no,force] of Object.entries(urls)){
    const p=await b.newPage({viewport:{width:1280,height:900}});
    await p.goto(`https://rentalsegye.com/products.php?no=${no}&cid=1378&gid=1404`,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(3000);
    const info=await p.evaluate(()=>{
      const t=document.body.innerText;
      const m=t.match(/최저 월 렌탈료 ([\d,]+) 원 할인적용 ([\d,]+) 원/);
      return m?{it:m[1].replace(/,/g,''),disc:m[2].replace(/,/g,'')}:{none:true};
    });
    console.log(no,JSON.stringify(info));
    await p.close();
  }
  await b.close();
})();
