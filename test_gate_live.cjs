const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push('PAGEERROR: '+e.message));
  await page.goto('https://allrental-xi.vercel.app/', { waitUntil:'networkidle' });
  await page.evaluate(()=>localStorage.clear());
  await page.reload({ waitUntil:'networkidle' });
  await page.waitForTimeout(4500);
  const gate = await page.locator("input[placeholder='아이디']").count();
  console.log('1) LIVE 진입시 게이트:', gate>0);
  if(gate>0){
    await page.fill("input[placeholder='아이디']", 'all001');
    await page.fill("input[placeholder='비밀번호']", '1234');
    await page.locator("button:has-text('로그인')").first().click();
    await page.waitForTimeout(2000);
    console.log('2) LIVE 로그인후 메인노출:', await page.locator('text=정수기').count()>0, '| 게이트닫힘:', await page.locator("input[placeholder='아이디']").count()===0);
  }
  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e=>{console.error('CRASH',e.message);process.exit(1);});
