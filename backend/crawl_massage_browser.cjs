const { chromium } = require('playwright');
const fs = require('fs');
const EXE = '/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';

// xlsx 원본에서 안마의자 URL 추출
const raw = JSON.parse(fs.readFileSync('/tmp/massage_raw.json', 'utf-8'));
const urls = raw.map(it => it.href).filter(u => u && u.includes('rentalsegye.com'));

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const results = [];
  const failed = [];
  const total = urls.length;

  for (let i = 0; i < total; i++) {
    const url = urls[i];
    const no = url.match(/no=(\d+)/)[1];
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(1200);
        const data = await page.evaluate(async (url) => {
          const out = { url, title:'', model:'', price:'', discount:'', rental_periods:[], maintenance_cycles:[],
            colors:[], sizes:[], care_types:[], detail_images:[], partner_cards:[], promotion:[], breadcrumb:[],
            recommendations:[], brand:'', it_price:'', period_prices:{}, product_type:'', as_period:'', category:'massage' };
          const h1 = document.querySelector('h1.product-title') || document.querySelector('h1');
          if (h1) out.title = h1.textContent.trim();
          const ip = document.querySelector('input#it_price');
          if (ip && ip.value) { const v = ip.value.replace(/,/g,'').trim(); if (/^\d+$/.test(v)) { out.price = +v; out.it_price = +v; } }
          const cs = document.querySelector('input[name=card_sale_amount]');
          if (cs && cs.value) { const cv = cs.value.replace(/,/g,'').trim(); if (/^\d+$/.test(cv) && +cv>0) out.discount = out.price ? Math.max(0,out.price-(+cv)) : (+cv); }
          // 모델명
          document.querySelectorAll('.product-spec-list dl').forEach(dl => {
            const dt = dl.querySelector('dt'), dd = dl.querySelector('dd');
            if (dt && dd && dt.textContent.includes('모델명')) out.model = dd.textContent.trim();
          });
          // 렌탈 기간
          const splitPeriod = v => { v=(v||'').trim(); if(v.includes(',')){const p=v.split(','); return [p[0].trim(), /^\\d+$/.test(p[1]||'')?+p[1]:0];} return [v,0]; };
          document.querySelectorAll('input[name="rental_option_1"]').forEach(opt => {
            const v=(opt.value||'').trim(); if(!v) return; const [period,add]=splitPeriod(v);
            if(period && !out.rental_periods.includes(period)) out.rental_periods.push(period);
          });
          // 옵션 names
          const optNames = sel => { const out=[]; if(!sel) return out; sel.querySelectorAll('option').forEach(o=>{ const v=(o.value||'').trim(), t=o.textContent.trim(); if(!v&&!t) return; if(t==='선택'||v==='선택') return; const name = v.includes(',')?v.split(',')[0].trim():(t||v); if(name&&!out.includes(name)) out.push(name); }); return out; };
          const opt2 = document.querySelector('#rental_option_2');
          const opt3 = document.querySelector('#rental_option_3');
          out.sizes = optNames(opt2);
          out.care_types = optNames(opt3);
          // 스펙 dl (브랜드/제품종류/AS)
          document.querySelectorAll('dl').forEach(dl => {
            const dts=[...dl.querySelectorAll('dt')].map(d=>d.textContent.trim());
            const dds=[...dl.querySelectorAll('dd')].map(d=>d.textContent.trim());
            dts.forEach((dt,idx)=>{ const dd=dds[idx]; if(!dd) return;
              if(dt==='브랜드'&&!out.brand) out.brand=dd;
              else if(dt==='제품종류'&&!out.product_type) out.product_type=dd;
              else if((dt==='AS기간'||dt==='A/S기간'||dt==='사후지원')&&!out.as_period) out.as_period=dd;
            });
          });
          // 제휴카드 (렌탈세계는 보통 ".card-benefit" 또는 텍스트에 "제휴" 포함 영역)
          document.querySelectorAll('*').forEach(el => {
            const t = el.textContent.trim();
            if (/제휴카드|제휴 카드/.test(t) && el.children.length === 0) {
              const card = t.replace(/제휴카드\s*[:：]?/,'');
              if (card && !out.partner_cards.includes(card)) out.partner_cards.push(card.slice(0,40));
            }
          });
          // 상세 이미지
          ['#section-info','#section-detail'].forEach(sel=>{ const sec=document.querySelector(sel); if(sec) sec.querySelectorAll('img').forEach(img=>{ let src=img.getAttribute('src')||''; if(src.includes('speedycdn')||src.startsWith('//tlpartner')){ let full = src.startsWith('http')?src:(src.startsWith('//')?'https:'+src:src); if(!out.detail_images.includes(full)) out.detail_images.push(full); } }); });
          // period_prices AJAX
          const iidm = url.match(/no=(\d+)/); const iid = iidm?iidm[1]:null;
          if (iid && out.rental_periods.length) {
            for (const period of out.rental_periods) {
              try {
                const resp = await fetch('https://rentalsegye.com/page/product_option.php', {
                  method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded','Referer':url},
                  body: `iid=${iid}&ro_id=${encodeURIComponent(period)}&ro_idx=0&rental_count=2&ro_title=${encodeURIComponent(out.rental_periods.join(''))}`
                });
                if (resp.ok) {
                  const txt = await resp.text();
                  const opts = [...txt.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)];
                  const pm = {};
                  opts.forEach(([,val,txt2])=>{ if(!val||txt2==='선택') return; const parts=val.split(','); const name=parts[0].trim(); const add=(parts.length>=2&&/^\d+$/.test(parts[1].trim()))?+parts[1].trim():0; if(name) pm[name]=add; });
                  if (Object.keys(pm).length) out.period_prices[period]=pm;
                }
              } catch(e){}
            }
          }
          out.rental_periods.forEach(period=>{
            if(!out.period_prices[period]||!Object.keys(out.period_prices[period]).length){
              const combos = out.maintenance_cycles.length?out.maintenance_cycles:(out.sizes.length?out.sizes:[]);
              if(combos.length) out.period_prices[period]={[combos[0]]:0};
              else { out.period_prices[period]={'기본':0}; if(!out.maintenance_cycles.includes('기본')) out.maintenance_cycles.push('기본'); }
            }
          });
          return out;
        }, url);
        if (data && data.title) {
          data.desc = data.title;
          results.push(data);
          ok = true;
          console.log(`  [${i+1}/${total}] OK no=${no} ${data.title.slice(0,28)} (${data.rental_periods.length}기간, ${data.partner_cards.length}제휴카드, ${data.detail_images.length}이미지)`);
        } else {
          console.log(`  [${i+1}/${total}] empty no=${no} (attempt ${attempt+1})`);
        }
      } catch (e) {
        console.log(`  [${i+1}/${total}] ERR no=${no} ${e.message.slice(0,60)} (attempt ${attempt+1})`);
      } finally {
        await page.close();
      }
      if (!ok && attempt < 2) await sleep(1500);
    }
    if (!ok) { failed.push(url); console.log(`  [${i+1}/${total}] FAILED no=${no}`); }
    await sleep(800 + Math.random()*1200);
    if ((i+1) % 10 === 0) {
      fs.writeFileSync('backend/massage_new.json', JSON.stringify(results, null, 2));
      fs.writeFileSync('backend/massage_failed.json', JSON.stringify(failed, null, 2));
      console.log(`  (중간저장 ${results.length}건)`);
    }
  }
  fs.writeFileSync('backend/massage_new.json', JSON.stringify(results, null, 2));
  fs.writeFileSync('backend/massage_failed.json', JSON.stringify(failed, null, 2));
  console.log(`\n=== DONE === success=${results.length} failed=${failed.length}`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
