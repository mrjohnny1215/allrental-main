const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await (await b.newContext({viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'})).newPage();
  await p.goto('https://www.rentalsegye.com/product_list.php?cid=1377&gid=1424',{waitUntil:'domcontentloaded', timeout:20000});
  await p.waitForTimeout(3500);
  // 스마트필터 보통 #sectionFilter / .filter_wrap / 좌측 aside
  const info = await p.evaluate(()=>{
    const out={};
    // 필터 영역 후보들 텍스트
    const cand=[...document.querySelectorAll('#sectionFilter, .filter_wrap, aside, .left_area, .sch_box, .filter_box, .smart_filter, [class*=filter]')];
    out.filterCandidates = cand.slice(0,8).map(c=>({cls:c.className, txt:c.innerText.slice(0,500)}));
    // 전체 텍스트에서 '기능/타입/정수방식/용량' 같은 단어 주변
    const full=document.body.innerText;
    const keys=['기능','타입','정수방식','용량','냉수','냉온','얼음','직수','탱크','빌트인','스탠드','하프'];
    out.keyHits = keys.filter(k=>full.includes(k));
    return out;
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
