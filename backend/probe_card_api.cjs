const { chromium } = require('playwright');
const EXE='/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';
const https=require('https');
const BASE='https://rentalsegye.com';
const paths=[
  '/page/card_information.php',
  '/page/product_card.php',
  '/bbs/ajax.card.php',
  '/page/card_popup.php',
  '/shop/card_info.php',
];
(async()=>{
  for(const path of paths){
    const url=`${BASE}${path}?iid=2240`;
    const res=await new Promise(r=>{
      https.get(url,{headers:{'User-Agent':'Mozilla/5.0'}},resp=>{
        let d='';resp.on('data',c=>d+=c);resp.on('end',()=>r({code:resp.statusCode,len:d.length,body:d.slice(0,200)}));
      }).on('error',e=>r({err:e.message}));
    });
    console.log(path, '->', JSON.stringify(res));
  }
})();
