const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  await p.goto('https://rentalsegye.com/product_list.php?cid=1377&gid=1424',{waitUntil:'domcontentloaded'}); // 정수기
  await p.waitForTimeout(3000);
  const info = await p.evaluate(() => {
    const cards=[...document.querySelectorAll('a')].filter(a=>a.href.includes('product.php'));
    const first=cards[0];
    if(!first) return {err:'no card'};
    // 카드 내 뱃지(빨간/강조 텍스트)
    const txts=[...first.querySelectorAll('*')].map(e=>e.textContent.trim()).filter(t=>t && (t.includes('할인')||t.includes('반값')||t.includes('보상')||t.includes('이벤트')||t.includes('%')||t.includes('원')));
    // 로고 이미지
    const imgs=[...first.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),cls:i.className,w:i.naturalWidth}));
    // 뱃지 클래스 찾기
    const badges=[...first.querySelectorAll('span,div,em,strong')].filter(e=>{const t=e.textContent.trim(); return /할인|반값|보상|이벤트|원할인|혜택/.test(t) && t.length<20;}).map(e=>({t:e.textContent.trim(),cls:e.className}));
    return { href:first.href.slice(0,60), badges, imgs:imgs.slice(0,6) };
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
