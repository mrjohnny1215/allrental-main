const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'})).newPage();
  try {
    await p.goto('https://www.rentalsegye.com/product_list.php?cid1377&gid1424',{waitUntil:'domcontentloaded', timeout:20000});
  } catch(e){ console.log('NAV_ERR:',e.message); await b.close(); return; }
  await p.waitForTimeout(3000);
  const txt = await p.evaluate(()=>document.body.innerText.slice(0,3000));
  const title = await p.title();
  console.log('TITLE:',title);
  console.log('--- BODY TEXT (앞 3000자) ---');
  console.log(txt);
  await b.close();
})();
