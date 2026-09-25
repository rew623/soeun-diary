// 영유아검진 — 예방접종 탭의 [예방접종 | 영유아검진]. 일정은 태어난 날로 계산하고, 받은 기록만 저장해요
// 저장: Firestore families/{fid}/checkups/{g1…g8, o1…o3} (app.js의 saveCheckup)
(function () {
// 국민건강보험공단 영유아 건강검진 8회 + 영유아 구강검진 3회. 기간: d=생후 일수, m=생후 개월(끝 개월은 그 달 끝까지)
const CHECKS = [
  { id: 'g1', kind: '일반', no: 1, from: { d: 14 }, to: { d: 35 }, what: '출생 후 성장 상태, 수유, 황달, 선천성 대사이상 등' },
  { id: 'g2', kind: '일반', no: 2, from: { m: 4 }, to: { m: 6 }, what: '키·몸무게·머리둘레, 발달 평가, 수유·이유식 상담' },
  { id: 'g3', kind: '일반', no: 3, from: { m: 9 }, to: { m: 12 }, what: '성장·발달 평가, 이유식 진행, 치아 발달' },
  { id: 'g4', kind: '일반', no: 4, from: { m: 18 }, to: { m: 24 }, what: '신체계측, 발달 평가, 언어·사회성, 생활 습관 상담' },
  { id: 'o1', kind: '구강', no: 1, from: { m: 18 }, to: { m: 29 }, what: '충치·치아 상태, 구강 위생 교육 (치과)' },
  { id: 'g5', kind: '일반', no: 5, from: { m: 30 }, to: { m: 36 }, what: '성장 상태, 발달 평가, 시력·청력 선별검사' },
  { id: 'g6', kind: '일반', no: 6, from: { m: 42 }, to: { m: 48 }, what: '신체계측, 발달 평가, 구강 건강, 비만 위험 평가' },
  { id: 'o2', kind: '구강', no: 2, from: { m: 42 }, to: { m: 53 }, what: '충치·치아 상태, 불소 도포 상담 (치과)' },
  { id: 'g7', kind: '일반', no: 7, from: { m: 54 }, to: { m: 60 }, what: '취학 전 발달 평가, 시력·청력, 생활 습관, 정서' },
  { id: 'o3', kind: '구강', no: 3, from: { m: 54 }, to: { m: 65 }, what: '영구치 맹출 확인, 충치 예방 (치과)' },
  { id: 'g8', kind: '일반', no: 8, from: { m: 66 }, to: { m: 71 }, what: '초등학교 입학 전 최종 점검, 성장·발달 종합 평가' }
];
const HI_URL = 'https://hi.nhis.or.kr';
const nameOf = c => c.kind === '구강' ? `구강검진 ${c.no}차` : `영유아검진 ${c.no}차`;
const rangeOf = c => c.from.d != null ? `생후 ${c.from.d}~${c.to.d}일` : `생후 ${c.from.m}~${c.to.m}개월`;
function windowOf(c) {
  const b = S.profile.birth;
  if (c.from.d != null) return [addDays(b, c.from.d), addDays(b, c.to.d)];
  return [addMonths(b, c.from.m), addDays(addMonths(b, c.to.m + 1), -1)];   // 끝 개월의 마지막 날까지
}
const recOf = id => (S.checkups || []).find(x => x.id === id);
// 상태: done 해결 / open 받을 기간 / soon 기간 전 / late 기간 지남
function list() {
  const t = today();
  return CHECKS.map(c => {
    const [start, end] = windowOf(c), r = recOf(c.id);
    const st = r && r.done ? 'done' : t < start ? 'soon' : t <= end ? 'open' : 'late';
    return { c, start, end, r, st };
  }).sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
}
// 다음에 챙길 검진 (기간이 열렸거나 다가오는 것 중 가장 이른 것)
function next() { return list().find(x => x.st === 'open' || x.st === 'soon') || null; }

// ---------- 화면 ----------
function caseHtml(x, hot) {
  const { c, start, end, r, st } = x, t = today();
  const dd = st === 'done' ? '' : st === 'open' ? `마감 ${ddayText(end)}` : st === 'soon' ? ddayText(start) : '기간 지남';
  const far = st === 'soon' && daysBetween(t, start) > 60;
  return `<article class="case ${hot ? 'hot' : ''} ${st === 'done' ? 'solved' : ''}">
    ${st === 'done' ? '<span class="stamp">해결</span>' : ''}
    <span class="no">${c.kind === '구강' ? '영유아 구강검진' : '영유아 건강검진'} · ${rangeOf(c)}</span>
    <div class="top"><h3>${nameOf(c)}</h3>${dd ? `<span class="dd ${far || st === 'late' ? 'far' : ''}">${dd}</span>` : ''}</div>
    <div class="dline"><span><small>검진 기간</small>${fmtK(start, true)} ~ ${fmtK(end, true)}${st === 'open' ? '<span class="badge">지금 받을 기간</span>' : ''}</span></div>
    <p class="ckwhat">${esc(c.what)}</p>
    ${r && r.done ? `<p class="ckdone">${fmtK(r.done, true)}${r.hospital ? ', ' + esc(r.hospital) : ''}${r.by ? ` · ${esc(r.by)} 수사관` : ''}${r.memo ? `<br><span>${esc(r.memo)}</span>` : ''}</p>` : ''}
    <div class="cacts">${st === 'done'
      ? `<button class="addv" data-ck="edit" data-id="${c.id}">기록 수정</button>`
      : `<button class="solve" data-ck="edit" data-id="${c.id}">검진 받았어요</button>`}</div>
  </article>`;
}
function renderChecks() {
  const L = list(), up = L.filter(x => x.st !== 'done'), done = L.filter(x => x.st === 'done').reverse();
  const hot = up.find(x => x.st === 'open') || up.find(x => x.st === 'soon');
  return `<p class="notice" style="margin-top:14px">영유아 건강검진 8회와 구강검진 3회는 건강보험에서 무료예요. 검진 전에 <a href="${HI_URL}" target="_blank" rel="noopener" style="color:inherit">건강iN</a>에서 문진표를 미리 작성해 가면 빨라요.</p>
    ${up.map(x => caseHtml(x, x === hot)).join('')}
    ${done.length ? '<h2 class="subh">해결된 검진</h2>' + done.map(x => caseHtml(x, false)).join('') : ''}
    <p class="foot">기간은 태어난 날로 계산한 거예요. 정확한 기간은 건강iN이나 검진기관에서 확인해 주세요. 끝 개월은 그 달이 끝나는 날까지로 셌어요.</p>`;
}
// 성장 수사 첫 화면용 카드
function nextCard() {
  const x = next(); if (!x) return '';
  const t = today(), open = x.st === 'open';
  if (!open && daysBetween(t, x.start) > 45) return '';        // 너무 먼 검진은 첫 화면에 안 띄워요
  return `<button class="nextcard" data-ck="go" style="margin-top:10px"><span><small>${open ? '다음 검진, 지금 받을 기간' : '다음 검진, 기간 전'}</small><span class="t">${nameOf(x.c)}, ${fmtK(open ? x.end : x.start)}${open ? '까지' : '부터'}</span><small>${esc(x.c.what)}</small></span><span class="d">${open ? '마감 ' + ddayText(x.end) : ddayText(x.start)}</span></button>`;
}
// 수사 보드용 카드
function boardCard() {
  const x = next(); if (!x) return null;
  const open = x.st === 'open';
  return { id: 'check', go: 'check', cls: 'kraft note', html: `<b class="bt">다음 검진</b><span class="bbig">${open ? '마감 ' + ddayText(x.end) : ddayText(x.start)}</span><p>${nameOf(x.c)}<small>${fmtK(x.start, true)} ~ ${fmtK(x.end, true)}</small></p>` };
}

function openEdit(id) {
  const c = CHECKS.find(x => x.id === id), r = recOf(id) || {};
  openSheet(`<h3>${nameOf(c)} ${r.done ? '기록 수정' : '해결'}</h3>
    <p class="hint" style="margin:-8px 0 12px">${rangeOf(c)} · ${esc(c.what)}</p>
    <label class="field"><span>검진 받은 날</span><input id="ck-date" type="date" value="${r.done || today()}" min="${S.profile.birth}" max="${today()}"></label>
    <label class="field"><span>병원 (선택)</span><input id="ck-hos" maxlength="40" value="${esc(r.hospital || '')}" placeholder="${c.kind === '구강' ? '예: 우리동네 치과' : '예: 우리동네 소아청소년과'}"></label>
    <label class="field"><span>메모 (선택)</span><textarea id="ck-memo" maxlength="200" placeholder="예: 발달 모두 양호, 다음엔 시력 확인">${esc(r.memo || '')}</textarea></label>
    ${!r.done && c.kind === '일반' ? '<label class="check"><input type="checkbox" id="ck-rec" checked> 검진에서 잰 키·몸무게를 증거 기록으로 남기기</label>' : ''}
    <p class="err" id="ck-err"></p>
    <div class="actions">${r.done ? `<button class="danger" data-ck="del" data-id="${id}">해결 취소</button>` : ''}<button class="secondary" data-act="close">취소</button><button class="primary" data-ck="save" data-id="${id}">저장</button></div>`);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-ck]'); if (!b) return;
  const id = b.dataset.id;
  switch (b.dataset.ck) {
    case 'go': S.tab = 'vac'; S.view = ''; S.vacView = 'check'; render(); window.scrollTo(0, 0); break;
    case 'view': S.vacView = b.dataset.v; render(); break;
    case 'edit': openEdit(id); break;
    case 'save': {
      const d = (document.getElementById('ck-date') || {}).value || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { document.getElementById('ck-err').textContent = '검진 받은 날을 골라 주세요'; return; }
      const rec = document.getElementById('ck-rec'), wantRec = rec && rec.checked;
      const o = { id, done: d, hospital: document.getElementById('ck-hos').value.trim(), memo: document.getElementById('ck-memo').value.trim() };
      if (await write('saveCheckup', o)) {
        closeSheet(); toast('검진 해결! 기록했어요');
        if (wantRec) { openRecord(null); setTimeout(() => { const f = document.getElementById('f-date'); if (f) f.value = d; }, 0); }
      }
      break;
    }
    case 'del':
      if (confirm('이 검진의 해결 기록을 지울까요?') && await write('deleteCheckup', id)) { closeSheet(); toast('해결 기록을 지웠어요'); }
      break;
  }
});

const css = document.createElement('style');
css.textContent = `
.ckwhat{margin:4px 0 0;font-size:13px}
.ckdone{margin:8px 0 0;font-size:13px;color:var(--navy);font-weight:700}
.ckdone span{font-weight:400;color:var(--ink)}`;
document.head.appendChild(css);

window.CHECKUPS = { render: renderChecks, nextCard, boardCard, next };
})();
