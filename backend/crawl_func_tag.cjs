const { chromium } = require('playwright');
const fs = require('fs');
const OUT='backend/func_tags.json';
const VALID = ['냉수전용','냉온전용','얼음냉온','얼음냉정','온수전용','정수전용','커피정수기','탄산정수기'];
const UAS = [
 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async () => {
  const pd = JSON.parse(fs.readFileSync('products_data.json','utf-8'));
  const water = pd.filter(x => x.category==='water' && x.url);
  let result = {}; try { result = JSON.parse(fs.readFileSync(OUT,'utf-8')); } catch(e){}
  let i=0, ok=0, skip=0;
  // 이미 수집된 건 카운트만
  for (const x of water) if(result[x.url]) ok++;
  while (i < water.length) {
    const ua = UAS[i % UAS.length];
    const browser = await chromium.launch({ args:['--no-sandbox'] });
    const ctx = await browser.newContext({ userAgent:ua, viewport:{width:1280,height:900} });
    const page = await ctx.newPage();
    const end = Math.min(i+12, water.length);
    for (; i<end; i++) {
      const x = water[i];
      if(result[x.url]) continue;
      try {
        await page.goto(x.url,{waitUntil:'domcontentloaded',timeout:20000});
        await sleep(1500);
        const tag = await page.evaluate((vals)=>{
          const t=document.body.innerText; const k=t.indexOf('기능');
          if(k<0) return '';
          const snip=t.slice(k,k+30).replace(/\n/g,' ');
          for(const v of vals) if(snip.includes(v)) return v;
          return '';
        }, VALID);
        if(tag){ result[x.url]=tag; ok++; } else { skip++; }
      } catch(e){ skip++; }
      await sleep(200);
    }
    await browser.close();
    fs.writeFileSync(OUT, JSON.stringify(result,null,2));
    console.log(`진행 ${i}/${water.length} | ok:${ok} skip:${skip}`);
  }
  console.log(`=== 완료: ok:${ok} skip:${skip} 전체:${water.length} ===`);
})();
