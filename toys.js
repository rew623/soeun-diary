// 동네 탐문 > 날씨·동네 소식 칸의 '🧸 장난감 대여 (문막)' — 원주시 장난감도서관 목록(data/toys.json, toys.yml이 하루 4번 받아요)
// 사이트(http)는 앱에서 직접 못 읽어서 받아 둔 목록을 보여 주고, 누르면 그 장난감의 사이트 화면으로 가요. 대여 신청은 사이트·방문에서 (사용자 요청 2026.11.10)
(() => {
const SITE = 'http://www.wjeducare.or.kr/toy/m4/';
const AGE = [['000', '~12개월'], ['100', '~24개월'], ['200', '~35개월'], ['300', '36개월~'], ['', '전체']];
const COL = { r: ['빨강', '#D2463C'], y: ['노랑', '#E0B21B'], b: ['파랑', '#2F6FD6'] };
const TY = { d: null, loading: false, age: null, avail: true, col: new Set(['r', 'y', 'b']), q: '', more: 20 };
const myAge = () => { const p = S.profile; if (!p || !p.birth) return '000'; const m = monthsDays(p.birth, today())[0]; return m < 12 ? '000' : m < 24 ? '100' : m < 36 ? '200' : '300'; };
try { const a = localStorage.getItem('soeun-toy-age'); if (a !== null && AGE.some(x => x[0] === a)) TY.age = a; } catch (e) {}

function load() {
  if (TY.loading || TY.d) return; TY.loading = true;
  fetch('data/toys.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
    TY.d = d || { items: [] }; TY.loading = false; if (S.tab === 'town' || S.townView === 'info') render();
  });
}
// 문막 장난감도서관: 화~토 9~18시, 점심 12~13시 대여·반납 안 함, 일·월·공휴일 휴관
function openNow() {
  const n = new Date(), wd = n.getDay(), m = n.getHours() * 60 + n.getMinutes();
  if (wd === 0 || wd === 1) return ['휴관일 (일·월)', 'off'];
  if (m < 540 || m >= 1080) return ['지금은 문 닫았어요', 'off'];
  if (m >= 720 && m < 780) return ['점심시간 (13시부터)', 'mid'];
  return ['지금 열려 있어요', 'on'];
}
function list() {
  const age = TY.age == null ? myAge() : TY.age, q = TY.q.trim().replace(/\s+/g, '');
  return (TY.d.items || []).filter(x => (!age || x.a === age) && (!TY.avail || x.s) && TY.col.has(x.c) && (!q || x.n.replace(/\s+/g, '').includes(q)));
}
function cards() {
  const L = list(), shown = L.slice(0, TY.more);
  if (!L.length) return '<p class="vempty" style="margin:6px 0">조건에 맞는 장난감이 없어요.</p>';
  return `<div class="tyg">${shown.map(x => `<a class="tyc" href="${SITE}sub1_view.asp?seq=-1&idx=${encodeURIComponent(x.i)}" target="_blank" rel="noopener">
      <span class="tyi">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span>🧸</span></span>
      <b>${esc(x.n)}</b><small><i style="background:${COL[x.c][1]}"></i>${COL[x.c][0]} · <em class="${x.s ? 'ok' : 'no'}">${x.s ? '대여가능' : '대여중'}</em></small></a>`).join('')}</div>
    ${L.length > shown.length ? `<button class="addperiod" data-toy="more">더 보기 (${L.length - shown.length}개 남음)</button>` : ''}`;
}
function html() {
  if (!TY.d) { load(); return '<section class="tysec"><h2 class="sh"><span>🧸 장난감 대여 · 문막</span></h2><p class="vempty">불러오는 중…</p></section>'; }
  const D = TY.d, all = D.items || [];
  if (!all.length) return '<section class="tysec"><h2 class="sh"><span>🧸 장난감 대여 · 문막</span></h2><p class="vempty">장난감 목록을 아직 못 받았어요. 몇 시간 안에 생겨요.</p></section>';
  const age = TY.age == null ? myAge() : TY.age, [ot, oc] = openNow(), av = all.filter(x => x.s && (!age || x.a === age)).length;
  return `<section class="tysec${isFold('v-toy') ? ' folded' : ''}"><h2 class="sh" data-fold="v-toy"><span>🧸 장난감 대여 · 문막</span><span>대여가능 ${av}개</span></h2>
    <p class="tyinfo"><b class="tyo ${oc}">${ot}</b> 화~토 9~18시 (점심 12~13시) · <a href="tel:0337420756">☎ 742-0756</a></p>
    <div class="seg tyage">${AGE.map(([k, l]) => `<button class="${age === k ? 'on' : ''}" data-toy="age" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="tyf"><button class="${TY.avail ? 'on' : ''}" data-toy="avail">대여가능만</button>${Object.entries(COL).map(([k, [n, c]]) => `<button class="${TY.col.has(k) ? 'on' : ''}" data-toy="col" data-v="${k}" style="--c:${c}"><i></i>${n}</button>`).join('')}</div>
    <input class="tyq" id="toy-q" type="search" placeholder="장난감 이름으로 찾기 (예: 점퍼, 보행기)" value="${esc(TY.q)}" data-noswipe>
    <div id="toy-list">${cards()}</div>
    <p class="foot" style="margin:8px 0 0">1회 2점까지 (빨강 태그는 1점만, 빨강+빨강 안 돼요) · 7~14일, 전화로 1번 7일 연장. 대여 신청은 사이트나 방문으로 해요. ${esc(D.updated || '')} 기준 목록이라 그사이 바뀌었을 수 있어요.</p></section>`;
}
const relist = () => { const el = document.getElementById('toy-list'); if (el) el.innerHTML = cards(); };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-toy]'); if (!b) return;
  const a = b.dataset.toy, v = b.dataset.v || '';
  if (a === 'age') { TY.age = v; TY.more = 20; try { localStorage.setItem('soeun-toy-age', v); } catch (x) {} }
  else if (a === 'avail') { TY.avail = !TY.avail; TY.more = 20; }
  else if (a === 'col') { if (TY.col.has(v) && TY.col.size > 1) TY.col.delete(v); else TY.col.add(v); TY.more = 20; }
  else if (a === 'more') { TY.more += 20; relist(); return; }
  render();
});
document.addEventListener('input', e => { if (e.target.id !== 'toy-q') return; TY.q = e.target.value; TY.more = 20; relist(); });

const css = document.createElement('style');
css.textContent = `
.tyinfo{margin:0 0 10px;font-size:13px;color:var(--muted)}.tyinfo a{color:var(--navy)}
.tyo{font-family:var(--display);font-weight:400;padding:1px 8px;border-radius:99px;margin-right:4px}.tyo.on{background:#DDF0D6;color:#2F6B2A}.tyo.mid{background:#FFF0C7;color:#8A6400}.tyo.off{background:#F1E4DD;color:var(--red)}
.tyage{margin-bottom:8px}.tyage button{font-size:12.5px;padding:6px 0;min-height:38px}
.tyf{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.tyf button{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;min-height:34px;border-radius:99px;border:1.5px solid var(--line);background:#FFFDF7;color:var(--muted);font-size:13px}
.tyf button.on{border-color:var(--navy);color:var(--navy);background:#fff;font-weight:700}.tyf i{width:10px;height:10px;border-radius:50%;background:var(--c)}
.tyq{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;font:inherit;background:#FFFDF7;margin-bottom:10px}
.tyg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tyc{display:flex;flex-direction:column;gap:4px;padding:8px;border:1.5px solid var(--line);border-radius:12px;background:#FFFDF7;color:var(--ink);text-decoration:none}
.tyi{position:relative;display:grid;place-items:center;aspect-ratio:1;border-radius:8px;background:#fff;overflow:hidden}.tyi span{font-size:30px;opacity:.35}.tyi img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff}
.tyc b{font-weight:400;font-size:13.5px;line-height:1.35;color:var(--navy)}.tyc small{display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--muted)}.tyc small i{width:9px;height:9px;border-radius:50%}
.tyc em{font-style:normal}.tyc em.ok{color:#2F6B2A;font-weight:700}.tyc em.no{color:var(--red)}
`;
document.head.appendChild(css);
window.TOY = { html, load };
})();
