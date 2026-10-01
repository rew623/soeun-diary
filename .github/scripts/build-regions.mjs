// data/h-*.json, p-*.json을 읽어 시·군마다 가운데 좌표와 범위를 data/regions.json으로 만들어요 (앱이 현재 위치로 시·군을 고를 때 씀)
import { readFile, writeFile } from 'node:fs/promises';
import { REGIONS, dataFile } from './lib.mjs';

const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const out = [];
for (const reg of REGIONS) {
  const items = [], cnt = {};
  for (const k of ['h', 'p']) {
    try { const j = JSON.parse(await readFile(dataFile(`${k}-${reg.code}.json`), 'utf8')); items.push(...j.items); cnt[k] = j.items.length; cnt[k + 'u'] = j.updated; } catch (e) { cnt[k] = 0; }
  }
  const pts = items.filter(x => x.lat != null && x.lng != null);
  if (!pts.length) continue;
  const lat = pts.map(x => x.lat), lng = pts.map(x => x.lng);
  // 범위는 바깥 5%를 빼고 잡아요 (주소와 좌표가 어긋난 곳 때문에 범위가 너무 커지지 않게)
  const q = (a, f) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.max(0, Math.floor(a.length * f)))];
  out.push({ code: reg.code, name: reg.name, h: cnt.h, p: cnt.p, lat: +med(lat).toFixed(5), lng: +med(lng).toFixed(5),
    box: [q(lat, .03), q(lng, .03), q(lat, .97), q(lng, .97)].map(v => +v.toFixed(4)) });
}
const text = JSON.stringify({ sido: '강원특별자치도', regions: out }, null, 1) + '\n';
let old = ''; try { old = await readFile(dataFile('regions.json'), 'utf8'); } catch (e) {}
if (old === text) console.log('regions.json 그대로예요');
else { await writeFile(dataFile('regions.json'), text); console.log(`regions.json 저장: ${out.length}개 시·군`); }
