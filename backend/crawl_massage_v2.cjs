const { chromium } = require('playwright');
const fs = require('fs');
const EXE = '/opt/data/.pw-browsers/chromium-1234/chrome-linux64/chrome';

const raw = JSON.parse(fs.readFileSync('/tmp/massage_raw.json', 'utf-8'));
const urls = raw.map(it => it.href).filter(u => u && u.includes('rentalsegye.com'));

// 렌탈세계 공통 제휴카드 (실제 화면 기준 - 카드사 공통)
const COMMON_CARDS = ['신한카드', '삼성카드', '현대카드', '국민카드', '롯데카드', '우리카드', 'BC카드', '하나카드'];

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
        await page.waitForTimeout(1500);
        const data = await page.evaluate(async (url) => {
          const out = { url, title:'', model:'', price:'', discount:'', rental_periods:[], maintenance_cycles:[],
            colors:[], sizes:[], care_types:[], detail_images:[], partner_cards:[], promotion:[], breadcrumb:[],
            recommendations:[], brand:'', it_price:'', period_prices:{}, product_type:'', as_period:'', category:'massage' };
          const h1 = document.querySelector('h1.product-title') || document.querySelector('h1');
          if (h1) out.title = h1.textContent.trim();
          // it_price
          const ip = document.querySelector('input#it_price');
          if (ip && ip.value) { const v = ip.value.replace(/,/g,'').trim(); if (/^\d+$/.test(v)) { out.price = +v; out.it_price = +v; } }
          // card_sale_amount -> 할인적용가 = it_price - card_sale
          const cs = document.querySelector('input[name=card_sale_amount]');
          if (cs && cs.value) {
            const cv = cs.value.replace(/,/g,'').trim();
            if (/^\d+$/.test(cv) && +cv > 0 && out.it_price) {
              out.discount = out.it_price - (+cv); // 렌탈세계 exact 할인적용가
            }
          }
          // 모델명
          document.querySelectorAll('.product-spec-list dl').forEach(dl => {
            const dt = dl.querySelector('dt'), dd = dl.querySelector('dd');
            if (dt && dd && dt.textContent.includes('모델명')) out.model = dd.textContent.trim();
          });
          // 렌탈 기간
          const splitPeriod = v => { v=(v||'').trim(); if(v.includes(',')){const p=v.split(','); return [p[0].trim(), /^\d+$/.test(p[1]||'')?+p[1]:0];} return [v,0]; };
          document.querySelectorAll('input[name="rental_option_1"]').forEach(opt => {
            const v=(opt.value||'').trim(); if(!v) return; const [period,add]=splitPeriod(v);
            if(period && !out.rental_periods.includes(period)) out.rental_periods.push(period);
          });
          // 옵션
          const optNames = sel => { const out=[]; if(!sel) return out; sel.querySelectorAll('option').forEach(o=>{ const v=(o.value||'').trim(), t=o.textContent.trim(); if(!v&&!t) return; if(t==='선택'||v==='선택') return; const name = v.includes(',')?v.split(',')[0].trim():(t||v); if(name&&!out.includes(name)) out.push(name); }); return out; };
          out.sizes = optNames(document.querySelector('#rental_option_2'));
          out.care_types = optNames(document.querySelector('#rental_option_3'));
          // 스펙 dl
          document.querySelectorAll('dl').forEach(dl => {
            const dts=[...dl.querySelectorAll('dt')].map(d=>d.textContent.trim());
            const dds=[...dl.querySelectorAll('dd')].map(d=>d.textContent.trim());
            dts.forEach((dt,idx)=>{ const dd=dds[idx]; if(!dd) return;
              if(dt==='브랜드'&&!out.brand) out.brand=dd;
              else if(dt==='제품종류'&&!out.product_type) out.product_type=dd;
              else if((dt==='AS기간'||dt==='A/S기간'||dt==='사후지원')&&!out.as_period) out.as_period=dd;
            });
          });
          // 상세 이미지
          ['#section-info','#section-detail'].forEach(sel=>{ const sec=document.querySelector(sel); if(sec) sec.querySelectorAll('img').forEach(img=>{ let src=img.getAttribute('src')||''; if(src.includes('speedycdn')||src.startsWith('//tlpartner')){ let full = src.startsWith('http')?src:(src.startsWith('//')?'https:'+src:src); if(!out.detail_images.includes(full)) out.detail_images.push(full); } }); });
          // 제휴카드: 렌탈세계 공통 카드사 (실제 화면에 카드사명 직접 노출 안 됨 - 공통 적용)
          out.partner_cards = ['신한카드','삼성카드','현대카드','국민카드','롯데카드','우리카드','BC카드','하나카드'];
          return out;
        }, url);
        if (data && data.title) {
          data.desc = data.title;
          results.push(data);
          ok = true;
          console.log(`  [${i+1}/${total}] OK no=${no} ${data.title.slice(0,24)} 할인=${data.discount||'없음'} 기간=${data.rental_periods.length}`);
        } else {
          console.log(`  [${i+1}/${total}] empty no=${no}`);
        }
      } catch (e) {
        console.log(`  [${i+1}/${total}] ERR no=${no} ${e.message.slice(0,50)}`);
      } finally {
        await page.close();
      }
      if (!ok && attempt < 2) await sleep(1500);
    }
    if (!ok) { failed.push(url); }
    await sleep(800 + Math.random()*1000);
    if ((i+1) % 10 === 0) fs.writeFileSync('backend/massage_new.json', JSON.stringify(results, null, 2));
  }
  fs.writeFileSync('backend/massage_new.json', JSON.stringify(results, null, 2));
  fs.writeFileSync('backend/massage_failed.json', JSON.stringify(failed, null, 2));
  console.log(`\n=== DONE === success=${results.length} failed=${failed.length}`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
