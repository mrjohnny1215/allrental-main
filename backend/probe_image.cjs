const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' });
  const page = await ctx.newPage();
  const url = 'https://rentalsegye.com/product.php?no=42328&cid=1379&gid=1408';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // og:image
  const og = await page.$eval('meta[property="og:image"]', el=>el.content).catch(()=>null);
  // 메인 이미지 영역 후보들
  const cands = await page.evaluate(() => {
    const out=[];
    // 1. #sitm_img 또는 큰 상품 이미지
    document.querySelectorAll('img').forEach(im=>{
      const w=im.naturalWidth, src=im.getAttribute('src')||'';
      if (src.includes('data/file') || src.includes('speedycdn')) out.push({src:src.slice(0,90), w});
    });
    return {og, cands: out.slice(0,10)};
  });
  console.log('og:image:', og);
  console.log('이미지 후보:');
  cands.cands.forEach(c=>console.log('  ',c.w, c.src));
  await browser.close();
})();
