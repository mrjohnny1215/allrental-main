const { chromium } = require('playwright');
// 각 카테고리: cid(대분류), gid(중분류)
const cats = {
  water:    {cid:'1379',gid:'1406'},
  air:      {cid:'1379',gid:'1407'},
  bidet:    {cid:'1379',gid:'1408'},
  mattress: {cid:'1486',gid:'1580'},
};
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const ctx = await b.newContext({viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'});
  const p = await ctx.newPage();
  for (const [key,c] of Object.entries(cats)) {
    try {
      await p.goto(`https://www.rentalsegye.com/product_list.php?cid=${c.cid}&gid=${c.gid}`,{waitUntil:'networkidle', timeout:25000});
      await p.waitForTimeout(3500);
      const data = await p.evaluate(()=>{
        return [...document.querySelectorAll('.smart-filter-section')].map(s=>{
          const title=s.querySelector('.smart-filter-section-title')?.textContent?.trim();
          // 옵션: 버튼/라벨/앵커 텍스트 (정확한 문자열)
          const opts=[...s.querySelectorAll('.smart-filter-options button, .smart-filter-options label, .smart-filter-options a, .smart-filter-options .opt, .smart-filter-options span')]
            .map(o=>o.textContent.trim())
            .filter(t=>t && t.length<30);
          return {title, opts:[...new Set(opts)]};
        });
      });
      console.log('\n=== '+key+' ===');
      data.forEach(s=>console.log('['+s.title+'] => '+JSON.stringify(s.opts)));
    } catch(e){ console.log(key,'ERR',e.message); }
  }
  await b.close();
})();
