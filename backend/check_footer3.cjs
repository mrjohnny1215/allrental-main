const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto("https://allrental-xi.vercel.app?f3="+Date.now(),{waitUntil:'networkidle'});
  // 로딩 5초 대기
  await p.waitForTimeout(8000);
  // footer 나올 때까지 스크롤 반복
  for(let i=0;i<3;i++){
    await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    await p.waitForTimeout(1500);
  }
  const res=await p.evaluate(()=>{
    const f=document.querySelector("footer");
    if(!f) return {found:false, html:document.body.innerHTML.slice(-500)};
    const bg=getComputedStyle(f).backgroundColor;
    const txt=f.innerText;
    return {found:true,bg, hasAddress:/Muan-gun/.test(txt), hasEnglish:/ALL\(AII\) Rental/.test(txt), hasKorean:/올\(AII\)렌탈/.test(txt), text:txt.replace(/\n+/g,' | ')};
  });
  console.log("FOOTER:",JSON.stringify(res,null,1));
  await b.close();
})();
