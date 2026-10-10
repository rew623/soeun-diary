// 추억 — 사건 앨범 맨 위 "지난 오늘"(지난달·작년 같은 날 사진)과 "성장 스토리"(월별 사진을 인스타 스토리처럼 넘겨 보기)
(function () {
// ---------- 사진 모으기 ----------
function allPhotos() {
  const out = [];
  (S.moments || []).forEach(m => { if (m.photo && m.date && m.type !== 'report' && safeImg(PHOTOS[m.id])) out.push({ key: m.id, date: m.date, type: m.type || 'first', title: m.title || '' }); });
  (S.records || []).forEach(r => { if (r.photo && safeImg(PHOTOS[r.id])) out.push({ key: r.id, date: r.date, type: 'rec', title: '' }); });
  return out;
}

// ---------- 지난 오늘 ----------
function onThisDay() {
  const t = today(), dd = t.slice(8), md = t.slice(5), b = S.profile.birth;
  const L = allPhotos().filter(p => p.date < t && p.date >= b && (p.date.slice(8) === dd || p.date.slice(5) === md));
  if (!L.length) return '';
  const groups = {};
  L.forEach(p => (groups[p.date] = groups[p.date] || []).push(p));
  const label = d => { const [ty, tm] = t.split('-').map(Number), [y, m] = d.split('-').map(Number), n = (ty - y) * 12 + (tm - m);
    return n % 12 === 0 && n >= 12 ? `${n / 12}년 전 오늘` : `${n}개월 전 오늘`; };
  const days = Object.keys(groups).sort().reverse();
  return `<section class="otd"><h2 class="sh"><span>📅 지난 오늘</span><span>${L.length}장</span></h2>
    <div class="otdr">${days.map(d => `<div class="otdg"><b>${label(d)}</b><small>${fmtK(d, true)} · 생후 ${dayNo(d)}일</small><div class="otdi">${groups[d].slice(0, 6).map(p => `<button data-view="${p.key}"><img src="${safeImg(PHOTOS[p.key])}" alt="" loading="lazy"></button>`).join('')}</div></div>`).join('')}</div></section>`;
}

// ---------- 성장 스토리 ----------
function frames() {
  const b = S.profile.birth, [mo] = monthsDays(b, today()), P = allPhotos(), out = [];
  for (let i = 0; i <= Math.min(mo, 36); i++) {
    const from = addMonths(b, i), to = addMonths(b, i + 1);
    const mp = S.moments.find(m => m.type === 'month' && m.title === i + '개월' && safeImg(PHOTOS[m.id]));
    let pick = mp ? { key: mp.id, date: mp.date } : null;
    if (!pick) { const inR = P.filter(p => p.date >= from && p.date < to); pick = inR.find(p => p.type === 'first') || inR.find(p => p.type === 'free') || inR[0] || null; }
    if (!pick && i === 0 && safeImg(PHOTOS.profile)) pick = { key: 'profile', date: b };
    if (pick) out.push({ ...pick, i, firsts: S.moments.filter(m => (m.type === 'first' || !m.type) && m.date >= from && m.date < to).map(m => m.title) });
  }
  return out;
}
const SL = { el: null, i: 0, L: [], timer: 0, paused: false };
const DUR = 3500;
function open() {
  SL.L = frames();
  if (SL.L.length < 2) { toast('월별 사진이 2장 이상 있으면 볼 수 있어요'); return; }
  SL.i = 0; SL.paused = false;
  const el = document.createElement('div'); el.className = 'story';
  el.innerHTML = `<div class="stbars">${SL.L.map(() => '<i><u></u></i>').join('')}<i><u></u></i></div>
    <button class="stx" aria-label="닫기">✕</button><div class="stimg"></div><div class="stcap"></div>
    <button class="stnav prev" aria-label="이전"></button><button class="stnav next" aria-label="다음"></button>`;
  document.body.appendChild(el); SL.el = el; document.body.style.overflow = 'hidden';
  el.querySelector('.stx').onclick = close;
  el.querySelector('.prev').onclick = () => go(-1);
  el.querySelector('.next').onclick = () => go(1);
  // 누르고 있으면 잠깐 멈춤, 떼면 남은 시간만큼 이어서 (짧게 누르면 왼쪽 이전·오른쪽 다음)
  el.addEventListener('pointerdown', () => { clearTimeout(SL.timer); remain -= Date.now() - started; el.classList.add('paused'); });
  el.addEventListener('pointerup', () => { el.classList.remove('paused'); started = Date.now(); if (SL.i < SL.L.length) SL.timer = setTimeout(() => go(1), Math.max(200, remain)); });
  show();
}
let remain = DUR, started = 0;
function show() {
  const el = SL.el, n = SL.L.length, end = SL.i >= n;
  el.querySelectorAll('.stbars i').forEach((b, k) => { b.className = k < SL.i ? 'done' : k === SL.i ? 'on' : ''; });
  const img = el.querySelector('.stimg'), cap = el.querySelector('.stcap');
  if (end) {
    img.innerHTML = `<div class="stend">${CHARS.svg('baby', 'heart', { size: 150 })}<b>to be continued…</b><small>${esc(S.profile.name || '')}의 성장 수사는 계속돼요</small></div>`;
    cap.innerHTML = '';
  } else {
    const f = SL.L[SL.i];
    img.innerHTML = `<img src="${safeImg(PHOTOS[f.key])}" alt="" class="${SL.i % 2 ? 'kb2' : 'kb1'}">`;
    cap.innerHTML = `<small>${fmtK(f.date, true)}</small><b>${f.i === 0 ? '태어난 달' : `생후 ${f.i}개월`}</b>${f.firsts.length ? `<span>${f.firsts.slice(0, 3).map(t => '✨ ' + esc(t)).join(' ')}</span>` : ''}`;
  }
  clearTimeout(SL.timer); remain = DUR; started = Date.now();
  if (!end) SL.timer = setTimeout(() => go(1), DUR);
}
function go(d) { if (!SL.el) return; SL.i = Math.max(0, Math.min(SL.L.length, SL.i + d)); show(); }
function close() {
  if (!SL.el) return false;
  clearTimeout(SL.timer); SL.el.remove(); SL.el = null; document.body.style.overflow = ''; return true;
}

document.addEventListener('click', e => { if (e.target.closest('[data-story]')) open(); });

const css = document.createElement('style');
css.textContent = `
.otdr{display:flex;flex-direction:column;gap:10px}
.otdg b{font-family:var(--display);font-weight:400;font-size:16px;color:var(--navy)}.otdg small{margin-left:6px;font-size:11.5px;color:var(--muted)}
.otdi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:4px}
.otdi button{border:0;padding:0;background:var(--card2);aspect-ratio:1;border-radius:12px;overflow:hidden}
.otdi img{width:100%;height:100%;object-fit:cover;display:block}
.storybtn{width:100%;margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:99px;min-height:48px;background:linear-gradient(90deg,#F49C9C,#F4C542 50%,#7FC4E8);color:#1F2A44;font-family:var(--display);font-size:16px;box-shadow:0 3px 0 #D9A35A}
.story{position:fixed;inset:0;z-index:60;background:#111;color:#fff;user-select:none;touch-action:none}
.stbars{position:absolute;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top,0px));display:flex;gap:4px;z-index:3}
.stbars i{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.3);overflow:hidden}
.stbars u{display:block;height:100%;width:0;background:#fff}
.stbars .done u{width:100%}.stbars .on u{animation:stbar ${DUR}ms linear forwards}
.story.paused .stbars .on u{animation-play-state:paused}
@keyframes stbar{to{width:100%}}
.stx{position:absolute;right:10px;top:calc(22px + env(safe-area-inset-top,0px));z-index:4;width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.15);color:#fff;font-size:20px}
.stimg{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden}
.stimg img{max-width:100%;max-height:100%;object-fit:contain}
.kb1{animation:kb1 ${DUR}ms ease-out forwards}.kb2{animation:kb2 ${DUR}ms ease-out forwards}
@keyframes kb1{from{transform:scale(1)}to{transform:scale(1.08)}}@keyframes kb2{from{transform:scale(1.08)}to{transform:scale(1)}}
.story.paused .stimg img{animation-play-state:paused}
.stcap{position:absolute;left:0;right:0;bottom:0;padding:60px 20px calc(28px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,rgba(0,0,0,.75));display:flex;flex-direction:column;gap:2px;z-index:2}
.stcap small{font-size:13px;opacity:.85}.stcap b{font-family:var(--display);font-weight:400;font-size:34px}.stcap span{font-size:14px;opacity:.95}
.stnav{position:absolute;top:0;bottom:0;width:35%;border:0;background:none;z-index:1}.stnav.prev{left:0}.stnav.next{right:0;width:65%}
.stend{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}.stend b{font-family:var(--display);font-weight:400;font-size:30px}.stend small{opacity:.8}
@media (prefers-reduced-motion:reduce){.kb1,.kb2{animation:none}}`;
document.head.appendChild(css);

window.MEMO = { onThisDay };
window.SLIDE = { open, close };
})();
