const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
const lists = [
  ['water','https://rentalsegye.com/product_list.php?cid=1377&gid=1424'],
  ['air','https://rentalsegye.com/product_list.php?cid=1379&gid=1407'],
  ['bidet','https://rentalsegye.com/product_list.php?cid=1379&gid=1408'],
  ['mattress','https://rentalsegye.com/product_list.php?cid=1486&gid=1580'],
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const map = {}; // brand -> logo url
  for(const [cat,url] of lists){
    const p = await b.newPage({ viewport:{width:1280,height:900} });
    await p.goto(url,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(2500);
    const data = await p.evaluate(() => {
      const out=[];
      [...document.querySelectorAll('a')].filter(a=>a.href.includes('product.php')).slice(0,30).forEach(a=>{
        const logo=a.querySelector('.card-logo');
        const brand=[...a.querySelectorAll('*')].map(e=>e.textContent.trim()).find(t=>/코웨이|청호|LG|SK매직|쿠쿠|현대|세스코|웰스|노비타|애플비데|한국갤러리|프리모|비에스온|젠티스|소머드|쉐우드/.test(t));
        if(logo) out.push({brand, logo: logo.getAttribute('src')});
      });
      return out;
    });
    data.forEach(d=>{ if(d.brand && d.logo && !map[d.brand]) map[d.brand]= d.logo.startsWith('//')?'https:'+d.logo:d.logo; });
    console.log(cat,'수집:',data.length,'| 브랜드 로고 확보:',Object.keys(map).length);
    await p.close();
    await sleep(500);
  }
  require('fs').writeFileSync('/opt/data/allrental/backend/brand_logos.json', JSON.stringify(map,null,2));
  console.log('브랜드 로고 맵:', JSON.stringify(map,null,1));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
