// 산책 지수 재료: 강원 18개 시·군 날씨(기상청 단기예보) + 미세먼지(에어코리아 실시간·예보) → data/town.json
// 공공데이터포털에서 "기상청_단기예보 조회서비스", "한국환경공단_에어코리아_대기오염정보", "한국환경공단_에어코리아_측정소정보"를 활용신청해야 해요 (키는 DATA_GO_KR_KEY 그대로)
import { readFile, writeFile } from 'node:fs/promises';
import { regionOf, dataFile } from './lib.mjs';
import { getJson, list, sleep } from './api.mjs';

// ---------- 위경도 → 기상청 격자 ----------
function grid(lat, lng) {
  const RE = 6371.00877 / 5.0, D = Math.PI / 180, s1 = 30 * D, s2 = 60 * D, olon = 126 * D, olat = 38 * D;
  let sn = Math.log(Math.cos(s1) / Math.cos(s2)) / Math.log(Math.tan(Math.PI / 4 + s2 / 2) / Math.tan(Math.PI / 4 + s1 / 2));
  const sf = Math.pow(Math.tan(Math.PI / 4 + s1 / 2), sn) * Math.cos(s1) / sn, ro = RE * sf / Math.pow(Math.tan(Math.PI / 4 + olat / 2), sn);
  const ra = RE * sf / Math.pow(Math.tan(Math.PI / 4 + lat * D / 2), sn);
  let th = lng * D - olon; if (th > Math.PI) th -= 2 * Math.PI; if (th < -Math.PI) th += 2 * Math.PI; th *= sn;
  return { nx: Math.floor(ra * Math.sin(th) + 43 + 0.5), ny: Math.floor(ro - ra * Math.cos(th) + 136 + 0.5) };
}
// 단기예보 발표 시각: 02·05·08·11·14·17·20·23시 (발표 뒤 15분쯤부터 받을 수 있어요)
function baseTime() {
  const k = new Date(Date.now() + 9 * 3600e3 - 15 * 60e3);
  let h = k.getUTCHours(); const b = [23, 20, 17, 14, 11, 8, 5, 2].find(x => x <= h);
  if (b == null) k.setUTCDate(k.getUTCDate() - 1);
  const d = k.toISOString().slice(0, 10).replace(/-/g, '');
  return { base_date: d, base_time: String(b == null ? 23 : b).padStart(2, '0') + '00' };
}

async function weather(regions) {
  const bt = baseTime(), out = {};
  for (const r of regions) {
    const { nx, ny } = grid(r.lat, r.lng);
    try {
      const body = await getJson('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst', { pageNo: 1, numOfRows: 1000, dataType: 'JSON', ...bt, nx, ny });
      const by = {};
      for (const it of list(body)) {
        if (!['TMP', 'SKY', 'PTY', 'POP', 'WSD', 'REH', 'PCP'].includes(it.category)) continue;
        const k = it.fcstDate + it.fcstTime; (by[k] = by[k] || { t: k })[it.category] = it.fcstValue;
      }
      // [날짜시각, 기온, 하늘(1맑음 3구름많음 4흐림), 강수형태(0없음 1비 2비/눈 3눈 4소나기), 강수확률, 풍속, 습도]
      out[r.code] = Object.values(by).sort((a, b) => a.t < b.t ? -1 : 1).slice(0, 52)
        .map(o => [o.t, +o.TMP, +o.SKY || 0, +o.PTY || 0, +o.POP || 0, +o.WSD || 0, +o.REH || 0]);
      console.log(`날씨 ${r.name} (${nx},${ny}): ${out[r.code].length}시간`);
    } catch (e) { console.warn(`날씨 ${r.name} 실패: ${e.message}`); if (/SERVICE_KEY|NOT_REGISTERED|등록/.test(e.message)) break; }
    await sleep(300);
  }
  return { base: bt.base_date + bt.base_time, data: out };
}

// ---------- 미세먼지 ----------
const EAST = ['gangneung', 'donghae', 'sokcho', 'samcheok', 'taebaek', 'goseong', 'yangyang'];   // 강원영동, 나머지는 강원영서
async function air(regions) {
  const out = {};
  // 측정소 → 시·군
  const st = {};
  try {
    const body = await getJson('https://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getMsrstnList', { returnType: 'json', numOfRows: 300, pageNo: 1, addr: '강원' });
    for (const s of list(body)) { const r = regionOf(s.addr); if (r) { const a = +s.dmX, b = +s.dmY; st[s.stationName] = { code: r.code, lat: a < 90 ? a : b, lng: a < 90 ? b : a }; } }
    console.log(`측정소 ${Object.keys(st).length}곳`);
  } catch (e) { console.warn('측정소 목록 실패: ' + e.message); }
  try {
    const body = await getJson('https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty', { returnType: 'json', numOfRows: 300, pageNo: 1, sidoName: '강원', ver: '1.0' });
    const by = {};
    for (const m of list(body)) {
      const s = st[m.stationName]; if (!s) continue;
      const p10 = parseInt(m.pm10Value, 10), p25 = parseInt(m.pm25Value, 10);
      (by[s.code] = by[s.code] || []).push({ n: m.stationName, t: m.dataTime, p10: isFinite(p10) ? p10 : null, p25: isFinite(p25) ? p25 : null });
    }
    const avg = a => { const v = a.filter(x => x != null); return v.length ? Math.round(v.reduce((x, y) => x + y, 0) / v.length) : null; };
    for (const r of regions) {
      let a = by[r.code], near = '';
      if (!a) {   // 측정소가 없는 시·군은 가장 가까운 시·군 값
        const c = regions.filter(x => by[x.code]).sort((x, y) => Math.hypot(x.lat - r.lat, x.lng - r.lng) - Math.hypot(y.lat - r.lat, y.lng - r.lng))[0];
        if (!c) continue; a = by[c.code]; near = c.name;
      }
      out[r.code] = { t: a[0].t, pm10: avg(a.map(x => x.p10)), pm25: avg(a.map(x => x.p25)), st: a.map(x => x.n).join(', '), near };
    }
    console.log(`미세먼지 ${Object.keys(out).length}개 시·군`);
  } catch (e) { console.warn('미세먼지 실시간 실패: ' + e.message); }
  // 예보 (오늘·내일, 영서/영동)
  const fc = {};
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  for (const code of ['PM10', 'PM25']) {
    try {
      const body = await getJson('https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth', { returnType: 'json', numOfRows: 100, pageNo: 1, searchDate: today, InformCode: code });
      const rows = list(body).filter(x => x.informGrade).sort((a, b) => (a.dataTime < b.dataTime ? 1 : -1));
      for (const x of rows) {
        const d = x.informData; if (!d || (fc[code] && fc[code][d])) continue;
        const g = {}; for (const part of x.informGrade.split(',')) { const [k, v] = part.split(':').map(s => s.trim()); if (/영서|영동/.test(k)) g[k.includes('영동') ? 'e' : 'w'] = v; }
        if (g.e || g.w) (fc[code] = fc[code] || {})[d] = g;
      }
    } catch (e) { console.warn(`미세먼지 예보 ${code} 실패: ${e.message}`); }
  }
  return { now: out, fc, east: EAST };
}

// ---------- 기상특보 (폭염·한파·호우·대설·강풍…, 지금 발효 중인 것) ----------
// "기상청_기상특보 조회서비스" 활용신청 필요. t6(특보 발효 현황) 글에서 강원도(…) 안의 지역 이름으로 시·군을 찾아요
async function warnings(regions) {
  try {
    const body = await getJson('https://apis.data.go.kr/1360000/WthrWrnInfoService/getPwnStatus', { pageNo: 1, numOfRows: 10, dataType: 'JSON' });
    const it = list(body)[0]; if (!it) return { tm: '', list: [] };
    const txt = String(it.t6 || '');
    console.log('특보 원문: ' + txt.replace(/\s+/g, ' ').slice(0, 400));
    const out = [];
    for (const line of txt.split(/\r?\n|(?=o\s)/)) {
      const m = /([가-힣]+(?:주의보|경보))\s*:\s*(.+)/.exec(line); if (!m) continue;
      const g = /강원(?:특별자치)?도\s*(\(([^)]*)\))?/.exec(m[2]); if (!g) continue;
      let codes;
      if (!g[1]) codes = regions.map(r => r.code);   // 강원도 전체
      else { const toks = g[2].split(',').map(t => t.trim()); codes = regions.filter(r => toks.some(t => t.startsWith(r.name.replace(/[시군]$/, '')))).map(r => r.code); }
      if (codes.length) out.push({ kind: m[1], codes });
    }
    console.log(`특보: 강원 ${out.length}건`);
    return { tm: String(it.tmFc || ''), list: out };
  } catch (e) { console.warn('특보 실패: ' + e.message); return null; }
}
// ---------- 미세먼지 주의보·경보 (오늘 내려져 아직 안 풀린 것) ----------
// "한국환경공단_에어코리아_대기오염정보"와 별개인 "…_미세먼지 경보 정보 조회" 활용신청 필요
async function dustAlarm(regions) {
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), out = [];
  let ok = false;
  for (const code of ['PM10', 'PM25']) {
    try {
      const body = await getJson('https://apis.data.go.kr/B552584/UlfptcaAlarmInqireSvc/getUlfptcaAlarmInfo', { returnType: 'json', numOfRows: 100, pageNo: 1, year: today.slice(0, 4), itemCode: code });
      ok = true;
      const rows = list(body); if (rows[0]) console.log(`  경보 ${code} 예시: ${JSON.stringify(rows[0])}`);
      for (const r of rows) {
        if (!/강원/.test(r.districtName || '') || r.issueDate !== today || (r.clearDate && r.clearDate.trim())) continue;
        const mv = r.moveName || '', east = EAST.includes.bind(EAST);
        const codes = /영동/.test(mv) ? regions.filter(x => east(x.code)).map(x => x.code) : /영서/.test(mv) ? regions.filter(x => !east(x.code)).map(x => x.code)
          : regions.filter(x => mv.includes(x.name.replace(/[시군]$/, ''))).map(x => x.code);
        out.push({ item: code === 'PM25' ? '초미세먼지' : '미세먼지', gbn: r.issueGbn || '주의보', move: mv, time: `${r.issueTime || ''}`, codes: codes.length ? codes : regions.map(x => x.code) });
      }
    } catch (e) { console.warn(`미세먼지 경보 ${code} 실패: ${e.message}`); }
  }
  console.log(`미세먼지 경보: 오늘 강원 ${out.length}건`);
  return ok ? out : null;
}

const regions = (JSON.parse(await readFile(dataFile('regions.json'), 'utf8')).regions || []).filter(r => r.lat && r.lng);
if (!regions.length) { console.error('data/regions.json에 시·군 좌표가 없어요'); process.exit(1); }
const w = await weather(regions), a = await air(regions), wn = await warnings(regions), al = await dustAlarm(regions);
if (!Object.keys(w.data).length && !Object.keys(a.now).length) { console.error('날씨·미세먼지를 하나도 못 받았어요 (활용신청을 확인해 주세요)'); process.exit(1); }

const out = dataFile('town.json');
let old = null; try { old = JSON.parse(await readFile(out, 'utf8')); } catch (e) {}
const body = { weather: Object.keys(w.data).length ? w : (old && old.weather) || w, air: Object.keys(a.now).length ? a : (old && old.air) || a, warn: wn, alarm: al || [] };
if (old && JSON.stringify({ weather: old.weather, air: old.air, warn: old.warn, alarm: old.alarm }) === JSON.stringify(body)) { console.log('바뀐 게 없어요'); process.exit(0); }
const updated = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
await writeFile(out, JSON.stringify({ updated, ...body }) + '\n');
console.log(`town.json 저장 (${updated})`);
