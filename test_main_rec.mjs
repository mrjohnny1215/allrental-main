import { chromium } from 'playwright';
const BASE = 'https://allrental-xi.vercel.app/';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('div[class*="cursor-pointer"]', { timeout: 10000 });
// 메인 페이지에서 '추천' 텍스트가 포함된 영역과 그 안 클릭요소
const recAreas = await page.evaluate(() => {
  const out = [];
  const allText = [...document.querySelectorAll('*')];
  for (const e of allText) {
    if (e.children.length === 0 && /추천/.test(e.textContent||'')) {
      // 부모 섹션 찾기
      let p = e.parentElement;
      for (let i=0;i<4 && p;i++) {
        const clickables = p.querySelectorAll('button, a, div[class*="cursor-pointer"]');
        if (clickables.length) {
          out.push({ label: e.textContent.trim(), tag: p.tagName, clickables: clickables.length });
          break;
        }
        p = p.parentElement;
      }
    }
  }
  return out;
});
console.log('메인 페이지 추천 관련 영역:', JSON.stringify(recAreas, null, 2));
await browser.close();
