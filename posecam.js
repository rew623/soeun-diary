// 같은 포즈 촬영기 — 카메라 화면 위에 지난번 사진을 반투명하게 겹쳐서 매달 같은 자리·같은 포즈로 찍어요
// 찍은 사진은 N개월 월별 증거 사진(mom type:'month') 또는 현장 사진첩(ALBUM.queue)에 저장. 모이면 성장 영상의 '같은 포즈 타임랩스'로
// 화면은 body에 붙인 겹침 창이라 앱이 다시 그려져도 카메라가 끊기지 않아요. 뒤로가기로 닫혀요(viewer.js)
(function () {
const P = { el: null, stream: null, facing: 'environment', refId: '', op: 45, mirror: false, grid: true, taken: false, refs: false };
const months = () => (S.moments || []).filter(m => m.type === 'month' && m.photo && safeImg(PHOTOS[m.id])).sort((a, b) => parseInt(a.title) - parseInt(b.title));
function refDefault() { const M = months(); if (M.length) return M[M.length - 1].id; const L = window.CV ? CV.photos() : []; return L[0] ? L[0].id : ''; }
// 저장할 달: 이번 달 기념 사진이 아직 없으면 그 달, 다음 달 그날이 10일 안이면 다음 달도 보여 줘요
function monthOpts() {
  const b = S.profile.birth, t = today(), [mo] = monthsDays(b, t), out = [];
  const cur = Math.max(1, mo), next = cur + (mo >= 1 ? 1 : 0);
  out.push(cur);
  if (next !== cur && daysBetween(t, addMonths(b, next)) <= 10) out.push(next);
  return out.slice(0, 2);
}

function build() {
  const el = document.createElement('div'); el.className = 'pcam'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '같은 포즈 촬영기');
  el.innerHTML = `<div class="pctop"><button class="pcx" data-pc="close" aria-label="닫기">✕</button><b>📷 같은 포즈 촬영기</b><span class="pcinfo"></span></div>
    <div class="pcbox"><video playsinline muted autoplay></video><img class="pcref" alt=""><div class="pcgrid"></div><canvas class="pcshot" hidden></canvas></div>
    <div class="pcrefs" hidden></div>
    <div class="pcctl"><label class="pcop">겹치기<input type="range" min="0" max="80" step="5" value="${P.op}" data-pc="op" aria-label="겹친 사진 진하기"></label>
      <button data-pc="refs">🖼 기준 사진</button><button data-pc="flip">↔ 좌우</button><button data-pc="grid">▦ 격자</button><button data-pc="cam">🔄 앞뒤</button></div>
    <div class="pcbot"><button class="pcbtn" data-pc="snap" aria-label="찍기"></button></div>
    <div class="pcafter" hidden></div>`;
  document.body.appendChild(el); P.el = el;
  el.addEventListener('click', onClick);
  el.querySelector('[data-pc=op]').addEventListener('input', e => { P.op = +e.target.value; paintRef(); });
}
const $ = s => P.el.querySelector(s);
function paintRef() {
  const im = $('.pcref'), src = P.refId ? safeImg(PHOTOS[P.refId]) : '';
  if (src) { if (im.getAttribute('src') !== src) im.src = src; im.hidden = false; } else { im.removeAttribute('src'); im.hidden = true; }
  im.style.opacity = P.op / 100; $('.pcgrid').hidden = !P.grid;
  $('video').style.transform = P.mirror ? 'scaleX(-1)' : '';
  const r = P.refId && S.moments.find(m => m.id === P.refId);
  $('.pcinfo').textContent = r ? `기준: ${r.type === 'month' ? r.title : fmtK(r.date, true)}` : '기준 사진 없음';
}
function refsHtml() {
  const L = months().slice().reverse().concat((window.CV ? CV.photos() : []).filter(p => p.type !== 'month' && p.type !== 'profile').slice(0, 24));
  return `<button class="${P.refId ? '' : 'on'}" data-pc="ref" data-id="">없음</button>` + L.map(p => `<button class="${p.id === P.refId ? 'on' : ''}" data-pc="ref" data-id="${p.id}"><img src="${safeImg(PHOTOS[p.id])}" alt="" loading="lazy">${p.type === 'month' ? `<i>${esc(p.title)}</i>` : ''}</button>`).join('');
}
async function startCam() {
  stopCam();
  try { P.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: P.facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false }); }
  catch (e) { toast(e && e.name === 'NotAllowedError' ? '카메라 권한을 허용해 주세요 (폰 설정 → 앱 → 권한)' : '카메라를 켜지 못했어요'); close(); return; }
  const v = $('video'); v.srcObject = P.stream; try { await v.play(); } catch (e) {}
}
function stopCam() { if (P.stream) { P.stream.getTracks().forEach(t => t.stop()); P.stream = null; } }

function open(refId) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('이 폰(브라우저)에서는 카메라를 쓸 수 없어요'); return; }
  if (!P.el) build();
  P.refId = refId != null ? refId : refDefault(); P.taken = false; P.refs = false;
  $('.pcshot').hidden = true; $('.pcafter').hidden = true; $('.pcbot').hidden = false; $('.pcctl').hidden = false; $('.pcrefs').hidden = true;
  P.el.hidden = false; document.documentElement.classList.add('pc-open');
  paintRef(); startCam();
}
function close() {
  if (!P.el || P.el.hidden) return false;
  stopCam(); P.el.hidden = true; document.documentElement.classList.remove('pc-open'); return true;
}
// 보이는 3:4 칸 그대로 찍기 (겹친 사진과 같은 자리가 저장돼요)
function snap() {
  const v = $('video'), vw = v.videoWidth, vh = v.videoHeight; if (!vw) { toast('카메라가 아직 준비 중이에요'); return; }
  const c = $('.pcshot'), OW = 1200, OH = 1600, ctx = c.getContext('2d'); c.width = OW; c.height = OH;
  const s = Math.max(OW / vw, OH / vh), dw = vw * s, dh = vh * s;
  ctx.save(); if (P.mirror) { ctx.translate(OW, 0); ctx.scale(-1, 1); } ctx.drawImage(v, (OW - dw) / 2, (OH - dh) / 2, dw, dh); ctx.restore();
  c.hidden = false; P.taken = true; v.pause();
  $('.pcbot').hidden = true; $('.pcctl').hidden = true; $('.pcrefs').hidden = true;
  const ex = monthOpts().map(n => { const has = S.moments.some(m => m.type === 'month' && m.title === n + '개월' && m.photo); return `<button class="primary" data-pc="month" data-v="${n}">${n}개월 사진으로${has ? ' (바꾸기)' : ''}</button>`; }).join('');
  const a = $('.pcafter'); a.innerHTML = `${ex}<button class="secondary" data-pc="free">현장 사진첩에</button><button class="ghost" data-pc="retake">다시 찍기</button>`; a.hidden = false;
}
const shotFile = () => new Promise((res, rej) => $('.pcshot').toBlob(b => b ? res(new File([b], `pose_${today().replace(/-/g, '')}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })) : rej(new Error('사진을 만들지 못했어요')), 'image/jpeg', .9));
async function saveMonth(n, btn) {
  const t = n + '개월', ex = S.moments.find(m => m.type === 'month' && m.title === t);
  if (ex && ex.photo && !await ask(`${t} 사진을 방금 찍은 사진으로 바꿀까요?`)) return;
  btn.disabled = true;
  try {
    const photo = await readPhoto(await shotFile(), true);
    const res = await write('saveItem', 'mom', { id: ex ? ex.id : '', type: 'month', title: t, date: today(), memo: ex ? ex.memo || '' : '', by: myRole(), photo });
    if (res) { PHOTOS[res.id] = photo; close(); render(); toast(`${t} 증거 사진으로 저장했어요 📸`); if (window.GAME) GAME.mark('pose'); }
  } catch (e) { toast('저장하지 못했어요: ' + ((e && e.message) || '')); }
  btn.disabled = false;
}
async function onClick(e) {
  const b = e.target.closest('[data-pc]'); if (!b) return;
  switch (b.dataset.pc) {
    case 'close': close(); break;
    case 'snap': snap(); break;
    case 'retake': P.taken = false; $('.pcshot').hidden = true; $('.pcafter').hidden = true; $('.pcbot').hidden = false; $('.pcctl').hidden = false; try { await $('video').play(); } catch (x) {} break;
    case 'refs': P.refs = !P.refs; const r = $('.pcrefs'); r.hidden = !P.refs; if (P.refs) r.innerHTML = refsHtml(); break;
    case 'ref': P.refId = b.dataset.id; $('.pcrefs').innerHTML = refsHtml(); paintRef(); break;
    case 'flip': P.mirror = !P.mirror; paintRef(); break;
    case 'grid': P.grid = !P.grid; paintRef(); break;
    case 'cam': P.facing = P.facing === 'environment' ? 'user' : 'environment'; P.mirror = P.facing === 'user'; paintRef(); startCam(); break;
    case 'month': saveMonth(+b.dataset.v, b); break;
    case 'free': { b.disabled = true; try { ALBUM.queue([await shotFile()]); close(); if (window.GAME) GAME.mark('pose'); } catch (x) { toast('저장하지 못했어요'); } b.disabled = false; break; }
  }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-pcopen]'); if (b) open(b.dataset.pcopen || undefined); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && P.el && !P.el.hidden && !P.taken) stopCam(); else if (document.visibilityState === 'visible' && P.el && !P.el.hidden && !P.taken && !P.stream) startCam(); });

const css = document.createElement('style');
css.textContent = `
html.pc-open{overflow:hidden}
.pcam{position:fixed;inset:0;z-index:70;background:#0E1424;color:#fff;display:flex;flex-direction:column;align-items:center;gap:10px;padding:max(10px,env(safe-area-inset-top)) 0 max(14px,env(safe-area-inset-bottom))}
.pcam[hidden]{display:none}
.pctop{width:100%;display:flex;align-items:center;gap:10px;padding:0 12px}.pctop b{font-family:var(--display);font-weight:400;font-size:18px}.pcinfo{margin-left:auto;font-size:12px;opacity:.8}
.pcx{width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:18px}
.pcbox{position:relative;width:min(100vw,calc((100vh - 250px) * .75));aspect-ratio:3/4;overflow:hidden;background:#000;border-radius:14px}
.pcbox video,.pcbox .pcref,.pcbox .pcshot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pcbox .pcref{pointer-events:none;mix-blend-mode:normal}.pcbox .pcref[hidden],.pcbox .pcshot[hidden]{display:none}
.pcgrid{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent calc(33.33% - .5px),rgba(255,255,255,.35) 33.33%,transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.35) 66.66%,transparent calc(66.66% + .5px)),linear-gradient(transparent calc(33.33% - .5px),rgba(255,255,255,.35) 33.33%,transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.35) 66.66%,transparent calc(66.66% + .5px))}
.pcgrid[hidden]{display:none}
.pcrefs{display:flex;gap:6px;overflow-x:auto;width:100%;padding:0 12px;flex-shrink:0}.pcrefs[hidden]{display:none}
.pcrefs button{flex:0 0 auto;width:58px;height:58px;border-radius:10px;overflow:hidden;border:2px solid transparent;padding:0;background:#2A3350;color:#fff;font-size:12px;position:relative}
.pcrefs button.on{border-color:#F4C542}.pcrefs img{width:100%;height:100%;object-fit:cover}.pcrefs i{position:absolute;left:0;right:0;bottom:0;font-style:normal;font-size:11px;background:rgba(0,0,0,.55)}
.pcctl{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;padding:0 10px}.pcctl[hidden]{display:none}
.pcctl button{border:0;border-radius:99px;background:rgba(255,255,255,.14);color:#fff;font-size:13px;padding:7px 12px;min-height:36px}
.pcop{display:flex;align-items:center;gap:6px;font-size:13px;background:rgba(255,255,255,.14);border-radius:99px;padding:4px 12px}.pcop input{width:110px;accent-color:#F4C542}
.pcbot[hidden],.pcafter[hidden]{display:none}
.pcbtn{width:74px;height:74px;border-radius:50%;border:5px solid #fff;background:#F4C542;box-shadow:0 0 0 4px rgba(244,197,66,.35)}
.pcbtn:active{transform:scale(.94)}
.pcafter{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:0 14px}.pcafter button{min-height:46px}.pcafter .ghost{color:#fff;border-color:rgba(255,255,255,.4);background:transparent}`;
document.head.appendChild(css);

window.POSECAM = { open, close };
})();
