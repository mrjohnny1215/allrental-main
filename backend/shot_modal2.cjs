const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?m2=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const btn = await p.$('button:has-text("상세보기")');
  if (btn) { await btn.click(); await p.waitForTimeout(1500); }
  // '제품종류' 텍스트를 포함한 상위 블록 찾기
  const el = await p.evaluateHandle(() => {
    const all=[...document.querySelectorAll('*')];
    const t=all.find(e=>e.children.length>0 && e.textContent.includes('제품종류') && e.textContent.includes('브랜드'));
    return t || null;
  });
  const handle = el.asElement();
  if (handle) { await handle.scrollIntoViewIfNeeded(); await handle.screenshot({ path: 'backend/shot_info_block.png' }); console.log('captured info block'); }
  else console.log('info block not found');
  await b.close();
})();
