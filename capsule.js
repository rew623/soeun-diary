// 봉인된 증거물 — 엄마·아빠가 소은이에게 편지를 쓰고 첫 돌·초등학교 입학·스무 살 같은 날로 봉인해요. 그날까지는 쓴 사람도 못 열어요 (봉인은 앱에서 지켜요)
// 저장: families/{fid}/capsule/{id} { title: 봉투에 적는 말(봉인해도 보임), body: 편지(5000자까지), open: 열리는 날, occ: '첫 돌' 같은 이름, sealed: 봉인한 날, photo(선택), by }
// 열린 편지를 이 폰에서 처음 열 때는 봉인 해제 장면 (연 편지 id는 localStorage soeun-capsule-seen). 사진은 열린 편지만 불러와요
(function () {
const C = { occ: '', date: '', reading: '' };
const SEEN = 'soeun-capsule-seen';
const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch (e) { return []; } };
const markSeen = id => { const s = seen(); if (s.includes(id)) return; s.push(id); try { localStorage.setItem(SEEN, JSON.stringify(s.slice(-300))); } catch (e) {} };
const list = () => (S.capsules || []).filter(c => /^\d{4}-\d\d-\d\d$/.test(c.open || ''));
const isOpen = c => c.open <= today();
const dot = d => String(d || '').replace(/-/g, '.');
const canWrite = () => !(S.me && S.me.viewer);
// 부르는 이름 (소은아 / 하나야)
const voc = () => { const n = ((S.profile && S.profile.name) || '우리 아기').replace(/^[가-힣](?=[가-힣]{2}$)/, ''), c = n.charCodeAt(n.length - 1); return n + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '아' : '야'); };
const $ = id => document.getElementById(id);

// 열 날 고르기: 다음 100일 단위 · 첫 돌 · 두 돌 · 초등학교 입학(만 6세가 된 다음 해 3월) · 열 살 · 스무 살 생일
function presets() {
  const b = S.profile.birth, t = today(), n100 = Math.ceil((dayNo(t) + 1) / 100) * 100;
  return [[`${n100}일`, addDays(b, n100 - 1)], ['첫 돌', addMonths(b, 12)], ['두 돌', addMonths(b, 24)], ['초등학교 입학', `${+b.slice(0, 4) + 7}-03-02`], ['열 살 생일', addMonths(b, 120)], ['스무 살 생일', addMonths(b, 240)]].filter(([, d]) => d > t);
}
function whenText(d) { if (!d) return '열 날을 골라 주세요'; const n = daysBetween(today(), d); return `${dot(d)} 열림 · D-${n}${n >= 365 ? ` (약 ${Math.floor(n / 365)}년 ${Math.floor(n % 365 / 30.44)}개월 뒤)` : ''}`; }

// ---------- 봉투 ----------
function env(c) {
  const open = isOpen(c), fresh = open && !seen().includes(c.id), dl = daysBetween(today(), c.open);
  const total = Math.max(1, daysBetween(c.sealed || today(), c.open)), pct = open ? 100 : Math.min(98, Math.max(2, Math.round((1 - dl / total) * 100)));
  return `<button class="cpenv${open ? ' open' : ''}${fresh ? ' fresh' : ''}" data-cp="${open ? 'read' : 'peek'}" data-id="${esc(c.id)}">
    <span class="cpflap" aria-hidden="true"></span><span class="cpwax" aria-hidden="true">${open ? '🔓' : '🔒'}</span>
    <span class="cpto">${esc(c.by || '수사관')} 수사관 → ${esc(CV.nick())}</span>
    ${c.title ? `<b class="cptitle">${esc(c.title)}</b>` : ''}
    <span class="cpocc">${esc(c.occ || dot(c.open))}에 ${open ? '열렸어요' : '열려요'}${c.occ ? ` · ${dot(c.open)}` : ''}</span>
    ${open ? `<span class="cpdd">${fresh ? '🎉 봉인 해제! 눌러서 열어 보세요' : `${dot(c.open)}에 열린 편지`}</span>` : `<span class="cpdd">봉인 해제까지 <b>D-${dl}</b></span><span class="cpprog" role="meter" aria-label="봉인 해제까지" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></span>`}
    <small class="cpsd">${dot(c.sealed)} 봉인${c.photo ? ' · 사진 1장' : ''}</small>
  </button>`;
}
function render_() {
  const L = list().sort((a, b) => a.open < b.open ? -1 : a.open > b.open ? 1 : 0), sealed = L.filter(c => !isOpen(c)), opened = L.filter(isOpen).reverse();
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>봉인된 증거물</h1><p>엄마·아빠가 ${esc(CV.nick())}에게 쓰는 편지예요. 정한 날이 오기 전에는 아무도(쓴 사람도) 열어 볼 수 없어요.</p></header>
  ${canWrite() ? '<button class="solve cpnew" data-cp="new">✉️ 새 증거물 봉인하기</button>' : ''}
  ${opened.length ? `<section><h2 class="sh"><span>열린 증거물</span><span>${opened.length}통</span></h2><div class="cplist">${opened.map(env).join('')}</div></section>` : ''}
  <section><h2 class="sh"><span>봉인 중</span><span>${sealed.length}통</span></h2>${sealed.length ? `<div class="cplist">${sealed.map(env).join('')}</div>` : `<p class="vempty">아직 봉인한 증거물이 없어요. ${presets().some(p => p[0] === '첫 돌') ? '첫 돌에 열릴 편지를 써 볼까요?' : ''}</p>`}</section>
  <p class="foot">봉인은 앱에서 지켜요. 편지는 우리 가족 공간에만 보관되고, 열리는 날 아침에는 알림을 켠 폰으로 알려 드려요.</p>
  <button class="secondary" data-cp="close" style="width:100%;margin-top:14px">돌아가기</button>`;
}

// ---------- 쓰기 ----------
function openWrite() {
  if (!myRole()) { toast('먼저 어느 수사관인지 골라 주세요'); if (typeof openRole === 'function') openRole(); return; }
  const P = presets(), def = P.find(p => p[0] === '첫 돌') || P[0];
  C.occ = def ? def[0] : 'custom'; C.date = def ? def[1] : '';
  pending = undefined;
  openSheet(`<h3>새 증거물 봉인하기</h3>
    <p class="hint">${esc(CV.nick())}에게 편지를 써서 봉인해요. 정한 날까지는 쓴 사람도 열어 볼 수 없어요.</p>
    <div class="field"><span>언제 열까요?</span>
      <div class="chips cpocc">${P.map(([n, d]) => `<button class="chip${n === C.occ ? ' on' : ''}" data-cp="occ" data-v="${esc(n)}" data-d="${d}">${esc(n)}</button>`).join('')}<button class="chip${C.occ === 'custom' ? ' on' : ''}" data-cp="occ" data-v="custom">날짜 고르기</button></div>
      <input type="date" id="cp-date" min="${addDays(today(), 1)}" value="${C.occ === 'custom' ? '' : C.date}" ${C.occ === 'custom' ? '' : 'hidden'} style="margin-top:8px">
      <p class="cpwhen" id="cp-when">${whenText(C.date)}</p></div>
    <label class="field"><span>봉투에 적을 말 (선택 · 봉인해도 보여요)</span><input id="cp-title" maxlength="40" placeholder="예: 첫 돌을 맞은 ${esc(CV.nick())}에게"></label>
    <label class="field"><span>편지</span><textarea id="cp-body" maxlength="5000" rows="9" placeholder="${esc(voc())}, 오늘은…"></textarea><small class="cpcount" id="cp-count">0 / 5000</small></label>
    ${photoField('', '같이 봉인할 사진 (선택)', true)}
    <p class="err" id="cp-err"></p>
    <div class="actions"><button class="secondary" data-act="close">취소</button><button class="primary" data-cp="seal">🔒 봉인하기</button></div>`);
}
async function seal(b) {
  const body = ($('cp-body').value || '').trim(), title = ($('cp-title').value || '').trim(), open = C.date, e = $('cp-err');
  if (!body && !pending) { e.textContent = '편지를 써 주세요'; return; }
  if (!open || open <= today()) { e.textContent = '열 날을 골라 주세요 (내일부터)'; return; }
  const occ = C.occ === 'custom' ? '' : C.occ;
  if (!await ask(`${occ || dot(open)}${occ ? `(${dot(open)})` : ''}까지 봉인할까요?\n봉인하면 그날까지 쓴 사람도 열어 볼 수 없고, 고칠 수도 없어요.`)) return;
  const o = { title, body, open, occ, sealed: today(), by: myRole() };
  if (pending) o.photo = pending;
  b.disabled = true;
  const res = await write('saveItem', 'capsule', o);
  b.disabled = false;
  if (!res) return;
  pending = undefined; closeSheet();
  if (window.GAME) GAME.confetti();
  toast(`🔒 봉인 완료! ${occ || dot(open)}에 열려요 (D-${daysBetween(today(), open)})`);
}

// ---------- 열기 ----------
function letterHtml(c) {
  const ph = safeImg(PHOTOS[c.id]);
  return `<h3>${esc(c.occ || dot(c.open))}에 열린 편지</h3>
    <div class="cpletter">
      <span class="cpmeta">${dot(c.sealed)} ${esc(c.by || '')} 수사관이 봉인 → ${dot(c.open)} 개봉</span>
      ${c.title ? `<b class="cplt">${esc(c.title)}</b>` : ''}
      ${c.photo ? `<button class="cpph" ${ph ? `data-view="${esc(c.id)}"` : ''} id="cp-ph">${ph ? `<img src="${ph}" alt="같이 봉인한 사진">` : '<span>사진 불러오는 중…</span>'}</button>` : ''}
      ${c.body ? `<p class="cpbody">${esc(c.body).replace(/\n/g, '<br>')}</p>` : ''}
      <span class="cpsign">— ${esc(c.by || '')} 수사관</span>
    </div>
    <div class="actions"><button class="secondary" data-act="close">닫기</button>${c.by === myRole() && canWrite() ? `<button class="danger" data-cp="del" data-id="${esc(c.id)}">편지 지우기</button>` : ''}</div>`;
}
async function loadPh(c) {
  if (!c.photo || safeImg(PHOTOS[c.id])) return;
  try { const u = await run('getPhoto', c.id); if (u) { PHOTOS[c.id] = u; const b = $('cp-ph'); if (b && C.reading === c.id) { b.dataset.view = c.id; b.innerHTML = `<img src="${safeImg(u)}" alt="같이 봉인한 사진">`; } } } catch (e) {}
}
function read(id) {
  const c = list().find(x => x.id === id); if (!c || !isOpen(c)) return;
  C.reading = id;
  if (seen().includes(id)) { openSheet(letterHtml(c)); loadPh(c); return; }
  // 처음 여는 편지: 봉인 해제 장면
  openSheet(`<h3>봉인된 증거물</h3>
    <div class="cpcere" id="cp-cere"><div class="cpbig"><span class="cpbflap"></span><span class="cpbwax">🔒</span></div>
      <p><b>${esc(c.by || '')} 수사관</b>이 ${dot(c.sealed)}에 봉인한 증거물이에요.<br>${esc(c.occ || dot(c.open))}, 드디어 열 수 있어요!</p></div>
    <div class="actions"><button class="secondary" data-act="close">나중에</button><button class="primary" data-cp="unseal" data-id="${esc(id)}">🔓 봉인 해제</button></div>`);
  loadPh(c);
}
function unseal(id) {
  const c = list().find(x => x.id === id); if (!c) return;
  const box = $('cp-cere'); if (box) box.classList.add('go');
  if (window.GAME) GAME.confetti();
  setTimeout(() => { markSeen(id); if (document.querySelector('.sheet.open')) { openSheet(letterHtml(c)); loadPh(c); } if (S.view === 'capsule' || S.view === '') render(); }, 900);
}
function peek(id) {
  const c = list().find(x => x.id === id); if (!c) return;
  const dl = daysBetween(today(), c.open);
  openSheet(`<h3>아직 열 수 없어요</h3>
    <div class="cppeek"><span class="cpbwax">🔒</span><p><b>${esc(c.occ || dot(c.open))}</b>(${dot(c.open)})에 열려요.<br>봉인 해제까지 <b style="color:var(--red)">D-${dl}</b></p>
    <small>${dot(c.sealed)} ${esc(c.by || '')} 수사관이 봉인${c.title ? ` · 봉투: "${esc(c.title)}"` : ''}</small></div>
    <div class="actions"><button class="secondary" data-act="close">닫기</button>${c.by === myRole() && canWrite() ? `<button class="danger" data-cp="del" data-id="${esc(c.id)}">봉인 파기</button>` : ''}</div>`);
}

// ---------- 성장 수사 탭 알림 띠 ----------
function banner() {
  if (!S.profile || !S.profile.birth) return '';
  const fresh = list().filter(c => isOpen(c) && !seen().includes(c.id)).sort((a, b) => a.open < b.open ? 1 : -1);
  if (fresh.length) return `<button class="cpban" data-cp="openview"><span class="cpbi">🔓</span><span><b>봉인 해제!</b> ${esc(fresh[0].by || '')} 수사관이 ${dot(fresh[0].sealed)}에 봉인한 증거물이 열렸어요${fresh.length > 1 ? ` (외 ${fresh.length - 1}통)` : ''}</span><em>열기 ›</em></button>`;
  const soon = list().filter(c => !isOpen(c) && daysBetween(today(), c.open) <= 3).sort((a, b) => a.open < b.open ? -1 : 1)[0];
  if (soon) return `<button class="cpban soon" data-cp="openview"><span class="cpbi">⏳</span><span>봉인된 증거물이 <b>${daysBetween(today(), soon.open)}일 뒤</b> 열려요 · ${esc(soon.occ || dot(soon.open))}</span><em>›</em></button>`;
  return '';
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-cp]'); if (!b || b.disabled) return;
  const a = b.dataset.cp;
  if (a === 'openview') { S.view = 'capsule'; render(); window.scrollTo(0, 0); return; }
  if (a === 'close') { goBack(); return; }
  if (a === 'read') { read(b.dataset.id); return; }
  if (a === 'peek') { peek(b.dataset.id); return; }
  if (a === 'unseal') { b.disabled = true; unseal(b.dataset.id); return; }
  if (!canWrite()) { toast('보기 전용이라 편지는 엄마·아빠 수사관만 쓸 수 있어요'); return; }
  if (a === 'new') { openWrite(); return; }
  if (a === 'occ') {
    document.querySelectorAll('.cpocc .chip').forEach(x => x.classList.toggle('on', x === b));
    const inp = $('cp-date'); C.occ = b.dataset.v;
    if (C.occ === 'custom') { inp.hidden = false; C.date = inp.value && inp.value > today() ? inp.value : ''; try { inp.showPicker && inp.showPicker(); } catch (x) {} }
    else { inp.hidden = true; C.date = b.dataset.d; }
    $('cp-when').textContent = whenText(C.date); return;
  }
  if (a === 'seal') { await seal(b); return; }
  if (a === 'del') {
    const c = list().find(x => x.id === b.dataset.id); if (!c) return;
    if (!await ask(isOpen(c) ? '이 편지를 지울까요? 되돌릴 수 없어요.' : '봉인을 파기하고 편지를 지울까요?\n내용은 열어 보지 않고 그대로 지워지며, 되돌릴 수 없어요.')) return;
    if (await write('deleteItem', 'capsule', c.id)) { delete PHOTOS[c.id]; closeSheet(); toast('지웠어요'); }
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'cp-body') { const n = $('cp-count'); if (n) n.textContent = `${e.target.value.length} / 5000`; }
  if (e.target.id === 'cp-date') { C.date = e.target.value > today() ? e.target.value : ''; const w = $('cp-when'); if (w) w.textContent = whenText(C.date); }
});

const css = document.createElement('style');
css.textContent = `
.cpnew{width:100%;min-height:52px;margin-top:14px}
.cplist{display:flex;flex-direction:column;gap:12px}
.cpenv{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:3px;width:100%;text-align:left;border:1.5px solid #D8C29A;border-radius:14px;padding:44px 16px 14px;background:linear-gradient(160deg,#FBF3E2,#F2E3C6);box-shadow:0 4px 0 #E2CDA6,0 8px 16px rgba(120,90,50,.12);overflow:hidden}
.cpflap{position:absolute;left:0;right:0;top:0;height:40px;background:linear-gradient(to bottom right,transparent 49.5%,#E9D5AE 50%) left/50% 100% no-repeat,linear-gradient(to bottom left,transparent 49.5%,#E9D5AE 50%) right/50% 100% no-repeat;opacity:.9}
.cpwax{position:absolute;left:50%;top:20px;transform:translate(-50%,0);width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:20px;background:radial-gradient(circle at 35% 30%,#D44A40,#9E1F18 70%);box-shadow:0 2px 4px rgba(80,20,10,.35),inset 0 0 0 3px rgba(255,255,255,.12)}
.cpenv.open .cpwax{background:radial-gradient(circle at 35% 30%,#F4C542,#C9921B 70%)}
.cpenv.fresh{animation:cpglow 1.6s ease-in-out infinite}
@keyframes cpglow{0%,100%{box-shadow:0 4px 0 #E2CDA6,0 0 0 0 rgba(244,197,66,.0)}50%{box-shadow:0 4px 0 #E2CDA6,0 0 0 6px rgba(244,197,66,.45)}}
.cpto{margin-top:10px;font-size:12px;color:var(--muted)}
.cptitle{font-family:var(--display);font-weight:400;font-size:19px;color:var(--navy);line-height:1.3;word-break:keep-all}
.cpocc{font-size:14px;color:var(--ink)}
.cpdd{font-size:13px;color:var(--ink)}.cpdd b{color:var(--red);font-size:17px}
.cpprog{display:block;width:100%;height:8px;border-radius:99px;background:#EAD9B8;overflow:hidden;margin-top:2px}
.cpprog i{display:block;height:100%;border-radius:99px;background:var(--red)}
.cpsd{font-size:11px;color:var(--muted)}
.cpwhen{margin:8px 0 0;font-size:13px;color:var(--navy);font-weight:700}
.cpocc.chips,.chips.cpocc{gap:6px}
.chips.cpocc .chip.on{background:var(--navy);color:#fff}
.cpcount{display:block;text-align:right;font-size:11px;color:var(--muted);margin-top:4px}
.cpletter{background:#FFFDF7;border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:14px}
.cpmeta{display:block;font-size:11px;color:var(--muted);margin-bottom:8px}
.cplt{display:block;font-family:var(--display);font-weight:400;font-size:22px;color:var(--navy);margin-bottom:8px}
.cpph{display:block;width:100%;border:0;padding:0;background:none;margin:4px 0 10px}
.cpph img{display:block;width:100%;max-height:340px;object-fit:contain;border-radius:8px;background:#F2E3C9}
.cpph span{display:block;padding:30px 0;text-align:center;font-size:13px;color:var(--muted)}
.cpbody{margin:0;font-size:16px;line-height:32px;background-image:repeating-linear-gradient(transparent 0 31px,rgba(185,150,105,.3) 31px 32px);white-space:normal;word-break:keep-all;-webkit-user-select:text;user-select:text}
.cpsign{display:block;text-align:right;margin-top:10px;font-family:var(--display);color:var(--navy)}
.cpcere{text-align:center;padding:6px 0 14px}
.cpcere p{font-size:14px;margin:14px 0 0}
.cpbig{position:relative;width:200px;height:130px;margin:6px auto 0;border-radius:10px;background:linear-gradient(160deg,#FBF3E2,#EAD5AE);box-shadow:0 6px 14px rgba(120,90,50,.25);overflow:hidden}
.cpbflap{position:absolute;left:0;right:0;top:0;height:70px;background:linear-gradient(to bottom right,transparent 49.5%,#E2C99A 50%) left/50% 100% no-repeat,linear-gradient(to bottom left,transparent 49.5%,#E2C99A 50%) right/50% 100% no-repeat;transform-origin:top;transition:transform .7s ease .25s}
.cpbwax{position:absolute;left:50%;top:44px;transform:translateX(-50%);width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font-size:24px;background:radial-gradient(circle at 35% 30%,#D44A40,#9E1F18 70%);box-shadow:0 2px 6px rgba(80,20,10,.4);transition:transform .45s ease,opacity .45s ease}
.cpcere.go .cpbwax{transform:translateX(-50%) scale(1.5) rotate(25deg);opacity:0}
.cpcere.go .cpbflap{transform:scaleY(-1)}
.cppeek{text-align:center;padding:4px 0 16px}
.cppeek .cpbwax{position:static;transform:none;margin:0 auto 10px}
.cppeek p{margin:0 0 8px;font-size:15px}
.cppeek small{font-size:12px;color:var(--muted)}
.cpban{display:flex;align-items:center;gap:10px;width:100%;margin:10px 0 4px;padding:12px 14px;border-radius:18px;border:1.5px solid #F2C14E;background:linear-gradient(120deg,#FFF6D8,#FDE7B0);font-size:14px;text-align:left;color:var(--ink);box-shadow:0 3px 0 rgba(201,146,27,.25)}
.cpban.soon{border-color:var(--line);background:#FFFDF7;box-shadow:none}
.cpban .cpbi{font-size:24px}.cpban span{flex:1;min-width:0}.cpban em{font-style:normal;color:var(--red);font-weight:700;white-space:nowrap}`;
document.head.appendChild(css);
window.CAPSULE = { render: render_, banner, list };
})();
