const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'})).newPage();
  // 정수기 후보 URL들
  const urls = [
    'https://www.rentalsegye.com/product_list.php?cid=1379&gid=1406',
    'https://www.rentalsegye.com/product_list.php?cid=1378&gid=1406',
    'https://www.rentalsegye.com/product_list.php?cid=1379&gid=1405',
    'https://www.rentalsegye.com/product_list.php?cid=1377',
  ];
  for (const u of urls) {
    try {
      await p.goto(u,{waitUntil:'networkidle', timeout:20000});
      await p.waitForTimeout(3000);
      const data = await p.evaluate(()=>{
        return [...document.querySelectorAll('.smart-filter-section')].map(s=>{
          const title=s.querySelector('.smart-filter-section-title')?.textContent?.trim();
          const opts=[...s.querySelectorAll('.smart-filter-options button, .smart-filter-options label, .smart-filter-options a, .smart-filter-options span')].map(o=>o.textContent.trim()).filter(t=>t&&t.length<30);
          return {title, opts:[...new Set(opts)]};
        });
      });
      console.log('\n=== '+u+' ===');
      if(data.length===0) console.log('(필터 없음/페이지 다름)');
      data.forEach(s=>console.log('['+s.title+'] => '+JSON.stringify(s.opts)));
    } catch(e){ console.log(u,'ERR',e.message); }
  }
  await b.close();
})();
