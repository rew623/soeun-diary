// 원주시 장난감도서관(문막) 장난감 목록 → data/toys.json (하루 몇 번, toys.yml)
// 사이트는 http만 돼서 앱이 직접 못 읽어요. 목록 화면(sub1.asp)을 태그 색 × 대상 연령마다 쪽을 넘기며 읽어 합쳐요
import { readFile, writeFile } from 'node:fs/promises';
const B = 'http://www.wjeducare.or.kr/toy/m4/';
const TAGS = [['1', 'r'], ['2', 'y'], ['3', 'b']];          // 문막_빨강·노랑·파랑 (search1)
const AGES = ['000', '100', '200', '300'];                   // 12·24·35개월 이하, 36개월 이상 (search3)
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (soeun-diary toy list, 4 times a day)' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return new TextDecoder('euc-kr').decode(new Uint8Array(await r.arrayBuffer())).replace(/\s+/g, ' ');
    } catch (e) { if (i >= 2) throw e; await sleep(3000 * (i + 1)); }
  }
}
const dec = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const by = new Map();
let pages = 0;
for (const [t, c] of TAGS) for (const a of AGES) {
  for (let p = 1, last = 1; p <= last && p <= 80; p++) {
    const h = await get(`${B}sub1.asp?seq=-1&page=${p}&search1=${t}&search2=&search3=${a}&SearchString=`); pages++;
    const m = /class='mobilePage'><b>\d+<\/b> \/ (\d+)/.exec(h); if (m) last = +m[1];
    for (const x of h.matchAll(/<li> <a href="sub1_view\.asp\?[^"]*idx=([A-Z0-9]+)[^"]*"> <span class="img"><img src="([^"]*)"[^>]*><\/span> <span class="title">(.*?)<\/span>.*?<span class="state type(\d)">(.*?)<\/span>/g)) {
      const [, id, img, n, ty, st] = x;
      by.set(id, { i: id, n: dec(n.replace(/<[^>]+>/g, '')), img: img.replace(/^http:\/\//, 'https://'), c, a, s: /대여가능/.test(st) ? 1 : 0 });
    }
    await sleep(250);
  }
}
const items = [...by.values()].sort((x, y) => x.i < y.i ? -1 : 1);
console.log(`쪽 ${pages}개 읽음, 장난감 ${items.length}개 (대여가능 ${items.filter(x => x.s).length})`);
if (!items.length) { console.error('장난감을 하나도 못 읽었어요 (사이트 모양이 바뀌었는지 확인)'); process.exit(1); }
// 그림 주소가 https로도 열리는지 (앱은 https라 http 그림은 막힐 수 있어요)
let https = false; try { https = (await fetch(items[0].img, { method: 'GET', signal: AbortSignal.timeout(15000) })).ok; } catch (e) {}
console.log('그림 https:', https);
if (!https) items.forEach(x => { x.img = x.img.replace(/^https:\/\//, 'http://'); });
const f = 'data/toys.json';
let old = null; try { old = JSON.parse(await readFile(f, 'utf8')); } catch (e) {}
if (old && JSON.stringify(old.items) === JSON.stringify(items)) { console.log('그대로라 저장 안 해요'); process.exit(0); }
const kst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
await writeFile(f, JSON.stringify({ updated: kst, branch: '문막', https, items }));
console.log('저장:', kst);
