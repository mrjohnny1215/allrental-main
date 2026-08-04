const fs = require('fs');
const { chromium } = require('playwright');

const allUrls = JSON.parse(fs.readFileSync('/opt/data/allrental/backend/all_product_urls.json','utf-8'));

// 이어하기: 기존 결과
const OUT = '/opt/data/allrental/backend/crawl_all_browser.json';
let results = [];
if (fs.existsSync(OUT)) results = JSON.parse(fs.readFileSync(OUT,'utf-8'));
const done = new Set(results.map(r => r.url));
const todo = allUrls.filter(u => !done.has(u));
console.log('전체:', allUrls.length, '| 이미함:', done.size, '| 남음:', todo.length);

function splitPeriod(v) {
  v = (v||'').trim();
  if (v.includes(',')) {
    const p = v.split(',');
    return [p[0].trim(), (p[1]&&p[1].trim().match(/^\d+$/))?parseInt(p[1]):0];
  }
  return [v, 0];
}
function optName(v) {
  v = (v||'').trim();
  return v.includes(',') ? v.split(',')[0].trim() : v;
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
  const page = await ctx.newPage();

  for (let i = 0; i < todo.length; i++) {
    const url = todo[i];
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(400);
      const d = await page.evaluate(async (url) => {
        const res = { url, title:'', it_price:'', price:'', discount:'', brand:'', model:'', product_type:'', as_period:'', rental_periods:[], maintenance_cycles:[], colors:[], sizes:[], care_types:[], detail_images:[], period_prices:{}, not_available:false };
        const h1 = document.querySelector('h1.product-title') || document.querySelector('h1');
        res.title = h1 ? h1.textContent.trim() : '';
        if (document.body.innerText.includes('현재 렌탈중인 상품이 아닙니다') || document.body.innerText.includes('렌탈중인 상품이 아닙니다')) res.not_available = true;
        const ip = document.querySelector('input#it_price');
        res.it_price = ip ? parseInt(ip.value.replace(/,/g,''))||'' : '';
        // 기간
        const periodsRaw = Array.from(document.querySelectorAll('input[name="rental_option_1"]')).map(o=>o.value).filter(Boolean);
        const baseAdd = {};
        res.rental_periods = periodsRaw.map(v => { const [p,a]=v.includes(',')?(v.split(',')):[v,0]; baseAdd[p.trim()]= (v.split(',')[1]&&v.split(',')[1].trim().match(/^\d+$/))?parseInt(v.split(',')[1]):0; return p.trim(); });
        // opt2 / opt3 / supply
        const opt2 = document.querySelector('#rental_option_2');
        const opt3 = document.querySelector('#rental_option_3');
        const sup = document.querySelector('#rental_supply_1');
        const f = (sel) => sel ? Array.from(sel.options).map(o=>({v:o.value,t:o.textContent.trim()})).filter(o=>o.t&&o.t!=='선택') : [];
        const o2=f(opt2), o3=f(opt3), os=f(sup);
        // cid/gid 로 카테고리 판별은 나중에
        if (o2.length) res.maintenance_cycles = o2.map(x=>x.t);
        if (o3.length) res.care_types = o3.map(x=>x.t);
        if (os.length) res.colors = os.map(x=>x.t);
        // 이미지
        res.detail_images = Array.from(document.querySelectorAll('#section-info img, #section-detail img')).map(img=>img.src).filter(src=>src.includes('speedycdn')||src.startsWith('//tlpartner')).map(s=>s.startsWith('//')?'https:'+s:s);
        // period_prices: AJAX
        const m = url.match(/no=(\d+)/);
        const iid = m?m[1]:null;
        if (iid && res.rental_periods.length) {
          for (const period of res.rental_periods) {
            try {
              const fd = new URLSearchParams();
              fd.set('iid', iid); fd.set('ro_id', period); fd.set('ro_idx','0'); fd.set('rental_count', String(res.rental_periods.length)); fd.set('ro_title', res.rental_periods.join(''));
              const r = await fetch('https://rentalsegye.com/page/product_option.php', {method:'POST', body:fd, headers:{'X-Requested-With':'XMLHttpRequest'}});
              if (r.ok) {
                const html = await r.text();
                const opts = [...html.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(m=>[m[1],m[2]]);
                const pm = {};
                for (const [val,txt] of opts) {
                  if (!val || txt==='선택') continue;
                  const parts = val.split(',');
                  const name = parts[0].trim();
                  const add = (parts[1]&&parts[1].trim().match(/^\d+$/))?parseInt(parts[1]):0;
                  if (name) pm[name]=add;
                }
                if (Object.keys(pm).length) res.period_prices[period]=pm;
              }
            } catch(e){}
          }
        }
        // period_prices 보강
        for (const period of res.rental_periods) {
          if (!res.period_prices[period] || !Object.keys(res.period_prices[period]).length) {
            const combos = res.maintenance_cycles.length?res.maintenance_cycles:(res.sizes.length?res.sizes:['기본']);
            res.period_prices[period] = combos.reduce((a,c)=>{a[c]=0;return a;},{});
            if (!res.maintenance_cycles.length && !res.sizes.length && !res.maintenance_cycles.includes('기본')) res.maintenance_cycles.push('기본');
          }
        }
        return res;
      }, url);
      results.push(d);
    } catch (e) {
      results.push({ url, error: e.message });
    }
    if ((i+1) % 20 === 0) {
      fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
      console.log('[' + (i+1) + '/' + todo.length + '] 누적 ' + results.length);
    }
    await page.waitForTimeout(300);
  }
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  const ok = results.filter(r=>!r.error).length;
  console.log('완료: ' + ok + '/' + allUrls.length + ' -> ' + OUT);
  await browser.close();
})();
