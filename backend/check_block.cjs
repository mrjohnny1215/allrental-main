const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  try{
    const r=await p.goto("https://rentalsegye.com/",{waitUntil:'domcontentloaded',timeout:15000});
    const t=await p.title();
    console.log("STATUS:",r.status(),"| TITLE:",t.slice(0,30));
  }catch(e){ console.log("BLOCKED/ERR:",e.message.slice(0,50)); }
  await b.close();
})();
