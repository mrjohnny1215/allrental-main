const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  async function openAndCheck(catName) {
    const tabs = await page.$$('button');
    for (const t of tabs) {
      const txt = await t.textContent();
      if (txt && txt.trim() === catName) { await t.click(); break; }
    }
    await page.waitForTimeout(800);
    const cards = await page.$$('div[class*="cursor-pointer"]');
    if (!cards.length) { console.log(catName, '카드 없음'); return; }
    await cards[0].click();
    await page.waitForTimeout(1200);
    const body = await page.textContent('body');
    const hasCommaPeriod = /년,/.test(body) || /개월,/.test(body);
    console.log(`[${catName}] 기간:${body.includes('렌탈 기간')} | 관리주기:${body.includes('관리 주기')} | 쉼표오염:${hasCommaPeriod}`);
    const labels = await page.$$('label');
    for (const l of labels) {
      const txt = await l.textContent();
      if (txt && txt.includes('관리 주기')) {
        const sel = await l.evaluateHandle(el => el.parentElement.querySelector('select'));
        const opts = await sel.$$eval('option', os => os.map(o=>o.textContent));
        console.log('   관리주기 옵션:', opts.slice(0,5));
      }
    }
    // 닫기
    const closeBtns = await page.$$('button');
    for (const b of closeBtns) {
      const t = await b.textContent();
      if (t && t.trim() === '목록') { await b.click(); break; }
    }
    await page.waitForTimeout(600);
  }

  await openAndCheck('정수기');
  await openAndCheck('비데');
  await openAndCheck('매트리스');
  await openAndCheck('공기청정기');
  console.log('JS에러:', errs.length ? errs.slice(0,3) : '없음');
  await browser.close();
})();
