// 공공데이터포털(국립중앙의료원) 목록 API 공통 도구: 쪽 넘기며 전부 받기, 진료시간 정리, 바뀐 경우에만 저장
import { readFile, writeFile } from 'node:fs/promises';

const RAW = (process.env.DATA_GO_KR_KEY || '').trim();
if (!RAW) { console.error('DATA_GO_KR_KEY 시크릿이 비어 있어요'); process.exit(1); }
// 공공데이터포털의 인코딩 키(%가 들어 있음)는 그대로, 디코딩 키는 인코딩해서 써요
const KEY = RAW.includes('%') ? RAW : encodeURIComponent(RAW);
const ROWS = 500;

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

async function page(base, params, pageNo) {
  const qs = Object.entries({ ...params, pageNo, numOfRows: ROWS }).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = `${base}?serviceKey=${KEY}&${qs}`;
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
export async function all(base, params) {
  const out = [];
  for (let p = 1; ; p++) {
    const { total, list } = await page(base, params, p);
    out.push(...list);
    console.log(`  ${JSON.stringify(params)} ${p}쪽: ${out.length}/${total}`);
    if (!list.length || out.length >= total) return out;
  }
}
// 시도 이름: "강원특별자치도"로 먼저, 결과가 없으면 "강원도"로
export async function allRegion(base, q1, extra = {}) {
  for (const Q0 of ['강원특별자치도', '강원도']) {
    const rows = await all(base, { Q0, Q1: q1, ...extra });
    if (rows.length) return { Q0, rows };
  }
  return { Q0: '', rows: [] };
}

const hhmm = v => /^\d{3,4}$/.test(v || '') ? v.padStart(4, '0') : '';
// 요일별 진료시간: 1=월 … 7=일, 8=공휴일
export function times(r) {
  const t = {};
  for (let d = 1; d <= 8; d++) {
    const s = hhmm(r[`dutyTime${d}s`]), c = hhmm(r[`dutyTime${d}c`]);
    if (s && c) t[d] = [s, c];
  }
  return t;
}
export function coords(r) {
  const lat = Number(r.wgs84Lat), lng = Number(r.wgs84Lon);
  return { lat: isFinite(lat) && lat ? lat : null, lng: isFinite(lng) && lng ? lng : null };
}

// 목록이 그대로면 파일을 건드리지 않아요 (커밋도 안 생김)
export async function save(out, meta, list) {
  list.sort((a, b) => a.hpid < b.hpid ? -1 : a.hpid > b.hpid ? 1 : 0);
  let old = null;
  try { old = JSON.parse(await readFile(out, 'utf8')); } catch (e) {}
  if (old && JSON.stringify(old.items) === JSON.stringify(list)) { console.log(`바뀐 게 없어요 (${list.length}곳)`); return; }
  const updated = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // KST 날짜
  const head = JSON.stringify({ ...meta, updated, count: list.length });
  await writeFile(out, head.slice(0, -1) + ',"items":[\n' + list.map(x => JSON.stringify(x)).join(',\n') + '\n]}\n');
  console.log(`${out.pathname.split('/').pop()} 저장: ${list.length}곳`);
}
