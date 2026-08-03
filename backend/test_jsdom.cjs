const fs = require('fs');
const { JSDOM } = require('jsdom');

// 빌드번들 읽기
const bundle = fs.readFileSync('/opt/data/allrental/dist/assets/index-Bd75OpjK.js', 'utf-8');

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  runScripts: 'outside-only',
  url: 'http://localhost:8099/',
  pretendToBeVisual: true,
});
const { window } = dom;
global.window = window;
global.document = window.document;
global.navigator = window.navigator;

// fetch 모킹: 로컬 서버 데이터 사용
global.fetch = async (url) => {
  const http = require('http');
  const data = await new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
  return { json: async () => JSON.parse(data), text: async () => data, ok: true };
};

// React 진입점 실행
try {
  const script = new Function('window', 'document', 'navigator', 'fetch', 'React', bundle);
  // 번들은 전역에 React 등을 require하므로, require 사용
  const Module = require('module');
  const m = new Module('bundle');
  m.paths = Module._nodeModulePaths('/opt/data/allrental');
  m._compile('const exports={};const module=this;' + bundle, '/opt/data/allrental/dist/assets/index-Bd75OpjK.js');
} catch (e) {
  console.log('BUNDLE EXEC ERROR:', e.message);
}
