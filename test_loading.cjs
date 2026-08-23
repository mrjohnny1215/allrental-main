const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const t0 = Date.now();
  await page.goto('https://allrental-xi.vercel.app/', { waitUntil: 'domcontentloaded' });
  // 로딩 화면 요소 확인
  const loadingVisible = await page.locator('text=상품 데이터를 불러오는 중').count();
  console.log('로딩화면 표시됨:', loadingVisible>0, '| 경과:', Date.now()-t0, 'ms');
  // 1초 시점에 아직 로딩인지
  await page.waitForTimeout(1000);
  const stillLoading1 = await page.locator('text=상품 데이터를 불러오는 중').count();
  console.log('1초후 로딩仍?:', stillLoading1>0);
  // 3.2초 후엔 메인 화면(로그인 버튼) 나와야
  await page.waitForTimeout(2500);
  const mainReady = await page.locator('text=직원 로그인').count();
  console.log('3.2초후 메인화면(직원로그인) 노출:', mainReady>0, '| 총경과:', Date.now()-t0, 'ms');
  await browser.close();
})().catch(e=>{console.error('CRASH',e.message);process.exit(1);});
