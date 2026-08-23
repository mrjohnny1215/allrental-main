const fs = require('fs');
const crypto = require('crypto');
const dir = __dirname + '/../public/products';
const mapFile = __dirname + '/img_rename_map.json';
let map = {};
if (fs.existsSync(mapFile)) map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const files = fs.readdirSync(dir);
let renamed = 0;
for (const f of files) {
  if (/^[a-f0-9]{32}\.(jpg|png|jpeg|webp)$/i.test(f)) continue; // 이미 해시명
  const oldPath = dir + '/' + f;
  const hash = crypto.createHash('md5').update(f).digest('hex');
  const ext = (f.split('.').pop() || 'jpg').toLowerCase();
  const newName = hash + '.' + ext;
  if (newName === f) continue;
  const newPath = dir + '/' + newName;
  if (fs.existsSync(newPath)) { map[f] = newName; continue; }
  fs.renameSync(oldPath, newPath);
  map[f] = newName;
  renamed++;
}
fs.writeFileSync(mapFile, JSON.stringify(map, null, 0));
console.log('renamed:', renamed, 'mapSize:', Object.keys(map).length);

// products_data.json 경로 교체
const dataPath = __dirname + '/../public/products_data.json';
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let upd = 0;
d.forEach(p => {
  if (p.image && p.image.startsWith('/products/')) {
    const fn = decodeURIComponent(p.image.split('/products/')[1]);
    if (map[fn]) { p.image = '/products/' + map[fn]; upd++; }
  }
});
fs.writeFileSync(dataPath, JSON.stringify(d, null, 0));
console.log('data updated:', upd);
