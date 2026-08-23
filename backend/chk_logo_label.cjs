const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
  let logoOK=0, logoFail=0, labelOK=0, discOK=0;
  const targets=[['정수기'],['공기청정기'],['비데'],['매트리스']];
  for(const [cat] of targets){
    await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(3000);
    await p.evaluate((c)=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(c)); if(el) el.click();}, cat);
    await p.waitForTimeout(2000);
    for(let i=0;i<6;i++){ await p.evaluate(()=>window.scrollBy(0,900)); await p.waitForTimeout(500); }
    const r = await p.evaluate(()=>{
      const cards=[...document.querySelectorAll('[data-testid=card]')];
      let logoImg=0, logoTxt=0, badge=0, disc=0;
      cards.forEach(c=>{
        const imgs=c.querySelectorAll('img');
        const logo=imgs[0];
        if(logo && logo.naturalWidth>0 && /item_code|speedycdn/.test(logo.src)) logoImg++;
        else if(c.querySelector('.h-9 span') && c.querySelector('.h-9 span').textContent.trim()) logoTxt++;
        const txt=c.textContent;
        if(/반값할인|타사보상|BEST/.test(txt)) badge++;
        if(/할인적용/.test(txt)) disc++;
      });
      return { cards:cards.length, logoImg, logoTxt, badge, disc };
    });
    console.log(`[${cat}] 카드:${r.cards} | 로고이미지:${r.logoImg} | 로고텍스트폴백:${r.logoTxt} | 라벨(할인뱃지):${r.badge} | 할인적용:${r.disc}`);
    logoOK+=r.logoImg; logoFail+=r.logoTxt; labelOK+=r.badge; discOK+=r.disc;
  }
  console.log('\n합계 | 로고이미지:',logoOK,'로고텍스트폴백:',logoFail,'라벨:',labelOK,'할인적용:',discOK);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
