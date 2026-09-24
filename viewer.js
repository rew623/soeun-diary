// 사진 크게 보기(핀치 줌) + 안드로이드 뒤로가기 처리 + 길게 누르기 메뉴 막기
(function () {
// ---------- 사진 크게 보기 ----------
const lb = document.createElement('div');
lb.id = 'lbox'; lb.className = 'lbox'; lb.hidden = true;
lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
lb.innerHTML = `<div class="lb-stage"><img class="lb-img" alt=""></div>
  <div class="lb-top"><span class="lb-cap"></span><button class="lb-x" data-lb="close" aria-label="닫기">✕</button></div>
  <div class="lb-bar"><button class="lb-btn" data-lb="board" hidden></button><button class="lb-btn edit" data-lb="edit">편집</button></div>`;
document.body.appendChild(lb);
const $img = lb.querySelector('.lb-img'), $stage = lb.querySelector('.lb-stage');
let cur = null;                                    // { key, edit, boardId }
const Z = { s: 1, x: 0, y: 0 };
const draw = () => { $img.style.transform = `translate(${Z.x}px,${Z.y}px) scale(${Z.s})`; };
const reset = () => { Z.s = 1; Z.x = 0; Z.y = 0; draw(); };
function clampPan() {
  if (Z.s <= 1) { Z.s = 1; Z.x = 0; Z.y = 0; return; }
  const r = $stage.getBoundingClientRect(), w = $img.offsetWidth * Z.s, h = $img.offsetHeight * Z.s;
  const mx = Math.max(0, (w - r.width) / 2), my = Math.max(0, (h - r.height) / 2);
  Z.x = Math.min(mx, Math.max(-mx, Z.x)); Z.y = Math.min(my, Math.max(-my, Z.y));
}

// 사진 열쇠: profile(아기), mom·dad(수사관), 그 밖에는 앨범 사진 id
function info(key) {
  const p = S.profile || {};
  if (key === 'profile') return { cap: `${p.name || '우리 아기'}, 수사 ${dayNo(today())}일째`, edit: () => openSettings() };
  if (key === 'mom' || key === 'dad') { const r = key === 'mom' ? '엄마' : '아빠'; return { cap: `${r} 수사관${p[key] ? ' ' + p[key] : ''}`, edit: () => openInv(r) }; }
  const m = S.moments.find(x => x.id === key);
  if (!m) return null;
  return { cap: `${m.title}, 생후 ${dayNo(m.date)}일 (${fmtK(m.date, true)})`, edit: () => openMoment(key), boardId: key };
}
function boardBtn() {
  const b = lb.querySelector('[data-lb=board]');
  if (!cur || !cur.boardId) { b.hidden = true; return; }
  const m = S.moments.find(x => x.id === cur.boardId);
  b.hidden = false; b.textContent = m && m.board ? '보드에서 떼기' : '📌 보드에 붙이기';
}
function open(key) {
  const src = safeImg(PHOTOS[key]), i = info(key);
  if (!src || !i) return false;
  cur = Object.assign({ key }, i);
  $img.src = src; $img.alt = i.cap;
  lb.querySelector('.lb-cap').textContent = i.cap;
  boardBtn(); reset();
  lb.hidden = false; document.documentElement.classList.add('lb-open');
  return true;
}
function close() { if (lb.hidden) return; lb.hidden = true; cur = null; $img.removeAttribute('src'); document.documentElement.classList.remove('lb-open'); }
const isOpen = () => !lb.hidden;

// 사진을 누르면 편집창 대신 크게 보기
document.addEventListener('click', e => {
  const t = e.target.closest('[data-view]'); if (!t) return;
  e.preventDefault();
  if (!open(t.dataset.view)) { const i = info(t.dataset.view); if (i) i.edit(); }   // 사진을 아직 못 받았으면 편집창으로
});
lb.addEventListener('click', async e => {
  const b = e.target.closest('[data-lb]'); if (!b) return;
  e.stopPropagation();
  if (b.dataset.lb === 'close') close();
  if (b.dataset.lb === 'edit') { const f = cur && cur.edit; close(); if (f) f(); }
  if (b.dataset.lb === 'board' && cur && cur.boardId) {
    const m = S.moments.find(x => x.id === cur.boardId), on = !(m && m.board);
    b.disabled = true;
    if (await write('setBoard', cur.boardId, on)) toast(on ? '수사 보드에 붙였어요' : '수사 보드에서 뗐어요');
    b.disabled = false; boardBtn();
  }
});

// 핀치 줌, 끌어서 옮기기, 두 번 톡 확대, 배경 톡 닫기
const pts = new Map();
let g = null, lastTap = 0;
$stage.addEventListener('pointerdown', e => {
  $stage.setPointerCapture(e.pointerId);
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const r = $stage.getBoundingClientRect(), c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  const P = [...pts.values()];
  if (P.length === 1) g = { mode: 'pan', sx: e.clientX, sy: e.clientY, x0: Z.x, y0: Z.y, moved: false, t: Date.now(), onImg: e.target === $img, c };
  else if (P.length === 2) {
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
    if (Math.abs(dx) + Math.abs(dy) > 8) g.moved = true;
    if (Z.s > 1) { Z.x = g.x0 + dx; Z.y = g.y0 + dy; clampPan(); draw(); }
  }
});
function up(e) {
  if (!pts.has(e.pointerId)) return;
  pts.delete(e.pointerId);
  if (g && g.mode === 'pan' && !g.moved && Date.now() - g.t < 350) {
    if (!g.onImg) close();                        // 사진 바깥 배경을 톡 → 닫기
    else if (Date.now() - lastTap < 300) {        // 사진을 두 번 톡 → 확대/원래대로
      lastTap = 0;
      if (Z.s > 1) reset();
      else { const px = e.clientX - g.c.x, py = e.clientY - g.c.y; Z.s = 2.5; Z.x = -px * 1.5; Z.y = -py * 1.5; clampPan(); draw(); }
    } else lastTap = Date.now();
  }
  if (pts.size === 1) { const [p] = pts.values(); g = { mode: 'pan', sx: p.x, sy: p.y, x0: Z.x, y0: Z.y, moved: true, t: 0, c: g ? g.c : null }; }
  else if (!pts.size) g = null;
}
$stage.addEventListener('pointerup', up);
$stage.addEventListener('pointercancel', up);

// ---------- 안드로이드 뒤로가기 ----------
// 기록(history)에 "지킴이" 한 칸을 넣어 두고, 뒤로가기로 그 칸이 빠질 때마다 앱 안에서 처리한 뒤 다시 넣어요
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
.lb-stage{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;min-height:0}
.lb-img{max-width:100%;max-height:100%;object-fit:contain;transform-origin:center;will-change:transform;box-shadow:0 10px 30px rgba(0,0,0,.5);background:#FFFDF7;padding:6px}
.lb-top{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px 18px;background:linear-gradient(rgba(15,20,32,.85),transparent);color:var(--paper);pointer-events:none}
.lb-cap{flex:1;font-size:14px;line-height:1.4}
.lb-x{pointer-events:auto;width:44px;height:44px;border:0;border-radius:50%;background:rgba(233,220,195,.15);color:var(--paper);font-size:20px}
.lb-bar{display:flex;gap:10px;padding:10px 16px calc(14px + env(safe-area-inset-bottom,0px));justify-content:center}
.lb-btn{flex:1;max-width:220px;min-height:48px;border-radius:4px;border:1.5px solid var(--paper);background:none;color:var(--paper);font-family:var(--display);font-size:16px}
.lb-btn.edit{background:var(--red);border-color:var(--red);color:#fff}
.toast{z-index:60}`;
document.head.appendChild(css);

window.VIEWER = { open, close, isOpen };
})();
