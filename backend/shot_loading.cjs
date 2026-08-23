const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto("https://allrental-xi.vercel.app?g="+Date.now(), { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(800);
  await p.screenshot({ path: "/tmp/loading_b.png" });
  const txt = await p.evaluate(()=>document.body.innerText);
  console.log("LOADING TEXT:", txt.includes("ALL렌탈") ? "ALL렌탈 표시됨" : "없음", "| dot존재:", await p.evaluate(()=>document.querySelectorAll(".animate-\\[dotBlink").length));
  await b.close();
})();
