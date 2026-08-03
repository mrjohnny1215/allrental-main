const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

  await page.goto('http://localhost:8099/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const cardCount = await page.locator('[data-testid="card"]').count();
  console.log('카드 수:', cardCount);

  // 첫 카드의 '상세보기' 버튼 클릭
  const detailBtn = page.locator('[data-testid="card"]').first().locator('button:has-text("상세보기")');
  await detailBtn.click();
  await page.waitForTimeout(1200);

  const modal = await page.evaluate(() => {
    const txt = document.body.innerText || '';
    return {
      hasRentalPeriod: txt.includes('렌탈 기간'),
      hasManageCycle: txt.includes('관리 주기'),
      hasProductDetail: txt.includes('상품 상세') || txt.includes('제품상세'),
      hasBreadcrumb: txt.includes('HOME'),
      fixedCount: document.querySelectorAll('.fixed').length,
      url: location.href,
    };
  });

  console.log('모달 열림 상태:', JSON.stringify(modal));
  console.log('콘솔 에러:', errors.length ? errors.slice(0,5) : '없음');

  await browser.close();
  process.exit(modal.hasRentalPeriod || modal.hasManageCycle ? 0 : 2);
})().catch(e => { console.error('TEST FAIL:', e.message); process.exit(1); });
