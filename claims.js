// 서류함 (보험 청구용): 하루 병원·약국을 다녀온 일을 '한 건'으로 묶어, 약봉지·처방전·영수증·진료확인서·세부내역서 사진을 여러 장 + 병원비·약값을 같이 적어 둬요.
// 저장: doc 컬렉션 (docs/data.md) — '건'의 머리 문서(grp '': 종류·날짜·병원비·약값·청구 상태·메모, 사진 없음)와 사진 문서(grp=머리 id, 사진 한 장)로 나뉘어요.
//   (처음 버전에서 올린 사진 하나짜리 문서는 grp ''에 사진이 붙은 채라 그대로 한 건으로 보여요)
// 편집창에 붙이는 법: CLAIM.field(link, 기본종류, 날짜) 를 편집창 HTML에 넣고, 저장이 끝나면 await CLAIM.flush('log:' + id)
(() => {
const KINDS = [['약봉지', '💊'], ['처방전', '📄'], ['영수증', '🧾'], ['진료확인서', '📋'], ['세부내역서', '🗒️'], ['검진결과', '🩺'], ['접종확인', '💉'], ['증상사진', '📷'], ['기타', '📎']];
const STATES = ['미청구', '청구함', '지급완료'], SCOL = { 미청구: '#B3261E', 청구함: '#B36A00', 지급완료: '#2E7D5B' };
const canWrite = () => !(S.me && S.me.viewer);
const won = n => (+n || 0).toLocaleString('ko-KR') + '원';
const num = v => { const n = parseInt(String(v || '').replace(/[^0-9]/g, ''), 10); return isFinite(n) ? n : 0; };
const kindsOf = d => String(d.kind || '').split(',').filter(Boolean);
const icons = d => kindsOf(d).map(k => (KINDS.find(x => x[0] === k) || KINDS[8])[1]).join('');
const total = d => (+d.hosp || 0) + (+d.drug || 0) || (+d.amount || 0);
const heads = () => (S.docs || []).filter(d => !d.grp).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1));
const photosOf = h => (h.photo ? [h] : []).concat((S.docs || []).filter(d => d.grp === h.id));
let CL = { stage: [], kinds: new Set(), link: '', date: '', head: '', hosp: '', drug: '' };   // 편집창에서 고른(아직 저장 전) 사진·종류·금액
const V = { kind: '', st: '', sel: new Set() };                                                  // 서류함 화면 상태 (거름망·고른 것)
// 저장 API는 보낸 칸만 덮어쓰는 게 아니라 모든 칸을 다시 쓰므로(빠진 칸은 비움) 바꿀 때는 늘 머리 문서의 칸을 다 실어 보내요
const full = (d, o) => Object.assign({ id: d.id, kind: d.kind || '', date: d.date, title: d.title || '', link: d.link || '', amount: d.amount || '', hosp: d.hosp || '', drug: d.drug || '', claim: d.claim || '미청구', memo: d.memo || '', grp: d.grp || '', by: d.by || myRole() }, o);
const kindStr = () => KINDS.map(x => x[0]).filter(k => CL.kinds.has(k)).join(',') || '기타';

// ---------- 어디에 붙었는지 글자로 ----------
function linkLabel(l) {
  const [t, id] = String(l || '').split(':'); if (!id) return '';
  if (t === 'log') { const x = (S.logs || []).find(y => y.id === id); return x ? `${({ temp: '체온', med: '투약', sym: '증상' })[x.kind] || '기록'} ${x.value || ''}` : ''; }
  if (t === 'visit') { const x = (S.visits || []).find(y => y.id === id); return x ? `진료 ${x.hospital || ''}` : ''; }
  if (t === 'vac') { const x = (S.vaccines || []).find(y => y.id === id); return x ? `접종 ${x.name}` : ''; }
  if (t === 'per') { const x = (S.periods || []).find(y => y.id === id); return x ? `접종 ${x.name}` : ''; }
  if (t === 'chk') return '영유아검진';
  return '';
}

// ---------- 편집창 안 ----------
const thumb = d => `<button type="button" class="clth" data-cl="show" data-id="${esc(d.id)}">${safeImg(PHOTOS[d.id]) ? `<img src="${safeImg(PHOTOS[d.id])}" alt="" loading="lazy">` : '<b>🖼</b>'}</button>`;
const stageHtml = () => CL.stage.map((s, i) => `<span class="clth"><img src="${s.photo}" alt=""><button type="button" data-cl="rm" data-i="${i}" aria-label="빼기">✕</button></span>`).join('');
const kindChips = () => `<div class="quick cl-kinds">${KINDS.map(([k, i]) => `<button type="button" data-cl="kind" data-v="${k}" class="${CL.kinds.has(k) ? 'on' : ''}">${i} ${k}</button>`).join('')}</div>`;
const sumTxt = () => { const t = num(CL.hosp) + num(CL.drug); return t ? `합계 ${won(t)}` : '금액은 나중에 서류함에서도 적을 수 있어요'; };
const amtHtml = () => `<div class="clamt"><label><span>🏥 병원비</span><div class="unitwrap"><input id="cl-hosp" inputmode="numeric" maxlength="9" value="${num(CL.hosp) || ''}" placeholder="0"><em>원</em></div></label><label><span>💊 약값</span><div class="unitwrap"><input id="cl-drug" inputmode="numeric" maxlength="9" value="${num(CL.drug) || ''}" placeholder="0"><em>원</em></div></label></div><p class="hint" id="cl-sum" style="margin:4px 0 0">${sumTxt()}</p>`;
function field(link, defKind, date) {
  const ex = link ? heads().find(h => h.link === link) : null;
  CL = { stage: [], kinds: new Set(ex ? kindsOf(ex).concat(defKind || []) : [defKind || '기타']), link: link || '', date: ex ? ex.date : (date || today()), head: ex ? ex.id : '', hosp: ex ? String(+ex.hosp || '') : '', drug: ex ? String(+ex.drug || '') : '' };
  const have = ex ? photosOf(ex) : [], cw = canWrite();
  return `<div class="field clbox"><span>📎 서류·사진 <small>(보험 청구용 · 종류는 여러 개 골라도 돼요)</small></span>
    ${have.length ? `<div class="clths">${have.map(thumb).join('')}</div>` : ''}<div class="clths" id="cl-stage">${stageHtml()}</div>
    ${cw ? `${kindChips()}<button type="button" class="ghost cladd" data-cl="pick">＋ 사진 추가 <small>(여러 장 가능)</small></button>${amtHtml()}` : ''}</div>`;
}
// 저장이 끝난 뒤: 사진·금액을 서류함의 '건'에 넣어요 (extra: 날짜·메모 같은 공통 값, 이미 있는 건이면 거기에 더해요)
async function flush(link, extra) {
  const L = CL.stage.slice(), hosp = num(CL.hosp), drug = num(CL.drug); if (!L.length && !hosp && !drug) return 0;
  CL.stage = []; extra = extra || {};
  const ex = CL.head ? (S.docs || []).find(d => d.id === CL.head) : null, lk = link || CL.link || '';
  const meta = { id: ex ? ex.id : undefined, kind: kindStr(), date: extra.date || (ex ? ex.date : CL.date || today()), title: ex ? ex.title || '' : '', link: ex ? ex.link || '' : lk,
    amount: String(hosp + drug || ''), hosp: String(hosp || ''), drug: String(drug || ''), claim: extra.claim || (ex && ex.claim) || '미청구', memo: extra.memo != null ? extra.memo : (ex ? ex.memo || '' : ''), grp: '', by: ex ? ex.by || myRole() : myRole() };
  toast('서류 저장 중…'); const h = await write('saveItem', 'doc', meta); if (!h) return 0;
  let n = 0;
  for (const s of L) {
    toast(`사진 올리는 중 ${n + 1}/${L.length}`);
    const r = await write('saveItem', 'doc', { kind: '', date: meta.date, title: '', link: lk, amount: '', hosp: '', drug: '', claim: meta.claim, memo: '', grp: h.id, photo: s.photo, by: myRole() });
    if (!r) break; PHOTOS[r.id] = s.photo; n++;
  }
  toast(`📎 서류함에 넣었어요${n ? ` (사진 ${n}장)` : ''}${hosp + drug ? ` · ${won(hosp + drug)}` : ''}`); if (S.view === 'claims') render();
  return n || 1;
}
const picker = document.createElement('input');
picker.type = 'file'; picker.accept = 'image/*'; picker.multiple = true;   // 서류 사진은 위치가 필요 없어서 'image/*'만 → 안드로이드 사진 선택 창(여러 장을 눌러서 한 번에 고르기). octet-stream을 붙이면 파일 창이 열려 한 장씩만 골라져요(2026.10.18)
 picker.hidden = true; document.body.appendChild(picker);
picker.addEventListener('change', async () => {
  const fs = [...picker.files].filter(f => /^image\//.test(f.type)); picker.value = ''; if (!fs.length) return;
  for (const f of fs) { try { CL.stage.push({ photo: await readPhoto(f, true) }); } catch (e) { toast('사진을 읽지 못했어요. 다른 사진으로 해 주세요'); } }
  const st = document.getElementById('cl-stage'); if (st) st.innerHTML = stageHtml();
  if (window.__app && __app.sheetDirty) __app.sheetDirty();
});
document.addEventListener('input', e => {
  const id = e.target && e.target.id; if (id !== 'cl-hosp' && id !== 'cl-drug') return;
  CL[id === 'cl-hosp' ? 'hosp' : 'drug'] = e.target.value; const s = document.getElementById('cl-sum'); if (s) s.textContent = sumTxt();
});

// ---------- 크게 보기 ----------
const lb = document.createElement('div'); lb.id = 'cl-lb'; lb.hidden = true; lb.innerHTML = '<img alt=""><p></p><button type="button" aria-label="닫기">✕</button>'; document.body.appendChild(lb);
lb.addEventListener('click', () => { lb.hidden = true; });
function show(id) {
  const d = (S.docs || []).find(x => x.id === id), u = safeImg(PHOTOS[id]); if (!d) return;
  if (!u) { toast('사진을 불러오는 중이에요'); return; }
  const h = d.grp ? (S.docs || []).find(x => x.id === d.grp) || d : d;
  lb.querySelector('img').src = u; lb.querySelector('p').textContent = `${kindsOf(h).join('·')} · ${fmtK(h.date, true)}${total(h) ? ' · ' + won(total(h)) : ''}`; lb.hidden = false;
}

// ---------- 한 건 고치기 ----------
function openEdit(id) {
  const d = (S.docs || []).find(x => x.id === id); if (!d) return; const cw = canWrite(), ph = photosOf(d);
  CL = { stage: [], kinds: new Set(kindsOf(d)), link: d.link || '', date: d.date, head: d.id, hosp: String(+d.hosp || ''), drug: String(+d.drug || (+d.hosp ? 0 : +d.amount) || '') };   // 처음 버전(금액 하나)은 약값 칸에 두지 않고 병원비로 보여요
  if (!+d.hosp && !+d.drug && +d.amount) CL.hosp = String(+d.amount);
  openSheet(`<h3>${icons(d)} 서류 ${cw ? '고치기' : '보기'}</h3>
    ${linkLabel(d.link) ? `<p class="hint" style="margin:0 0 8px">📌 ${esc(linkLabel(d.link))}에 붙은 서류</p>` : ''}
    <div class="clths">${ph.map(p => `<span class="clthw">${thumb(p)}${cw ? `<button type="button" class="clx" data-cl="rmp" data-id="${esc(p.id)}" aria-label="사진 빼기">✕</button>` : ''}</span>`).join('') || '<small style="color:var(--muted)">사진이 아직 없어요</small>'}<span class="clths" id="cl-stage" style="margin:0">${stageHtml()}</span></div>
    ${cw ? `<button type="button" class="ghost cladd" data-cl="pick" style="margin-bottom:8px">＋ 사진 더하기</button>` : ''}
    <div class="field"><span>종류 <small>(여러 개 골라도 돼요)</small></span>${kindChips()}</div>
    <label class="field"><span>날짜</span><input id="cl-date" type="date" value="${d.date}"></label>
    <div class="field"><span>금액</span>${amtHtml()}</div>
    <div class="field"><span>청구 상태</span><div class="quick" id="cl-s">${STATES.map(s => `<button type="button" data-act="pick1" data-v="${s}" class="${s === (d.claim || '미청구') ? 'on' : ''}">${s}</button>`).join('')}</div></div>
    <label class="field"><span>메모 (선택)</span><input id="cl-memo" maxlength="100" value="${esc(d.memo || '')}" placeholder="예: 실손보험 청구 번호 12345"></label>
    <p class="err" id="cl-err"></p>
    <div class="actions">${cw ? `<button class="danger" data-cl="del" data-id="${esc(id)}">삭제</button>` : ''}<button class="secondary" data-act="close">닫기</button>${cw ? `<button class="primary" data-cl="save" data-id="${esc(id)}">저장</button>` : ''}</div>`);
}
// 서류함에서 바로 올리기 (어디에도 안 붙임)
function openAdd() {
  if (!canWrite()) return;
  openSheet(`<h3>🧾 서류 올리기 <small style="font-size:13px;color:var(--muted)">병원·약국 한 건</small></h3>
    <label class="field"><span>날짜</span><input id="cl-date" type="date" value="${today()}" max="${today()}"></label>
    ${field('', '영수증', today())}
    <label class="field"><span>메모 (선택)</span><input id="cl-memo" maxlength="100" placeholder="예: 소아과 감기 진료 + 약국"></label>
    <p class="err" id="cl-err"></p>
    <div class="actions"><button class="secondary" data-act="close">취소</button><button class="primary" data-cl="addsave">올리기</button></div>`);
}

// ---------- 서류함 화면 ----------
function listOf() { return heads().filter(d => (!V.kind || kindsOf(d).includes(V.kind)) && (!V.st || (d.claim || '미청구') === V.st)); }
function view() {
  const all = heads(), L = listOf(), cw = canWrite(), sum = L.reduce((a, d) => a + total(d), 0);
  const cnt = s => all.filter(d => (d.claim || '미청구') === s).length;
  const chips = (arr, cur, key) => `<div class="quick clf">${[['', '전체']].concat(arr.map(x => [x, x])).map(([v, l]) => `<button data-cl="${key}" data-v="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const row = d => { const ph = photosOf(d), on = V.sel.has(d.id), st = d.claim || '미청구', t = total(d);
    const amt = t ? `${+d.hosp ? `🏥 ${won(d.hosp)}` : ''}${+d.hosp && +d.drug ? ' · ' : ''}${+d.drug ? `💊 ${won(d.drug)}` : ''}${+d.hosp && +d.drug ? ` · 합계 ${won(t)}` : (!+d.hosp && !+d.drug ? won(t) : '')}` : '';
    return `<div class="clrow${on ? ' on' : ''}"><button class="clck${on ? ' on' : ''}" data-cl="sel" data-id="${esc(d.id)}" aria-pressed="${on}" aria-label="고르기"><i>✓</i></button>
      <div class="clphs">${ph.slice(0, 3).map(p => `<button class="clph" data-cl="show" data-id="${esc(p.id)}">${safeImg(PHOTOS[p.id]) ? `<img src="${safeImg(PHOTOS[p.id])}" alt="" loading="lazy" decoding="async">` : '<span>🖼</span>'}</button>`).join('') || '<span class="clph"><span>📝</span></span>'}${ph.length > 3 ? `<i class="clmore">+${ph.length - 3}</i>` : ''}</div>
      <button class="clmain" data-cl="edit" data-id="${esc(d.id)}"><b>${icons(d)} ${esc(kindsOf(d).join('·') || '서류')}</b><small>${fmtK(d.date, true)}${linkLabel(d.link) ? ' · ' + esc(linkLabel(d.link)) : ''}</small>${amt ? `<small class="cla">${amt}</small>` : ''}${d.memo ? `<small>${esc(d.memo)}</small>` : ''}</button><em style="--c:${SCOL[st]}">${st}</em></div>`; };
  const n = V.sel.size;
  return `<header class="vhead"><span class="no">사건 파일 No.${typeof fileNo === 'function' ? fileNo() : ''}</span><h1>🧾 서류함</h1><p>병원·약국을 다녀온 일을 한 건으로 묶어, 사진과 병원비·약값을 같이 모아 두고 보험 청구할 때 한꺼번에 보내요.</p></header>
  <section class="clsum"><div><b>${all.length}</b><small>전체</small></div><div><b style="color:${SCOL.미청구}">${cnt('미청구')}</b><small>미청구</small></div><div><b style="color:${SCOL.청구함}">${cnt('청구함')}</b><small>청구함</small></div><div><b style="color:${SCOL.지급완료}">${cnt('지급완료')}</b><small>지급완료</small></div></section>
  ${cw ? '<button class="solve" data-cl="add" style="width:100%;min-height:50px;margin-bottom:10px">＋ 서류 올리기 (사진 여러 장 가능)</button>' : ''}
  <section><h2 class="sh"><span>종류</span><span>${L.length}건${sum ? ` · ${won(sum)}` : ''}</span></h2>${chips(KINDS.map(x => x[0]), V.kind, 'fk')}${chips(STATES, V.st, 'fs')}
  <div class="cllist">${L.map(row).join('') || '<p class="vempty">아직 서류가 없어요. 위 단추나 증상·진료·접종 편집창의 📎에서 올려요.</p>'}</div></section>
  <div class="clbar"${n ? '' : ' hidden'}><b>${n}건 골랐어요</b><button data-cl="share">📤 사진 공유·저장</button>${cw ? '<button data-cl="mk" data-v="청구함">청구함으로</button><button data-cl="mk" data-v="지급완료">지급완료로</button>' : ''}<button data-cl="none" aria-label="고르기 풀기">✕</button></div>`;
}
// 고른 건의 사진을 한꺼번에 공유(카톡·메일·보험사 앱)하거나 저장
async function blobOf(d) {
  const u = safeImg(PHOTOS[d.id]); if (!u) throw new Error('사진을 아직 못 받았어요');
  if (u.startsWith('data:')) return (await fetch(u)).blob();
  return window.__photoBlob ? window.__photoBlob(u) : (await fetch(u)).blob();
}
async function share() {
  const hs = heads().filter(d => V.sel.has(d.id)); if (!hs.length) return;
  toast('사진 모으는 중…');
  try {
    const files = []; let i = 0;
    for (const h of hs) for (const p of photosOf(h)) { const b = await blobOf(p); files.push(new File([b], `${kindsOf(h).join('+') || '서류'}_${h.date}_${++i}.jpg`, { type: b.type || 'image/jpeg' })); }
    if (!files.length) { toast('사진이 있는 건을 골라 주세요'); return; }
    if (navigator.canShare && navigator.canShare({ files })) { try { await navigator.share({ files, title: '소은이 서류' }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    files.forEach(f => CV.save(f, f.name)); toast(`${files.length}장을 저장했어요 (다운로드·파일 앱)`);
  } catch (e) { toast(e.message || '공유하지 못했어요'); }
}
async function markSel(st) {
  const hs = heads().filter(d => V.sel.has(d.id) && (d.claim || '미청구') !== st); if (!hs.length) { toast('이미 그 상태예요'); return; }
  if (!(await ask(`${hs.length}건을 '${st}'로 바꿀까요?`, { ok: '바꾸기' }))) return;
  let n = 0; for (const d of hs) { if (await write('saveItem', 'doc', full(d, { claim: st }))) n++; else break; }
  V.sel.clear(); toast(`${n}건을 '${st}'로 바꿨어요`); render();
}
const entryHtml = () => { const L = heads(), m = L.filter(d => !d.claim || d.claim === '미청구').length; return `<button class="solve clentry" data-cl="open" style="width:100%;min-height:50px;margin:6px 0 12px">🧾 서류함 · 보험 청구용 <small>${L.length ? `${L.length}건 · 미청구 ${m}` : '약봉지·영수증 등 모아 두기'}</small></button>`; };

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-cl]'); if (!b) return; const a = b.dataset.cl, v = b.dataset.v, id = b.dataset.id;
  if (a === 'pick') { picker.click(); return; }
  if (a === 'kind') { CL.kinds.has(v) ? CL.kinds.delete(v) : CL.kinds.add(v); b.classList.toggle('on', CL.kinds.has(v)); if (window.__app && __app.sheetDirty) __app.sheetDirty(); return; }
  if (a === 'rm') { CL.stage.splice(+b.dataset.i, 1); const s1 = document.getElementById('cl-stage'); if (s1) s1.innerHTML = stageHtml(); return; }
  if (a === 'rmp') { if (await ask('이 사진을 건에서 뺄까요?', { ok: '빼기', danger: true }) && await write('deleteItem', 'doc', id)) { delete PHOTOS[id]; openEdit(CL.head); } return; }
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
    const d = (S.docs || []).find(x => x.id === id); if (!d) return; const s = document.querySelector('#cl-s .on'), dt = (document.getElementById('cl-date') || {}).value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dt || '')) { document.getElementById('cl-err').textContent = '날짜를 확인해 주세요'; return; }
    const memo = ((document.getElementById('cl-memo') || {}).value || '').trim(), claim = s ? s.dataset.v : '미청구';
    CL.date = dt; closeSheet();
    if (CL.stage.length) await flush(d.link || '', { date: dt, memo, claim });
    else { const hosp = num(CL.hosp), drug = num(CL.drug); await write('saveItem', 'doc', full(d, { kind: kindStr(), date: dt, hosp: String(hosp || ''), drug: String(drug || ''), amount: String(hosp + drug || ''), memo, claim })); }
    toast('서류를 고쳤어요'); return;
  }
  if (a === 'del') {
    const d = (S.docs || []).find(x => x.id === id), ph = d ? photosOf(d) : [];
    if (!(await ask(`이 건${ph.length ? `과 사진 ${ph.length}장` : ''}을 지울까요?`, { ok: '지우기', danger: true }))) return;
    closeSheet(); for (const p of ph.filter(x => x.id !== id)) { await write('deleteItem', 'doc', p.id); delete PHOTOS[p.id]; }
    if (await write('deleteItem', 'doc', id)) { delete PHOTOS[id]; V.sel.delete(id); toast('서류를 지웠어요'); } return;
  }
  if (a === 'addsave') {
    const hosp = num(CL.hosp), drug = num(CL.drug);
    if (!CL.stage.length && !hosp && !drug) { document.getElementById('cl-err').textContent = '사진이나 금액을 하나는 넣어 주세요'; return; }
    const dt = (document.getElementById('cl-date') || {}).value || today(), memo = ((document.getElementById('cl-memo') || {}).value || '').trim();
    CL.date = dt; closeSheet(); await flush('', { date: dt, memo }); return;
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) lb.hidden = true; });

const css = document.createElement('style');
css.textContent = `
.clbox .clths{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}.clbox .cl-kinds{margin:8px 0 6px}.cl-kinds button,.clbox .cl-kinds button{min-height:38px;font-size:13px;padding:0 10px}
.clth{position:relative;width:68px;height:68px;border-radius:12px;border:1.5px solid var(--line);background:var(--card2);padding:0;overflow:hidden;display:grid;place-items:center}.clth img{width:100%;height:100%;object-fit:cover;display:block}
.clth>button{position:absolute;top:2px;right:2px;width:22px;height:22px;border-radius:50%;border:0;background:var(--red);color:#fff;font-size:11px;padding:0}
.clthw{position:relative;display:inline-block}.clthw .clx{position:absolute;top:-6px;right:-6px;width:24px;height:24px;border-radius:50%;border:0;background:var(--red);color:#fff;font-size:12px;padding:0;z-index:1}
.cladd{width:100%;min-height:44px;margin-top:4px}.cladd small{color:var(--muted)}
.clamt{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.clamt label{display:block}.clamt span{display:block;font-size:12.5px;color:var(--navy);margin-bottom:2px}
#cl-lb{position:fixed;inset:0;z-index:85;background:rgba(15,20,35,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px}#cl-lb[hidden]{display:none}
#cl-lb img{max-width:100%;max-height:82vh;object-fit:contain;border-radius:10px}#cl-lb p{color:#fff;font-size:14px;margin:0}#cl-lb button{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:14px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.2);color:#fff;font-size:18px}
.clsum{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0 12px}.clsum div{background:#FFFDF7;border:1.5px solid var(--line);border-radius:14px;text-align:center;padding:8px 2px}.clsum b{display:block;font-family:var(--display);font-weight:400;font-size:22px;color:var(--navy)}.clsum small{font-size:11.5px;color:var(--muted)}
.clf{margin:0 0 8px;flex-wrap:wrap}.clf button{min-height:34px;font-size:12.5px;padding:0 11px}
.cllist{display:flex;flex-direction:column;gap:8px;margin-top:6px}
.clrow{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;background:#FFFDF7;border:1.5px solid var(--line);border-radius:14px;padding:6px 8px 6px 6px}.clrow.on{border-color:var(--red);background:#FFF3EF}
.clck{flex:0 0 28px;height:28px;border-radius:50%;border:2px solid var(--line);background:#fff;padding:0;display:grid;place-items:center}.clck i{font-style:normal;color:#fff;font-size:15px;opacity:0}.clck.on{background:var(--red);border-color:var(--red)}.clck.on i{opacity:1}
.clphs{order:5;flex:1 1 100%;display:flex;align-items:center;gap:4px;padding-left:36px}.clph{flex:0 0 48px;width:48px;height:48px;border-radius:9px;border:0;background:var(--card2);padding:0;overflow:hidden;display:grid;place-items:center}.clph img{width:100%;height:100%;object-fit:cover;display:block}.clmore{font-style:normal;font-size:11.5px;color:var(--muted)}
.clmain{flex:1;min-width:0;text-align:left;border:0;background:none;padding:0}.clmain b{display:block;font-family:var(--display);font-weight:400;font-size:15px;color:var(--navy)}.clmain small{display:block;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.clmain .cla{color:var(--red);font-weight:700;white-space:normal}
.clrow em{font-style:normal;font-size:11.5px;color:var(--c);border:1.5px solid var(--c);border-radius:99px;padding:1px 8px;white-space:nowrap}
.clbar{position:sticky;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:3;display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px;background:var(--navy);color:#fff;border-radius:16px;padding:8px 8px 8px 14px;box-shadow:0 6px 16px rgba(31,42,68,.3)}.clbar[hidden]{display:none}
.clbar b{flex:1 1 100%;font-family:var(--display);font-weight:400;font-size:15px}.clbar button{flex:1 1 auto;min-height:38px;border-radius:99px;border:0;background:var(--red);color:#fff;font-size:13px;padding:0 12px;white-space:nowrap}.clbar button[data-cl=none]{flex:0 0 auto;background:none;border:1.5px solid rgba(255,255,255,.45)}
.clentry small{display:block;font-size:12px;opacity:.85;font-family:var(--body)}
`;
document.head.appendChild(css);
window.CLAIM = { field, flush, render: view, openEdit, entryHtml, show, KINDS };
})();
