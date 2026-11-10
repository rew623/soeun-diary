// 원주시 장난감도서관 4개 지점 장난감 목록 → data/toys-<지점>.json (toys.yml, 문 여는 날 2시간마다)
// 사이트는 http만 돼서 앱이 직접 못 읽어요. 목록 화면(sub1.asp)을 지점·태그 색 × 대상 연령마다 쪽을 넘기며 읽어 합쳐요
import { readFile, writeFile } from 'node:fs/promises';
const B = 'http://www.wjeducare.or.kr/toy/m4/';
const BR = { mm: [['1', 'r'], ['2', 'y'], ['3', 'b']], ct: [['14', 'r'], ['15', 'y'], ['16', 'b']], bm: [['11', 'r'], ['12', 'y'], ['13', 'b']], np: [['17', 'r'], ['18', 'y'], ['19', 'b']] };   // 문막·센터·보물섬·늘품
const AGES = ['000', '100', '200', '300'];   // 12·24·35개월 이하, 36개월 이상 (search3)
const PIC = 'https://www.winbook.kr/lib_upload/V191616/book_img/';
const only = (process.env.TOY_BRANCH || '').split(',').filter(k => BR[k]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (soeun-diary family app toy list)' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return new TextDecoder('euc-kr').decode(new Uint8Array(await r.arrayBuffer())).replace(/\s+/g, ' ');
    } catch (e) { if (i >= 2) throw e; await sleep(3000 * (i + 1)); }
  }
}
const dec = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
let failed = 0;
for (const [b, tags] of Object.entries(BR)) {
  if (only.length && !only.includes(b)) continue;
  const by = new Map(); let pages = 0;
  try {
    for (const [t, c] of tags) for (const a of AGES) {
      for (let p = 1, last = 1; p <= last && p <= 120; p++) {
        const h = await get(`${B}sub1.asp?seq=-1&page=${p}&search1=${t}&search2=&search3=${a}&SearchString=`); pages++;
        const m = /class='mobilePage'><b>\d+<\/b> \/ (\d+)/.exec(h); if (m) last = +m[1];
        for (const x of h.matchAll(/<li> <a href="sub1_view\.asp\?[^"]*idx=([A-Z0-9]+)[^"]*"> <span class="img"><img src="([^"]*)"[^>]*><\/span> <span class="title">(.*?)<\/span>.*?<span class="state type\d">(.*?)<\/span>/g)) {
          const [, id, img, n, st] = x, u = img.replace(/^http:\/\//, 'https://');
          by.set(id, { i: id, n: dec(n), p: u.startsWith(PIC) ? u.slice(PIC.length) : u, c, a, s: /대여가능/.test(st) ? 1 : 0 });
        }
        await sleep(200);
      }
    }
  } catch (e) { console.warn(`${b} 실패: ${e.message}`); failed++; continue; }
  const items = [...by.values()].sort((x, y) => x.i < y.i ? -1 : 1);
  console.log(`${b}: 쪽 ${pages}개, 장난감 ${items.length}개 (대여가능 ${items.filter(x => x.s).length})`);
  if (!items.length) { failed++; continue; }
  const f = `data/toys-${b}.json`;
  let old = null; try { old = JSON.parse(await readFile(f, 'utf8')); } catch (e) {}
  if (old && JSON.stringify(old.items) === JSON.stringify(items)) { console.log('  그대로라 저장 안 해요'); continue; }
  await writeFile(f, JSON.stringify({ updated: kst(), pic: PIC, items }));
}
if (failed) process.exitCode = 1;
