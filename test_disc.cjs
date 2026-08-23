const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://allrental-xi.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.click('text=직원 로그인');
  await page.waitForTimeout(400);
  await page.fill("input[placeholder='아이디']", 'all001');
  await page.fill("input[placeholder='비밀번호']", '1234');
  await page.locator('div.fixed.inset-0 form button[type="submit"]').click();
  await page.waitForTimeout(1000);
  // 할인적용 있는 카드 찾아 클릭 (text=할인적용 가진 카드)
  const cards = page.locator("[data-testid='card']");
  const n = await cards.count();
  let clicked=false;
  for (let i=0;i<n;i++){
    const c = cards.nth(i);
    if (await c.locator('text=할인적용').count()>0){
      await c.click(); clicked=true; break;
    }
  }
  await page.waitForTimeout(1000);
  if (clicked){
    const txt = await page.locator('text=할인적용').first().locator('..').innerText();
    console.log('할인모달 텍스트:', txt.replace(/\n/g,' '));
  } else {
    console.log('할인적용 카드 못찾음');
  }
  await browser.close();
})().catch(e=>{console.error('CRASH',e.message);process.exit(1);});
