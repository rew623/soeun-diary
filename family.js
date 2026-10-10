// 가족 앨범 — 사건 앨범 탭의 세 번째 칸 "가족" (S.albumView='family')
// 가족 수사팀 명단: 엄마·아빠(대상 정보) + 할머니·이모 같은 가족(people 컬렉션: name, rel, photo, by)
// 가족 사진: mom 컬렉션에 type:'fam', who:'mom,dad,people id…' (누가 나왔는지). 올리기는 사진첩 올리기 줄(ALBUM.queue)을 같이 써요
(function () {
const F = { sel: '', more: 30 };
const RELS = ['할머니', '할아버지', '외할머니', '외할아버지', '이모', '고모', '삼촌', '외삼촌', '사촌', '증조할머니', '기타'];
const COLORS = ['#F8D8D1', '#FCE8B4', '#DCE7F1', '#DDEEDB', '#E9DDF3', '#FBE0C8'];
const members = () => {
  const p = S.profile || {};
  return [{ id: 'mom', name: p.mom || '엄마', rel: '엄마', fixed: 1 }, { id: 'dad', name: p.dad || '아빠', rel: '아빠', fixed: 1 }]
    .concat((S.people || []).slice().sort((a, b) => RELS.indexOf(a.rel) - RELS.indexOf(b.rel) || (a.name < b.name ? -1 : 1)).map(x => ({ id: x.id, name: x.name || x.rel, rel: x.rel || '' })));
};
const famPhotos = () => S.moments.filter(m => m.type === 'fam' && m.photo).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1));
const whoOf = m => String(m.who || '').split(',').filter(Boolean);
const nameOf = id => { const x = members().find(m => m.id === id); return x ? (x.fixed ? x.rel : `${x.rel && !String(x.name).includes(x.rel) ? x.rel + ' ' : ''}${x.name}`) : ''; };
function avatar(m, size = 54) {
  const ph = safeImg(PHOTOS[m.id]);
  if (ph) return `<img class="fav" src="${ph}" alt="" style="width:${size}px;height:${size}px">`;
  if (m.id === 'mom' || m.id === 'dad') return `<span class="fav" style="width:${size}px;height:${size}px">${CHARS.svg(m.id, '', { face: true, size })}</span>`;
  const c = COLORS[[...m.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];
  const em = /할머니/.test(m.rel) ? '👵' : /할아버지/.test(m.rel) ? '👴' : /이모|고모/.test(m.rel) ? '👩' : /삼촌/.test(m.rel) ? '👨' : /사촌/.test(m.rel) ? '🧒' : '🙂';
  return `<span class="fav ftxt" style="width:${size}px;height:${size}px;background:${c};font-size:${Math.round(size * .5)}px">${em}</span>`;
}

function render_() {
  const L = famPhotos(), M = members(), cnt = id => L.filter(m => whoOf(m).includes(id)).length;
  // 단짝: 사진을 2장 넘게, 혼자 제일 많이 함께한 사람
  const rk = M.map(m => [m, cnt(m.id)]).sort((a, b) => b[1] - a[1]), best = rk[0] && rk[0][1] >= 2 && (!rk[1] || rk[0][1] > rk[1][1]) ? rk[0] : null;
  const shown0 = F.sel ? L.filter(m => whoOf(m).includes(F.sel)) : L, shown = shown0.slice(0, F.more);
  const groups = []; shown.forEach(m => { const ym = m.date.slice(0, 7); let g = groups[groups.length - 1]; if (!g || g.ym !== ym) groups.push(g = { ym, items: [] }); g.items.push(m); });
  const cell = m => { const ph = safeImg(PHOTOS[m.id]), w = whoOf(m);
    return `<button class="acell" data-view="${m.id}">${ph ? `<img src="${ph}" alt="" loading="lazy">` : '<span class="mph">불러오는 중</span>'}${m.board ? '<span class="onboard">보드</span>' : ''}<span class="fwho">${w.slice(0, 3).map(id => { const x = M.find(y => y.id === id); return x ? `<i title="${esc(nameOf(id))}">${esc((x.fixed ? x.rel : x.rel || x.name).slice(0, 1))}</i>` : ''; }).join('')}${w.length > 3 ? `<i>+${w.length - 3}</i>` : ''}</span></button>`; };
  const sel = F.sel && M.find(m => m.id === F.sel);
  return `<section class="fteam"><h2 class="sh"><span>가족 수사팀 명단</span><span>${M.length}명</span></h2>
      <div class="fcards">${M.map(m => `<button class="fcard${F.sel === m.id ? ' on' : ''}" data-fam="pick" data-id="${m.id}">${avatar(m)}${best && best[0].id === m.id ? '<em class="fbest">단짝</em>' : ''}<b>${esc(m.fixed ? m.rel : m.name)}</b><small>${m.fixed ? '수사관' : esc(m.rel !== m.name ? m.rel : '')}</small><small class="fn">사진 ${cnt(m.id)}장</small></button>`).join('')}
        <button class="fcard fadd" data-fam="add"><span class="fav ftxt">＋</span><b>가족 추가</b><small>할머니·이모…</small></button></div>
      ${sel ? `<p class="fselbar"><b>${esc(nameOf(sel.id))}</b>와(과) 함께한 사진 ${shown0.length}장 <button class="ghost" data-fam="pick" data-id="">전체 보기</button>${sel.fixed ? '' : `<button class="ghost" data-fam="edit" data-id="${sel.id}">정보 수정</button>`}</p>` : '<p class="foot" style="margin:6px 0 0">이름을 누르면 그 사람과 함께한 사진만 모아 봐요.</p>'}
    </section>
    <section><h2 class="sh" style="align-items:baseline"><span style="font-family:var(--display);font-size:21px;color:var(--navy);letter-spacing:0">가족 앨범</span><span>${L.length}장</span></h2>
      <button class="solve" data-fam="up" style="width:100%;min-height:50px">+ 가족 사진 올리기 (여러 장 가능)</button>
      ${groups.map(g => { const [y, mo] = g.ym.split('-').map(Number); return `<h3 class="agh">${y}.${mo} · ${g.items.length}장</h3><div class="agrid">${g.items.map(cell).join('')}</div>`; }).join('') || `<p class="vempty" style="margin-top:12px">${F.sel ? '이 사람과 함께한 사진이 아직 없어요.' : '할머니 댁 방문, 명절, 가족 나들이 사진을 올려 보세요. 누가 나왔는지 고르면 사람별로 모아 볼 수 있어요.'}</p>`}
      ${shown0.length > shown.length ? `<button class="addperiod" data-fam="more">더 보기 (${shown0.length - shown.length}장)</button>` : ''}
    </section>`;
}

// ---------- 누가 나왔나요? (여러 명 고르기) ----------
const chips = (on, name) => `<div class="chips fchips" data-name="${name}">${members().map(m => `<button class="chip${on.includes(m.id) ? ' on' : ''}" data-fam="tog" data-id="${m.id}">${esc(nameOf(m.id))}</button>`).join('')}</div>`;
const picked = () => [...document.querySelectorAll('.fchips .chip.on')].map(b => b.dataset.id);
function openUpload() {
  pending = undefined;
  openSheet(`<h3>가족 사진 올리기</h3>
    <div class="field"><span>사진에 누가 나왔나요? (여러 명)</span>${chips(F.sel ? [F.sel] : [], 'up')}</div>
    <p class="hint">찍은 날짜는 사진에서 알아서 읽어요. 앱을 나갔다 와도 이어서 올려요.</p>
    <p class="err" id="fu-err"></p>
    <div class="actions"><button class="secondary" data-act="close">취소</button><label class="primary" style="display:grid;place-items:center;cursor:pointer">사진 고르기<input type="file" id="fu-files" accept="image/*" multiple hidden></label></div>`);
}
function openPerson(id) {
  const x = id ? (S.people || []).find(p => p.id === id) : { name: '', rel: '' }; if (!x) return;
  pending = undefined;
  openSheet(`<h3>${id ? '가족 정보 수정' : '가족 추가'}</h3>
    <div class="field"><span>관계</span><div class="chips" id="fp-rels">${RELS.map(r => `<button class="chip${x.rel === r ? ' on' : ''}" data-fam="rel" data-v="${r}">${r}</button>`).join('')}</div></div>
    <label class="field"><span>이름·애칭 (선택)</span><input id="fp-name" maxlength="20" value="${esc(x.name || '')}" placeholder="예: 원주 할머니"></label>
    ${photoField(id ? safeImg(PHOTOS[id]) : '', '얼굴 사진 (선택)')}
    <p class="err" id="fp-err"></p>
    <div class="actions">${id ? `<button class="danger" data-fam="pdel" data-id="${id}">삭제</button>` : ''}<button class="secondary" data-act="close">취소</button><button class="primary" data-fam="psave" data-id="${id || ''}">저장</button></div>`);
}
function openPhoto(id) {
  const m = S.moments.find(x => x.id === id); if (!m) return;
  pending = undefined;
  openSheet(`<h3>가족 사진</h3>
    <img class="bigimg" src="${safeImg(PHOTOS[id]) || ''}" alt="" style="max-height:38vh;object-fit:contain">
    <div class="field"><span>누가 나왔나요?</span>${chips(whoOf(m), 'edit')}</div>
    <label class="field"><span>설명 (선택)</span><input id="ff-title" maxlength="30" value="${esc(m.title || '')}" placeholder="예: 추석 할머니 댁"></label>
    <label class="field"><span>날짜</span><input id="ff-date" type="date" value="${m.date}" min="${S.profile.birth}" max="${today()}"></label>
    <p class="err" id="ff-err"></p>
    <div class="actions"><button class="danger" data-act="delmom" data-id="${id}">삭제</button><button class="secondary" data-act="close">취소</button><button class="primary" data-fam="fsave" data-id="${id}">저장</button></div>`);
}

document.addEventListener('change', e => {
  if (e.target.id !== 'fu-files') return;
  const files = [...e.target.files]; e.target.value = '';
  const who = picked();
  if (!files.length) return;
  closeSheet();
  ALBUM.queue(files, { type: 'fam', who: who.join(',') });
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-fam]'); if (!b) return;
  const id = b.dataset.id;
  switch (b.dataset.fam) {
    case 'pick': F.sel = F.sel === id ? '' : id; F.more = 30; render(); break;
    case 'add': openPerson(''); break;
    case 'edit': openPerson(id); break;
    case 'up': openUpload(); break;
    case 'more': F.more += 30; render(); break;
    case 'tog': b.classList.toggle('on'); break;
    case 'rel': document.querySelectorAll('#fp-rels .chip').forEach(c => c.classList.toggle('on', c === b)); break;
    case 'psave': {
      const rel = (document.querySelector('#fp-rels .chip.on') || {}).dataset?.v || '', name = document.getElementById('fp-name').value.trim();
      if (!rel && !name) { document.getElementById('fp-err').textContent = '관계나 이름을 알려 주세요'; return; }
      const o = { id: id || undefined, name: name || rel, rel: rel || '기타', by: myRole() };
      if (pending !== undefined) o.photo = pending;
      const res = await write('saveItem', 'people', o);
      if (res) { if (pending) PHOTOS[res.id] = pending; else if (pending === null) delete PHOTOS[res.id]; render(); closeSheet(); toast(id ? '수정했어요' : `${o.name}을(를) 수사팀에 추가했어요`); }
      break;
    }
    case 'pdel': {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = '한 번 더 누르면 삭제'; return; }
      if (await write('deleteItem', 'people', id)) { if (F.sel === id) F.sel = ''; closeSheet(); toast('삭제했어요 (사진은 그대로 있어요)'); }
      break;
    }
    case 'fsave': {
      const m = S.moments.find(x => x.id === id), d = document.getElementById('ff-date').value; if (!m) return;
      if (!d) { document.getElementById('ff-err').textContent = '날짜를 골라 주세요'; return; }
      const res = await write('saveItem', 'mom', { id, type: 'fam', of: '', who: picked().join(','), title: document.getElementById('ff-title').value.trim(), date: d, memo: m.memo || '', by: m.by || myRole() });
      if (res) { closeSheet(); toast('저장했어요'); }
      break;
    }
  }
});

const css = document.createElement('style');
css.textContent = `
.fcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
.fcard{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;background:#FFFDF7;border:1.5px solid var(--line);border-radius:16px;padding:10px 4px 8px;box-shadow:0 2px 0 var(--line)}
.fcard.on{border:2.5px solid var(--red);background:#FFF3EF}
.fcard b{font-size:14px;margin-top:4px;color:var(--navy);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fcard small{font-size:11px;color:var(--muted)}.fcard .fn{color:var(--red);font-weight:700}
.fav{display:grid;place-items:center;border-radius:50%;object-fit:cover;overflow:hidden;background:#FCEBD3;border:2px solid #fff;box-shadow:0 2px 5px rgba(43,38,34,.18);flex-shrink:0}
.ftxt{font-family:var(--display);color:var(--navy);width:54px;height:54px;font-size:20px}
.fadd{border-style:dashed;background:none;box-shadow:none}.fadd .fav{background:var(--card2);box-shadow:none}
.fbest{position:absolute;top:4px;right:4px;font-style:normal;font-size:10px;font-weight:700;color:#fff;background:var(--red);border-radius:99px;padding:0 6px;transform:rotate(8deg)}
.fselbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:10px 0 0;font-size:13.5px}
.fselbar .ghost{min-height:30px;padding:2px 10px;font-size:12px}
.fwho{position:absolute;left:4px;bottom:4px;display:flex;gap:2px}
.fwho i{font-style:normal;font-size:10px;font-weight:700;color:var(--navy);background:rgba(255,253,247,.92);border-radius:99px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 4px}
.fchips .chip.on,#fp-rels .chip.on{background:var(--navy);color:#fff;border-color:var(--navy)}`;
document.head.appendChild(css);

window.FAMILY = { render: render_, openPhoto, nameOf, whoOf };
})();
