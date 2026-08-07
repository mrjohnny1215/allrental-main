const fs = require('fs');
const { chromium } = require('playwright');
const FILE='/opt/data/allrental/merged_products.json';
function load(){ return JSON.parse(fs.readFileSync(FILE,'utf-8')); }
function save(d){ fs.writeFileSync(FILE, JSON.stringify(d,null,2)); }

(async () => {
  const browser = await chromium.launch({ args:['--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' });
  const items=Object.entries(load());
  console.log('전체:', items.length);
  let done=0, ok=0, blocked=0;
  for (const [url, v] of items){
    const page=await ctx.newPage();
    let got=[];
    try{
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForTimeout(900);
      got=await page.evaluate(()=>{
        const out=[];
        for (const secId of ['#section-info','#section-detail']){
          const sec=document.querySelector(secId);
          if(sec){ for(const im of sec.querySelectorAll('img')){ const s=im.getAttribute('src')||''; if(s.includes('speedycdn')||s.startsWith('//tlpartner')){ let f=s.startsWith('//')?'https:'+s:s; if(!out.includes(f)) out.push(f); } } }
        }
        return out;
      });
    }catch(e){}
    await page.close();
    if (got.length){ v.detail_images=got; ok++; } else { blocked++; }
    done++;
    if(done%50===0){ save(load()); console.log(`  ${done}/${items.length} ok ${ok} blocked ${blocked}`); }
    if(blocked>0&&blocked%10===0){ console.log('  차단 25초대기'); await new Promise(r=>setTimeout(r,25000)); }
    await new Promise(r=>setTimeout(r,1000));
  }
  save(load());
  console.log('완료 ok',ok,'blocked',blocked);
  await browser.close();
})();
