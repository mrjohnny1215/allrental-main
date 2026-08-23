const fs = require('fs');
const jobs = JSON.parse(fs.readFileSync(__dirname + '/img_jobs.json', 'utf8'));
const d = require(__dirname + '/../public/products_data.json');
const urlToFn = {};
jobs.forEach(j => urlToFn[j.url] = j.fn);
let upd = 0, miss = 0;
d.forEach(p => {
  if (p.image && urlToFn[p.image]) {
    const fn = urlToFn[p.image];
    if (fs.existsSync(__dirname + '/../public/products/' + fn)) { p.image = '/products/' + fn; upd++; }
    else miss++;
  }
});
fs.writeFileSync(__dirname + '/../public/products_data.json', JSON.stringify(d, null, 0));
// merged도 함께
try {
  const m = require(__dirname + '/../merged_products.json');
  m.forEach(p => {
    if (p.image && urlToFn[p.image] && fs.existsSync(__dirname + '/../public/products/' + urlToFn[p.image])) {
      p.image = '/products/' + urlToFn[p.image];
    }
  });
  fs.writeFileSync(__dirname + '/../merged_products.json', JSON.stringify(m, null, 0));
} catch (e) { console.log('merged skip:', e.message); }
console.log('updated:', upd, 'miss:', miss);
