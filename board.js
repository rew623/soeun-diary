// 수사 보드 — 사건 앨범 탭의 FBI 수사 게시판 (기존 기록을 모아 카드로 붙이고 빨간 실로 이어요)
(function () {
const T = { x: 0, y: 0, s: 1, init: false };        // 보드 위치·확대 (다시 그려도 그대로)
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const jit = (id, k, r) => (hash(id + k) % 1000) / 1000 * 2 * r - r;   // 카드마다 늘 같은 기울기·흔들림

// ---------- 카드 내용 ----------
function cards() {
  const p = S.profile, t = today(), d = dayNo(t), out = [];
  const ph = safeImg(PHOTOS.profile);
  out.push({ id: 'center', go: 'grow', cls: 'pola center', html: `${ph ? `<img src="${ph}" alt="${esc(p.name)} 사진">` : `<span class="bnoph" style="background:#FCEBD3">${CHARS.svg('baby', 'lens', { size: 150 })}</span>`}<b class="bt">${esc(p.name || '우리 아기')}</b><span class="bday">수사 <em>${d}</em>일째</span>` });

  ['엄마', '아빠'].forEach(r => {
    const k = r === '엄마' ? 'mom' : 'dad', im = safeImg(PHOTOS[k]);
    out.push({ id: k, go: 'grow', cls: 'pola small', html: `${im ? `<img src="${im}" alt="${r} 수사관 사진">` : `<span class="bnoph" style="background:#FCEBD3">${CHARS.svg(k, '', { face: true, size: 96 })}</span>`}<b class="bt">${r} 수사관</b>${p[k] ? `<small>${esc(p[k])}</small>` : ''}` });
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

  const ck = window.CHECKUPS && CHECKUPS.boardCard();
  if (ck) out.push(ck);
  if (window.CHARGES) out.push(CHARGES.boardCard());

  const fb = `${+p.birth.slice(0, 4) + 1}${p.birth.slice(4)}`;
  const ann = [['50일', addDays(p.birth, 49)], ['100일', addDays(p.birth, 99)], ['200일', addDays(p.birth, 199)], ['첫 돌', fb]];
  out.push({ id: 'ann', go: 'grow', cls: 'kraft', html: `<b class="bt">기념일 수배</b>${ann.map(([l, dt]) => { const n = daysBetween(t, dt); return `<p class="${n < 0 ? 'done' : ''}"><span>${l}</span><b>${n > 0 ? 'D-' + n : n === 0 ? '오늘!' : '해결'}</b><small>${fmtMD(dt)}</small></p>`; }).join('')}` });

  const fav = window.HOSP ? HOSP.favNames() : [];
  if (fav.length) out.push({ id: 'hosp', go: 'hosp', cls: 'kraft', html: `<b class="bt">★ 관심 병원</b>${fav.slice(0, 4).map(h => `<p class="bl">${esc(h.name)}${h.ph ? ' <small>약국</small>' : ''}</p>`).join('')}${fav.length > 4 ? `<small>외 ${fav.length - 4}곳</small>` : ''}` });

  S.moments.filter(m => m.board && m.photo).sort((a, b) => a.date < b.date ? -1 : 1).forEach(m => {
    const im = safeImg(PHOTOS[m.id]);
    out.push({ id: m.id, go: 'album', cls: 'pola', html: `${im ? `<img src="${im}" alt="${esc(m.title)} 사진">` : '<span class="bnoph">사진 불러오는 중</span>'}<b class="bt">${esc(m.title || '현장 사진')}</b><small>생후 ${dayNo(m.date)}일, ${fmtK(m.date, true)}</small>` });
  });
  return out;
}

function renderBoard() {
  const cs = cards();
  return `<div class="bwrap" id="bwrap"><div class="bstage" id="bstage">
    ${cs.map(c => `<div class="bcard ${c.cls}" data-bid="${esc(c.id)}" data-bgo="${c.go}" role="button" tabindex="0" ${c.id === 'center' ? 'data-center="1"' : ''}>${c.html}</div>`).join('')}
    <svg class="bstrings" id="bstrings" aria-hidden="true"></svg><svg class="bstrings bpins" id="bpins" aria-hidden="true"></svg></div>
    <div class="bhint">두 손가락으로 벌려 확대, 끌어서 이동 · 카드를 누르면 크게 보기</div></div>
    <p class="foot">앨범 사진을 크게 보고 "보드에 붙이기"를 누르면 여기에 붙어요.</p>`;
}

// ---------- 자동 배치 (콜라주: 가운데 아기 사진 둘레로 사방에 고르게, 크기·기울기 제각각, 살짝 겹쳐도 괜찮게) ----------
// 판은 화면보다 넓게 쓰고(옆으로도 퍼지게), 처음엔 판 전체 폭이 화면에 들어오게 줄여서 보여 줘요
function layout() {
  const wrap = document.getElementById('bwrap'), stage = document.getElementById('bstage');
  const W = wrap.clientWidth, vh = wrap.clientHeight;
  const els = [...stage.querySelectorAll('.bcard')];
  const center = els.find(e => e.dataset.center), others = els.filter(e => e !== center);
  els.forEach(el => {
    const id = el.dataset.bid, photo = el.classList.contains('pola');
    el.style.width = (el === center ? 190 : photo ? 128 + hash(id + 'w') % 26 : 122 + hash(id + 'w') % 22) + 'px';
  });
  const placed = [];
  const hit = (x, y, w, h) => placed.some(q => x < q.x + q.w - 22 && x + w - 22 > q.x && y < q.y + q.h - 30 && y + h - 30 > q.y);   // 조금은 겹쳐도 돼요
  const cw = center.offsetWidth, ch = center.offsetHeight;
  placed.push({ el: center, x: -cw / 2, y: -ch / 2, w: cw, h: ch });
  const GOLD = 2.39996, ar = Math.max(.8, Math.min(1.5, vh / W));   // 화면 비율에 맞춰 둥글게
  others.forEach((el, i) => {
    const w = el.offsetWidth, h = el.offsetHeight, a0 = i * GOLD + (hash(el.dataset.bid) % 100) / 100;
    for (let r = (cw + w) * .4, k = 0; k < 800; k++, r += 3.5) {
      const a = a0 + k * .3, x = Math.cos(a) * r - w / 2, y = Math.sin(a) * r * ar - h / 2;
      if (!hit(x, y, w, h)) { placed.push({ el, x, y, w, h }); return; }
    }
  });
  const M = 30, minX = Math.min(...placed.map(q => q.x)) - M, maxX = Math.max(...placed.map(q => q.x + q.w)) + M;
  const minY = Math.min(...placed.map(q => q.y)) - M, maxY = Math.max(...placed.map(q => q.y + q.h)) + M + 20;
  const SW = Math.max(W, maxX - minX), H = maxY - minY, ox = (SW - (maxX - minX)) / 2 - minX, off = -minY;
  placed.forEach(q => { q.x += ox; q.y += 0; });
  const pins = new Map();
  placed.forEach(q => {
    const el = q.el, id = el.dataset.bid, x = q.x + jit(id, 'x', 4), y = q.y + off + jit(id, 'y', 5);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.transform = `rotate(${jit(id, 'r', el === center ? 2 : 7).toFixed(2)}deg)`;
    el.style.zIndex = el === center ? 3 : 1 + (hash(id + 'z') % 2);
    el.classList.toggle('taped', el !== center && el.classList.contains('pola') && hash(id + 't') % 3 !== 0);   // 사진은 대부분 테이프로
    pins.set(el, { x: x + q.w / 2, y: y + 7, taped: el.classList.contains('taped') });
  });
  stage.style.width = SW + 'px'; stage.style.height = H + 'px';
  // 빨간 실: 가운데 압정에서 각 카드 압정으로, 살짝 처지는 곡선
  // 실은 카드 뒤로 지나가고(글씨를 가리지 않게), 압정은 카드 위에 꽂아요
  const c0 = pins.get(center), svg = document.getElementById('bstrings'), pinSvg = document.getElementById('bpins');
  [svg, pinSvg].forEach(v => { v.setAttribute('width', SW); v.setAttribute('height', H); v.setAttribute('viewBox', `0 0 ${SW} ${H}`); });
  let g = '', pg = '';
  others.forEach(el => {
    const p = pins.get(el); if (hash(el.dataset.bid + 's') % 3 === 0) return;   // 실은 몇 장만 이어서 덜 복잡하게
    const dist = Math.hypot(p.x - c0.x, p.y - c0.y), sag = Math.min(46, 10 + dist * 0.12);
    g += `<path d="M${c0.x.toFixed(1)} ${c0.y.toFixed(1)} Q${((c0.x + p.x) / 2).toFixed(1)} ${(Math.max(c0.y, p.y) + sag).toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}" class="bstr"/>`;
  });
  pins.forEach((p, el) => { if (p.taped) return; pg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${el === center ? 7 : 5.5}" class="bpin"/><circle cx="${(p.x - 1.6).toFixed(1)}" cy="${(p.y - 1.8).toFixed(1)}" r="1.8" fill="#fff" fill-opacity=".7"/>`; });
  const sh = id => `<defs><filter id="${id}" x="-5%" y="-5%" width="110%" height="120%"><feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#000" flood-opacity=".45"/></filter></defs>`;
  svg.innerHTML = `${sh('bsh')}<g filter="url(#bsh)">${g}</g>`;
  pinSvg.innerHTML = `${sh('bsh2')}<g filter="url(#bsh2)">${pg}</g>`;
  return { W, SW, H, vh, c0, min: Math.min(.5, (W - 12) / SW, vh / H) };   // 판 전체가 한 화면에 들어올 만큼까지 줄일 수 있게
}

// ---------- 끌어서 이동, 핀치 줌 ----------
const rng = (v, lo, hi) => lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v));
let dim = null, g = null, moved = false;
const pts = new Map();
function clamp() {
  if (!dim) return;
  T.s = Math.min(2.5, Math.max(dim.min || .5, T.s));
  const sw = dim.SW * T.s, sh = dim.H * T.s, m = 60;
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
      T.s = Math.min(2.5, Math.max(dim.min || .5, g.s0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0));
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
    T.s = Math.min(2.5, Math.max(dim.min || .5, s)); T.x = p.x - q.x * T.s; T.y = p.y - q.y * T.s; clamp(); apply();
  }, { passive: false });
  // 끌다가 손을 뗀 건 누른 걸로 치지 않아요
  wrap.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
}

// 화면을 다시 그릴 때마다 배치만 다시 하고, 보고 있던 위치·확대는 그대로
function mount() {
  const wrap = document.getElementById('bwrap'); if (!wrap) return;
  dim = layout(); bind(wrap);
  if (!T.init) {   // 처음엔 판 폭이 화면에 꼭 맞게, 가운데 아기 사진이 화면 가운데 오게
    T.init = true; T.s = Math.min(1, (dim.W - 12) / dim.SW); T.x = (dim.W - dim.SW * T.s) / 2;
    T.y = dim.H * T.s <= dim.vh ? (dim.vh - dim.H * T.s) / 2 : dim.vh / 2 - (dim.c0.y + 110) * T.s;
  }
  clamp(); apply();
  // 사진이 늦게 뜨면 카드 높이가 바뀌니 다시 배치
  wrap.querySelectorAll('img').forEach(im => { if (!im.complete) im.addEventListener('load', () => { if (document.getElementById('bwrap') === wrap) { dim = layout(); clamp(); apply(); } }, { once: true }); });
}

// 카드를 누르면 그 카드를 크게 보기 (사진은 사진 그대로, 뒤로가기로 닫힘)
const PHOTO_KEY = { center: 'profile', mom: 'mom', dad: 'dad' };
function goTo(go) {
  if (go === 'hosp' && window.HOSP) { HOSP.open('', 'hosp'); return; }
  if (go === 'album') S.albumView = 'album';
  else if (go === 'check') { S.tab = 'vac'; S.view = ''; S.vacView = 'check'; }
  else { S.tab = go; S.view = ''; }
  render(); window.scrollTo(0, 0);
}
const GO_LABEL = { check: '검진 일정으로', grow: '성장 수사로', vac: '예방접종으로', hosp: '병원 수사로', album: '앨범으로' };
document.addEventListener('click', e => {
  const c = e.target.closest('.bstage [data-bgo]'); if (!c) return;
  const id = c.dataset.bid, go = c.dataset.bgo, key = PHOTO_KEY[id] || (go === 'album' ? id : '');
  if (key && VIEWER.open(key)) return;
  const t = c.querySelector('.bt');
  VIEWER.openCard(`<div class="${c.className}">${c.innerHTML}</div>`, t ? t.textContent : '수사 보드', GO_LABEL[go], () => goTo(go));
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.bgo) e.target.click(); });

const css = document.createElement('style');
css.textContent = `
.bwrap{position:relative;margin:12px -12px 0;height:max(400px,calc(100vh - 250px - env(safe-area-inset-bottom,0px)));overflow:hidden;touch-action:none;border:8px solid #A9764A;border-radius:18px;box-shadow:inset 0 0 30px rgba(80,45,15,.35),0 4px 0 #8C5A33,0 8px 16px rgba(43,38,34,.25);
  background-color:#C79A6B;
  background-image:radial-gradient(rgba(110,70,35,.45) 1px,transparent 1.6px),radial-gradient(rgba(255,230,190,.35) 1px,transparent 1.8px),radial-gradient(rgba(90,55,25,.3) 1.5px,transparent 2.4px);
  background-size:7px 7px,11px 11px,23px 23px;background-position:0 0,3px 5px,9px 2px}
.bstage{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.bstrings{position:absolute;left:0;top:0;pointer-events:none;overflow:visible;z-index:0}
.bstrings.bpins{z-index:4}
.bstr{fill:none;stroke:#B3261E;stroke-width:1.8;stroke-linecap:round;stroke-dasharray:1 0;opacity:.8}
.bpin{fill:#B3261E;stroke:#6E1712;stroke-width:1}
.bcard{position:absolute;z-index:1;display:flex;flex-direction:column;gap:3px;padding:16px 8px 9px;font-family:var(--body);font-size:11px;line-height:1.35;color:var(--ink);box-shadow:0 4px 9px rgba(60,35,10,.35);border-radius:4px;transform-origin:50% 7px;cursor:pointer;text-align:left}
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
.aview{margin-top:14px}
.bcard.taped::before{content:"";position:absolute;top:-9px;left:50%;width:46%;height:16px;margin-left:-23%;background:rgba(248,216,209,.85);transform:rotate(-3deg);box-shadow:0 1px 2px rgba(0,0,0,.12)}
.bcard.taped:nth-of-type(3n)::before{background:rgba(252,232,180,.9)}.bcard.taped:nth-of-type(3n+1)::before{background:rgba(220,231,241,.92)}
.bcard.note{border-radius:2px 2px 14px 2px}`;
document.head.appendChild(css);

window.BOARD = { render: renderBoard, mount };
})();
