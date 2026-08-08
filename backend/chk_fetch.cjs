const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  await p.goto('https://allrental-xi.vercel.app/',{waitUntil:'domcontentloaded'});
  const urls = [
    'https://tlpartner.speedycdn.net/data/file/item_product/thumb-990098305_qT87hR6x_CRM-E01HEMSLK_500x500.jpg',
    'https://tlpartner.speedycdn.net/data/file/item_product/thumb-990098305_2Fdo_500x500.jpg'
  ];
  for(const u of urls){
    const r = await p.evaluate(async (url) => {
      try {
        const resp = await fetch(url, {mode:'no-cors'});
        return 'status:'+resp.status+' type:'+resp.type;
      } catch(e){ return 'ERR:'+e.message; }
    }, u);
    console.log(u.slice(60), '->', r);
  }
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
