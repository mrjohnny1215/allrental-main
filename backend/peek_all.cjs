const { chromium } = require('playwright');
const cats = {
  air:    {cid:'1379',gid:'1407'},
  bidet:  {cid:'1379',gid:'1408'},
  mattress:{cid:'1486',gid:'1580'},
};
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'})).newPage();
  for (const [key,c] of Object.entries(cats)) {
    try {
      await p.goto(`https://www.rentalsegye.com/product_list.php?cid=${c.cid}&gid=${c.gid}`,{waitUntil:'domcontentloaded', timeout:20000});
      await p.waitForTimeout(3000);
      const secs = await p.evaluate(()=>{
        return [...document.querySelectorAll('.smart-filter-section')].map(s=>{
          const title=s.querySelector('.smart-filter-section-title')?.textContent?.trim();
          const opts=[...s.querySelectorAll('.smart-filter-options button, .smart-filter-options a, .smart-filter-options label')].map(o=>o.textContent.trim()).filter(t=>t&&t.length<25);
          return {title, opts:[...new Set(opts)]};
        });
      });
      console.log('=== '+key+' ===');
      secs.forEach(s=>console.log(s.title+':', s.opts.join(' | ')));
    } catch(e){ console.log(key,'ERR',e.message); }
  }
  await b.close();
})();
