const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto("https://allrental-xi.vercel.app?x="+Date.now(), { waitUntil: "networkidle" });
  await p.waitForTimeout(6000);
  await (await p.$("button:has-text('안마의자')")).click();
  await p.waitForTimeout(2000);
  await (await p.$("img[src*='/products/']")).click().catch(()=>{});
  await p.waitForTimeout(2500);
  await p.screenshot({ path: "/tmp/massage_modal.png", fullPage: false });
  const txt = await p.evaluate(()=>{
    // 가장 바깥 고정 모달 찾기
    const els=[...document.querySelectorAll("div")].filter(e=>e.className.includes("fixed")&&e.className.includes("inset-0"));
    return els.length? els[0].innerText.replace(/\n+/g," | ").slice(0,600) : "no fixed modal";
  });
  console.log("MODAL TEXT:", txt);
  await b.close();
})();
