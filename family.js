// 가족 앨범 — 사건 앨범 탭의 세 번째 칸 "가족" (S.albumView='family')
// 엄마·아빠·소은이 가족 사진을 한곳에 (누가 나왔는지 나누지 않음, 사용자 요청). mom 컬렉션에 type:'fam' (예전 사진의 who는 남아 있어도 안 씀)
// 올리기는 사진첩 올리기 줄(ALBUM.queue)을 같이 써서 찍은 날짜 읽기·이어 올리기가 그대로 돼요
// (people 컬렉션은 예전 친척 카드용으로 남아 있지만 지금은 화면에서 쓰지 않아요)
(function () {
const F = { more: 30 };
const famPhotos = () => S.moments.filter(m => m.type === 'fam' && m.photo).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1));
const whoOf = m => String(m.who || '').split(',').filter(x => x === 'mom' || x === 'dad');
const nameOf = id => id === 'mom' ? '엄마' : id === 'dad' ? '아빠' : '';

function render_() {
  const L = famPhotos(), shown = L.slice(0, F.more);
  const groups = []; shown.forEach(m => { const ym = m.date.slice(0, 7); let g = groups[groups.length - 1]; if (!g || g.ym !== ym) groups.push(g = { ym, items: [] }); g.items.push(m); });
  const cell = m => { const ph = safeImg(PHOTOS[m.id]);
    return `<button class="acell" data-view="${m.id}">${ph ? `<img src="${ph}" alt="" loading="lazy" decoding="async">` : '<span class="mph">불러오는 중</span>'}${m.board ? '<span class="onboard">보드</span>' : ''}</button>`; };
  const P = S.profile || {}, face = (k, who) => safeImg(PHOTOS[k]) ? `<img src="${safeImg(PHOTOS[k])}" alt="">` : CHARS.svg(who, '', { face: true, size: 58 });
  return `<section class="fteam"><div class="fduo">
      <span class="fface">${face('mom', 'mom')}<b>엄마</b></span><span class="fplus">+</span>
      <span class="fface">${face('dad', 'dad')}<b>아빠</b></span><span class="fplus">+</span>
      <span class="fface">${face('profile', 'baby')}<b>${esc((P.name || '아기').replace(/^[가-힣](?=[가-힣]{2}$)/, ''))}</b></span>
      <span class="fcount"><b>${L.length}</b><small>장</small></span></div>
    </section>
    <section${isFold('a-fam') ? ' class="folded"' : ''}><h2 class="sh" data-fold="a-fam" style="align-items:baseline"><span style="font-family:var(--display);font-size:21px;color:var(--navy);letter-spacing:0">가족 사진</span><span>${L.length}장</span></h2>
      <button class="solve" data-fa="up" style="width:100%;min-height:50px">+ 가족 사진 올리기 (여러 장 가능)</button>
      ${groups.map((g, gi) => { const [y, mo] = g.ym.split('-').map(Number); return `<div class="amon${isFold('fm-' + g.ym, gi >= 2) ? ' folded' : ''}"><h3 class="agh" data-fold="fm-${g.ym}">${y}.${mo} · ${g.items.length}장</h3><div class="agrid">${g.items.map(cell).join('')}</div><button class="afold" data-al="foldm" data-k="fm-${g.ym}">▴ ${mo}월 가족 사진 접기</button></div>`; }).join('') || '<p class="vempty" style="margin-top:12px">셋이 함께 찍은 사진, 엄마·아빠가 안고 있는 사진을 올려 보세요. 찍은 날짜로 알아서 정리돼요.</p>'}
      ${L.length > shown.length ? `<button class="addperiod" data-fa="more">더 보기 (${L.length - shown.length}장)</button>` : ''}
      ${L.length ? '<button class="afold" data-fa="folds">▴ 가족 사진 접기</button>' : ''}
    </section>`;
}

// 사진 고르기 칸은 body에 (파일 창에서 돌아올 때 화면을 다시 그려도 안 사라지게), 누르면 바로 사진 고르기
const picker = document.createElement('input');
picker.type = 'file'; picker.accept = 'image/*'; picker.multiple = true; picker.hidden = true;
document.body.appendChild(picker);
picker.addEventListener('change', () => { const files = [...picker.files]; picker.value = ''; if (files.length) ALBUM.queue(files, { type: 'fam', who: '' }); });

function openPhoto(id) {
  const m = S.moments.find(x => x.id === id); if (!m) return;
  pending = undefined;
  openSheet(`<h3>가족 사진</h3>
    <img class="bigimg" src="${safeImg(PHOTOS[id]) || ''}" alt="" style="max-height:38vh;object-fit:contain">
    <label class="field"><span>설명 (선택)</span><input id="ff-title" maxlength="30" value="${esc(m.title || '')}" placeholder="예: 첫 가족 나들이"></label>
    <label class="field"><span>날짜</span><input id="ff-date" type="date" value="${m.date}" min="${S.profile.birth}" max="${today()}"></label>
    <p class="err" id="ff-err"></p>
    <div class="actions"><button class="danger" data-act="delmom" data-id="${id}">삭제</button><button class="secondary" data-act="close">취소</button><button class="primary" data-fa="fsave" data-id="${id}">저장</button></div>`);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-fa]'); if (!b) return;
  const id = b.dataset.id;
  switch (b.dataset.fa) {
    case 'up': picker.click(); break;
    case 'more': F.more += 30; render(); break;
    case 'folds': {
      const box = b.closest('section'); if (!box) return;
      setFold('a-fam', true); box.classList.add('folded');
      const h = box.querySelector('.sh'); if (h.getBoundingClientRect().top < 70) window.scrollTo({ top: Math.max(0, h.getBoundingClientRect().top + window.scrollY - 70), behavior: 'smooth' });
      break;
    }
    case 'fsave': {
      const m = S.moments.find(x => x.id === id), d = document.getElementById('ff-date').value; if (!m) return;
      if (!d) { document.getElementById('ff-err').textContent = '날짜를 골라 주세요'; return; }
      const res = await write('saveItem', 'mom', { id, type: 'fam', of: '', who: m.who || '', title: document.getElementById('ff-title').value.trim(), date: d, memo: m.memo || '', by: m.by || myRole() });
      if (res) { closeSheet(); toast('저장했어요'); }
      break;
    }
  }
});

const css = document.createElement('style');
css.textContent = `
.fduo{display:flex;align-items:center;justify-content:center;gap:6px}
.fface{display:flex;flex-direction:column;align-items:center;gap:3px}
.fface img,.fface .chr{width:58px;height:58px;border-radius:50%;object-fit:cover;background:#FCEBD3;border:3px solid #fff;box-shadow:0 2px 6px rgba(43,38,34,.2)}
.fface b{font-size:13px;color:var(--navy)}
.fplus{font-family:var(--display);font-size:20px;color:var(--red);margin-bottom:18px}
.fcount{display:flex;align-items:baseline;margin-left:8px;margin-bottom:18px}.fcount b{font-family:var(--display);font-weight:400;font-size:30px;color:var(--red)}.fcount small{font-size:12px;color:var(--muted)}
.fwho{position:absolute;left:4px;bottom:4px;display:flex;gap:2px}
.fwho i{font-style:normal;font-size:11px;font-weight:700;color:var(--navy);background:rgba(255,253,247,.92);border-radius:99px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 4px}
.fteam .chip.on,.fchips .chip.on{background:var(--navy);color:#fff;border-color:var(--navy)}`;
document.head.appendChild(css);

window.FAMILY = { render: render_, openPhoto, nameOf, whoOf };
})();
