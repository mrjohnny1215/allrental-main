const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  // LG MX9 (할인가 없던 상품)
  await p.goto("https://rentalsegye.com/product.php?no=42059&cid=1378&gid=1404",{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  const info=await p.evaluate(()=>{
    const out={};
    // 모든 input 중 카드할인/할인 관련
    const inputs=[...document.querySelectorAll("input")].map(i=>({name:i.name,id:i.id,value:i.value})).filter(i=>/card|sale|discount|price|amount/i.test(i.name+i.id));
    out.cardInputs=inputs.slice(0,10);
    // 제휴카드 영역 텍스트
    const txt=document.body.innerText;
    const m=txt.match(/제휴카드[\s\S]{0,200}/);
    out.partnerCardText=m?m[0].replace(/\n+/g,' | ').slice(0,200):'no 제휴카드 text';
    // 제휴카드 관련 셀렉터
    const sel=['.partner-card','.card-benefit','.card-banner','[class*="card"]','.benefit'];
    out.selText={};
    sel.forEach(s=>{const e=document.querySelector(s); if(e) out.selText[s]=e.innerText.replace(/\n+/g,' | ').slice(0,100);});
    return out;
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
