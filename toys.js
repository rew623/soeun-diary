// 동네 탐문 탭의 '🧸 장난감 대여' 칸(S.townView='toy') — 원주시 장난감도서관 4개 지점 목록(data/toys-<지점>.json, toys.yml이 문 여는 날 2시간마다 받아요)
// 사이트(http)는 앱에서 직접 못 읽어서 받아 둔 목록을 보여 주고, 누르면 기본 브라우저로 그 장난감 화면을 열어요. 대여 신청은 사이트·방문에서
// 빌린 장난감은 rent 컬렉션(S.rents)에 남겨 반납 날짜를 챙겨요 (사용자 요청 2026.11.10)
(() => {
const SITE = 'http://www.wjeducare.or.kr/toy/m4/';
const BR = {
  mm: { n: '문막', addr: '원주시 원문로 1771-3', tel: '033-742-0756', open: [2, 3, 4, 5, 6], hours: '화~토 9~18시', off: '일·월·공휴일' },
  ct: { n: '센터', addr: '원주시 세계로 31 (원주시육아종합지원센터)', tel: '033-743-0756', open: [2, 3, 4, 5, 6], hours: '화~토 9~18시', off: '일·월·공휴일' },
  bm: { n: '보물섬', addr: '원주시 서원대로 291 (치악체육관 안)', tel: '033-763-0756', open: [2, 3, 4, 5, 6], hours: '화~토 9~18시', off: '일·월·공휴일' },
  np: { n: '늘품', addr: '원주시 늘품로 83', tel: '033-761-0756', open: [1, 2, 3, 4, 5], hours: '월~금 9~18시', off: '토·일·공휴일' }
};
const AGE = [['000', '~12개월'], ['100', '~24개월'], ['200', '~35개월'], ['300', '36개월~'], ['', '전체']];
const COL = { r: ['빨강', '#D2463C'], y: ['노랑', '#E0B21B'], b: ['파랑', '#2F6FD6'] };
const DAYS = 864e5;
const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
const TY = { d: {}, loading: {}, br: BR[ls('soeun-toy-br')] ? ls('soeun-toy-br') : 'mm', age: null, avail: true, col: new Set(['r', 'y', 'b']), q: '', more: 20, at: {} };
{ const a = ls('soeun-toy-age'); if (a !== null && AGE.some(x => x[0] === a)) TY.age = a; }
const myAge = () => { const p = S.profile; if (!p || !p.birth) return '000'; const m = monthsDays(p.birth, today())[0]; return m < 12 ? '000' : m < 24 ? '100' : m < 36 ? '200' : '300'; };
const canWrite = () => !(S.me && S.me.viewer);
const shown = () => S.tab === 'town' && S.townView === 'toy' && !S.view;

function load(b, force) {
  if (TY.loading[b] || (TY.d[b] && !force)) return; TY.loading[b] = true;
  fetch(`data/toys-${b}.json?t=${force ? Date.now() : ''}`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
    TY.loading[b] = false; TY.at[b] = Date.now();
    if (d || !TY.d[b]) TY.d[b] = d || { items: [] };
    if (force) toast(d ? `목록을 새로 불러왔어요 (${d.updated || ''} 기준)` : '목록을 못 불러왔어요');
    if (shown()) render();
  });
}
function openNow(b) {
  const n = new Date(), wd = n.getDay(), m = n.getHours() * 60 + n.getMinutes(), B = BR[b];
  if (!B.open.includes(wd)) return ['오늘은 휴관일', 'off'];
  if (m < 540) return ['9시에 열어요', 'off'];
  if (m >= 1080) return ['오늘은 문 닫았어요', 'off'];
  if (m >= 720 && m < 780) return ['점심시간 (13시부터)', 'mid'];
  return ['지금 열려 있어요', 'on'];
}
// 사이트 화면: 안드로이드는 기본 브라우저로(intent), 아이폰은 사파리 창으로
const isAnd = /Android/i.test(navigator.userAgent), isSam = /SM-|SAMSUNG|SamsungBrowser|Galaxy/i.test(navigator.userAgent);   // 갤럭시는 삼성 인터넷으로 바로 (없으면 기본 브라우저)
const link = id => { const u = `${SITE}sub1_view.asp?seq=-1&idx=${encodeURIComponent(id)}`; return isAnd ? `intent://${u.replace(/^http:\/\//, '')}#Intent;scheme=http;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;${isSam ? 'package=com.sec.android.app.sbrowser;' : ''}S.browser_fallback_url=${encodeURIComponent(u)};end` : u; };
const pic = (D, x) => !x.p ? '' : /^https?:/.test(x.p) ? x.p : (D.pic || '') + x.p;

// ---------- 빌린 장난감 ----------
const active = () => (S.rents || []).filter(r => !r.back).sort((a, b) => a.due < b.due ? -1 : 1);
const dleft = r => Math.round((Date.parse(r.due) - Date.parse(today())) / DAYS);
const dTxt = n => n < 0 ? `${-n}일 지남` : n === 0 ? '오늘 반납' : `D-${n}`;
function badge() { const a = active(); if (!a.length) return ''; const n = Math.min(...a.map(dleft)); return n <= 2 ? (n < 0 ? '!' : 'D-' + n) : ''; }
function rentHtml() {
  const A = active(), done = (S.rents || []).filter(r => r.back).sort((a, b) => a.back < b.back ? 1 : -1);
  const card = r => { const n = dleft(r), cls = n < 0 ? 'late' : n <= 2 ? 'soon' : '', ext = r.ext === '1', tot = Math.round((Date.parse(r.due) - Date.parse(r.start)) / DAYS);
    return `<div class="trc ${cls}"><button class="trm" data-toy="redit" data-id="${r.id}">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '<span>🧸</span>'}</button>
      <div class="trb" data-toy="redit" data-id="${r.id}"><b>${esc(r.name)}</b><small>${r.tag && COL[r.tag] ? `<i style="background:${COL[r.tag][1]}"></i>` : ''}${esc((BR[r.br] || {}).n || '')} · ${fmtMD(r.start)} 빌림${ext ? ' · 연장함' : ''}</small><span class="trd">${fmtMD(r.due)}까지 <em>${dTxt(n)}</em></span></div>
      <div class="tra"><button data-toy="back" data-id="${r.id}">반납했어요</button>${!ext && tot + 7 <= 21 ? `<button class="ghost" data-toy="ext" data-id="${r.id}">7일 연장</button>` : ''}</div></div>`; };
  const red = A.filter(r => r.tag === 'r').length;
  const warn = A.length > 2 ? '⚠️ 한 번에 2점까지예요' : red > 1 ? '⚠️ 빨강 태그는 1점만 빌릴 수 있어요' : '';
  return `<section class="trent${isFold('v-rent') ? ' folded' : ''}"><h2 class="sh" data-fold="v-rent"><span>📦 빌린 장난감</span><span>${A.length ? `${A.length}점 빌리는 중` : '없음'}</span></h2>
    ${warn ? `<p class="notice" style="margin:0 0 8px">${warn}</p>` : ''}
    ${A.length ? A.map(card).join('') : '<p class="vempty" style="margin:4px 0 8px">빌린 장난감을 남겨 두면 반납 날짜를 챙겨 줘요. 아래 목록에서 「+ 빌렸어요」를 누르거나 직접 적어요.</p>'}
    ${canWrite() ? '<button class="ghost" data-toy="radd" style="width:100%;margin-top:4px">+ 빌린 장난감 직접 적기</button>' : ''}
    ${done.length ? `<details class="trdone"><summary>반납한 장난감 ${done.length}점</summary>${done.slice(0, 30).map(r => `<button class="trline" data-toy="redit" data-id="${r.id}"><span>${esc(r.name)}</span><small>${esc((BR[r.br] || {}).n || '')} · ${fmtMD(r.start)}~${fmtMD(r.back)}</small></button>`).join('')}</details>` : ''}</section>`;
}
function openRent(id, toy) {
  if (!canWrite()) { toast('보기 전용이라 기록은 엄마·아빠 수사관이 남겨요'); return; }
  const r = id ? (S.rents || []).find(x => x.id === id) : null, t = today();
  const v = r || { name: toy ? toy.n : '', idx: toy ? toy.i : '', br: TY.br, tag: toy ? toy.c : '', img: toy ? pic(TY.d[TY.br] || {}, toy) : '', start: t, due: addDays(t, 14), ext: '', back: '', memo: '' };
  const per = Math.round((Date.parse(v.due) - Date.parse(v.start)) / DAYS);
  openSheet(`<h3>🧸 ${r ? '빌린 장난감 고치기' : '장난감 빌렸어요'}</h3>
    <label class="field"><span>장난감 이름</span><input id="tr-name" maxlength="60" value="${esc(v.name)}" placeholder="예: 바운스 액티비티 점퍼"></label>
    <div class="dytpr"><label class="field"><span>지점</span><select id="tr-br">${Object.entries(BR).map(([k, B]) => `<option value="${k}"${v.br === k ? ' selected' : ''}>${B.n}</option>`).join('')}</select></label>
      <label class="field"><span>태그 색</span><select id="tr-tag"><option value="">모름</option>${Object.entries(COL).map(([k, [n]]) => `<option value="${k}"${v.tag === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <div class="dytpr"><label class="field"><span>빌린 날</span><input id="tr-start" type="date" value="${v.start}"></label><label class="field"><span>반납 예정일</span><input id="tr-due" type="date" value="${v.due}"></label></div>
    <div class="quick" style="margin:-4px 0 10px">${[7, 14].map(n => `<button type="button" data-toy="per" data-v="${n}" class="${per === n ? 'on' : ''}">${n}일</button>`).join('')}<label class="trx"><input type="checkbox" id="tr-ext"${v.ext === '1' ? ' checked' : ''}> 전화로 연장함 (+7일, 최대 21일)</label></div>
    ${r ? `<label class="field"><span>반납한 날 <small>(비우면 빌리는 중)</small></span><input id="tr-back" type="date" value="${v.back || ''}"></label>` : ''}
    <label class="field"><span>메모 (선택)</span><input id="tr-memo" maxlength="100" value="${esc(v.memo || '')}" placeholder="예: 부품 4개, 건전지 확인"></label>
    <p class="hint" style="margin:0 0 8px">대여 기간 7~14일 · 전화로 1번 7일 연장(최대 21일) · 1회 2점(빨강 태그는 1점만)</p>
    <p class="err" id="tr-err"></p>
    <div class="actions">${r ? `<button class="danger" data-toy="rdel" data-id="${r.id}">삭제</button>` : ''}<button class="secondary" data-act="close">취소</button><button class="primary" data-toy="rsave" data-id="${r ? r.id : ''}" data-idx="${esc(v.idx || '')}" data-img="${esc(v.img || '')}">저장</button></div>`);
}
const full = (r, patch) => Object.assign({ name: '', idx: '', br: '', tag: '', img: '', start: '', due: '', ext: '', back: '', memo: '', by: myRole() }, r, patch);

// ---------- 화면 ----------
function list(D) {
  const age = TY.age == null ? myAge() : TY.age, q = TY.q.trim().replace(/\s+/g, '');
  return (D.items || []).filter(x => (!age || x.a === age) && (!TY.avail || x.s) && TY.col.has(x.c) && (!q || x.n.replace(/\s+/g, '').includes(q)));
}
function cards() {
  const D = TY.d[TY.br] || { items: [] }, L = list(D), shownL = L.slice(0, TY.more), mine = new Set(active().map(r => r.idx).filter(Boolean)), cw = canWrite();
  if (!L.length) return '<p class="vempty" style="margin:6px 0">조건에 맞는 장난감이 없어요.</p>';
  return `<div class="tyg">${shownL.map(x => `<div class="tyc"><a href="${esc(link(x.i))}" target="_blank" rel="noopener">
      <span class="tyi">${x.p ? `<img src="${esc(pic(D, x))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span>🧸</span></span>
      <b>${esc(x.n)}</b><small><i style="background:${COL[x.c][1]}"></i>${COL[x.c][0]} · <em class="${x.s ? 'ok' : 'no'}">${x.s ? '대여가능' : '대여중'}</em></small></a>
      ${mine.has(x.i) ? '<span class="tymine">📦 빌리는 중</span>' : cw ? `<button class="tyb" data-toy="rtoy" data-id="${esc(x.i)}">+ 빌렸어요</button>` : ''}</div>`).join('')}</div>
    ${L.length > shownL.length ? `<button class="addperiod" data-toy="more">더 보기 (${L.length - shownL.length}개 남음)</button>` : ''}`;
}
function render_() {
  const b = TY.br, B = BR[b], D = TY.d[b]; if (!D) load(b);
  const age = TY.age == null ? myAge() : TY.age, [ot, oc] = openNow(b), all = D ? D.items || [] : [], av = all.filter(x => x.s && (!age || x.a === age)).length;
  const info = `<details class="tyinfo"${ls('soeun-toy-info') === '1' ? ' open' : ''}><summary><b class="tyo ${oc}">${ot}</b> ${B.n} 장난감도서관<span class="tytel"><a href="tel:${B.tel}">☎ ${B.tel}</a> · ${B.hours}</span></summary>
    <dl><dt>주소</dt><dd>${B.addr} <a class="tymap" href="https://map.kakao.com/link/search/${encodeURIComponent('강원특별자치도 ' + B.addr.replace(/ \(.*\)$/, ''))}" target="_blank" rel="noopener">🗺️ 지도</a></dd><dt>운영</dt><dd>${B.hours} (점심 12~13시엔 대여·반납 안 해요)</dd><dt>휴관</dt><dd>${B.off}, 센터가 정한 날</dd>
    <dt>대여</dt><dd>1회 2점 · 태그 색별로 (빨강은 1점만, 빨강+빨강 안 돼요)</dd><dt>기간</dt><dd>7~14일 · 전화로 1번 7일 연장 (최대 21일)</dd>
    <dt>신청</dt><dd>목록에서 장난감을 누르면 사이트가 열려요. 대여는 방문해서 해요</dd></dl></details>`;
  const body = !D ? '<p class="vempty">불러오는 중…</p>' : !all.length ? '<p class="vempty">이 지점 장난감 목록을 아직 못 받았어요. 몇 시간 안에 생겨요.</p>' : `
    <div class="seg tyage">${AGE.map(([k, l]) => `<button class="${age === k ? 'on' : ''}" data-toy="age" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="tyf"><button class="${TY.avail ? 'on' : ''}" data-toy="avail">대여가능만</button>${Object.entries(COL).map(([k, [n, c]]) => `<button class="${TY.col.has(k) ? 'on' : ''}" data-toy="col" data-v="${k}" style="--c:${c}"><i></i>${n}</button>`).join('')}</div>
    <input class="tyq" id="toy-q" type="search" placeholder="장난감 이름으로 찾기 (예: 점퍼, 보행기)" value="${esc(TY.q)}" data-noswipe>
    <div id="toy-list">${cards()}</div>`;
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>장난감 대여</h1>${townSeg('toy')}<p>원주시 장난감도서관에서 지금 빌릴 수 있는 장난감을 찾고, 빌린 장난감의 반납 날짜를 챙겨요.</p></header>
    ${rentHtml()}
    <section class="tysec"><div class="seg tybr">${Object.entries(BR).map(([k, x]) => `<button class="${b === k ? 'on' : ''}" data-toy="br" data-v="${k}">${x.n}</button>`).join('')}</div>
    ${info}
    <div class="tyhd"><b>${B.n} 장난감</b><button class="ghost" data-toy="reload">🔄 새로 불러오기</button></div>
    ${D && all.length ? `<p class="tyup">대여가능 ${av}개 · ${esc((D.updated || '').slice(5).replace('-', '.'))} 받은 목록</p>` : ''}
    ${body}
    <p class="foot" style="margin:8px 0 0">목록은 문 여는 날 2시간마다 새로 받아요. 그사이 바뀌었을 수 있으니 가기 전에 전화로 확인하면 확실해요.</p></section>`;
}
const relist = () => { const el = document.getElementById('toy-list'); if (el) el.innerHTML = cards(); };
const toyOf = id => ((TY.d[TY.br] || {}).items || []).find(x => x.i === id);
document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('tyinfo')) ls('soeun-toy-info', e.target.open ? '1' : '0'); }, true);
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-toy]'); if (!b) return;
  const a = b.dataset.toy, v = b.dataset.v || '', id = b.dataset.id;
  switch (a) {
    case 'br': TY.br = v; TY.more = 20; ls('soeun-toy-br', v); load(v); render(); return;
    case 'age': TY.age = v; TY.more = 20; ls('soeun-toy-age', v); render(); return;
    case 'avail': TY.avail = !TY.avail; TY.more = 20; render(); return;
    case 'col': if (TY.col.has(v) && TY.col.size > 1) TY.col.delete(v); else TY.col.add(v); TY.more = 20; render(); return;
    case 'more': TY.more += 20; relist(); return;
    case 'reload': if (Date.now() - (TY.at[TY.br] || 0) < 5000) { toast('방금 불러왔어요'); return; } load(TY.br, true); return;
    case 'radd': openRent(null, null); return;
    case 'rtoy': openRent(null, toyOf(id)); return;
    case 'redit': openRent(id); return;
    case 'per': { const s = document.getElementById('tr-start').value || today(); document.getElementById('tr-due').value = addDays(s, +v + (document.getElementById('tr-ext').checked ? 7 : 0)); b.parentElement.querySelectorAll('[data-toy="per"]').forEach(x => x.classList.toggle('on', x === b)); return; }
    case 'rsave': {
      const g = k => (document.getElementById(k) || {}).value || '', name = g('tr-name').trim(), st = g('tr-start'), due = g('tr-due');
      const err = t => { const el = document.getElementById('tr-err'); if (el) el.textContent = t; };
      if (!name) return err('장난감 이름을 적어 주세요'); if (!st || !due) return err('빌린 날과 반납 예정일을 넣어 주세요'); if (due < st) return err('반납 예정일이 빌린 날보다 빨라요');
      const r0 = id ? (S.rents || []).find(x => x.id === id) : {};
      const o = full(r0, { id: id || undefined, name, idx: b.dataset.idx || '', img: b.dataset.img || '', br: g('tr-br'), tag: g('tr-tag'), start: st, due, ext: document.getElementById('tr-ext').checked ? '1' : '', back: id ? g('tr-back') : '', memo: g('tr-memo').trim() });
      if (await write('saveItem', 'rent', o)) { closeSheet(); toast(o.back ? '반납 기록을 저장했어요' : `${fmtMD(due)}까지 반납이에요. 잊지 않게 챙길게요`); }
      return;
    }
    case 'back': { const r = (S.rents || []).find(x => x.id === id); if (!r || !canWrite()) return; if (!(await ask(`「${r.name}」 반납했나요?`, { ok: '반납했어요' }))) return; if (await write('saveItem', 'rent', full(r, { back: today() }))) toast('반납 완료! 수고했어요'); return; }
    case 'ext': { const r = (S.rents || []).find(x => x.id === id); if (!r || !canWrite()) return; if (!(await ask(`「${r.name}」 7일 연장할까요? (도서관에 전화로 먼저 연장해 주세요)`, { ok: '연장했어요' }))) return; if (await write('saveItem', 'rent', full(r, { due: addDays(r.due, 7), ext: '1' }))) toast(`${fmtMD(addDays(r.due, 7))}까지로 늘렸어요`); return; }
    case 'rdel': { if (!(await ask('이 기록을 지울까요?', { ok: '지우기', danger: true }))) return; if (await write('deleteItem', 'rent', id)) { closeSheet(); toast('지웠어요'); } return; }
  }
});
document.addEventListener('input', e => { if (e.target.id !== 'toy-q') return; TY.q = e.target.value; TY.more = 20; relist(); });
document.addEventListener('change', e => {   // 연장 체크·빌린 날을 바꾸면 반납 예정일도 같이
  if (e.target.id !== 'tr-ext' && e.target.id !== 'tr-start') return;
  const on = document.querySelector('[data-toy="per"].on'), s = document.getElementById('tr-start').value; if (!on || !s) return;
  document.getElementById('tr-due').value = addDays(s, +on.dataset.v + (document.getElementById('tr-ext').checked ? 7 : 0));
});

const css = document.createElement('style');
css.textContent = `
.tybr{margin-bottom:10px}.tybr button{font-size:14px;min-height:40px}
.tyinfo{border:1.5px solid var(--line);border-radius:12px;background:#FFFDF7;padding:8px 12px;margin-bottom:12px;font-size:13px}
.tyinfo summary{cursor:pointer;color:var(--muted);line-height:1.6}.tytel{display:block;padding-left:16px;font-size:12.5px}.tymap{white-space:nowrap;color:var(--navy);margin-left:4px}.tyinfo summary a{color:var(--navy)}
.tyinfo dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;margin:8px 0 2px}.tyinfo dt{font-family:var(--display);color:var(--navy)}.tyinfo dd{margin:0;color:var(--ink)}
.tyo{font-family:var(--display);font-weight:400;padding:1px 8px;border-radius:99px;margin-right:2px}.tyo.on{background:#DDF0D6;color:#2F6B2A}.tyo.mid{background:#FFF0C7;color:#8A6400}.tyo.off{background:#F1E4DD;color:var(--red)}
.tyhd{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 2px}.tyhd b{font-family:var(--display);font-weight:400;font-size:18px;color:var(--navy)}.tyhd button{min-height:34px;padding:0 12px;font-size:12.5px}.tyup{margin:0 0 8px;font-size:12px;color:var(--muted)}
#sheet #tr-br,#sheet #tr-tag{width:100%;min-height:46px;border:1.5px solid var(--line);border-radius:12px;background:#FFFDF7;padding:0 10px;font:inherit;color:var(--ink)}
.tyage{margin-bottom:8px}.tyage button{font-size:12.5px;padding:6px 0;min-height:38px}
.tyf{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.tyf button{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;min-height:34px;border-radius:99px;border:1.5px solid var(--line);background:#FFFDF7;color:var(--muted);font-size:13px}
.tyf button.on{border-color:var(--navy);color:var(--navy);background:#fff;font-weight:700}.tyf i{width:10px;height:10px;border-radius:50%;background:var(--c)}
.tyq{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;font:inherit;background:#FFFDF7;margin-bottom:10px}
.tyg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tyc{display:flex;flex-direction:column;border:1.5px solid var(--line);border-radius:12px;background:#FFFDF7;overflow:hidden}
.tyc a{display:flex;flex-direction:column;gap:4px;padding:8px;color:var(--ink);text-decoration:none;flex:1}
.tyi{position:relative;display:grid;place-items:center;aspect-ratio:1;border-radius:8px;background:#fff;overflow:hidden}.tyi span{font-size:30px;opacity:.35}.tyi img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff}
.tyc b{font-weight:400;font-size:13.5px;line-height:1.35;color:var(--navy)}.tyc small{display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--muted)}.tyc small i{width:9px;height:9px;border-radius:50%;flex:none}
.tyc em{font-style:normal}.tyc em.ok{color:#2F6B2A;font-weight:700}.tyc em.no{color:var(--red)}
.tyb{border:0;border-top:1.5px dashed var(--line);background:none;color:var(--navy);font-size:12.5px;min-height:34px;padding:0}.tymine{border-top:1.5px dashed var(--line);text-align:center;font-size:12px;color:#2F6B2A;padding:7px 0}
.trc{display:grid;grid-template-columns:56px 1fr;gap:4px 10px;align-items:center;border:1.5px solid var(--line);border-radius:12px;background:#FFFDF7;padding:8px;margin-bottom:8px}
.trc.soon{border-color:#E0B21B;background:#FFF8E2}.trc.late{border-color:var(--red);background:#FFF1EE}
.trm{width:56px;height:56px;border-radius:10px;border:0;padding:0;background:#fff;overflow:hidden;display:grid;place-items:center;font-size:26px}.trm img{width:100%;height:100%;object-fit:contain}
.trb{cursor:pointer;min-width:0}.trb b{display:block;font-weight:400;font-size:14.5px;color:var(--navy);line-height:1.35}.trb small{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted)}.trb small i{width:9px;height:9px;border-radius:50%}
.trd{display:block;font-size:13px;margin-top:2px}.trd em{font-style:normal;font-family:var(--display);font-size:15px;color:var(--navy);margin-left:4px}.trc.soon .trd em{color:#8A6400}.trc.late .trd em{color:var(--red)}
.tra{grid-column:1/-1;display:flex;gap:6px}.tra button{flex:1;min-height:38px;font-size:13px}
.trdone{margin-top:8px;font-size:13px}.trdone summary{cursor:pointer;color:var(--muted)}.trline{display:flex;justify-content:space-between;gap:8px;width:100%;border:0;border-bottom:1px dashed var(--line);background:none;padding:8px 2px;text-align:left;color:var(--ink)}.trline small{color:var(--muted);white-space:nowrap}
.trx{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);margin-left:6px}.trx input{appearance:auto;width:18px;height:18px}
.tview .tvb{display:inline-block;margin-left:3px;padding:0 5px;border-radius:99px;background:var(--red);color:#fff;font-size:10px;line-height:16px;vertical-align:top}
`;
document.head.appendChild(css);
window.TOY = { render: render_, load, badge };
})();
