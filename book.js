// 성장 앨범 책 — 표지 + 달마다 한 쪽(대표 사진, 그달 사진, 최초 목격, 키·몸무게, 접종) → 인쇄 또는 PDF로 저장 (S.view='book')
(function () {
function pagesOf() {
  const b = S.profile.birth, [mo] = monthsDays(b, today()), out = [];
  const photos = [];
  (S.moments || []).forEach(m => { if (m.photo && m.date && m.type !== 'report' && safeImg(PHOTOS[m.id])) photos.push({ key: m.id, date: m.date, type: m.type || 'first', title: m.title || '' }); });
  (S.records || []).forEach(r => { if (r.photo && safeImg(PHOTOS[r.id])) photos.push({ key: r.id, date: r.date, type: 'rec', title: '' }); });
  for (let i = 0; i <= Math.min(mo, 36); i++) {
    const from = addMonths(b, i), to = addMonths(b, i + 1);
    const mp = S.moments.find(m => m.type === 'month' && m.title === i + '개월' && safeImg(PHOTOS[m.id]));
    const inR = photos.filter(p => p.date >= from && p.date < to).sort((x, y) => x.date < y.date ? -1 : 1);
    const main = mp ? { key: mp.id, date: mp.date } : inR.find(p => p.type === 'first') || inR[0] || (i === 0 && safeImg(PHOTOS.profile) ? { key: 'profile', date: b } : null);
    const more = inR.filter(p => !main || p.key !== main.key).slice(0, 6);
    const firsts = S.moments.filter(m => (m.type === 'first' || !m.type) && m.date >= from && m.date < to);
    const recs = S.records.filter(r => r.date >= from && r.date < to).sort((x, y) => x.date < y.date ? -1 : 1), last = recs[recs.length - 1];
    const vacs = S.vaccines.filter(v => v.done && v.done >= from && v.done < to);
    if (!main && !more.length && !firsts.length && !recs.length && !vacs.length) continue;
    out.push({ i, from, main, more, firsts, last, vacs });
  }
  return out;
}
function render_() {
  const p = S.profile, P = pagesOf(), cover = safeImg(PHOTOS.profile);
  const page = g => `<article class="bpage">
    <header class="bph"><b>${g.i === 0 ? '태어난 달' : `생후 ${g.i}개월`}</b><small>${fmtK(g.from, true)}부터</small></header>
    ${g.main ? `<img class="bmain" src="${safeImg(PHOTOS[g.main.key])}" alt="">` : ''}
    ${g.more.length ? `<div class="bmore">${g.more.map(x => `<img src="${safeImg(PHOTOS[x.key])}" alt="">`).join('')}</div>` : ''}
    <div class="binfo">
      ${g.last ? `<p>📏 ${[g.last.weight != null && g.last.weight !== '' ? `몸무게 ${fmt('weight', g.last.weight)}kg` : '', g.last.height != null && g.last.height !== '' ? `키 ${fmt('height', g.last.height)}cm` : ''].filter(Boolean).join(' · ')} <small>(${fmtK(g.last.date, true)})</small></p>` : ''}
      ${g.firsts.length ? `<p>✨ 최초 목격: ${g.firsts.map(m => `${esc(m.title)} (생후 ${dayNo(m.date)}일)`).join(', ')}</p>` : ''}
      ${g.vacs.length ? `<p>💉 접종: ${g.vacs.map(v => esc(v.name)).join(', ')}</p>` : ''}
    </div></article>`;
  return `<div class="bbar noprint"><button class="primary" data-book="print">🖨 인쇄 · PDF로 저장</button><button class="secondary" data-book="close">돌아가기</button></div>
    <p class="hint noprint" style="margin:8px 2px 14px">인쇄 창에서 프린터를 "PDF로 저장"으로 고르면 파일로 남아요. 사진이 다 보인 다음에 눌러 주세요. 모두 ${P.length + 1}쪽</p>
    <div class="book">
      <article class="bpage bcover">${cover ? `<img src="${cover}" alt="">` : CHARS.svg('baby', 'camera', { size: 200 })}
        <span class="bno">사건 파일 No.${fileNo()}</span><h1>${esc(p.name || '우리 아기')} 성장 수사 일지</h1>
        <p>${fmtK(p.birth, true).replace(/^(\d+월)/, `${p.birth.slice(0, 4)}년 $1`)} 태어남 · 오늘 생후 ${dayNo(today())}일</p>
        <p class="bsig">담당 수사관 엄마${p.mom ? ' ' + esc(p.mom) : ''} · 아빠${p.dad ? ' ' + esc(p.dad) : ''}</p></article>
      ${P.map(page).join('')}
    </div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-book]'); if (!b) return;
  if (b.dataset.book === 'open') { S.view = 'book'; render(); window.scrollTo(0, 0); }
  if (b.dataset.book === 'close') { S.view = ''; render(); window.scrollTo(0, 0); }
  if (b.dataset.book === 'print') window.print();
});
const css = document.createElement('style');
css.textContent = `
.bbar{display:flex;gap:8px}.bbar .primary{flex:2}
.book{display:flex;flex-direction:column;gap:16px}
.bpage{background:#FFFDF7;border:1.5px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 4px 12px rgba(43,38,34,.12)}
.bph{display:flex;align-items:baseline;gap:8px;border-bottom:2px dotted var(--line);padding-bottom:6px;margin-bottom:10px}
.bph b{font-family:var(--display);font-weight:400;font-size:26px;color:var(--navy)}.bph small{color:var(--muted);font-size:12px}
.bmain{width:100%;max-height:340px;object-fit:cover;border-radius:12px;border:5px solid #fff;box-shadow:0 3px 8px rgba(43,38,34,.2)}
.bmore{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.bmore img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px}
.binfo p{margin:8px 0 0;font-size:14px;line-height:1.55}.binfo small{color:var(--muted)}
.bcover{text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;padding:28px 18px}
.bcover img{width:70%;max-width:280px;aspect-ratio:4/5;object-fit:cover;border:8px solid #fff;box-shadow:0 6px 16px rgba(43,38,34,.25);transform:rotate(-2deg)}
.bcover h1{font-family:var(--display);font-weight:400;font-size:30px;color:var(--navy);margin:8px 0 0}.bno{font-size:12px;color:var(--muted)}.bsig{color:var(--muted);font-size:13px}
@media print{
  @page{size:A4;margin:12mm}
  body{background:#fff!important}body::before,body::after,#app::before{display:none!important}
  .tabbar,.fab,.pbub,.toast,.noprint,.banner,.selbar,.sheet,.scrim{display:none!important}
  main#app{padding:0!important;max-width:none}
  .book{gap:0}.bpage{break-after:page;box-shadow:none;border:0;border-radius:0;padding:0}
  .bmain{max-height:150mm}
}`;
document.head.appendChild(css);
window.BOOK = { render: render_ };
})();
