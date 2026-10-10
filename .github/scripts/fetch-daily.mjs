// 하루 한 번: 강원 축제·행사(한국관광공사) → data/events.json, 어린이 감염병 주간 발생(질병관리청 전수신고) → data/disease.json
// 공공데이터포털에서 "한국관광공사_국문 관광정보 서비스_GW", "질병관리청_전수신고 감염병 발생현황"을 활용신청해야 해요
import { readFile, writeFile } from 'node:fs/promises';
import { regionOf, dataFile } from './lib.mjs';
import { getJson, list, sleep } from './api.mjs';

const kst = (d = 0) => new Date(Date.now() + 9 * 3600e3 + d * 864e5).toISOString().slice(0, 10);
const ymd = s => s.replace(/-/g, '');
async function saveIfChanged(name, body) {
  const out = dataFile(name);
  let old = null; try { old = JSON.parse(await readFile(out, 'utf8')); } catch (e) {}
  if (old && JSON.stringify(old.items) === JSON.stringify(body.items)) { console.log(`${name}: 바뀐 게 없어요`); return; }
  await writeFile(out, JSON.stringify({ updated: kst(), ...body }) + '\n');
  console.log(`${name} 저장: ${body.items.length}건`);
}
let failed = 0;

// ---------- 축제·행사 ----------
// 아기와 가 볼 만한지: 제목·주소에 이런 말이 있으면 표시해요
const KID = /어린이|아이|아기|유아|키즈|가족|동화|인형|놀이|체험|그림책|동물|꽃|빛|등불|정원|산타|크리스마스|눈꽃|썰매|딸기|가을|단풍|축제/;
async function events() {
  const from = ymd(kst(-45)), today = kst(), rows = [];
  let ok = false;
  for (const [svc, op] of [['KorService2', 'searchFestival2']]) {
    try {
      for (let p = 1; p <= 10; p++) {
        const body = await getJson(`https://apis.data.go.kr/B551011/${svc}/${op}`, { MobileOS: 'ETC', MobileApp: 'soeun-diary', _type: 'json', numOfRows: 500, pageNo: p, eventStartDate: from, arrange: 'A' });
        const L = list(body); rows.push(...L);
        console.log(`  행사 ${svc} ${p}쪽: ${rows.length}/${body.totalCount}`);
        if (!L.length || rows.length >= +body.totalCount) break;
        await sleep(300);
      }
      ok = true; break;
    } catch (e) { console.warn(`행사 ${svc} 실패: ${e.message}`); rows.length = 0; }
  }
  if (!ok) { failed++; return; }
  const d8 = s => s && s.length >= 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : '';
  const items = rows.filter(r => /강원/.test(r.addr1 || '')).map(r => {
    const reg = regionOf(r.addr1), lat = +r.mapy, lng = +r.mapx;
    return { id: String(r.contentid), title: r.title || '', addr: [r.addr1, r.addr2].filter(Boolean).join(' '), region: reg ? reg.code : '', start: d8(r.eventstartdate), end: d8(r.eventenddate), img: (r.firstimage2 || r.firstimage || '').replace(/^http:/, 'https:'), tel: r.tel || '', lat: lat || null, lng: lng || null };
  }).filter(e => e.end && e.end >= today).map(e => ({ ...e, kid: KID.test(e.title) ? 1 : 0 }))
    .sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : (a.id < b.id ? -1 : 1));
  await saveIfChanged('events.json', { items });
}

// ---------- 감염병 (전수신고, 주별 전국) ----------
// 아기·어린이와 관련 큰 것만 골라요
const WATCH = ['홍역', '백일해', '수두', '유행성이하선염', '성홍열', '장출혈성대장균감염증', 'A형간염', '일본뇌염', '세균성이질', '장티푸스', '폐렴구균 감염증', 'b형헤모필루스인플루엔자', '풍진', '디프테리아', '폴리오', '쯔쯔가무시증', '중증열성혈소판감소증후군(SFTS)', '수막구균 감염증'];
const norm = s => String(s || '').replace(/^@/, '').trim();
// period: "2026년 40주" → 2026-40
const wk = s => { const m = /(\d{4})\D+(\d{1,2})\s*주/.exec(s || ''); return m ? `${m[1]}-${m[2].padStart(2, '0')}` : ''; };
async function yearRows(y) {
  const rows = [];
  for (let p = 1; p <= 5; p++) {
    const body = await getJson('https://apis.data.go.kr/1790387/EIDAPIService/PeriodBasic', { resType: 2, pageNo: p, numOfRows: 5000, searchPeriodType: 3, searchStartYear: y, searchEndYear: y });
    const L = list(body); rows.push(...L);
    if (!L.length || rows.length >= +body.totalCount) break;
  }
  return rows.filter(r => wk(r.period));
}
// ISO 주차 (KST 오늘)
function isoWeek() {
  const d = new Date(kst() + 'T00:00:00Z'), day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - y0) / 864e5 + 1) / 7);
}
async function disease() {
  const y = +kst().slice(0, 4);
  let now = [], last = [];
  try {
    now = await yearRows(y); console.log(`  감염병 ${y}년: ${now.length}줄`);
    last = await yearRows(y - 1); console.log(`  감염병 ${y - 1}년: ${last.length}줄`);
  } catch (e) { console.warn('감염병 실패: ' + e.message); failed++; return; }
  const rows = now.concat(last);
  if (rows[0]) console.log('  예시: ' + JSON.stringify(rows[0]));
  const by = {};
  for (const r of rows) {
    const n = norm(r.icdNm), w = wk(r.period); if (!w || n === '계') continue;
    const k = WATCH.find(x => n.replace(/\s/g, '') === x.replace(/\s/g, '') || n.startsWith(x.replace(/\(.*\)/, '')));
    if (!k) continue;
    (by[k] = by[k] || {})[w] = (by[k][w] || 0) + (parseInt(String(r.resultVal).replace(/,/g, ''), 10) || 0);
  }
  // 올해 숫자가 있으면 최근 12주, 아직 안 나왔으면 작년 같은 때(이번 주 앞 6주 ~ 뒤 5주)
  const live = now.length > 0, cw = isoWeek();
  let weeks;
  if (live) weeks = [...new Set(Object.values(by).flatMap(o => Object.keys(o)))].sort().slice(-12);
  else weeks = Array.from({ length: 12 }, (_, i) => cw - 6 + i).filter(w => w >= 1 && w <= 52).map(w => `${y - 1}-${String(w).padStart(2, '0')}`);
  const items = Object.entries(by).map(([name, o]) => ({ name, weeks: weeks.map(w => o[w] || 0) })).filter(x => x.weeks.some(Boolean)).sort((a, b) => WATCH.indexOf(a.name) - WATCH.indexOf(b.name));
  if (!items.length) { console.warn('감염병: 고른 병의 기록이 없어요 (응답 형식을 확인해 주세요)'); failed++; return; }
  console.log(`  ${live ? '올해 최근 12주' : `작년 같은 때 (이번 주 ${cw}주 기준)`}`);
  await saveIfChanged('disease.json', { live, week: cw, weeks, items });
}

await events();
await disease();
if (failed) process.exitCode = 1;
