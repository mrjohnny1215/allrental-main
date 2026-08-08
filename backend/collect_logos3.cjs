const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
// 여러 페이지(무한스크롤) 훑기
const cats = [
  ['water','https://rentalsegye.com/product_list.php?cid=1377&gid=1424'],
  ['air','https://rentalsegye.com/product_list.php?cid=1379&gid=1407'],
  ['bidet','https://rentalsegye.com/product_list.php?cid=1379&gid=1408'],
  ['mattress','https://rentalsegye.com/product_list.php?cid=1486&gid=1580'],
];
const brandRe = /\[(코웨이|청호나이스|SK매직|LG전자|현대큐밍|웰스|세스코|소머드|젠티스|애플비데|노비타|아이큐에어|한국갤러리|프리모|쉐우드|캐리어|기타브랜드|다이슨|미로|드리미|쿠쿠)\]/;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const map = JSON.parse(require('fs').readFileSync('/opt/data/allrental/backend/brand_logos.json','utf-8'));
  for(const [cat,url] of cats){
    const p = await b.newPage({ viewport:{width:1280,height:900} });
    await p.goto(url,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(2000);
    // 스크롤 8회
    for(let i=0;i<8;i++){ await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight)); await p.waitForTimeout(700); }
    const data = await p.evaluate((brandRe) => {
      const out=[];
      [...document.querySelectorAll('a')].filter(a=>a.href.includes('product.php')).forEach(a=>{
        const logo=a.querySelector('.card-logo');
        const m=(a.textContent||'').match(new RegExp(brandRe));
        if(logo && m) out.push({brand:m[1], logo: logo.getAttribute('src')});
      });
      return out;
    }, brandRe.source);
    data.forEach(d=>{ const u=d.logo.startsWith('//')?'https:'+d.logo:d.logo; if(!map[d.brand]) map[d.brand]=u; });
    console.log(cat,'누적 브랜드:', Object.keys(map).length);
    await p.close(); await sleep(400);
  }
  require('fs').writeFileSync('/opt/data/allrental/backend/brand_logos.json', JSON.stringify(map,null,2));
  console.log('최종 확보:', Object.keys(map).join(', '));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
