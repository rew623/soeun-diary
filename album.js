// 현장 사진첩 — 사건 앨범 탭에 아무 사진이나 여러 장씩 자유롭게 올려요
// 저장: 기존 앨범 컬렉션 families/{fid}/mom 에 type:'free' 로 (제목·메모는 선택, 날짜는 사진 파일 날짜)
(function () {
const A = { more: 30 };
const isFree = m => m.type === 'free';
const frees = () => S.moments.filter(m => isFree(m) && m.photo).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1));

// ---------- 사진첩 칸 ----------
function sectionHtml() {
  const L = frees(), shown = L.slice(0, A.more), p = S.profile;
  // 달별로 묶어서 "2026.9 · 생후 3개월"
  const groups = [];
  shown.forEach(m => { const ym = m.date.slice(0, 7); let g = groups[groups.length - 1]; if (!g || g.ym !== ym) groups.push(g = { ym, items: [] }); g.items.push(m); });
  const head = ym => { const [y, mo] = ym.split('-').map(Number), [age] = monthsDays(p.birth, ym + '-' + String(Math.min(28, +p.birth.slice(8))).padStart(2, '0')); return `${y}.${mo}${ym >= p.birth.slice(0, 7) ? ` · 생후 ${age}개월` : ''}`; };
  const cell = m => { const ph = safeImg(PHOTOS[m.id]); return `<button class="acell" data-view="${m.id}" aria-label="${esc(m.title || '사진')} 크게 보기">${ph ? `<img src="${ph}" alt="" loading="lazy">` : '<span class="mph">불러오는 중</span>'}${m.board ? '<span class="onboard">보드</span>' : ''}${m.title ? `<small>${esc(m.title)}</small>` : ''}</button>`; };
  return `<section><h2 class="sh" style="align-items:baseline"><span style="font-family:var(--display);font-size:21px;color:var(--navy);letter-spacing:0">현장 사진첩</span><span>${L.length}장</span></h2>
    <p class="foot" style="margin:0 0 10px">아무 사진이나 여러 장씩 자유롭게 올려요. 사진을 누르면 크게 보고, 설명을 붙이거나 보드에 붙일 수 있어요.</p>
    <button class="solve" data-al="pick" style="width:100%;min-height:50px">+ 사진 올리기 (여러 장 가능)</button>
    ${groups.map(g => `<h3 class="agh">${head(g.ym)}</h3><div class="agrid">${g.items.map(cell).join('')}</div>`).join('') || '<p class="vempty" style="margin-top:12px">아직 올린 사진이 없어요.</p>'}
    ${L.length > shown.length ? `<button class="addperiod" data-al="more">더 보기 (${L.length - shown.length}장 남음)</button>` : ''}
  </section>`;
}

// ---------- 여러 장 올리기 (파일 칸은 body에 고정) ----------
const picker = document.createElement('input');
picker.type = 'file'; picker.accept = 'image/*'; picker.multiple = true; picker.hidden = true;
document.body.appendChild(picker);
const localDay = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
let uploading = false;
picker.addEventListener('change', async () => {
  const files = [...picker.files].filter(f => /^image\//.test(f.type)); picker.value = '';
  if (!files.length || uploading) return;
  uploading = true;
  let ok = 0, last = null;
  try {
    for (const f of files) {
      toast(`사진 올리는 중 ${ok + 1}/${files.length}`);
      const photo = await readPhoto(f, true);
      // 날짜: 사진 파일 날짜 (태어난 날~오늘 사이로)
      let date = f.lastModified ? localDay(f.lastModified) : today();
      if (date < S.profile.birth) date = S.profile.birth;
      if (date > today()) date = today();
      const res = await run('saveItem', 'mom', { type: 'free', title: '', date, memo: '', photo, by: myRole() });
      PHOTOS[res.id] = photo; last = res; ok++;
    }
  } catch (x) { console.error(x); toast(`${ok}장 올리고 멈췄어요: ${(x && x.message) || ''}`); }
  finally {
    uploading = false;
    if (last) { apply(last.data); if (ok === files.length) toast(`사진 ${ok}장을 보관했어요`); }
  }
});

// ---------- 설명·날짜 고치기 ----------
function openFree(id) {
  const m = S.moments.find(x => x.id === id); if (!m) return;
  pending = undefined;
  openSheet(`<h3>현장 사진</h3>
    ${photoField(safeImg(PHOTOS[id]), '사진', true)}
    <label class="field"><span>설명 (선택)</span><input id="af-title" maxlength="30" value="${esc(m.title || '')}" placeholder="예: 할머니 댁 첫 방문"></label>
    <label class="field"><span>날짜</span><input id="af-date" type="date" value="${m.date}" min="${S.profile.birth}" max="${today()}"></label>
    <label class="field"><span>메모 (선택)</span><textarea id="af-memo" maxlength="200" placeholder="예: 처음으로 까르르 웃은 날">${esc(m.memo || '')}</textarea></label>
    <p class="err" id="af-err"></p>
    <div class="actions"><button class="danger" data-act="delmom" data-id="${id}">삭제</button><button class="secondary" data-act="close">취소</button><button class="primary" data-al="save" data-id="${id}">저장</button></div>`);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-al]'); if (!b) return;
  switch (b.dataset.al) {
    case 'pick': if (uploading) toast('올리는 중이에요. 끝나면 다시 눌러 주세요'); else picker.click(); break;
    case 'more': A.more += 30; render(); break;
    case 'save': {
      const id = b.dataset.id, d = document.getElementById('af-date').value;
      if (!d) { document.getElementById('af-err').textContent = '날짜를 골라 주세요'; return; }
      if (pending === null) { document.getElementById('af-err').textContent = '사진을 빼려면 삭제를 눌러 주세요'; return; }
      const o = { id, type: 'free', title: document.getElementById('af-title').value.trim(), date: d, memo: document.getElementById('af-memo').value.trim(), by: myRole() };
      if (pending !== undefined) o.photo = pending;
      const res = await write('saveItem', 'mom', o);
      if (res) { if (pending) PHOTOS[id] = pending; render(); closeSheet(); toast('사진 정보를 저장했어요'); }
      break;
    }
  }
});

const css = document.createElement('style');
css.textContent = `
.agh{font-size:12px;color:var(--muted);font-weight:400;letter-spacing:1px;margin:16px 0 6px}
.agrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.acell{position:relative;display:block;padding:0;border:0;background:var(--card2);aspect-ratio:1;overflow:visible}
.acell img{width:100%;height:100%;object-fit:cover;display:block;border:3px solid #FFFDF7;box-shadow:0 2px 6px rgba(43,38,34,.2)}
.acell .mph{width:100%;height:100%;display:grid;place-items:center;font-size:11px;color:var(--muted)}
.acell small{position:absolute;left:3px;right:3px;bottom:3px;padding:2px 4px;font-size:10px;line-height:1.3;color:#fff;background:rgba(31,42,68,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}`;
document.head.appendChild(css);

window.ALBUM = { sectionHtml, openFree, isFree };
})();
