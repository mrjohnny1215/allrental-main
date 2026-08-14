const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('https://allrental-xi.vercel.app/?n=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const nav = await p.evaluate(() => {
    const txt = document.body.innerText;
    const hasConsult = txt.includes('상담신청') || txt.includes('전화상담');
    // 하단 fixed 바 있는지
    const fixedBottom = [...document.querySelectorAll('div')].filter(d=>{
      const s=getComputedStyle(d); return s.position==='fixed'&&s.bottom==='0px'&&d.offsetHeight>30;
    }).length;
    return { hasConsultText: hasConsult, fixedBottomBars: fixedBottom };
  });
  console.log('NAV CHECK:', JSON.stringify(nav));
  // 전체 스크린샷 (하단 포함)
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'backend/shot_bottom.png', fullPage: false });
  console.log('bottom shot saved');
  await b.close();
})();
