const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // 비데 탭
  const tabs = await page.$$('button');
  for (const t of tabs) {
    const txt = await t.textContent();
    if (txt && txt.trim() === '비데') { await t.click(); break; }
  }
  await page.waitForTimeout(1000);
  // 첫 카드 클릭
  const cards = await page.$$('div[class*="cursor-pointer"]');
  await cards[0].click();
  await page.waitForTimeout(1500);
  // '관리 주기' 라벨 바로 아래 select 찾기
  const labels = await page.$$('label');
  for (const l of labels) {
    const txt = await l.textContent();
    if (txt && txt.includes('관리 주기')) {
      // 다음 sibling select
      const sel = await l.evaluateHandle(el => el.parentElement.querySelector('select'));
      const opts = await sel.$$eval('option', os => os.map(o=>o.textContent));
      console.log('관리 주기 셀렉트 옵션:', opts);
    }
  }
  // 기간 버튼들
  const periodBtns = await page.$$('button');
  const periods = [];
  for (const b of periodBtns) {
    const t = await b.textContent();
    if (t && /년/.test(t)) periods.push(t.trim());
  }
  console.log('렌탈 기간 버튼:', periods.slice(0,5));
  await browser.close();
})();
