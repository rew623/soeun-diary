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

// 강수량·적설 글자 → 숫자 ("강수없음"·"적설없음" 0, "1mm 미만" 0.5, "30.0~50.0mm" 50, "50.0mm 이상" 50)
function amount(v) {
  v = String(v || ''); if (!v || /없음/.test(v)) return 0;
  if (/미만/.test(v)) return 0.5;
  const n = v.match(/[\d.]+/g); return n ? +n[n.length - 1] : 0;
}
async function weather(regions) {
  const bt = baseTime(), out = {};
  for (const r of regions) {
    const { nx, ny } = grid(r.lat, r.lng);
    try {
      const body = await getJson('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst', { pageNo: 1, numOfRows: 2000, dataType: 'JSON', ...bt, nx, ny });
      const by = {};
      for (const it of list(body)) {
        if (!['TMP', 'SKY', 'PTY', 'POP', 'WSD', 'REH', 'PCP', 'SNO'].includes(it.category)) continue;
        const k = it.fcstDate + it.fcstTime; (by[k] = by[k] || { t: k })[it.category] = it.fcstValue;
      }
      // [날짜시각, 기온, 하늘(1맑음 3구름많음 4흐림), 강수형태(0없음 1비 2비/눈 3눈 4소나기), 강수확률, 풍속, 습도, 1시간 강수량(mm), 1시간 신적설(cm)]
      out[r.code] = Object.values(by).sort((a, b) => a.t < b.t ? -1 : 1).slice(0, 130)
        .map(o => [o.t, +o.TMP, +o.SKY || 0, +o.PTY || 0, +o.POP || 0, +o.WSD || 0, +o.REH || 0, amount(o.PCP), amount(o.SNO)]);
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

// ---------- 중기예보 (3~10일 뒤: 오전·오후 날씨·강수확률, 최저·최고기온) → 산책 일주일 예보 ----------
// "기상청_중기예보 조회서비스" 활용신청 필요. 육상예보는 강원영서/영동, 기온은 시·군별 지점 (못 받은 시·군은 가까운 곳 값)
const MID_TA = { chuncheon: '11D10301', wonju: '11D10401', gangneung: '11D20501', donghae: '11D20601', taebaek: '11D20301', sokcho: '11D20401', samcheok: '11D20602', hongcheon: '11D10302', hoengseong: '11D10402', yeongwol: '11D10501', pyeongchang: '11D10503', jeongseon: '11D10502', cheorwon: '11D10101', hwacheon: '11D10102', yanggu: '11D10202', inje: '11D10201', goseong: '11D20402', yangyang: '11D20403' };
function midTmFc() {
  const k = new Date(Date.now() + 9 * 3600e3 - 40 * 60e3), h = k.getUTCHours();   // 06시·18시 발표, 40분쯤 뒤부터
  if (h < 6) { k.setUTCDate(k.getUTCDate() - 1); return k.toISOString().slice(0, 10).replace(/-/g, '') + '1800'; }
  return k.toISOString().slice(0, 10).replace(/-/g, '') + (h < 18 ? '0600' : '1800');
}
async function mid(regions) {
  const tmFc = midTmFc(), keep = o => Object.fromEntries(Object.entries(o || {}).filter(([k]) => /^(rnSt|wf|taMin|taMax)\d+/.test(k)));
  const land = {};
  for (const [side, regId] of [['w', '11D10000'], ['e', '11D20000']]) {
    try { const it = list(await getJson('https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst', { pageNo: 1, numOfRows: 10, dataType: 'JSON', regId, tmFc }))[0]; if (it) land[side] = keep(it); }
    catch (e) { console.warn(`중기 육상 ${side} 실패: ${e.message}`); if (/활용신청|NOT_REGISTERED/.test(e.message)) return null; }
  }
  const ta = {};
  for (const r of regions) {
    const regId = MID_TA[r.code]; if (!regId) continue;
    try { const it = list(await getJson('https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa', { pageNo: 1, numOfRows: 10, dataType: 'JSON', regId, tmFc }))[0]; if (it) ta[r.code] = keep(it); }
    catch (e) { console.warn(`중기 기온 ${r.name}(${regId}) 실패: ${e.message}`); }
    await sleep(200);
  }
  for (const r of regions) if (!ta[r.code]) {   // 못 받은 곳은 가까운 시·군 값
    const c = regions.filter(x => ta[x.code]).sort((x, y) => Math.hypot(x.lat - r.lat, x.lng - r.lng) - Math.hypot(y.lat - r.lat, y.lng - r.lng))[0];
    if (c) ta[r.code] = ta[c.code];
  }
  console.log(`중기예보 ${tmFc}: 육상 ${Object.keys(land).join(',') || '없음'}, 기온 ${Object.keys(ta).length}곳${land.w ? ' · 예: ' + JSON.stringify(land.w).slice(0, 120) : ''}`);
  return Object.keys(land).length ? { tmFc, land, ta } : null;
}

// ---------- 날씨 일기 (소은일보 '이달의 날씨'용) ----------
// 오늘(KST) 시간별 예보를 하루 요약으로 data/wx-YYYY-MM.json { 시군: { 일: [최저, 최고, 하늘(낮 6~18시 가장 많은 것 1맑음 3구름많음 4흐림), 비·눈 시간 수, 강수량mm, 적설cm, 요약한 시간 수] } }
// 그날 가장 많은 시간을 담은 예보(보통 새벽 첫 실행)로 남기고, 그 뒤엔 바꾸지 않아요 (하루 한 번만 파일이 바뀌게)
export async function diary(w, now = Date.now()) {
  const day = new Date(now + 9 * 3600e3).toISOString().slice(0, 10), ymd = day.replace(/-/g, ''), dd = day.slice(8);
  const file = dataFile(`wx-${day.slice(0, 7)}.json`);
  let cur = {}; try { cur = JSON.parse(await readFile(file, 'utf8')); } catch (e) {}
  let changed = 0;
  for (const [code, rows] of Object.entries((w && w.data) || {})) {
    const R = (rows || []).filter(r => String(r[0]).startsWith(ymd) && Number.isFinite(r[1])); if (R.length < 6) continue;
    const old = (cur[code] || {})[dd]; if (old && old[6] >= R.length) continue;
    const dayR = R.filter(r => { const h = +String(r[0]).slice(8, 10); return h >= 6 && h <= 18; }), cnt = {};
    (dayR.length ? dayR : R).forEach(r => { cnt[r[2]] = (cnt[r[2]] || 0) + 1; });
    const sky = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || 0, T = R.map(r => r[1]);
    (cur[code] = cur[code] || {})[dd] = [Math.min(...T), Math.max(...T), sky, R.filter(r => r[3] > 0).length, +R.reduce((a, r) => a + (r[7] || 0), 0).toFixed(1), +R.reduce((a, r) => a + (r[8] || 0), 0).toFixed(1), R.length];
    changed++;
  }
  if (changed) { await writeFile(file, JSON.stringify(cur) + '\n'); console.log(`날씨 일기 ${day}: ${changed}곳`); }
  return changed;
}
if (!process.env.TOWN_DIARY_TEST) {   // 시험할 때는 받기 없이 diary만
const regions = (JSON.parse(await readFile(dataFile('regions.json'), 'utf8')).regions || []).filter(r => r.lat && r.lng);
if (!regions.length) { console.error('data/regions.json에 시·군 좌표가 없어요'); process.exit(1); }
const w = await weather(regions), a = await air(regions), wn = await warnings(regions), al = await dustAlarm(regions), md = await mid(regions);
if (!Object.keys(w.data).length && !Object.keys(a.now).length) { console.error('날씨·미세먼지를 하나도 못 받았어요 (활용신청을 확인해 주세요)'); process.exit(1); }
try { await diary(w); } catch (e) { console.warn(`날씨 일기 실패: ${e.message}`); }

const out = dataFile('town.json');
let old = null; try { old = JSON.parse(await readFile(out, 'utf8')); } catch (e) {}
const body = { weather: Object.keys(w.data).length ? w : (old && old.weather) || w, air: Object.keys(a.now).length ? a : (old && old.air) || a, warn: wn, alarm: al || [], mid: md || (old && old.mid) || null };
if (old && JSON.stringify({ weather: old.weather, air: old.air, warn: old.warn, alarm: old.alarm, mid: old.mid }) === JSON.stringify(body)) { console.log('바뀐 게 없어요'); process.exit(0); }
const updated = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
await writeFile(out, JSON.stringify({ updated, ...body }) + '\n');
console.log(`town.json 저장 (${updated})`);
}
