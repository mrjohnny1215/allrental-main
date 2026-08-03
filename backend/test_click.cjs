const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // 모바일 뷰포트
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

  await page.goto('http://localhost:8099/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 카드 개수
  const cardCount = await page.locator('div.cursor-pointer:has-text("상세보기")').count();
  console.log('카드 수:', cardCount);

  // 첫 카드 클릭
  const firstCard = page.locator('div.cursor-pointer:has-text("상세보기")').first();
  await firstCard.click();
  await page.waitForTimeout(1000);

  // 모달 열렸는지 확인 (상세 페이지 특유 요소)
  const modalVisible = await page.evaluate(() => {
    const root = document.getElementById('root');
    const txt = document.body.innerText || '';
    return {
      hasRentalPeriod: txt.includes('렌탈 기간'),
      hasManageCycle: txt.includes('관리 주기'),
      hasProductDetail: txt.includes('제품상세') || txt.includes('상품 상세'),
      fixedCount: document.querySelectorAll('.fixed').length,
      bodyHasDetailText: txt.includes('월 렌탈료') && (txt.match(/월 렌탈료/g) || []).length > 1,
    };
  });

  console.log('클릭 후 모달 상태:', JSON.stringify(modalVisible));
  console.log('콘솔 에러:', errors.length ? errors.slice(0,5) : '없음');

  await browser.close();
})().catch(e => { console.error('TEST FAIL:', e.message); process.exit(1); });
