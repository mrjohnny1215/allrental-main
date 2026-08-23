#!/usr/bin/env node
// Vercel deploy via REST API (CLI 우회) — dist/ 정적 배포
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const TOKEN = process.env.VERCEL_TOKEN || 'vck_8TfquG173BLaLpF09XBz7XezyyMrZvnQmKV4riGtpDbTwaW9Gz2OSRGP';
const TEAM = process.env.VERCEL_SCOPE || 'team_rS1FJxwhmvJFHz3CsWuzVCQ';
const DIST = path.join(__dirname, '..', 'dist');

function sha1(buf){ return crypto.createHash('sha1').update(buf).digest('hex'); }
function walk(dir, base=''){
  let out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name); const rel=base?base+'/'+e.name:e.name;
    if(e.isDirectory()) out=out.concat(walk(p,rel));
    else out.push({rel, abs:p});
  }
  return out;
}
function req(method, urlPath, body, headers={}){
  return new Promise((resolve,reject)=>{
    const data=body?JSON.stringify(body):null;
    const u=new URL('https://api.vercel.com'+urlPath);
    const h={Authorization:'Bearer '+TOKEN, ...headers};
    if(data) h['Content-Type']='application/json';
    const r=https.request(u,{method,headers:h},res=>{
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode,body:d}));
    });
    r.on('error',reject); if(data) r.write(data); r.end();
  });
}

(async()=>{
  const files=walk(DIST);
  console.log('파일 수:',files.length);
  // files 배열 구성
  const fileArr=files.map(f=>{
    const buf=fs.readFileSync(f.abs);
    const ext=path.extname(f.rel).slice(1);
    const ct = ext==='html'?'text/html':ext==='js'?'application/javascript':ext==='css'?'text/css':'application/octet-stream';
    return {file:f.rel, sha:sha1(buf), size:buf.length, data:buf, ct};
  });
  // deployment 생성
  const createBody={
    name:'allrental',
    target:'production',
    projectSettings:{framework:'vite', buildCommand:null, outputDirectory:'dist'},
    files:fileArr.map(f=>({file:f.file, sha:f.sha, size:f.size})),
  };
  const c=await req('POST',`/v13/deployments?teamId=${TEAM}`,createBody);
  if(c.status!==200 && c.status!==201){
    console.log('CREATE FAIL',c.status,c.body.slice(0,500)); process.exit(1);
  }
  const dep=JSON.parse(c.body);
  console.log('DEPLOY ID:',dep.id);
  // 파일 업로드
  const uploadMap={};
  for(const f of fileArr) uploadMap[f.sha]=f;
  for(const fu of (dep.files||[])){
    const f=uploadMap[fu.sha];
    if(!f) continue;
    await new Promise((resolve,reject)=>{
      const u=new URL(fu.url);
      const r=https.request(u,{method:'PUT',headers:{'Content-Type':f.ct,'Content-Length':f.size}},res=>{
        let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({status:res.statusCode,body:d}));
      });
      r.on('error',reject); r.write(f.data); r.end();
    });
  }
  console.log('UPLOAD DONE');
  // 상태 폴링
  for(let i=0;i<30;i++){
    const s=await req('GET',`/v13/deployments/${dep.id}?teamId=${TEAM}`);
    const st=JSON.parse(s.body);
    console.log('STATUS:',st.readyState, st.url);
    if(st.readyState==='READY'){ console.log('READY:',st.url); break; }
    if(st.readyState==='ERROR'){ console.log('ERROR:',st.errorMessage); break; }
    await new Promise(r=>setTimeout(r,3000));
  }
})().catch(e=>{console.error('ERR',e);process.exit(1);});
