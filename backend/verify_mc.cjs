const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  async function check(catName, n) {
    const tabs = await page.$$('button');
    for (const t of tabs) { const txt=await t.textContent(); if(txt&&txt.trim()===catName){await t.click();break;} }
    await page.waitForTimeout(700);
    const cards = await page.$$('div[class*="cursor-pointer"]');
    for (let i=0;i<Math.min(n,cards.length);i++){
      await cards[i].click(); await page.waitForTimeout(900);
      const body=await page.textContent('body');
      const hasCycle = body.includes('관리 주기') || body.includes('매트리스 사이즈');
      const hasPeriod = body.includes('렌탈 기간');
      const noPeriod = body.includes('렌탈 기간 정보가 없습니다');
      const title = (await page.$('h1,h2')) ? (await page.$eval('h1,h2',e=>e.textContent)).slice(0,25) : '';
      console.log(`[${catName}] ${i+1}. 기간:${hasPeriod} 정보없음:${noPeriod} | 관리주기표시:${hasCycle} | ${title}`);
      const closeBtns=await page.$$('button');
      for(const b of closeBtns){const t=await b.textContent();if(t&&t.trim()==='목록'){await b.click();break;}}
      await page.waitForTimeout(500);
    }
  }
  await check('정수기',3); await check('비데',3); await check('매트리스',3); await check('공기청정기',3);
  await browser.close();
})();
