const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto("https://allrental-xi.vercel.app?f="+Date.now(), { waitUntil: "networkidle" });
  await p.waitForTimeout(4000);
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await p.waitForTimeout(3000);
  const t = await p.evaluate(()=>{ const f=document.querySelector("footer"); return f? f.innerText.replace(/\n+/g," | ") : "NO FOOTER"; });
  console.log("XI FOOTER FINAL:", t);
  const hasBad = await p.evaluate(()=> {
    const txt = document.body.innerText;
    return ["1877-0000","allrental@naver.com","allrental-xi.vercel.app","오룡중앙동로"].filter(s=>txt.includes(s));
  });
  console.log("REMOVED CHECK (비어있으면 삭제완료):", JSON.stringify(hasBad));
  await b.close();
})();
