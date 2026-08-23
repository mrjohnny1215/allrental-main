const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push('PAGEERROR: '+e.message));
  await page.goto('http://localhost:5174/', { waitUntil:'networkidle' });
  await page.evaluate(()=>localStorage.clear());
  await page.reload({ waitUntil:'networkidle' });
  // 로딩 3초 대기 후 게이트 확인
  await page.waitForTimeout(4500);
  const gate = await page.locator("input[placeholder='아이디']").count();
  console.log('1) 로딩후 게이트 아이디입력란:', gate>0);
  if(gate>0){
    await page.fill("input[placeholder='아이디']", 'all001');
    await page.fill("input[placeholder='비밀번호']", 'wrong');
    await page.locator("button:has-text('로그인')").first().click();
    await page.waitForTimeout(400);
    console.log('2) 틀린비번 에러:', await page.locator("text=아이디 또는 비밀번호가 올바르지").count()>0);
    await page.fill("input[placeholder='비밀번호']", '1234');
    await page.locator("button:has-text('로그인')").first().click();
    await page.waitForTimeout(2000);
    console.log('3) 로그인후 게이트닫힘:', await page.locator("input[placeholder='아이디']").count()===0, '| 메인카테고리:', await page.locator('text=정수기').count()>0);
    // 새로고침해도 로그인 유지되는지
    await page.reload({waitUntil:'networkidle'});
    await page.waitForTimeout(1000);
    console.log('4) 새로고침후에도 메인(게이트안뜸):', await page.locator("input[placeholder='아이디']").count()===0);
  }
  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e=>{console.error('CRASH',e.message);process.exit(1);});
