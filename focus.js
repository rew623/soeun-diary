// 사진에서 보여 줄 곳(초점) — 사진이 칸에 맞춰 잘릴 때(수사 보드·앨범 칸·가족·지난 오늘·사진관·소은일보·영상…) 얼굴이 잘리지 않게
// ① 직접 정한 자리: 사진 크게 보기의 '🎯 보여 줄 곳' → 얼굴을 톡 → 앨범 문서 fp "가로,세로"(0~1) — 두 폰 같이, 어디서든 이 자리
// ② 저절로: CV.focus(피부색·윤곽으로 찾기)를 화면에 보이는 사진부터 한가할 때 하나씩 계산해 이 폰에 기억(localStorage soeun-focus)
// 화면의 <img>는 object-position으로 (그 자리가 칸에서도 같은 비율 위치에 오게), canvas는 CV.cover가 FOCUS.of로
(function () {
const FK = 'soeun-focus';
let AUTO = {}; try { AUTO = JSON.parse(localStorage.getItem(FK) || '{}') || {}; } catch (e) {}
let saveT = 0; const saveAuto = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(FK, JSON.stringify(AUTO)); } catch (e) {} }, 1500); };
const parse = v => { const m = /^([01](?:\.\d+)?),([01](?:\.\d+)?)$/.exec(v || ''); return m ? { x: Math.min(1, +m[1]), y: Math.min(1, +m[2]) } : null; };
const fmt = p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
// 사진 주소 → 사진 id (PHOTOS가 바뀌면 다시 만들어요)
let REV = new Map(), revN = -1;
const PH = () => (typeof PHOTOS !== 'undefined' ? PHOTOS : {});   // index.html의 PHOTOS (window 속성이 아님)
function rev() { const ks = Object.keys(PH()); if (ks.length !== revN) { REV = new Map(); ks.forEach(k => { const u = safeImg(PH()[k]); if (u) REV.set(u, k); }); revN = ks.length; } return REV; }
const idOf = src => src ? rev().get(src) || null : null;
const momOf = id => (S.moments || []).find(m => m.id === id);
// 보여 줄 곳: 직접 정한 것 → 저절로 찾은 것 → 없음(null)
function of(id) {
  if (!id) return null;
  const m = momOf(id), man = m && parse(m.fp); if (man) return Object.assign(man, { manual: true });
  const a = parse(AUTO[id]); return a;
}
// canvas용: 이미지(CV.img가 __src를 달아 둠)로 찾기. 직접 정한 게 없으면 계산해서 기억
function forImage(im, calc) {
  const id = idOf(im.__src), f = of(id); if (f) return f;
  const g = calc(); if (id && g && !g.none) { AUTO[id] = fmt(g); saveAuto(); }
  return g;
}

// ---------- 화면의 사진 칸에 적용 ----------
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); enqueue(e.target.__fid); } }), { rootMargin: '300px' }) : null;
function apply(root) {
  if (!root) return;
  root.querySelectorAll('img').forEach(img => {
    const id = idOf(img.getAttribute('src')); if (!id) return;
    const f = of(id), v = f ? `${Math.round(f.x * 100)}% ${Math.round(f.y * 100)}%` : '';
    if (v) { if (img.dataset.fp !== v) { img.style.objectPosition = v; img.dataset.fp = v; } }
    else if (io && !DONE.has(id)) { img.__fid = id; io.observe(img); }
  });
}
// ---------- 저절로 찾기: 한가할 때 하나씩 ----------
const Q = [], DONE = new Set(); let busy = false;
const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2500 }) : setTimeout(f, 300));
function enqueue(id) { if (!id || DONE.has(id) || Q.includes(id) || of(id)) return; Q.push(id); if (!busy) idle(work); }
async function work() {
  const id = Q.shift(); if (!id) { busy = false; return; }
  busy = true; DONE.add(id);
  const u = safeImg(PH()[id]);
  if (u && window.CV && CV.img && CV.focus) {
    try {
      const im = await CV.img(u); im.__src = u; CV.focus(im);   // CV.focus가 forImage로 AUTO에 기억
      if (im.__blob) URL.revokeObjectURL(im.__blob); im.src = '';
      const f = of(id); if (f) document.querySelectorAll('#app img, #sheet img').forEach(img => { if (img.getAttribute('src') === u) { const v = `${Math.round(f.x * 100)}% ${Math.round(f.y * 100)}%`; img.style.objectPosition = v; img.dataset.fp = v; } });
    } catch (e) {}
  }
  if (Q.length) idle(work); else busy = false;
}

// ---------- 🎯 보여 줄 곳 정하기 (얼굴을 톡) ----------
let box = null, cur = null;
function pick(id) {
  const u = safeImg(PH()[id]), m = momOf(id); if (!u || !m) return;
  if (S.me && S.me.viewer) { toast('보기 전용이라 고칠 수 없어요'); return; }
  const f = of(id) || { x: .5, y: .38 }; cur = { id, x: f.x, y: f.y, manual: !!f.manual };
  if (!box) {
    box = document.createElement('div'); box.className = 'fpk'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '사진에서 보여 줄 곳 정하기');
    box.innerHTML = `<div class="fpk-top"><b>🎯 보여 줄 곳</b><small>얼굴(꼭 보여야 할 곳)을 톡 누르세요. 수사 보드·앨범·사진관·신문·영상에서 이 자리가 보이게 잘라요</small></div>
      <div class="fpk-stage"><img alt=""><i class="fpk-dot"></i></div>
      <div class="fpk-pv"><span class="w"></span><span class="s"></span><span class="t"></span></div>
      <div class="fpk-act"><button data-fpk="auto">저절로</button><button data-fpk="x">취소</button><button class="go" data-fpk="ok">저장</button></div>`;
    document.body.appendChild(box);
    const st = box.querySelector('.fpk-stage');
    st.addEventListener('click', e => { const im = st.querySelector('img'), r = im.getBoundingClientRect(), nw = im.naturalWidth, nh = im.naturalHeight; if (!nw || !nh) return;
      const k = Math.min(r.width / nw, r.height / nh), w = nw * k, h = nh * k, ox = r.left + (r.width - w) / 2, oy = r.top + (r.height - h) / 2;
      cur.x = Math.max(0, Math.min(1, (e.clientX - ox) / w)); cur.y = Math.max(0, Math.min(1, (e.clientY - oy) / h)); cur.manual = true; draw(); });
    box.addEventListener('click', async e => { const b = e.target.closest('[data-fpk]'); if (!b) return; const a = b.dataset.fpk;
      if (a === 'x') return closePick();
      b.disabled = true;
      if (await write('setFocus', cur.id, a === 'auto' ? '' : fmt(cur))) { toast(a === 'auto' ? '보여 줄 곳을 저절로 찾게 했어요' : '🎯 이제 어디서든 이 자리가 보이게 잘라요'); closePick(); apply(document.getElementById('app')); }
      b.disabled = false; });
    box.querySelector('img').addEventListener('load', draw);
  }
  const im = box.querySelector('img'); im.src = u;
  box.querySelectorAll('.fpk-pv span').forEach(s => { s.style.backgroundImage = `url("${u.replace(/"/g, '%22')}")`; });
  box.hidden = false; document.documentElement.classList.add('fpk-open'); draw();
}
function draw() {
  if (!box || !cur) return;
  const st = box.querySelector('.fpk-stage'), im = st.querySelector('img'), dot = st.querySelector('.fpk-dot'), nw = im.naturalWidth, nh = im.naturalHeight;
  if (nw && nh) { const W = st.clientWidth, H = st.clientHeight, k = Math.min(W / nw, H / nh), w = nw * k, h = nh * k; dot.style.left = ((W - w) / 2 + cur.x * w) + 'px'; dot.style.top = ((H - h) / 2 + cur.y * h) + 'px'; dot.hidden = false; } else dot.hidden = true;
  const v = `${Math.round(cur.x * 100)}% ${Math.round(cur.y * 100)}%`; box.querySelectorAll('.fpk-pv span').forEach(s => { s.style.backgroundPosition = v; });
}
function closePick() { if (!box || box.hidden) return false; box.hidden = true; document.documentElement.classList.remove('fpk-open'); cur = null; return true; }

const css = document.createElement('style');
css.textContent = `
.fpk{position:fixed;inset:0;z-index:80;background:#0E1424;display:flex;flex-direction:column;gap:10px;padding:max(12px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom));color:#fff}
.fpk[hidden]{display:none}
.fpk-top b{display:block;font-family:var(--display);font-weight:400;font-size:20px}.fpk-top small{font-size:13px;opacity:.85;line-height:1.5}
.fpk-stage{position:relative;flex:1;min-height:0;display:grid;place-items:center;overflow:hidden;border-radius:14px;background:#000}
.fpk-stage img{max-width:100%;max-height:100%;object-fit:contain;display:block;pointer-events:none}
.fpk-dot{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px var(--red),0 0 0 999px rgba(0,0,0,.12);pointer-events:none}
.fpk-dot::after{content:'';position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:var(--red)}
.fpk-pv{display:flex;gap:8px;justify-content:center;align-items:flex-end}.fpk-pv span{display:block;background-size:cover;background-color:#222;border:2px solid #fff;border-radius:8px}
.fpk-pv .w{width:120px;height:56px}.fpk-pv .s{width:64px;height:64px}.fpk-pv .t{width:50px;height:70px}
.fpk-act{display:flex;gap:8px}.fpk-act button{flex:1;min-height:46px;border-radius:99px;border:1.5px solid rgba(255,255,255,.5);background:none;color:#fff;font-size:14px}.fpk-act .go{background:var(--red);border-color:var(--red)}`;
document.head.appendChild(css);
window.FOCUS = { of, forImage, apply, pick, close: closePick, idOf };
})();
