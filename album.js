// 현장 사진첩 — 사건 앨범 탭에 아무 사진이나 여러 장씩 자유롭게 올려요
// 저장: 기존 앨범 컬렉션 families/{fid}/mom 에 type:'free' 로 (제목·메모는 선택, 날짜는 사진 찍은 날짜)
// 올릴 사진은 먼저 폰 안(IndexedDB)에 줄 세워 두고 한 장씩 올려요. 앱을 나갔다 오거나 다시 켜도 남은 사진을 이어서 올려요
// 100일 보고서 사진도 여기서 (mom 컬렉션에 type:'report', 미리 올려 둘 수 있어요)
// 최초 목격의 추가 사진: mom 컬렉션에 type:'extra', of:최초 목격 문서 id
// 현장 사진첩 사진을 길게 누르면 골라서 한 번에 지우거나 날짜를 바꿔요
(function () {
const A = { more: 30 };
const isFree = m => m.type === 'free';
const frees = () => S.moments.filter(m => isFree(m) && m.photo).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1));

// ---------- 사진 찍은 날짜·곳 (JPEG EXIF) ----------
// 줄이기 전 원본 파일에서 읽어요 (줄이면 EXIF가 사라져요). 못 읽으면 ''
// 찍은 시각(tm 'HH:MM:SS')과 찍은 곳(GPS)은 탐험 지도용 "위도,경도" (소수 4자리, 약 10m)
// 안드로이드는 갤러리에서 고른 사진의 위치를 지워서 넘겨줘요(개인정보 보호, 웹앱은 못 바꿈) → 찍은 시각으로 탐문 경로 위 자리를 찾아요(walk.js)
async function photoMeta(file) {
  try {
    const v = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (v.getUint16(0) !== 0xFFD8) return { date: '', tm: '', geo: '' };
    for (let o = 2; o + 10 < v.byteLength;) {
      const mk = v.getUint16(o), len = v.getUint16(o + 2);
      if ((mk & 0xFF00) !== 0xFF00 || mk === 0xFFDA) break;
      if (mk === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) return tiff(v, o + 10);
      o += 2 + len;
    }
  } catch (x) {}
  return { date: '', tm: '', geo: '' };
}
const photoDate = async file => (await photoMeta(file)).date;
function tiff(v, t) {
  const le = v.getUint16(t) === 0x4949, u16 = p => v.getUint16(p, le), u32 = p => v.getUint32(p, le);
  const str = e => { const n = u32(e + 4), at = n > 4 ? t + u32(e + 8) : e + 8; let r = ''; for (let i = 0; i < n - 1; i++) r += String.fromCharCode(v.getUint8(at + i)); return r; };
  // 칸 위치(e)만 모아 두고 필요한 것만 읽어요
  const scan = (ifd, want) => { const out = {}, n = u16(ifd); for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12, tag = u16(e); if (want.includes(tag)) out[tag] = e; } return out; };
  const sub = e => t + u32(e + 8);
  const rat3 = e => { const at = t + u32(e + 8); let r = 0; for (let i = 0; i < 3; i++) { const d = u32(at + i * 8 + 4); if (!d) return NaN; r += u32(at + i * 8) / d / Math.pow(60, i); } return r; };
  let date = '', tm = '', geo = '', i0 = {};
  try {
    i0 = scan(t + u32(t + 4), [0x8769, 0x8825, 0x0132]);
    const ex = i0[0x8769] ? scan(sub(i0[0x8769]), [0x9003, 0x9004]) : {};
    const m = /^(\d{4}):(\d\d):(\d\d)(?: (\d\d):(\d\d)(?::(\d\d))?)?/.exec((ex[0x9003] && str(ex[0x9003])) || (ex[0x9004] && str(ex[0x9004])) || (i0[0x0132] && str(i0[0x0132])) || '');
    date = m && m[1] > '1990' ? `${m[1]}-${m[2]}-${m[3]}` : '';
    if (date && m[4] && +m[4] < 24 && +m[5] < 60) tm = `${m[4]}:${m[5]}${m[6] && +m[6] < 60 ? ':' + m[6] : ''}`;
  } catch (x) {}
  try {
    const g = i0[0x8825] ? scan(sub(i0[0x8825]), [1, 2, 3, 4]) : {};
    if (g[2] && g[4]) {
      let la = rat3(g[2]), lo = rat3(g[4]);
      if (g[1] && str(g[1]) === 'S') la = -la;
      if (g[3] && str(g[3]) === 'W') lo = -lo;
      if (isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 && (Math.abs(la) > .01 || Math.abs(lo) > .01)) geo = la.toFixed(4) + ',' + lo.toFixed(4);
    }
  } catch (x) {}
  return { date, tm, geo };
}
const localDay = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const clampDay = d => { const b = S.profile.birth, t = today(); return !d ? t : d < b ? b : d > t ? t : d; };

// ---------- 사진첩 칸 ----------
const WDK = '일월화수목금토';
function sectionHtml() {
  const L = frees(), shown = L.slice(0, A.more), p = S.profile;
  // 달별로 묶고, 그 안에서 찍은 날짜별로 나눠요
  const groups = [];
  shown.forEach(m => {
    const ym = m.date.slice(0, 7); let g = groups[groups.length - 1];
    if (!g || g.ym !== ym) groups.push(g = { ym, days: [] });
    let d = g.days[g.days.length - 1]; if (!d || d.date !== m.date) g.days.push(d = { date: m.date, items: [] });
    d.items.push(m);
  });
  const head = ym => { const [y, mo] = ym.split('-').map(Number), [age] = monthsDays(p.birth, ym + '-' + String(Math.min(28, +p.birth.slice(8))).padStart(2, '0')); return `${y}.${mo}${ym >= p.birth.slice(0, 7) ? ` · 생후 ${age}개월` : ''}`; };
  const dayHead = d => { const [y, mo, dd] = d.split('-').map(Number); return `<b>${mo}월 ${dd}일 (${WDK[new Date(Date.UTC(y, mo - 1, dd)).getUTCDay()]})</b><span>생후 ${daysBetween(p.birth, d) + 1}일</span>`; };
  const cell = m => { const ph = safeImg(PHOTOS[m.id]); return `<button class="acell" data-view="${m.id}" aria-label="${esc(m.title || '사진')} 크게 보기">${ph ? `<img src="${ph}" alt="" loading="lazy" decoding="async">` : '<span class="mph">불러오는 중</span>'}${m.board ? '<span class="onboard">보드</span>' : ''}${m.title ? `<small>${esc(m.title)}</small>` : ''}</button>`; };
  // 달별 묶음: 가장 최근 달만 펼쳐 두고 그 전 달은 접어 둬요 (누르면 펼쳐지고, 이 폰에 기억). 펼친 달 맨 아래에도 접기 단추
  const cnt = ym => L.filter(m => m.date.slice(0, 7) === ym).length;
  // 앱을 열 때마다 가장 최근 달은 펼쳐 둬요 (그 뒤에 접은 건 이번에 쓰는 동안 기억)
  if (!A.opened && shown[0]) { A.opened = true; try { setFold('m-' + shown[0].date.slice(0, 7), false); } catch (e) {} }
  return `<section${isFold('a-free') ? ' class="folded"' : ''}><h2 class="sh" data-fold="a-free" style="align-items:baseline"><span style="font-family:var(--display);font-size:21px;color:var(--navy);letter-spacing:0">현장 사진첩</span><span>${L.length}장</span></h2>
    <p class="foot" style="margin:0 0 10px">여러 장을 한 번에 올리면 찍은 날짜별로 나눠서 보관해요. 사진을 길게 누르면 여러 장 골라서 지우거나 날짜를 바꿀 수 있어요.</p>
    <button class="solve" data-al="pick" style="width:100%;min-height:50px">+ 사진 올리기 (여러 장 가능)</button>
    ${L.length > 1 && window.DUPES ? '<button class="ghost apick2" data-al="dupes">🔍 중복 사진 찾기</button>' : ''}
    ${progHtml()}
    ${groups.map((g, gi) => `<div class="amon${isFold('m-' + g.ym, gi >= 1) ? ' folded' : ''}"><h3 class="agh" data-fold="m-${g.ym}">${head(g.ym)} · ${cnt(g.ym)}장</h3>${g.days.map(d => `<div class="agd" data-day="${d.date}">${dayHead(d.date)}<em>${d.items.length}장</em></div><div class="agrid">${d.items.map(cell).join('')}</div>`).join('')}<button class="afold" data-al="foldm" data-k="m-${g.ym}">▴ ${+g.ym.slice(5)}월 사진 접기</button></div>`).join('') || '<p class="vempty" style="margin-top:12px">아직 올린 사진이 없어요.</p>'}
    ${L.length > shown.length ? `<button class="addperiod" data-al="more">더 보기 (${L.length - shown.length}장 남음)</button>` : ''}
    ${L.length ? '<button class="afold" data-al="folds">▴ 현장 사진첩 접기</button>' : ''}
  </section>`;
}

// ---------- 올리기 줄 (IndexedDB) ----------
const Q = { left: 0, total: 0, done: 0, run: false, stuck: false };
let dbp = null;
function qdb() {
  if (!dbp) dbp = new Promise((res, rej) => { const r = indexedDB.open('soeun-upload', 1); r.onupgradeneeded = () => r.result.createObjectStore('q', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return dbp;
}
async function qdo(mode, fn) {
  const db = await qdb();
  return new Promise((res, rej) => { const tx = db.transaction('q', mode), st = tx.objectStore('q'), r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); });
}
const qAll = () => qdo('readonly', st => st.getAll()).then(a => (a || []).sort((x, y) => x.at - y.at)).catch(() => []);
const qDel = id => qdo('readwrite', st => st.delete(id)).catch(() => {});
function progHtml() {
  if (!Q.left) return '';
  const pct = Q.total ? Math.round(Q.done / Q.total * 100) : 0;
  return `<div class="aprog" role="status"><div><b>${Q.stuck ? '잠깐 멈춤' : '올리는 중'} ${Q.done}/${Q.total}</b><span>${pct}%</span></div><i><u style="width:${pct}%"></u></i><small>${Q.stuck ? '인터넷이 다시 되면 이어서 올려요.' : '앱을 나갔다 와도 남은 사진을 이어서 올려요. 화면을 켜 두면 더 빨라요.'}</small></div>`;
}
const showProg = () => { const el = document.querySelector('.aprog'), h = progHtml(); if (el) { if (h) el.outerHTML = h; else el.remove(); } };
let wake = null;
async function pump() {
  if (Q.run || S.mode !== 'ok' || !S.profile || !S.profile.birth) return;
  let items = await qAll(); if (!items.length) { Q.left = 0; return; }
  Q.run = true; Q.stuck = false;
  if (Q.total < Q.done + items.length) Q.total = Q.done + items.length;
  try { wake = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch (x) { wake = null; }
  let last = null;
  try {
    while (items.length) {
      const it = items[0]; Q.left = items.length; showProg();
      let photo;
      try { photo = await readPhoto(it.file, true); } catch (x) { await qDel(it.id); toast('읽지 못한 사진 1장은 건너뛰었어요'); items = await qAll(); continue; }
      const date = clampDay(it.date || it.fb || (it.lm ? localDay(it.lm) : ''));
      // 줄 번호를 문서 id로 써서, 올린 뒤 앱이 꺼져 다시 올려도 같은 사진이 두 장 생기지 않아요
      const res = await run('saveItem', 'mom', Object.assign({ id: it.id, type: it.type || 'free', of: it.of || '', who: it.who || '', title: '', date, memo: '', photo, by: it.by || myRole() }, it.geo ? { geo: it.geo } : {}, it.tm ? { tm: it.tm } : {}));   // 찍은 시각은 위치가 없어도 (탐문 경로 위 자리 찾기)
      PHOTOS[res.id] = photo; last = res; Q.done++;
      await qDel(it.id);
      items = await qAll();
      setData(res.data); if (S.tab === 'album' && !S.view && S.albumView !== 'board' && !document.querySelector('.sheet.open')) render();
    }
    Q.left = 0;
    if (Q.done) toast(`사진 ${Q.done}장을 보관했어요`);
    Q.done = 0; Q.total = 0;
  } catch (x) {
    console.error(x); Q.stuck = true; toast(`${Q.done}장 올리고 잠깐 멈췄어요. 인터넷이 되면 이어서 올려요`);
  } finally {
    Q.run = false; try { wake && wake.release(); } catch (x) {} wake = null;
    if (last) apply(last.data); else showProg();
  }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(pump, 800); });
window.addEventListener('online', () => setTimeout(pump, 800));

// ---------- 여러 장 고르기 (파일 칸은 body에 고정) ----------
const picker = document.createElement('input');
picker.type = 'file'; picker.accept = 'image/*,application/octet-stream'; picker.multiple = true; picker.hidden = true;
document.body.appendChild(picker);
picker.addEventListener('change', () => { const files = [...picker.files]; picker.value = ''; queue(files); });
// 크롬은 '사진만' 받는 칸이면 안드로이드 사진 선택 창을 띄워요(위치를 지워서 넘겨줌). 다른 종류도 받는 칸으로 열면
// 파일 고르기 창이 떠서 왼쪽 메뉴에서 갤러리 앱(앨범 폴더)·내 파일을 고를 수 있고, 위치도 대개 그대로 와요. 사진이 아닌 건 queue에서 걸러요
const picker2 = document.createElement('input');
picker2.type = 'file'; picker2.accept = 'image/*,application/octet-stream'; picker2.multiple = true; picker2.hidden = true;
document.body.appendChild(picker2);
picker2.addEventListener('change', () => { const files = [...picker2.files]; picker2.value = ''; if (files.length && !files.some(f => /^image\//.test(f.type))) { toast('사진 파일만 올릴 수 있어요'); return; } queue(files); });
// 최초 목격에 사진 더 올리기 (어느 기록에 붙일지 기억해 두고 고르기)
const exPicker = document.createElement('input');
exPicker.type = 'file'; exPicker.accept = 'image/*,application/octet-stream'; exPicker.multiple = true; exPicker.hidden = true;
document.body.appendChild(exPicker);
let exFor = null;
exPicker.addEventListener('change', () => { const files = [...exPicker.files]; exPicker.value = ''; const m = S.moments.find(x => x.id === exFor); if (m) queue(files, { type: 'extra', of: m.id, fb: m.date }); });
// 원본을 먼저 폰 안에 줄 세워 둬요 (찍은 날짜도 이때 읽어요). more: { type:'extra', of, fb(날짜 없을 때) }
// fill: { geo, tm, date } 사진에 없을 때만 채울 값 (탐문 기록의 장소·탐문 중 찍은 때 위치). 줄 번호(=앨범 문서 id)들을 돌려줘요
async function queue(list, more, fill) {
  const files = [...list].filter(f => /^image\//.test(f.type));
  if (!files.length) return [];
  const F = fill || {};
  const by = myRole(), base = Date.now(), rows = [];
  for (let i = 0; i < files.length; i++) { const meta = files[i].__meta || await photoMeta(files[i]); /* __meta: 현장 사진에서 복사한 것 (찍은 날짜·시각·위치 그대로) */ rows.push(Object.assign({ id: 'f' + base.toString(36) + i.toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 6), at: base + i, file: files[i], date: meta.date || F.date || '', geo: meta.geo || F.geo || '', tm: meta.tm || (meta.date ? '' : F.tm || ''), lm: files[i].lastModified || 0, by }, more || {})); }
  // 중복 거르기: 같이 고른 똑같은 파일(이름·크기·수정 시각), 이미 올린 사진과 찍은 시각이 초까지 같은 사진
  const seen = new Set(), same = new Map(), dupIn = [];
  rows.forEach(r => { const k = r.file.name + '|' + r.file.size + '|' + r.lm; if (seen.has(k)) dupIn.push(r); else seen.add(k); });
  rows.forEach(r => { if (r.tm && r.tm.length === 8 && !dupIn.includes(r) && !r.file.__meta) { const m = (S.moments || []).find(x => x.photo && x.date === r.date && x.tm === r.tm); if (m) same.set(r.id, m.id); } });
  let skip = new Set(dupIn.map(r => r.id));
  if (same.size && await ask(`이미 올린 사진과 찍은 시각이 초까지 같은 사진이 ${same.size}장 있어요.\n같은 사진 같아요. 빼고 올릴까요?`, { ok: '빼고 올리기', no: '다 올리기' })) same.forEach((v, k) => skip.add(k));
  const out = rows.map(r => same.has(r.id) && skip.has(r.id) ? same.get(r.id) : r.id).filter((id, i) => !dupIn.includes(rows[i]));
  rows.splice(0, rows.length, ...rows.filter(r => !skip.has(r.id)));
  if (!rows.length) { toast('모두 이미 올린 사진이라 건너뛰었어요'); return out; }
  try { await qdo('readwrite', st => { rows.forEach(r => st.put(r)); }); }
  catch (x) { mem.push(...rows); }
  Q.total += rows.length; Q.left += rows.length; showProg();
  const ng = rows.filter(r => r.geo && !(fill && fill.geo === r.geo)).length;
  toast(`${rows.length}장을 올리기 시작해요${ng ? ` · 📍 위치 있는 사진 ${ng}장` : ''}`);
  if (mem.length) pumpMem(); else pump();
  return out;   // 건너뛴 중복은 이미 있는 사진 id로 (탐문 기록에 그대로 붙어요)
}
// ---------- 갤러리 앱에서 공유로 받은 사진 (sw.js가 share-in 캐시에 넣어 둠) ----------
let SH = null;
async function shared() {
  if (!('caches' in window) || (S.me && S.me.viewer) || SH) return;
  let c, ks; try { c = await caches.open('share-in'); ks = await c.keys(); } catch (e) { return; }
  try { if (/[?&]shared=/.test(location.search)) history.replaceState(history.state, '', location.pathname); } catch (e) {}
  if (!ks.length) return;
  const files = [];
  for (const k of ks) { try { const r = await c.match(k); if (!r) continue; const b = await r.blob(); files.push(new File([b], decodeURIComponent(r.headers.get('x-name') || 'photo.jpg'), { type: b.type || r.headers.get('content-type') || 'image/jpeg', lastModified: +r.headers.get('x-lm') || Date.now() })); } catch (e) {} }
  SH = { files, c, ks };
  if (!files.length) return shDone();
  pending = undefined;
  // 사진 안의 찍은 시각·위치가 살아 왔는지 바로 보여 줘요
  let nt = 0, ng = 0; for (const f of files) { try { const m = await photoMeta(f); if (m.tm) nt++; if (m.geo) ng++; } catch (e) {} }
  openSheet(`<h3>사진 ${files.length}장을 받았어요</h3><p class="hint" style="margin:-6px 0 8px">어디에 올릴까요? 찍은 날짜는 사진에서 알아서 읽어요.</p>
    <p class="shmeta">🕒 찍은 시각 있는 사진 ${nt}장 · ${ng ? `📍 위치 있는 사진 <b>${ng}장</b> — 지도에 저절로 꽂혀요` : '📍 위치는 안 왔어요'}</p>
    <div class="shpick"><button class="primary" data-al="shfree">📷 현장 사진첩</button><button class="primary" data-al="shfam">👨‍👩‍👧 가족 사진</button></div>
    ${window.WALK ? '<button class="ghost" data-al="shwalk" style="width:100%;margin-top:8px;min-height:46px">🐾 탐문 기록으로 (산책·나들이 사진)</button>' : ''}
    <div class="actions"><button class="secondary" data-al="shx">올리지 않기</button></div>`);
}
async function shDone() { const h = SH; SH = null; if (h) for (const k of h.ks) { try { await h.c.delete(k); } catch (e) {} } }

// IndexedDB를 못 쓰는 폰(사생활 보호 모드 등)에선 메모리에서만 올려요
const mem = [];
async function pumpMem() {
  if (Q.run) return; Q.run = true;
  try {
    while (mem.length) {
      const it = mem[0]; showProg();
      const photo = await readPhoto(it.file, true);
      const res = await run('saveItem', 'mom', Object.assign({ id: it.id, type: it.type || 'free', of: it.of || '', who: it.who || '', title: '', date: clampDay(it.date || it.fb || localDay(it.lm)), memo: '', photo, by: it.by }, it.geo ? { geo: it.geo } : {}, it.tm ? { tm: it.tm } : {}));
      PHOTOS[res.id] = photo; mem.shift(); Q.done++; Q.left = mem.length; apply(res.data);
    }
    toast(`사진 ${Q.done}장을 보관했어요`); Q.done = Q.total = Q.left = 0;
  } catch (x) { toast(`${Q.done}장 올리고 멈췄어요: ${(x && x.message) || ''}`); mem.length = 0; Q.done = Q.total = Q.left = 0; }
  finally { Q.run = false; render(); }
}

// ---------- 최초 목격 추가 사진 ----------
const extras = id => S.moments.filter(m => m.type === 'extra' && m.of === id).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id < b.id ? -1 : 1));
// 폴라로이드 아래 작은 사진 줄 (누르면 크게 보기, 옆으로 넘기면 같이 넘어가요)
function exStrip(m) {
  const L = extras(m.id); if (!L.length) return '';
  const show = L.slice(0, 4);
  return `<span class="exstrip">${show.map((x, i) => { const ph = safeImg(PHOTOS[x.id]); return `<span class="exth" data-view="${x.id}">${ph ? `<img src="${ph}" alt="" loading="lazy" decoding="async">` : ''}${i === 3 && L.length > 4 ? `<b>+${L.length - 4}</b>` : ''}</span>`; }).join('')}</span>`;
}
// 편집창 안: 추가 사진 목록 + 더 올리기
function exField(id) {
  const L = id ? extras(id) : [];
  return `<div class="field" id="exfield"><span>사진 더${L.length ? ` (${L.length}장)` : ''}</span>
    ${L.length ? `<div class="exgrid">${L.map(x => { const ph = safeImg(PHOTOS[x.id]); return `<span class="exg">${ph ? `<img src="${ph}" alt="">` : '<i>불러오는 중</i>'}<button class="exdel" data-al="exdel" data-id="${x.id}" aria-label="이 사진 빼기">×</button></span>`; }).join('')}</div>` : ''}
    ${id ? `<button class="addperiod" data-al="extra" data-id="${id}" style="margin-top:8px">+ 사진 여러 장 더 올리기</button>` : `<p class="hint" style="margin:0">위에서 사진을 여러 장 고르면 첫 장은 대표 사진, 나머지는 여기에 붙어요.</p>`}</div>`;
}
const refreshEx = id => { const el = document.getElementById('exfield'); if (el) el.outerHTML = exField(id); };
// 최초 목격을 지우면 붙은 사진도 같이 지워요
async function dropExtras(id) {
  const L = extras(id); let last = null;
  for (const x of L) { try { last = await run('deleteItem', 'mom', x.id); delete PHOTOS[x.id]; } catch (e) {} }
  if (last) apply(last.data);
}

// ---------- 현장 사진첩: 길게 눌러 골라서 지우기 ----------
let SEL = null, pressT = 0, pressXY = null, eat = false;
const bar = document.createElement('div');
bar.className = 'selbar'; bar.hidden = true;
document.body.appendChild(bar);
function syncSel() {
  document.querySelectorAll('.acell').forEach(c => c.classList.toggle('sel', !!SEL && SEL.has(c.dataset.view)));
  document.querySelectorAll('.agrid').forEach(g => g.classList.toggle('selmode', !!SEL));
  if (!SEL) { bar.hidden = true; return; }
  bar.hidden = false;
  const ty = [...SEL].map(i => (S.moments.find(m => m.id === i) || {}).type), toFam = !ty.length || ty.some(t => t === 'free'), movable = ty.length && ty.every(t => t === 'free' || t === 'fam');   // 현장 사진첩 ↔ 가족 앨범 (사용자 요청 2026.10.15)
  bar.innerHTML = `<b>${SEL.size}장 골랐어요</b>${movable ? `<button data-sel="move">${toFam ? '👨‍👩‍👧 가족앨범으로' : '📸 사건 앨범으로'}</button>` : ''}<button data-sel="date" ${SEL.size ? '' : 'disabled'}>날짜 바꾸기</button><button data-sel="del" class="sdel" ${SEL.size ? '' : 'disabled'}>삭제</button><button data-sel="off">취소</button>`;
}
function selOn(id) { SEL = new Set(id ? [id] : []); syncSel(); try { navigator.vibrate && navigator.vibrate(18); } catch (x) {} toast('더 누르거나, 날짜를 누르면 그날 전부'); }
function selOff() { SEL = null; syncSel(); }
document.addEventListener('pointerdown', e => {
  const c = e.target.closest('.acell'); if (!c || SEL) return;
  pressXY = [e.clientX, e.clientY]; clearTimeout(pressT);
  pressT = setTimeout(() => { eat = true; selOn(c.dataset.view); }, 480);
});
document.addEventListener('pointermove', e => { if (pressXY && Math.hypot(e.clientX - pressXY[0], e.clientY - pressXY[1]) > 10) { clearTimeout(pressT); pressXY = null; } });
['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, () => { clearTimeout(pressT); pressXY = null; }));
// 고르는 중엔 사진을 눌러도 크게 보기 대신 체크 (크게 보기보다 먼저 받아요)
window.addEventListener('click', e => {
  const c = e.target.closest('.acell'), d = e.target.closest('.agd');
  if (eat && c) { eat = false; e.preventDefault(); e.stopImmediatePropagation(); return; }
  eat = false;
  if (!SEL) return;
  if (c) { e.preventDefault(); e.stopImmediatePropagation(); const id = c.dataset.view; SEL.has(id) ? SEL.delete(id) : SEL.add(id); syncSel(); }
  else if (d) { e.preventDefault(); e.stopImmediatePropagation(); const ids = frees().filter(m => m.date === d.dataset.day).map(m => m.id), all = ids.every(i => SEL.has(i)); ids.forEach(i => all ? SEL.delete(i) : SEL.add(i)); syncSel(); }
}, true);
bar.addEventListener('click', async e => {
  const b = e.target.closest('[data-sel]'); if (!b || !SEL) return;
  if (b.dataset.sel === 'off') return selOff();
  if (b.dataset.sel === 'move') {
    const items = [...SEL].map(i => S.moments.find(m => m.id === i)).filter(m => m && (m.type === 'free' || m.type === 'fam')), toFam = items.some(m => m.type === 'free');
    const to = toFam ? 'fam' : 'free'; if (!(await ask(`${items.length}장을 ${toFam ? '가족 앨범' : '사건 앨범(현장 사진첩)'}으로 옮길까요?`, { ok: '옮기기' }))) return;
    selOff(); let last = null, n = 0;
    for (const m of items) { toast(`옮기는 중 ${n + 1}/${items.length}`); try { last = await run('saveItem', 'mom', { id: m.id, type: to, of: '', who: '', title: m.title || '', date: m.date, memo: m.memo || '', by: m.by || myRole() }); n++; } catch (x) { toast(errMsg(x)); break; } }
    if (last) apply(last.data); if (n) toast(`${n}장을 ${toFam ? '가족 앨범' : '사건 앨범'}으로 옮겼어요`);
    return;
  }
  if (b.dataset.sel === 'date') {
    const first = S.moments.find(m => m.id === [...SEL][0]);
    pending = undefined;
    openSheet(`<h3>${SEL.size}장 날짜 바꾸기</h3><p class="hint" style="margin:-8px 0 14px">고른 사진을 모두 이 날짜로 옮겨요.</p>
      <label class="field"><span>날짜</span><input id="as-date" type="date" value="${first ? first.date : today()}" min="${S.profile.birth}" max="${today()}"></label>
      <div class="actions"><button class="secondary" data-act="close">취소</button><button class="primary" data-al="seldate">바꾸기</button></div>`);
    return;
  }
  if (b.dataset.sel === 'del') {
    if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = `한 번 더 누르면 ${SEL.size}장 삭제`; return; }
    const ids = [...SEL]; selOff();
    let last = null, n = 0;
    for (const id of ids) { toast(`지우는 중 ${n + 1}/${ids.length}`); try { last = await run('deleteItem', 'mom', id); delete PHOTOS[id]; n++; } catch (x) { toast(errMsg(x)); break; } }
    if (last) apply(last.data);
    if (n) toast(`사진 ${n}장을 지웠어요`);
  }
});
async function setDates(d) {
  const ids = [...SEL]; let last = null, n = 0;
  for (const id of ids) {
    const m = S.moments.find(x => x.id === id); if (!m) continue;
    try { last = await run('saveItem', 'mom', { id, type: m.type === 'fam' ? 'fam' : 'free', of: '', title: m.title || '', date: d, memo: m.memo || '', by: m.by || myRole() }); n++; } catch (x) { toast(errMsg(x)); break; }
  }
  selOff(); closeSheet(); if (last) apply(last.data); if (n) toast(`${n}장을 ${fmtK(d, true)}로 옮겼어요`);
}
// 다른 화면으로 가면 고르기 끝
function afterRender() { if (SEL && !document.querySelector('.agrid')) selOff(); else if (SEL) syncSel(); }

// ---------- 100일 보고서 사진 (미리 올려 두기) ----------
const reportDoc = () => S.moments.find(m => m.type === 'report');
function openReport() {
  const m = reportDoc(), d100 = addDays(S.profile.birth, 99);
  pending = undefined;
  openSheet(`<h3>100일 보고서 사진</h3>
    <p class="hint" style="margin:-8px 0 14px">${today() < d100 ? `100일(${fmtK(d100, true)})이 되기 전에 미리 올려 둬도 돼요. ` : ''}보고서 맨 위 사진으로 들어가요.</p>
    ${photoField(m ? safeImg(PHOTOS[m.id]) : '', '보고서 사진', true)}
    <p class="err" id="ar-err"></p>
    <div class="actions">${m ? `<button class="danger" data-act="delmom" data-id="${m.id}">삭제</button>` : ''}<button class="secondary" data-act="close">취소</button><button class="primary" data-al="rsave">저장</button></div>`);
}
// ---------- 설명·날짜 고치기 ----------
function openFree(id) {
  const m = S.moments.find(x => x.id === id); if (!m) return;
  pending = undefined;
  openSheet(`<h3>현장 사진</h3>
    ${photoField(safeImg(PHOTOS[id]), '사진', true)}
    <label class="field"><span>설명 (선택)</span><input id="af-title" maxlength="30" value="${esc(m.title || '')}" placeholder="예: 할머니 댁 첫 방문"></label>
    <label class="field"><span>날짜</span><input id="af-date" type="date" value="${m.date}" min="${S.profile.birth}" max="${today()}"></label>
    ${window.EXPLORE ? EXPLORE.whereHtml(id) : ''}
    <label class="field"><span>메모 (선택)</span><textarea id="af-memo" maxlength="200" placeholder="예: 처음으로 까르르 웃은 날">${esc(m.memo || '')}</textarea></label>
    <p class="err" id="af-err"></p>
    <div class="actions"><button class="danger" data-act="delmom" data-id="${id}">삭제</button><button class="secondary" data-act="close">취소</button><button class="primary" data-al="save" data-id="${id}">저장</button></div>`);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-al]'); if (!b) return;
  switch (b.dataset.al) {
    case 'pick': case 'pick2': selOff(); picker2.click(); break;   // 늘 갤러리 앱·파일 창 (사용자 요청)
    case 'dupes': selOff(); DUPES.open(); break;
    case 'shfree': case 'shfam': {
      if (!SH) return; const fam = b.dataset.al === 'shfam', files = SH.files;
      closeSheet(); S.tab = 'album'; S.view = ''; S.albumView = fam ? 'family' : 'album'; render(); window.scrollTo(0, 0);
      await queue(files, fam ? { type: 'fam', who: '' } : undefined); shDone(); break;
    }
    case 'shx': closeSheet(); shDone(); break;
    case 'shwalk': { if (!SH) return; const files = SH.files; closeSheet(); S.tab = 'town'; S.view = ''; S.townView = ''; render(); window.scrollTo(0, 0); WALK.formWith(files); shDone(); break; }
    case 'extra': exFor = b.dataset.id; pickInto('extra', b.dataset.id); break;
    case 'exdel': {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = '빼기'; b.classList.add('sure'); return; }
      const id = b.dataset.id, x = S.moments.find(m => m.id === id);
      try { const res = await run('deleteItem', 'mom', id); delete PHOTOS[id]; apply(res.data); refreshEx(x && x.of); toast('사진을 뺐어요'); } catch (er) { toast(errMsg(er)); }
      break;
    }
    case 'seldate': { const d = document.getElementById('as-date').value; if (d) await setDates(d); break; }
    case 'report': openReport(); break;
    case 'rsave': {
      const m = reportDoc();
      if (pending === undefined) { if (!m) { document.getElementById('ar-err').textContent = '사진을 골라 주세요'; return; } closeSheet(); return; }
      if (pending === null) { if (m && await write('deleteItem', 'mom', m.id)) { delete PHOTOS[m.id]; closeSheet(); toast('보고서 사진을 뺐어요'); } else closeSheet(); return; }
      const res = await write('saveItem', 'mom', { id: m ? m.id : undefined, type: 'report', title: '100일 보고서', date: today(), memo: '', photo: pending, by: myRole() });
      if (res) { PHOTOS[res.id] = pending; render(); closeSheet(); toast('보고서 사진을 넣었어요'); }
      break;
    }
    case 'more': A.more += 30; render(); break;
    // 아래쪽 접기 단추: 접고 나서 그 제목이 화면 위에 오게
    case 'foldm': case 'folds': {
      const box = b.closest(b.dataset.al === 'foldm' ? '.amon' : 'section'), key = b.dataset.al === 'foldm' ? b.dataset.k : 'a-free'; if (!box) return;
      setFold(key, true); box.classList.add('folded');
      const h = box.querySelector(b.dataset.al === 'foldm' ? '.agh' : '.sh'), y = h.getBoundingClientRect().top + window.scrollY - 70;
      if (h.getBoundingClientRect().top < 70) window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      break;
    }
    case 'save': {
      const id = b.dataset.id, d = document.getElementById('af-date').value;
      if (!d) { document.getElementById('af-err').textContent = '날짜를 골라 주세요'; return; }
      if (pending === null) { document.getElementById('af-err').textContent = '사진을 빼려면 삭제를 눌러 주세요'; return; }
      const o = { id, type: 'free', title: document.getElementById('af-title').value.trim(), date: d, memo: document.getElementById('af-memo').value.trim(), by: myRole() };
      if (pending !== undefined) o.photo = pending;
      const res = await write('saveItem', 'mom', o);
      if (res) { if (pending) PHOTOS[id] = pending; render(); closeSheet(); toast('사진 정보를 저장했어요'); }
      break;
    }
  }
});


// ---------- 사진 가져오기: 먼저 '현장 사진에서 고르기 / 갤러리 앱에서 올리기'를 물어요 (사용자 요청: 사진은 거의 다 현장 사진첩에 올려 두니까) ----------
// choose(opt) → { ids } 현장 사진에서 고른 것 · 'gallery' 갤러리 앱 · null 취소
//   opt: { multi, date(그날 사진 먼저), have(이미 붙은 사진 Set — 표시만), title }
// 쓰는 곳: 편집창 사진 칸(photoField: 100일 보고서·최초 목격·월별 사진·프로필·봉인 사진 → 복사본), 최초 목격 '사진 더'·가족 사진(복사본, 찍은 날짜·시각 그대로),
//          탐문 기록 사진(복사 없이 그 사진을 기록에 붙이기 — walk.js)
const PK = { opt: {}, sel: [], n: 60, box: null, res: null, step: 'ask' };
const pkList = () => (S.moments || []).filter(m => m.type !== 'report' && safeImg(PHOTOS[m.id])).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.tm || '').localeCompare(a.tm || '') || String(b.id).localeCompare(String(a.id)));
function choose(opt) {
  if (PK.res) { const r = PK.res; PK.res = null; r(null); }
  PK.opt = opt || {}; PK.sel = []; PK.n = 60;
  if (!pkList().length) return Promise.resolve('gallery');   // 현장 사진이 아직 없으면 바로 갤러리
  return new Promise(res => { PK.res = res; pkOpen(PK.opt.direct ? 'grid' : 'ask'); });
}
const done = v => { const r = PK.res; PK.res = null; pkHide(); if (r) r(v); };
function pkOpen(step) {
  PK.step = step;
  if (!PK.box) {
    PK.box = document.createElement('div'); PK.box.className = 'pkbox'; PK.box.setAttribute('role', 'dialog'); document.body.appendChild(PK.box);
    PK.box.addEventListener('click', pkClick);
  }
  const L = pkList(), o = PK.opt, have = o.have || new Set();
  if (step === 'ask') {
    const nd = o.date ? L.filter(m => m.date === o.date).length : 0;
    PK.box.innerHTML = `<div class="pkcard"><b class="pkt">${esc(o.title || '사진을 어디서 가져올까요?')}</b>
    <button class="pkbig" data-pk="mine">📷 현장 사진에서 고르기<small>${nd ? `${fmtK(o.date, true)}에 찍은 사진 ${nd}장 먼저 · ` : ''}이미 올린 사진 ${L.length}장 중에서</small></button>
    <button class="pkbig" data-pk="gal">📁 갤러리 앱에서 올리기<small>${esc(o.gnote || '폰에 있는 새 사진')}</small></button>
    <button class="pkx" data-pk="x">취소</button></div>`;
  } else {
    const cell = m => { const i = PK.sel.indexOf(m.id), on = i >= 0, had = have.has(m.id);
      return `<button class="pkc${on ? ' on' : ''}${had ? ' had' : ''}" data-pk="c" data-id="${m.id}"${had ? ' disabled' : ''}><img src="${safeImg(PHOTOS[m.id])}" alt="" loading="lazy" decoding="async">${on ? `<i>${o.multi ? i + 1 : '✓'}</i>` : ''}${had ? '<em>붙어 있음</em>' : m.tm && o.date ? `<s>${m.tm.slice(0, 5)}</s>` : ''}</button>`; };
    let h = '';
    const day = o.date ? L.filter(m => m.date === o.date).sort((a, b) => (a.tm || '').localeCompare(b.tm || '')) : [];
    if (day.length) h += `<div class="pkym day">📅 ${fmtK(o.date, true)}에 찍은 사진 ${day.length}장</div>` + day.map(cell).join('');
    let lastYm = ''; const rest = L.filter(m => !day.includes(m));
    if (day.length && rest.length) h += '<div class="pkym">다른 날 사진</div>';
    rest.slice(0, PK.n).forEach(m => { const ym = (m.date || '').slice(0, 7); if (ym !== lastYm) { lastYm = ym; h += `<div class="pkym">${ym ? `${ym.slice(0, 4)}년 ${+ym.slice(5)}월` : '날짜 없음'}</div>`; } h += cell(m); });
    PK.box.innerHTML = `<div class="pkfull"><div class="pktop"><button data-pk="${o.direct ? 'x' : 'ask'}" aria-label="뒤로">‹</button><b>현장 사진에서 고르기</b><small>${o.multi ? '여러 장 고를 수 있어요' + (o.copy ? ' (첫 장이 대표)' : '') : '한 장을 골라요'}</small></div>
      <div class="pkgrid">${h}${rest.length > PK.n ? '<button class="pkmore" data-pk="more">사진 더 보기</button>' : ''}</div>
      <div class="pkact"><button data-pk="x">취소</button><button class="go" data-pk="ok" ${PK.sel.length ? '' : 'disabled'}>${PK.sel.length ? `${PK.sel.length}장 ${esc(o.okLabel || '넣기')}` : '사진을 골라요'}</button></div></div>`;
    if (window.FOCUS) FOCUS.apply(PK.box);
  }
  PK.box.hidden = false; document.documentElement.classList.add('pk-open');
}
function pkHide() { if (!PK.box || PK.box.hidden) return false; PK.box.hidden = true; PK.box.innerHTML = ''; document.documentElement.classList.remove('pk-open'); return true; }
function pkClose() { if (!PK.box || PK.box.hidden) return false; done(null); return true; }   // 뒤로가기·취소
async function pkClick(e) {
  const b = e.target.closest('[data-pk]'); if (!b) { if (e.target === PK.box) pkClose(); return; }
  const a = b.dataset.pk;
  if (a === 'x') return pkClose();
  if (a === 'ask') return pkOpen('ask');
  if (a === 'gal') return done('gallery');
  if (a === 'mine') return pkOpen('grid');
  const keep = fn => { const g = PK.box.querySelector('.pkgrid'), y = g ? g.scrollTop : 0; fn(); pkOpen('grid'); const g2 = PK.box.querySelector('.pkgrid'); if (g2) g2.scrollTop = y; };
  if (a === 'more') return keep(() => { PK.n += 60; });
  if (a === 'c') { const id = b.dataset.id; keep(() => { const i = PK.sel.indexOf(id); if (i >= 0) PK.sel.splice(i, 1); else if (PK.opt.multi) PK.sel.push(id); else PK.sel = [id]; }); if (!PK.opt.multi && PK.sel.length) done({ ids: PK.sel.slice() }); return; }
  if (a === 'ok' && PK.sel.length) return done({ ids: PK.sel.slice() });
}
// 고른 사진을 그림으로 다시 그려 복사본 파일로 (찍은 날짜·시각·위치는 원본 그대로 __meta에)
async function copyFile(id, big) {
  const im = await CV.img(safeImg(PHOTOS[id])), max = big ? 1600 : 900, sc = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
  c.width = Math.round(im.naturalWidth * sc); c.height = Math.round(im.naturalHeight * sc); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); if (im.__blob) URL.revokeObjectURL(im.__blob);
  let q = .85, d = c.toDataURL('image/jpeg', q); const LIM = big ? 380000 : 180000; while (d.length > LIM && q > .4) { q -= .08; d = c.toDataURL('image/jpeg', q); }
  const m = S.moments.find(x => x.id === id) || {}, bl = await (await fetch(d)).blob();
  return Object.assign(new File([bl], id + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }), { __data: d, __meta: { date: m.date || '', tm: m.tm || '', geo: m.geo && m.geo !== '-' ? m.geo : '' } });
}
async function copyFiles(ids, big) {
  const out = []; let n = 0; toast(`사진 ${ids.length}장을 가져오는 중…`);
  for (const id of ids) { try { out.push(await copyFile(id, big)); } catch (x) { n++; } }
  if (n) toast(`${n}장은 불러오지 못했어요`);
  return out;
}
// ① 편집창 사진 칸 (photoField): 현장 사진이면 복사해서 이 칸 사진으로, 여러 장이면 나머지는 '사진 더'로
document.addEventListener('click', async e => {
  const lab = e.target.closest('#sheet .pbox'); if (!lab || !e.isTrusted) return;
  const inp = lab.querySelector('input[type=file]'); if (!inp || !pkList().length) return;
  e.preventDefault();
  const dEl = document.getElementById('m-date') || document.getElementById('af-date');
  const r = await choose({ multi: inp.multiple, copy: true, date: dEl && dEl.value || '' });
  if (!r) return;
  if (r === 'gallery') { if (inp.isConnected) inp.click(); return; }
  if (!inp.isConnected) return;
  try {
    const F = await copyFiles(r.ids, inp.dataset.big === '1'); if (!F.length) return;
    const f0 = F[0], m0 = f0.__meta; pending = f0.__data; EXTRA_FILES = F.slice(1);
    PGEO = m0.geo ? { geo: m0.geo, tm: m0.tm || '' } : null;
    const pv = document.getElementById('pv'); if (pv) { pv.src = pending; pv.hidden = false; } const rm = document.querySelector('[data-act=rmphoto]'); if (rm) rm.hidden = false;
    if (dEl && m0.date && m0.date >= S.profile.birth && m0.date <= today() && dEl.value !== m0.date) { dEl.value = m0.date; toast('사진 날짜(' + fmtK(m0.date, true) + ')로 맞췄어요'); }
    const exh = document.getElementById('exfield'); if (exh) { const o = exh.querySelector('.exnew'); if (o) o.remove(); if (EXTRA_FILES.length) exh.insertAdjacentHTML('beforeend', `<p class="hint exnew" style="margin:6px 0 0;color:var(--red)">+ ${EXTRA_FILES.length}장은 저장하면 '사진 더'에 붙어요</p>`); }
    if (window.__app && __app.sheetDirty) __app.sheetDirty();
  } catch (x) { toast('사진을 불러오지 못했어요. 갤러리 앱에서 골라 주세요'); }
}, true);
// ② 최초 목격 '사진 더' · 가족 사진: 현장 사진이면 복사본으로 (찍은 날짜·시각 그대로)
async function pickInto(kind, of) {
  const r = await choose({ multi: true, copy: true, okLabel: kind === 'fam' ? '가족 사진으로' : '붙이기', date: kind === 'extra' ? ((S.moments.find(x => x.id === of) || {}).date || '') : '' });
  if (!r) return;
  if (r === 'gallery') { if (kind === 'fam') famPicker.click(); else { exFor = of; exPicker.click(); } return; }
  const F = await copyFiles(r.ids, true); if (!F.length) return;
  if (kind === 'fam') queue(F, { type: 'fam', who: '' });
  else { const m = S.moments.find(x => x.id === of); if (m) queue(F, { type: 'extra', of: m.id, fb: m.date }); }
}
const famPicker = document.createElement('input');
famPicker.type = 'file'; famPicker.accept = 'image/*,application/octet-stream'; famPicker.multiple = true; famPicker.hidden = true;
document.body.appendChild(famPicker);
famPicker.addEventListener('change', () => { const files = [...famPicker.files].filter(f => /^image\//.test(f.type)); famPicker.value = ''; if (files.length) queue(files, { type: 'fam', who: '' }); });

const css = document.createElement('style');
css.textContent = `
.pkbox{position:fixed;inset:0;z-index:80;background:rgba(14,20,36,.55);display:flex;align-items:flex-end;justify-content:center}
.pkbox[hidden]{display:none}
.pkcard{width:100%;max-width:480px;background:var(--paper,#FBF6EC);border-radius:22px 22px 0 0;padding:20px 16px max(18px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px}
.pkt{font-family:var(--display);font-weight:400;font-size:20px;color:var(--navy);text-align:center;margin-bottom:4px}
.pkbig{min-height:64px;border-radius:16px;border:1.5px solid var(--navy);background:#fff;color:var(--navy);font-family:var(--display);font-size:17px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.pkbig small{font-family:var(--body,inherit);font-size:12px;opacity:.75}
.pkbig:first-of-type{background:var(--navy);color:#fff}
.pkx{min-height:44px;border:0;background:none;color:var(--ink2,#555);font-size:14px}
.pkfull{position:absolute;inset:0;background:var(--paper,#FBF6EC);display:flex;flex-direction:column;padding-top:env(safe-area-inset-top)}
.pktop{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1.5px dashed rgba(31,42,68,.25);flex-wrap:wrap}
.pktop button{width:40px;height:40px;border-radius:50%;border:1.5px solid var(--navy);background:#fff;font-size:22px;color:var(--navy)}
.pktop b{font-family:var(--display);font-weight:400;font-size:18px;color:var(--navy)}.pktop small{width:100%;font-size:12px;color:var(--ink2,#555)}
.pkgrid{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:max-content;gap:4px;padding:8px;align-content:start}
.pkym{grid-column:1/-1;font-family:var(--display);color:var(--navy);font-size:15px;padding:8px 2px 2px}
.pkc{position:relative;display:block;width:100%;height:0;min-height:0;padding:0 0 100%;border:0;border-radius:8px;overflow:hidden;background:#ddd}   /* 정사각 칸: 폰 크롬에서 aspect-ratio 단추가 줄 높이를 못 잡아 겹치던 것 */
.pkc img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.pkc.on{outline:3px solid var(--red);outline-offset:-3px}
.pkc.had{opacity:.55}.pkc em{position:absolute;left:0;right:0;bottom:0;font-style:normal;font-size:11px;background:rgba(31,42,68,.8);color:#fff;text-align:center;padding:2px 0}
.pkc s{position:absolute;left:4px;bottom:3px;text-decoration:none;font-size:11px;color:#fff;text-shadow:0 1px 2px #000}
.pkym.day{color:var(--red)}
.pkc i{position:absolute;right:5px;top:5px;min-width:24px;height:24px;border-radius:12px;background:var(--red);color:#fff;font-style:normal;font-size:13px;display:grid;place-items:center;padding:0 5px}
.pkmore{grid-column:1/-1;min-height:44px;border-radius:99px;border:1.5px solid var(--navy);background:#fff;color:var(--navy);margin:8px 0}
.pkact{display:flex;gap:8px;padding:10px 12px max(12px,env(safe-area-inset-bottom));border-top:1.5px dashed rgba(31,42,68,.25)}
.pkact button{flex:1;min-height:48px;border-radius:99px;border:1.5px solid var(--navy);background:#fff;color:var(--navy);font-size:15px}
.pkact .go{background:var(--red);border-color:var(--red);color:#fff}.pkact .go:disabled{opacity:.5}
.shpick{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px}.shpick button{min-height:64px;font-size:16px}
.agh{display:flex;align-items:center;font-size:13px;color:var(--navy);font-weight:700;letter-spacing:0;margin:16px 0 6px;padding:8px 12px;background:var(--card2);border-radius:14px}
.agh::after{margin-left:auto!important}
.amon.folded .agh{background:#FFFDF7;border:1.5px dashed var(--line)}
.agrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.acell{position:relative;display:block;padding:0;border:0;background:var(--card2);aspect-ratio:1;overflow:visible}
.acell img{width:100%;height:100%;object-fit:cover;display:block;border:3px solid #FFFDF7;box-shadow:0 2px 6px rgba(43,38,34,.2)}
.acell .mph{width:100%;height:100%;display:grid;place-items:center;font-size:11px;color:var(--muted)}
.agd{display:flex;align-items:baseline;gap:8px;margin:12px 0 6px;font-size:13px}
.agd b{font-family:var(--display);font-weight:400;font-size:15px;color:var(--navy)}
.agd span{font-size:11px;color:var(--muted)}.agd em{margin-left:auto;font-style:normal;font-size:11px;color:var(--muted)}
.shmeta{margin:0 0 12px;font-size:13px;background:#FFFDF7;border:1px dashed var(--line);border-radius:12px;padding:6px 10px}.shmeta b{color:#2E7D5B}
.apick2{display:block;width:100%;margin-top:6px;min-height:42px;border-radius:99px;white-space:normal;line-height:1.3}.apick2 small{color:var(--muted);font-size:11.5px}
.aprog{margin-top:10px;background:#FFFDF7;border:1.5px solid var(--line);border-radius:14px;padding:10px 12px}
.aprog div{display:flex;justify-content:space-between;font-size:13px}.aprog b{color:var(--navy)}
.aprog i{display:block;height:8px;border-radius:99px;background:var(--card2);margin:6px 0 4px;overflow:hidden}
.aprog u{display:block;height:100%;background:var(--red);border-radius:99px;transition:width .3s}
.aprog small{font-size:11px;color:var(--muted)}
.acell.sel img{outline:3px solid var(--red);outline-offset:-3px;filter:brightness(.82)}
.agrid.selmode .acell::after{content:"";position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:50%;border:2px solid #fff;background:rgba(0,0,0,.25);box-shadow:0 1px 3px rgba(0,0,0,.3)}
.agrid.selmode .acell.sel::after{content:"✓";background:var(--red);color:#fff;font-size:14px;line-height:18px;text-align:center;font-weight:700}
.agrid.selmode .acell{animation:selwig .25s}
@keyframes selwig{50%{transform:scale(.96)}}
.selbar{position:fixed;left:10px;right:10px;max-width:540px;margin:0 auto;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:7;display:flex;align-items:center;gap:6px;background:#FFF8EC;border:2px solid var(--navy);border-radius:22px;padding:8px 8px 8px 14px;box-shadow:0 8px 20px rgba(31,42,68,.25)}
.selbar[hidden]{display:none}
.selbar{flex-wrap:wrap;row-gap:6px}.selbar b{flex:1 1 100%;font-family:var(--display);font-weight:400;font-size:15px;color:var(--navy);white-space:nowrap}
.selbar button{flex:1 1 auto;border:1.5px solid var(--line);background:#fff;border-radius:99px;min-height:40px;padding:0 12px;font-size:13px;white-space:nowrap}
.selbar .sdel{background:var(--red);border-color:var(--red);color:#fff}
.selbar button:disabled{opacity:.45}
.exstrip{display:flex;gap:4px;margin-top:2px}
.exth{position:relative;width:38px;height:38px;border-radius:8px;overflow:hidden;background:var(--card2);flex-shrink:0}
.exth img{width:100%;height:100%;object-fit:cover;display:block}
.exth b{position:absolute;inset:0;display:grid;place-items:center;background:rgba(31,42,68,.6);color:#fff;font-size:12px}
.exgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.exg{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:var(--card2)}
.exg img{width:100%;height:100%;object-fit:cover;display:block}
.exg i{position:absolute;inset:0;display:grid;place-items:center;font-size:11px;color:var(--muted);font-style:normal}
.exdel{position:absolute;top:3px;right:3px;min-width:26px;height:26px;border:0;border-radius:99px;background:rgba(31,42,68,.75);color:#fff;font-size:15px;line-height:1;padding:0 6px}
.exdel.sure{background:var(--red);font-size:12px}
.afold{display:block;width:100%;margin:10px 0 2px;border:1.5px dashed var(--line);background:#FFFDF7;border-radius:99px;min-height:40px;font-size:13px;color:var(--navy)}
.acell small{position:absolute;left:3px;right:3px;bottom:3px;padding:2px 4px;font-size:11px;line-height:1.3;color:#fff;background:rgba(31,42,68,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}`;
document.head.appendChild(css);

// 달력에서 날짜를 누르면: 현장 사진첩을 펼치고 그 날이 보이게 (더 보기·달 접기 풀기) — calendar.js
function reveal(date) {
  const L = frees(), i = L.findIndex(m => m.date === date); if (i < 0) return false;
  if (i >= A.more) A.more = i + 8;
  setFold('a-free', false); setFold('m-' + date.slice(0, 7), false); A.opened = true; return true;
}
const photoDays = () => { const M = new Map(); frees().forEach(m => { const a = M.get(m.date) || []; a.push(m); M.set(m.date, a); }); return M; };
window.ALBUM = { reveal, photoDays, choose, pickInto, pkClose, pickFiles: () => picker2.click(), shared, sectionHtml, openFree, isFree, photoDate, photoMeta, pump, openReport, reportDoc, queue, extras, exStrip, exField, dropExtras, afterRender };
})();
