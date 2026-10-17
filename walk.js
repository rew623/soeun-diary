// 탐문 기록 — 산책·나들이를 남겨요 (동네 탐문 탭: 빨간 '+ 탐문 기록', 탐험 지도 위 '🚶 탐문 출동')
// 저장: families/{fid}/walk/{id} — date, kind(walk·out·cafe·fam·hosp·shop·etc), title, place, geo("위도,경도"), start·end(HH:MM), dist(m),
//        path(경로), pics(같이 올린 사진 id 쉼표로), memo, who(엄마,아빠), wx(그날 날씨 한 줄), mood, by
// 경로(path): "1:<출발 epoch초>:<위도·경도(1e5)·초의 변화량을 polyline 방식 글자로>" (점은 줄여서 최대 800개, 한 번에 60000자까지)
// 실시간 탐문: 위치를 따라가며 길을 그리고, 앱에서 찍은 사진은 그때 위치를 붙여요. 화면이 꺼지면 폰이 위치를 안 줘요(그동안은 직선으로 이어요)
//   → 탐문 중엔 화면을 켜 두고(Wake Lock), 주머니에 넣을 땐 🌙 주머니 모드(까만 화면, 아래 동그라미를 2초 꾹 눌러 풀기 — 화면 아무 데나 누르면 안 풀림, 2026.10.15 사용자 요청 '너무 쉽게 풀려'). 진행 중 기록은 이 폰에(localStorage soeun-walk-live)
// 갤러리에서 고른 사진은 안드로이드가 위치를 지워서 넘겨줘도 찍은 시각(tm)은 남아요 → 그 시각에 경로 위 어디였는지 계산해 지도에 보여 줘요(저장은 안 함)
(function () {
const W = { tsel: new Set(), cur: '', cal: '', more: 5, form: null, files: [], pickMode: '', addFor: '', follow: true, boot: false };
const G = { cur: null, acc: null, err: '' };
let L = null;                     // 진행 중인 탐문 { t0, pts:[[위도,경도,초]], pics, pp:{사진id:[위도,경도]}, dist(m), paused, pausedMs, ended, by }
const LK = 'soeun-walk-live';
const KINDS = [['walk', '🚶', '산책'], ['out', '🎡', '나들이'], ['cafe', '☕', '카페·식당'], ['fam', '👵', '가족 방문'], ['hosp', '🏥', '병원'], ['shop', '🛒', '장보기'], ['etc', '✨', '기타']];
const MOODS = [['happy', '😆', '신났어요'], ['look', '👀', '두리번두리번'], ['sleep', '😴', '꿀잠'], ['calm', '😌', '평온'], ['cry', '😭', '울었어요']];
const kindOf = k => KINDS.find(x => x[0] === k) || KINDS[0];
const moodOf = k => MOODS.find(x => x[0] === k) || null;
const canWrite = () => !(S.me && S.me.viewer);
const $ = id => document.getElementById(id);
const parse = g => { const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(g || ''); return m ? { lat: +m[1], lng: +m[2] } : null; };
const fmtGeo = p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r, x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const p2 = n => String(n).padStart(2, '0');
const hm = t => { const d = new Date(t); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const hms = t => { const d = new Date(t); return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
const dayOf = t => { const d = new Date(t); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
// 날짜 + 'HH:MM(:SS)' → 이 폰 시간대의 시각(ms)
const at = (d, tm) => { if (!d || !/^\d\d:\d\d/.test(tm || '')) return null; const [y, mo, dd] = d.split('-').map(Number), [h, mi, s] = tm.split(':').map(Number); return new Date(y, mo - 1, dd, h, mi, s || 0).getTime(); };
const wd = d => '일월화수목금토'[new Date(pd(d)).getUTCDay()];
const durText = m => m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`;
const kmText = m => m >= 10000 ? `${Math.round(m / 1000)}km` : m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
const clock = ms => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600); return `${h ? h + ':' : ''}${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}`; };

// ---------- 경로 글자로 줄이기 (polyline 방식: 변화량을 5비트씩 글자 63~126으로) ----------
function enc(nums) {
  let out = '';
  for (let v of nums) { v = v < 0 ? ~(v << 1) : v << 1; while (v >= 0x20) { out += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } out += String.fromCharCode(v + 63); }
  return out;
}
function dec(s) {
  const out = []; let i = 0;
  while (i < s.length) { let r = 0, sh = 0, b; do { b = s.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20 && i < s.length); out.push(r & 1 ? ~(r >> 1) : r >> 1); }
  return out;
}
function pack(pts, t0, v) {
  const nums = []; let a = 0, b = 0, c = 0;
  pts.forEach(p => { const la = Math.round(p.lat * 1e5), lo = Math.round(p.lng * 1e5), t = Math.round(p.t); nums.push(la - a, lo - b, t - c); a = la; b = lo; c = t; });
  return `${v || 1}:${Math.round(t0 / 1000)}:${enc(nums)}`;   // 1: GPS로 그린 길, 2: 지도에 직접 찍은 곳을 이은 길
}
const TC = new Map();
// path는 쉼표로 여러 길을 간직해요: 첫째가 지금 쓰는 길, 나머지는 되돌리기용으로 간직한 길 (예: 핀 길로 바꾸기 전의 GPS 길 ',1:…')
// 지도에 찍은 핀 길: '2:'(쓰는 중) · '3:'(사진 자리 길로 바꿔서 간직만 하는 중 — ↩ 되돌리기)
const segs = p => String(p || '').split(','), mainOf = p => segs(p)[0], altsOf = p => segs(p).slice(1).filter(Boolean);
const joinP = (main, alts) => { const a = (alts || []).filter(Boolean); return a.length ? [main || ''].concat(a).join(',') : (main || ''); };
const pinsOf = path => { const m = mainOf(path); return /^[23]:/.test(m) ? ((trackRaw({ path: '2' + m.slice(1) }) || { pts: [] }).pts).map(p => ({ lat: p.lat, lng: p.lng })) : []; };
// 이 기록의 길: 저장된 길(GPS 1: · 직접 찍은 핀 2:) → 없으면 사진 자리(사진에 붙은 위치)를 찍은 시각 순서로 이은 길(저장 안 함, photo:true)
// 사진 핀을 옮기면 길도 저절로 따라 바뀌어요 (탐문 보고서·탐험 지도·카드·영상 모두 이 길을 써요)
const track = w => trackRaw(w) || (w && w.id ? photoTrack(w) : null);
let PT = { m: null, w: null, map: new Map() };
function photoTrack(w) {
  if (PT.m !== S.moments || PT.w !== S.walks) PT = { m: S.moments, w: S.walks, map: new Map() };
  if (PT.map.has(w.id)) return PT.map.get(w.id);
  const P = photos(w).map(m => ({ g: parse(m.geo), t: at(m.date, m.tm) })).filter(x => x.g && x.t != null).sort((a, b) => a.t - b.t), pts = [];
  P.forEach(x => { const z = pts[pts.length - 1]; if (z && km(z, x.g) * 1000 < 15) return; pts.push({ lat: x.g.lat, lng: x.g.lng, t: (x.t - P[0].t) / 1000 }); });
  const r = pts.length > 1 ? { t0: P[0].t, pts, photo: true } : null; PT.map.set(w.id, r); return r;
}
function trackRaw(w) {
  const s = w && w.path ? mainOf(w.path) : ''; if (!s || !/^[12]:/.test(s)) return null;
  if (TC.has(s)) return TC.get(s);
  const k = s.indexOf(':', 2), t0 = +s.slice(2, k) * 1000, n = dec(s.slice(k + 1)), pts = [];
  let la = 0, lo = 0, t = 0;
  for (let i = 0; i + 2 < n.length; i += 3) { la += n[i]; lo += n[i + 1]; t += n[i + 2]; pts.push({ lat: la / 1e5, lng: lo / 1e5, t }); }
  const r = isFinite(t0) && pts.length ? { t0, pts } : null; TC.set(s, r); return r;
}
// 점 줄이기 (더글라스-포이커, tol 미터). 800개가 넘으면 더 크게 줄여요
// 시간도 한 축(1초 = 1m)으로 같이 봐서, 한참 멈춰 있던 곳은 남겨요 (그래야 찍은 시각으로 찾는 사진 자리가 맞아요)
function simplify(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const kx = 111320 * Math.cos(pts[0].lat * Math.PI / 180), ky = 110540, P = pts.map(p => [p.lng * kx, p.lat * ky, p.t]);
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(), A = P[a], dx = P[b][0] - A[0], dy = P[b][1] - A[1], dz = P[b][2] - A[2], LL = dx * dx + dy * dy + dz * dz;
    let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) {
      const Q = P[i]; let t = LL ? ((Q[0] - A[0]) * dx + (Q[1] - A[1]) * dy + (Q[2] - A[2]) * dz) / LL : 0; t = Math.max(0, Math.min(1, t));
      const ex = A[0] + t * dx - Q[0], ey = A[1] + t * dy - Q[1], ez = A[2] + t * dz - Q[2], d = ex * ex + ey * ey + ez * ez;
      if (d > md) { md = d; mi = i; }
    }
    if (mi > 0 && md > tol * tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((p, i) => keep[i]);
}
function slim(pts) { let tol = 3, r = simplify(pts, tol); while (r.length > 800 && tol < 300) { tol *= 1.6; r = simplify(pts, tol); } return r; }
const pathM = pts => { let m = 0; for (let i = 1; i < pts.length; i++) m += km(pts[i - 1], pts[i]) * 1000; return m; };
// 경로 위 그 시각(출발 뒤 s초)의 자리
function interp(T, s) {
  const P = T.pts; if (s <= P[0].t) return { lat: P[0].lat, lng: P[0].lng };
  for (let i = 1; i < P.length; i++) if (P[i].t >= s) { const a = P[i - 1], b = P[i], k = b.t > a.t ? (s - a.t) / (b.t - a.t) : 0; return { lat: a.lat + (b.lat - a.lat) * k, lng: a.lng + (b.lng - a.lng) * k }; }
  const z = P[P.length - 1]; return { lat: z.lat, lng: z.lng };
}

// ---------- 기록 ----------
const all = () => (S.walks || []).slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (b.start || '').localeCompare(a.start || ''));
const byId = id => (S.walks || []).find(w => w.id === id) || null;
// 언제부터 언제까지 (경로가 있으면 경로 시각과 적은 시각 중 넓게)
function span(w) {
  const T = trackRaw(w); let a = at(w.date, w.start), b = at(w.date, w.end);
  if (T && T.pts.length > 1) { const ta = T.t0 + T.pts[0].t * 1000, tb = T.t0 + T.pts[T.pts.length - 1].t * 1000; a = a == null ? ta : Math.min(a, ta); b = b == null ? tb : Math.max(b, tb); }
  return a != null && b != null && b > a ? [a, b] : null;
}
const dur = w => { const s = span(w); return s ? Math.round((s[1] - s[0]) / 60000) : 0; };
const distM = w => { const d = +w.dist; if (d > 0) return d; const T = track(w); return T ? pathM(T.pts) : 0; };
const timeText = w => w.start ? `${w.start}${w.end ? '~' + w.end : ''}` : '';
// 이 기록의 사진: 같이 올린 사진(pics) + 그날 그 시간(앞뒤 5분)에 찍은 사진 − 뺀 사진(pics에 '-사진id'로 적어 둠: 고치기에서 ✕ · 보고서에서 '이 기록에서 빼기')
let PC = { m: null, w: null, map: new Map() };
function photos(w) {
  if (PC.m !== S.moments || PC.w !== S.walks) PC = { m: S.moments, w: S.walks, map: new Map() };
  let r = PC.map.get(w.id); if (r) return r;
  const L0 = String(w.pics || '').split(',').filter(Boolean), ids = new Set(L0.filter(x => x[0] !== '-')), no = new Set(L0.filter(x => x[0] === '-').map(x => x.slice(1))), sp = span(w);
  r = (S.moments || []).filter(m => { if (!m.photo || no.has(m.id)) return false; if (ids.has(m.id)) return true; if (!sp || m.date !== w.date) return false; const t = at(m.date, m.tm); return t != null && t >= sp[0] - 5 * 60e3 && t <= sp[1] + 5 * 60e3; })
    .sort((a, b) => (at(a.date, a.tm) || 0) - (at(b.date, b.tm) || 0) || (a.id < b.id ? -1 : 1));
  PC.map.set(w.id, r); return r;
}
// 사진의 자리: 사진에 저장된 위치 → 경로 위 찍은 시각의 자리 → 기록의 장소. '-'는 "위치 빼기"
function posOf(m, w) {
  const own = parse(m.geo); if (own) return Object.assign(own, { src: 'own' });
  if (m.geo === '-') return null;
  const T = track(w), t = at(m.date, m.tm);
  if (T && t != null) return Object.assign(interp(T, (t - T.t0) / 1000), { src: 'track' });
  const g = parse(w.geo); return g ? Object.assign(g, { src: 'place' }) : null;
}
// 탐험 지도용: 위치가 없는 사진 중 탐문 기록으로 자리를 찾은 것 { 사진id → {lat,lng,src} }
let PP = null;
function photoPos() {
  if (PP && PP.m === S.moments && PP.w === S.walks) return PP.map;
  const map = new Map();
  all().forEach(w => photos(w).forEach(m => { if (map.has(m.id) || parse(m.geo) || m.geo === '-') return; const p = posOf(m, w); if (p) map.set(m.id, p); }));
  PP = { m: S.moments, w: S.walks, map }; return map;
}
const routes = () => all().map(w => ({ w, T: track(w) })).filter(x => x.T && x.T.pts.length > 1);
// ---------- 단골 코스: 거의 같은 길을 여러 번 걸으면 한 코스로 묶어요 ----------
// 길을 약 45m 칸으로 나눠, 지나간 칸이 절반쯤 겹치면(자카드 0.45 이상) 같은 코스. 지도엔 코스마다 대표 길 하나만(많이 걸을수록 굵게)
const cellsOf = T => {
  const C = new Set(), P = T.pts, key = p => Math.round(p.lat / 0.0004) + ':' + Math.round(p.lng / 0.0005);
  for (let i = 0; i < P.length; i++) { C.add(key(P[i])); if (i) { const a = P[i - 1], b = P[i], n = Math.min(60, Math.floor(km(a, b) * 1000 / 20)); for (let k = 1; k < n; k++) C.add(key({ lat: a.lat + (b.lat - a.lat) * k / n, lng: a.lng + (b.lng - a.lng) * k / n })); } }
  return C;
};
let CC = null;
function courses(days) {
  const key = (days || 0) + '|' + (S.walks || []).map(w => w.id + (w.path || '').length).join(',');
  if (CC && CC.key === key && CC.m === S.moments) return CC.list;   // 사진 자리로 그린 길은 사진 핀을 옮기면 달라져요
  const from = days ? addDays(today(), -days) : '', list = [];
  routes().filter(x => x.w.date >= from).forEach(x => {   // 최근 것부터
    const c = cellsOf(x.T); let best = null, bj = 0;
    for (const g of list) { let inter = 0; c.forEach(k => { if (g.cells.has(k)) inter++; }); const j = inter / (c.size + g.cells.size - inter || 1); if (j > bj) { bj = j; best = g; } }
    if (best && bj >= .45) best.walks.push(x.w); else list.push({ rep: x.w, T: x.T, cells: c, walks: [x.w] });
  });
  list.forEach((g, i) => { g.i = i; g.n = g.walks.length; g.name = g.rep.title || (g.rep.place ? g.rep.place + ' 코스' : `코스 ${i + 1}`); g.m = Math.round(g.walks.reduce((t, w) => t + distM(w), 0) / g.n); g.min = Math.round(g.walks.reduce((t, w) => t + dur(w), 0) / g.n); g.first = g.walks[g.n - 1].date; g.last = g.walks[0].date; });
  list.sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1)); list.forEach((g, i) => { g.i = i; });
  CC = { key, list, m: S.moments }; return list;
}
function courseSheet(i, days) {
  const g = courses(days)[i]; if (!g) return;
  openSheet(`<h3>🐾 ${esc(g.name)}</h3>
    <div class="wksum">${routeSvg(g.T.pts, 72, 72)}<span><b>${g.n}번 걸었어요</b><small>평균 ${kmText(g.m)}${g.min ? ' · ' + durText(g.min) : ''} · 처음 ${fmtK(g.first, true)} · 마지막 ${fmtK(g.last, true)}</small></span></div>
    <p class="foot" style="margin:0 0 8px">거의 같은 길로 걸은 탐문을 한 코스로 묶었어요. 지도엔 코스마다 길 하나만 그리고, 많이 걸을수록 굵게 보여요.</p>
    <div class="wklist">${g.walks.map(rowHtml).join('')}</div>
    <div class="actions"><button class="secondary" data-act="close">닫기</button><button class="primary" data-xp="course" data-v="${i}">지도에서 이 코스만</button></div>`);
}

// ---------- 통계·배지 ----------
const monday = d => addDays(d, -((new Date(pd(d)).getUTCDay() + 6) % 7));
function stats() {
  const A = S.walks || [], t = today(), ym = t.slice(0, 7), days = [...new Set(A.map(w => w.date))].sort();
  let best = 0, run = 0, prev = '';
  days.forEach(d => { run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  let cur = 0, d = days.includes(t) ? t : addDays(t, -1); while (days.includes(d)) { cur++; d = addDays(d, -1); }
  const wk = {}; A.forEach(w => { const k = monday(w.date); wk[k] = (wk[k] || 0) + 1; });
  const m = A.reduce((s, w) => s + distM(w), 0);
  return { n: A.length, week: A.filter(w => w.date >= monday(t)).length, month: A.filter(w => w.date.slice(0, 7) === ym).length, m, km: m / 1000, min: A.reduce((s, w) => s + dur(w), 0), best, cur,
    am: A.some(w => /^0[0-8]:/.test(w.start || '')), pm: A.some(w => (w.start || '') >= '18:00'), hr: A.some(w => dur(w) >= 60), ph10: A.some(w => photos(w).length >= 10),
    both: A.some(w => /엄마/.test(w.who || '') && /아빠/.test(w.who || '')), wk5: Object.values(wk).some(v => v >= 5), far: A.some(w => distM(w) >= 3000) };
}
const WB = [
  ['w1', '🐾', '첫 탐문', '산책·나들이 첫 기록', s => s.n >= 1],
  ['w10', '🥾', '탐문 10회', '기록 10번', s => s.n >= 10],
  ['w50', '🏅', '탐문 50회', '기록 50번', s => s.n >= 50],
  ['k3', '🛣️', '3km 원정', '한 번에 3km 넘게', s => s.far],
  ['k10', '📏', '누적 10km', '걸은 거리 합 10km', s => s.km >= 10],
  ['k50', '🗾', '누적 50km', '걸은 거리 합 50km', s => s.km >= 50],
  ['am', '🌅', '아침 탐문', '오전 9시 전에 출발', s => s.am],
  ['pm', '🌙', '저녁 탐문', '오후 6시 넘어 출발', s => s.pm],
  ['hr', '⏳', '1시간 탐문', '한 번에 60분 넘게', s => s.hr],
  ['ph', '📸', '현장 사진 10장', '한 번에 사진 10장', s => s.ph10],
  ['fam', '👨‍👩‍👧', '가족 총출동', '엄마·아빠 같이 출동', s => s.both],
  ['st3', '🔥', '3일 연속 탐문', '사흘 내리 산책', s => s.best >= 3],
  ['wk5', '🗓️', '한 주 5번', '한 주에 탐문 5번', s => s.wk5]
];

// ---------- 그림: 작은 경로 그림 (SVG) ----------
function routeSvg(pts, w, h, cls) {
  const kx = Math.cos(pts[0].lat * Math.PI / 180), xs = pts.map(p => p.lng * kx), ys = pts.map(p => -p.lat);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = Math.max(6, w * .08);
  const s = Math.min((w - pad * 2) / Math.max(1e-9, x1 - x0), (h - pad * 2) / Math.max(1e-9, y1 - y0)), ox = (w - (x1 - x0) * s) / 2, oy = (h - (y1 - y0) * s) / 2;
  const P = pts.map((p, i) => [ox + (xs[i] - x0) * s, oy + (ys[i] - y0) * s]), d = P.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
  const a = P[0], b = P[P.length - 1], r = Math.max(3.5, w / 18);
  return `<svg class="${cls || ''}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="#fff" stroke-width="${(r * 1.5).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#B3261E" stroke-width="${(r * .75).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="${r.toFixed(1)}" fill="#2E7D5B" stroke="#fff" stroke-width="1.5"/><circle cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="${r.toFixed(1)}" fill="#1F2A44" stroke="#fff" stroke-width="1.5"/></svg>`;
}

// ---------- 동네 탐문 탭 (탐험 지도 위·아래에 끼워요) ----------
function elapsed() { if (!L) return 0; const e = L.ended || Date.now(); return Math.max(0, e - L.t0 - (L.pausedMs || 0) - (L.paused ? e - L.paused : 0)); }
function heroHtml() {
  const n = window.TOWN && TOWN.now ? TOWN.now() : null; if (n && window.GAME) GAME.mark('town');   // 오늘의 지령 '산책 지수 보기'
  const cls = n ? (n.s >= 80 ? 'ok' : n.s >= 60 ? 'ok2' : n.s >= 40 ? 'mid' : 'no') : '';
  const lab = n ? (n.s >= 80 ? '딱 좋아요' : n.s >= 60 ? '좋아요' : n.s >= 40 ? '짧게만' : '집에서 수사') : '불러오는 중…';
  const idx = `<button class="wkidx ${cls}" data-act="townv" data-v="info"><b${n && String(n.s).length > 2 ? ' class="w3"' : ''}>${n ? n.s : '-'}</b><span><em>지금 산책 지수</em><small>${n ? `${n.ico} ${n.tmp}° · ${esc(lab)}` : lab}</small><u>날씨 자세히 ›</u></span></button>`;
  let go = '';
  if (canWrite()) go = L && !L.ended ? `<button class="wkgo live" data-wk="live"><i>🐾</i><span>탐문 중 <b class="wk-lt">${clock(elapsed())}</b><small class="wk-ld">${kmText(L.dist)} · 눌러서 보기</small></span></button>`
    : L && L.ended ? `<button class="wkgo live" data-wk="saveLive"><i>📝</i><span>탐문 결과 저장<small>끝낸 산책을 아직 저장 안 했어요</small></span></button>`
    : `<button class="wkgo" data-wk="start"><i>🚶</i><span>탐문 출동<small>걸은 길 그리기 시작</small></span></button>`;
  return `<div class="wkhero">${idx}${go}</div>`;
}
function rowHtml(w) {
  const k = kindOf(w.kind), T = track(w), P = photos(w), ph = P.map(m => safeImg(PHOTOS[m.id])).find(Boolean), mo = moodOf(w.mood), m = distM(w), mins = dur(w);
  // 사진이 있으면 사진(+ 구석에 작은 길 그림), 사진 없이 길만 있으면 지도 같은 바탕 위에 길 (사용자 요청: 길만 달랑 있으면 이상해)
  const hasT = T && T.pts.length > 1;
  const art = ph ? `<span class="wkart"><img src="${ph}" alt="" loading="lazy" decoding="async">${hasT ? `<i class="wkartr">${routeSvg(T.pts, 26, 26)}</i>` : ''}${P.length > 1 ? `<b class="wkartn">📷${P.length}</b>` : ''}</span>`
    : hasT ? `<span class="wkart wkmapart">${routeSvg(T.pts, 60, 60)}<b class="wkartk">${k[1]}</b></span>` : `<span class="wkart wkemo">${k[1]}</span>`;
  const bits = [timeText(w), m ? kmText(m) : '', mins && !w.end ? durText(mins) : '', P.length ? `사진 ${P.length}` : ''].filter(Boolean).join(' · ');
  const name = w.title || (w.place ? `${w.place} ${k[2]}` : k[2]);
  return `<button class="wkrow" data-wk="open" data-v="${esc(w.id)}">${art}<span class="wkrt"><b>${k[1]} ${esc(name)}</b><small>${fmtK(w.date, true)} (${wd(w.date)})${bits ? ' · ' + esc(bits) : ''}</small>${w.place && w.title ? `<small>📍 ${esc(w.place)}</small>` : ''}</span>${mo ? `<em title="${mo[2]}">${mo[1]}</em>` : '<em>›</em>'}</button>`;
}
function calHtml() {
  const A = S.walks || []; if (!A.length) return '';
  const t = today(), ym = W.cal || t.slice(0, 7), [y, mo] = ym.split('-').map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay(), n = new Date(Date.UTC(y, mo, 0)).getUTCDate(), by = {};
  A.forEach(w => { if (w.date.slice(0, 7) === ym) (by[w.date] = by[w.date] || []).push(w); });
  const cells = []; for (let i = 0; i < first; i++) cells.push('<span></span>');
  for (let d = 1; d <= n; d++) {
    const ds = `${ym}-${p2(d)}`, X = by[ds], c = `${ds === t ? ' td' : ''}${ds > t ? ' fu' : ''}`;
    cells.push(X ? `<button class="wkd on${c}" data-wk="day" data-v="${ds}"><b>${d}</b><i>${X.length > 1 ? '🐾' + X.length : '🐾'}</i></button>` : `<span class="wkd${c}"><b>${d}</b></span>`);
  }
  const cnt = Object.values(by).reduce((s, a) => s + a.length, 0), m = Object.values(by).flat().reduce((s, w) => s + distM(w), 0);
  const prevOk = ym > S.profile.birth.slice(0, 7), nextOk = ym < t.slice(0, 7);
  return `<section class="wkcal"><h2 class="sh"><span>탐문 달력</span><span>${mo}월 ${cnt}번${m ? ' · ' + kmText(m) : ''}</span></h2>
    <div class="wkch"><button data-wk="cal" data-v="-1" ${prevOk ? '' : 'disabled'} aria-label="이전 달">‹</button><b>${y}년 ${mo}월</b><button data-wk="cal" data-v="1" ${nextOk ? '' : 'disabled'} aria-label="다음 달">›</button></div>
    <div class="wkcg">${'일월화수목금토'.split('').map(c => `<em>${c}</em>`).join('')}${cells.join('')}</div></section>`;
}
function sectionHtml() {
  const A = all(), st = stats(), got = WB.map(b => ({ b, on: !!b[4](st) }));
  return `<section class="wksec"><h2 class="sh"><span>🐾 탐문 일지</span><span>${A.length ? `${A.length}번 · ${kmText(st.m)}` : '첫 기록 전'}</span></h2>
    ${A.length ? `<div class="wkstat">${[['이번 주', st.week + '번'], ['이번 달', st.month + '번'], ['걸은 거리', kmText(st.m)], ['연속', st.cur + '일']].map(([a, b]) => `<span><small>${a}</small><b>${b}</b></span>`).join('')}</div>
      <div class="wklist">${A.slice(0, W.more).map(rowHtml).join('')}</div>
      ${A.length > W.more ? `<button class="addperiod" data-wk="more">더 보기 (${A.length - W.more}개)</button>` : ''}`
    : `<div class="wkempty">${CHARS.svg('baby', 'lens', { size: 76 })}<p>산책·나들이를 남기면 여기에 쌓여요.<br><b>🚶 탐문 출동</b>을 누르고 걸으면 길이 그려지고,<br>다녀온 곳은 오른쪽 아래 <b>+ 탐문 기록</b>으로 남겨요.</p></div>`}</section>
  ${calHtml()}
  <section${isFold('t-wbadge', true) ? ' class="folded"' : ''}><h2 class="sh" data-fold="t-wbadge"><span>탐문 배지</span><span>${got.filter(x => x.on).length}/${WB.length}</span></h2>
    <div class="exbadges">${got.map(({ b, on }) => `<span class="exbd${on ? ' on' : ''}"><i>${b[1]}</i><b>${b[2]}</b><small>${b[3]}</small></span>`).join('')}</div></section>`;
}

// ---------- 탐문 보고서 (S.view='walk') ----------
let dEl = null, dMap = null, dOv = [], dSig = '';
function render_() {
  const w = byId(W.cur), back = '<button class="secondary" data-wk="back" style="width:100%;margin-top:16px">돌아가기</button>';
  if (!w) return `<header class="vhead"><span class="no">탐문 보고서</span><h1>기록이 없어요</h1></header><p class="vempty">지워졌거나 아직 받지 못한 기록이에요.</p>${back}`;
  const k = kindOf(w.kind), T = track(w), P = photos(w), mins = dur(w), m = distM(w), mo = moodOf(w.mood);
  const cw = canWrite(), pos = P.map(x => ({ x, p: posOf(x, w) })), hasMap = (T && T.pts.length) || parse(w.geo) || pos.some(o => o.p) || (cw && P.length);
  const no = all().reverse().findIndex(x => x.id === w.id) + 1, nTrack = pos.filter(o => o.p && o.p.src === 'track').length;
  const spd = m && mins && w.kind === 'walk' ? ` · 평균 ${(m / 1000 / (mins / 60)).toFixed(1)}km/h` : '';
  [...W.tsel].forEach(id => { if (!P.some(x => x.id === id)) W.tsel.delete(id); });
  // 사진마다: 동그라미(고르기) · 번호(지도 핀 번호) · 사진(크게 보기) · 글(지도에서 보기) · 📍(지도에서 핀 자리 다시 정하기, 고른 게 있으면 같이)
  const tl = pos.map(({ x, p }, i) => {
    const t = at(x.date, x.tm), rel = T && t != null ? Math.round((t - T.t0) / 60000) : null, u = safeImg(PHOTOS[x.id]), on = W.tsel.has(x.id);
    const where = p ? (p.src === 'track' ? '경로에서 찾은 자리' : p.src === 'place' ? '장소 위치' : '찍은 곳') : x.geo === '-' ? '핀 뺌' : '위치 없음';
    return `<div class="wktl${on ? ' on' : ''}">${cw ? `<button class="wktck${on ? ' on' : ''}" data-wk="tsel" data-v="${esc(x.id)}" aria-pressed="${on}" aria-label="${i + 1}번 사진 고르기"><i>✓</i></button>` : ''}<span class="wktn${p ? '' : ' off'}">${i + 1}</span><button class="wktph" data-view="${esc(x.id)}">${u ? `<img src="${u}" alt="" loading="lazy" decoding="async">` : '<span>사진</span>'}</button><span class="wktx"${p ? ` data-wk="pan" data-v="${esc(x.id)}"` : ''}><b>${x.tm ? x.tm.slice(0, 5) : fmtMD(x.date)}${p ? ' <u>지도 ›</u>' : ''}</b><small>${rel != null && rel >= 0 ? `출발 ${durText(rel)} 뒤 · ` : ''}${where}</small></span>${cw ? `<button class="wktpan" data-wk="pinmv" data-v="${esc(x.id)}" aria-label="${i + 1}번 사진 핀 자리 정하기">📍</button>` : ''}</div>`;
  }).join('');
  const selBar = cw && P.length ? `<div class="wksel"${W.tsel.size ? '' : ' hidden'}><b>${W.tsel.size}장 골랐어요</b><button data-wk="tpin">📍 옮기기</button><button data-wk="talb" data-v="free">📸 사건앨범에</button><button data-wk="talb" data-v="fam">👨‍👩‍👧 가족앨범에</button><button data-wk="tout" class="out">이 기록에서 빼기</button><button data-wk="tnone" aria-label="고르기 풀기">✕</button></div>` : '';
  return `<header class="vhead"><span class="no">탐문 보고서 No.${no}</span><h1>${k[1]} ${esc(w.title || (w.place ? `${w.place} ${k[2]}` : k[2]))}</h1><p>${fmtK(w.date)}${timeText(w) ? ' · ' + timeText(w) : ''}${w.place ? ` · 📍 ${esc(w.place)}` : ''}</p></header>
  ${hasMap ? `<div class="wkmapwrap" data-noswipe><div id="wkmap-slot"></div><div class="mtools"><button data-wk="mloc" aria-label="내 위치">◎</button><button data-wk="mfull" aria-label="크게 보기">⛶</button></div></div>` : ''}
  <div class="wkdst"><span><i>🚶</i><b>${m ? kmText(m) : '-'}</b><small>거리</small></span><span><i>⏱️</i><b>${mins ? durText(mins) : '-'}</b><small>시간</small></span><span><i>📷</i><b>${P.length}장</b><small>사진</small></span><span><i>${mo ? mo[1] : '🙂'}</i><b>${mo ? mo[2] : '-'}</b><small>${esc(CV.nick())} 반응</small></span></div>
  ${spd || w.wx || w.who ? `<p class="wkwx">${[w.wx ? esc(w.wx) : '', w.who ? '🕵️ ' + esc(w.who.split(',').map(r => r + ' 수사관').join('·')) : '', spd ? spd.slice(3) : ''].filter(Boolean).join(' · ')}</p>` : ''}
  ${w.memo ? `<div class="wkmemo"><b>수사 메모</b><p>${esc(w.memo).replace(/\n/g, '<br>')}</p></div>` : ''}
  ${routeNote(w, T, cw)}
  <section class="wktls" data-vpin="walk"><h2 class="sh"><span>현장 사진</span><span>${P.length}장${cw && P.length > 1 ? ` <button class="wkall" data-wk="tall">${W.tsel.size === P.length ? '모두 풀기' : '모두 고르기'}</button>` : ''}</span></h2>
    ${P.length ? `<p class="foot" style="margin:0 0 8px">${nTrack ? `사진 ${nTrack}장은 찍은 시각으로 경로 위 자리를 찾았어요. ` : ''}${cw ? '📍를 누르고 위 지도에서 새 자리를 누르면 핀이 옮겨져요. 동그라미로 여러 장 골라 한 번에 옮길 수도 있어요.' : ''}</p><div class="wktlist">${tl}</div>${selBar}` : `<p class="vempty">${cw ? '아래 \'📷 사진 더하기\'로 그날 사진을 붙여요. 산책 시간에 찍은 사진은 저절로 붙어요.' : '사진이 없어요.'}</p>`}</section>
  <div class="wkacts">${canWrite() ? `<button class="ghost" data-wk="edit" data-v="${esc(w.id)}">✏️ 고치기</button><button class="ghost" data-wk="addph" data-v="${esc(w.id)}">📷 사진 더하기</button>` : ''}<button class="ghost" data-wk="card" data-v="${esc(w.id)}">🖼️ 보고서 카드</button>${canWrite() ? `<button class="ghost wkdel" data-wk="del" data-v="${esc(w.id)}">🗑️ 지우기</button>` : ''}</div>
  ${back}`;
}
// 길이 어디서 왔는지 한 줄 (GPS·직접 찍은 핀·사진 자리) + 사진 자리로 길 바꾸기
function routeNote(w, T, cw) {
  const raw = trackRaw(w), pt = photoTrack(w), main = mainOf(w.path), gpsAlt = altsOf(w.path).find(x => /^1:/.test(x));
  const btns = [cw && pt && /^2:/.test(main) ? '<button data-wk="rphoto">📷 사진 자리로 길 바꾸기</button>' : '',
    cw && /^3:/.test(main) ? '<button data-wk="rpins">↩ 지도에 찍은 핀 길로 되돌리기</button>' : '',
    cw && gpsAlt ? '<button data-wk="rgps">↩ GPS로 걸은 길로 되돌리기</button>' : ''].filter(Boolean).join(' ');
  let msg;
  if (T && T.photo) msg = `🐾 길: 사진 찍은 자리를 시간 순서로 이었어요 (사진 ${T.pts.length}곳). 사진 핀을 옮기면 길도 같이 바뀌어요.`;
  else if (/^3:/.test(main)) msg = '🐾 사진 자리로 길을 그리려면 위치 있는 사진이 두 곳 넘게 있어야 해요.';
  else if (raw && /^2:/.test(main)) msg = `🐾 길: 지도에 찍은 곳 ${raw.pts.length}곳을 차례로 이었어요.`;
  else if (raw) msg = '🐾 길: 탐문 출동 때 GPS로 그린 길이에요.';
  else if (btns) msg = '🐾 지금은 길이 없어요.';
  else if (cw && photos(w).length) msg = '🐾 위치 있는 사진이 두 곳 넘게 있으면 찍은 순서대로 길을 그려요. 📍로 사진 자리를 정하거나, ✏️ 고치기에서 지도에 여러 곳을 찍어도 돼요.';
  else return '';
  return `<p class="wkrn">${msg}${btns ? ' ' + btns : ''}</p>`;
}
function mount() {
  const slot = $('wkmap-slot'); if (!slot) return;
  if (!dEl) { dEl = document.createElement('div'); dEl.className = 'wkmap'; }
  if (!dEl.closest('.mapfull')) slot.appendChild(dEl);
  if (dMap) { dMap.relayout(); drawDetail(); return; }   // 같은 기록이면 다시 안 그려요 (보던 지도 위치 그대로)
  if (!window.HOSP || !HOSP.sdk) return fallback(slot);
  HOSP.sdk().then(() => {
    if (dMap) return;
    const w = byId(W.cur), T = w && track(w), hp = window.EXPLORE && EXPLORE.places().find(p => p.home), c = (T && T.pts[0]) || (w && parse(w.geo)) || (hp && hp.c) || { lat: 37.3422, lng: 127.9202 };
    dMap = new kakao.maps.Map(dEl, { center: new kakao.maps.LatLng(c.lat, c.lng), level: 5 });
    EXPLORE.onTap(dEl, dMap, ll => EXPLORE.pinTap(dMap, ll));   // 📍 핀 자리 정하기 중이면 누른 곳으로
    dSig = ''; drawDetail();
  }).catch(() => fallback($('wkmap-slot')));
}
function fallback(slot) { const w = byId(W.cur), T = w && track(w); if (slot && T && T.pts.length > 1) slot.innerHTML = `<div class="wkmapfb">${routeSvg(T.pts, 320, 240)}<small>지도를 못 불러와서 길 모양만 그렸어요</small></div>`; }
function drawDetail() {
  if (!dMap || S.view !== 'walk') return;
  const w = byId(W.cur); if (!w) return;
  const P = photos(w), sig = `${w.id}|${(w.path || '').length}|${w.geo}|${P.map(m => m.id + (safeImg(PHOTOS[m.id]) ? 1 : 0) + (m.geo || '')).join(',')}`;
  if (sig === dSig) return; dSig = sig;
  dOv.forEach(o => o.setMap(null)); dOv = [];
  const T = track(w), B = new kakao.maps.LatLngBounds(), lls = [], add = ll => { B.extend(ll); lls.push(ll); };
  if (T && T.pts.length > 1) {
    const path = T.pts.map(p => new kakao.maps.LatLng(p.lat, p.lng));
    dOv.push(new kakao.maps.Polyline({ map: dMap, path, strokeWeight: 9, strokeColor: '#FFFFFF', strokeOpacity: .9 }), new kakao.maps.Polyline({ map: dMap, path, strokeWeight: 5, strokeColor: '#B3261E', strokeOpacity: .95 }));
    path.forEach(add);
    [[path[0], '출발', 's'], [path[path.length - 1], '도착', 'e']].forEach(([ll, t, c]) => { const el = document.createElement('span'); el.className = 'exnum ' + c; el.textContent = t; dOv.push(new kakao.maps.CustomOverlay({ map: dMap, position: ll, content: el, yAnchor: .5, zIndex: 4 })); });
  } else if (parse(w.geo)) {
    const g = parse(w.geo), ll = new kakao.maps.LatLng(g.lat, g.lng), el = document.createElement('span'); el.className = 'wkplace'; el.textContent = kindOf(w.kind)[1];
    dOv.push(new kakao.maps.CustomOverlay({ map: dMap, position: ll, content: el, yAnchor: 1, zIndex: 4 })); add(ll);
  }
  P.forEach((m, i) => {
    const p = posOf(m, w); if (!p) return;
    const ll = new kakao.maps.LatLng(p.lat, p.lng), u = safeImg(PHOTOS[m.id]), el = document.createElement('button');
    el.type = 'button'; el.className = 'wkpin'; el.setAttribute('aria-label', `사진 ${i + 1}`);
    el.innerHTML = `${u ? `<img src="${u}" alt="">` : '<span>📷</span>'}<b>${i + 1}</b>`;
    el.addEventListener('click', ev => { ev.stopPropagation(); if (EXPLORE.pinTap(dMap, ll)) return; const t = document.querySelector(`.wktph[data-view="${CSS.escape(m.id)}"]`); if (t) t.click(); });   // 핀 자리 정하는 중이면 이 핀 자리로 모아요
    dOv.push(new kakao.maps.CustomOverlay({ map: dMap, position: ll, content: el, yAnchor: 1.15, clickable: true, zIndex: 6 })); add(ll);
  });
  if (lls.length === 1) { dMap.setCenter(lls[0]); dMap.setLevel(4); } else if (lls.length) dMap.setBounds(B, 40, 30, 30, 30);
}
function pan(id) {
  const w = byId(W.cur), m = w && photos(w).find(x => x.id === id), p = m && posOf(m, w); if (!p || !dMap) return;
  dMap.setLevel(3); dMap.panTo(new kakao.maps.LatLng(p.lat, p.lng));
  const box = document.querySelector('.wkmapwrap'); if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function open(id) { closeSheet(); if (W.cur !== id) W.tsel.clear(); W.cur = id; dSig = ''; S.view = 'walk'; render(); window.scrollTo(0, 0); }
// 사진 핀 자리 다시 정하기: 위 지도에서 누른 곳으로 (고른 사진들 같이). 직접 꽂은 사진이 있으면 '↩ 경로 자리로'(찍은 시각으로 찾은 자리) 단추도
function pinPhoto(ids) {
  const w = byId(W.cur); if (!w || !canWrite()) return;
  ids = [...new Set(ids)].filter(id => S.moments.some(m => m.id === id)); if (!ids.length) return;
  if (!dMap || !dEl || !dEl.isConnected) { if (window.EXPLORE) EXPLORE.pinPick(ids); return; }
  const T = track(w), own = ids.some(id => { const m = S.moments.find(x => x.id === id); return m && m.geo; });
  EXPLORE.pinMode(ids, dMap, dEl, () => { W.tsel.clear(); selSync(); }, own && (T || parse(w.geo)) ? { auto: T && T.pts.length > 1 ? '경로 자리로' : '장소 자리로' } : null);
}
function selSync() {
  const n = W.tsel.size;
  document.querySelectorAll('.wktck').forEach(b => { const on = W.tsel.has(b.dataset.v); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.closest('.wktl').classList.toggle('on', on); });
  const bar = document.querySelector('.wksel'); if (bar) { bar.hidden = !n; bar.querySelector('b').textContent = `${n}장 골랐어요`; }
  const al = document.querySelector('.wkall'); if (al) al.textContent = n && n === document.querySelectorAll('.wktck').length ? '모두 풀기' : '모두 고르기';
}

// ---------- 기록 쓰기 (빨간 단추) ----------
function openAdd() {
  if (!canWrite()) { toast('보기 전용이라 기록은 엄마·아빠 수사관만 남겨요'); return; }
  if (L && !L.ended) { openLive(); return; }
  openSheet(`<h3>무엇을 기록할까요?</h3>
    <div class="wkadd">
      <button class="wkbig go" data-wk="start"><i>🚶</i><b>지금 탐문 출동</b><small>산책하며 걸은 길을 그려요. 앱에서 찍은 사진은 그 자리에 꽂혀요</small></button>
      <button class="wkbig" data-wk="form"><i>📝</i><b>다녀온 곳 기록</b><small>산책·나들이·카페·병원… 장소·사진·메모를 남겨요</small></button>
    </div>
    ${L && L.ended ? '<button class="ghost" data-wk="saveLive" style="width:100%;margin-top:8px">📝 끝낸 탐문 저장하기</button>' : ''}
    <div class="actions"><button class="secondary" data-act="close">닫기</button></div>`);
}
const chip = (grp, v, on, label) => `<button type="button" class="chip${on ? ' on' : ''}" data-wf="${grp}" data-v="${v}">${label}</button>`;
function openForm(id, preset) {
  const w = id ? byId(id) : null; if (id && !w) return;
  const me = myRole(), p = preset || {};
  W.form = w ? { id: w.id, kind: w.kind || 'walk', title: w.title, date: w.date, start: w.start, end: w.end, place: w.place, geo: w.geo, memo: w.memo, mood: w.mood, who: new Set(String(w.who || '').split(',').filter(Boolean)), path: w.path, dist: w.dist, pics: [...new Set(photos(w).map(m => m.id).concat(String(w.pics || '').split(',').filter(x => x && x[0] !== '-')))], no: String(w.pics || '').split(',').filter(x => x[0] === '-').map(x => x.slice(1)), wx: w.wx, live: false, touched: true, gps: /^1:/.test(mainOf(w.path)), pins: /^[23]:/.test(mainOf(w.path)) ? pinsOf(w.path) : parse(w.geo) ? [parse(w.geo)] : [], photoRoute: /^3:/.test(mainOf(w.path)), alt: altsOf(w.path), pinsBak: (() => { const a = altsOf(w.path).find(x => /^[23]:/.test(x)); return a ? pinsOf(a) : null; })() }
    : { id: '', kind: p.kind || 'walk', title: p.title || '', date: p.date || today(), start: p.start || '', end: p.end || '', place: p.place || '', geo: p.geo || '', memo: '', mood: '', who: new Set(me ? [me] : []), path: p.path || '', dist: p.dist || '', pics: p.pics || [], wx: p.wx || '', live: !!p.live, touched: !!p.live, gps: !!p.path, pins: p.geo && !p.path ? [parse(p.geo)] : [] };
  W.files.forEach(f => { try { URL.revokeObjectURL(f.url); } catch (e) {} }); W.files = [];
  // 출발지: 새 기록(직접 쓰는 것)이면 기본 출발지를 미리 넣어 둬요. 저장하면 출발지 → 찍은 곳들을 이어 길로 (예전 기록·GPS 기록엔 없음)
  W.stMode = false; W.form.st = null; W.form.en = null;   // en: 도착지 ('st' = 출발지로 돌아와요, 점 = 다른 곳, null = 마지막 다녀온 곳에서 끝)
  if (!W.form.live && !W.form.gps) {
    if (!w) { W.form.st = home(); W.form.en = W.form.st ? 'st' : null; }   // 새 기록: 따로 안 정하면 출발지(본부)로 돌아와요 (사용자 요청)
    else {
      const h = home(), P0 = W.form.pins;
      if (h && P0.length > 1 && sameP(P0[0], h)) { W.form.st = Object.assign({}, P0[0], { n: h.n }); P0.shift(); W.form.geo = fmtGeo(P0[0]); }   // 예전 기록: 길의 첫 곳이 기본 출발지면 출발지로
      const z = P0[P0.length - 1];
      if (W.form.st && P0.length > 1 && sameP(z, W.form.st)) { W.form.en = 'st'; P0.pop(); }   // 마지막 곳이 출발지면 '출발지로 돌아와요'
    }
  }
  const f = W.form, T = f.path ? track({ path: f.path }) : null, n = CV.nick();
  const sum = f.live ? `<div class="wksum">${T && T.pts.length > 1 ? routeSvg(T.pts, 72, 72) : '<span class="wkemo">🐾</span>'}<span><b>${kmText(+f.dist || 0)} · ${durText(Math.max(1, p.mins || 0))}</b><small>${f.start}~${f.end} · 사진 ${f.pics.length}장${T && T.pts.length > 1 ? ' · 길을 그려 뒀어요' : ' · 길이 거의 안 그려졌어요'}</small></span></div>` : '';
  openSheet(`<h3>${w ? '탐문 기록 고치기' : f.live ? '탐문 결과 보고' : '탐문 기록'}</h3>${sum}
    <div class="field"><span>종류</span><div class="chips">${KINDS.map(k => chip('kind', k[0], f.kind === k[0], `${k[1]} ${k[2]}`)).join('')}</div></div>
    <label class="field"><span>제목 (선택)</span><input id="wf-title" maxlength="30" value="${esc(f.title || '')}" placeholder="예: 샘마루공원 한 바퀴"></label>
    <div class="wkf2"><label class="field"><span>날짜</span><input id="wf-date" type="date" value="${f.date}" min="${S.profile.birth}" max="${today()}"></label></div>
    <div class="wkf2"><label class="field"><span>출발</span><input id="wf-start" type="time" value="${esc((f.start || '').slice(0, 5))}"></label><label class="field"><span>도착</span><input id="wf-end" type="time" value="${esc((f.end || '').slice(0, 5))}"></label></div>
    ${f.gps ? '' : `<div class="field"><span>출발지</span><div id="wf-st">${stLine()}</div></div>`}
    <div class="field"><span>${f.gps ? '장소' : '다녀온 곳'}</span><input id="wf-place" maxlength="40" value="${esc(f.place || '')}" placeholder="예: 샘마루공원, 할머니 댁">
      <div class="wkplb"><button type="button" class="ghost" data-wf="here">📍 지금 위치</button><button type="button" class="ghost" data-wf="search">🔎 장소 찾기</button><button type="button" class="ghost" data-wf="map">🗺️ 지도에서</button></div>
      <div id="wf-geo">${geoLine()}</div><div id="wf-pick"></div></div>
    ${f.gps ? '' : `<div class="field"><span>도착지</span><div id="wf-en">${enLine()}</div></div>`}
    <div class="field"><span>사진</span><div id="wf-ph">${formPhotos()}</div>
      <button type="button" class="ghost" data-wf="photos" style="width:100%;min-height:46px">📷 사진 붙이기 <small>(현장 사진 · 갤러리 앱)</small></button></div>
    <label class="check" style="margin:-4px 0 12px"><input type="checkbox" id="wf-fill" checked> 위치 없는 사진엔 이 장소 위치를 붙여요</label>
    <div class="field"><span>${esc(n)} 반응</span><div class="chips">${MOODS.map(x => chip('mood', x[0], f.mood === x[0], `${x[1]} ${x[2]}`)).join('')}</div></div>
    <div class="field"><span>함께한 수사관</span><div class="chips">${['엄마', '아빠'].map(r => chip('who', r, f.who.has(r), r === '엄마' ? '👩 엄마' : '👨 아빠')).join('')}</div></div>
    <label class="field"><span>메모 (선택)</span><textarea id="wf-memo" maxlength="300" placeholder="예: 처음으로 강아지를 보고 한참 쳐다봤다">${esc(f.memo || '')}</textarea></label>
    <p class="err" id="wf-err"></p>
    <div class="actions">${w ? `<button class="danger" data-wk="del" data-v="${esc(w.id)}">삭제</button>` : f.live ? '<button class="danger" data-wf="discard">버리기</button>' : ''}<button class="secondary" data-wf="cancel">${f.live ? '나중에' : '취소'}</button><button class="primary" data-wf="save">저장</button></div>`);
}
function geoLine() {
  const f = W.form; if (!f) return '';
  if (!f.gps && f.pins.length > 1) return `<small class="wkgeo">📍 ${f.pins.length}곳 · ${f.st ? '🏠 출발지부터 ' : ''}찍은 순서대로 이어서 길로 그려요${enPt(f) ? ' · 🏁 도착지까지' : ''} (${kmText(pathM((f.st ? [f.st] : []).concat(f.pins, enPt(f) ? [enPt(f)] : [])))}) <button type="button" data-wf="ungeo">모두 빼기</button></small><div class="wkpins">${f.pins.map((p, i) => `<button type="button" data-wf="unpin" data-v="${i}" aria-label="${i + 1}번 핀 빼기"><b>${i + 1}</b>${esc(RG(p) || `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`)}<i>✕</i></button>`).join('')}</div>`;
  const g = parse(f.geo); if (!g) return '<small class="wkgeo none">위치를 붙이면 탐험 지도에 꽂혀요. 지도에서 여러 곳을 누르면 길로 이어져요</small>';
  const r = RG(g); return `<small class="wkgeo">📍 ${r ? esc(r) + ' · ' : ''}${g.lat.toFixed(4)}, ${g.lng.toFixed(4)} <button type="button" data-wf="ungeo">빼기</button></small>`;
}
const geoSync = () => { const b = $('wf-geo'); if (b) b.innerHTML = geoLine(); const s = $('wf-st'); if (s) s.innerHTML = stLine(); const e = $('wf-en'); if (e) e.innerHTML = enLine(); };
const enPt = f => f.en === 'st' ? f.st : f.en && f.en.lat != null ? f.en : null;
// 도착지: 기본은 출발지로 돌아와요. 다른 곳으로 바꾸거나 빼면(마지막 다녀온 곳에서 끝) 돼요
function enLine() {
  const f = W.form; if (!f) return ''; const nm = p => esc(p.n || RG(p) || `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`);
  if (W.stMode === 'en') return `<div class="wkst on">🏁 도착지를 어떻게 정할까요? <button type="button" data-wf="stcancel">그만</button><div class="wkstb"><button type="button" class="ghost" data-wf="here">📍 지금 위치</button><button type="button" class="ghost" data-wf="search">🔎 장소 찾기</button><button type="button" class="ghost" data-wf="map">🗺️ 지도에서</button></div><small class="wkstn">장소 찾기·지도는 위 '다녀온 곳' 칸 밑에 열려요</small></div>`;
  if (f.en === 'st' && f.st) return `<p class="wkst">🏁 <b>출발지로 돌아와요</b> <small>${nm(f.st)}</small> <button type="button" data-wf="enset">다른 곳으로</button><button type="button" data-wf="enx">빼기</button></p>`;
  const e = enPt(f);
  if (e) return `<p class="wkst">🏁 <b>${nm(e)}</b> <button type="button" data-wf="enset">바꾸기</button>${f.st ? '<button type="button" data-wf="enst">🏠 출발지로</button>' : ''}<button type="button" data-wf="enx">빼기</button></p>`;
  return `<p class="wkst">마지막 다녀온 곳에서 끝 ${f.st ? '<button type="button" data-wf="enst">🏠 출발지로 돌아오기</button>' : ''}<button type="button" data-wf="enset">도착지 정하기</button></p>`;
}
// ---------- 기본 출발지 (두 폰 같이: game/shared whome {g:'위도,경도', n:이름}) ----------
function home() { const s = window.GAME && GAME.store ? GAME.store.get() : {}, h = s.whome, g = h && parse(h.g); return g ? Object.assign(g, { n: String(h.n || '').slice(0, 30) }) : null; }
function setHome(p) {
  if (!window.GAME || !GAME.store) return; if (!canWrite()) { toast('보기 전용이라 바꿀 수 없어요'); return; }
  const s = GAME.store.get(); s.whome = p ? { g: fmtGeo(p), n: String(p.n || RG(p) || '').slice(0, 30) } : null; GAME.store.set(s);
  if (p && !s.whome.n) regionName(p).then(n => { const g = GAME.store.get(); if (n && g.whome && g.whome.g === fmtGeo(p) && !g.whome.n) { g.whome = { g: g.whome.g, n: n.split(' ').pop().slice(0, 30) }; GAME.store.set(g); render(); } });   // 이름이 없으면 동네 이름으로
}
const sameP = (a, b) => !!a && !!b && km(a, b) < .01;
function stLine() {
  const f = W.form; if (!f) return ''; const h = home(), st = f.st, nm = p => esc(p.n || RG(p) || `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`);
  if (W.stMode === 'st') return `<div class="wkst on">🏠 출발지를 어떻게 정할까요? <button type="button" data-wf="stcancel">그만</button><div class="wkstb"><button type="button" class="ghost" data-wf="here">📍 지금 위치</button><button type="button" class="ghost" data-wf="search">🔎 장소 찾기</button><button type="button" class="ghost" data-wf="map">🗺️ 지도에서</button></div><small class="wkstn">장소 찾기·지도는 아래 '다녀온 곳' 칸 밑에 열려요</small></div>`;
  if (!st) return `<p class="wkst">출발지 없음${h ? ` <button type="button" data-wf="sthome">🏠 본부(${nm(h)}) 넣기</button>` : ''} <button type="button" data-wf="stset">출발지 정하기</button></p>`;
  const isHome = sameP(st, h);
  return `<p class="wkst">🏠 <b>${nm(st)}</b>${isHome ? ' <small>본부</small>' : ''} <button type="button" data-wf="stset">바꾸기</button><button type="button" data-wf="stx">빼기</button>${isHome ? '' : `<button type="button" data-wf="sthomeset">⭐ 본부(기본 출발지)로</button>`}</p>`;
}
// 새 기록: 그날 그 시간(출발~도착, 앞뒤 5분)에 찍은 사진은 저절로 붙어요 → 폼에 미리 보여 주고 ✕로 뺄 수 있게 (저장하면 그대로 붙어요)
function autoIds() {
  const f = W.form; if (!f || f.id) return [];
  const sp = span({ date: f.date, start: f.start, end: f.end, path: f.gps ? f.path : '' }); if (!sp) return [];
  return (S.moments || []).filter(m => m.photo && m.date === f.date && !f.pics.includes(m.id) && !(f.no || []).includes(m.id) && (t => t != null && t >= sp[0] - 5 * 60e3 && t <= sp[1] + 5 * 60e3)(at(m.date, m.tm)))
    .sort((a, b) => (a.tm || '').localeCompare(b.tm || '')).map(m => m.id);
}
function formPhotos() {
  const f = W.form; if (!f) return '';
  const auto = new Set(autoIds()), old = f.pics.concat([...auto]).map(id => S.moments.find(m => m.id === id)).filter(Boolean).filter(m => safeImg(PHOTOS[m.id]));
  const cells = old.map(m => `<span class="wkfp${auto.has(m.id) ? ' auto' : ''}"><img src="${safeImg(PHOTOS[m.id])}" alt="">${auto.has(m.id) ? '<small>⏱ 자동</small>' : m.tm ? `<small>${m.tm.slice(0, 5)}</small>` : ''}<button type="button" data-wf="unpic" data-v="${esc(m.id)}" aria-label="빼기">✕</button></span>`)
    .concat(W.files.map((x, i) => `<span class="wkfp new"><img src="${x.url}" alt=""><small>${x.meta.tm ? x.meta.tm.slice(0, 5) : x.meta.date ? fmtMD(x.meta.date) : ''}${x.meta.geo ? ' 📍' : ''}</small><button type="button" data-wf="unfile" data-v="${i}" aria-label="빼기">✕</button></span>`));
  return cells.length ? `<div class="wkfps">${cells.join('')}</div>` : '';
}
// 지금 폼에 적힌 값 읽기
function grab() {
  const f = W.form, v = id => { const el = $(id); return el ? el.value.trim() : ''; };
  f.title = v('wf-title'); f.date = v('wf-date') || f.date; f.start = v('wf-start'); f.end = v('wf-end'); f.place = v('wf-place'); f.memo = v('wf-memo');
  return f;
}
async function saveForm(btn) {
  const f = grab(), er = $('wf-err');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date) || f.date > today() || f.date < S.profile.birth) { er.textContent = '날짜를 확인해 주세요'; return; }
  if (f.start && f.end && f.end < f.start.slice(0, 5) && !f.path) { er.textContent = '도착 시각이 출발보다 빨라요'; return; }
  btn.disabled = true;
  try {
    const id = f.id || 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    // 핀 여러 개 → 찍은 순서대로 이은 길(2:). 시간은 출발~도착을 거리 비율로 나눠 둬서, 찍은 시각이 있는 사진은 그 길 위에 놓여요
    if (!f.gps) {
      const PL = (f.st && f.pins.length && !sameP(f.st, f.pins[0]) ? [f.st] : []).concat(f.pins), E = f.pins.length ? enPt(f) : null;   // 출발지 → 찍은 곳들 → 도착지
      if (E && !sameP(E, PL[PL.length - 1])) PL.push({ lat: E.lat, lng: E.lng });
      if (PL.length > 1) {
        const a = at(f.date, f.start) || at(f.date, '12:00'), b = at(f.date, f.end), tot = b && b > a ? (b - a) / 1000 : (PL.length - 1) * 600, D = pathM(PL);
        let acc = 0; const pts = PL.map((p, i) => { if (i) acc += km(PL[i - 1], p) * 1000; return { lat: p.lat, lng: p.lng, t: D ? acc / D * tot : i * tot / (PL.length - 1) }; });
        f.path = pack(pts, a, 2); f.dist = String(Math.round(D));
        if (f.photoRoute) { f.path = '3' + f.path.slice(1); f.dist = ''; }   // 사진 자리 길을 쓰는 중이면 핀 길은 '3:'로 간직만 (↩ 되돌리기용)
      } else { f.path = ''; f.dist = ''; }
      f.path = joinP(f.path, (f.alt || []).filter(x => /^1:/.test(x)));   // 간직한 GPS 길은 그대로 (보고서 '↩ GPS 길로 되돌리기')
    }
    const pics = f.pics.concat(f.id ? [] : autoIds()), fill = $('wf-fill') && $('wf-fill').checked && parse(f.geo) && (f.gps || f.pins.length === 1) ? { geo: f.geo } : null;
    if (W.files.length) { const ids = await ALBUM.queue(W.files.map(x => x.file), undefined, fill); pics.push(...(ids || [])); }
    let wx = f.wx; if (!wx && f.date === today() && window.TOWN && TOWN.now) { const n = TOWN.now(); if (n) wx = `${n.ico} ${n.tmp}° · 산책 지수 ${n.s}`; }
    const o = { id, date: f.date, kind: f.kind, title: f.title, place: f.place, geo: f.geo || '', start: f.start, end: f.end, dist: f.dist ? String(Math.round(+f.dist)) : '', path: f.path || '', pics: [...new Set(pics)].concat([...new Set(f.no || [])].filter(x => !pics.includes(x)).map(x => '-' + x)).join(','), memo: f.memo, who: [...f.who].join(','), wx: wx || '', mood: f.mood || '', by: myRole() };
    const res = await write('saveItem', 'walk', o);
    if (!res) return;
    const wasLive = f.live; W.files = []; W.form = null; closeSheet();
    if (wasLive) { L = null; lclear(); syncPill(); }
    toast(f.id ? '탐문 기록을 고쳤어요' : '탐문 기록을 남겼어요 🐾');
    if (!f.id || S.view === 'walk') open(id); else render();
  } catch (e) { er.textContent = errMsg(e); }
  finally { btn.disabled = false; }
}
async function del(id) {
  const w = byId(id); if (!w) return;
  if (!(await ask('이 탐문 기록을 지울까요?\n사진은 사건 앨범에 그대로 남아요.', { ok: '지우기', danger: true }))) return;
  const res = await write('deleteItem', 'walk', id);
  if (!res) return;
  closeSheet(); toast('탐문 기록을 지웠어요');
  if (S.view === 'walk') goBack(); else render();
}
// 사진 고르기 (파일 칸은 body에)
const picker = document.createElement('input');
picker.type = 'file'; picker.accept = 'image/*,application/octet-stream'; picker.multiple = true; picker.hidden = true;
document.body.appendChild(picker);
picker.addEventListener('change', async () => {
  const files = [...picker.files].filter(f => /^image\//.test(f.type)); picker.value = '';
  if (!files.length) return;
  if (W.pickMode === 'add') return addPhotos(W.addFor, files);
  formFiles(files);
});
// 갤러리 공유로 받은 사진으로 바로 다녀온 곳 기록 (album.js 공유 창 '🐾 탐문 기록으로')
function formWith(files) { if (!canWrite()) return; openForm(''); formFiles(files.filter(f => /^image\//.test(f.type))); }
async function formFiles(files) {
  if (!W.form) return;
  for (const file of files) { let meta = { date: '', tm: '', geo: '' }; try { meta = await ALBUM.photoMeta(file); } catch (e) {} W.files.push({ file, meta, url: URL.createObjectURL(file) }); }
  if (window.__app) __app.sheetDirty();
  // 새 기록이면 사진 찍은 날짜·시각으로 날짜·시간을 채워요 (직접 고친 칸은 그대로)
  const f = W.form; if (!f.id && !f.live) {
    grab(); const ds = W.files.map(x => x.meta.date).filter(Boolean).sort(), tms = W.files.filter(x => x.meta.date === ds[0] && x.meta.tm).map(x => x.meta.tm.slice(0, 5)).sort();
    if (ds[0] && !f.touched) { f.date = ds[0]; const el = $('wf-date'); if (el) el.value = ds[0]; }
    if (tms.length && !f.start && ds[0] === f.date) { f.start = tms[0]; f.end = tms[tms.length - 1] > tms[0] ? tms[tms.length - 1] : ''; const a = $('wf-start'), b = $('wf-end'); if (a) a.value = f.start; if (b) b.value = f.end; }
    const g = W.files.map(x => parse(x.meta.geo)).find(Boolean); if (g && !parse(f.geo)) setGeo(g);
  }
  const box = $('wf-ph'); if (box) box.innerHTML = formPhotos();
}
async function addPhotos(id, files) {
  const w = byId(id); if (!w) return;
  const g = parse(w.geo), ids = await ALBUM.queue(files, undefined, g ? { geo: w.geo } : null);
  const add = new Set(ids || []), pics = [...new Set(String(w.pics || '').split(',').filter(x => x && !(x[0] === '-' && add.has(x.slice(1)))).concat(ids || []))].join(',');
  await write('saveItem', 'walk', Object.assign({}, w, { pics }));
  render();
}

// ---------- 장소: 지금 위치 / 장소 찾기 / 지도에서 ----------
const RGC = {}; const RG = g => RGC[g.lat.toFixed(3) + ',' + g.lng.toFixed(3)] || '';
function regionName(g) {
  const k = g.lat.toFixed(3) + ',' + g.lng.toFixed(3); if (RGC[k] != null) return Promise.resolve(RGC[k]);
  return (window.HOSP && HOSP.sdk ? HOSP.sdk() : Promise.reject()).then(() => new Promise(res => {
    if (!kakao.maps.services) return res('');
    new kakao.maps.services.Geocoder().coord2RegionCode(g.lng, g.lat, (r, st) => { const x = st === kakao.maps.services.Status.OK && r && (r.find(y => y.region_type === 'H') || r[0]); RGC[k] = x ? [x.region_2depth_name, x.region_3depth_name].filter(Boolean).join(' ') : ''; res(RGC[k]); });
  })).catch(() => '');
}
// 장소 핀: 지도·지금 위치·장소 찾기로 고를 때마다 하나씩 더해요 (GPS로 그린 길이 있는 기록은 장소 하나만). g=null이면 모두 빼기
function setGeo(g, name, replace) {
  const f = W.form; if (!f) return;
  if (W.stMode === 'en' && g) { W.stMode = false; f.en = Object.assign({ lat: g.lat, lng: g.lng }, name ? { n: name } : {}); if (!f.en.n) regionName(g).then(geoSync); drawPins(); geoSync(); if (window.__app) __app.sheetDirty(); return; }
  if (W.stMode && g) { W.stMode = false; f.st = Object.assign({ lat: g.lat, lng: g.lng }, name ? { n: name } : {}); if (!home() && canWrite()) { setHome(f.st); toast('🏠 출발지를 기본 출발지로도 저장했어요\n다음 기록부터 저절로 들어가요'); } if (!f.st.n) regionName(g).then(geoSync); drawPins(); geoSync(); if (window.__app) __app.sheetDirty(); return; }
  if (!g) f.pins = []; else if (f.gps || replace) f.pins = [g]; else if (!f.pins.some(q => km(q, g) < .005)) f.pins.push(g); else toast('바로 옆에 이미 핀이 있어요');
  f.geo = f.pins[0] ? fmtGeo(f.pins[0]) : ''; if (name) { const el = $('wf-place'); if (el && !el.value.trim()) el.value = name; }
  drawPins(); geoSync(); if (window.__app) __app.sheetDirty();
  if (g) regionName(g).then(geoSync);
}
const getPos = () => new Promise((res, rej) => { if (!navigator.geolocation) return rej(new Error('이 폰에서는 위치를 쓸 수 없어요')); navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => rej(new Error('위치를 가져오지 못했어요. 위치 권한을 확인해 주세요')), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }); });
function searchUi() {
  const box = $('wf-pick'); if (!box) return;
  box.innerHTML = `<div class="wksrch"><input id="wf-q" placeholder="장소 이름 (예: 한지테마파크)" enterkeyhint="search"><button type="button" class="primary" data-wf="go">찾기</button></div><div id="wf-res"></div>`;
  const q = $('wf-q'); q.focus(); q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
}
async function doSearch() {
  const q = ($('wf-q') || {}).value, out = $('wf-res'); if (!q || !q.trim() || !out) return;
  out.innerHTML = '<p class="hint">찾는 중…</p>';
  try {
    await HOSP.sdk(); if (!kakao.maps.services) throw new Error('장소 검색을 쓸 수 없어요');
    let c = G.cur; if (!c) { try { c = await getPos(); } catch (e) { c = (HOSP.regionCenter && HOSP.regionCenter((() => { try { return localStorage.getItem('soeun-hosp-region') || 'wonju'; } catch (x) { return 'wonju'; } })())) || null; } }
    const ps = new kakao.maps.services.Places(), opt = c ? { location: new kakao.maps.LatLng(c.lat, c.lng) } : {};
    const R = await new Promise(res => ps.keywordSearch(q.trim(), (d, st) => res(st === kakao.maps.services.Status.OK ? d : []), opt));
    W.res = R.slice(0, 8);
    out.innerHTML = W.res.length ? `<div class="wkres">${W.res.map((p, i) => `<button type="button" data-wf="pickres" data-v="${i}"><b>${esc(p.place_name)}</b><small>${esc(p.road_address_name || p.address_name || '')}${p.distance ? ' · ' + kmText(+p.distance) : ''}</small></button>`).join('')}</div>` : '<p class="hint">찾지 못했어요. 다른 이름으로 찾아보세요.</p>';
  } catch (e) { out.innerHTML = `<p class="hint">${esc(e.message || '찾지 못했어요')}</p>`; }
}
let fMap = null, fOv = [];
// 지도 고르기: 누르면 핀이 생기고, 핀을 누르면 빠져요. 두 곳 넘으면 순서대로 선으로 이어요
function drawPins() {
  if (!fMap || !$('wf-map')) return;
  fOv.forEach(o => o.setMap(null)); fOv = [];
  const f = W.form; if (!f) return;
  const T = f.gps && f.path ? track({ path: f.path }) : null;   // GPS로 그린 길은 흐리게 (고칠 수 없어요)
  if (T && T.pts.length > 1) fOv.push(new kakao.maps.Polyline({ map: fMap, path: T.pts.map(p => new kakao.maps.LatLng(p.lat, p.lng)), strokeWeight: 5, strokeColor: '#1F2A44', strokeOpacity: .45 }));
  const LLs = f.pins.map(p => new kakao.maps.LatLng(p.lat, p.lng));
  if (f.st && !f.gps) {
    const sl = new kakao.maps.LatLng(f.st.lat, f.st.lng), el = document.createElement('span'); el.className = 'wkfpin home'; el.textContent = '🏠';
    fOv.push(new kakao.maps.CustomOverlay({ map: fMap, position: sl, content: el, yAnchor: 1, zIndex: 4 }));
    if (LLs.length) fOv.push(new kakao.maps.Polyline({ map: fMap, path: [sl, LLs[0]], strokeWeight: 4, strokeColor: '#2E7D5B', strokeOpacity: .75, strokeStyle: 'shortdash' }));
  }
  if (LLs.length > 1) fOv.push(new kakao.maps.Polyline({ map: fMap, path: LLs, strokeWeight: 4, strokeColor: '#B3261E', strokeOpacity: .8, strokeStyle: 'shortdash' }));
  const E = !f.gps && LLs.length ? enPt(f) : null;
  if (E) {
    const el2 = new kakao.maps.LatLng(E.lat, E.lng);
    fOv.push(new kakao.maps.Polyline({ map: fMap, path: [LLs[LLs.length - 1], el2], strokeWeight: 4, strokeColor: '#2E7D5B', strokeOpacity: .75, strokeStyle: 'shortdash' }));
    if (f.en !== 'st' || !f.st) { const ee = document.createElement('span'); ee.className = 'wkfpin home'; ee.textContent = '🏁'; fOv.push(new kakao.maps.CustomOverlay({ map: fMap, position: el2, content: ee, yAnchor: 1, zIndex: 4 })); }
  }
  LLs.forEach((ll, i) => {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'wkfpin'; el.textContent = f.pins.length > 1 ? String(i + 1) : '📍'; el.setAttribute('aria-label', `${i + 1}번 핀 빼기`);
    el.addEventListener('click', ev => { ev.stopPropagation(); unpin(i); });
    fOv.push(new kakao.maps.CustomOverlay({ map: fMap, position: ll, content: el, yAnchor: 1, clickable: true, zIndex: 5 }));
  });
}
function unpin(i) { const f = W.form; if (!f || !f.pins[i]) return; if (window.__app) __app.sheetDirty(); f.pins.splice(i, 1); f.geo = f.pins[0] ? fmtGeo(f.pins[0]) : ''; drawPins(); geoSync(); }
function mapUi() {
  const box = $('wf-pick'); if (!box || !window.HOSP) return;
  const gps = W.form && W.form.gps;
  box.innerHTML = `<div class="expickmap" id="wf-map" data-noswipe><p class="vempty" style="padding:12px">지도 불러오는 중…</p></div><p class="hint" style="margin:6px 0 0">${gps ? '이 기록은 걸은 길(GPS)이 있어서 장소는 한 곳만 꽂아요. 지도를 누르면 그 자리로 옮겨요.' : '지도를 누를 때마다 핀이 하나씩 더해지고, 핀(또는 아래 번호 ✕)을 누르면 빠져요. 두 곳 넘으면 찍은 순서대로 길로 이어져요.'}</p>${gps ? '<button type="button" class="ghost" data-wf="nogps" style="width:100%;margin-top:6px">✏️ 길을 직접 찍기로 바꾸기</button>' : ''}`;
  HOSP.sdk().then(() => {
    const el = $('wf-map'); if (!el) return; el.innerHTML = '';
    const f = W.form, T = f && f.gps && f.path ? track({ path: f.path }) : null, g = parse(f && f.geo), c = g || (T && T.pts[0]) || G.cur || (window.EXPLORE && EXPLORE.places()[0] && EXPLORE.places()[0].c) || { lat: 37.3422, lng: 127.9202 };
    fMap = new kakao.maps.Map(el, { center: new kakao.maps.LatLng(c.lat, c.lng), level: g || T ? 4 : 6 });
    fOv = []; drawPins(); if (f) f.pins.forEach(p => { if (!RG(p)) regionName(p).then(geoSync); });
    if (f && f.pins.length > 1) { const B = new kakao.maps.LatLngBounds(); f.pins.forEach(p => B.extend(new kakao.maps.LatLng(p.lat, p.lng))); fMap.setBounds(B, 30, 30, 30, 30); }
    EXPLORE.onTap(el, fMap, ll => setGeo({ lat: ll.getLat(), lng: ll.getLng() }));   // 폰에서 카카오 click이 안 와도 손가락 뗀 자리로
  }).catch(() => { const el = $('wf-map'); if (el) el.innerHTML = '<p class="vempty" style="padding:12px">지도를 불러오지 못했어요. "지금 위치"를 써 주세요.</p>'; });
}

// ---------- 실시간 탐문 (산책 시작) ----------
const lsave = () => { try { localStorage.setItem(LK, JSON.stringify(L)); } catch (e) {} };
const lclear = () => { try { localStorage.removeItem(LK); } catch (e) {} };
const lload = () => { try { const x = JSON.parse(localStorage.getItem(LK) || 'null'); return x && x.v === 1 && x.t0 ? x : null; } catch (e) { return null; } };
let saveT = 0; const dirty = () => { if (Date.now() - saveT > 8000) { saveT = Date.now(); lsave(); } };
const lastPt = () => L && L.pts.length ? { lat: L.pts[L.pts.length - 1][0], lng: L.pts[L.pts.length - 1][1] } : null;
let lEl = null, lMap = null, lLine = null, lLine2 = null, lMe = null, lPins = {}, wid = null, tmr = null, wl = null;
async function lockOn() { try { if (navigator.wakeLock && !wl && document.visibilityState === 'visible') { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) { wl = null; } }
function lockOff() { try { wl && wl.release(); } catch (e) {} wl = null; }
function buildLive() {
  if (lEl) return;
  lEl = document.createElement('div'); lEl.className = 'wko'; lEl.hidden = true; lEl.setAttribute('role', 'dialog'); lEl.setAttribute('aria-label', '탐문 중');
  lEl.innerHTML = `<div class="wktop"><button class="wkx" data-wl="min" aria-label="작게 하기">⌄</button><b>🐾 탐문 중</b><span class="wkgps">GPS 찾는 중…</span></div>
    <div class="wkmapbox"><div class="wklmap"></div><p class="wkwait">지금 위치를 찾는 중이에요…</p><button class="wkme-b" data-wl="follow" aria-label="내 위치로">◎</button></div>
    <div class="wknums"><span><b data-n="time">00:00</b><small>시간</small></span><span><b data-n="dist">0m</b><small>거리</small></span><span><b data-n="pics">0</b><small>사진</small></span></div>
    <div class="wkbtns"><button data-wl="cam"><i>📷</i><span>사진 찍기</span></button><button data-wl="pause"><i>⏸</i><span>잠깐 쉬기</span></button><button data-wl="pocket"><i>🌙</i><span>주머니 모드</span></button><button class="end" data-wl="end"><i>■</i><span>탐문 끝</span></button></div>
    <button class="wksave" data-wl="savecam" hidden>📥 방금 찍은 사진, 폰 앨범에도 저장</button>
    <p class="wknote">화면이 꺼지면 폰이 위치를 안 알려 줘요. 주머니에 넣을 땐 <b>🌙 주머니 모드</b> (화면은 켜진 채 까맣게, 배터리 덜 써요)</p>
    <div class="wkpocket" hidden><b data-n="ptime">00:00</b><span data-n="pdist">0m</span><small>아래 동그라미를 2초 꾹 눌러야 풀려요</small><div class="wkunlock"><i class="wkring"></i><span>🔓<br>꾹</span></div></div>`;
  document.body.appendChild(lEl);
  lEl.addEventListener('click', onLive);
  const pk = lEl.querySelector('.wkpocket'); let ht = 0;
  // 주머니에서 저절로 풀리지 않게: 화면 아무 데나가 아니라 아래 동그라미만, 2초 동안 손가락이 안에 있어야 (사용자 요청 2026.10.15)
  const un = pk.querySelector('.wkunlock');
  const down = e => { e.preventDefault(); e.stopPropagation(); clearTimeout(ht); pk.classList.add('hold'); ht = setTimeout(() => { pk.hidden = true; pk.classList.remove('hold'); if (navigator.vibrate) navigator.vibrate(40); }, 2000); };
  const upp = () => { clearTimeout(ht); pk.classList.remove('hold'); };
  un.addEventListener('pointerdown', down); un.addEventListener('pointerup', upp); un.addEventListener('pointercancel', upp); un.addEventListener('pointerleave', upp);
  pk.addEventListener('pointerdown', e => e.preventDefault());
}
const liveOpen = () => !!(lEl && !lEl.hidden);
function openLive() {
  buildLive(); lEl.hidden = false; document.documentElement.classList.add('wk-open'); syncPill(); updNums(); lockOn();
  if (!lMap && window.HOSP && HOSP.sdk) HOSP.sdk().then(() => {
    if (lMap) return;
    const box = lEl.querySelector('.wklmap'), c = G.cur || lastPt() || { lat: 37.3422, lng: 127.9202 };
    lMap = new kakao.maps.Map(box, { center: new kakao.maps.LatLng(c.lat, c.lng), level: 3 });
    lLine2 = new kakao.maps.Polyline({ map: lMap, path: [], strokeWeight: 9, strokeColor: '#FFFFFF', strokeOpacity: .9 });
    lLine = new kakao.maps.Polyline({ map: lMap, path: [], strokeWeight: 5, strokeColor: '#B3261E', strokeOpacity: .95 });
    kakao.maps.event.addListener(lMap, 'dragstart', () => { W.follow = false; });
    drawLive(true);
  }).catch(() => { const p = lEl.querySelector('.wkwait'); if (p) p.textContent = '지도를 못 불러왔어요. 길은 그대로 기록해요.'; });
  else if (lMap) { lMap.relayout(); drawLive(true); }
}
function closeLive() { if (!lEl) return; lEl.hidden = true; lEl.querySelector('.wkpocket').hidden = true; document.documentElement.classList.remove('wk-open'); syncPill(); if (!(L && !L.ended)) lockOff(); }
function drawLive(fit) {
  if (!lMap || !L) return;
  const path = L.pts.map(p => new kakao.maps.LatLng(p[0], p[1]));
  lLine.setPath(path); lLine2.setPath(path);
  const wait = lEl.querySelector('.wkwait'); if (wait) wait.hidden = !!(G.cur || path.length);
  if (G.cur) {
    const ll = new kakao.maps.LatLng(G.cur.lat, G.cur.lng);
    if (!lMe) { const el = document.createElement('span'); el.className = 'wkme'; lMe = new kakao.maps.CustomOverlay({ map: lMap, position: ll, content: el, yAnchor: .5, zIndex: 7 }); } else lMe.setPosition(ll);
    if (W.follow || fit) lMap.panTo(ll);
  } else if (fit && path.length) lMap.setCenter(path[path.length - 1]);
  Object.entries(L.pp || {}).forEach(([id, p]) => {
    if (lPins[id]) return;
    const el = document.createElement('span'), u = safeImg(PHOTOS[id]); el.className = 'wkpin sm'; el.innerHTML = u ? `<img src="${u}" alt="">` : '<span>📷</span>';
    lPins[id] = new kakao.maps.CustomOverlay({ map: lMap, position: new kakao.maps.LatLng(p[0], p[1]), content: el, yAnchor: 1.15, zIndex: 6 });
  });
}
function updNums() {
  if (!L) return;
  const t = clock(elapsed()), d = kmText(L.dist || 0);
  if (lEl) {
    const set = (k, v) => { const el = lEl.querySelector(`[data-n="${k}"]`); if (el && el.textContent !== v) el.textContent = v; };
    set('time', t); set('dist', d); set('pics', String((L.pics || []).length)); set('ptime', t); set('pdist', d);
    const pb = lEl.querySelector('[data-wl="pause"]'); if (pb) pb.innerHTML = L.paused ? '<i>▶</i><span>다시 걷기</span>' : '<i>⏸</i><span>잠깐 쉬기</span>';
    lEl.classList.toggle('paused', !!L.paused);
    const g = lEl.querySelector('.wkgps'); if (g) { const tx = G.err ? G.err : L.paused ? '쉬는 중' : G.acc == null ? 'GPS 찾는 중…' : G.acc <= 20 ? 'GPS 좋음' : G.acc <= 45 ? 'GPS 보통' : 'GPS 약함'; if (g.textContent !== tx) g.textContent = tx; g.className = 'wkgps' + (G.err || (G.acc != null && G.acc > 45) ? ' bad' : ''); }
  }
  document.querySelectorAll('.wk-lt').forEach(el => { el.textContent = t; });
  document.querySelectorAll('.wk-ld').forEach(el => { el.textContent = `${d} · 눌러서 보기`; });
  if (pill && !pill.hidden && L && !L.ended) pill.innerHTML = `<i>🐾</i> 탐문 중 <b>${t}</b> · ${d}`;
}
function tick() { if (!L) { clearInterval(tmr); tmr = null; return; } updNums(); }
function watch() {
  unwatch(); if (!navigator.geolocation) { G.err = '위치를 쓸 수 없어요'; return; }
  wid = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 });
  if (!tmr) tmr = setInterval(tick, 1000);
}
function unwatch() { if (wid != null) { try { navigator.geolocation.clearWatch(wid); } catch (e) {} wid = null; } }
function onErr(e) { G.err = e && e.code === 1 ? '위치 권한 꺼짐' : 'GPS 약함'; if (e && e.code === 1) toast('위치 권한을 허용해 주세요 (폰 설정 → 앱 → 크롬 → 권한 → 위치)'); updNums(); }
function onPos(p) {
  const c = p.coords, now = p.timestamp || Date.now(); G.err = ''; G.acc = c.accuracy; G.cur = { lat: c.latitude, lng: c.longitude };
  if (L && !L.ended && !L.paused && c.accuracy <= (L.pts.length ? 40 : 70)) {
    const t = Math.max(0, Math.round((now - L.t0) / 1000)), last = L.pts[L.pts.length - 1];
    let ok = true;
    if (last) {
      const d = km({ lat: last[0], lng: last[1] }, G.cur) * 1000, dt = Math.max(1, t - last[2]);
      if (d < Math.max(5, c.accuracy * .5)) ok = false;            // 제자리 흔들림
      else if (d / dt > 8 && dt < 120) ok = false;                 // 순간 튐 (시속 29km 넘게)
      else L.dist = (L.dist || 0) + d;
    }
    if (ok) { L.pts.push([+c.latitude.toFixed(6), +c.longitude.toFixed(6), t]); dirty(); }
  }
  drawLive(); updNums();
}
function start() {
  if (!canWrite()) { toast('보기 전용이라 기록은 엄마·아빠 수사관만 남겨요'); return; }
  if (L && !L.ended) { closeSheet(); openLive(); return; }
  if (L && L.ended) { closeSheet(); saveLive(); return; }
  if (!navigator.geolocation) { toast('이 폰에서는 위치를 쓸 수 없어요'); return; }
  closeSheet();
  L = { v: 1, t0: Date.now(), pts: [], pics: [], pp: {}, dist: 0, paused: 0, pausedMs: 0, ended: 0, by: myRole() };
  G.cur = null; G.acc = null; G.err = ''; W.follow = true; Object.values(lPins).forEach(o => o.setMap(null)); lPins = {};
  lsave(); watch(); openLive(); render();
  toast('탐문 출동! 걸은 길을 그려요 🐾');
}
async function end() {
  if (!L) return;
  if (!(await ask('탐문을 끝낼까요?', { ok: '끝내기' }))) return;
  if (L.paused) { L.pausedMs += Date.now() - L.paused; L.paused = 0; }
  L.ended = Date.now(); lsave(); unwatch(); lockOff(); closeLive(); render(); saveLive();
}
// 끝낸 탐문 → 결과 보고 (저장 폼)
function saveLive() {
  if (!L) return;
  if (!L.ended) { L.ended = Date.now(); lsave(); unwatch(); }
  const pts = L.pts.map(p => ({ lat: p[0], lng: p[1], t: p[2] })), sl = pts.length > 1 ? slim(pts) : pts, t1 = L.ended;
  const g = pts[0] ? { lat: pts[0].lat, lng: pts[0].lng } : null;
  const preset = { live: true, kind: 'walk', date: dayOf(L.t0), start: hm(L.t0), end: hm(t1), mins: Math.round(elapsed() / 60000), dist: String(Math.round(L.dist || 0)), path: sl.length > 1 ? pack(sl, L.t0) : '', pics: (L.pics || []).slice(), geo: g ? fmtGeo(g) : '' };
  openForm('', preset);
  if (g) regionName(g).then(n => { const el = $('wf-title'); if (n && el && !el.value) el.placeholder = `예: ${n.split(' ').pop()} 산책`; const b = $('wf-geo'); if (b) b.innerHTML = geoLine(); });
}
async function discard() {
  if (!(await ask('이번 탐문 기록을 버릴까요?\n찍은 사진은 사건 앨범에 남아요.', { ok: '버리기', danger: true }))) return;
  L = null; lclear(); unwatch(); lockOff(); closeLive(); closeSheet(); syncPill(); render(); toast('탐문 기록을 버렸어요');
}
// 탐문 중 사진 찍기 (카메라로 바로, 찍은 때 위치를 붙여요)
const cam = document.createElement('input');
cam.type = 'file'; cam.accept = 'image/*'; cam.setAttribute('capture', 'environment'); cam.hidden = true;
document.body.appendChild(cam);
cam.addEventListener('change', async () => {
  const f = cam.files && cam.files[0]; cam.value = ''; if (!f || !L) return;
  const p = G.cur || lastPt(), ids = await ALBUM.queue([f], undefined, { geo: p ? fmtGeo(p) : '', tm: hms(Date.now()), date: today() });
  const id = ids && ids[0]; if (!id) return;
  L.pics.push(id); if (p) (L.pp = L.pp || {})[id] = [p.lat, p.lng];
  lsave(); drawLive(); updNums(); toast('📷 사진을 지금 자리에 꽂았어요');
  offerSave(f);
});
// 웹앱은 갤러리에 몰래 저장할 수 없어서, 찍은 직후 단추를 눌러 공유 창에서 '이미지 저장'을 고르게 (사용자 요청 2026.10.17)
let camT = 0, lastCam = null;
function offerSave(f) {
  lastCam = f; const b = lEl && lEl.querySelector('.wksave'); if (!b) return;
  b.hidden = false; clearTimeout(camT); camT = setTimeout(() => { b.hidden = true; lastCam = null; }, 20000);
}
async function saveCam() {
  const f = lastCam, b = lEl.querySelector('.wksave'); if (!f) { if (b) b.hidden = true; return; }
  const r = await CV.share(f, `soeun-${hms(Date.now()).replace(/:/g, '')}.jpg`, '소은이 사진');
  if (r === 'shared') { toast('공유 창에서 \'이미지 저장\'을 눌렀다면 앨범에 들어갔어요'); } else if (r === 'saved') toast('다운로드로 저장했어요 (파일 앱)');
  if (r !== 'cancel') { clearTimeout(camT); lastCam = null; if (b) b.hidden = true; }
}
function onLive(e) {
  const b = e.target.closest('[data-wl]'); if (!b || !L) return;
  const a = b.dataset.wl;
  if (a === 'min') closeLive();
  else if (a === 'follow') { W.follow = true; drawLive(true); }
  else if (a === 'cam') cam.click();
  else if (a === 'savecam') saveCam();
  else if (a === 'pause') { if (L.paused) { L.pausedMs += Date.now() - L.paused; L.paused = 0; toast('다시 출발!'); } else { L.paused = Date.now(); toast('잠깐 쉬어요. 쉬는 동안은 길을 안 그려요'); } lsave(); updNums(); }
  else if (a === 'pocket') { const pk = lEl.querySelector('.wkpocket'); pk.hidden = false; updNums(); lockOn(); }
  else if (a === 'end') end();
}
// 다른 화면에서도 보이는 작은 알림 (탐문 중·저장 안 한 탐문)
const pill = document.createElement('button');
pill.className = 'wkpill'; pill.hidden = true; pill.dataset.wk = 'pill';
document.body.appendChild(pill);
function syncPill() {
  const show = !!L && S.mode === 'ok' && !liveOpen() && !(S.tab === 'town' && !S.view);
  pill.hidden = !show;
  if (show) { if (L.ended) pill.innerHTML = '<i>📝</i> 끝낸 탐문 저장하기'; else updNums(); pill.classList.toggle('done', !!L.ended); }
}
document.addEventListener('visibilitychange', () => {
  if (!L || L.ended) return;
  if (document.visibilityState === 'visible') { lockOn(); watch(); updNums(); }   // 탐문 중엔 작게 해 둬도 화면을 켜 둬요 (꺼지면 위치가 안 와요)
});
function afterRender() {
  if (!W.boot && S.mode === 'ok' && S.profile && S.profile.birth) {
    W.boot = true; L = lload();
    if (L) {
      const last = L.pts.length ? L.t0 + L.pts[L.pts.length - 1][2] * 1000 : L.t0;
      if (!L.ended && Date.now() - last > 4 * 3600e3) { L.ended = Math.max(last, L.t0 + 60e3); lsave(); }   // 끝내기를 잊은 탐문
      if (!L.ended) watch();
      if (!tmr) tmr = setInterval(tick, 1000);
    }
  }
  syncPill();
  if (S.view === 'walk') drawDetail();
  if (window.EXPLORE) EXPLORE.pinCheck();
}
// 뒤로가기: 탐문 화면은 작게(기록은 계속), 주머니 모드에선 무시
function close() {
  if (!liveOpen()) return false;
  const pk = lEl.querySelector('.wkpocket'); if (!pk.hidden) { toast('아래 동그라미를 2초 꾹 눌러요'); return true; }
  closeLive(); return true;
}

// ---------- 보고서 카드 (이미지로 카톡 보내기·저장) ----------
async function makeCard(w) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const k = kindOf(w.kind), T = track(w), P = photos(w), m = distM(w), mins = dur(w), mo = moodOf(w.mood), no = all().reverse().findIndex(y => y.id === w.id) + 1;
  const title = w.title || (w.place ? `${w.place} ${k[2]}` : k[2]);
  await CV.fonts(title, w.place || '', w.memo || '', '탐문 보고서 거리 시간 사진 반응 출발 도착');
  CV.kraft(x, 1080, 1350);
  CV.text(x, `탐문 보고서 No.${no}`, 80, 112, '34px Jua', '#B3261E', 'left');
  CV.text(x, `${k[1]} ${title}`, 80, 182, '62px Jua', '#1F2A44', 'left', 920);
  CV.text(x, `${fmtK(w.date)}${timeText(w) ? ' · ' + timeText(w) : ''}${w.place && w.title ? ' · ' + w.place : ''}`, 80, 234, '30px "Gowun Dodum"', '#5B4B3A', 'left', 920);
  // 지도판 (양피지 + 길)
  const X0 = 80, Y0 = 270, PW = 920, PH = 640;
  x.save(); CV.rr(x, X0, Y0, PW, PH, 28); x.fillStyle = '#F7EBD3'; x.fill(); x.lineWidth = 4; x.setLineDash([14, 10]); x.strokeStyle = '#C9A877'; x.stroke(); x.setLineDash([]);
  x.clip(); x.strokeStyle = 'rgba(160,120,70,.16)'; x.lineWidth = 2; for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(X0 + PW * i / 8, Y0); x.lineTo(X0 + PW * i / 8, Y0 + PH); x.stroke(); } for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(X0, Y0 + PH * i / 6); x.lineTo(X0 + PW, Y0 + PH * i / 6); x.stroke(); }
  const near = p => !(T && T.pts.length > 1) || T.pts.some(q => km(q, p) < 3);   // 경로에서 3km 넘게 떨어진 사진 자리는 지도판에서 빼요
  const pos = P.map(ph => ({ ph, p: posOf(ph, w) })).filter(o => o.p && near(o.p)), pts = (T && T.pts.length > 1 ? T.pts : []).concat(pos.map(o => o.p)), g = parse(w.geo);
  if (!pts.length && g) pts.push(g);
  let proj = null;
  if (pts.length) {
    const kx = Math.cos(pts[0].lat * Math.PI / 180), xs = pts.map(p => p.lng * kx), ys = pts.map(p => -p.lat), pad = 90;
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const s = Math.min((PW - pad * 2) / Math.max(1e-6, x1 - x0), (PH - pad * 2) / Math.max(1e-6, y1 - y0)), ox = X0 + (PW - (x1 - x0) * s) / 2, oy = Y0 + (PH - (y1 - y0) * s) / 2;
    proj = p => [ox + (p.lng * kx - x0) * s, oy + (-p.lat - y0) * s];
  }
  if (proj && T && T.pts.length > 1) {
    const Q = T.pts.map(proj); x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); Q.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.strokeStyle = '#fff'; x.lineWidth = 20; x.stroke();
    x.beginPath(); Q.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.strokeStyle = '#B3261E'; x.lineWidth = 9; x.setLineDash([22, 14]); x.stroke(); x.setLineDash([]);
    [[Q[0], '출발', '#2E7D5B'], [Q[Q.length - 1], '도착', '#1F2A44']].forEach(([q, t, col]) => { x.beginPath(); x.arc(q[0], q[1], 30, 0, Math.PI * 2); x.fillStyle = col; x.fill(); x.lineWidth = 5; x.strokeStyle = '#fff'; x.stroke(); CV.text(x, t, q[0], q[1] + 9, '24px Jua', '#fff'); });
  } else if (proj && g) { const q = proj(g); CV.text(x, k[1], q[0], q[1] + 30, '96px sans-serif', '#000'); }
  else { CV.text(x, k[1], X0 + PW / 2, Y0 + PH / 2 + 40, '140px sans-serif', '#000'); }
  x.restore();
  // 사진 (최대 4장, 찍은 자리 가까이)
  const pick = (pos.length ? pos : P.map(ph => ({ ph, p: null }))).filter(o => safeImg(PHOTOS[o.ph.id])), step = Math.max(1, pick.length / 4), sel = [];
  for (let i = 0; i < pick.length && sel.length < 4; i += step) sel.push(pick[Math.floor(i)]);
  const slots = [[X0 + 40, Y0 + 40], [X0 + PW - 290, Y0 + 40], [X0 + 40, Y0 + PH - 290], [X0 + PW - 290, Y0 + PH - 290]];
  for (let i = 0; i < sel.length; i++) {
    let im; try { im = await CV.img(safeImg(PHOTOS[sel[i].ph.id])); } catch (e) { continue; }
    const q = sel[i].p && proj ? proj(sel[i].p) : null, [sx, sy] = slots[i], rot = [-5, 4, 3, -4][i];
    if (q) { x.strokeStyle = 'rgba(31,42,68,.55)'; x.lineWidth = 3; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(sx + 125, sy + 125); x.lineTo(q[0], q[1]); x.stroke(); x.setLineDash([]); x.beginPath(); x.arc(q[0], q[1], 9, 0, Math.PI * 2); x.fillStyle = '#B3261E'; x.fill(); }
    x.save(); x.translate(sx + 125, sy + 125); x.rotate(rot * Math.PI / 180); x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 14; x.shadowOffsetY = 6; x.fillStyle = '#fff'; x.fillRect(-125, -125, 250, 270); x.shadowColor = 'transparent';
    CV.cover(x, im, -110, -110, 220, 210); CV.text(x, sel[i].ph.tm ? sel[i].ph.tm.slice(0, 5) : fmtMD(sel[i].ph.date), 0, 130, '24px Jua', '#5B4B3A'); x.restore();
    CV.tape(x, sx + 125, sy - 2, 110, 30, rot * 2);
    if (im.__blob) URL.revokeObjectURL(im.__blob);
  }
  // 숫자
  const nums = [['거리', m ? kmText(m) : '-'], ['시간', mins ? durText(mins) : '-'], ['사진', P.length + '장'], ['반응', mo ? mo[1] + ' ' + mo[2] : '-']];
  nums.forEach(([a, b], i) => { const bx = 80 + i * 235; CV.rr(x, bx, 940, 215, 130, 22); x.fillStyle = '#FFFDF7'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#E2C99F'; x.stroke(); CV.text(x, a, bx + 107, 985, '26px "Gowun Dodum"', '#7A6650'); CV.text(x, b, bx + 107, 1040, '40px Jua', '#1F2A44', 'center', 195); });
  if (w.memo) { x.font = '30px "Gowun Dodum"'; const lines = CV.wrap(x, w.memo.replace(/\s+/g, ' '), 640).slice(0, 3); lines.forEach((ln, i) => CV.text(x, i === 2 && lines.length === 3 && w.memo.length > 60 ? ln.slice(0, -1) + '…' : ln, 80, 1130 + i * 44, '30px "Gowun Dodum"', '#3B2F25', 'left')); }
  CV.stamp(x, 900, 1200, 100, '탐문 완료', k[2], -12);
  try { const ch = await CV.svgImg(CHARS.svg('baby', 'lens', { size: 180 })); x.drawImage(ch, 700, 1130, 150, 150); } catch (e) {}
  CV.text(x, `${CV.nick()} 성장 수사 일지`, 80, 1300, '26px Jua', '#7A6650', 'left');
  return new Promise(res => c.toBlob(res, 'image/jpeg', .9));
}
async function openCard(id) {
  const w = byId(id); if (!w) return;
  openSheet(`<h3>🖼️ 탐문 보고서 카드</h3><div class="wkcard"><p class="vempty">그리는 중…</p></div><div class="actions"><button class="secondary" data-act="close">닫기</button></div>`);
  try {
    const blob = await makeCard(w), u = URL.createObjectURL(blob), box = document.querySelector('.wkcard'); if (!box) return;
    W.card = { blob, name: `탐문보고서_${w.date}.jpg`, w };
    box.innerHTML = `<img src="${u}" alt="탐문 보고서 카드">`;
    document.querySelector('#sheet .actions').innerHTML = `<button class="secondary" data-act="close">닫기</button><button class="ghost" data-wk="csave">폰에 저장</button><button class="primary" data-wk="cshare">카톡 보내기</button>`;
  } catch (e) { const box = document.querySelector('.wkcard'); if (box) box.innerHTML = `<p class="vempty">카드를 만들지 못했어요. ${esc(e.message || '')}</p>`; }
}

// ---------- 누르기 ----------
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-wk]'); if (!b || b.disabled) return;
  const a = b.dataset.wk, v = b.dataset.v;
  if (a === 'open') return open(v);
  if (a === 'back') return goBack();
  if (a === 'more') { W.more += 10; render(); return; }
  if (a === 'cal') { const [y, m] = (W.cal || today().slice(0, 7)).split('-').map(Number), d = new Date(Date.UTC(y, m - 1 + (+v), 1)); W.cal = d.toISOString().slice(0, 7); render(); return; }
  if (a === 'day') { const X = all().filter(w => w.date === v); if (X.length === 1) return open(X[0].id); openSheet(`<h3>${fmtK(v)} 탐문</h3><div class="wklist">${X.map(rowHtml).join('')}</div><div class="actions"><button class="secondary" data-act="close">닫기</button></div>`); return; }
  if (a === 'pan') return pan(v);
  if (a === 'tsel') { if (W.tsel.has(v)) W.tsel.delete(v); else W.tsel.add(v); selSync(); return; }
  if (a === 'talb') {   // 고른 사진을 사건 앨범(현장 사진첩) / 가족 앨범에 넣기 — 이 탐문 기록에는 그대로 (사용자 요청 2026.10.17)
    const to = v, items = [...W.tsel].map(id => (S.moments || []).find(m => m.id === id)).filter(m => m && (m.type === 'free' || m.type === 'fam')); if (!items.length) { toast('이 사진은 옮길 수 없어요'); return; }
    const todo = items.filter(m => m.type !== to), nm = to === 'fam' ? '가족 앨범' : '사건 앨범';
    if (!todo.length) { toast(`이미 ${nm}에 있어요`); return; }
    if (!(await ask(`${todo.length}장을 ${nm}에 넣을까요?\n이 탐문 기록에도 그대로 남아요.`, { ok: '넣기' }))) return;
    let n = 0; for (const m of todo) { toast(`옮기는 중 ${n + 1}/${todo.length}`); if (await write('saveItem', 'mom', { id: m.id, type: to, of: '', who: '', title: m.title || '', date: m.date, memo: m.memo || '', by: m.by || myRole() })) n++; else break; }
    if (n) { W.tsel.clear(); selSync(); toast(`${n}장을 ${nm}에 넣었어요`); } return;
  }
  if (a === 'tout') {   // 고른 사진을 이 탐문 기록에서 빼요 (사진은 사건 앨범에 그대로)
    const w = byId(W.cur), ids = [...W.tsel]; if (!w || !ids.length) return;
    if (!(await ask(`고른 사진 ${ids.length}장을 이 탐문 기록에서 뺄까요?\n사진은 사건 앨범에 그대로 남아요.`, { ok: '빼기' }))) return;
    const L0 = String(w.pics || '').split(',').filter(x => x && !ids.includes(x) && !ids.includes(x.replace(/^-/, '')));
    if (await write('saveItem', 'walk', Object.assign({}, w, { pics: L0.concat(ids.map(x => '-' + x)).join(',') }))) { W.tsel.clear(); dSig = ''; render(); toast(`${ids.length}장을 이 기록에서 뺐어요`); }
    return;
  }
  if (a === 'rphoto') { const w = byId(W.cur); if (!w) return; if (!(await ask('지도에 찍은 핀 길 대신\n사진 찍은 자리를 시간 순서로 이은 길로 바꿀까요?', { ok: '바꾸기' }))) return;
    const mn = mainOf(w.path);
    if (await write('saveItem', 'walk', Object.assign({}, w, { path: joinP(/^2:/.test(mn) ? '3' + mn.slice(1) : '', altsOf(w.path)), dist: '' }))) { dSig = ''; render(); toast('사진 자리로 길을 그렸어요 🐾\n↩ 핀 길로 되돌릴 수도 있어요'); } return; }
  if (a === 'rpins') { const w = byId(W.cur), mn = w && mainOf(w.path); if (!w || !/^3:/.test(mn)) return; const P = pinsOf(w.path);
    if (await write('saveItem', 'walk', Object.assign({}, w, { path: joinP('2' + mn.slice(1), altsOf(w.path)), dist: String(Math.round(pathM(P))) }))) { dSig = ''; render(); toast('지도에 찍은 핀 길로 되돌렸어요'); } return; }
  if (a === 'rgps') { const w = byId(W.cur); if (!w) return; const g = altsOf(w.path).find(x => /^1:/.test(x)); if (!g) return;
    if (!(await ask('GPS로 걸은 길로 되돌릴까요?\n지금 길(지도에 찍은 핀)은 간직해 둬요.', { ok: '되돌리기' }))) return;
    const mn = mainOf(w.path), T = trackRaw({ path: g });
    if (await write('saveItem', 'walk', Object.assign({}, w, { path: joinP(g, /^[23]:/.test(mn) ? ['2' + mn.slice(1)] : []), dist: T ? String(Math.round(pathM(T.pts))) : w.dist }))) { dSig = ''; render(); toast('GPS로 걸은 길로 되돌렸어요 🐾'); } return; }
  if (a === 'tall') { const ids = [...document.querySelectorAll('.wktck')].map(x => x.dataset.v); if (W.tsel.size === ids.length) W.tsel.clear(); else ids.forEach(id => W.tsel.add(id)); selSync(); return; }
  if (a === 'tnone') { W.tsel.clear(); selSync(); if (window.EXPLORE) EXPLORE.pinOff(); return; }
  if (a === 'tpin') return pinPhoto([...W.tsel]);
  if (a === 'pinmv') return pinPhoto(W.tsel.size ? [...W.tsel, v] : [v]);
  if (a === 'mloc') { if (dMap) EXPLORE.locate(dMap); return; }
  if (a === 'mfull') { if (dMap && dEl) { const w = byId(W.cur); EXPLORE.fullMap(dEl, dMap, w ? (w.title || w.place || kindOf(w.kind)[2]) : '탐문 지도', 'wkmap-slot'); } return; }
  if (a === 'card') return openCard(v);
  if (a === 'cshare' && W.card) { const r = await CV.share(W.card.blob, W.card.name, '탐문 보고서'); if (r === 'saved') toast('폰에 저장했어요'); return; }
  if (a === 'csave' && W.card) { CV.save(W.card.blob, W.card.name); toast('폰에 저장했어요'); return; }
  if (a === 'pill') { if (L && L.ended) saveLive(); else openLive(); return; }
  if (a === 'live') return openLive();
  if (!canWrite()) { toast('보기 전용이라 기록은 엄마·아빠 수사관만 남겨요'); return; }
  if (a === 'add') return openAdd();
  if (a === 'start') return start();
  if (a === 'saveLive') { closeSheet(); return saveLive(); }
  if (a === 'form') return openForm('');
  if (a === 'edit') return openForm(v);
  if (a === 'del') return del(v);
  if (a === 'addph') {   // 현장 사진에서 고르기(그대로 붙이기, 복사 안 함) / 갤러리 앱에서 올리기
    const w = byId(v); if (!w) return;
    const r = await ALBUM.choose({ multi: true, date: w.date, have: new Set(photos(w).map(m => m.id)), okLabel: '이 기록에 붙이기', title: '탐문 사진을 어디서 가져올까요?', gnote: '폰에 있는 새 사진 (현장 사진첩에도 같이 올라가요)' });
    if (!r) return; if (r === 'gallery') { W.pickMode = 'add'; W.addFor = v; picker.click(); return; }
    const add = new Set(r.ids), pics = [...new Set(String(w.pics || '').split(',').filter(x => x && !(x[0] === '-' && add.has(x.slice(1)))).concat(r.ids))].join(',');
    if (await write('saveItem', 'walk', Object.assign({}, w, { pics }))) { dSig = ''; render(); toast(`사진 ${r.ids.length}장을 이 기록에 붙였어요`); }
    return;
  }
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-wf]'); if (!b || !W.form) return;
  const a = b.dataset.wf, f = W.form, v = b.dataset.v;
  if (a === 'kind' || a === 'mood') { f[a] = a === 'mood' && f.mood === v ? '' : v; b.parentElement.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.v === f[a])); return; }
  if (a === 'who') { if (f.who.has(v)) f.who.delete(v); else f.who.add(v); b.classList.toggle('on', f.who.has(v)); return; }
  if (a === 'photos') {
    grab(); const r = await ALBUM.choose({ multi: true, date: f.date, have: new Set(f.pics.concat(f.id ? [] : autoIds())), okLabel: '이 기록에 붙이기', title: '탐문 사진을 어디서 가져올까요?', gnote: '폰에 있는 새 사진 (현장 사진첩에도 같이 올라가요)' });
    if (!r || !W.form) return; if (r === 'gallery') { W.pickMode = 'form'; picker.click(); return; }
    f.pics = [...new Set(f.pics.concat(r.ids))]; f.no = (f.no || []).filter(x => !r.ids.includes(x));
    if (!f.id && !f.live) {   // 새 기록이면 고른 사진의 날짜·시각으로 날짜·시간을 채워요 (직접 고친 칸은 그대로)
      const P = r.ids.map(id => S.moments.find(m => m.id === id)).filter(Boolean), ds = P.map(m => m.date).filter(Boolean).sort();
      if (ds[0] && !f.touched && ds[0] !== f.date) { f.date = ds[0]; const el = $('wf-date'); if (el) el.value = ds[0]; }
      const tms = P.filter(m => m.date === f.date && /^\d\d:\d\d/.test(m.tm || '')).map(m => m.tm.slice(0, 5)).sort();
      if (tms.length && !f.start) { f.start = tms[0]; f.end = tms[tms.length - 1] > tms[0] ? tms[tms.length - 1] : ''; const x = $('wf-start'), y = $('wf-end'); if (x) x.value = f.start; if (y) y.value = f.end; }
    }
    if (window.__app) __app.sheetDirty(); const box = $('wf-ph'); if (box) box.innerHTML = formPhotos(); return;
  }
  if (a === 'unpic') { f.pics = f.pics.filter(x => x !== v); f.no = [...new Set((f.no || []).concat(v))]; if (window.__app) __app.sheetDirty(); $('wf-ph').innerHTML = formPhotos(); return; }   // 시간으로 저절로 들어온 사진도 다시 안 들어오게 '-id'로
  if (a === 'unfile') { const x = W.files.splice(+v, 1)[0]; if (x) try { URL.revokeObjectURL(x.url); } catch (er) {} $('wf-ph').innerHTML = formPhotos(); return; }
  if (a === 'ungeo') { setGeo(null); return; }
  if (a === 'stset') { W.stMode = 'st'; geoSync(); return; }
  if (a === 'enset') { W.stMode = 'en'; geoSync(); return; }
  if (a === 'enst') { f.en = 'st'; drawPins(); geoSync(); if (window.__app) __app.sheetDirty(); return; }
  if (a === 'enx') { f.en = null; W.stMode = false; drawPins(); geoSync(); if (window.__app) __app.sheetDirty(); return; }
  if (a === 'stcancel') { W.stMode = false; geoSync(); return; }
  if (a === 'stx') { f.st = null; if (f.en === 'st') f.en = null; W.stMode = false; drawPins(); geoSync(); if (window.__app) __app.sheetDirty(); return; }
  if (a === 'sthome') { f.st = home(); if (!f.en && !f.id) f.en = 'st'; drawPins(); geoSync(); if (window.__app) __app.sheetDirty(); return; }
  if (a === 'sthomeset') { if (f.st) { setHome(f.st); geoSync(); toast('🏠 기본 출발지로 저장했어요 (엄마·아빠 폰 같이)'); } return; }
  if (a === 'unpin') { unpin(+v); return; }
  if (a === 'nogps') { if (!(await ask('지도에서 찍는 곳들을 순서대로 이어 길을 그릴까요?\n걸은 길(GPS)은 지우지 않고 간직해 둬서\n탐문 보고서에서 언제든 되돌릴 수 있어요.\n저장을 눌러야 바뀌어요.', { ok: '바꾸기' }))) return;
    f.alt = [mainOf(f.path)].concat((f.alt || []).filter(x => !/^[123]:/.test(x))); f.gps = false; f.path = ''; f.dist = ''; f.pins = f.pinsBak && f.pinsBak.length ? f.pinsBak : parse(f.geo) ? [parse(f.geo)] : []; f.geo = f.pins[0] ? fmtGeo(f.pins[0]) : f.geo;
    if (window.__app) __app.sheetDirty(); mapUi(); geoSync(); return; }
  if (a === 'here') { b.disabled = true; try { const g = await getPos(); G.cur = g; const n = await regionName(g); setGeo(g, n ? n.split(' ').pop() : ''); } catch (er) { $('wf-err').textContent = er.message; } b.disabled = false; return; }
  if (a === 'search') { searchUi(); return; }
  if (a === 'go') { doSearch(); return; }
  if (a === 'pickres') { const p = W.res && W.res[+v]; if (!p) return; if (W.stMode) { setGeo({ lat: +p.y, lng: +p.x }, p.place_name); $('wf-pick').innerHTML = ''; return; } const el = $('wf-place'); if (el) el.value = p.place_name; setGeo({ lat: +p.y, lng: +p.x }); $('wf-pick').innerHTML = ''; return; }
  if (a === 'map') { mapUi(); return; }
  if (a === 'cancel') { if (f.live) { closeSheet(); W.form = null; syncPill(); render(); return; } closeSheet(); W.form = null; return; }
  if (a === 'save') { saveForm(b); return; }
  if (a === 'discard') { discard(); return; }
});
document.addEventListener('input', e => { if (W.form && /^wf-(date|start|end)$/.test(e.target.id || '')) W.form.touched = true; });
// 새 기록: 날짜·시간을 바꾸면 '시간이 맞아 저절로 붙는 사진'을 다시 보여 줘요
document.addEventListener('change', e => { if (W.form && !W.form.id && /^wf-(date|start|end)$/.test(e.target.id || '')) { grab(); const box = $('wf-ph'); if (box) box.innerHTML = formPhotos(); } });

const css = document.createElement('style');
css.textContent = `
.wkhero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-top:12px}
.wkidx{display:flex;align-items:center;gap:8px;text-align:left;border:1.5px solid var(--line);background:#FFFDF7;border-radius:18px;padding:8px 10px;min-height:76px}
.wkidx>b{font-family:var(--display);font-weight:400;font-size:30px;line-height:1;color:#2E7D5B;min-width:44px;text-align:center;white-space:nowrap;flex:none;letter-spacing:-1px}.wkidx>b.w3{font-size:25px}
.wkidx.mid>b{color:#C8551E}.wkidx.no>b{color:var(--red)}
.wkidx span{display:flex;flex-direction:column;min-width:0}.wkidx em{font-style:normal;font-size:12px;color:var(--muted)}.wkidx small{font-size:12.5px;color:var(--ink);word-break:keep-all}.wkidx u{text-decoration:none;font-size:11px;color:var(--red);margin-top:1px}
.wkgo{display:flex;align-items:center;gap:8px;text-align:left;border:0;border-radius:18px;padding:8px 12px;min-height:76px;background:var(--red);color:#fff;box-shadow:0 3px 0 #7E1A14}
.wkgo i{font-style:normal;font-size:30px}.wkgo span{display:flex;flex-direction:column;font-family:var(--display);font-size:19px;line-height:1.15}.wkgo small{font-family:var(--body);font-size:12px;opacity:.9;margin-top:2px}
.wkgo.live{background:var(--navy);box-shadow:0 3px 0 #0D1424}.wkgo.live b{font-weight:400}
.wksec .wkstat{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:10px}
.wkstat span{display:flex;flex-direction:column;align-items:center;background:var(--card2);border-radius:14px;padding:6px 2px}.wkstat small{font-size:11px;color:var(--muted)}.wkstat b{font-family:var(--display);font-weight:400;font-size:17px;color:var(--navy);white-space:nowrap}
.wklist{display:flex;flex-direction:column;gap:6px}
.wkrow{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid var(--line);background:#FFFDF7;border-radius:16px;padding:6px 12px 6px 6px}
.wkart{flex-shrink:0;width:60px;height:60px;border-radius:12px;overflow:hidden;background:#F2E3C6;display:grid;place-items:center}
.wkart{position:relative}.wkart img{width:100%;height:100%;object-fit:cover}.wkart svg{display:block;position:relative}.wkemo{font-size:28px}
.wkartr{position:absolute;right:3px;bottom:3px;width:26px;height:26px;border-radius:7px;background:rgba(255,253,247,.92);box-shadow:0 1px 3px rgba(0,0,0,.3);overflow:hidden}
.wkartn{position:absolute;left:3px;top:3px;font-size:11px;font-weight:400;font-family:var(--display);background:rgba(31,42,68,.78);color:#fff;border-radius:8px;padding:0 5px;line-height:17px}
.wkmapart{background-color:#EEF0E6;background-image:radial-gradient(ellipse 22px 15px at 18% 78%,#CFE5BF 98%,transparent),radial-gradient(ellipse 14px 10px at 82% 22%,#C9DEF0 98%,transparent),linear-gradient(28deg,transparent 46%,#fff 46%,#fff 54%,transparent 54%),linear-gradient(-62deg,transparent 47%,#fff 47%,#fff 52%,transparent 52%),linear-gradient(90deg,transparent 64%,rgba(255,255,255,.8) 64%,rgba(255,255,255,.8) 67%,transparent 67%),linear-gradient(0deg,transparent 30%,rgba(255,255,255,.8) 30%,rgba(255,255,255,.8) 33%,transparent 33%);border:1px solid #DCD6C4}
.wkartk{position:absolute;left:3px;top:2px;font-size:13px;font-weight:400;line-height:1}
.wkrt{flex:1;min-width:0;display:flex;flex-direction:column}.wkrt b{font-family:var(--display);font-weight:400;font-size:16px;color:var(--navy);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wkrt small{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wkrow em{font-style:normal;font-size:20px;color:var(--muted)}
.wkempty{display:flex;align-items:center;gap:10px;background:var(--card2);border-radius:16px;padding:10px 12px}.wkempty p{margin:0;font-size:13px;line-height:1.55}.wkempty b{color:var(--red)}
.wkch{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.wkch b{font-family:var(--display);font-weight:400;font-size:17px;color:var(--navy)}
.wkch button{width:40px;height:36px;border:1.5px solid var(--line);border-radius:12px;background:#FFFDF7;font-size:18px}.wkch button:disabled{opacity:.3}
.wkcg{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center}
.wkcg em{font-style:normal;font-size:11px;color:var(--muted);padding:2px 0}.wkcg em:first-child{color:var(--red)}
.wkd{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-height:44px;border-radius:10px;padding:3px 0;border:0;background:none;font:inherit}
.wkd b{font-weight:400;font-size:12px;color:var(--muted)}.wkd i{font-style:normal;font-size:13px;line-height:1.2}
.wkd.on{background:#FFF0EC;border:1.5px solid #E6B9B4}.wkd.on b{color:var(--red);font-weight:700}.wkd.td b{text-decoration:underline}.wkd.fu{opacity:.35}
.wkmapwrap{margin-top:12px;border-radius:20px;overflow:hidden;border:1.5px solid var(--line);background:var(--card2)}
.wkmapwrap{position:relative}.wkmap{width:100%;height:260px}
.wkmapfb{display:flex;flex-direction:column;align-items:center;padding:12px;background:#F7EBD3}.wkmapfb small{font-size:12px;color:var(--muted)}
.wkpin{position:relative;display:block;width:46px;height:46px;padding:0;border:3px solid #fff;border-radius:50%;background:var(--card2);box-shadow:0 3px 8px rgba(0,0,0,.35)}
.wkpin img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block}.wkpin span{display:grid;place-items:center;height:100%;font-size:18px}
.wkpin b{position:absolute;left:-6px;top:-6px;min-width:20px;height:20px;padding:0 4px;border-radius:99px;background:var(--navy);color:#fff;font-size:11px;line-height:20px;text-align:center;font-family:var(--body)}
.wkpin::after{content:"";position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);border:6px solid transparent;border-top:8px solid #fff}
.wkpin.sm{width:38px;height:38px}
.wkplace{display:grid;place-items:center;width:44px;height:44px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--red);box-shadow:0 3px 8px rgba(0,0,0,.3);font-size:20px}
.wkdst{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:12px}
.wkdst span{display:flex;flex-direction:column;align-items:center;background:#FFFDF7;border:1.5px solid var(--line);border-radius:16px;padding:8px 2px;text-align:center}
.wkdst i{font-style:normal;font-size:20px}.wkdst b{font-family:var(--display);font-weight:400;font-size:16px;color:var(--navy);word-break:keep-all;line-height:1.2}.wkdst small{font-size:11px;color:var(--muted)}
.wkwx{margin:10px 0 0;font-size:13px;color:var(--muted);word-break:keep-all}
.wkmemo{margin-top:12px;background:#FFFBEA;border:1.5px dashed #E9C46A;border-radius:16px;padding:10px 14px}.wkmemo b{font-family:var(--display);font-weight:400;color:var(--red);font-size:14px}.wkmemo p{margin:4px 0 0;font-size:14px;line-height:1.6}
.wktlist{display:flex;flex-direction:column;gap:6px}
.wktl{display:flex;align-items:center;gap:10px;border-bottom:1px dashed var(--line);padding:4px 0 8px}
.wktn{flex-shrink:0;width:24px;height:24px;border-radius:50%;background:var(--navy);color:#fff;font-size:12px;display:grid;place-items:center}
.wktph{flex-shrink:0;width:64px;height:64px;border:0;padding:0;border-radius:12px;overflow:hidden;background:var(--card2)}.wktph img{width:100%;height:100%;object-fit:cover;display:block}.wktph span{font-size:12px;color:var(--muted)}
.wktx{flex:1;min-width:0;display:flex;flex-direction:column}.wktx b{font-family:var(--display);font-weight:400;font-size:17px;color:var(--navy)}.wktx small{font-size:12px;color:var(--muted)}
.wktx u{text-decoration:none;font-family:var(--body);font-size:11.5px;color:var(--red)}.wktn.off{background:#B9B1A4}
.wktck{flex-shrink:0;width:34px;height:44px;margin:0 -4px 0 -6px;border:0;background:none;padding:0;display:grid;place-items:center}
.wktck i{width:26px;height:26px;border-radius:50%;border:2px solid var(--line);background:#FFFDF7;color:transparent;font-style:normal;font-size:14px;line-height:22px;text-align:center}
.wktck.on i{background:var(--red);border-color:var(--red);color:#fff}.wktl.on{background:#FBE9E4;border-radius:14px}
.wkall{margin-left:6px;border:1.5px solid var(--line);background:#FFFDF7;border-radius:99px;font-size:12px;padding:2px 10px;min-height:30px;color:var(--navy)}
.wksel{position:sticky;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:3;display:flex;flex-wrap:wrap;row-gap:6px;align-items:center;gap:8px;margin-top:10px;background:var(--navy);color:#fff;border-radius:16px;padding:8px 8px 8px 14px;box-shadow:0 6px 16px rgba(31,42,68,.3)}
.wksel[hidden]{display:none}.wksel button.out{background:#fff;color:var(--red)}
.wkrn{margin:10px 0 0;font-size:13px;line-height:1.55;background:#FFFDF7;border:1.5px dashed rgba(31,42,68,.3);border-radius:12px;padding:8px 12px;color:var(--ink)}
.wkrn button{margin-top:6px;display:block;min-height:38px;border-radius:99px;border:1.5px solid var(--navy);background:#fff;color:var(--navy);padding:0 14px;font-size:13px}.wksel b{flex:1 1 100%;font-family:var(--display);font-weight:400;font-size:15px}
.wksel button{min-height:40px;border-radius:99px;border:0;background:var(--red);color:#fff;font-size:13.5px;padding:0 14px;white-space:nowrap}.wksel button[data-wk=tnone]{background:none;border:1.5px solid rgba(255,255,255,.45);padding:0 12px}
.wktpan{flex-shrink:0;width:44px;height:44px;border:1.5px solid var(--line);border-radius:12px;background:#FFFDF7;font-size:18px}
.wkacts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.wkacts .ghost{min-height:46px}.wkacts .wkdel{color:var(--red)}
.wkadd{display:flex;flex-direction:column;gap:8px}
.wkbig{display:grid;grid-template-columns:auto 1fr;column-gap:12px;align-items:center;text-align:left;border:1.5px solid var(--line);background:#FFFDF7;border-radius:18px;padding:12px 14px}
.wkbig i{grid-row:span 2;font-style:normal;font-size:34px}.wkbig b{font-family:var(--display);font-weight:400;font-size:19px;color:var(--navy)}.wkbig small{font-size:12.5px;color:var(--muted);line-height:1.45;word-break:keep-all}
.wkbig.go{background:var(--red);border-color:var(--red)}.wkbig.go b,.wkbig.go small{color:#fff}
.wksum{display:flex;align-items:center;gap:12px;background:#FFF3EF;border:1.5px solid #E6B9B4;border-radius:16px;padding:8px 12px;margin-bottom:12px}
.wksum span{display:flex;flex-direction:column}.wksum b{font-family:var(--display);font-weight:400;font-size:19px;color:var(--navy)}.wksum small{font-size:12px;color:var(--muted)}.wksum svg{flex-shrink:0;background:#F7EBD3;border-radius:12px}
.wkf2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wkf2 .field{margin-bottom:10px}
.wkplb{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:6px}.wkplb .ghost{min-height:40px;font-size:13px;padding:0 4px;white-space:nowrap}
.wkfpin{display:grid;place-items:center;min-width:30px;height:30px;padding:0 6px;border-radius:50% 50% 50% 4px;border:2.5px solid #fff;background:var(--red);color:#fff;font-size:14px;font-weight:700;box-shadow:0 3px 8px rgba(0,0,0,.35)}
.wkpins{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.wkpins button{display:inline-flex;align-items:center;gap:5px;min-height:34px;border:1.5px solid var(--line);background:#FFFDF7;border-radius:99px;padding:0 10px 0 4px;font-size:12.5px;color:var(--ink)}.wkpins b{width:24px;height:24px;border-radius:50%;background:var(--red);color:#fff;display:grid;place-items:center;font-size:12px}.wkpins i{font-style:normal;color:var(--red)}
.wkst{margin:0;font-size:13px;line-height:1.7;background:#F1F7EE;border:1.5px dashed #9CC59A;border-radius:12px;padding:6px 10px;color:var(--ink)}
.wkst.on{background:#FFF6F3;border-color:var(--red)}.wkstb{display:flex;gap:6px;margin-top:6px}.wkstb button{flex:1;min-height:40px;font-size:13px;text-decoration:none;color:var(--navy);border:1.5px solid var(--line);border-radius:99px;background:#fff;padding:0 4px}.wkst .wkstn{display:block;border:0;color:var(--muted);font-size:11.5px;margin:4px 0 0;padding:0}
.wkfp.auto{outline:2px dashed #2E7D5B;outline-offset:-2px}.wkst b{font-family:var(--display);font-weight:400;color:#2E7D5B;font-size:15px}.wkst small{font-size:11px;color:#2E7D5B;border:1px solid #9CC59A;border-radius:8px;padding:0 5px;margin-left:2px}
.wkst button{border:0;background:none;color:var(--red);text-decoration:underline;font-size:12.5px;min-height:32px;padding:0 4px}
.wkfpin.home{background:#2E7D5B!important;border-color:#fff}
.wkgeo{display:block;margin-top:6px;font-size:12.5px;color:#2E7D5B}.wkgeo.none{color:var(--muted)}.wkgeo button{border:0;background:none;color:var(--red);text-decoration:underline;font-size:12.5px;padding:0 4px}
.wksrch{display:flex;gap:6px;margin-top:8px}.wksrch input{flex:1;min-width:0}.wksrch .primary{min-height:44px;padding:0 14px}
.wkres{display:flex;flex-direction:column;margin-top:6px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#FFFDF7}
.wkres button{display:flex;flex-direction:column;align-items:flex-start;text-align:left;border:0;border-bottom:1px dashed var(--line);background:none;padding:8px 12px}.wkres button:last-child{border-bottom:0}.wkres b{font-size:14.5px;color:var(--navy)}.wkres small{font-size:12px;color:var(--muted)}
.wkfps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:8px}
.wkfp{position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--card2)}.wkfp img{width:100%;height:100%;object-fit:cover;display:block}
.wkfp button{position:absolute;right:3px;top:3px;width:26px;height:26px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:12px;line-height:26px;padding:0}
.wkfp small{position:absolute;left:3px;bottom:3px;font-size:11px;color:#fff;background:rgba(0,0,0,.5);border-radius:99px;padding:0 5px}.wkfp.new{outline:2px solid #2E7D5B;outline-offset:-2px}
.wkcard img{width:100%;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,.2);display:block}
.wko{position:fixed;inset:0;z-index:60;background:#0E1424;color:#fff;display:flex;flex-direction:column;padding:max(8px,env(safe-area-inset-top)) 0 max(10px,env(safe-area-inset-bottom))}
.wko[hidden]{display:none}
.wktop{display:flex;align-items:center;gap:10px;padding:0 12px 8px}.wktop b{font-family:var(--display);font-weight:400;font-size:19px}
.wkx{width:44px;height:40px;border-radius:12px;border:1.5px solid rgba(255,255,255,.35);background:none;color:#fff;font-size:22px;line-height:1}
.wkgps{margin-left:auto;font-size:12px;background:#2E7D5B;border-radius:99px;padding:2px 10px}.wkgps.bad{background:#C8551E}
.wkmapbox{position:relative;flex:1;min-height:200px;margin:0 12px;border-radius:20px;overflow:hidden;background:#1C2640}
.wklmap{position:absolute;inset:0}
.wkwait{position:absolute;left:0;right:0;top:45%;text-align:center;margin:0;font-size:14px;opacity:.85;pointer-events:none}
.wkme-b{position:absolute;right:10px;bottom:10px;z-index:3;width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:var(--navy);font-size:22px;box-shadow:0 3px 8px rgba(0,0,0,.35)}
.wkme{display:block;width:20px;height:20px;border-radius:50%;background:#2F7BEA;border:3px solid #fff;box-shadow:0 0 0 0 rgba(47,123,234,.5);animation:wkpulse 1.6s infinite}
@keyframes wkpulse{0%{box-shadow:0 0 0 0 rgba(47,123,234,.55)}70%{box-shadow:0 0 0 16px rgba(47,123,234,0)}100%{box-shadow:0 0 0 0 rgba(47,123,234,0)}}
.wknums{display:grid;grid-template-columns:1.3fr 1fr .7fr;gap:8px;padding:12px 16px 4px;text-align:center}
.wknums span{display:flex;flex-direction:column}.wknums b{font-family:var(--display);font-weight:400;font-size:34px;line-height:1.1;font-variant-numeric:tabular-nums}.wknums small{font-size:12px;opacity:.7}
.wko.paused .wknums b{opacity:.55}
.wksave{display:block;margin:6px 12px 0;width:calc(100% - 24px);min-height:44px;border-radius:14px;border:1.5px solid #E8C770;background:#FFF3D0;color:#5A4210;font-size:14px;font-weight:700}.wksave[hidden]{display:none}
.wkbtns{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:8px 12px}
.wkbtns button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:64px;border-radius:16px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.06);color:#fff;font-size:13px;word-break:keep-all}
.wkbtns i{font-style:normal;font-size:22px;line-height:1}.wkbtns .end{background:var(--red);border-color:var(--red)}
.wknote{margin:2px 16px 0;font-size:11.5px;opacity:.7;line-height:1.5;word-break:keep-all}
.wkpocket{position:absolute;inset:0;z-index:5;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;touch-action:none;user-select:none;-webkit-user-select:none}
.wkpocket[hidden]{display:none}
.wkpocket b{font-family:var(--display);font-weight:400;font-size:64px;color:#556;font-variant-numeric:tabular-nums}.wkpocket span{font-size:22px;color:#445}.wkpocket small{font-size:13px;color:#334;margin-top:24px}
.wkring{position:absolute;width:120px;height:120px;border-radius:50%;border:4px solid #334;opacity:0;transform:scale(.6);transition:none;pointer-events:none}
.wkpocket.hold .wkring{opacity:1;transform:scale(1.4);transition:transform 2s linear,opacity .2s}
.wkunlock{position:absolute;left:50%;bottom:calc(9% + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:96px;height:96px;border-radius:50%;border:2px dashed #334;display:grid;place-items:center;text-align:center;color:#445;font-size:13px;line-height:1.2}.wkunlock .wkring{width:96px;height:96px;left:0;top:0;transform:scale(.8)}.wkunlock span{pointer-events:none}
html.wk-open,html.wk-open body{overflow:hidden}
.wkpill{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 8px);transform:translateX(-50%);z-index:9;display:flex;align-items:center;gap:6px;border:0;border-radius:99px;background:var(--navy);color:#fff;padding:7px 14px;font-size:13.5px;box-shadow:0 4px 12px rgba(0,0,0,.3);white-space:nowrap;font-variant-numeric:tabular-nums}
.wkpill[hidden],#sheet.open~.wkpill{display:none}.wkpill.done{background:var(--red)}.wkpill i{font-style:normal}`;
document.head.appendChild(css);
window.WALK = { edit: openForm, home, setHome, rowHtml, pinPhoto, formWith, courses, courseSheet, render: render_, mount, heroHtml, sectionHtml, afterRender, close, photoPos, photos, routes, track, all, open, start, openAdd, routeSvg, kindOf, stats, km: distM };
})();
