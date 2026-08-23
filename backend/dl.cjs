const fs=require("fs"); const https=require("https"); const path=require("path");
const jobs=JSON.parse(fs.readFileSync("backend/img_jobs.json","utf8"));
const dir="public/products";
let done=0, ok=0, fail=0;
const CONC=10;
function get(u){return new Promise(res=>{
  const req=https.get(u,{headers:{"User-Agent":"Mozilla/5.0","Referer":"https://rentalsegye.com/"}},r=>{
    if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){r.resume();return get(r.headers.location).then(res);}
    if(r.statusCode!==200){r.resume();return res(false);}
    const buf=[];let n=0;r.on("data",c=>{buf.push(c);n+=c.length;});r.on("end",()=>res({buf:Buffer.concat(buf),n}));
  });
  req.on("error",()=>res(false));req.setTimeout(15000,()=>{req.destroy();res(false);});
});}
async function worker(i){
  while(i<jobs.length){
    const j=jobs[i]; i+=CONC;
    const r=await get(j.url);
    if(r&&r.buf&&r.n>500){fs.writeFileSync(path.join(dir,j.fn),r.buf);ok++;}else{fail++;}
    done++; if(done%50===0)console.log("done",done,"ok",ok,"fail",fail);
  }
}
(async()=>{const ws=[];for(let i=0;i<CONC;i++)ws.push(worker(i));await Promise.all(ws);
console.log("FINAL done",done,"ok",ok,"fail",fail);
})();
