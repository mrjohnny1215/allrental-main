import { chromium } from 'playwright';
const BASE = 'https://allrental-xi.vercel.app/';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
const newTabs = [];
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message));
page.on('popup', (p) => newTabs.push(p.url()));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('div[class*="cursor-pointer"]', { timeout: 10000 });
const cards = await page.$$('div[class*="cursor-pointer"]');
await cards[0].click();
await page.waitForTimeout(800);

const before = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find(d => d.className && d.className.includes('fixed') && d.className.includes('inset-0') && d.className.includes('z-50'));
  const m = el.innerText.match(/\[.*?\][^\n]*/);
  return m ? m[0] : el.innerText.slice(0,30);
});

const clicked = await page.evaluate(() => {
  const section = [...document.querySelectorAll('div')].find(d => d.className && typeof d.className==='string' && d.className.includes('max-w-3xl') && /추천 상품/.test(d.innerText));
  if (!section) return 'no-section';
  const btns = [...section.querySelectorAll('button')];
  const recBtns = btns.filter(b => /월료/.test(b.innerText));
  if (!recBtns.length) return 'no-rec-card:'+btns.length;
  recBtns[0].click();
  return 'clicked:' + recBtns.length;
});
await page.waitForTimeout(800);

const after = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find(d => d.className && d.className.includes('fixed') && d.className.includes('inset-0') && d.className.includes('z-50'));
  const m = el.innerText.match(/\[.*?\][^\n]*/);
  return { title: m ? m[0] : el.innerText.slice(0,30), hasRentalsegye: /rentalsegye/.test(el.innerText) };
});

console.log('배포본 클릭 전:', before);
console.log('추천클릭:', clicked);
console.log('새탭:', newTabs.length ? newTabs : '없음');
console.log('배포본 클릭 후:', JSON.stringify(after));
console.log('모달 변경됨:', before !== after.title);
console.log('에러:', errors.length ? errors.join(' | ') : '없음');
await browser.close();
const ok = clicked.startsWith('clicked') && after.title && after.title !== before && newTabs.length===0 && !after.hasRentalsegye && errors.length===0;
console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(ok?0:1);
