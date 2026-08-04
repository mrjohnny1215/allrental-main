const fs = require('fs');
const { chromium } = require('playwright');

const merged = JSON.parse(fs.readFileSync('/opt/data/allrental/merged_products.json','utf-8'));
const bad = Object.keys(merged).filter(u => u.includes('products.php') || merged[u].title==='Bad Request' || (merged[u].title||'').includes('다음 항목에 오류'));

function fixUrl(u){ return u.replace('products.php','product.php'); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
  const page = await ctx.newPage();
  console.log('재크롤 대상:', bad.length);
  for (let i=0;i<bad.length;i++){
    const oldU = bad[i];
    const newU = fixUrl(oldU);
    try {
      await page.goto(newU, { waitUntil:'networkidle', timeout:30000 });
      await page.waitForTimeout(500);
      const d = await page.evaluate(async (url) => {
        const res={url,title:'',it_price:'',rental_periods:[],maintenance_cycles:[],colors:[],sizes:[],care_types:[],detail_images:[],period_prices:{},not_available:false};
        const h1=document.querySelector('h1.product-title')||document.querySelector('h1');
        res.title=h1?h1.textContent.trim():'';
        if(document.body.innerText.includes('현재 렌탈중인 상품이 아닙니다')||document.body.innerText.includes('렌탈중인 상품이 아닙니다')) res.not_available=true;
        const ip=document.querySelector('input#it_price'); res.it_price=ip?parseInt(ip.value.replace(/,/g,''))||'':'';
        const pr=Array.from(document.querySelectorAll('input[name="rental_option_1"]')).map(o=>o.value).filter(Boolean);
        res.rental_periods=pr.map(v=>v.split(',')[0].trim());
        const f=(sel)=>{const s=document.querySelector(sel);return s?Array.from(s.options).map(o=>({v:o.value,t:o.textContent.trim()})).filter(o=>o.t&&o.t!=='선택'):[];};
        const o2=f('#rental_option_2'),o3=f('#rental_option_3'),os=f('#rental_supply_1');
        res.maintenance_cycles=o2.map(x=>x.t); if(o3.length) res.care_types=o3.map(x=>x.t); if(os.length) res.colors=os.map(x=>x.t);
        res.detail_images=Array.from(document.querySelectorAll('#section-info img,#section-detail img')).map(img=>img.src).filter(s=>s.includes('speedycdn')||s.startsWith('//tlpartner')).map(s=>s.startsWith('//')?'https:'+s:s);
        const m=url.match(/no=(\d+)/); const iid=m?m[1]:null;
        if(iid&&res.rental_periods.length){
          for(const period of res.rental_periods){
            try{
              const fd=new URLSearchParams(); fd.set('iid',iid);fd.set('ro_id',period);fd.set('ro_idx','0');fd.set('rental_count',String(res.rental_periods.length));fd.set('ro_title',res.rental_periods.join(''));
              const r=await fetch('https://rentalsegye.com/page/product_option.php',{method:'POST',body:fd,headers:{'X-Requested-With':'XMLHttpRequest'}});
              if(r.ok){const html=await r.text();const opts=[...html.matchAll(/<option value=\"([^\"]*)\">([^<]*)<\/option>/g)].map(m=>[m[1],m[2]]);const pm={};for(const[val,txt]of opts){if(!val||txt==='선택')continue;const p=val.split(',');const name=p[0].trim();const add=(p[1]&&p[1].trim().match(/^\d+$/))?parseInt(p[1]):0;if(name)pm[name]=add;}if(Object.keys(pm).length)res.period_prices[period]=pm;}
            }catch(e){}
          }
        }
        for(const period of res.rental_periods){if(!res.period_prices[period]||!Object.keys(res.period_prices[period]).length){const combos=res.maintenance_cycles.length?res.maintenance_cycles:(res.sizes.length?res.sizes:['기본']);res.period_prices[period]=combos.reduce((a,c)=>{a[c]=0;return a;},{});if(!res.maintenance_cycles.length&&!res.sizes.length)res.maintenance_cycles.push('기본');}}
        return res;
      }, newU);
      // 교정: 기존 키 삭제, 새 키로 저장
      delete merged[oldU];
      d.category = merged[oldU] ? merged[oldU].category : (merged[newU]?merged[newU].category:'other');
      // category 는 기존에서
      d.category = (function(){ try { const o=JSON.parse(fs.readFileSync('/opt/data/allrental/backend/recrawl_all.json','utf-8')); for(const r of o){ if(r.url&&r.url.replace('products.php','product.php')===newU) return r.category; } } catch(e){} return 'other'; })();
      merged[newU]=d;
      console.log((i+1)+'/'+bad.length, 'OK', d.title.slice(0,25), '| p:',d.rental_periods, '| mc:',d.maintenance_cycles.slice(0,2));
    } catch(e){
      console.log((i+1)+'/'+bad.length, 'FAIL', oldU.slice(0,40), e.message.slice(0,50));
    }
    await page.waitForTimeout(800);
  }
  fs.writeFileSync('/opt/data/allrental/merged_products.json', JSON.stringify(merged,null,2));
  fs.writeFileSync('/opt/data/allrental/public/merged_products.json', JSON.stringify(merged,null,2));
  console.log('저장 완료 -> merged_products.json');
  await browser.close();
})();
