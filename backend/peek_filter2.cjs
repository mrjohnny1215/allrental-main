const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'})).newPage();
  await p.goto('https://www.rentalsegye.com/product_list.php?cid1377&gid1424',{waitUntil:'domcontentloaded', timeout:20000});
  await p.waitForTimeout(3000);
  // 필터 영역: 보통 좌측 .filter / .sch_filter / aside
  const info = await p.evaluate(()=>{
    const out={};
    // 모든 셀렉트/체크박스 라벨
    const labels=[...document.querySelectorAll('label, .filter_tit, .sch_filter dt, .category_list a, aside a')].map(e=>e.textContent.trim()).filter(t=>t && t.length<30);
    out.menuLabels = [...new Set(labels)].slice(0,60);
    // 좌측 카테고리 링크 중 정수기 찾기
    const links=[...document.querySelectorAll('a')].map(a=>({t:a.textContent.trim(),h:a.getAttribute('href')})).filter(a=>a.t && /정수|냉온|얼음/.test(a.t));
    out.waterLinks = links.slice(0,15);
    return out;
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
