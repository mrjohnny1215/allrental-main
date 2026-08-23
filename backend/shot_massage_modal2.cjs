const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto("https://allrental-xi.vercel.app?y="+Date.now(), { waitUntil: "networkidle" });
  await p.waitForTimeout(6000);
  await (await p.$("button:has-text('안마의자')")).click();
  await p.waitForTimeout(2000);
  // 상세보기 버튼 클릭
  const detailBtn = await p.$("button:has-text('상세보기')");
  if(detailBtn){ await detailBtn.click(); await p.waitForTimeout(2500); }
  else {
    // 카드 자체 클릭
    const card = await p.$("img[src*='/products/']");
    if(card) await card.click().catch(()=>{});
    await p.waitForTimeout(2500);
  }
  await p.screenshot({ path: "/tmp/massage_modal2.png" });
  const txt = await p.evaluate(()=>{
    const els=[...document.querySelectorAll("div")].filter(e=>e.className.includes("fixed")&&e.className.includes("inset-0"));
    return els.length? els[0].innerText.replace(/\n+/g," | ").slice(0,800) : "no fixed modal";
  });
  console.log("MODAL TEXT:", txt);
  await b.close();
})();
