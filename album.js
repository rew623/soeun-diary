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

// ---------- 사진 찍은 날짜 (JPEG EXIF) ----------
// 줄이기 전 원본 파일에서 읽어요 (줄이면 EXIF가 사라져요). 못 읽으면 ''
async function photoDate(file) {
  try {
    const v = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (v.getUint16(0) !== 0xFFD8) return '';
    for (let o = 2; o + 10 < v.byteLength;) {
      const mk = v.getUint16(o), len = v.getUint16(o + 2);
      if ((mk & 0xFF00) !== 0xFF00 || mk === 0xFFDA) break;
      if (mk === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) return tiffDate(v, o + 10);
      o += 2 + len;
    }
  } catch (x) {}
  return '';
}
function tiffDate(v, t) {
  const le = v.getUint16(t) === 0x4949, u16 = p => v.getUint16(p, le), u32 = p => v.getUint32(p, le);
  const str = e => { const n = u32(e + 4), at = n > 4 ? t + u32(e + 8) : e + 8; let r = ''; for (let i = 0; i < n - 1; i++) r += String.fromCharCode(v.getUint8(at + i)); return r; };
  const scan = (ifd, want) => { const out = {}, n = u16(ifd); for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12, tag = u16(e); if (want.includes(tag)) out[tag] = tag === 0x8769 ? t + u32(e + 8) : str(e); } return out; };
  const i0 = scan(t + u32(t + 4), [0x8769, 0x0132]);
  const ex = i0[0x8769] ? scan(i0[0x8769], [0x9003, 0x9004]) : {};
  const m = /^(\d{4}):(\d\d):(\d\d)/.exec(ex[0x9003] || ex[0x9004] || i0[0x0132] || '');
  return m && m[1] > '1990' ? `${m[1]}-${m[2]}-${m[3]}` : '';
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
  const cell = m => { const ph = safeImg(PHOTOS[m.id]); return `<button class="acell" data-view="${m.id}" aria-label="${esc(m.title || '사진')} 크게 보기">${ph ? `<img src="${ph}" alt="" loading="lazy">` : '<span class="mph">불러오는 중</span>'}${m.board ? '<span class="onboard">보드</span>' : ''}${m.title ? `<small>${esc(m.title)}</small>` : ''}</button>`; };
  // 달별 묶음: 최근 두 달만 펼쳐 두고 그 전 달은 접어 둬요 (누르면 펼쳐지고, 이 폰에 기억)
  const cnt = ym => L.filter(m => m.date.slice(0, 7) === ym).length;
  return `<section${isFold('a-free') ? ' class="folded"' : ''}><h2 class="sh" data-fold="a-free" style="align-items:baseline"><span style="font-family:var(--display);font-size:21px;color:var(--navy);letter-spacing:0">현장 사진첩</span><span>${L.length}장</span></h2>
    <p class="foot" style="margin:0 0 10px">여러 장을 한 번에 올리면 찍은 날짜별로 나눠서 보관해요. 사진을 길게 누르면 여러 장 골라서 지우거나 날짜를 바꿀 수 있어요.</p>
    <button class="solve" data-al="pick" style="width:100%;min-height:50px">+ 사진 올리기 (여러 장 가능)</button>
    ${progHtml()}
    ${groups.map((g, gi) => `<div class="amon${isFold('m-' + g.ym, gi >= 2) ? ' folded' : ''}"><h3 class="agh" data-fold="m-${g.ym}">${head(g.ym)} · ${cnt(g.ym)}장</h3>${g.days.map(d => `<div class="agd" data-day="${d.date}">${dayHead(d.date)}<em>${d.items.length}장</em></div><div class="agrid">${d.items.map(cell).join('')}</div>`).join('')}</div>`).join('') || '<p class="vempty" style="margin-top:12px">아직 올린 사진이 없어요.</p>'}
    ${L.length > shown.length ? `<button class="addperiod" data-al="more">더 보기 (${L.length - shown.length}장 남음)</button>` : ''}
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
      const res = await run('saveItem', 'mom', { id: it.id, type: it.type || 'free', of: it.of || '', who: it.who || '', title: '', date, memo: '', photo, by: it.by || myRole() });
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
picker.type = 'file'; picker.accept = 'image/*'; picker.multiple = true; picker.hidden = true;
document.body.appendChild(picker);
picker.addEventListener('change', () => { const files = [...picker.files]; picker.value = ''; queue(files); });
// 최초 목격에 사진 더 올리기 (어느 기록에 붙일지 기억해 두고 고르기)
const exPicker = document.createElement('input');
exPicker.type = 'file'; exPicker.accept = 'image/*'; exPicker.multiple = true; exPicker.hidden = true;
document.body.appendChild(exPicker);
let exFor = null;
exPicker.addEventListener('change', () => { const files = [...exPicker.files]; exPicker.value = ''; const m = S.moments.find(x => x.id === exFor); if (m) queue(files, { type: 'extra', of: m.id, fb: m.date }); });
// 원본을 먼저 폰 안에 줄 세워 둬요 (찍은 날짜도 이때 읽어요). more: { type:'extra', of, fb(날짜 없을 때) }
async function queue(list, more) {
  const files = [...list].filter(f => /^image\//.test(f.type));
  if (!files.length) return;
  const by = myRole(), base = Date.now(), rows = [];
  for (let i = 0; i < files.length; i++) rows.push(Object.assign({ id: 'f' + base.toString(36) + i.toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 6), at: base + i, file: files[i], date: await photoDate(files[i]), lm: files[i].lastModified || 0, by }, more || {}));
  try { await qdo('readwrite', st => { rows.forEach(r => st.put(r)); }); }
  catch (x) { mem.push(...rows); }
  Q.total += rows.length; Q.left += rows.length; showProg();
  toast(`${rows.length}장을 올리기 시작해요`);
  if (mem.length) pumpMem(); else pump();
}
// IndexedDB를 못 쓰는 폰(사생활 보호 모드 등)에선 메모리에서만 올려요
const mem = [];
async function pumpMem() {
  if (Q.run) return; Q.run = true;
  try {
    while (mem.length) {
      const it = mem[0]; showProg();
      const photo = await readPhoto(it.file, true);
      const res = await run('saveItem', 'mom', { id: it.id, type: it.type || 'free', of: it.of || '', who: it.who || '', title: '', date: clampDay(it.date || it.fb || localDay(it.lm)), memo: '', photo, by: it.by });
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
  return `<span class="exstrip">${show.map((x, i) => { const ph = safeImg(PHOTOS[x.id]); return `<span class="exth" data-view="${x.id}">${ph ? `<img src="${ph}" alt="" loading="lazy">` : ''}${i === 3 && L.length > 4 ? `<b>+${L.length - 4}</b>` : ''}</span>`; }).join('')}</span>`;
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
  bar.innerHTML = `<b>${SEL.size}장 골랐어요</b><button data-sel="date" ${SEL.size ? '' : 'disabled'}>날짜 바꾸기</button><button data-sel="del" class="sdel" ${SEL.size ? '' : 'disabled'}>삭제</button><button data-sel="off">취소</button>`;
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
    try { last = await run('saveItem', 'mom', { id, type: 'free', of: '', title: m.title || '', date: d, memo: m.memo || '', by: m.by || myRole() }); n++; } catch (x) { toast(errMsg(x)); break; }
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
    <label class="field"><span>메모 (선택)</span><textarea id="af-memo" maxlength="200" placeholder="예: 처음으로 까르르 웃은 날">${esc(m.memo || '')}</textarea></label>
    <p class="err" id="af-err"></p>
    <div class="actions"><button class="danger" data-act="delmom" data-id="${id}">삭제</button><button class="secondary" data-act="close">취소</button><button class="primary" data-al="save" data-id="${id}">저장</button></div>`);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-al]'); if (!b) return;
  switch (b.dataset.al) {
    case 'pick': selOff(); picker.click(); break;
    case 'extra': exFor = b.dataset.id; exPicker.click(); break;
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

const css = document.createElement('style');
css.textContent = `
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
.selbar b{flex:1;font-family:var(--display);font-weight:400;font-size:15px;color:var(--navy);white-space:nowrap}
.selbar button{border:1.5px solid var(--line);background:#fff;border-radius:99px;min-height:40px;padding:0 12px;font-size:13px;white-space:nowrap}
.selbar .sdel{background:var(--red);border-color:var(--red);color:#fff}
.selbar button:disabled{opacity:.45}
.exstrip{display:flex;gap:4px;margin-top:2px}
.exth{position:relative;width:38px;height:38px;border-radius:8px;overflow:hidden;background:var(--card2);flex-shrink:0}
.exth img{width:100%;height:100%;object-fit:cover;display:block}
.exth b{position:absolute;inset:0;display:grid;place-items:center;background:rgba(31,42,68,.6);color:#fff;font-size:12px}
.exgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.exg{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:var(--card2)}
.exg img{width:100%;height:100%;object-fit:cover;display:block}
.exg i{position:absolute;inset:0;display:grid;place-items:center;font-size:10px;color:var(--muted);font-style:normal}
.exdel{position:absolute;top:3px;right:3px;min-width:26px;height:26px;border:0;border-radius:99px;background:rgba(31,42,68,.75);color:#fff;font-size:15px;line-height:1;padding:0 6px}
.exdel.sure{background:var(--red);font-size:12px}
.acell small{position:absolute;left:3px;right:3px;bottom:3px;padding:2px 4px;font-size:10px;line-height:1.3;color:#fff;background:rgba(31,42,68,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}`;
document.head.appendChild(css);

window.ALBUM = { sectionHtml, openFree, isFree, photoDate, pump, openReport, reportDoc, queue, extras, exStrip, exField, dropExtras, afterRender };
})();
