// 소은이 탐험 지도 — 동네 탐문 탭의 첫 화면(S.tab='town', S.townView=''). 사건 앨범 도구 칸에선 안쪽 화면(S.view='explore')으로도 열려요
// 위치: 앨범 문서(mom)의 geo "위도,경도" — 올릴 때 사진 EXIF(album.js, 안드로이드는 대개 지워서 넘겨줘요), 직접 꽂기(setGeo),
//       탐문 기록(walk.js)에서 찍은 시각으로 찾은 자리(WALK.photoPos, 저장 안 함). geo '-'는 "위치 빼기"(탐문 자리도 안 씀). 200m 안의 사진은 같은 곳
// 동네 이름·시·군은 카카오 지도 주소 변환(coord2RegionCode)으로 찾아 이 폰에 기억(localStorage soeun-geo-rg). 지도 SDK는 병원 수사와 같이 씀(HOSP.sdk)
// 지도엔 사진 핀(곳)과 탐문 경로(산책길)를 같이 그려요. 위의 단추로 켜고 꺼요(이 폰에 기억 soeun-ex-layer)
(function () {
const X = { psel: new Set(), days: 0, course: null, pick: [], back: null, pickAll: false, more: 30, mapErr: '', fitN: -1, regions: null, regLoading: false, pickPos: null, sel: new Set(), listN: 60, layer: { ph: true, wk: true } };
try { Object.assign(X.layer, JSON.parse(localStorage.getItem('soeun-ex-layer') || '{}')); } catch (e) {}
let map = null, mapEl = null, mapLoading = false, overlays = [], lines = [], lastSig = '', geocoder = null, pickMap = null, pickMarker = null;
const RGK = 'soeun-geo-rg';
let RG = {}; try { RG = JSON.parse(localStorage.getItem(RGK) || '{}') || {}; } catch (e) {}
const saveRG = () => { try { localStorage.setItem(RGK, JSON.stringify(RG)); } catch (e) {} };
const GW = ['춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군', '양구군', '인제군', '고성군', '양양군'];
const SEA = ['강릉시', '동해시', '속초시', '삼척시', '고성군', '양양군'];
const SIDO = { 서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 광주광역시: '광주', 대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종', 경기도: '경기', 강원특별자치도: '강원', 강원도: '강원', 충청북도: '충북', 충청남도: '충남', 전북특별자치도: '전북', 전라북도: '전북', 전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주' };
const sido = s => SIDO[s] || s || '';
const isGW = s => /강원/.test(s || '');
const parse = g => { const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(g || ''); return m ? { lat: +m[1], lng: +m[2] } : null; };
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r, x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const rkey = p => p.lat.toFixed(3) + ',' + p.lng.toFixed(3);
const canWrite = () => !(S.me && S.me.viewer);
const $ = id => document.getElementById(id);
const WDK = '일월화수목금토', wdOf = d => WDK[new Date(pd(d)).getUTCDay()];
const walkPos = () => window.WALK ? WALK.photoPos() : new Map();

// ---------- 장소 ----------
// 사진의 자리: 저장된 위치 → 탐문 기록에서 찾은 자리 (walk: true)
function geoPhotos() {
  const D = walkPos();
  return (S.moments || []).filter(m => m.photo).map(m => {
    const own = parse(m.geo), p = own || (m.geo !== '-' && D.get(m.id));
    return p ? { id: m.id, date: m.date, tm: /^\d\d:\d\d/.test(m.tm || '') ? m.tm.slice(0, 5) : '', p: { lat: p.lat, lng: p.lng }, by: m.by, walk: !own } : null;
  }).filter(Boolean).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}
let memo = null;
function places() {
  if (memo && memo.src === S.moments && memo.w === S.walks) return memo.P;
  const P = [];
  geoPhotos().forEach(ph => {
    let best = null, bd = 1e9; for (const pl of P) { const d = km(pl.c, ph.p); if (d < bd) { bd = d; best = pl; } }
    if (best && bd <= 0.2) { best.photos.push(ph); best.days.add(ph.date); }
    else P.push({ c: ph.p, photos: [ph], days: new Set([ph.date]), first: ph.date });
  });
  P.forEach((pl, i) => { pl.i = i; pl.n = pl.photos.length; pl.last = pl.photos[pl.n - 1].date; });
  // 본부(집): 다녀간 날이 가장 많은 곳 (사진 3장 이상)
  const home = P.slice().sort((a, b) => b.days.size - a.days.size || b.n - a.n)[0];
  if (home && home.n >= 3) home.home = true;
  memo = { src: S.moments, w: S.walks, P };
  return P;
}
const homeOf = P => P.find(p => p.home) || null;
// 시·군 (카카오 주소 변환, 지도를 못 쓰면 가장 가까운 강원 시·군 가운데 25km 안이면 그곳으로 짐작)
function regionOf(pl) {
  const r = RG[rkey(pl.c)]; if (r && (r.g || r.x)) return r;
  if (X.regions) { const n = X.regions.map(x => ({ x, d: km(pl.c, x) })).sort((a, b) => a.d - b.d)[0]; if (n && n.d <= 25) return { s: '강원특별자치도', g: n.x.name, d: '', guess: 1 }; }
  return null;
}
function label(pl) { if (pl.home) return '본부 (우리 집)'; const r = regionOf(pl); return r && r.d ? `${r.d}` : r && r.g ? `${r.g} 어딘가` : '이름 모를 곳'; }
const shown = () => S.view === 'explore' || (S.tab === 'town' && !S.view && S.townView !== 'info');
function ensureRegions() {
  if (X.regions || X.regLoading) return; X.regLoading = true;
  fetch('data/regions.json').then(r => r.json()).then(j => { X.regions = (j.regions || []).filter(r => r.lat && r.lng); if (shown()) render(); }).catch(() => { X.regions = []; }).finally(() => { X.regLoading = false; });
}
function resolve() {
  if (!geocoder) return;
  const todo = places().filter(pl => !RG[rkey(pl.c)]).slice(0, 25); if (!todo.length) return;
  let left = todo.length;
  todo.forEach(pl => geocoder.coord2RegionCode(pl.c.lng, pl.c.lat, (res, st) => {
    if (st === kakao.maps.services.Status.OK && res && res.length) { const r = res.find(x => x.region_type === 'H') || res[0]; RG[rkey(pl.c)] = { s: r.region_1depth_name || '', g: r.region_2depth_name || '', d: r.region_3depth_name || '' }; }
    else RG[rkey(pl.c)] = { s: '', g: '', d: '', x: 1 };
    if (--left === 0) { saveRG(); if (shown()) render(); }
  }));
}
// 영상(총정리)처럼 지도 화면을 안 열었을 때도 동네 이름을 찾아 둬요 (지도 SDK가 늦으면 기다리지 않고 그냥 넘어가요)
async function prepare(ms = 4000) {
  ensureRegions();
  const P = places().filter(pl => !RG[rkey(pl.c)]);
  if (!P.length || !window.HOSP || !HOSP.sdk) return;
  const wait = t => new Promise(r => setTimeout(r, t));
  try { await Promise.race([HOSP.sdk(), wait(ms)]); } catch (e) { return; }
  if (!window.kakao || !kakao.maps || !kakao.maps.services) return;
  if (!geocoder) geocoder = new kakao.maps.services.Geocoder();
  await Promise.race([Promise.all(P.slice(0, 25).map(pl => new Promise(res => geocoder.coord2RegionCode(pl.c.lng, pl.c.lat, (r, st) => {
    if (st === kakao.maps.services.Status.OK && r && r.length) { const x = r.find(y => y.region_type === 'H') || r[0]; RG[rkey(pl.c)] = { s: x.region_1depth_name || '', g: x.region_2depth_name || '', d: x.region_3depth_name || '' }; }
    res();
  })))), wait(ms)]);
  saveRG();
}
function stamps(P) {
  const on = {}, away = new Map();
  P.slice().sort((a, b) => a.first < b.first ? -1 : 1).forEach(pl => {
    const r = regionOf(pl); if (!r || !r.g) return;
    if (isGW(r.s)) { if (!on[r.g]) on[r.g] = { first: pl.first, guess: !!r.guess }; }
    else if (r.s) { const k = `${sido(r.s)} ${r.g}`; if (!away.has(k)) away.set(k, pl.first); }
  });
  return { gw: GW.map(name => ({ name, on: on[name] || null })), away: [...away.entries()] };
}
const BADGES = [
  ['out1', '🚪', '첫 외출', '본부 말고 다른 곳에서 찍은 사진', (P, st, h) => !!h && P.some(p => !p.home)],
  ['pl5', '🧭', '꼬마 탐험가', '다녀간 곳 5곳', P => P.length >= 5],
  ['pl10', '🗺️', '베테랑 탐험가', '다녀간 곳 10곳', P => P.length >= 10],
  ['pl30', '🌏', '전설의 탐험가', '다녀간 곳 30곳', P => P.length >= 30],
  ['sg3', '🏞️', '도장 3개', '강원 시·군 도장 3개', (P, st) => st.gw.filter(x => x.on).length >= 3],
  ['sg9', '⛰️', '강원 절반 정복', '강원 시·군 도장 9개', (P, st) => st.gw.filter(x => x.on).length >= 9],
  ['sg18', '🏆', '강원 완전 정복', '강원 18개 시·군 도장', (P, st) => st.gw.every(x => x.on)],
  ['sea', '🌊', '동해 바다 탐험', '강릉·속초·동해·삼척·양양·고성 중 한 곳', (P, st) => st.gw.some(x => x.on && SEA.includes(x.name))],
  ['away', '✈️', '강원 밖 첫 여행', '강원 밖에서 찍은 사진', (P, st) => st.away.length > 0],
  ['far', '🚗', '100km 대모험', '본부에서 100km 넘게 떨어진 곳', (P, st, h) => !!h && P.some(p => km(h.c, p.c) >= 100)]
];

// ---------- 지도 (사진 핀 + 산책길) ----------
function mount() {
  const slot = $('exmap-slot'); if (!slot) return;
  if (!mapEl) { mapEl = document.createElement('div'); mapEl.className = 'exmap'; }
  if (!mapEl.closest('.mapfull')) slot.appendChild(mapEl);   // 크게 보기 중이면 그대로
  if (map) { map.relayout(); sync(); return; }
  if (mapLoading || X.mapErr || !window.HOSP || !HOSP.sdk) return;
  mapLoading = true;
  HOSP.sdk().then(() => {
    mapLoading = false; geocoder = new kakao.maps.services.Geocoder();
    const R = window.WALK ? WALK.routes() : [], c = places()[0] ? places()[0].c : R[0] ? R[0].T.pts[0] : { lat: 37.3422, lng: 127.9202 };
    map = new kakao.maps.Map(mapEl, { center: new kakao.maps.LatLng(c.lat, c.lng), level: 7 });
    onTap(mapEl, map, ll => pinTap(map, ll) || nearTap(ll));   // 핀 놓기 중이면 누른 곳으로, 아니면 그 근처를 지난 탐문 기록 목록
    lastSig = ''; X.fitN = -1; sync(); resolve();
  }).catch(() => { mapLoading = false; X.mapErr = 'fail'; if (shown()) render(); });
}
function sync() {
  if (!map) return;
  const P = places(), R = window.WALK ? WALK.routes() : [], CS = window.WALK ? WALK.courses(X.days) : [];
  const sig = `${X.layer.ph ? 1 : 0}${X.layer.wk ? 1 : 0}${X.days}${X.course}|` + P.map(p => `${p.c.lat},${p.c.lng},${p.n},${safeImg(PHOTOS[p.photos[p.n - 1].id]) ? 1 : 0}`).join('|') + '|' + R.map(r => r.w.id + r.T.pts.length).join(',');
  if (sig === lastSig) return; lastSig = sig;
  overlays.forEach(o => o.setMap(null)); overlays = []; lines.forEach(o => o.setMap(null)); lines = [];
  const bounds = new kakao.maps.LatLngBounds(); let n = 0;
  // 산책길: 거의 같은 길은 한 코스로 묶어 대표 길 하나만 (많이 걸을수록 굵게). 코스를 고르면 그 코스의 길만 겹쳐서
  const LL = T => T.pts.map(p => new kakao.maps.LatLng(p.lat, p.lng));
  const badge = (pos, txt, label, fn) => { const el = document.createElement('button'); el.type = 'button'; el.className = 'exwk'; el.textContent = txt; el.setAttribute('aria-label', label); el.addEventListener('click', ev => { ev.stopPropagation(); fn(); }); lines.push(new kakao.maps.CustomOverlay({ map, position: pos, content: el, yAnchor: .5, clickable: true, zIndex: 3 })); };
  const sel = X.course != null ? CS[X.course] : null;
  if (X.layer.wk && sel) {
    sel.walks.forEach(w => { const T = WALK.track(w); if (!T || T.pts.length < 2) return; const path = LL(T), line = new kakao.maps.Polyline({ map, path, strokeWeight: 4, strokeColor: '#B3261E', strokeOpacity: .35 }); kakao.maps.event.addListener(line, 'click', ev => { lineHit = Date.now(); const ws = ev && ev.latLng ? nearWalks(ev.latLng).filter(x => sel.walks.includes(x)) : []; if (ws.length > 1) nearSheet(ws); else WALK.open(w.id); }); lines.push(line); path.forEach(ll => bounds.extend(ll)); n++; });
    const path = LL(sel.T); lines.push(new kakao.maps.Polyline({ map, path, strokeWeight: 7, strokeColor: '#1F2A44', strokeOpacity: .85 }));
    badge(path[0], `🐾${sel.n}`, `${sel.name} 코스`, () => WALK.courseSheet(sel.i, X.days));
  } else if (X.layer.wk) CS.forEach(g => {
    const path = LL(g.T), line = new kakao.maps.Polyline({ map, path, strokeWeight: 4 + Math.min(g.n, 6), strokeColor: '#B3261E', strokeOpacity: g.n > 1 ? .8 : .55 });
    const go = () => g.n > 1 ? WALK.courseSheet(g.i, X.days) : WALK.open(g.rep.id);
    kakao.maps.event.addListener(line, 'click', ev => { lineHit = Date.now(); const ws = ev && ev.latLng ? nearWalks(ev.latLng) : []; if (ws.length > 1 && ws.some(w => !g.walks.includes(w))) nearSheet(ws); else go(); });   // 다른 코스와 겹친 곳이면 겹친 기록 목록 lines.push(line); path.forEach(ll => bounds.extend(ll)); n++;
    badge(path[0], g.n > 1 ? `🐾${g.n}` : WALK.kindOf(g.rep.kind)[1], g.n > 1 ? `${g.name} ${g.n}번` : `${fmtMD(g.rep.date)} 탐문 보기`, go);
  });
  if (X.layer.ph) P.forEach(pl => {
    const el = document.createElement('button'), ph = safeImg(PHOTOS[pl.photos[pl.n - 1].id]);
    el.type = 'button'; el.className = 'expin' + (pl.home ? ' home' : ''); el.setAttribute('aria-label', label(pl));
    el.innerHTML = `${ph ? `<img src="${ph}" alt="">` : '<span>📷</span>'}<b>${pl.home ? '🏠' : pl.n}</b>`;
    const pos = new kakao.maps.LatLng(pl.c.lat, pl.c.lng);
    el.addEventListener('click', ev => { ev.stopPropagation(); if (pinTap(map, pos)) return; openPlace(pl.i); });   // 핀 자리 정하는 중이면 이곳으로 모아요
    const ov = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1.15, clickable: true, zIndex: 5 });
    ov.setMap(map); overlays.push(ov); bounds.extend(pos); n++;
  });
  if (P.some(pl => !RG[rkey(pl.c)])) resolve();   // 새로 생긴 곳(탐문 사진 등)의 동네 이름
  const fit = P.length + R.length * 1000 + X.days * 7 + (X.course == null ? 0 : 99 + X.course);
  if (X.fitN !== fit && n) { X.fitN = fit; if (n === 1 && P.length === 1 && !R.length) { map.setCenter(new kakao.maps.LatLng(P[0].c.lat, P[0].c.lng)); map.setLevel(5); } else map.setBounds(bounds, 50, 40, 40, 40); }
}
// 지도를 누른 곳 근처(손가락 22px 안)를 지난 탐문 기록 — 길이 겹쳐도 목록으로 골라 들어가요
let lineHit = 0;
function segD(a, b) {   // (0,0)에서 선분 a-b까지 거리
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / L2)) : 0;
  return Math.hypot(a[0] + t * dx, a[1] + t * dy);
}
function nearWalks(ll) {
  if (!map || !window.WALK) return [];
  const c = { lat: ll.getLat(), lng: ll.getLng() };
  let tol = 40; try { const pr = map.getProjection(), pt = pr.containerPointFromCoords(ll), q = pr.coordsFromContainerPoint(new kakao.maps.Point(pt.x + 22, pt.y)); tol = Math.max(12, km(c, { lat: q.getLat(), lng: q.getLng() }) * 1000); } catch (e) {}
  const kx = Math.cos(c.lat * Math.PI / 180) * 111320, P = p => [(p.lng - c.lng) * kx, (p.lat - c.lat) * 110540];
  const from = X.days ? addDays(today(), -X.days) : '', CS = X.course != null && WALK.courses(X.days)[X.course];
  return WALK.all().filter(w => {
    if (w.date < from || (CS && !CS.walks.includes(w))) return false;
    const T = WALK.track(w);
    if (T && T.pts.length > 1) { let prev = P(T.pts[0]); for (let i = 1; i < T.pts.length; i++) { const cur = P(T.pts[i]); if (segD(prev, cur) <= tol) return true; prev = cur; } return false; }
    const g = parse(w.geo); return !!g && km(g, c) * 1000 <= tol * 1.5;
  });
}
function nearSheet(ws) {
  openSheet(`<h3>🐾 이 근처 탐문 기록 ${ws.length}개</h3><p class="hint">누르면 탐문 보고서로 가요. 사진 핀·길·내용은 거기서 고쳐요.</p><div class="wklist">${ws.slice(0, 40).map(WALK.rowHtml).join('')}</div>${ws.length > 40 ? '<p class="foot">최근 40개만 보여요</p>' : ''}<div class="actions"><button class="secondary" data-act="close">닫기</button></div>`);
}
function nearTap(ll) {
  if (!X.layer.wk) return;
  setTimeout(() => { if (Date.now() - lineHit < 600) return; const ws = nearWalks(ll); if (ws.length) nearSheet(ws); }, 90);   // 길을 눌렀으면 길 쪽이 먼저
}
function focus(i) { const pl = places()[i]; if (!map || !pl) return; closeSheet(); map.setCenter(new kakao.maps.LatLng(pl.c.lat, pl.c.lng)); map.setLevel(4); const w = $('exmap-slot'); if (w) w.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

// ---------- 화면 ----------
function render_(mode) {
  ensureRegions();
  const tab = mode === 'tab', P = places(), h = homeOf(P), st = stamps(P), R = window.WALK ? WALK.routes() : [], D = walkPos();
  const noGeo = (S.moments || []).filter(m => m.photo && !parse(m.geo) && !(m.geo !== '-' && D.has(m.id))).length;
  const firsts = P.filter(p => !p.home).sort((a, b) => a.first < b.first ? 1 : a.first > b.first ? -1 : 0);
  const got = BADGES.map(b => ({ b, on: (() => { try { return b[4](P, st, h); } catch (e) { return false; } })() }));
  const nStamp = st.gw.filter(x => x.on).length, nWalk = (S.walks || []).length;
  const CS = window.WALK ? WALK.courses(X.days) : [], sel = X.course != null ? CS[X.course] : null;
  const layers = `<div class="exlayer">${P.length && R.length ? [['ph', '📷 사진'], ['wk', '🐾 산책길']].map(([k, l]) => `<button class="${X.layer[k] ? 'on' : ''}" data-xp="layer" data-v="${k}" aria-pressed="${X.layer[k]}">${l}</button>`).join('') : ''}${R.length ? `<button class="${X.days ? 'on' : ''}" data-xp="days">${X.days ? '최근 30일' : '전체 기간'}</button>` : ''}${sel ? `<button class="on" data-xp="course" data-v="">${esc(sel.name)} ✕</button>` : ''}</div>`;
  const tools = '<div class="mtools"><button data-xp="loc" aria-label="내 위치">◎</button><button data-xp="full" aria-label="크게 보기">⛶</button></div>';
  const AC = window.WALK ? WALK.courses(0).filter(g => g.n > 1) : [];
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>${esc(CV.nick())} 탐험 지도</h1><p>산책·나들이로 다녀간 곳을 모아요. 처음 가 본 시·군엔 도장 꽝!</p></header>
  ${tab ? townSeg('') : ''}${window.WALK ? WALK.heroHtml() : ''}
  <div class="exsum"><span><b>${P.length}</b>곳 탐험</span><span><b>${nStamp}</b>/18 시·군 도장</span><span><b>${nWalk}</b>번 탐문</span></div>
  ${P.length || R.length ? `<div class="exmapwrap" data-noswipe><div id="exmap-slot"></div>${layers}${tools}${X.mapErr ? '<p class="vempty" style="padding:12px">지도를 불러오지 못했어요. 아래 목록으로 볼 수 있어요.</p>' : ''}</div>`
    : `<div class="exempty">${CHARS.svg('baby', 'lens', { size: 88 })}<p>아직 지도에 꽂힌 곳이 없어요.<br>산책할 땐 <b>🚶 탐문 출동</b>! 걸은 길과 찍은 사진이 지도에 꽂혀요.${noGeo && canWrite() ? '<br>이미 올린 사진은 아래 "사진 위치 직접 꽂기"로 꽂아요.' : ''}</p></div>`}
  ${tab ? CHARS.guide('walk') : ''}
  ${window.WALK ? WALK.sectionHtml() : ''}
  ${AC.length ? `<section><h2 class="sh"><span>🔁 단골 코스</span><span>${AC.length}개</span></h2><p class="foot" style="margin:0 0 8px">거의 같은 길로 여러 번 걸은 탐문은 한 코스로 묶어요. 지도에선 코스마다 길 하나만 그리고 많이 걸을수록 굵게, 🐾 숫자는 걸은 횟수예요.</p>
    <div class="wklist">${AC.map(g => `<button class="wkrow" data-xp="csheet" data-v="${g.i}"><span class="wkart">${WALK.routeSvg(g.T.pts, 60, 60)}</span><span class="wkrt"><b>${esc(g.name)}</b><small>${g.n}번 · 평균 ${g.m >= 1000 ? (g.m / 1000).toFixed(1) + 'km' : g.m + 'm'} · 마지막 ${fmtK(g.last, true)}</small></span><em>›</em></button>`).join('')}</div></section>` : ''}
  ${firsts.length || h ? `<section><h2 class="sh"><span>처음 가 본 곳</span><span>${firsts.length}곳</span></h2>
    <div class="exlist">${firsts.slice(0, X.more).map(pl => { const r = regionOf(pl), ph = safeImg(PHOTOS[pl.photos[pl.n - 1].id]); return `<button class="exrow" data-xp="place" data-v="${pl.i}">${ph ? `<img src="${ph}" alt="" loading="lazy" decoding="async">` : '<span class="exnoph">📷</span>'}<span class="exrt"><b>${esc(label(pl))}</b><small>${r && r.g ? `${esc(sido(r.s))} ${esc(r.g)}${r.guess ? ' (짐작)' : ''} · ` : ''}첫 방문 ${fmtK(pl.first, true)} · 사진 ${pl.n}장${pl.days.size > 1 ? ` · ${pl.days.size}번 방문` : ''}</small></span><em>›</em></button>`; }).join('')}
    ${h ? `<button class="exrow home" data-xp="place" data-v="${h.i}"><span class="exnoph">🏠</span><span class="exrt"><b>본부 (우리 집)</b><small>사진이 가장 많은 곳 · 사진 ${h.n}장</small></span><em>›</em></button>` : ''}</div>
    ${firsts.length > X.more ? `<button class="addperiod" data-xp="more">더 보기 (${firsts.length - X.more}곳 남음)</button>` : ''}</section>` : ''}
  <section><h2 class="sh"><span>강원 시·군 도장판</span><span>${nStamp}/18</span></h2>
    <div class="exstamps">${st.gw.map(x => `<span class="exst${x.on ? ' on' : ''}"><b>${x.name.replace(/(시|군)$/, '')}</b>${x.on ? `<i>탐험</i><small>${fmtMD(x.on.first)}${x.on.guess ? '?' : ''}</small>` : '<small>미탐험</small>'}</span>`).join('')}</div>
    ${st.away.length ? `<p class="exaway"><b>강원 밖</b> ${st.away.map(([k, d]) => `<span>${esc(k)} <small>${fmtMD(d)}</small></span>`).join('')}</p>` : ''}</section>
  <section><h2 class="sh"><span>탐험 배지</span><span>${got.filter(x => x.on).length}/${BADGES.length}</span></h2>
    <div class="exbadges">${got.map(({ b, on }) => `<span class="exbd${on ? ' on' : ''}"><i>${b[1]}</i><b>${b[2]}</b><small>${b[3]}</small></span>`).join('')}</div></section>
  <section><h2 class="sh"><span>위치 없는 사진</span><span>${noGeo}장</span></h2>
    <p class="foot" style="margin:0 0 10px">안드로이드는 갤러리에서 고른 사진의 위치를 지워서 넘겨줘요(폰의 개인정보 보호라 앱에서 못 바꿔요). 그래서 <b>🚶 탐문 출동</b>으로 걸으면 찍은 시각으로 경로 위 자리를 찾아 꽂아요. 이미 올린 사진은 여러 장 골라 한 번에 꽂을 수 있어요.</p>
    ${canWrite() ? `<button class="ghost" data-xp="pin" style="width:100%">📍 사진 위치 직접 꽂기</button>` : ''}</section>
  ${tab ? (canWrite() ? '<button class="fab" data-wk="add">+ 탐문 기록</button>' : '') : '<button class="secondary" data-xp="close" style="width:100%;margin-top:16px">돌아가기</button>'}`;
}
// 지도 핀을 누르면: 그곳 사진 + 핀 옮기기·빼기
function openPlace(i) {
  const pl = places()[i]; if (!pl) return; X.psel = new Set();
  const r = regionOf(pl), cw = canWrite(), nW = pl.photos.filter(ph => ph.walk).length, ids = new Set(pl.photos.map(ph => ph.id));
  // 여기 겹친 탐문 기록들: 그 기록 사진이 이곳에 있거나, 기록 장소가 200m 안
  const recs = window.WALK ? WALK.all().filter(w => WALK.photos(w).some(m => ids.has(m.id)) || (parse(w.geo) && km(parse(w.geo), pl.c) <= .2)) : [];
  openSheet(`<h3>${pl.home ? '🏠 본부 (우리 집)' : '📍 ' + esc(label(pl))}</h3>
    <p class="hint">${r && r.g ? `${esc(sido(r.s))} ${esc(r.g)}${r.d && !pl.home ? ' ' + esc(r.d) : ''} · ` : ''}첫 방문 ${fmtK(pl.first, true)} · ${pl.days.size}번 방문 · 사진 ${pl.n}장</p>
    ${recs.length ? `<h4 class="exsub">🐾 이곳의 탐문 기록 <span>${recs.length}</span></h4><p class="foot" style="margin:0 0 6px">누르면 탐문 보고서로 가요. 사진 핀·내용은 거기서 고쳐요.</p><div class="wklist exrecs">${recs.slice(0, 8).map(WALK.rowHtml).join('')}</div>` : ''}
    <h4 class="exsub">📷 이곳 사진 <span>${pl.n}</span></h4>
    <section class="exsheet" data-vpin="place"><div class="exgrid">${pl.photos.slice().reverse().map(ph => { const u = safeImg(PHOTOS[ph.id]); return `<div class="excell"><button class="exph" data-view="${esc(ph.id)}">${u ? `<img src="${u}" alt="" loading="lazy" decoding="async">` : '<span>사진</span>'}<small>${fmtMD(ph.date)}${ph.tm ? ' ' + ph.tm : ''}${ph.walk ? ' 🐾' : ''}</small></button>${cw ? `<button class="expinb" data-xp="pchk" data-v="${esc(ph.id)}" aria-label="고르기"><i>✓</i></button>` : ''}</div>`; }).join('')}</div></section>
    ${cw ? `<p class="foot" style="margin:0 0 8px">사진을 누르면 크게 보고, 오른쪽 위 동그라미로 골라요. 고른 사진만 옮기거나 빼요.${nW ? ' 🐾는 탐문 경로에서 찍은 시각으로 찾은 자리예요.' : ''}</p>
      <div class="explact" data-pl="${i}"><button class="ghost" data-xp="plmove" data-v="${i}">📍 이곳 핀 모두 옮기기</button><button class="ghost exdanger" data-xp="plunpin" data-v="${i}">이곳 핀 모두 빼기</button></div>
      <p class="foot" style="margin:0 0 6px">옮기기를 누르면 이 창이 닫히고, 지도에서 새 자리를 누르면 돼요.</p>` : ''}
    <div class="actions"><button class="secondary" data-act="close">닫기</button>${map ? `<button class="ghost" data-xp="focus" data-v="${i}">지도에서 보기</button>` : ''}</div>`);
}

// ---------- 직접 꽂기 (여러 장 한 번에) ----------
const hasPos = m => !!parse(m.geo) || (m.geo !== '-' && walkPos().has(m.id));
function pinList() {
  const L = (S.moments || []).filter(m => m.photo && safeImg(PHOTOS[m.id]) && (X.pickAll || !hasPos(m))).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const show = L.slice(0, X.listN), G = [];
  show.forEach(m => { let g = G[G.length - 1]; if (!g || g.d !== m.date) G.push(g = { d: m.date, items: [] }); g.items.push(m); });
  return `<h3>사진 위치 꽂기</h3>
    <p class="hint">꽂을 사진을 골라요. 같은 곳에서 찍은 사진은 여러 장 골라 한 번에 꽂아요. 날짜 옆 "이날 모두"로 하루치를 한꺼번에 골라요.</p>
    <label class="check" style="margin:-4px 0 10px"><input type="checkbox" id="xp-all" ${X.pickAll ? 'checked' : ''}> 위치가 있는 사진도 보기 (고치기)</label>
    ${G.length ? G.map(g => `<div class="expd"><b>${fmtK(g.d, true)} (${wdOf(g.d)})</b><button type="button" data-xp="selday" data-v="${g.d}">이날 모두</button></div><div class="exgrid expick">${g.items.map(m => `<button class="${X.sel.has(m.id) ? 'sel' : ''}" data-xp="tog" data-v="${esc(m.id)}"><img src="${safeImg(PHOTOS[m.id])}" alt="" loading="lazy" decoding="async"><small>${fmtMD(m.date)}${hasPos(m) ? ' 📍' : ''}</small><i>✓</i></button>`).join('')}</div>`).join('') : '<p class="vempty">고를 사진이 없어요.</p>'}
    ${L.length > show.length ? `<button class="addperiod" data-xp="pmore">더 보기 (${L.length - show.length}장 남음)</button>` : ''}
    <div class="actions"><button class="secondary" data-act="close">닫기</button><button class="primary" data-xp="pnext" ${X.sel.size ? '' : 'disabled'}>${X.sel.size ? `고른 ${X.sel.size}장 꽂기 ›` : '사진을 골라요'}</button></div>`;
}
const sheetEl = () => document.getElementById('sheet');
function plBtns() { const box = document.querySelector('.explact[data-pl]'); if (!box) return; const n = X.psel.size, [mv, un] = box.querySelectorAll('button'); mv.textContent = n ? `📍 고른 ${n}장 옮기기` : '📍 이곳 핀 모두 옮기기'; un.textContent = n ? `고른 ${n}장 빼기` : '이곳 핀 모두 빼기'; }
function reopenList() { const sh = sheetEl(), y = sh ? sh.scrollTop : 0; openSheet(pinList()); if (sh) sh.scrollTop = y; }
function nextBtn() { const b = document.querySelector('[data-xp="pnext"]'); if (b) { b.disabled = !X.sel.size; b.textContent = X.sel.size ? `고른 ${X.sel.size}장 꽂기 ›` : '사진을 골라요'; } }
// ids: 사진 하나 또는 여럿, back: { place: 곳 번호 } (핀 창에서 왔으면 돌아가기)
function pinStep(ids, back) {
  const M = [].concat(ids).map(id => (S.moments || []).find(x => x.id === id)).filter(Boolean); if (!M.length) return;
  const one = M.length === 1 ? M[0] : null, D = walkPos();
  X.pick = M.map(m => m.id); X.back = back || null;
  X.pickPos = one ? (parse(one.geo) || (one.geo !== '-' && D.get(one.id)) || null) : null;
  const ds = M.map(m => m.date).sort(), has = M.some(hasPos), fromWalk = one && !parse(one.geo) && one.geo !== '-' && D.has(one.id);
  const what = one ? (parse(one.geo) ? '지금 꽂힌 위치를 바꿔요' : fromWalk ? '탐문 경로에서 찾은 자리예요. 바꾸거나 뺄 수 있어요' : '아직 위치가 없어요') : `${fmtMD(ds[0])}${ds[0] !== ds[ds.length - 1] ? '~' + fmtMD(ds[ds.length - 1]) : ''} 사진을 같은 곳으로 꽂아요`;
  openSheet(`<h3>${one ? '이 사진, 어디서 찍었나요?' : `사진 ${M.length}장, 어디서 찍었나요?`}</h3>
    <div class="expick1">${M.slice(0, 4).map(m => `<img src="${safeImg(PHOTOS[m.id])}" alt="">`).join('')}<span><b>${one ? fmtK(one.date, true) : `${M.length}장`}</b><small>${what}</small></span></div>
    <div class="expickb"><button class="primary" data-xp="here">📍 지금 내 위치로</button><button class="ghost" data-xp="mappick">🗺️ 지도에서 고르기</button></div>
    <div id="expick-slot"></div>
    <p class="err" id="xp-err"></p>
    <div class="actions"><button class="secondary" data-xp="pback">${back ? '돌아가기' : '다른 사진'}</button>${has ? '<button class="danger" data-xp="unpin">위치 빼기</button>' : ''}<button class="primary" data-xp="savepick" id="xp-save" hidden>여기로 저장</button></div>`);
}
async function saveGeo(ids, p) {
  ids = [].concat(ids); if (!ids.length) return;
  const geo = p ? `${p.lat.toFixed(4)},${p.lng.toFixed(4)}` : '-';   // 빼기는 '-' (탐문 경로 자리도 안 써요)
  let res = null;
  for (let i = 0; i < ids.length; i += 400) { res = await write('setGeo', ids.length === 1 ? ids[0] : ids.slice(i, i + 400), geo); if (!res) return; }
  X.sel.clear(); closeSheet(); toast(p ? `사진 ${ids.length > 1 ? ids.length + '장 ' : ''}위치를 꽂았어요 📍` : `사진 ${ids.length > 1 ? ids.length + '장 ' : ''}위치를 뺐어요`);
}
function mapPick() {
  const slot = $('expick-slot'); if (!slot || !window.HOSP) return;
  slot.innerHTML = '<div class="expickmap" id="expick-map"><p class="vempty" style="padding:12px">지도 불러오는 중…</p></div><p class="hint" style="margin:6px 0 0">지도를 눌러 찍은 곳을 골라 주세요.</p>';
  HOSP.sdk().then(() => {
    const el = $('expick-map'); if (!el) return; el.innerHTML = '';
    const P = places(), h = homeOf(P), c = X.pickPos || (h && h.c) || (P[0] && P[0].c) || (window.HOSP && HOSP.regionCenter && HOSP.regionCenter((() => { try { return localStorage.getItem('soeun-hosp-region') || 'wonju'; } catch (e) { return 'wonju'; } })())) || { lat: 37.3422, lng: 127.9202 };
    pickMap = new kakao.maps.Map(el, { center: new kakao.maps.LatLng(c.lat, c.lng), level: X.pickPos ? 4 : 6 });
    pickMarker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(c.lat, c.lng) });
    if (X.pickPos) { pickMarker.setMap(pickMap); const sv = $('xp-save'); if (sv) sv.hidden = false; }
    onTap(el, pickMap, ll => { X.pickPos = { lat: ll.getLat(), lng: ll.getLng() }; pickMarker.setPosition(ll); pickMarker.setMap(pickMap); const sv = $('xp-save'); if (sv) sv.hidden = false; });
  }).catch(() => { const el = $('expick-map'); if (el) el.innerHTML = '<p class="vempty" style="padding:12px">지도를 불러오지 못했어요. "지금 내 위치로"를 써 주세요.</p>'; });
}
// 사진 편집창의 '찍은 곳' 한 줄 (album.js 현장 사진)
function whereHtml(id) {
  const m = (S.moments || []).find(x => x.id === id); if (!m) return '';
  const own = parse(m.geo), wp = !own && m.geo !== '-' && walkPos().get(id), p = own || wp, r = p && RG[rkey(p)];
  const txt = p ? `${wp ? '🐾 탐문 경로에서 찾은 자리' : '📍 ' + (r && (r.d || r.g) ? esc([r.g, r.d].filter(Boolean).join(' ')) : `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`)}` : '위치 없음';
  return `<div class="field"><span>찍은 곳</span><div class="exwhere"><small>${txt}</small>${canWrite() ? `<button type="button" class="ghost" data-xp="pick" data-v="${esc(id)}">${p ? '옮기기·빼기' : '📍 꽂기'}</button>` : ''}</div></div>`;
}

// ---------- 지도를 '톡' 누른 곳 ----------
// 카카오 click이 폰(스크롤되는 창 안 등)에서 안 올 때가 있어, 손가락을 거의 안 움직이고 뗀 순간도 같이 봐요 (먼저 온 하나만)
function onTap(el, m, fn) {
  let last = 0, lastP = null, st = null;
  const px = ll => { try { const p = m.getProjection().containerPointFromCoords(ll); return [p.x, p.y]; } catch (e) { return [ll.getLat() * 1e5, ll.getLng() * 1e5]; } };
  // 같은 '톡'이 두 길(카카오 click·손가락 뗌)로 오면 하나만: 0.45초 안 + 14px 안이면 같은 톡 (빨리 다른 곳을 연달아 누른 건 따로)
  const fire = ll => { if (!ll) return; const p = px(ll); if (Date.now() - last < 450 && lastP && Math.hypot(p[0] - lastP[0], p[1] - lastP[1]) < 14) return; last = Date.now(); lastP = p; fn(ll); };
  kakao.maps.event.addListener(m, 'click', ev => fire(ev && ev.latLng));
  el.addEventListener('pointerdown', e => { st = e.isPrimary && !e.target.closest('button,a,.wkfpin') ? { x: e.clientX, y: e.clientY, t: Date.now() } : null; }, true);
  el.addEventListener('pointerup', e => {
    const s0 = st; st = null; if (!s0 || Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 10 || Date.now() - s0.t > 600) return;
    const pr = m.getProjection && m.getProjection(); if (!pr || !pr.coordsFromContainerPoint) return;
    const r = el.getBoundingClientRect(), pt = new kakao.maps.Point(e.clientX - r.left, e.clientY - r.top);
    setTimeout(() => fire(pr.coordsFromContainerPoint(pt)), 40);
  }, true);
}
// ---------- 지도에서 바로 핀 놓기: 고른 사진들 → 지도를 누른 곳으로 (탐험 지도·탐문 보고서 지도 같이) ----------
const PM = { ids: [], m: null, el: null, done: null, opt: null };
let pbar = null;
// opt.auto: '경로 자리로' 같은 이름이 있으면 '직접 꽂은 자리 지우기'(geo '') 단추도 — 탐문 경로·장소 자리로 돌아가요
function pinMode(ids, m, el, done, opt) {
  if (!m || !ids || !ids.length) return;
  if (PM.done && PM.ids.length) { const f = PM.done; PM.done = null; f(); }
  PM.ids = [...new Set(ids)]; PM.m = m; PM.el = el; PM.done = done || null; PM.opt = opt || null;
  if (!pbar) {
    pbar = document.createElement('div'); pbar.className = 'pinbar'; pbar.hidden = true; pbar.setAttribute('role', 'status');
    document.body.appendChild(pbar);
    pbar.addEventListener('click', e => { const t = e.target.closest('[data-pm]'); if (!t) return; const k = t.dataset.pm; if (k === 'x') pinOff(); else if (k === 'here') pinHere(); else if (k === 'un') pinWrite('-', `사진 ${PM.ids.length}장 핀을 뺐어요`); else if (k === 'auto') pinWrite('', `사진 ${PM.ids.length}장을 ${PM.opt && PM.opt.auto ? PM.opt.auto.replace(/로$/, '') : '처음 자리'}에 다시 꽂았어요 📍`); });
  }
  const n = PM.ids.length;
  pbar.innerHTML = `<b>📍 지도에서 ${n > 1 ? `사진 ${n}장의` : '이 사진의'} 새 자리를 눌러요</b><small>다른 사진 핀을 누르면 그 자리로 모여요</small><span><button data-pm="here">📍 지금 위치</button>${opt && opt.auto ? `<button data-pm="auto">↩ ${esc(opt.auto)}</button>` : ''}<button data-pm="un">핀 빼기</button><button data-pm="x">취소</button></span>`;
  pbar.hidden = false; document.documentElement.classList.add('pin-on');
  if (el && !el.closest('.mapfull')) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function pinOff() { PM.ids = []; PM.m = null; PM.el = null; PM.opt = null; if (pbar) pbar.hidden = true; document.documentElement.classList.remove('pin-on'); const f = PM.done; PM.done = null; if (f) f(); }
function pinCheck() { if (PM.m && PM.el && !PM.el.isConnected) pinOff(); }
// 고른 사진들 geo를 한꺼번에 ('-' 빼기, '' 직접 꽂은 자리 지우기)
async function pinWrite(geo, msg) {
  const ids = PM.ids.slice(); if (!ids.length) return;
  if (pbar) pbar.querySelectorAll('button').forEach(b => b.disabled = true);
  let ok = true;
  for (let i = 0; i < ids.length; i += 400) { if (!(await write('setGeo', ids.length === 1 ? ids[0] : ids.slice(i, i + 400), geo))) { ok = false; break; } }
  pinOff(); if (ok) toast(msg);
}
const pinSave = p => pinWrite(`${p.lat.toFixed(4)},${p.lng.toFixed(4)}`, `사진 ${PM.ids.length}장 핀을 옮겼어요 📍`);
function pinTap(m, ll) { if (!PM.ids.length || PM.m !== m) return false; pinSave({ lat: ll.getLat(), lng: ll.getLng() }); return true; }
const pinOn = () => PM.ids.length > 0;
function pinHere() {
  if (!PM.ids.length) return; if (!navigator.geolocation) { toast('이 폰에서는 위치를 쓸 수 없어요'); return; }
  toast('지금 위치 찾는 중…');
  navigator.geolocation.getCurrentPosition(p => pinSave({ lat: p.coords.latitude, lng: p.coords.longitude }), () => toast('위치를 가져오지 못했어요. 위치 권한을 확인해 주세요'), { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
}
// 사진 크게 보기의 '📍 핀 위치'(탐험 지도 핀 창에서 연 사진)
function pinPhoto(id) { closeSheet(); if (map && mapEl && shown()) pinMode([id], map, mapEl); else pinStep(id); }

// ---------- 지도 도구: 내 위치 · 크게 보기 (탐문 보고서 지도도 같이 씀) ----------
const ME = new WeakMap();
function locate(m) {
  if (!navigator.geolocation) { toast('이 폰에서는 위치를 쓸 수 없어요'); return; }
  toast('지금 위치 찾는 중…');
  navigator.geolocation.getCurrentPosition(p => {
    const ll = new kakao.maps.LatLng(p.coords.latitude, p.coords.longitude);
    let ov = ME.get(m); if (!ov) { const el = document.createElement('span'); el.className = 'wkme'; ov = new kakao.maps.CustomOverlay({ map: m, position: ll, content: el, yAnchor: .5, zIndex: 8 }); ME.set(m, ov); } else { ov.setPosition(ll); ov.setMap(m); }
    if (m.getLevel && m.getLevel() > 5) m.setLevel(4); m.panTo(ll);
  }, () => toast('위치를 가져오지 못했어요. 위치 권한을 확인해 주세요'), { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
}
let FULL = null;
function fullMap(el, m, title, slotId) {
  if (FULL) return;
  let box = document.querySelector('.mapfull');
  if (!box) { box = document.createElement('div'); box.className = 'mapfull'; box.hidden = true; box.setAttribute('role', 'dialog'); box.innerHTML = '<div class="mfhead"><b></b><button data-mf="x" aria-label="닫기">✕</button></div><div class="mfbody"><button class="mfx" data-mf="loc" aria-label="내 위치">◎</button></div>'; document.body.appendChild(box);
    box.addEventListener('click', e => { const t = e.target.closest('[data-mf]'); if (!t) return; if (t.dataset.mf === 'x') fullClose(); else if (FULL) locate(FULL.m); }); }
  FULL = { el, m, slotId }; box.querySelector('.mfhead b').textContent = title; box.querySelector('.mfbody').prepend(el);
  box.hidden = false; document.documentElement.classList.add('mf-open'); setTimeout(() => m.relayout(), 50);
}
function fullClose() {
  if (!FULL) return false;
  const { el, m, slotId } = FULL; FULL = null;
  const box = document.querySelector('.mapfull'); box.hidden = true; document.documentElement.classList.remove('mf-open');
  const slot = $(slotId); if (slot) slot.appendChild(el); setTimeout(() => m.relayout(), 50);
  return true;
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-xp]'); if (!b || b.disabled) return;
  const a = b.dataset.xp;
  if (a === 'open') { S.view = 'explore'; render(); window.scrollTo(0, 0); return; }
  if (a === 'close') { goBack(); return; }
  if (a === 'place') { openPlace(+b.dataset.v); return; }
  if (a === 'focus') { focus(+b.dataset.v); return; }
  if (a === 'more') { X.more += 30; render(); return; }
  if (a === 'loc') { if (map) locate(map); return; }
  if (a === 'full') { if (map && mapEl) fullMap(mapEl, map, `${CV.nick()} 탐험 지도`, 'exmap-slot'); return; }
  if (a === 'days') { X.days = X.days ? 0 : 30; X.course = null; X.fitN = -1; render(); return; }
  if (a === 'csheet') { if (X.days) { X.days = 0; X.course = null; render(); } WALK.courseSheet(+b.dataset.v, 0); return; }
  if (a === 'course') { closeSheet(); X.course = b.dataset.v === '' ? null : +b.dataset.v; X.layer.wk = true; X.fitN = -1; render(); if (X.course != null) { const w = $('exmap-slot'); if (w) w.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
  if (a === 'layer') { const k = b.dataset.v; X.layer[k] = !X.layer[k]; try { localStorage.setItem('soeun-ex-layer', JSON.stringify(X.layer)); } catch (er) {} X.fitN = -1; render(); return; }
  if (!canWrite()) { toast('보기 전용이라 위치는 엄마·아빠 수사관만 꽂을 수 있어요'); return; }
  if (a === 'pin') { X.sel.clear(); X.listN = 60; openSheet(pinList()); return; }
  if (a === 'tog') { const id = b.dataset.v; if (X.sel.has(id)) X.sel.delete(id); else X.sel.add(id); b.classList.toggle('sel', X.sel.has(id)); nextBtn(); return; }
  if (a === 'selday') { const ids = [...document.querySelectorAll('.expick [data-xp="tog"]')].map(x => x.dataset.v).filter(id => { const m = S.moments.find(y => y.id === id); return m && m.date === b.dataset.v; }); const allOn = ids.every(id => X.sel.has(id)); ids.forEach(id => allOn ? X.sel.delete(id) : X.sel.add(id)); document.querySelectorAll('.expick [data-xp="tog"]').forEach(x => x.classList.toggle('sel', X.sel.has(x.dataset.v))); nextBtn(); return; }
  if (a === 'pmore') { X.listN += 60; reopenList(); return; }
  if (a === 'pnext') { if (X.sel.size) pinStep([...X.sel]); return; }
  if (a === 'pick') { const pl = document.querySelector('[data-xp="plmove"]'); pinStep(b.dataset.v, pl ? { place: +pl.dataset.v } : null); return; }
  if (a === 'pmhere') { pinHere(); return; }
  if (a === 'pchk') { const id = b.dataset.v; if (X.psel.has(id)) X.psel.delete(id); else X.psel.add(id); b.classList.toggle('on', X.psel.has(id)); plBtns(); return; }
  if (a === 'plmove') { const pl = places()[+b.dataset.v]; if (!pl) return; const ids = X.psel.size ? [...X.psel] : pl.photos.map(ph => ph.id); if (map && mapEl) { closeSheet(); pinMode(ids, map, mapEl, () => X.psel.clear()); } else pinStep(ids, { place: pl.i }); return; }
  if (a === 'plunpin') { const pl = places()[+b.dataset.v]; if (!pl) return; const ids = X.psel.size ? [...X.psel] : pl.photos.map(ph => ph.id); if (await ask(`${X.psel.size ? '고른' : '이곳'} 사진 ${ids.length}장의 위치를 뺄까요?\n사진은 그대로 남아요.`, { ok: '빼기', danger: true })) await saveGeo(ids, null); return; }
  if (a === 'pback') { if (X.back && X.back.place != null) openPlace(X.back.place); else openSheet(pinList()); return; }
  if (a === 'mappick') { mapPick(); return; }
  if (a === 'here') {
    if (!navigator.geolocation) { $('xp-err').textContent = '이 폰에서는 위치를 쓸 수 없어요'; return; }
    b.disabled = true; toast('지금 위치 찾는 중…');
    navigator.geolocation.getCurrentPosition(p => { b.disabled = false; saveGeo(X.pick, { lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { b.disabled = false; const er = $('xp-err'); if (er) er.textContent = '위치를 가져오지 못했어요. 위치 권한을 확인해 주세요'; }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    return;
  }
  if (a === 'savepick') { if (X.pickPos) await saveGeo(X.pick, X.pickPos); return; }
  if (a === 'unpin') { if (await ask(X.pick.length > 1 ? `사진 ${X.pick.length}장의 위치를 뺄까요?` : '이 사진의 위치를 뺄까요?', { ok: '빼기', danger: true })) await saveGeo(X.pick, null); }
});
document.addEventListener('change', e => { if (e.target.id === 'xp-all') { X.pickAll = e.target.checked; X.listN = 60; reopenList(); } });

const css = document.createElement('style');
css.textContent = `
.exsum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
.exsum span{background:#FFFDF7;border:1.5px solid var(--line);border-radius:16px;padding:8px 4px;text-align:center;font-size:12px;color:var(--muted)}
.exsum b{display:block;font-family:var(--display);font-weight:400;font-size:24px;color:var(--navy);line-height:1.1}
.exmapwrap{position:relative;margin-top:12px;border-radius:20px;overflow:hidden;border:1.5px solid var(--line);background:var(--card2)}
.exmap{width:100%;height:240px}
.mtools{position:absolute;right:8px;bottom:8px;z-index:3;display:flex;flex-direction:column;gap:6px}
.mtools button,.mfx{width:42px;height:42px;border-radius:50%;border:0;background:#fff;color:var(--navy);font-size:20px;box-shadow:0 3px 8px rgba(0,0,0,.3)}
.mapfull{position:fixed;inset:0;z-index:55;background:#0E1424;display:flex;flex-direction:column;padding:max(8px,env(safe-area-inset-top)) 0 max(8px,env(safe-area-inset-bottom))}
.mapfull[hidden]{display:none}
.mfhead{display:flex;align-items:center;gap:10px;padding:0 12px 8px;color:#fff}.mfhead b{flex:1;font-family:var(--display);font-weight:400;font-size:19px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mfhead button{width:44px;height:40px;border-radius:12px;border:1.5px solid rgba(255,255,255,.35);background:none;color:#fff;font-size:20px}
.mfbody{position:relative;flex:1;margin:0 8px;border-radius:18px;overflow:hidden;background:#1C2640}
.mfbody>.exmap,.mfbody>.wkmap{position:absolute;inset:0;width:100%;height:100%}
.mfbody .mfx{position:absolute;right:10px;bottom:10px;z-index:3}
html.mf-open,html.mf-open body{overflow:hidden}
html.mf-open #scrim{z-index:56}html.mf-open #sheet{z-index:57}   /* 크게 본 지도에서 핀을 눌러 여는 창은 지도 위로 */
.exlayer{position:absolute;left:8px;top:8px;right:56px;z-index:3;display:flex;flex-wrap:wrap;gap:4px}
.exlayer button{border:1.5px solid var(--line);background:rgba(255,253,247,.92);border-radius:99px;padding:4px 10px;font-size:12.5px;min-height:32px;color:var(--muted);box-shadow:0 2px 6px rgba(0,0,0,.15)}
.exlayer button.on{background:var(--navy);border-color:var(--navy);color:#fff}
.expin{position:relative;display:block;width:52px;height:52px;padding:0;border:3px solid #fff;border-radius:50%;background:var(--card2);box-shadow:0 3px 8px rgba(0,0,0,.35);overflow:visible}
.expin img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block}
.expin span{display:grid;place-items:center;height:100%;font-size:20px}
.expin b{position:absolute;right:-6px;top:-6px;min-width:22px;height:22px;padding:0 5px;border-radius:99px;background:var(--red);color:#fff;font-size:12px;line-height:22px;text-align:center;font-family:var(--body)}
.expin.home{border-color:#F4C542}.expin.home b{background:#F4C542;color:var(--ink)}
.expin::after{content:"";position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);border:6px solid transparent;border-top:8px solid #fff}
.exwk{display:grid;place-items:center;width:30px;height:30px;padding:0;border-radius:50%;border:2.5px solid #fff;background:#2E7D5B;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,.3)}
.exempty{margin-top:14px;text-align:center;background:var(--card);border:1.5px dashed var(--line);border-radius:20px;padding:16px}
.exempty p{margin:6px 0 0;font-size:14px;color:var(--muted);line-height:1.6}.exempty b{color:var(--red)}
.exlist{display:flex;flex-direction:column;gap:6px}
.exrow{display:flex;align-items:center;gap:10px;width:100%;border:1px solid var(--line);background:#FFFDF7;border-radius:14px;padding:6px 10px 6px 6px;text-align:left}
.exrow img,.exnoph{width:48px;height:48px;border-radius:10px;object-fit:cover;flex-shrink:0;display:grid;place-items:center;background:var(--card2);font-size:20px}
.exrt{flex:1;min-width:0;display:flex;flex-direction:column}
.exrt b{font-family:var(--display);font-weight:400;font-size:16px;color:var(--navy);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.exrt small{font-size:12px;color:var(--muted)}
.exrow em{font-style:normal;color:var(--muted)}
.exrow.home{border-style:dashed}
.exstamps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.exst{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:62px;border:1.5px dashed var(--line);border-radius:14px;background:#FFFDF7;padding:6px 2px}
.exst b{font-family:var(--display);font-weight:400;font-size:16px;color:var(--muted)}
.exst small{font-size:11px;color:var(--muted)}
.exst.on{border:1.5px solid #E6B9B4;background:#FFF3F0}
.exst.on b{color:var(--navy)}
.exst i{position:absolute;right:4px;top:4px;font-style:normal;font-family:var(--display);font-size:11px;color:var(--red);border:2px solid var(--red);border-radius:50%;width:30px;height:30px;display:grid;place-items:center;transform:rotate(-14deg);opacity:.85}
.exaway{margin:10px 0 0;font-size:13px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.exaway span{background:#FFFDF7;border:1px solid var(--line);border-radius:99px;padding:2px 10px}
.exaway small{color:var(--muted)}
.exbadges{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.exbd{display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center;border:1.5px dashed var(--line);border-radius:14px;padding:8px 10px;background:none;opacity:.75}
.exbd i{grid-row:span 2;font-style:normal;font-size:24px;filter:grayscale(1)}
.exbd b{font-size:13px;color:var(--muted)}
.exbd small{font-size:11px;color:var(--muted);line-height:1.3}
.exbd.on{border-style:solid;border-color:#E9C46A;background:#FFF8E1;opacity:1}
.exbd.on i{filter:none}.exbd.on b{color:var(--navy)}
.exsheet{margin:0}
.exgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:12px}
.exgrid button,.excell{position:relative;border:0;padding:0;background:var(--card2);border-radius:10px;overflow:hidden;aspect-ratio:1}
.excell .exph{width:100%;height:100%;display:block;border-radius:0}
.exgrid img{width:100%;height:100%;object-fit:cover;display:block}
.exgrid span{display:grid;place-items:center;height:100%;font-size:12px;color:var(--muted)}
.exgrid small{position:absolute;left:4px;bottom:4px;font-size:11px;color:#fff;background:rgba(0,0,0,.45);border-radius:99px;padding:0 6px}
.excell .expinb{position:absolute;right:2px;top:2px;width:44px;height:44px;border:0;background:none;aspect-ratio:auto;display:grid;place-items:center}
.excell .expinb i{width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:rgba(0,0,0,.3);color:transparent;font-style:normal;font-size:15px;line-height:24px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.3)}
.excell .expinb.on i{background:var(--red);color:#fff}.excell:has(.expinb.on){outline:3px solid var(--red);outline-offset:-3px}
.explact{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px}.explact .ghost{min-height:44px;font-size:13.5px;word-break:keep-all}.exdanger{color:var(--red)!important}
.expd{display:flex;align-items:center;justify-content:space-between;margin:10px 0 6px}.expd b{font-size:14px;color:var(--navy)}
.expd button{border:1.5px solid var(--line);background:#FFFDF7;border-radius:99px;font-size:12.5px;padding:3px 12px;min-height:32px}
.expick button i{position:absolute;right:5px;top:5px;width:26px;height:26px;border-radius:50%;border:2px solid #fff;background:rgba(0,0,0,.25);color:transparent;font-style:normal;font-size:14px;line-height:22px;text-align:center}
.expick button.sel{outline:3px solid var(--red);outline-offset:-3px}.expick button.sel i{background:var(--red);color:#fff}
.expick1{display:flex;gap:6px;align-items:center;margin-bottom:10px}
.expick1 img{width:56px;height:56px;object-fit:cover;border-radius:10px;flex-shrink:0}
.expick1 span{display:flex;flex-direction:column;margin-left:4px;min-width:0}.expick1 small{color:var(--muted);font-size:12px;word-break:keep-all}
.expickb{display:flex;gap:8px;margin-bottom:10px}.expickb>*{flex:1}
.expickmap{width:100%;height:280px;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--card2)}
.exwhere{display:flex;align-items:center;gap:8px}.exwhere small{flex:1;font-size:13px;color:var(--ink)}.exwhere .ghost{min-height:38px;font-size:13px;padding:0 12px;white-space:nowrap}
.exnum{display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:99px;background:#fff;border:2px solid var(--red);color:var(--red);font-size:11px;font-weight:700;box-shadow:0 2px 4px rgba(0,0,0,.25)}
.exnum.s{background:#2E7D5B;border-color:#2E7D5B;color:#fff}.exnum.e{background:var(--navy);border-color:var(--navy);color:#fff}
.tview{margin:12px 0 0}
.exsub{display:flex;align-items:center;gap:6px;margin:12px 0 6px;font-family:var(--display);font-weight:400;font-size:16px;color:var(--navy)}.exsub span{font-family:var(--body);font-size:12px;color:var(--muted)}
.exrecs{margin-bottom:6px}
.pinbar{position:fixed;left:8px;right:8px;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:59;display:flex;flex-direction:column;gap:6px;background:var(--navy);color:#fff;border-radius:16px;padding:10px 12px;box-shadow:0 6px 18px rgba(0,0,0,.35);max-width:540px;margin:0 auto}
.pinbar[hidden]{display:none}.pinbar b{font-family:var(--display);font-weight:400;font-size:16px}.pinbar small{font-size:12px;opacity:.8;margin-top:-4px}
.pinbar span{display:flex;flex-wrap:wrap;gap:6px}.pinbar button{flex:1 1 auto;min-width:64px;min-height:40px;padding:0 10px;white-space:nowrap;border-radius:99px;border:1.5px solid rgba(255,255,255,.5);background:none;color:#fff;font-size:13px}.pinbar button:disabled{opacity:.5}
html.pin-on .exmapwrap::after,html.pin-on .wkmapwrap::after,html.pin-on .mapfull::after{content:'';position:absolute;inset:0;border:4px solid var(--red);border-radius:inherit;pointer-events:none;z-index:8;animation:pinglow 1.2s ease-in-out infinite alternate}
@keyframes pinglow{from{opacity:.45}to{opacity:1}}`;
document.head.appendChild(css);
window.EXPLORE = { onTap, pinMode, pinTap, pinOff, pinCheck, pinPhoto, pinOn, pinPick: ids => pinStep(ids), locate, fullMap, closeFull: () => fullClose(), render: render_, mount, places, label, regionOf, prepare, whereHtml, sync: () => { if (map && shown()) sync(); } };
})();
