const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: '+e.message));
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.click('text=직원 로그인');
  await page.waitForTimeout(500);
  await page.fill("input[placeholder='아이디']", 'all001');
  await page.fill("input[placeholder='비밀번호']", '1234');
  // 모달 내부의 로그인 버튼 (submit type) 명시적 선택
  await page.locator('div.fixed.inset-0 form button[type="submit"]').click();
  await page.waitForTimeout(1200);
  const overlayGone = await page.evaluate(() => !document.querySelector('.bg-black\\/60'));
  const loggedIn = await page.locator('text=로그인됨').count();
  console.log('AFTER LOGIN: overlayGone=', overlayGone, '| loggedInHeader=', loggedIn);
  const cardCount = await page.locator("[data-testid='card']").count();
  console.log('card count:', cardCount);
  // 카드 클릭
  await page.locator("[data-testid='card']").first().click();
  await page.waitForTimeout(1200);
  const detail = await page.locator('text=월 렌탈료').count();
  console.log('AFTER CARD CLICK: detailModal(월 렌탈료) count=', detail);
  console.log('ERRORS:', JSON.stringify(errors.slice(0,8)));
  await browser.close();
})().catch(e => { console.error('TEST CRASH:', e.message); process.exit(1); });
