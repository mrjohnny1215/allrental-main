const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?m=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  // 첫 카드의 상세보기 버튼 클릭
  const btn = await p.$('button:has-text("상세보기")');
  if (btn) { await btn.click(); await p.waitForTimeout(1500); }
  // 모달 내 브랜드/모델명/제품종류 영역 캡처
  const info = await p.evaluate(() => {
    const els=[...document.querySelectorAll('div')].filter(d=>d.textContent.includes('제품종류')&&d.textContent.includes('브랜드'));
    return els.length;
  });
  // 모달 전체 스크린샷
  const modal = await p.$('div[class*="max-w-"]');
  if (modal) await modal.screenshot({ path: 'backend/shot_modal_info.png' });
  console.log('modal info blocks:', info, 'saved');
  await b.close();
})();
