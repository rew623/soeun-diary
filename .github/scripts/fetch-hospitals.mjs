// 국립중앙의료원 전국 병·의원 찾기 서비스에서 원주시 병·의원을 받아 hospitals.json으로 저장해요
// 실행: DATA_GO_KR_KEY=... node .github/scripts/fetch-hospitals.mjs
import { readFile, writeFile } from 'node:fs/promises';

const BASE = 'https://apis.data.go.kr/B552657/HsptlAsembySearchService/getHsptlMdcncListInfoInqire';
const OUT = new URL('../../hospitals.json', import.meta.url);
const Q1 = '원주시', ROWS = 500;
// 남길 진료과목 (목록 응답에 진료과목이 없으면 QD 코드로 따로 물어봐요)
const DEPTS = { '소아청소년과': 'D002', '이비인후과': 'D013', '내과': 'D001', '가정의학과': 'D022', '피부과': 'D005', '안과': 'D012' };

const RAW = (process.env.DATA_GO_KR_KEY || '').trim();
if (!RAW) { console.error('DATA_GO_KR_KEY 시크릿이 비어 있어요'); process.exit(1); }
// 공공데이터포털의 인코딩 키(%가 들어 있음)는 그대로, 디코딩 키는 인코딩해서 써요
const KEY = RAW.includes('%') ? RAW : encodeURIComponent(RAW);

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const dec = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] !== '#' ? (ENT[e] ?? m)
    : String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)))
  .trim();
const tag = (xml, t) => { const m = new RegExp(`<${t}>([\\s\\S]*?)</${t}>`).exec(xml); return m ? dec(m[1]) : ''; };
const items = xml => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
  const o = {};
  for (const f of m[1].matchAll(/<(\w+)>([\s\S]*?)<\/\1>/g)) o[f[1]] = dec(f[2]);
  return o;
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function page(params, pageNo) {
  const qs = Object.entries({ ...params, pageNo, numOfRows: ROWS }).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = `${BASE}?serviceKey=${KEY}&${qs}`;
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url);
      const xml = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} ${xml.slice(0, 200)}`);
      const code = tag(xml, 'resultCode');
      if (!code) throw new Error('알 수 없는 응답: ' + (tag(xml, 'returnAuthMsg') || xml).slice(0, 200));
      if (code !== '00') throw new Error(`API 오류 ${code} ${tag(xml, 'resultMsg')}`);
      return { total: Number(tag(xml, 'totalCount')) || 0, list: items(xml) };
    } catch (e) {
      if (i >= 3) throw e;
      console.warn(`다시 시도 (${i + 1}/3): ${e.message}`);
      await sleep(2000 * 2 ** i);
    }
  }
}
async function all(params) {
  const out = [];
  for (let p = 1; ; p++) {
    const { total, list } = await page(params, p);
    out.push(...list);
    console.log(`  ${JSON.stringify(params)} ${p}쪽: ${out.length}/${total}`);
    if (!list.length || out.length >= total) return out;
  }
}

let Q0 = '강원특별자치도', rows = await all({ Q0, Q1 });
if (!rows.length) { Q0 = '강원도'; rows = await all({ Q0, Q1 }); }
if (!rows.length) { console.error('원주시 병원이 한 곳도 오지 않았어요. 기존 hospitals.json은 그대로 둬요'); process.exit(1); }

// 진료과목: 목록 응답에 dgidIdName이 있으면 그걸 쓰고, 없으면 과목별(QD)로 따로 받아서 채워요
const deptOf = new Map();
if (!rows.some(r => 'dgidIdName' in r)) {
  console.log('목록에 진료과목이 없어서 과목별로 따로 받아요');
  for (const [name, code] of Object.entries(DEPTS)) {
    for (const r of await all({ Q0, Q1, QD: code })) {
      if (!deptOf.has(r.hpid)) deptOf.set(r.hpid, new Set());
      deptOf.get(r.hpid).add(name);
    }
  }
}

const hhmm = v => /^\d{3,4}$/.test(v || '') ? v.padStart(4, '0') : '';
const seen = new Set(), list = [];
for (const r of rows) {
  if (!r.hpid || seen.has(r.hpid)) continue;
  seen.add(r.hpid);
  const depts = r.dgidIdName != null
    ? r.dgidIdName.split(',').map(s => s.trim()).filter(Boolean)
    : [...(deptOf.get(r.hpid) || [])];
  const er = r.dutyEryn === '1';
  if (!er && !depts.some(d => d in DEPTS)) continue;
  const t = {};
  for (let d = 1; d <= 8; d++) {              // 1=월 … 7=일, 8=공휴일
    const s = hhmm(r[`dutyTime${d}s`]), c = hhmm(r[`dutyTime${d}c`]);
    if (s && c) t[d] = [s, c];
  }
  const lat = Number(r.wgs84Lat), lng = Number(r.wgs84Lon);
  list.push({
    hpid: r.hpid, name: r.dutyName || '', kind: r.dutyDivNam || '', addr: r.dutyAddr || '', tel: r.dutyTel1 || '',
    lat: isFinite(lat) && lat ? lat : null, lng: isFinite(lng) && lng ? lng : null,
    depts, t, er
  });
}
list.sort((a, b) => a.hpid < b.hpid ? -1 : a.hpid > b.hpid ? 1 : 0);

let old = null;
try { old = JSON.parse(await readFile(OUT, 'utf8')); } catch (e) {}
if (old && JSON.stringify(old.items) === JSON.stringify(list)) {
  console.log(`바뀐 게 없어요 (${list.length}곳)`);
  process.exit(0);
}
const updated = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // KST 날짜
const head = JSON.stringify({ region: '강원 원주시', q0: Q0, updated, count: list.length });
await writeFile(OUT, head.slice(0, -1) + ',"items":[\n' + list.map(x => JSON.stringify(x)).join(',\n') + '\n]}\n');
console.log(`hospitals.json 저장: ${list.length}곳 (전체 ${rows.length}곳 중)`);
