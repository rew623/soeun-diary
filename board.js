// 수사 보드 — 사건 앨범 탭의 FBI 수사 게시판 (기존 기록을 모아 카드로 붙이고 빨간 실로 이어요)
(function () {
const T = { x: 0, y: 0, s: 1, init: false };        // 보드 위치·확대 (다시 그려도 그대로)
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const jit = (id, k, r) => (hash(id + k) % 1000) / 1000 * 2 * r - r;   // 카드마다 늘 같은 기울기·흔들림

// ---------- 카드 내용 ----------
function cards() {
  const p = S.profile, t = today(), d = dayNo(t), out = [];
  const ph = safeImg(PHOTOS.profile);
  out.push({ id: 'center', go: 'grow', cls: 'pola center', html: `${ph ? `<img src="${ph}" alt="${esc(p.name)} 사진">` : '<span class="bnoph">사진 없음</span>'}<b class="bt">${esc(p.name || '우리 아기')}</b><span class="bday">수사 <em>${d}</em>일째</span>` });

  ['엄마', '아빠'].forEach(r => {
    const k = r === '엄마' ? 'mom' : 'dad', im = safeImg(PHOTOS[k]);
    out.push({ id: k, go: 'grow', cls: 'pola small', html: `${im ? `<img src="${im}" alt="${r} 수사관 사진">` : `<span class="bnoph">${I_BADGE.replace(/16/g, '30')}</span>`}<b class="bt">${r} 수사관</b>${p[k] ? `<small>${esc(p[k])}</small>` : ''}` });
  });

  const lh = latest('height'), lw = latest('weight');
  if (lh || lw) {
    const row = (k, r) => r ? `<p><span>${KINDS[k].label}</span><b>${fmt(k, r[k])}${KINDS[k].unit}</b><small>${fmtK(r.date, true)}</small></p>` : '';
    out.push({ id: 'growth', go: 'grow', cls: 'kraft', html: `<b class="bt">증거: 성장</b>${row('height', lh)}${row('weight', lw)}` });
  }

  const np = nextPeriod();
  if (np) {
    const dt = pDate(np), vs = vacsOf(np.id).filter(v => !v.done);
    out.push({ id: 'vac', go: 'vac', cls: 'kraft note', html: `<b class="bt">다음 출동</b><span class="bbig">${ddayText(dt)}</span><p>${esc(np.name)} 접종<small>${fmtK(dt, true)}${vs.length ? ', ' + esc(vs[0].name) + (vs.length > 1 ? ` 외 ${vs.length - 1}` : '') : ''}</small></p>` });
  }

  const fb = `${+p.birth.slice(0, 4) + 1}${p.birth.slice(4)}`;
  const ann = [['50일', addDays(p.birth, 49)], ['100일', addDays(p.birth, 99)], ['200일', addDays(p.birth, 199)], ['첫 돌', fb]];
  out.push({ id: 'ann', go: 'grow', cls: 'kraft', html: `<b class="bt">기념일 수배</b>${ann.map(([l, dt]) => { const n = daysBetween(t, dt); return `<p class="${n < 0 ? 'done' : ''}"><span>${l}</span><b>${n > 0 ? 'D-' + n : n === 0 ? '오늘!' : '해결'}</b><small>${fmtMD(dt)}</small></p>`; }).join('')}` });

  const fav = window.HOSP ? HOSP.favNames() : [];
  if (fav.length) out.push({ id: 'hosp', go: 'hosp', cls: 'kraft', html: `<b class="bt">★ 관심 병원</b>${fav.slice(0, 4).map(h => `<p class="bl">${esc(h.name)}${h.ph ? ' <small>약국</small>' : ''}</p>`).join('')}${fav.length > 4 ? `<small>외 ${fav.length - 4}곳</small>` : ''}` });

  S.moments.filter(m => m.board && m.photo).sort((a, b) => a.date < b.date ? -1 : 1).forEach(m => {
    const im = safeImg(PHOTOS[m.id]);
    out.push({ id: m.id, go: 'album', cls: 'pola', html: `${im ? `<img src="${im}" alt="${esc(m.title)} 사진">` : '<span class="bnoph">사진 불러오는 중</span>'}<b class="bt">${esc(m.title)}</b><small>생후 ${dayNo(m.date)}일, ${fmtK(m.date, true)}</small>` });
  });
  return out;
}

function renderBoard() {
  const cs = cards();
  return `<div class="bwrap" id="bwrap"><div class="bstage" id="bstage">
    ${cs.map(c => `<div class="bcard ${c.cls}" data-bid="${esc(c.id)}" data-bgo="${c.go}" role="button" tabindex="0" ${c.id === 'center' ? 'data-center="1"' : ''}>${c.html}</div>`).join('')}
    <svg class="bstrings" id="bstrings" aria-hidden="true"></svg><svg class="bstrings bpins" id="bpins" aria-hidden="true"></svg></div>
    <div class="bhint">두 손가락으로 확대, 끌어서 이동 · 카드를 누르면 해당 화면으로</div></div>
    <p class="foot">앨범 사진을 크게 보고 "보드에 붙이기"를 누르면 여기에 붙어요.</p>`;
}

// ---------- 자동 배치 (3칸 격자, 가운데는 아기, 가까운 칸부터 채움) ----------
function layout() {
  const wrap = document.getElementById('bwrap'), stage = document.getElementById('bstage');
  const W = wrap.clientWidth, cols = 3, cw = W / cols, pad = 16;
  const els = [...stage.querySelectorAll('.bcard')];
  const center = els.find(e => e.dataset.center), others = els.filter(e => e !== center);
  let R = Math.max(3, Math.ceil((others.length + 1) / cols)); if (R % 2 === 0) R++;
  const mid = (R - 1) / 2, cells = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < cols; c++) if (!(r === mid && c === 1)) cells.push({ r, c, d: Math.hypot((r - mid) * 1.15, c - 1) + (r < mid ? -0.01 : 0) });
  cells.sort((a, b) => a.d - b.d || a.r - b.r || a.c - b.c);
  const place = new Map([[center, { r: mid, c: 1 }]]);
  others.forEach((el, i) => place.set(el, cells[i]));
  els.forEach(el => { el.style.width = (cw - pad * 1.4) + 'px'; });
  const rowH = new Array(R).fill(0);
  els.forEach(el => { const q = place.get(el); rowH[q.r] = Math.max(rowH[q.r], el.offsetHeight + 34); });
  const top = [30]; for (let r = 1; r < R; r++) top[r] = top[r - 1] + (rowH[r - 1] || 60);
  const H = top[R - 1] + (rowH[R - 1] || 60) + 20;
  const pins = new Map();
  els.forEach(el => {
    const q = place.get(el), id = el.dataset.bid, w = el.offsetWidth, h = el.offsetHeight;
    const x = q.c * cw + (cw - w) / 2 + jit(id, 'x', 5), y = top[q.r] + ((rowH[q.r] || h) - 34 - h) / 2 + jit(id, 'y', 6);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.transform = `rotate(${jit(id, 'r', el === center ? 1.5 : 3.5).toFixed(2)}deg)`;
    pins.set(el, { x: x + w / 2, y: y + 7 });
  });
  stage.style.width = W + 'px'; stage.style.height = H + 'px';
  // 빨간 실: 가운데 압정에서 각 카드 압정으로, 살짝 처지는 곡선
  // 실은 카드 뒤로 지나가고(글씨를 가리지 않게), 압정은 카드 위에 꽂아요
  const c0 = pins.get(center), svg = document.getElementById('bstrings'), pinSvg = document.getElementById('bpins');
  [svg, pinSvg].forEach(v => { v.setAttribute('width', W); v.setAttribute('height', H); v.setAttribute('viewBox', `0 0 ${W} ${H}`); });
  let g = '', pg = '';
  others.forEach(el => {
    const p = pins.get(el), dist = Math.hypot(p.x - c0.x, p.y - c0.y), sag = Math.min(46, 10 + dist * 0.12);
    g += `<path d="M${c0.x.toFixed(1)} ${c0.y.toFixed(1)} Q${((c0.x + p.x) / 2).toFixed(1)} ${(Math.max(c0.y, p.y) + sag).toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}" class="bstr"/>`;
  });
  pins.forEach((p, el) => { pg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${el === center ? 7 : 5.5}" class="bpin"/><circle cx="${(p.x - 1.6).toFixed(1)}" cy="${(p.y - 1.8).toFixed(1)}" r="1.8" fill="#fff" fill-opacity=".7"/>`; });
  const sh = id => `<defs><filter id="${id}" x="-5%" y="-5%" width="110%" height="120%"><feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#000" flood-opacity=".45"/></filter></defs>`;
  svg.innerHTML = `${sh('bsh')}<g filter="url(#bsh)">${g}</g>`;
  pinSvg.innerHTML = `${sh('bsh2')}<g filter="url(#bsh2)">${pg}</g>`;
  return { W, H, vh: wrap.clientHeight, c0 };
}

// ---------- 끌어서 이동, 핀치 줌 ----------
const rng = (v, lo, hi) => lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v));
let dim = null, g = null, moved = false;
const pts = new Map();
function clamp() {
  if (!dim) return;
  T.s = Math.min(2.5, Math.max(0.5, T.s));
  const sw = dim.W * T.s, sh = dim.H * T.s, m = 60;
  T.x = rng(T.x, dim.W - sw - m, m); T.y = rng(T.y, dim.vh - sh - m, m);
}
function apply() { const st = document.getElementById('bstage'); if (st) st.style.transform = `translate(${T.x}px,${T.y}px) scale(${T.s})`; }
function bind(wrap) {
  if (wrap.dataset.bound) return; wrap.dataset.bound = '1';
  const local = e => { const r = wrap.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  wrap.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, local(e));
    if (pts.size === 1) { const p = local(e); g = { sx: p.x, sy: p.y, x0: T.x, y0: T.y }; moved = false; }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      g = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: T.s, qx: (mid.x - T.x) / T.s, qy: (mid.y - T.y) / T.s }; moved = true;
    }
  });
  wrap.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !g) return;
    pts.set(e.pointerId, local(e));
    if (g.pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()], mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      T.s = Math.min(2.5, Math.max(0.5, g.s0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0));
      T.x = mid.x - g.qx * T.s; T.y = mid.y - g.qy * T.s;
    } else if (!g.pinch) {
      const p = local(e), dx = p.x - g.sx, dy = p.y - g.sy;
      if (Math.abs(dx) + Math.abs(dy) > 8) { moved = true; if (!wrap.hasPointerCapture(e.pointerId)) wrap.setPointerCapture(e.pointerId); }
      if (moved) { T.x = g.x0 + dx; T.y = g.y0 + dy; }
    }
    clamp(); apply();
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pts.size === 1) { const [p] = pts.values(); g = { sx: p.x, sy: p.y, x0: T.x, y0: T.y }; }
    else if (!pts.size) g = null;
  };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
  wrap.addEventListener('wheel', e => {                  // PC: 휠로 확대
    e.preventDefault();
    const p = local(e), s = T.s * (e.deltaY < 0 ? 1.1 : 1 / 1.1), q = { x: (p.x - T.x) / T.s, y: (p.y - T.y) / T.s };
    T.s = Math.min(2.5, Math.max(0.5, s)); T.x = p.x - q.x * T.s; T.y = p.y - q.y * T.s; clamp(); apply();
  }, { passive: false });
  // 끌다가 손을 뗀 건 누른 걸로 치지 않아요
  wrap.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
}

// 화면을 다시 그릴 때마다 배치만 다시 하고, 보고 있던 위치·확대는 그대로
function mount() {
  const wrap = document.getElementById('bwrap'); if (!wrap) return;
  dim = layout(); bind(wrap);
  if (!T.init) { T.init = true; T.s = 1; T.x = 0; T.y = dim.H <= dim.vh ? (dim.vh - dim.H) / 2 : 0; }   // 처음엔 폰 폭에 맞춰 위에서부터
  clamp(); apply();
  // 사진이 늦게 뜨면 카드 높이가 바뀌니 다시 배치
  wrap.querySelectorAll('img').forEach(im => { if (!im.complete) im.addEventListener('load', () => { if (document.getElementById('bwrap') === wrap) { dim = layout(); clamp(); apply(); } }, { once: true }); });
}

document.addEventListener('click', e => {
  const c = e.target.closest('[data-bgo]'); if (!c) return;
  const go = c.dataset.bgo;
  if (go === 'hosp' && window.HOSP) { HOSP.open('', 'hosp'); return; }
  if (go === 'album') S.albumView = 'album';
  else { S.tab = go; S.view = ''; }
  render(); window.scrollTo(0, 0);
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.bgo) e.target.click(); });

const css = document.createElement('style');
css.textContent = `
.bwrap{position:relative;margin:12px -12px 0;height:max(400px,calc(100vh - 250px - env(safe-area-inset-bottom,0px)));overflow:hidden;touch-action:none;border:7px solid #3A2A1C;border-radius:6px;box-shadow:inset 0 0 40px rgba(0,0,0,.55),0 4px 12px rgba(43,38,34,.35);
  background-color:#6E5338;
  background-image:radial-gradient(rgba(40,26,14,.55) 1px,transparent 1.6px),radial-gradient(rgba(220,180,130,.28) 1px,transparent 1.8px),radial-gradient(rgba(30,18,8,.35) 1.5px,transparent 2.4px);
  background-size:7px 7px,11px 11px,23px 23px;background-position:0 0,3px 5px,9px 2px}
.bstage{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.bstrings{position:absolute;left:0;top:0;pointer-events:none;overflow:visible;z-index:0}
.bstrings.bpins{z-index:4}
.bstr{fill:none;stroke:#B3261E;stroke-width:2.2;stroke-linecap:round}
.bpin{fill:#B3261E;stroke:#6E1712;stroke-width:1}
.bcard{position:absolute;z-index:1;display:flex;flex-direction:column;gap:3px;padding:16px 8px 9px;font-family:var(--body);font-size:11px;line-height:1.35;color:var(--ink);box-shadow:0 5px 10px rgba(0,0,0,.45);transform-origin:50% 7px;cursor:pointer;text-align:left}
.bcard .bt{font-family:var(--display);font-weight:400;font-size:15px;color:var(--navy);line-height:1.15;word-break:keep-all}
.bcard small{font-size:10px;color:var(--muted)}
.bcard p{margin:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:0 5px;border-top:1px dashed rgba(107,95,82,.45);padding-top:3px}
.bcard p span{color:var(--muted)}.bcard p b{font-size:13px}
.bcard p.done{opacity:.55}.bcard p.done b{color:var(--red)}
.bcard p.bl{display:block}
.bcard.kraft{background:#D8BF8F;background-image:linear-gradient(135deg,rgba(255,255,255,.12),rgba(0,0,0,.06))}
.bcard.note{background:#EAD9B2}
.bcard .bbig{font-family:var(--display);font-size:26px;color:var(--red);line-height:1.1}
.bcard.pola{background:#FFFDF7;padding:14px 7px 9px}
.bcard.pola img,.bcard .bnoph{width:100%;aspect-ratio:1;object-fit:cover;object-position:center 30%;display:grid;place-items:center;background:var(--card2);color:var(--muted);font-size:10px;margin-bottom:3px}
.bcard.pola.center{padding:16px 9px 10px;z-index:3}
.bcard.center .bt{font-size:18px;text-align:center}
.bcard .bday{font-family:var(--display);text-align:center;color:var(--ink);font-size:13px}
.bcard .bday em{font-style:normal;color:var(--red);font-size:22px}
.bcard.small .bt{font-size:14px}
.bhint{position:absolute;left:0;right:0;bottom:0;padding:6px 10px;font-size:11px;color:#EAD9B2;background:linear-gradient(transparent,rgba(20,12,4,.7));text-align:center;pointer-events:none;z-index:4}
.aview{margin-top:14px}`;
document.head.appendChild(css);

window.BOARD = { render: renderBoard, mount };
})();
