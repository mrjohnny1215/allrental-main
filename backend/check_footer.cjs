const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto("https://allrental-xi.vercel.app?f="+Date.now(),{waitUntil:'networkidle'});
  await p.waitForTimeout(5000);
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await p.waitForTimeout(1000);
  const res=await p.evaluate(()=>{
    const f=document.querySelector("footer");
    const bg=getComputedStyle(f).backgroundColor;
    const txt=f.innerText;
    return {bg, hasAddress:/Muan-gun/.test(txt), hasEnglish:/ALL\(AII\) Rental/.test(txt), hasKorean:/올\(AII\)렌탈/.test(txt), text:txt.replace(/\n+/g,' | ')};
  });
  console.log("FOOTER:",JSON.stringify(res,null,1));
  await b.close();
})();
