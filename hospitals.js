// 병원 수사 — 긴급 출동 탭 안의 동네 병원·약국 찾기 (강원 원주시)
// 병원·약국 목록: hospitals.json, pharmacies.json (GitHub Actions가 매주 공공데이터에서 받아 올려요)
// 관심 병원·메모: Firestore families/{fid}/hospitals/{hpid} (app.js의 saveHospital, 가족 공유)
(function () {
const HOME = { lat: 37.3422, lng: 127.9202 };               // 원주시청 (현재 위치를 모를 때 기준)
const DEPTS = ['소아청소년과', '이비인후과', '내과', '가정의학과', '피부과', '안과'];
const DAYN = ['', '월', '화', '수', '목', '금', '토', '일', '공휴일'];
// 공휴일 (대체공휴일·선거일 포함). 정부 발표로 바뀌면 여기만 고치면 돼요
const HOLI = new Set([
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-01', '2026-03-02', '2026-05-05', '2026-05-24', '2026-05-25',
  '2026-06-03', '2026-06-06', '2026-08-15', '2026-08-17', '2026-09-24', '2026-09-25', '2026-09-26', '2026-10-03', '2026-10-05',
  '2026-10-09', '2026-12-25',
  '2027-01-01', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-03-01', '2027-05-05', '2027-05-13', '2027-06-06',
  '2027-08-15', '2027-08-16', '2027-09-14', '2027-09-15', '2027-09-16', '2027-10-03', '2027-10-04', '2027-10-09', '2027-10-11',
  '2027-12-25', '2027-12-27'
]);
const FAVK = 'soeun-hosp-fav';   // 오프라인용: 관심 병원·약국의 마지막 진료시간

const H = { list: null, updated: '', phUpdated: '', loading: false, err: '', phErr: '', kind: 'hosp', mode: '', dept: '', f: {}, preset: '', pos: null, sel: '', open: new Set(), more: 40, mapErr: '' };
let map = null, mapEl = null, mapLoading = false, markers = [], lastSig = '', meDot = null, sdk = null, favJ = '';

// ---------- 시간 ----------
function nowInfo() {
  const d = new Date(), ds = today();
  return { ds, idx: HOLI.has(ds) ? 8 : (d.getDay() || 7), hm: d.getHours() * 100 + d.getMinutes() };
}
const spanOf = (h, i) => { const t = h.t && h.t[i]; if (!t) return null; const s = +t[0]; let c = +t[1]; if (c <= s) c += 2400; return [s, c]; };
function fmtT(n) { const next = n >= 2400; if (next) n -= 2400; const s = String(n).padStart(4, '0'); return (next ? '익일 ' : '') + s.slice(0, 2) + ':' + s.slice(2); }
const spanText = sp => sp ? fmtT(sp[0]) + '~' + fmtT(sp[1]) : '휴진';
function status(h, n) {
  const sp = spanOf(h, n.idx), w = h.ph ? ['영업', '휴무'] : ['진료', '휴진'];
  if (!sp) return { k: 'off', t: '오늘 ' + w[1] };
  if (n.hm >= sp[0] && n.hm < sp[1]) return { k: 'open', t: w[0] + ' 중' };
  if (n.hm < sp[0]) return { k: 'before', t: w[0] + ' 전' };
  return { k: 'off', t: '마감' };
}
// 야간: 병원은 18시 이후, 약국은 대부분 저녁까지 열어서 21시 이후까지 여는 곳
const nightAt = h => h.ph ? 2100 : 1800;
const night = h => [1, 2, 3, 4, 5, 6, 7, 8].some(i => { const sp = spanOf(h, i); return sp && sp[1] > nightAt(h); });

// ---------- 거리, 관심 ----------
function dist(h) {
  if (h.lat == null) return Infinity;
  const p = H.pos || HOME, R = 6371, r = x => x * Math.PI / 180;
  const a = Math.sin(r(h.lat - p.lat) / 2) ** 2 + Math.cos(r(p.lat)) * Math.cos(r(h.lat)) * Math.sin(r(h.lng - p.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const kmText = d => d === Infinity ? '' : d < 1 ? Math.round(d * 1000) + 'm' : d.toFixed(1) + 'km';
const favMap = () => new Map((S.hosp || []).map(x => [x.hpid, x]));
const norm = s => String(s || '').replace(/\s+/g, '').toLowerCase();
function visitMap() { const m = new Map(); (S.visits || []).forEach(v => { const k = norm(v.hospital); if (k && v.date && !(m.get(k) >= v.date)) m.set(k, v.date); }); return m; }

function visible(n, fav) {
  const f = H.f;
  const ph = H.kind === 'ph';
  return (H.list || []).filter(h => {
    if (!!h.ph !== ph) return false;
    if (!ph && H.preset === 'ernight' && !(h.er || night(h))) return false;
    if (!ph && H.dept && !(h.depts || []).includes(H.dept)) return false;
    if (f.now && !(h.er || status(h, n).k === 'open')) return false;
    if (f.sat && !h.t[6]) return false;
    if (f.sun && !h.t[7]) return false;
    if (f.hol && !h.t[8]) return false;
    if (f.night && !night(h)) return false;
    if (!ph && f.er && !h.er) return false;
    return true;
  }).map(h => ({ h, d: dist(h), fav: !!(fav.get(h.hpid) || {}).star }))
    .sort((a, b) => (b.fav - a.fav) || (a.d - b.d)).map(x => x.h);
}

// ---------- 데이터 ----------
const readFav = () => { try { return JSON.parse(localStorage.getItem(FAVK) || 'null'); } catch (e) { return null; } };
function saveFav() {
  if (!H.list) return;
  const fav = favMap(), items = H.list.filter(h => (fav.get(h.hpid) || {}).star);
  const j = JSON.stringify({ updated: H.updated, phUpdated: H.phUpdated, items });
  if (j === favJ) return; favJ = j;
  try { localStorage.setItem(FAVK, j); } catch (e) {}
}
async function getJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (r.status === 404) throw new Error('nodata');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
// 병원과 약국을 따로 받아서, 받지 못한 쪽은 마지막으로 보관한 관심 목록으로 채워요
async function load() {
  if (H.loading) return; H.loading = true; H.err = ''; H.phErr = '';
  const [a, b] = await Promise.allSettled([getJson('hospitals.json'), getJson('pharmacies.json')]);
  const f = readFav() || {}, keep = (f.items || []), why = r => r.reason && r.reason.message === 'nodata' ? 'nodata' : 'offline';
  let hs, ps;
  if (a.status === 'fulfilled') { hs = a.value.items || []; H.updated = a.value.updated || ''; }
  else { hs = keep.filter(h => !h.ph); H.updated = f.updated || ''; H.err = why(a); }
  if (b.status === 'fulfilled') { ps = (b.value.items || []).map(h => Object.assign(h, { ph: true })); H.phUpdated = b.value.updated || ''; }
  else { ps = keep.filter(h => h.ph); H.phUpdated = f.phUpdated || ''; H.phErr = why(b); }
  H.list = hs.concat(ps);
  H.loading = false; saveFav(); rerender();
}
const rerender = () => { if (S.view === 'hosp') render(); };
const byId = id => (H.list || []).find(h => h.hpid === id);

// ---------- 카카오맵 ----------
const hasKey = () => !!window.KAKAO_JS_KEY && !/여기에/.test(window.KAKAO_JS_KEY);
function loadSdk() {
  if (sdk) return sdk;
  sdk = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=' + encodeURIComponent(window.KAKAO_JS_KEY);
    s.onload = () => { try { kakao.maps.load(res); } catch (e) { rej(e); } };
    s.onerror = () => rej(new Error('load'));
    document.head.appendChild(s);
  });
  sdk.catch(() => { sdk = null; });
  return sdk;
}
const PIN = (fill, op, w, h) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 28 38"><path d="M14 1.5C7.1 1.5 1.5 7 1.5 13.8 1.5 23.3 14 36.5 14 36.5S26.5 23.3 26.5 13.8C26.5 7 20.9 1.5 14 1.5z" fill="${fill}" fill-opacity="${op}" stroke="#FFFDF7" stroke-width="2"/><circle cx="14" cy="13.8" r="4.6" fill="#FFFDF7"/></svg>`);
const pinCache = {};
function pinImg(kind) {
  if (pinCache[kind]) return pinCache[kind];
  const [src, w, h] = kind === 'fav' ? [PIN('#B3261E', 1, 30, 41), 30, 41] : kind === 'sel' ? [PIN('#1F2A44', 1, 28, 38), 28, 38] : [PIN('#1F2A44', .38, 22, 30), 22, 30];
  return (pinCache[kind] = new kakao.maps.MarkerImage(src, new kakao.maps.Size(w, h), { offset: new kakao.maps.Point(w / 2, h) }));
}
function syncMarkers() {
  if (!map) return;
  const n = nowInfo(), fav = favMap(), list = visible(n, fav).filter(h => h.lat != null);
  const sig = list.map(h => h.hpid + ((fav.get(h.hpid) || {}).star ? '*' : '')).join(',') + '|' + H.sel;
  if (sig === lastSig) return; lastSig = sig;
  markers.forEach(m => m.setMap(null)); markers = [];
  list.forEach(h => {
    const f = !!(fav.get(h.hpid) || {}).star, kind = f ? 'fav' : h.hpid === H.sel ? 'sel' : 'dim';
    const m = new kakao.maps.Marker({ map, position: new kakao.maps.LatLng(h.lat, h.lng), image: pinImg(kind), title: h.name, zIndex: f ? 3 : kind === 'sel' ? 2 : 1 });
    kakao.maps.event.addListener(m, 'click', () => {
      H.sel = h.hpid; rerender();
      setTimeout(() => { const el = document.getElementById('hsel'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
    });
    markers.push(m);
  });
}
function showMe() {
  if (!map || !H.pos) return;
  const at = new kakao.maps.LatLng(H.pos.lat, H.pos.lng);
  if (!meDot) meDot = new kakao.maps.CustomOverlay({ content: '<div class="hmedot" title="현재 위치"></div>', zIndex: 5 });
  meDot.setPosition(at); meDot.setMap(map);
}
// 화면을 다시 그려도 지도는 새로 만들지 않고 옮겨 붙여요
function mount() {
  const slot = document.getElementById('hmap-slot');
  if (!slot) return;
  if (!mapEl) { mapEl = document.createElement('div'); mapEl.className = 'hmap'; }
  slot.appendChild(mapEl);
  if (map) { const c = map.getCenter(); map.relayout(); map.setCenter(c); syncMarkers(); return; }
  if (mapLoading) return;
  mapLoading = true;
  loadSdk().then(() => {
    mapLoading = false;
    const c = H.pos || HOME;
    map = new kakao.maps.Map(mapEl, { center: new kakao.maps.LatLng(c.lat, c.lng), level: 6 });
    lastSig = ''; syncMarkers(); showMe();
  }).catch(() => { mapLoading = false; H.mapErr = 'fail'; rerender(); });
}
function locate(quiet) {
  if (!navigator.geolocation) { if (!quiet) toast('이 기기에서는 위치를 쓸 수 없어요'); return; }
  if (!quiet) toast('현재 위치 찾는 중…');
  navigator.geolocation.getCurrentPosition(p => {
    H.pos = { lat: p.coords.latitude, lng: p.coords.longitude };
    if (map) { map.setCenter(new kakao.maps.LatLng(H.pos.lat, H.pos.lng)); if (!quiet) map.setLevel(5); showMe(); }
    rerender();
  }, () => { if (!quiet) toast('위치를 가져오지 못했어요. 위치 권한을 확인해 주세요'); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

// ---------- 화면 ----------
function card(h, n, fav, vm, isSel) {
  const f = fav.get(h.hpid) || {}, st = status(h, n), sp = spanOf(h, n.idx), last = h.ph ? '' : vm.get(norm(h.name));
  const dd = kmText(dist(h)), tel = String(h.tel || '').replace(/[^0-9+]/g, '');
  const rows = [1, 2, 3, 4, 5, 6, 7, 8].map(i => `<tr class="${i === n.idx ? 'today' : ''}"><td>${DAYN[i]}</td><td>${spanText(spanOf(h, i))}</td></tr>`).join('');
  const notes = [['점심', f.lunch], ['예약', h.ph ? '' : f.reserve], ['메모', f.memo]].filter(x => x[1]);
  const depts = (h.depts || []).filter(d => DEPTS.includes(d));
  return `<article class="hcard${f.star ? ' fav' : ''}${isSel ? ' sel' : ''}" ${isSel ? 'id="hsel"' : ''}>
    <div class="htop"><div style="min-width:0"><b class="hname">${esc(h.name)}</b><small>${esc(h.kind)}${dd ? ' · ' + dd : ''}${depts.length ? ' · ' + esc(depts.join(', ')) : ''}</small></div>
      <button class="hstar${f.star ? ' on' : ''}" data-h="star" data-id="${esc(h.hpid)}" aria-pressed="${f.star ? 'true' : 'false'}" aria-label="관심 ${h.ph ? '약국' : '병원'}">${f.star ? '★' : '☆'}</button></div>
    ${h.er || (f.moonlight && !h.ph) || last ? `<div class="hbadges">${h.er ? '<span class="hb er">응급실 운영</span>' : ''}${f.moonlight && !h.ph ? '<span class="hb moon">달빛어린이병원</span>' : ''}${last ? `<span class="hb">마지막 방문 ${fmtK(last, true)}</span>` : ''}</div>` : ''}
    <div class="htoday"><span><small>오늘(${DAYN[n.idx]})</small><b>${spanText(sp)}</b></span><span class="hst ${st.k}">${st.t}</span></div>
    <details data-hid="${esc(h.hpid)}" ${H.open.has(h.hpid) ? 'open' : ''}><summary>${h.ph ? '영업시간' : '진료시간'} 전체 보기</summary><table class="htimes">${rows}</table></details>
    <p class="hsrc">공공데이터 기준, 방문 전 전화 확인${(h.ph ? H.phUpdated : H.updated) ? ` (${esc(h.ph ? H.phUpdated : H.updated)} 받음)` : ''}</p>
    ${notes.length ? `<div class="hnote">${notes.map(([k, v]) => `<span><i>${k}</i>${esc(v)}</span>`).join('')}${f.updatedBy ? `<small>${esc(f.updatedBy)} 수사관 기록</small>` : ''}</div>` : ''}
    ${h.addr ? `<p class="hsrc" style="margin-top:6px">${esc(h.addr)}</p>` : ''}
    <div class="hacts">${tel ? `<a class="linkbtn" href="tel:${tel}">전화</a>` : ''}${h.lat != null ? `<a class="linkbtn" href="https://map.kakao.com/link/to/${encodeURIComponent(h.name)},${h.lat},${h.lng}" target="_blank" rel="noopener">길찾기</a>` : ''}<button class="linkbtn" data-h="edit" data-id="${esc(h.hpid)}">메모 편집</button></div>
  </article>`;
}
const chip = (on, attrs, label) => `<button class="chip${on ? ' on' : ''}" ${attrs} aria-pressed="${on ? 'true' : 'false'}">${label}</button>`;

function renderHosp() {
  if (!H.list && !H.loading) load();
  if (!H.mode) H.mode = hasKey() ? 'map' : 'list';
  const ph = H.kind === 'ph', W = ph ? { n: '약국', t: '영업' } : { n: '병원', t: '진료' };
  const n = nowInfo(), fav = favMap(), vm = visitMap(), list = visible(n, fav);
  const favs = list.filter(h => (fav.get(h.hpid) || {}).star);
  const head = `<header class="vhead"><span class="no">긴급 출동 · 강원 원주시</span><div class="top" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h1>병원 수사</h1><button class="ghost" data-act="tab" data-v="sick">← 긴급 출동</button></div>
    <p>${n.idx === 8 ? '오늘은 공휴일이에요. ' : ''}관심 병원·약국은 가족 모두에게 같이 보여요.</p></header>`;
  const kinds = `<div class="seg hkind" style="margin-top:14px"><button class="${ph ? '' : 'on'}" data-h="kind" data-v="hosp">병원</button><button class="${ph ? 'on' : ''}" data-h="kind" data-v="ph">약국</button></div>`;
  const err = ph ? H.phErr : H.err, has = (H.list || []).some(h => !!h.ph === ph);
  let notice = '';
  if (err === 'nodata' && !has) notice = `<p class="notice">아직 ${W.n} 정보가 없어요. GitHub Actions에서 "병원 정보 받기"를 한 번 실행해 주세요.</p>`;
  else if (err) notice = `<p class="notice">인터넷에 연결되지 않아 ${has ? `마지막으로 받은 관심 ${W.n}만` : `${W.n} 정보를`} 보여 줘요.</p>`;
  const flts = [['now', `지금 ${W.t} 중`], ['sat', '토요일'], ['sun', '일요일'], ['hol', '공휴일'], ['night', ph ? '야간 21시 이후' : '야간 18시 이후']].concat(ph ? [] : [['er', '응급실']]);
  const filters = `<div class="hfilters">
    ${!ph && H.preset === 'ernight' ? '<p class="hpreset"><span>응급실 또는 야간(18시 이후) 진료 병원만 보는 중</span><button class="ghost" data-h="preset">모두 보기</button></p>' : ''}
    ${ph ? '' : `<div class="chips">${chip(!H.dept, 'data-h="dept" data-v=""', '전체 과목')}${DEPTS.map(d => chip(H.dept === d, `data-h="dept" data-v="${d}"`, d)).join('')}</div>`}
    <div class="chips">${flts.map(([k, l]) => chip(!!H.f[k], `data-h="flt" data-v="${k}"`, l)).join('')}</div>
  </div>`;
  const seg = `<div class="seg" style="margin-top:14px"><button class="${H.mode === 'map' ? 'on' : ''}" data-h="mode" data-v="map">지도</button><button class="${H.mode === 'list' ? 'on' : ''}" data-h="mode" data-v="list">목록 (${list.length})</button></div>`;
  const cards = arr => arr.map(h => card(h, n, fav, vm, h.hpid === H.sel)).join('');
  let body;
  if (H.loading && !H.list) body = '<p class="vempty">병원·약국 정보를 불러오는 중…</p>';
  else if (H.mode === 'map') {
    const mapBox = !hasKey() ? '<div class="hmap hmsg">지도를 쓰려면 map-key.js에 카카오 JavaScript 키를 넣어 주세요. 목록 보기는 그대로 쓸 수 있어요.</div>'
      : H.mapErr ? '<div class="hmap hmsg"><span>지도를 불러오지 못했어요. 인터넷 연결이나 카카오 키의 사이트 도메인 등록을 확인해 주세요.</span><button class="ghost" data-h="remap">다시 불러오기</button></div>'
      : '<div id="hmap-slot"></div>';
    const sel = H.sel && byId(H.sel), rest = favs.filter(h => h.hpid !== H.sel);
    body = `<div class="hmapwrap">${mapBox}${hasKey() && !H.mapErr ? '<button class="hme" data-h="me">현재 위치</button>' : ''}</div>
      <div class="hlegend"><span><i style="background:var(--red)"></i>관심 ${W.n}</span><span><i style="background:rgba(31,42,68,.38)"></i>그 밖의 ${W.n}</span><span>${list.length}곳</span></div>
      ${sel && !!sel.ph === ph ? cards([sel]) : `<p class="vempty">핀을 누르면 ${W.n} 정보가 나와요.</p>`}
      ${rest.length ? `<h2 class="subh">★ 관심 ${W.n}</h2>${cards(rest)}` : ''}`;
  } else {
    const shown = list.slice(0, Math.max(H.more, favs.length));
    body = `<p class="hsrc" style="margin-top:8px">관심 ${W.n} 먼저, 그다음 ${H.pos ? '현재 위치에서' : '원주시청에서'} 가까운 순이에요. <button class="ghost" data-h="me" style="min-height:30px;padding:2px 8px">현재 위치로</button></p>
      ${list.length ? cards(shown) : `<p class="vempty">조건에 맞는 ${W.n}이 없어요. 필터를 줄여 보세요.</p>`}
      ${list.length > shown.length ? `<button class="addperiod" data-h="more">더 보기 (${list.length - shown.length}곳 남음)</button>` : ''}`;
  }
  const src = ph ? '약국 정보: 국립중앙의료원 전국 약국 정보 조회 서비스(공공데이터포털). 영업시간이 실제와 다를 수 있어요.'
    : '병원 정보: 국립중앙의료원 전국 병·의원 찾기 서비스(공공데이터포털). 진료시간이 실제와 다를 수 있어요.';
  return head + kinds + notice + filters + seg + body + `<p class="foot">${src}</p>`;
}

// 긴급 출동 탭 위쪽 바로가기
const quickHtml = () => `<div class="hquick"><button class="er" data-h="open" data-p="ernight">${typeof I_SIREN === 'string' ? I_SIREN.replace(/24/g, '20') : ''}<span>응급실·야간<br>진료 병원</span></button><button class="all" data-h="open" data-k="hosp">병원</button><button class="all" data-h="open" data-k="ph">약국</button></div>`;

function openEdit(id) {
  const h = byId(id), f = favMap().get(id) || {}, ph = !!(h && h.ph);
  openSheet(`<h3>${esc(h ? h.name : '병원')}</h3>
    <label class="check"><input type="checkbox" id="hm-star" ${f.star ? 'checked' : ''}> ★ 관심 ${ph ? '약국' : '병원'}</label>
    ${ph ? '' : `<label class="check"><input type="checkbox" id="hm-moon" ${f.moonlight ? 'checked' : ''}> 달빛어린이병원 (직접 확인하고 체크)</label>`}
    <label class="field"><span>점심시간</span><input id="hm-lunch" maxlength="100" value="${esc(f.lunch || '')}" placeholder="예: 13:00~14:00"></label>
    ${ph ? '' : `<label class="field"><span>예약 방법</span><input id="hm-reserve" maxlength="100" value="${esc(f.reserve || '')}" placeholder="예: 똑닥 앱, 전화 예약"></label>`}
    <label class="field"><span>메모</span><textarea id="hm-memo" maxlength="300" placeholder="${ph ? '예: 아기 해열제 시럽 있음, 주차 가능' : '예: 주차 2시간 무료, 오후 3시쯤 덜 붐빔'}">${esc(f.memo || '')}</textarea></label>
    <p class="hint">가족 수사관 모두에게 같이 보여요.</p>
    <div class="actions"><button class="secondary" data-act="close">취소</button><button class="primary" data-h="save" data-id="${esc(id)}">저장</button></div>`);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-h]'); if (!b) return;
  const v = b.dataset.v, id = b.dataset.id;
  switch (b.dataset.h) {
    case 'open':
      S.tab = 'sick'; S.view = 'hosp'; H.preset = b.dataset.p || ''; H.sel = ''; H.more = 40;
      if (H.preset) { H.mode = 'list'; H.kind = 'hosp'; } else if (b.dataset.k) H.kind = b.dataset.k;
      if (!H.list || H.err || H.phErr) load();
      if (!H.pos && navigator.permissions) navigator.permissions.query({ name: 'geolocation' }).then(p => { if (p.state === 'granted') locate(true); }).catch(() => {});
      render(); window.scrollTo(0, 0); break;
    case 'preset': H.preset = ''; render(); break;
    case 'kind': H.kind = v; H.sel = ''; H.more = 40; render(); break;
    case 'dept': H.dept = v; H.more = 40; render(); break;
    case 'flt': H.f[v] = !H.f[v]; H.more = 40; render(); break;
    case 'mode': H.mode = v; render(); break;
    case 'more': H.more += 40; render(); break;
    case 'me': locate(false); break;
    case 'remap': H.mapErr = ''; render(); break;
    case 'edit': openEdit(id); break;
    case 'star': {
      const cur = !!(favMap().get(id) || {}).star, w = (byId(id) || {}).ph ? '약국' : '병원';
      if (await write('saveHospital', { hpid: id, star: !cur })) { toast(cur ? `관심 ${w}에서 뺐어요` : `관심 ${w}으로 등록했어요`); saveFav(); }
      break;
    }
    case 'save': {
      const el = k => document.getElementById(k), o = { hpid: id, star: el('hm-star').checked, lunch: el('hm-lunch').value.trim(), memo: el('hm-memo').value.trim() };
      if (el('hm-moon')) o.moonlight = el('hm-moon').checked;        // 약국 편집 창에는 달빛·예약 칸이 없어요
      if (el('hm-reserve')) o.reserve = el('hm-reserve').value.trim();
      if (await write('saveHospital', o)) { closeSheet(); toast(((byId(id) || {}).ph ? '약국' : '병원') + ' 정보를 저장했어요'); saveFav(); }
      break;
    }
  }
});
document.addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.hid) { if (d.open) H.open.add(d.dataset.hid); else H.open.delete(d.dataset.hid); } }, true);

const css = document.createElement('style');
css.textContent = `
.hquick{position:sticky;top:env(safe-area-inset-top,0px);z-index:4;display:flex;gap:8px;margin:-18px -20px 14px;padding:10px 20px;background:var(--paper);border-bottom:1px dashed var(--line)}
.hquick button{border-radius:4px;min-height:46px;font-family:var(--display);font-size:16px;display:flex;align-items:center;justify-content:center;gap:6px;min-width:0}
.hquick .er{flex:2 1 0;background:var(--red);color:#fff;border:0;padding:4px 6px;font-size:14px;line-height:1.2;text-align:left;word-break:keep-all}
.hquick .er svg{flex-shrink:0}
.hquick .all{flex:1 1 0;background:#FFFDF7;border:1.5px solid var(--navy);color:var(--navy);padding:0 6px;white-space:nowrap}
.hfilters .chips{margin-top:10px;gap:6px}
.chip.on{background:var(--navy);color:var(--paper)}
.hpreset{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:12px 0 0;border:1px dashed var(--red);color:var(--red);padding:6px 10px;font-size:13px}
.hmapwrap{position:relative;margin-top:10px}
.hmap{width:100%;height:320px;border:2px solid var(--navy);border-radius:4px;background:var(--card2);overflow:hidden}
.hmsg{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px;text-align:center;color:var(--muted);font-size:13px;height:160px}
.hme{position:absolute;right:10px;bottom:10px;z-index:3;border:0;background:var(--navy);color:var(--paper);border-radius:4px;padding:8px 12px;font-size:13px;box-shadow:0 3px 8px rgba(31,42,68,.35);min-height:40px}
.hmedot{width:18px;height:18px;border-radius:50%;background:#2F6FDE;border:3px solid #fff;box-shadow:0 0 0 2px rgba(47,111,222,.35)}
.hlegend{display:flex;gap:14px;font-size:12px;color:var(--muted);margin:6px 2px 4px}
.hlegend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:-1px}
.hlegend span:last-child{margin-left:auto}
.hcard{position:relative;background:var(--card);border:1px solid var(--line);border-radius:4px;padding:12px 14px;margin-top:10px;font-size:13px}
.hcard.fav{border:2px solid var(--red)}
.hcard.sel{box-shadow:0 0 0 3px var(--navy)}
.htop{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.hname{display:block;font-family:var(--display);font-weight:400;font-size:19px;color:var(--navy);line-height:1.25;word-break:keep-all}
.htop small{display:block;font-size:12px;color:var(--muted)}
.hstar{border:0;background:none;font-size:26px;line-height:1;color:var(--muted);min-width:44px;min-height:44px;padding:0;flex-shrink:0}
.hstar.on{color:var(--red)}
.hbadges{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 2px}
.hb{font-size:11px;border-radius:3px;padding:1px 6px;border:1px solid var(--navy);color:var(--navy);background:#FFFDF7}
.hb.er{background:var(--red);border-color:var(--red);color:#fff}
.hb.moon{background:var(--navy);color:#F2D98B}
.htoday{display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px dashed var(--line);margin-top:8px;padding-top:8px}
.htoday small{display:block;font-size:11px;color:var(--muted)}.htoday b{font-size:16px}
.hst{font-family:var(--display);font-size:15px;border:2px solid currentColor;border-radius:4px;padding:1px 8px;transform:rotate(-5deg);white-space:nowrap}
.hst.open{color:var(--red)}.hst.before{color:var(--navy)}.hst.off{color:var(--muted)}
.hsrc{font-size:11px;color:var(--muted);margin:4px 0 0}
.hcard details{margin-top:4px}
.hcard summary{cursor:pointer;color:var(--navy);font-size:13px;min-height:32px;padding:4px 0}
.htimes{width:100%;border-collapse:collapse;font-size:13px;margin:2px 0 4px}
.htimes td{padding:3px 0;border-bottom:1px dashed var(--line)}.htimes td:first-child{width:64px;color:var(--muted)}
.htimes tr.today td{color:var(--red);font-weight:700}
.hnote{margin:8px 0 0;display:flex;flex-direction:column;gap:2px;background:#FFFDF7;border:1px dashed var(--line);padding:8px 10px}
.hnote i{font-style:normal;color:var(--muted);margin-right:6px}.hnote small{font-size:11px;color:var(--muted)}
.hacts{display:flex;gap:8px;margin-top:10px}`;
document.head.appendChild(css);

window.HOSP = { render: renderHosp, mount, quickHtml };
})();
