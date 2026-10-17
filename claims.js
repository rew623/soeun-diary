// 서류함 (보험 청구용): 약봉지·처방전·영수증·진료확인서·세부내역서·검진 결과·접종 확인 사진을 모아 두고, 증상·진료·접종·검진 편집창에서도 바로 붙여요.
// 저장: doc 컬렉션 (docs/data.md) — 문서 하나에 사진 한 장. link = 'log:<id>' · 'visit:<id>' · 'vac:<id>' · 'chk:<id>' (어디에 붙었는지, 없으면 '')
// 편집창에 붙이는 법: CLAIM.field(link, 기본종류, 날짜) 를 편집창 HTML에 넣고, 저장이 끝나면 await CLAIM.flush('log:' + id)
(() => {
const KINDS = [['약봉지', '💊'], ['처방전', '📄'], ['영수증', '🧾'], ['진료확인서', '📋'], ['세부내역서', '🗒️'], ['검진결과', '🩺'], ['접종확인', '💉'], ['증상사진', '📷'], ['기타', '📎']];
const STATES = ['미청구', '청구함', '지급완료'], SCOL = { 미청구: '#B3261E', 청구함: '#B36A00', 지급완료: '#2E7D5B' };
const canWrite = () => !(S.me && S.me.viewer);
const kIcon = k => (KINDS.find(x => x[0] === k) || KINDS[8])[1];
const won = n => (+n || 0).toLocaleString('ko-KR') + '원';
const num = v => { const n = parseInt(String(v || '').replace(/[^0-9]/g, ''), 10); return isFinite(n) ? n : 0; };
const docs = () => (S.docs || []).slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1));
let CL = { stage: [], kind: '기타', link: '', date: '' };   // 편집창에서 고른(아직 저장 전) 사진
const V = { kind: '', st: '', sel: new Set() };            // 서류함 화면 상태 (거름망·고른 것)

// ---------- 어디에 붙었는지 글자로 ----------
function linkLabel(l) {
  const [t, id] = String(l || '').split(':'); if (!id) return '';
  if (t === 'log') { const x = (S.logs || []).find(y => y.id === id); return x ? `${({ temp: '체온', med: '투약', sym: '증상' })[x.kind] || '기록'} ${x.value || ''}` : ''; }
  if (t === 'visit') { const x = (S.visits || []).find(y => y.id === id); return x ? `진료 ${x.hospital || ''}` : ''; }
  if (t === 'vac') { const x = (S.vaccines || []).find(y => y.id === id); return x ? `접종 ${x.name}` : ''; }
  if (t === 'chk') return '영유아검진';
  return '';
}

// ---------- 편집창 안: 서류·사진 붙이기 ----------
const stageHtml = () => CL.stage.map((s, i) => `<span class="clth"><img src="${s.photo}" alt=""><i>${esc(s.kind)}</i><button type="button" data-cl="rm" data-i="${i}" aria-label="빼기">✕</button></span>`).join('');
function field(link, defKind, date) {
  CL = { stage: [], kind: defKind || '기타', link: link || '', date: date || today() };
  const have = (S.docs || []).filter(d => link && d.link === link);
  return `<div class="field clbox"><span>📎 서류·사진 <small>(보험 청구용으로 서류함에 모여요)</small></span>
    ${have.length ? `<div class="clths">${have.map(d => `<button type="button" class="clth" data-cl="show" data-id="${esc(d.id)}">${safeImg(PHOTOS[d.id]) ? `<img src="${safeImg(PHOTOS[d.id])}" alt="">` : '<b>🖼</b>'}<i>${esc(d.kind)}</i></button>`).join('')}</div>` : ''}
    <div class="clths" id="cl-stage">${stageHtml()}</div>
    ${canWrite() ? `<div class="quick cl-kinds">${KINDS.map(([k, i]) => `<button type="button" data-cl="kind" data-v="${k}" class="${k === CL.kind ? 'on' : ''}">${i} ${k}</button>`).join('')}</div>
    <button type="button" class="ghost cladd" data-cl="pick">＋ 사진 추가 <small>(종류 고르고 눌러요 · 여러 장 가능)</small></button>` : ''}</div>`;
}
// 저장이 끝난 뒤: 고른 사진을 서류함에 올려요 (extra: 서류 칸 공통 값)
async function flush(link, extra) {
  const L = CL.stage.slice(); if (!L.length) return 0; CL.stage = []; let n = 0;
  for (const s of L) {
    toast(`서류 올리는 중 ${n + 1}/${L.length}`);
    const o = Object.assign({ kind: s.kind, date: CL.date || today(), title: '', link: link || CL.link || '', amount: '', claim: '미청구', memo: '', photo: s.photo, by: myRole() }, extra || {}, { kind: s.kind, photo: s.photo });
    const res = await write('saveItem', 'doc', o); if (!res) break; PHOTOS[res.id] = s.photo; n++;
  }
  if (n) { toast(`📎 서류 ${n}장을 서류함에 넣었어요`); if (S.view === 'claims') render(); }
  return n;
}
const picker = document.createElement('input');
picker.type = 'file'; picker.accept = 'image/*,application/octet-stream'; picker.multiple = true; picker.hidden = true; document.body.appendChild(picker);
picker.addEventListener('change', async () => {
  const fs = [...picker.files].filter(f => /^image\//.test(f.type)); picker.value = ''; if (!fs.length) return;
  for (const f of fs) { try { CL.stage.push({ kind: CL.kind, photo: await readPhoto(f, true) }); } catch (e) { toast('사진을 읽지 못했어요. 다른 사진으로 해 주세요'); } }
  const st = document.getElementById('cl-stage'); if (st) st.innerHTML = stageHtml();
  if (window.__app && __app.sheetDirty) __app.sheetDirty();
});

// ---------- 크게 보기 ----------
const lb = document.createElement('div'); lb.id = 'cl-lb'; lb.hidden = true; lb.innerHTML = '<img alt=""><p></p><button type="button" aria-label="닫기">✕</button>'; document.body.appendChild(lb);
lb.addEventListener('click', () => { lb.hidden = true; });
function show(id) {
  const d = (S.docs || []).find(x => x.id === id), u = safeImg(PHOTOS[id]); if (!d) return;
  if (!u) { toast('사진을 불러오는 중이에요'); return; }
  lb.querySelector('img').src = u; lb.querySelector('p').textContent = `${d.kind} · ${fmtK(d.date, true)}${+d.amount ? ' · ' + won(d.amount) : ''}`; lb.hidden = false;
}

// ---------- 서류 하나 고치기 ----------
function openEdit(id) {
  const d = (S.docs || []).find(x => x.id === id); if (!d) return; const cw = canWrite();
  openSheet(`<h3>${kIcon(d.kind)} ${esc(d.kind)} ${cw ? '고치기' : ''}</h3>
    ${safeImg(PHOTOS[id]) ? `<button type="button" class="cledimg" data-cl="show" data-id="${esc(id)}"><img src="${safeImg(PHOTOS[id])}" alt=""><small>눌러서 크게 보기</small></button>` : ''}
    ${linkLabel(d.link) ? `<p class="hint" style="margin:0 0 10px">📌 ${esc(linkLabel(d.link))}에 붙은 서류</p>` : ''}
    <div class="field"><span>종류</span><div class="quick" id="cl-k">${KINDS.map(([k, i]) => `<button type="button" data-act="pick1" data-v="${k}" class="${k === d.kind ? 'on' : ''}">${i} ${k}</button>`).join('')}</div></div>
    <div class="row3" style="grid-template-columns:1fr 1fr"><label class="field"><span>날짜</span><input id="cl-date" type="date" value="${d.date}"></label><label class="field"><span>금액 (원, 선택)</span><input id="cl-amt" inputmode="numeric" maxlength="10" value="${+d.amount || ''}" placeholder="예: 12500"></label></div>
    <div class="field"><span>청구 상태</span><div class="quick" id="cl-s">${STATES.map(s => `<button type="button" data-act="pick1" data-v="${s}" class="${s === (d.claim || '미청구') ? 'on' : ''}">${s}</button>`).join('')}</div></div>
    <label class="field"><span>메모 (선택)</span><input id="cl-memo" maxlength="100" value="${esc(d.memo || '')}" placeholder="예: 실손보험 청구 번호 12345"></label>
    <p class="err" id="cl-err"></p>
    <div class="actions">${cw ? `<button class="danger" data-cl="del" data-id="${esc(id)}">삭제</button>` : ''}<button class="secondary" data-act="close">닫기</button>${cw ? `<button class="primary" data-cl="save" data-id="${esc(id)}">저장</button>` : ''}</div>`);
}
// 서류함에서 바로 올리기 (어디에도 안 붙임)
function openAdd() {
  if (!canWrite()) return;
  openSheet(`<h3>🧾 서류 올리기</h3>${field('', '영수증', today())}
    <div class="row3" style="grid-template-columns:1fr 1fr"><label class="field"><span>날짜</span><input id="cl-date" type="date" value="${today()}" max="${today()}"></label><label class="field"><span>금액 (원, 선택)</span><input id="cl-amt" inputmode="numeric" maxlength="10" placeholder="예: 12500"></label></div>
    <label class="field"><span>메모 (선택)</span><input id="cl-memo" maxlength="100" placeholder="예: 소아과 감기 진료"></label>
    <p class="err" id="cl-err"></p>
    <div class="actions"><button class="secondary" data-act="close">취소</button><button class="primary" data-cl="addsave">올리기</button></div>`);
}

// ---------- 서류함 화면 ----------
function listOf() { return docs().filter(d => (!V.kind || d.kind === V.kind) && (!V.st || (d.claim || '미청구') === V.st)); }
function view() {
  const all = docs(), L = listOf(), cw = canWrite(), sum = L.reduce((a, d) => a + (+d.amount || 0), 0);
  const cnt = s => all.filter(d => (d.claim || '미청구') === s).length;
  const chips = (arr, cur, key) => `<div class="quick clf">${[['', '전체']].concat(arr.map(x => [x, x])).map(([v, l]) => `<button data-cl="${key}" data-v="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const row = d => { const u = safeImg(PHOTOS[d.id]), on = V.sel.has(d.id), st = d.claim || '미청구';
    return `<div class="clrow${on ? ' on' : ''}"><button class="clck${on ? ' on' : ''}" data-cl="sel" data-id="${esc(d.id)}" aria-pressed="${on}" aria-label="고르기"><i>✓</i></button><button class="clph" data-cl="show" data-id="${esc(d.id)}">${u ? `<img src="${u}" alt="" loading="lazy" decoding="async">` : '<span>🖼</span>'}</button>
      <button class="clmain" data-cl="edit" data-id="${esc(d.id)}"><b>${kIcon(d.kind)} ${esc(d.kind)}${+d.amount ? ` <u>${won(d.amount)}</u>` : ''}</b><small>${fmtK(d.date, true)}${linkLabel(d.link) ? ' · ' + esc(linkLabel(d.link)) : ''}${d.memo ? ' · ' + esc(d.memo) : ''}</small></button><em style="--c:${SCOL[st]}">${st}</em></div>`; };
  const n = V.sel.size;
  return `<header class="vhead"><span class="no">사건 파일 No.${typeof fileNo === 'function' ? fileNo() : ''}</span><h1>🧾 서류함</h1><p>약봉지·처방전·영수증·진료확인서·세부내역서를 모아 두고, 보험 청구할 때 골라서 한꺼번에 보내요.</p></header>
  <section class="clsum"><div><b>${all.length}</b><small>전체</small></div><div><b style="color:${SCOL.미청구}">${cnt('미청구')}</b><small>미청구</small></div><div><b style="color:${SCOL.청구함}">${cnt('청구함')}</b><small>청구함</small></div><div><b style="color:${SCOL.지급완료}">${cnt('지급완료')}</b><small>지급완료</small></div></section>
  ${cw ? '<button class="solve" data-cl="add" style="width:100%;min-height:50px;margin-bottom:10px">＋ 서류 올리기 (사진 여러 장 가능)</button>' : ''}
  <section><h2 class="sh"><span>종류</span><span>${L.length}건${sum ? ` · ${won(sum)}` : ''}</span></h2>${chips(KINDS.map(x => x[0]), V.kind, 'fk')}${chips(STATES, V.st, 'fs')}
  <div class="cllist">${L.map(row).join('') || '<p class="vempty">아직 서류가 없어요. 위 단추나 증상·진료·접종 편집창의 📎에서 올려요.</p>'}</div></section>
  <div class="clbar"${n ? '' : ' hidden'}><b>${n}장 골랐어요</b><button data-cl="share">📤 공유·저장</button>${cw ? '<button data-cl="mk" data-v="청구함">청구함으로</button><button data-cl="mk" data-v="지급완료">지급완료로</button>' : ''}<button data-cl="none" aria-label="고르기 풀기">✕</button></div>`;
}
// 고른 서류 사진을 한꺼번에 공유(카톡·메일·보험사 앱)하거나 저장
async function blobOf(d) {
  const u = safeImg(PHOTOS[d.id]); if (!u) throw new Error('사진을 아직 못 받았어요');
  if (u.startsWith('data:')) return (await fetch(u)).blob();
  return window.__photoBlob ? window.__photoBlob(u) : (await fetch(u)).blob();
}
async function share() {
  const items = docs().filter(d => V.sel.has(d.id)); if (!items.length) return;
  toast('사진 모으는 중…');
  try {
    const files = []; let i = 0;
    for (const d of items) { const b = await blobOf(d); files.push(new File([b], `${d.kind}_${d.date}_${++i}.jpg`, { type: b.type || 'image/jpeg' })); }
    if (navigator.canShare && navigator.canShare({ files })) { try { await navigator.share({ files, title: '소은이 서류' }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    files.forEach(f => CV.save(f, f.name)); toast(`${files.length}장을 저장했어요 (다운로드·파일 앱)`);
  } catch (e) { toast(e.message || '공유하지 못했어요'); }
}
async function markSel(st) {
  const items = docs().filter(d => V.sel.has(d.id) && (d.claim || '미청구') !== st); if (!items.length) { toast('이미 그 상태예요'); return; }
  if (!(await ask(`${items.length}장을 '${st}'로 바꿀까요?`, { ok: '바꾸기' }))) return;
  let n = 0; for (const d of items) { if (await write('saveItem', 'doc', { id: d.id, kind: d.kind, date: d.date, title: d.title || '', link: d.link || '', amount: d.amount || '', claim: st, memo: d.memo || '', by: d.by || myRole() })) n++; else break; }
  V.sel.clear(); toast(`${n}장을 '${st}'로 바꿨어요`); render();
}
const entryHtml = () => { const L = S.docs || [], m = L.filter(d => !d.claim || d.claim === '미청구').length; return `<button class="solve clentry" data-cl="open" style="width:100%;min-height:50px;margin:6px 0 12px">🧾 서류함 · 보험 청구용 <small>${L.length ? `${L.length}장 · 미청구 ${m}` : '약봉지·영수증 등 모아 두기'}</small></button>`; };

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-cl]'); if (!b) return; const a = b.dataset.cl, v = b.dataset.v, id = b.dataset.id;
  if (a === 'pick') { picker.click(); return; }
  if (a === 'kind') { CL.kind = v; document.querySelectorAll('.cl-kinds button').forEach(x => x.classList.toggle('on', x.dataset.v === v)); return; }
  if (a === 'rm') { CL.stage.splice(+b.dataset.i, 1); const s1 = document.getElementById('cl-stage'); if (s1) s1.innerHTML = stageHtml(); return; }
  if (a === 'show') { show(id); return; }
  if (a === 'open') { S.view = 'claims'; render(); window.scrollTo(0, 0); return; }
  if (a === 'add') { openAdd(); return; }
  if (a === 'edit') { openEdit(id); return; }
  if (a === 'fk') { V.kind = v; render(); return; }
  if (a === 'fs') { V.st = v; render(); return; }
  if (a === 'sel') { V.sel.has(id) ? V.sel.delete(id) : V.sel.add(id); render(); return; }
  if (a === 'none') { V.sel.clear(); render(); return; }
  if (a === 'share') { share(); return; }
  if (a === 'mk') { markSel(v); return; }
  if (a === 'save') {
    const d = (S.docs || []).find(x => x.id === id); if (!d) return; const k = document.querySelector('#cl-k .on'), s = document.querySelector('#cl-s .on'), dt = (document.getElementById('cl-date') || {}).value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dt || '')) { document.getElementById('cl-err').textContent = '날짜를 확인해 주세요'; return; }
    const amt = num((document.getElementById('cl-amt') || {}).value);
    if (await write('saveItem', 'doc', { id, kind: k ? k.dataset.v : d.kind, date: dt, title: d.title || '', link: d.link || '', amount: amt ? String(amt) : '', claim: s ? s.dataset.v : '미청구', memo: ((document.getElementById('cl-memo') || {}).value || '').trim(), by: d.by || myRole() })) { closeSheet(); toast('서류를 고쳤어요'); }
    return;
  }
  if (a === 'del') { if (await ask('이 서류 사진을 지울까요?', { ok: '지우기', danger: true }) && await write('deleteItem', 'doc', id)) { delete PHOTOS[id]; V.sel.delete(id); closeSheet(); toast('서류를 지웠어요'); } return; }
  if (a === 'addsave') {
    if (!CL.stage.length) { document.getElementById('cl-err').textContent = '사진을 한 장 이상 골라 주세요'; return; }
    const dt = (document.getElementById('cl-date') || {}).value || today(), amt = num((document.getElementById('cl-amt') || {}).value), memo = ((document.getElementById('cl-memo') || {}).value || '').trim();
    CL.date = dt; closeSheet(); await flush('', { date: dt, amount: amt && CL.stage.length === 1 ? String(amt) : '', memo }); return;   // 금액은 사진 한 장일 때만 (여러 장이면 나눌 수 없어요)
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) lb.hidden = true; });

const css = document.createElement('style');
css.textContent = `
.clbox .clths{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}.clbox .cl-kinds{margin:8px 0 6px}.clbox .cl-kinds button{min-height:38px;font-size:13px;padding:0 10px}
.clth{position:relative;width:72px;height:72px;border-radius:12px;border:1.5px solid var(--line);background:var(--card2);padding:0;overflow:hidden;display:grid;place-items:center}.clth img{width:100%;height:100%;object-fit:cover;display:block}
.clth i{position:absolute;left:0;right:0;bottom:0;background:rgba(31,42,68,.72);color:#fff;font-style:normal;font-size:10.5px;text-align:center;padding:1px 0}
.clth button{position:absolute;top:2px;right:2px;width:22px;height:22px;border-radius:50%;border:0;background:var(--red);color:#fff;font-size:11px;padding:0}
.cladd{width:100%;min-height:44px;margin-top:4px}.cladd small{color:var(--muted)}
.cledimg{display:block;width:100%;border:0;background:none;padding:0;margin:0 0 10px}.cledimg img{width:100%;max-height:34vh;object-fit:contain;border-radius:14px;background:var(--card2);border:3px solid #FFFDF7;box-shadow:0 3px 10px rgba(43,38,34,.2)}.cledimg small{display:block;font-size:11.5px;color:var(--muted);margin-top:4px}
#cl-lb{position:fixed;inset:0;z-index:85;background:rgba(15,20,35,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px}#cl-lb[hidden]{display:none}
#cl-lb img{max-width:100%;max-height:82vh;object-fit:contain;border-radius:10px}#cl-lb p{color:#fff;font-size:14px;margin:0}#cl-lb button{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:14px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.2);color:#fff;font-size:18px}
.clsum{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0 12px}.clsum div{background:#FFFDF7;border:1.5px solid var(--line);border-radius:14px;text-align:center;padding:8px 2px}.clsum b{display:block;font-family:var(--display);font-weight:400;font-size:22px;color:var(--navy)}.clsum small{font-size:11.5px;color:var(--muted)}
.clf{margin:0 0 8px;flex-wrap:wrap}.clf button{min-height:34px;font-size:12.5px;padding:0 11px}
.cllist{display:flex;flex-direction:column;gap:8px;margin-top:6px}
.clrow{display:flex;align-items:center;gap:8px;background:#FFFDF7;border:1.5px solid var(--line);border-radius:14px;padding:6px 8px 6px 6px}.clrow.on{border-color:var(--red);background:#FFF3EF}
.clck{flex:0 0 28px;height:28px;border-radius:50%;border:2px solid var(--line);background:#fff;padding:0;display:grid;place-items:center}.clck i{font-style:normal;color:#fff;font-size:15px;opacity:0}.clck.on{background:var(--red);border-color:var(--red)}.clck.on i{opacity:1}
.clph{flex:0 0 56px;height:56px;border-radius:10px;border:0;background:var(--card2);padding:0;overflow:hidden;display:grid;place-items:center}.clph img{width:100%;height:100%;object-fit:cover;display:block}
.clmain{flex:1;min-width:0;text-align:left;border:0;background:none;padding:0}.clmain b{display:block;font-family:var(--display);font-weight:400;font-size:15.5px;color:var(--navy)}.clmain b u{text-decoration:none;color:var(--red);margin-left:4px;font-size:14.5px}.clmain small{display:block;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.clrow em{font-style:normal;font-size:11.5px;color:var(--c);border:1.5px solid var(--c);border-radius:99px;padding:1px 8px;white-space:nowrap}
.clbar{position:sticky;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:3;display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px;background:var(--navy);color:#fff;border-radius:16px;padding:8px 8px 8px 14px;box-shadow:0 6px 16px rgba(31,42,68,.3)}.clbar[hidden]{display:none}
.clbar b{flex:1 1 100%;font-family:var(--display);font-weight:400;font-size:15px}.clbar button{flex:1 1 auto;min-height:38px;border-radius:99px;border:0;background:var(--red);color:#fff;font-size:13px;padding:0 12px;white-space:nowrap}.clbar button[data-cl=none]{flex:0 0 auto;background:none;border:1.5px solid rgba(255,255,255,.45)}
.clentry small{display:block;font-size:12px;opacity:.85;font-family:var(--body)}
`;
document.head.appendChild(css);
window.CLAIM = { field, flush, render: view, openEdit, entryHtml, show, KINDS };
})();
