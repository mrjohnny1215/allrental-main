const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
const clickCat = (n) => { const els=[...document.querySelectorAll('button')]; const t=els.find(b=>b.textContent.includes(n)); if(t) t.click(); };
const getChips = () => {
  const groups={};
  [...document.querySelectorAll('*')].forEach(el=>{
    if(el.children.length===0) return;
    // 라벨 찾기: span/div 중 '기능' 등
  });
  // 간단히: 모든 rounded-full 버튼 텍스트 + 라벨 span
  const labels=[...document.querySelectorAll('span,div')].map(s=>s.textContent.trim()).filter(t=>['기능','타입','정수방식','렌탈료','평형'].includes(t));
  const chips=[...document.querySelectorAll('button')].filter(b=>/rounded-full|rounded/.test(b.className)).map(b=>b.textContent.trim());
  return {labels, chips};
};
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  for(const [cat,name] of [['water','정수기'],['bidet','비데'],['mattress','매트리스']]){
    await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(3000);
    await p.evaluate(clickCat, name);
    await p.waitForTimeout(1000);
    const r = await p.evaluate(()=>{
      const chips=[...document.querySelectorAll('button')].filter(b=>/rounded/.test(b.className)).map(b=>b.textContent.trim());
      return chips;
    });
    console.log(`\n[${name}] 칩:`, r.join(' | '));
    // 확인해야 할 삭제 항목
    const removed = {water:['냉수전용','온수전용','탄산전용','탱크형','10만원이상'], bidet:['3만원대','4~10만원','10만원이상'], mattress:['1만원이하']}[cat];
    const stillThere = removed.filter(x=>r.includes(x));
    console.log('  삭제되어야 할 항목 중 남은 것:', stillThere.length? stillThere.join(','):'(없음 ✓)');
  }
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
