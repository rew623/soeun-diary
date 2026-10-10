// 사진 크게 보기(옆으로 넘기기·핀치 줌) + 안드로이드 뒤로가기 처리 + 길게 누르기 메뉴 막기
(function () {
// ---------- 사진 크게 보기 ----------
// 이전·현재·다음 사진을 미리 나란히 놓고(3칸 트랙), 손가락을 따라 트랙을 밀다가 놓으면 부드럽게 넘어가요
const lb = document.createElement('div');
lb.id = 'lbox'; lb.className = 'lbox'; lb.hidden = true;
lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
lb.innerHTML = `<div class="lb-stage">
    <div class="lb-track">${'<div class="lb-slide"><img class="lb-img" alt="" draggable="false"></div>'.repeat(3)}</div>
    <div class="lb-card" hidden></div>
    <button class="lb-nav prev" data-lb="prev" aria-label="이전 사진" hidden>‹</button><button class="lb-nav next" data-lb="next" aria-label="다음 사진" hidden>›</button></div>
  <div class="lb-top"><span class="lb-cap"></span><button class="lb-x" data-lb="close" aria-label="닫기">✕</button></div>
  <div class="lb-bar"><button class="lb-btn" data-lb="board" hidden></button><button class="lb-btn edit" data-lb="edit">편집</button></div>`;
document.body.appendChild(lb);
const $stage = lb.querySelector('.lb-stage'), $track = lb.querySelector('.lb-track'), $card = lb.querySelector('.lb-card');
const slides = () => [...$track.children];                       // [이전, 현재, 다음] (넘길 때 순서를 돌려요)
let cur = null;                                    // { key, edit, boardId, editLabel }
let seq = [], idx = -1;                            // 옆으로 넘길 사진 목록 (누른 사진이 있는 칸의 사진들)
let savedY = 0;                                    // 사진을 열기 전 화면 위치
let $t = null;                                     // 확대·이동할 대상 (현재 사진 또는 수사 보드 카드)
let anim = false;                                  // 넘어가는 중
const Z = { s: 1, x: 0, y: 0 };
const draw = () => { if ($t) $t.style.transform = `translate(${Z.x}px,${Z.y}px) scale(${Z.s})`; };
const reset = () => { Z.s = 1; Z.x = 0; Z.y = 0; draw(); };
function clampPan() {
  if (Z.s <= 1) { Z.s = 1; Z.x = 0; Z.y = 0; return; }
  const r = $stage.getBoundingClientRect(), w = $t.offsetWidth * Z.s, h = $t.offsetHeight * Z.s;
  const mx = Math.max(0, (w - r.width) / 2), my = Math.max(0, (h - r.height) / 2);
  Z.x = Math.min(mx, Math.max(-mx, Z.x)); Z.y = Math.min(my, Math.max(-my, Z.y));
}
const W = () => $stage.clientWidth || window.innerWidth;
function setTrack(dx, ms) {
  $track.style.transition = ms ? `transform ${ms}ms cubic-bezier(.2,.8,.2,1)` : 'none';
  $track.style.transform = `translate3d(${-W() + dx}px,0,0)`;
}

// 사진 열쇠: profile(아기), mom·dad(수사관), 식단표, 앨범 사진, 증거 기록 사진
function info(key) {
  const p = S.profile || {};
  if (key === 'profile') return { cap: `${p.name || '우리 아기'}, 수사 ${dayNo(today())}일째`, edit: () => openSettings() };
  if (key === 'mom' || key === 'dad') { const r = key === 'mom' ? '엄마' : '아빠'; return { cap: `${r} 수사관${p[key] ? ' ' + p[key] : ''}`, edit: () => openInv(r) }; }
  const mn = (S.menus || []).find(x => x.id === key);
  if (mn) return { cap: `${mn.title || '식단표'} (${mn.month.replace('-', '.')})`, edit: () => openMenu(key) };
  const m = S.moments.find(x => x.id === key);
  if (m) {
    if (m.type === 'extra') { const pm = S.moments.find(x => x.id === m.of); return { cap: `${pm ? pm.title : '최초 목격'} 사진, 생후 ${dayNo(m.date)}일 (${fmtK(m.date, true)})`, edit: () => pm ? openMoment(pm.id) : null, boardId: key }; }
    if (m.type === 'fam') { return { cap: `${m.title ? m.title + ' · ' : ''}가족 사진 · 생후 ${dayNo(m.date)}일 (${fmtK(m.date, true)})`, edit: () => FAMILY.openPhoto(key), boardId: key }; }
    if (m.type === 'report') return { cap: `100일 보고서 사진`, edit: () => ALBUM.openReport(), boardId: key };
    if (m.type === 'free') return { cap: `${m.title || '현장 사진'}, 생후 ${dayNo(m.date)}일 (${fmtK(m.date, true)})`, edit: () => ALBUM.openFree(key), boardId: key };
    return { cap: `${m.title}, 생후 ${dayNo(m.date)}일 (${fmtK(m.date, true)})`, edit: () => openMoment(key), boardId: key };
  }
  const rc = (S.records || []).find(x => x.id === key);
  if (rc) {
    const v = ORDER.filter(k => rc[k] != null && rc[k] !== '').map(k => fmt(k, rc[k]) + KINDS[k].unit).join(' · ');
    return { cap: `${fmtK(rc.date, true)}, 수사 ${dayNo(rc.date)}일째${v ? ' · ' + v : ''}`, edit: () => openRecord(key) };
  }
  return null;
}
function boardBtn() {
  const b = lb.querySelector('[data-lb=board]');
  if (!cur || !cur.boardId) { b.hidden = true; return; }
  const m = S.moments.find(x => x.id === cur.boardId);
  b.hidden = false; b.textContent = m && m.board ? '보드에서 떼기' : '📌 보드에 붙이기';
}
// 칸 하나에 사진 넣기 (아직 안 받아졌으면 로딩 표시)
function fill(slide, key) {
  const im = slide.querySelector('img'), src = key ? safeImg(PHOTOS[key]) : '';
  im.style.transform = '';
  if (!src) { im.removeAttribute('src'); im.hidden = true; slide.classList.remove('loading'); slide.dataset.key = ''; return; }
  im.hidden = false; slide.dataset.key = key;
  if (im.getAttribute('src') !== src) {
    slide.classList.add('loading');
    im.onload = im.onerror = () => slide.classList.remove('loading');
    im.src = src;
    if (im.complete && im.naturalWidth) slide.classList.remove('loading');
  }
}
function header() {
  const many = seq.length > 1 && idx >= 0;
  lb.querySelector('.lb-cap').textContent = (cur ? cur.cap : '') + (many ? `  ·  ${idx + 1} / ${seq.length}` : '');
  lb.querySelector('.prev').hidden = !many || idx <= 0;
  lb.querySelector('.next').hidden = !many || idx >= seq.length - 1;
  const e = lb.querySelector('[data-lb=edit]');
  e.textContent = (cur && cur.editLabel) || '편집'; e.hidden = !(cur && cur.edit);
  boardBtn();
}
function showBox() {
  if (lb.hidden) { savedY = window.scrollY; lb.hidden = false; document.documentElement.classList.add('lb-open'); }
}
function open(key, list) {
  const i = info(key);
  if (!safeImg(PHOTOS[key]) || !i) return false;
  if (list) seq = list; else if (!seq.includes(key)) seq = [key];
  idx = seq.indexOf(key);
  cur = Object.assign({ key }, i);
  $track.hidden = false; $card.hidden = true; $card.innerHTML = '';
  const [a, b, c] = slides();
  fill(a, seq[idx - 1]); fill(b, key); fill(c, seq[idx + 1]);
  $t = b.querySelector('img'); Z.s = 1; Z.x = 0; Z.y = 0;
  showBox(); setTrack(0, 0); header();
  return true;
}
// 수사 보드의 글자 카드(성장·접종·기념일 등)를 크게 보기. go가 있으면 아래 버튼으로 해당 화면에 갈 수 있어요
function openCard(html, cap, goLabel, go) {
  cur = { key: '', cap, edit: go || null, editLabel: goLabel || '' }; seq = []; idx = -1;
  $track.hidden = true; $card.hidden = false; $card.innerHTML = html;
  $t = $card; reset(); showBox(); header();
}
function close() {
  if (lb.hidden) return;
  lb.hidden = true; cur = null; seq = []; idx = -1; $card.innerHTML = '';
  slides().forEach(s => fill(s, ''));
  document.documentElement.classList.remove('lb-open');
  const y = savedY; window.scrollTo(0, y); requestAnimationFrame(() => window.scrollTo(0, y));   // 누르기 전 위치 그대로
}
const isOpen = () => !lb.hidden;
// 옆 사진으로 (d: +1 다음, -1 이전). 트랙을 한 칸 밀고, 끝나면 칸 순서를 돌려 다음 사진을 미리 넣어요
function go(d, from) {
  if (anim || idx < 0) return;
  const j = idx + d;
  if (j < 0 || j >= seq.length || !info(seq[j])) { setTrack(0, 220); return; }
  anim = true; $t.style.transform = ''; Z.s = 1; Z.x = 0; Z.y = 0;
  const left = Math.abs((from || 0) + d * W());
  setTrack(-d * W(), Math.max(160, Math.min(300, left / W() * 320)));
  setTimeout(() => {
    const T = $track;
    if (d > 0) { T.appendChild(T.firstElementChild); fill(T.lastElementChild, seq[j + 1]); }
    else { T.insertBefore(T.lastElementChild, T.firstElementChild); fill(T.firstElementChild, seq[j - 1]); }
    idx = j; cur = Object.assign({ key: seq[j] }, info(seq[j]));
    $t = slides()[1].querySelector('img');
    setTrack(0, 0); header(); anim = false;
  }, Math.max(160, Math.min(300, left / W() * 320)) + 20);
}

// 사진을 누르면 편집창 대신 크게 보기 (증거 기록처럼 줄 전체가 편집으로 가는 곳도 사진만은 크게 보기)
document.addEventListener('click', e => {
  const t = e.target.closest('[data-view]'); if (!t) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const box = t.closest('section, .badges, .menus, .suspect, .recs') || t.parentElement;
  const list = [...new Set([...box.querySelectorAll('[data-view]')].map(el => el.dataset.view))].filter(k => safeImg(PHOTOS[k]) && info(k));
  if (!open(t.dataset.view, list)) { const i = info(t.dataset.view); if (i) i.edit(); }   // 사진을 아직 못 받았으면 편집창으로
});
lb.addEventListener('click', async e => {
  const b = e.target.closest('[data-lb]'); if (!b) return;
  e.stopPropagation();
  if (b.dataset.lb === 'close') close();
  if (b.dataset.lb === 'prev') go(-1);
  if (b.dataset.lb === 'next') go(1);
  if (b.dataset.lb === 'edit') { const f = cur && cur.edit; close(); if (f) f(); }
  if (b.dataset.lb === 'board' && cur && cur.boardId) {
    const m = S.moments.find(x => x.id === cur.boardId), on = !(m && m.board);
    b.disabled = true;
    if (await write('setBoard', cur.boardId, on)) { if (on && window.GAME) GAME.mark('board'); toast(on ? '수사 보드에 붙였어요' : '수사 보드에서 뗐어요'); }
    b.disabled = false; boardBtn();
  }
});

// 손가락: 옆으로 밀기(넘기기), 두 손가락 확대, 확대한 채 끌기, 두 번 톡 확대, 배경 톡 닫기
const pts = new Map();
let g = null, lastTap = 0;
const canSwipe = () => !$track.hidden && seq.length > 1 && Z.s <= 1;
$stage.addEventListener('pointerdown', e => {
  if (e.target.closest('button') || anim) return;      // ‹ › 버튼은 그냥 누르기
  $stage.setPointerCapture(e.pointerId);
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const r = $stage.getBoundingClientRect(), c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  const P = [...pts.values()];
  if (P.length === 1) g = { mode: 'pan', sx: e.clientX, sy: e.clientY, x0: Z.x, y0: Z.y, moved: false, t: Date.now(), dir: '', onImg: !!($t && $t.contains(e.target)), c };
  else if (P.length === 2) {
    if (g && g.dir === 'x') setTrack(0, 180);
    const mid = { x: (P[0].x + P[1].x) / 2 - c.x, y: (P[0].y + P[1].y) / 2 - c.y };
    g = { mode: 'pinch', d0: Math.hypot(P[0].x - P[1].x, P[0].y - P[1].y) || 1, s0: Z.s, qx: (mid.x - Z.x) / Z.s, qy: (mid.y - Z.y) / Z.s, moved: true, c };
  }
});
$stage.addEventListener('pointermove', e => {
  if (!pts.has(e.pointerId) || !g) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const P = [...pts.values()];
  if (g.mode === 'pinch' && P.length >= 2) {
    const d = Math.hypot(P[0].x - P[1].x, P[0].y - P[1].y);
    const mid = { x: (P[0].x + P[1].x) / 2 - g.c.x, y: (P[0].y + P[1].y) / 2 - g.c.y };
    Z.s = Math.min(5, Math.max(1, g.s0 * d / g.d0));
    Z.x = mid.x - g.qx * Z.s; Z.y = mid.y - g.qy * Z.s;
    clampPan(); draw();
  } else if (g.mode === 'pan') {
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.moved && Math.abs(dx) + Math.abs(dy) > 8) { g.moved = true; g.dir = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; }
    g.dx = dx; g.lt = Date.now();
    if (Z.s > 1) { Z.x = g.x0 + dx; Z.y = g.y0 + dy; clampPan(); draw(); }
    else if (g.dir === 'x' && canSwipe()) {
      const edge = (dx > 0 && idx <= 0) || (dx < 0 && idx >= seq.length - 1);
      setTrack(edge ? dx * .3 : dx, 0);                  // 처음·끝에서는 살짝만 밀려요
    }
  }
});
function up(e) {
  if (!pts.has(e.pointerId)) return;
  pts.delete(e.pointerId);
  if (g && g.mode === 'pan' && g.moved && g.dir === 'x' && Z.s <= 1 && canSwipe()) {
    const dx = g.dx || 0, v = dx / Math.max(1, Date.now() - g.t);   // 빠르게 튕기면 짧게 밀어도 넘어가요
    if (Math.abs(dx) > W() * .18 || (Math.abs(dx) > 30 && Math.abs(v) > .5)) go(dx < 0 ? 1 : -1, dx); else setTrack(0, 220);
  }
  if (g && g.mode === 'pan' && !g.moved && Date.now() - g.t < 350) {
    if (!g.onImg) close();                        // 사진 바깥 배경을 톡 → 닫기
    else if (Date.now() - lastTap < 300) {        // 사진을 두 번 톡 → 확대/원래대로
      lastTap = 0;
      if (Z.s > 1) reset();
      else { const px = e.clientX - g.c.x, py = e.clientY - g.c.y; Z.s = 2.5; Z.x = -px * 1.5; Z.y = -py * 1.5; clampPan(); draw(); }
    } else lastTap = Date.now();
  }
  if (pts.size === 1) { const [p] = pts.values(); g = { mode: 'pan', sx: p.x, sy: p.y, x0: Z.x, y0: Z.y, moved: true, dir: 'z', t: 0, c: g ? g.c : null }; }
  else if (!pts.size) g = null;
}
$stage.addEventListener('pointerup', up);
$stage.addEventListener('pointercancel', up);
window.addEventListener('resize', () => { if (!lb.hidden && !anim) setTrack(0, 0); });
document.addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'Escape') close(); });

// ---------- 안드로이드 뒤로가기 ----------
// 기록(history)에 "지킴이" 한 칸을 넣어 두고, 뒤로가기로 그 칸이 빠질 때마다 앱 안에서 처리한 뒤 다시 넣어요
// 뒤로가기로 지킴이 칸이 빠질 때 브라우저가 옛 스크롤 위치(맨 위)로 되돌리지 않게
try { history.scrollRestoration = 'manual'; } catch (e) {}
let waitExit = false, exitTimer = 0;
const guard = () => { if (!(history.state && history.state.soeunGuard)) history.pushState({ soeunGuard: 1 }, ''); };
try { history.replaceState(Object.assign({}, history.state, { soeunRoot: 1 }), ''); guard(); } catch (e) {}
// 크롬은 손을 대기 전에 넣은 기록을 건너뛸 수 있어서, 화면을 만질 때 한 번 더 확인해요
window.addEventListener('pointerdown', () => { if (!waitExit) guard(); }, true);

const sheetOpen = () => document.getElementById('sheet').classList.contains('open');
window.addEventListener('popstate', () => {
  if (history.state && history.state.soeunGuard) return;
  if (isOpen()) { close(); guard(); return; }                          // 1) 사진 크게 보기
  if (sheetOpen()) { closeSheet(); guard(); return; }                  // 2) 편집창 같은 아래 창
  if (window.SLIDE && SLIDE.close()) { guard(); return; }                            // 성장 스토리
  if (window.HOSP && HOSP.closeFull && HOSP.closeFull()) { guard(); return; }   // 3) 크게 본 병원 지도
  if (typeof S !== 'undefined' && S.view) {                            // 3) 병원 수사·100일 보고서 → 원래 탭
    if (S.view === 'hosp') S.tab = 'sick';
    S.view = ''; render(); window.scrollTo(0, 0); guard(); return;
  }
  if (typeof S !== 'undefined' && S.mode === 'ok' && S.tab !== 'grow') { // 4) 다른 탭 → 성장 수사
    S.tab = 'grow'; render(); window.scrollTo(0, 0); guard(); return;
  }
  // 5) 첫 탭: 2초 안에 한 번 더 누르면 종료 (지킴이 칸을 비워 둬서 다음 뒤로가기는 앱을 닫아요)
  waitExit = true; toast('한 번 더 누르면 종료돼요');
  clearTimeout(exitTimer);
  exitTimer = setTimeout(() => { waitExit = false; guard(); }, 2000);
});

// ---------- 길게 누르기 메뉴 막기 (입력칸은 그대로) ----------
document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea,[contenteditable]')) e.preventDefault(); });

const css = document.createElement('style');
css.textContent = `
.lbox{position:fixed;inset:0;z-index:50;background:#10151F;display:flex;flex-direction:column}
.lbox[hidden]{display:none}
html.lb-open,html.lb-open body{overflow:hidden}
.lb-stage{position:relative;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;min-height:0}
.lb-track{position:absolute;top:0;left:0;height:100%;width:300%;display:flex;will-change:transform}
.lb-track[hidden]{display:none}
.lb-slide{position:relative;flex:0 0 33.3333%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
.lb-img{max-width:100%;max-height:100%;object-fit:contain;transform-origin:center;will-change:transform;box-shadow:0 10px 30px rgba(0,0,0,.5);background:#FFFDF7;padding:6px;-webkit-user-drag:none}
.lb-img[hidden]{display:none}
.lb-slide.loading .lb-img{opacity:0}
.lb-slide.loading::after{content:"";position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border:3px solid rgba(233,220,195,.25);border-top-color:#E9DCC3;border-radius:50%;animation:lbspin .8s linear infinite}
@keyframes lbspin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.lb-slide.loading::after{animation-duration:2s}}
.lb-img:not([hidden]){transition:opacity .15s}
.lb-top{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px 18px;background:linear-gradient(rgba(15,20,32,.85),transparent);color:var(--paper);pointer-events:none;z-index:3}
.lb-cap{flex:1;font-size:14px;line-height:1.4}
.lb-x{pointer-events:auto;width:44px;height:44px;border:0;border-radius:50%;background:rgba(233,220,195,.15);color:var(--paper);font-size:20px}
.lb-bar{display:flex;gap:10px;padding:10px 16px calc(14px + env(safe-area-inset-bottom,0px));justify-content:center}
.lb-btn{flex:1;max-width:220px;min-height:48px;border-radius:4px;border:1.5px solid var(--paper);background:none;color:var(--paper);font-family:var(--display);font-size:16px}
.lb-btn.edit{background:var(--red);border-color:var(--red);color:#fff}
.lb-btn[hidden]{display:none}
.lb-nav{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:64px;border:0;border-radius:4px;background:rgba(233,220,195,.14);color:var(--paper);font-size:30px;line-height:1;z-index:2}
.lb-nav.prev{left:6px}.lb-nav.next{right:6px}.lb-nav[hidden]{display:none}
.lb-card{position:relative;z-index:1;width:min(86vw,340px);transform-origin:center;will-change:transform}
.lb-card[hidden]{display:none}
.lb-card .bcard{position:static;transform:none;width:100%;font-size:15px;padding:24px 18px 18px;gap:6px;cursor:default;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.lb-card .bcard .bt{font-size:24px}.lb-card .bcard small{font-size:13px}.lb-card .bcard p b{font-size:18px}
.lb-card .bcard .bbig{font-size:40px}.lb-card .bcard .bday{font-size:18px}.lb-card .bcard .bday em{font-size:32px}
.toast{z-index:60}`;
document.head.appendChild(css);

window.VIEWER = { open, openCard, close, isOpen };
})();
