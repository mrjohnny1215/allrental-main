const fs = require('fs');
const { chromium } = require('playwright');
const FILE='/opt/data/allrental/merged_products.json';
const TOKEN='vcp_3gJFJfDhQOsbfmqLipucCyh34g6FnrjM5KT17zxNM0E46GJwlF1rQh7N';
const { execSync } = require('child_process');
function hasDetail(v){ return v.detail_images && v.detail_images.some(u=>u.includes('editor/rentalworld')||u.includes('/rentalworld')); }
function load(){ return JSON.parse(fs.readFileSync(FILE,'utf-8')); }

async function checkBlock(browser){
  const page = await browser.newPage();
  let ok=false;
  try {
    await page.goto('https://rentalsegye.com/product.php?no=42328&cid=1379&gid=1408',{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForTimeout(1200);
    const n = await page.evaluate(()=>[...document.querySelectorAll('img')].filter(im=>(im.getAttribute('src')||'').includes('speedycdn')).length);
    ok=n>0;
  } catch(e){}
  await page.close();
  return ok;
}

async function crawl(browser){
  const merged=load();
  const items=Object.entries(merged).filter(([u,v])=>!hasDetail(v));
  console.log(`[${new Date().toISOString()}] 상세이미지 대상: ${items.length}`);
  let done=0,ok=0,blocked=0;
  for (const [url,v] of items){
    const page=await browser.newPage();
    let got=[];
    try{
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForTimeout(900);
      got=await page.evaluate(()=>{
        const out=[];
        for(const secId of ['#section-info','#section-detail']){
          const sec=document.querySelector(secId);
          if(sec){ for(const im of sec.querySelectorAll('img')){ const s=im.getAttribute('src')||''; if(s.includes('speedycdn')||s.startsWith('//tlpartner')){ let f=s.startsWith('//')?'https:'+s:s; if(!out.includes(f))out.push(f);} } }
        }
        return out;
      });
    }catch(e){}
    await page.close();
    if(got.length){ v.detail_images=got; ok++; } else { blocked++; }
    done++;
    if(done%50===0){ fs.writeFileSync(FILE, JSON.stringify(merged,null,2)); console.log(`  ${done}/${items.length} ok ${ok} blocked ${blocked}`); }
    if(blocked>0&&blocked%10===0){ console.log('  차단 25초대기'); await new Promise(r=>setTimeout(r,25000)); }
    await new Promise(r=>setTimeout(r,1000));
  }
  fs.writeFileSync(FILE, JSON.stringify(merged,null,2));
  return {ok,blocked,total:items.length};
}

async function deploy(){
  execSync('python3 backend/sync_pd.py',{cwd:'/opt/data/allrental'});
  const out=execSync(`cd /opt/data/allrental && env -u NODE_ENV npm run build >/dev/null 2>&1 && ./node_modules/.bin/vercel deploy --prod --force --token ${TOKEN} --yes --name allrental 2>&1 && ./node_modules/.bin/vercel alias set allrental-mrjohnny1215s-projects.vercel.app allrental-xi.vercel.app --token ${TOKEN} 2>&1`,{encoding:'utf-8'});
  console.log('[배포]', out.split('\n').filter(l=>l.includes('Ready')||l.includes('Success')).join(' | '));
}

(async()=>{
  const browser=await chromium.launch({args:['--no-sandbox']});
  while(true){
    const open=await checkBlock(browser);
    if(open){
      const r=await crawl(browser);
      console.log(`[완료] ok ${r.ok} blocked ${r.blocked} total ${r.total}`);
      if(r.ok>0){ await deploy(); console.log('[배포완료]'); }
      if(r.blocked===0){ console.log('상세이미지 완료. 워처 종료'); break; }
    } else {
      console.log(`[${new Date().toISOString()}] 차단중 5분후 재시도`);
    }
    await new Promise(r=>setTimeout(r,5*60*1000));
  }
  await browser.close();
})();
