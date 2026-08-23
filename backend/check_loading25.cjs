const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  const t0=Date.now();
  await p.goto("https://allrental-xi.vercel.app?l="+Date.now(),{waitUntil:'domcontentloaded'});
  let gone=null;
  for(let i=0;i<40;i++){
    const still=await p.evaluate(()=>{const e=document.querySelector("[class*='min-h-screen']");return e&&e.className.includes('gradient')&&document.body.innerText.includes('ALL렌탈');});
    if(!still){gone=Date.now()-t0;break;}
    await p.waitForTimeout(100);
  }
  console.log("LOADING DURATION(ms):",gone);
  await b.close();
})();
