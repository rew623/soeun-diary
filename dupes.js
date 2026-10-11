// 중복 사진 찾기 — 사건 앨범 '🔍 중복 사진 찾기'(DUPES.open)
// 같은 칸(현장 사진첩끼리, 가족 사진끼리…)에서만: ① 찍은 날짜·시각이 초까지 같은 사진 ② 그림이 거의 같은 사진(작게 줄인 9×8 밝기 차이 해시 dHash, 다른 비트 6개 이하 + 평균 색이 비슷)을 한 묶음으로
// 해시는 이 폰에 기억(localStorage soeun-dhash2, '해시16자|평균색6자'). 지울 수 있는 건 현장 사진첩·가족·최초 목격 추가 사진만(기록 사진은 남겨요)
// 올릴 때 미리 거르기는 album.js queue (찍은 시각이 초까지 같은 사진이 이미 있으면 물어봐요)
(function () {
const HK = 'soeun-dhash2', D = { busy: false, groups: null, sel: new Set(), done: 0, total: 0 };
let H = {}; try { H = JSON.parse(localStorage.getItem(HK) || '{}') || {}; } catch (e) {}
const saveH = () => { try { localStorage.setItem(HK, JSON.stringify(H)); } catch (e) {} };
const DEL = ['free', 'fam', 'extra'];
const TYPE = { first: '최초 목격', month: '월별 사진', free: '현장 사진첩', fam: '가족 사진', extra: '최초 목격 추가', report: '100일 보고서' };
const list = () => (S.moments || []).filter(m => m.photo && safeImg(PHOTOS[m.id]));
async function hashOf(m) {
  const im = await CV.img(safeImg(PHOTOS[m.id])), c = document.createElement('canvas'); c.width = 9; c.height = 8;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 9, 8); if (im.__blob) URL.revokeObjectURL(im.__blob);
  const d = x.getImageData(0, 0, 9, 8).data, g = i => d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114;
  let hi = 0, lo = 0; const avg = [0, 0, 0];
  for (let i = 0; i < 72; i++) for (let k = 0; k < 3; k++) avg[k] += d[i * 4 + k] / 72;
  for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) { const bit = g(r * 9 + k) > g(r * 9 + k + 1) ? 1 : 0, n = r * 8 + k; if (n < 32) hi = (hi << 1 | bit) >>> 0; else lo = (lo << 1 | bit) >>> 0; }
  return hi.toString(16).padStart(8, '0') + lo.toString(16).padStart(8, '0') + '|' + avg.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}
const pop = v => { v = v - ((v >>> 1) & 0x55555555); v = (v & 0x33333333) + ((v >>> 2) & 0x33333333); return (((v + (v >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; };
const dist = (a, b) => pop((parseInt(a.slice(0, 8), 16) ^ parseInt(b.slice(0, 8), 16)) >>> 0) + pop((parseInt(a.slice(8, 16), 16) ^ parseInt(b.slice(8, 16), 16)) >>> 0);
// 평균 색 차이 (밝기 무늬가 같아도 색이 다르면 다른 사진: 예) 같은 자리에서 옷만 바꿔 찍은 사진)
const cdist = (a, b) => { let t = 0; for (let k = 0; k < 3; k++) t += Math.abs(parseInt(a.substr(17 + k * 2, 2), 16) - parseInt(b.substr(17 + k * 2, 2), 16)); return t; };
async function scan() {
  if (D.busy) return; D.busy = true; D.groups = null;
  const L = list(), todo = L.filter(m => !H[m.id]); D.total = todo.length; D.done = 0; paint();
  let i = 0;
  const worker = async () => { while (i < todo.length) { const m = todo[i++]; try { H[m.id] = await hashOf(m); } catch (e) { H[m.id] = 'x'; } D.done++; if (D.done % 8 === 0) paint(); } };
  await Promise.all([worker(), worker(), worker(), worker()]); saveH();
  // 묶기 (union-find)
  const P = L.map((m, k) => k), find = k => P[k] === k ? k : (P[k] = find(P[k])), join = (a, b) => { a = find(a); b = find(b); if (a !== b) P[b] = a; };
  for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) {
    const A = L[a], B = L[b];
    if ((A.type || 'first') !== (B.type || 'first')) continue;   // 다른 칸끼리(현장 사진 → 최초 목격·가족 사진으로 가져온 복사본)는 일부러 둔 것이라 안 묶어요
    if (A.tm && A.tm.length === 8 && A.date === B.date && A.tm === B.tm) { join(a, b); continue; }
    const ha = H[A.id], hb = H[B.id]; if (ha && hb && ha !== 'x' && hb !== 'x' && dist(ha, hb) <= 6 && cdist(ha, hb) <= 36) join(a, b);
  }
  const G = {}; L.forEach((m, k) => { (G[find(k)] = G[find(k)] || []).push(m); });
  D.groups = Object.values(G).filter(g => g.length > 1).map(g => g.sort((a, b) => (DEL.includes(a.type) ? 1 : 0) - (DEL.includes(b.type) ? 1 : 0) || (a.t || 0) - (b.t || 0) || (a.id < b.id ? -1 : 1)));
  // 처음엔 묶음마다 첫 장(기록 사진 → 먼저 올린 것)만 남기고 나머지를 골라 둬요
  D.sel = new Set(); D.groups.forEach(g => g.slice(1).forEach(m => { if (DEL.includes(m.type || 'first')) D.sel.add(m.id); }));
  D.busy = false; paint();
}
function html() {
  const g = D.groups, n = D.sel.size;
  return `<h3>🔍 중복 사진 찾기</h3>
    <p class="hint" style="margin:-6px 0 10px">찍은 시각이 초까지 같거나 그림이 거의 같은 사진을 묶어 보여 줘요. 묶음마다 하나만 남기고 골라 둔 걸 지울 수 있어요.</p>
    <div id="dp-body" data-dpsheet>${D.busy ? `<p class="vempty">사진 살펴보는 중… ${D.done}/${D.total}<br><small>처음 한 번만 오래 걸려요. 화면을 켜 두세요</small></p>`
      : !g ? '' : !g.length ? `<p class="vempty">중복 사진이 없어요 👍<br><small>사진 ${list().length}장을 살펴봤어요</small></p>`
      : `<p class="foot" style="margin:0 0 8px">${g.length}묶음 · 사진 ${g.reduce((s, x) => s + x.length, 0)}장. 사진을 누르면 고르기/풀기. 기록 사진(최초 목격·월별)은 여기서 안 지워요.</p>${g.map((x, gi) => `<div class="dpg"><b>${gi + 1}. ${fmtK(x[0].date, true)}${x[0].tm ? ' ' + x[0].tm.slice(0, 5) : ''}</b><div class="dpr">${x.map(m => { const can = DEL.includes(m.type || 'first'); return `<button class="dpc${D.sel.has(m.id) ? ' sel' : ''}${can ? '' : ' lock'}" data-dp="tog" data-v="${esc(m.id)}"><img src="${safeImg(PHOTOS[m.id])}" alt="" loading="lazy" decoding="async"><small>${TYPE[m.type || 'first'] || ''}</small><i>${can ? '✓' : '🔒'}</i></button>`; }).join('')}</div></div>`).join('')}`}</div>
    <div class="actions"><button class="secondary" data-act="close">닫기</button>${g && g.length ? `<button class="danger" data-dp="del" ${n ? '' : 'disabled'}>고른 ${n}장 지우기</button>` : ''}</div>`;
}
const paint = () => { const sh = document.getElementById('sheet'); if (!sh || !sh.classList.contains('open') || !sh.querySelector('[data-dpsheet]')) return; const y = sh.scrollTop; openSheet(html()); sh.scrollTop = y; };
function open() { openSheet(html()); scan(); }
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-dp]'); if (!b || b.disabled) return;
  if (b.dataset.dp === 'tog') { const id = b.dataset.v, m = S.moments.find(x => x.id === id); if (!m || !DEL.includes(m.type || 'first')) { toast('기록 사진은 여기서 안 지워요'); return; } if (D.sel.has(id)) D.sel.delete(id); else D.sel.add(id); b.classList.toggle('sel', D.sel.has(id)); const d = document.querySelector('[data-dp="del"]'); if (d) { d.disabled = !D.sel.size; d.textContent = `고른 ${D.sel.size}장 지우기`; } return; }
  if (b.dataset.dp === 'del') {
    const ids = [...D.sel]; if (!ids.length) return;
    // 묶음을 통째로 지우지 않게: 묶음마다 하나는 남았는지 확인
    if (D.groups.some(g => g.every(m => D.sel.has(m.id)))) { if (!(await ask('어떤 묶음은 사진이 하나도 안 남아요. 그래도 지울까요?', { ok: '지우기', danger: true }))) return; }
    else if (!(await ask(`사진 ${ids.length}장을 지울까요?\n지운 사진은 되돌릴 수 없어요.`, { ok: '지우기', danger: true }))) return;
    let last = null, n = 0;
    for (const id of ids) { toast(`지우는 중 ${n + 1}/${ids.length}`); try { last = await run('deleteItem', 'mom', id); delete PHOTOS[id]; delete H[id]; n++; } catch (x) { toast(errMsg(x)); break; } }
    saveH(); if (last) apply(last.data); closeSheet(); toast(`중복 사진 ${n}장을 지웠어요`); D.groups = null; D.sel.clear();
  }
});
const css = document.createElement('style');
css.textContent = `
.dpg{margin-bottom:12px}.dpg>b{display:block;font-size:13.5px;color:var(--navy);margin-bottom:4px}
.dpr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.dpc{position:relative;aspect-ratio:1;border:0;padding:0;border-radius:10px;overflow:hidden;background:var(--card2)}
.dpc img{width:100%;height:100%;object-fit:cover;display:block}
.dpc small{position:absolute;left:4px;bottom:4px;font-size:11px;color:#fff;background:rgba(0,0,0,.5);border-radius:99px;padding:0 6px}
.dpc i{position:absolute;right:5px;top:5px;width:26px;height:26px;border-radius:50%;border:2px solid #fff;background:rgba(0,0,0,.25);color:transparent;font-style:normal;font-size:13px;line-height:22px;text-align:center}
.dpc.sel{outline:3px solid var(--red);outline-offset:-3px}.dpc.sel i{background:var(--red);color:#fff}.dpc.sel img{opacity:.6}
.dpc.lock i{color:#fff;background:rgba(0,0,0,.45)}`;
document.head.appendChild(css);
window.DUPES = { open };
})();
