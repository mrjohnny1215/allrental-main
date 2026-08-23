const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push('PAGEERROR: '+e.message));
  // 캐시/세션 클리어
  await page.goto('https://allrental-xi.vercel.app/', { waitUntil:'networkidle' });
  await page.evaluate(()=>localStorage.clear());
  await page.reload({ waitUntil:'networkidle' });
  await page.waitForTimeout(1000);
  // 1) 게이트 있는지
  const gateInput = await page.locator("input[placeholder='아이디']").count();
  console.log('1) 진입시 로그인게이트 아이디입력란:', gateInput>0);
  // 2) 잘못된 비번
  await page.fill("input[placeholder='아이디']", 'all001');
  await page.fill("input[placeholder='비밀번호']", 'wrong');
  await page.locator("button:has-text('로그인')").first().click();
  await page.waitForTimeout(500);
  console.log('2) 틀린비번 에러표시:', await page.locator("text=아이디 또는 비밀번호가 올바르지").count()>0);
  // 3) 맞는 비번
  await page.fill("input[placeholder='비밀번호']", '1234');
  await page.locator("button:has-text('로그인')").first().click();
  await page.waitForTimeout(1500);
  const mainReady = await page.locator('text=직원 로그인').count(); // 게이트 닫히면 이 버튼 없음(헤더서 제거됨)
  const categoryVisible = await page.locator('text=정수기').count();
  console.log('3) 로그인후 게이트닫힘(직원로그인버튼 사라짐):', mainReady===0, '| 메인카테고리노출:', categoryVisible>0);
  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e=>{console.error('CRASH',e.message);process.exit(1);});
