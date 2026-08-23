const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:390,height:900},deviceScaleFactor:2})).newPage();
  await p.goto('https://allrental-xi.vercel.app/?v='+Date.now(),{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  const header = await p.$('header');
  if(header) await header.screenshot({path:'/opt/data/allrental/backend/shot_header2.png'});
  console.log('shot saved');
  await b.close();
})();
