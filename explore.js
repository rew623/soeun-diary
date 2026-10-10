// 소은이 탐험 지도 (S.view='explore') — 사진 속 위치로 다녀간 곳을 지도에 꽂아요. 처음 가 본 곳, 강원 시·군 도장판, 탐험 배지
// 위치: 앨범 문서(mom)의 geo "위도,경도" — 올릴 때 사진 EXIF에서 자동(album.js), 없으면 여기서 직접 꽂기(setGeo). 200m 안의 사진은 같은 곳
// 동네 이름·시·군은 카카오 지도 주소 변환(coord2RegionCode)으로 찾아 이 폰에 기억(localStorage soeun-geo-rg). 지도 SDK는 병원 수사와 같이 씀(HOSP.sdk)
(function () {
const X = { trip: '', tripMore: false, pick: '', pickAll: false, more: 30, mapErr: '', fitN: -1, regions: null, regLoading: false, pickPos: null };
let map = null, mapEl = null, mapLoading = false, overlays = [], route = [], routeSig = '', lastSig = '', geocoder = null, pickMap = null, pickMarker = null;
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

// ---------- 장소 ----------
const geoPhotos = () => (S.moments || []).filter(m => m.photo && parse(m.geo)).map(m => ({ id: m.id, date: m.date, tm: /^\d\d:\d\d$/.test(m.tm || '') ? m.tm : '', p: parse(m.geo), by: m.by })).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
let memo = null;
function places() {
  if (memo && memo.src === S.moments) return memo.P;
  const P = [];
  geoPhotos().forEach(ph => {
    let best = null, bd = 1e9; for (const pl of P) { const d = km(pl.c, ph.p); if (d < bd) { bd = d; best = pl; } }
    if (best && bd <= 0.2) { best.photos.push(ph); best.days.add(ph.date); }
    else { const pl = { c: ph.p, photos: [ph], days: new Set([ph.date]), first: ph.date }; P.push(pl); }
  });
  P.forEach((pl, i) => { pl.i = i; pl.n = pl.photos.length; pl.last = pl.photos[pl.n - 1].date; });
  // 본부(집): 다녀간 날이 가장 많은 곳 (사진 3장 이상)
  const home = P.slice().sort((a, b) => b.days.size - a.days.size || b.n - a.n)[0];
  if (home && home.n >= 3) home.home = true;
  memo = { src: S.moments, P };
  return P;
}
const homeOf = P => P.find(p => p.home) || null;
// 탐험 일지: 하루에 찍은 사진을 찍은 시각 순서로 이어서 그날 다닌 길 (GPS로 계속 따라간 길은 아니고, 사진 찍은 곳을 잇는 선이에요)
const hm = t => +t.slice(0, 2) * 60 + +t.slice(3);
function trips() {
  places(); if (memo.T) return memo.T;
  const by = {}; geoPhotos().forEach(ph => (by[ph.date] = by[ph.date] || []).push(ph));
  // geoPhotos()는 새로 만들어서 장소(pl)가 안 붙어 있어요 → 장소 목록에서 찾아요
  const plOf = {}; memo.P.forEach(pl => pl.photos.forEach(ph => { plOf[ph.id] = pl; }));
  const T = Object.entries(by).map(([d, L]) => {
    L.sort((a, b) => (a.tm || '99:99') < (b.tm || '99:99') ? -1 : (a.tm || '99:99') > (b.tm || '99:99') ? 1 : 0);
    const pts = [], seen = new Set(), pls = []; let dist = 0;
    L.forEach(ph => { const last = pts[pts.length - 1]; if (!last || km(last, ph.p) > 0.05) { if (last) dist += km(last, ph.p); pts.push(ph.p); } const pl = plOf[ph.id]; if (pl && !seen.has(pl.i)) { seen.add(pl.i); pls.push(pl); } });
    const tms = L.map(x => x.tm).filter(Boolean), t0 = tms[0] || '', t1 = tms[tms.length - 1] || '';
    return { d, L, pts, pls, dist, nPl: seen.size, t0, t1, min: t0 && t1 ? hm(t1) - hm(t0) : 0 };
  }).filter(t => t.nPl >= 2 || t.dist >= 0.5).sort((a, b) => a.d < b.d ? 1 : -1);
  return memo.T = T;
}
const durText = m => m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`;
const kmText = k => k >= 10 ? `${Math.round(k)}km` : k >= 1 ? `${k.toFixed(1)}km` : `${Math.round(k * 1000)}m`;
const WDK = '일월화수목금토', wdOf = d => WDK[new Date(pd(d)).getUTCDay()];
// 시·군 (카카오 주소 변환, 지도를 못 쓰면 가장 가까운 강원 시·군 가운데 25km 안이면 그곳으로 짐작)
function regionOf(pl) {
  const r = RG[rkey(pl.c)]; if (r && (r.g || r.x)) return r;
  if (X.regions) { const n = X.regions.map(x => ({ x, d: km(pl.c, x) })).sort((a, b) => a.d - b.d)[0]; if (n && n.d <= 25) return { s: '강원특별자치도', g: n.x.name, d: '', guess: 1 }; }
  return null;
}
function label(pl) { if (pl.home) return '본부 (우리 집)'; const r = regionOf(pl); return r && r.d ? `${r.d}` : r && r.g ? `${r.g} 어딘가` : '이름 모를 곳'; }
function ensureRegions() {
  if (X.regions || X.regLoading) return; X.regLoading = true;
  fetch('data/regions.json').then(r => r.json()).then(j => { X.regions = (j.regions || []).filter(r => r.lat && r.lng); if (S.view === 'explore') render(); }).catch(() => { X.regions = []; }).finally(() => { X.regLoading = false; });
}
function resolve() {
  if (!geocoder) return;
  const todo = places().filter(pl => !RG[rkey(pl.c)]).slice(0, 25); if (!todo.length) return;
  let left = todo.length;
  todo.forEach(pl => geocoder.coord2RegionCode(pl.c.lng, pl.c.lat, (res, st) => {
    if (st === kakao.maps.services.Status.OK && res && res.length) { const r = res.find(x => x.region_type === 'H') || res[0]; RG[rkey(pl.c)] = { s: r.region_1depth_name || '', g: r.region_2depth_name || '', d: r.region_3depth_name || '' }; }
    else RG[rkey(pl.c)] = { s: '', g: '', d: '', x: 1 };
    if (--left === 0) { saveRG(); if (S.view === 'explore') render(); }
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

// ---------- 지도 ----------
function mount() {
  const slot = $('exmap-slot'); if (!slot) return;
  if (!mapEl) { mapEl = document.createElement('div'); mapEl.className = 'exmap'; }
  slot.appendChild(mapEl);
  if (map) { map.relayout(); sync(); return; }
  if (mapLoading || X.mapErr || !window.HOSP || !HOSP.sdk) return;
  mapLoading = true;
  HOSP.sdk().then(() => {
    mapLoading = false; geocoder = new kakao.maps.services.Geocoder();
    const c = places()[0] ? places()[0].c : { lat: 37.8813, lng: 127.7298 };
    map = new kakao.maps.Map(mapEl, { center: new kakao.maps.LatLng(c.lat, c.lng), level: 7 });
    lastSig = ''; X.fitN = -1; sync(); resolve();
  }).catch(() => { mapLoading = false; X.mapErr = 'fail'; if (S.view === 'explore') render(); });
}
function sync() {
  if (!map) return;
  const P = places(), sig = P.map(p => `${p.c.lat},${p.c.lng},${p.n},${safeImg(PHOTOS[p.photos[p.n - 1].id]) ? 1 : 0}`).join('|');
  if (sig === lastSig) { drawTrip(); return; } lastSig = sig;
  overlays.forEach(o => o.setMap(null)); overlays = [];
  const bounds = new kakao.maps.LatLngBounds();
  P.forEach(pl => {
    const el = document.createElement('button'), ph = safeImg(PHOTOS[pl.photos[pl.n - 1].id]);
    el.type = 'button'; el.className = 'expin' + (pl.home ? ' home' : ''); el.setAttribute('aria-label', label(pl));
    el.innerHTML = `${ph ? `<img src="${ph}" alt="">` : '<span>📷</span>'}<b>${pl.home ? '🏠' : pl.n}</b>`;
    el.addEventListener('click', ev => { ev.stopPropagation(); openPlace(pl.i); });
    const pos = new kakao.maps.LatLng(pl.c.lat, pl.c.lng);
    const ov = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1.15, clickable: true });
    ov.setMap(map); overlays.push(ov); bounds.extend(pos);
  });
  drawTrip();
  if (X.fitN !== P.length) { X.fitN = P.length; if (P.length === 1) { map.setCenter(new kakao.maps.LatLng(P[0].c.lat, P[0].c.lng)); map.setLevel(5); } else if (P.length) map.setBounds(bounds, 50, 40, 40, 40); }
}
function drawTrip() {
  if (!map) return;
  const t = trips().find(x => x.d === X.trip), sig = t ? t.d + t.pts.length : '';
  if (sig === routeSig) return; routeSig = sig;
  route.forEach(o => o.setMap(null)); route = [];
  if (!t) return;
  const path = t.pts.map(p => new kakao.maps.LatLng(p.lat, p.lng)), bounds = new kakao.maps.LatLngBounds();
  route.push(new kakao.maps.Polyline({ map, path, strokeWeight: 5, strokeColor: '#B3261E', strokeOpacity: .85, strokeStyle: 'shortdash' }));
  path.forEach((ll, i) => { bounds.extend(ll); const el = document.createElement('span'); el.className = 'exnum' + (i === 0 ? ' s' : i === path.length - 1 ? ' e' : ''); el.textContent = i === 0 ? '출발' : i === path.length - 1 ? '끝' : String(i + 1); route.push(new kakao.maps.CustomOverlay({ map, position: ll, content: el, yAnchor: .5, zIndex: 5 })); });
  map.setBounds(bounds, 60, 40, 40, 40);
}
function focus(i) { const pl = places()[i]; if (!map || !pl) return; closeSheet(); map.setCenter(new kakao.maps.LatLng(pl.c.lat, pl.c.lng)); map.setLevel(4); const w = $('exmap-slot'); if (w) w.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

// ---------- 화면 ----------
function render_() {
  ensureRegions();
  const P = places(), h = homeOf(P), st = stamps(P), nGeo = geoPhotos().length, noGeo = (S.moments || []).filter(m => m.photo && !parse(m.geo)).length;
  const firsts = P.filter(p => !p.home).sort((a, b) => a.first < b.first ? 1 : a.first > b.first ? -1 : 0);
  const got = BADGES.map(b => ({ b, on: (() => { try { return b[4](P, st, h); } catch (e) { return false; } })() }));
  const nStamp = st.gw.filter(x => x.on).length;
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>소은이 탐험 지도</h1><p>사진 속 위치로 ${esc(CV.nick())}가 다녀간 곳을 모아요. 처음 가 본 시·군에는 도장을 꽝!</p></header>
  <div class="exsum"><span><b>${P.length}</b>곳 탐험</span><span><b>${nStamp}</b>/18 시·군 도장</span><span><b>${nGeo}</b>장 위치 확보</span></div>
  ${P.length ? `<div class="exmapwrap"><div id="exmap-slot"></div>${X.mapErr ? '<p class="vempty" style="padding:12px">지도를 불러오지 못했어요. 아래 목록으로 볼 수 있어요.</p>' : ''}</div>`
    : `<div class="exempty">${CHARS.svg('baby', 'lens', { size: 88 })}<p>아직 위치가 담긴 사진이 없어요.<br>사진을 올리면 사진 속 위치를 읽어 지도에 꽂아요.${noGeo && canWrite() ? '<br>이미 올린 사진은 아래에서 직접 꽂을 수 있어요.' : ''}</p></div>`}
  ${firsts.length || h ? `<section><h2 class="sh"><span>처음 가 본 곳</span><span>${firsts.length}곳</span></h2>
    <div class="exlist">${firsts.slice(0, X.more).map(pl => { const r = regionOf(pl), ph = safeImg(PHOTOS[pl.photos[pl.n - 1].id]); return `<button class="exrow" data-xp="place" data-v="${pl.i}">${ph ? `<img src="${ph}" alt="" loading="lazy" decoding="async">` : '<span class="exnoph">📷</span>'}<span class="exrt"><b>${esc(label(pl))}</b><small>${r && r.g ? `${esc(sido(r.s))} ${esc(r.g)}${r.guess ? ' (짐작)' : ''} · ` : ''}첫 방문 ${fmtK(pl.first, true)} · 사진 ${pl.n}장${pl.days.size > 1 ? ` · ${pl.days.size}번 방문` : ''}</small></span><em>›</em></button>`; }).join('')}
    ${h ? `<button class="exrow home" data-xp="place" data-v="${h.i}"><span class="exnoph">🏠</span><span class="exrt"><b>본부 (우리 집)</b><small>사진이 가장 많은 곳 · 사진 ${h.n}장</small></span><em>›</em></button>` : ''}</div>
    ${firsts.length > X.more ? `<button class="addperiod" data-xp="more">더 보기 (${firsts.length - X.more}곳 남음)</button>` : ''}</section>` : ''}
  ${(() => { const T = trips(); if (!T.length) return ''; const sh = X.tripMore ? T : T.slice(0, 5); return `<section><h2 class="sh"><span>탐험 일지</span><span>${T.length}일</span></h2>
    <p class="foot" style="margin:0 0 8px">그날 찍은 사진을 찍은 시각 순서로 이은 길이에요. 누르면 지도에 그려요.</p>
    <div class="extrips">${sh.map(t => `<button class="extrip${t.d === X.trip ? ' on' : ''}" data-xp="trip" data-v="${t.d}"><b>${fmtK(t.d, true)} (${wdOf(t.d)})</b><span>📍 ${t.nPl}곳 · 🚶 약 ${kmText(t.dist)}${t.min > 0 ? ` · ⏱️ ${t.t0}~${t.t1} (${durText(t.min)})` : t.t0 ? ` · ⏱️ ${t.t0}` : ''}</span><small>사진 ${t.L.length}장 · ${[...new Set(t.pls.map(label))].slice(0, 4).map(esc).join(' → ')}</small></button>`).join('')}</div>
    ${T.length > 5 ? `<button class="addperiod" data-xp="tripmore">${X.tripMore ? '최근 것만 ▴' : `전체 ${T.length}일 보기 ▾`}</button>` : ''}
    ${X.trip ? '<button class="ghost" data-xp="trip" data-v="" style="width:100%;margin-top:8px">지도에서 경로 지우기</button>' : ''}</section>`; })()}
  <section><h2 class="sh"><span>강원 시·군 도장판</span><span>${nStamp}/18</span></h2>
    <div class="exstamps">${st.gw.map(x => `<span class="exst${x.on ? ' on' : ''}"><b>${x.name.replace(/(시|군)$/, '')}</b>${x.on ? `<i>탐험</i><small>${fmtMD(x.on.first)}${x.on.guess ? '?' : ''}</small>` : '<small>미탐험</small>'}</span>`).join('')}</div>
    ${st.away.length ? `<p class="exaway"><b>강원 밖</b> ${st.away.map(([k, d]) => `<span>${esc(k)} <small>${fmtMD(d)}</small></span>`).join('')}</p>` : ''}</section>
  <section><h2 class="sh"><span>탐험 배지</span><span>${got.filter(x => x.on).length}/${BADGES.length}</span></h2>
    <div class="exbadges">${got.map(({ b, on }) => `<span class="exbd${on ? ' on' : ''}"><i>${b[1]}</i><b>${b[2]}</b><small>${b[3]}</small></span>`).join('')}</div></section>
  <section><h2 class="sh"><span>위치 없는 사진</span><span>${noGeo}장</span></h2>
    <p class="foot" style="margin:0 0 10px">갤럭시 카메라 → 설정 → <b>위치 태그</b>를 켜면 찍은 곳이 사진에 남아요. 폰이나 올리는 방법에 따라 위치가 지워질 수도 있어요. 그럴 땐 직접 꽂아 주세요.</p>
    ${canWrite() ? `<button class="ghost" data-xp="pin" style="width:100%">📍 사진 위치 직접 꽂기</button>` : ''}</section>
  <button class="secondary" data-xp="close" style="width:100%;margin-top:16px">돌아가기</button>`;
}
function openPlace(i) {
  const pl = places()[i]; if (!pl) return;
  const r = regionOf(pl);
  openSheet(`<h3>${pl.home ? '🏠 본부 (우리 집)' : '📍 ' + esc(label(pl))}</h3>
    <p class="hint">${r && r.g ? `${esc(sido(r.s))} ${esc(r.g)}${r.d && !pl.home ? ' ' + esc(r.d) : ''} · ` : ''}첫 방문 ${fmtK(pl.first, true)} · ${pl.days.size}번 방문 · 사진 ${pl.n}장</p>
    <div class="exgrid">${pl.photos.slice().reverse().map(ph => { const u = safeImg(PHOTOS[ph.id]); return `<button data-view="${esc(ph.id)}">${u ? `<img src="${u}" alt="" loading="lazy" decoding="async">` : '<span>사진</span>'}<small>${fmtMD(ph.date)}${ph.tm ? ' ' + ph.tm : ''}</small></button>`; }).join('')}</div>
    <div class="actions"><button class="secondary" data-act="close">닫기</button>${map ? `<button class="ghost" data-xp="focus" data-v="${i}">지도에서 보기</button>` : ''}</div>`);
}

// ---------- 직접 꽂기 ----------
function pinList() {
  const L = (S.moments || []).filter(m => m.photo && safeImg(PHOTOS[m.id]) && (X.pickAll || !parse(m.geo))).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const shown = L.slice(0, 60);
  return `<h3>사진 위치 꽂기</h3>
    <p class="hint">어느 사진의 위치를 꽂을까요? 사진을 고르면 지금 위치나 지도에서 고를 수 있어요.</p>
    <label class="check" style="margin:-4px 0 10px"><input type="checkbox" id="xp-all" ${X.pickAll ? 'checked' : ''}> 위치가 있는 사진도 보기 (고치기)</label>
    ${shown.length ? `<div class="exgrid">${shown.map(m => `<button data-xp="pick" data-v="${esc(m.id)}"><img src="${safeImg(PHOTOS[m.id])}" alt="" loading="lazy" decoding="async"><small>${fmtMD(m.date)}${parse(m.geo) ? ' 📍' : ''}</small></button>`).join('')}</div>` : '<p class="vempty">고를 사진이 없어요.</p>'}
    ${L.length > shown.length ? `<p class="foot">최근 ${shown.length}장만 보여요.</p>` : ''}
    <div class="actions"><button class="secondary" data-act="close">닫기</button></div>`;
}
function pinStep(id) {
  const m = (S.moments || []).find(x => x.id === id); if (!m) return;
  X.pick = id; X.pickPos = parse(m.geo);
  openSheet(`<h3>이 사진, 어디서 찍었나요?</h3>
    <div class="expick1"><img src="${safeImg(PHOTOS[id])}" alt=""><span><b>${fmtK(m.date, true)}</b><small>${m.geo ? '지금 꽂힌 위치를 바꿔요' : '아직 위치가 없어요'}</small></span></div>
    <div class="expickb"><button class="primary" data-xp="here">📍 지금 내 위치로</button><button class="ghost" data-xp="mappick">🗺️ 지도에서 고르기</button></div>
    <div id="expick-slot"></div>
    <p class="err" id="xp-err"></p>
    <div class="actions"><button class="secondary" data-xp="pin">다른 사진</button>${m.geo ? '<button class="danger" data-xp="unpin">위치 빼기</button>' : ''}<button class="primary" data-xp="savepick" id="xp-save" hidden>여기로 저장</button></div>`);
}
async function saveGeo(id, p) {
  const geo = p ? `${p.lat.toFixed(4)},${p.lng.toFixed(4)}` : '';
  const res = await write('setGeo', id, geo);
  if (res) { closeSheet(); toast(p ? '사진 위치를 꽂았어요 📍' : '사진 위치를 뺐어요'); }
}
function mapPick() {
  const slot = $('expick-slot'); if (!slot || !window.HOSP) return;
  slot.innerHTML = '<div class="expickmap" id="expick-map"><p class="vempty" style="padding:12px">지도 불러오는 중…</p></div><p class="hint" style="margin:6px 0 0">지도를 눌러 찍은 곳을 골라 주세요.</p>';
  HOSP.sdk().then(() => {
    const el = $('expick-map'); if (!el) return; el.innerHTML = '';
    const P = places(), h = homeOf(P), c = X.pickPos || (h && h.c) || (P[0] && P[0].c) || (window.HOSP && HOSP.regionCenter && HOSP.regionCenter((() => { try { return localStorage.getItem('soeun-hosp-region') || 'wonju'; } catch (e) { return 'wonju'; } })())) || { lat: 37.8813, lng: 127.7298 };
    pickMap = new kakao.maps.Map(el, { center: new kakao.maps.LatLng(c.lat, c.lng), level: X.pickPos ? 4 : 6 });
    pickMarker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(c.lat, c.lng) });
    if (X.pickPos) { pickMarker.setMap(pickMap); const sv = $('xp-save'); if (sv) sv.hidden = false; }
    kakao.maps.event.addListener(pickMap, 'click', ev => { const ll = ev.latLng; X.pickPos = { lat: ll.getLat(), lng: ll.getLng() }; pickMarker.setPosition(ll); pickMarker.setMap(pickMap); const sv = $('xp-save'); if (sv) sv.hidden = false; });
  }).catch(() => { const el = $('expick-map'); if (el) el.innerHTML = '<p class="vempty" style="padding:12px">지도를 불러오지 못했어요. "지금 내 위치로"를 써 주세요.</p>'; });
}

// ---------- 동네 탐문 탭 카드 ----------
function townCard() {
  if (!S.profile || !S.profile.birth) return '';
  const P = places(), st = stamps(P), n = st.gw.filter(x => x.on).length, last = P.filter(p => !p.home).sort((a, b) => a.first < b.first ? 1 : -1)[0];
  return `<section class="excard"><h2 class="sh"><span>🗺️ 소은이 탐험 지도</span><span>${P.length ? `${P.length}곳 · 도장 ${n}/18` : '시작 전'}</span></h2>
    <p class="hint" style="margin:0 0 10px">${P.length ? `사진 속 위치로 다녀간 곳 ${P.length}곳을 모았어요.${last ? ` 최근 처음 가 본 곳: ${esc(label(last))} (${fmtMD(last.first)})` : ''}` : `사진 속 위치로 ${esc(CV.nick())}가 다녀간 곳을 지도에 모아요. 처음 가 본 시·군엔 도장을 꽝!`}</p>
    <button class="ghost" data-xp="open" style="width:100%">탐험 지도 열기 ›</button></section>`;
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-xp]'); if (!b || b.disabled) return;
  const a = b.dataset.xp;
  if (a === 'open') { S.view = 'explore'; render(); window.scrollTo(0, 0); return; }
  if (a === 'close') { goBack(); return; }
  if (a === 'place') { openPlace(+b.dataset.v); return; }
  if (a === 'focus') { focus(+b.dataset.v); return; }
  if (a === 'more') { X.more += 30; render(); return; }
  if (a === 'tripmore') { X.tripMore = !X.tripMore; render(); return; }
  if (a === 'trip') { X.trip = X.trip === b.dataset.v ? '' : b.dataset.v; render(); if (X.trip) { const w = $('exmap-slot'); if (w) w.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
  if (!canWrite()) { toast('보기 전용이라 위치는 엄마·아빠 수사관만 꽂을 수 있어요'); return; }
  if (a === 'pin') { openSheet(pinList()); return; }
  if (a === 'pick') { pinStep(b.dataset.v); return; }
  if (a === 'mappick') { mapPick(); return; }
  if (a === 'here') {
    if (!navigator.geolocation) { $('xp-err').textContent = '이 폰에서는 위치를 쓸 수 없어요'; return; }
    b.disabled = true; toast('지금 위치 찾는 중…');
    navigator.geolocation.getCurrentPosition(p => { b.disabled = false; saveGeo(X.pick, { lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { b.disabled = false; const er = $('xp-err'); if (er) er.textContent = '위치를 가져오지 못했어요. 위치 권한을 확인해 주세요'; }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    return;
  }
  if (a === 'savepick') { if (X.pickPos) await saveGeo(X.pick, X.pickPos); return; }
  if (a === 'unpin') { if (await ask('이 사진의 위치를 뺄까요?')) await saveGeo(X.pick, null); }
});
document.addEventListener('change', e => { if (e.target.id === 'xp-all') { X.pickAll = e.target.checked; openSheet(pinList()); } });

const css = document.createElement('style');
css.textContent = `
.exsum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}
.exsum span{background:#FFFDF7;border:1.5px solid var(--line);border-radius:16px;padding:8px 4px;text-align:center;font-size:12px;color:var(--muted)}
.exsum b{display:block;font-family:var(--display);font-weight:400;font-size:24px;color:var(--navy);line-height:1.1}
.exmapwrap{margin-top:12px;border-radius:20px;overflow:hidden;border:1.5px solid var(--line);background:var(--card2)}
.exmap{width:100%;height:320px}
.expin{position:relative;display:block;width:52px;height:52px;padding:0;border:3px solid #fff;border-radius:50%;background:var(--card2);box-shadow:0 3px 8px rgba(0,0,0,.35);overflow:visible}
.expin img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block}
.expin span{display:grid;place-items:center;height:100%;font-size:20px}
.expin b{position:absolute;right:-6px;top:-6px;min-width:22px;height:22px;padding:0 5px;border-radius:99px;background:var(--red);color:#fff;font-size:12px;line-height:22px;text-align:center;font-family:var(--body)}
.expin.home{border-color:#F4C542}.expin.home b{background:#F4C542;color:var(--ink)}
.expin::after{content:"";position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);border:6px solid transparent;border-top:8px solid #fff}
.exempty{margin-top:14px;text-align:center;background:var(--card);border:1.5px dashed var(--line);border-radius:20px;padding:16px}
.exempty p{margin:6px 0 0;font-size:14px;color:var(--muted)}
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
.exgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:12px}
.exgrid button{position:relative;border:0;padding:0;background:var(--card2);border-radius:10px;overflow:hidden;aspect-ratio:1}
.exgrid img{width:100%;height:100%;object-fit:cover;display:block}
.exgrid span{display:grid;place-items:center;height:100%;font-size:12px;color:var(--muted)}
.exgrid small{position:absolute;left:4px;bottom:4px;font-size:11px;color:#fff;background:rgba(0,0,0,.45);border-radius:99px;padding:0 6px}
.expick1{display:flex;gap:10px;align-items:center;margin-bottom:10px}
.expick1 img{width:64px;height:64px;object-fit:cover;border-radius:10px}
.expick1 span{display:flex;flex-direction:column}.expick1 small{color:var(--muted);font-size:12px}
.expickb{display:flex;gap:8px;margin-bottom:10px}.expickb>*{flex:1}
.extrips{display:flex;flex-direction:column;gap:6px}
.extrip{display:flex;flex-direction:column;align-items:flex-start;gap:1px;width:100%;text-align:left;border:1px solid var(--line);background:#FFFDF7;border-radius:14px;padding:8px 12px}
.extrip b{font-family:var(--display);font-weight:400;font-size:15px;color:var(--navy)}
.extrip span{font-size:13px}.extrip small{font-size:12px;color:var(--muted)}
.extrip.on{border:2px solid var(--red);background:#FFF3F0}
.exnum{display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:99px;background:#fff;border:2px solid var(--red);color:var(--red);font-size:11px;font-weight:700;box-shadow:0 2px 4px rgba(0,0,0,.25)}
.exnum.s{background:var(--red);color:#fff}.exnum.e{background:var(--navy);border-color:var(--navy);color:#fff}
.expickmap{width:100%;height:280px;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--card2)}`;
document.head.appendChild(css);
window.EXPLORE = { render: render_, mount, townCard, places, label, regionOf, prepare };
})();
