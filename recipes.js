// 이유식 표준레시피 — 센터 엑셀(초기·중기·후기 시트)을 앱에서 읽어 정리하고 보기 좋게 보여줘요
// 저장: Firestore families/{fid}/recipes/{YYYY-MM} (app.js의 saveRecipe), 원본 칸 그대로 두고 화면에서 다듬어요
(function () {
const R = { stage: '', mult: 1 };
// 식품 알레르기 표시 번호 (식품 등의 표시기준)
const AL = { 1: '난류', 2: '우유', 3: '메밀', 4: '땅콩', 5: '대두', 6: '밀', 7: '고등어', 8: '게', 9: '새우', 10: '돼지고기', 11: '복숭아', 12: '토마토', 13: '아황산류', 14: '호두', 15: '닭고기', 16: '쇠고기', 17: '오징어', 18: '조개류', 19: '잣' };
const STAGE_ORDER = ['초기', '중기', '후기', '완료기'];

// ---------- 엑셀 읽기 ----------
function loadZip() {
  if (window.JSZip) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = res; s.onerror = () => rej(new Error('엑셀을 여는 도구를 불러오지 못했어요')); document.head.appendChild(s); });
}
const clean = s => String(s || '').replace(/_x000D_/g, '').replace(/\r/g, '').trim();
const colOf = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
async function parseXlsx(file) {
  await loadZip();
  const z = await window.JSZip.loadAsync(file), X = s => new DOMParser().parseFromString(s, 'application/xml');
  const read = async p => { const f = z.file(p); return f ? X(await f.async('string')) : null; };
  const ssDoc = await read('xl/sharedStrings.xml');
  const ss = ssDoc ? [...ssDoc.getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
  const wb = await read('xl/workbook.xml'), rels = await read('xl/_rels/workbook.xml.rels');
  if (!wb || !rels) throw new Error('엑셀(.xlsx) 파일이 아니에요');
  const target = {};
  [...rels.getElementsByTagName('Relationship')].forEach(r => { target[r.getAttribute('Id')] = r.getAttribute('Target'); });
  const out = { title: '', monthNo: 0, stages: [] };
  for (const sh of wb.getElementsByTagName('sheet')) {
    const t = target[sh.getAttribute('r:id')] || '', doc = await read('xl/' + t.replace(/^\/?xl\//, ''));
    if (!doc) continue;
    // 행 → {열번호: 값}
    const rows = [...doc.getElementsByTagName('row')].map(row => {
      const o = {};
      for (const c of row.getElementsByTagName('c')) {
        const v = c.getElementsByTagName('v')[0], is = c.getElementsByTagName('is')[0];
        let val = c.getAttribute('t') === 's' ? ss[+(v && v.textContent)] : c.getAttribute('t') === 'inlineStr' ? (is ? is.textContent : '') : (v ? v.textContent : '');
        val = clean(val); if (val !== '') o[colOf(c.getAttribute('r'))] = val;
      }
      return o;
    });
    // 제목(몇 월)과 단계(초기·중기·후기)
    const top = rows.slice(0, 4).flatMap(r => Object.values(r)).join(' ');
    const mm = /(\d{1,2})\s*월/.exec(top); if (mm && !out.monthNo) { out.monthNo = +mm[1]; out.title = (top.match(/\d{1,2}\s*월[^()\n]*/) || [''])[0].trim(); }
    const stage = STAGE_ORDER.find(k => (sh.getAttribute('name') + ' ' + top).includes(k)) || sh.getAttribute('name');
    // 머리줄(날짜·음식명·식재료명…)을 찾아 열 위치를 정해요
    const hi = rows.findIndex(r => Object.values(r).includes('음식명'));
    if (hi < 0) continue;
    const H = {}; Object.entries(rows[hi]).forEach(([c, v]) => { H[v.replace(/\s|\(.*\)/g, '')] = +c; });
    const C = { date: H['날짜'], meal: H['끼니'], name: H['음식명'], ing: H['식재료명'], g: H['식재료량'], how: H['조리방법'], src: H['작성센터'], src2: H['출처'] };
    const items = []; let cur = null;
    rows.slice(hi + 1).forEach(r => {
      if (r[C.name]) {
        cur = { day: r[C.date] || '', meal: r[C.meal] || '', raw: r[C.name], ing: [], how: r[C.how] || '', src: r[C.src] || r[C.src2] || '' };
        items.push(cur);
      }
      if (cur && r[C.ing]) cur.ing.push({ n: r[C.ing], g: isNaN(+r[C.g]) ? r[C.g] || '' : +r[C.g] });
      if (cur && !cur.src && (r[C.src] || r[C.src2])) cur.src = r[C.src] || r[C.src2];
    });
    if (items.length) out.stages.push({ stage, items });
  }
  if (!out.stages.length) throw new Error('레시피 표를 찾지 못했어요. 센터 표준레시피 엑셀이 맞는지 확인해 주세요');
  return out;
}
// "01[화]" → 날짜, 선택한 달에 가장 가까운 연도로
function pickMonth(monthNo, ym) {
  const [y, m] = ym.split('-').map(Number);
  if (!monthNo) return ym;
  const cands = [y - 1, y, y + 1].map(yy => ({ yy, d: Math.abs((yy * 12 + monthNo) - (y * 12 + m)) })).sort((a, b) => a.d - b.d);
  return `${cands[0].yy}-${String(monthNo).padStart(2, '0')}`;
}
function toDoc(parsed, month, file) {
  return {
    month, title: parsed.title, file: file.name,
    stages: parsed.stages.map(s => ({ stage: s.stage, items: s.items.map(it => {
      const dn = /^(\d{1,2})/.exec(it.day);
      return { d: dn ? `${month}-${dn[1].padStart(2, '0')}` : '', meal: it.meal, raw: it.raw, ing: it.ing, how: it.how, src: it.src };
    }) }))
  };
}

// ---------- 다듬기 (원본은 그대로 두고 보여줄 때만) ----------
const allergyOf = raw => [...String(raw).matchAll(/[①-⑳]/g)].map(m => m[0].charCodeAt(0) - 0x245F);
const dishName = raw => String(raw).replace(/^\s*\([^)]*\)\s*/, '').replace(/[①-⑳]/g, '').trim();
const SKIP = /^(생것|말린것|구운것|데친것|삶은것|냉동|냉장|생)$/;
// "호박, 단호박, 생것" → 단호박 / "소고기_한우(1등급)_안심(안심살)_생것" → 소고기 (한우 1등급, 안심)
function ingName(n) {
  const t = String(n).split(/[_,]/).map(x => x.trim()).filter(x => x && !SKIP.test(x));
  if (!t.length) return { name: n, sub: '' };
  let name = t[0], rest = t.slice(1);
  if (rest[0] && !/[\s()]/.test(rest[0]) && rest[0] !== name && rest[0].endsWith(name)) { name = rest[0]; rest = rest.slice(1); }
  if (name === '달걀' && rest[0] === '난황') { name = '달걀노른자'; rest = rest.slice(1); }
  return { name, sub: rest.map(x => x.replace(/\(([^)]*)\)/g, ' $1').replace(/\s+/g, ' ').trim()).join(', ') };
}
const steps = how => clean(how).split('\n').map(x => x.replace(/^\s*(?:[①-⑳]|\d+\s*[.)])\s*/, '').trim()).filter(Boolean);
// 급식 수사(식재료 심문)와 맞춰 보기: 통과 / 혐의 / 처음
const KEYS = { '멥쌀': ['쌀'], '찹쌀': ['찹쌀', '쌀'], '달걀노른자': ['달걀', '계란', '노른자'], '달걀': ['달걀', '계란'], '소고기': ['소고기', '쇠고기'], '닭고기': ['닭'], '명태': ['명태', '동태', '흰살생선', '생선'], '대구': ['대구', '흰살생선', '생선'], '임연수어': ['임연수', '흰살생선', '생선'] };
function foodStatus(name) {
  const keys = KEYS[name] || [name], fs = (S.foods || []).filter(f => keys.some(k => f.name.includes(k) || k.includes(f.name)));
  if (fs.some(f => f.result === '혐의')) return 'bad';
  if (fs.some(f => f.result === '통과')) return 'ok';
  if (fs.length) return 'test';
  return 'new';
}
const ST_LABEL = { ok: '통과', bad: '혐의', test: '심문 중', new: '처음' };

const monthDoc = ym => (S.recipes || []).find(r => r.month === ym);
function defaultStage(doc) {
  const have = doc.stages.map(s => s.stage);
  if (R.stage && have.includes(R.stage)) return R.stage;
  const [mo] = monthsDays(S.profile.birth, today()), st = stageOf(mo);
  const want = st ? st[0] : mo < 4 ? '초기' : '후기';
  return have.includes(want) ? want : have[0];
}
// 같은 메뉴가 여러 날 나오면 한 장으로 묶어요
function grouped(stage) {
  const map = new Map();
  stage.items.forEach((it, i) => {
    const k = dishName(it.raw);
    if (!map.has(k)) map.set(k, { key: k, idx: i, it, dates: [] });
    if (it.d) map.get(k).dates.push(it.d);
  });
  return [...map.values()];
}

// ---------- 화면 ----------
const fmtD = d => { const [, m, dd] = d.split('-').map(Number); return `${m}/${dd}`; };
function foodHtml(ym) {
  const doc = monthDoc(ym);
  const up = `<label class="addperiod rup">${doc ? '레시피 엑셀 다시 올리기' : '+ 표준레시피 엑셀 올리기'}<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-r="file" hidden></label>`;
  if (!doc) return `<div class="rbox"><p class="vempty">센터 게시판의 표준레시피 엑셀(.xlsx)을 올리면 단계별 레시피로 정리해 보여줘요.</p>${up}</div>`;
  const cnt = doc.stages.map(s => `${esc(s.stage)} ${grouped(s).length}`).join(' · ');
  return `<div class="rbox"><button class="nextcard" data-r="open"><span><small>${esc(doc.title || '표준레시피')}</small><span class="t">이유식 표준레시피</span><small>${cnt}가지</small></span><span class="d">보기</span></button>${up}</div>`;
}
function renderRecipes() {
  const ym = curMenuMonth(), doc = monthDoc(ym), [yy, mm] = ym.split('-').map(Number);
  const head = `<header class="vhead"><span class="no">급식 수사 · 센터 식단</span><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h1>표준레시피</h1><button class="ghost" data-act="tab" data-v="food">← 급식 수사</button></div>
    <p class="mnav" style="margin-top:4px"><button data-r="mon" data-v="-1" aria-label="이전 달">◀</button><b>${yy}.${mm}</b><button data-r="mon" data-v="1" aria-label="다음 달">▶</button></p></header>`;
  if (!doc) return head + `<p class="vempty" style="margin-top:14px">이 달 레시피가 없어요.</p>${foodHtml(ym)}`;
  const stName = defaultStage(doc), st = doc.stages.find(s => s.stage === stName), t = today();
  const seg = `<div class="seg" style="margin-top:14px">${doc.stages.map(s => `<button class="${s.stage === stName ? 'on' : ''}" data-r="stage" data-v="${esc(s.stage)}">${esc(s.stage)}</button>`).join('')}</div>`;
  const G = grouped(st), todayG = G.find(g => g.dates.includes(t));
  const card = g => {
    const al = allergyOf(g.it.raw), news = g.it.ing.map(x => ingName(x.n).name).filter((n, i, a) => a.indexOf(n) === i).map(n => [n, foodStatus(n)]).filter(([, s]) => s !== 'ok');
 return `<button class="rcard${todayG === g ? ' today' : ''}" data-r="dish" data-v="${g.idx}">
      <span class="rtop"><b>${esc(g.key)}</b>${al.length ? `<span class="ral">${al.map(n => esc(AL[n] || n)).join('·')}</span>` : ''}</span>
      <small>${g.dates.map(fmtD).join(' · ')}${g.it.meal ? ' ' + esc(g.it.meal) : ''} · 재료 ${g.it.ing.length}가지</small>
      ${news.length ? `<span class="rnew">${news.map(([n, s]) => `<i class="${s}">${ST_LABEL[s]} ${esc(n)}</i>`).join('')}</span>` : ''}
    </button>`;
  };
  return head + seg +
    (todayG ? `<h2 class="subh" style="margin-top:16px">오늘 센터 메뉴</h2>${card(todayG)}` : '') +
    `<h2 class="subh" style="margin-top:16px">${esc(stName)} 레시피 ${G.length}가지</h2>${G.filter(g => g !== todayG).map(card).join('')}
    <p class="foot">① 같은 번호는 알레르기 유발 식품 표시예요. "처음"은 급식 수사에서 아직 심문하지 않은 재료예요.<br>원본: ${esc(doc.file || '')}${doc.by ? `, ${esc(doc.by)} 수사관이 올림` : ''}</p>
    ${foodHtml(ym)}
    <button class="danger" data-r="del" style="margin-top:6px">이 달 레시피 지우기</button>`;
}
function openDish(idx) {
  const doc = monthDoc(curMenuMonth()), st = doc && doc.stages.find(s => s.stage === defaultStage(doc)), it = st && st.items[idx];
  if (!it) return;
  const name = dishName(it.raw), al = allergyOf(it.raw), dates = st.items.filter(x => dishName(x.raw) === name && x.d).map(x => x.d);
  const rows = it.ing.map(x => {
    const nm = ingName(x.n), s = foodStatus(nm.name), g = typeof x.g === 'number' ? +(x.g * R.mult).toFixed(1) + 'g' : esc(x.g);
    return `<tr><td><b>${esc(nm.name)}</b>${nm.sub ? `<small>${esc(nm.sub)}</small>` : ''}</td><td class="rg">${g}</td><td><i class="rst ${s}">${ST_LABEL[s]}</i></td></tr>`;
  }).join('');
  const ss = steps(it.how);
  openSheet(`<h3>${esc(name)}</h3>
    <p class="hint" style="margin:-10px 0 10px">${esc(defaultStage(doc))} · ${dates.map(fmtD).join(', ')}${it.meal ? ' ' + esc(it.meal) : ''}</p>
    ${al.length ? `<p class="ralrow">${al.map(n => `<span class="ral">${String.fromCharCode(0x245F + n)} ${esc(AL[n] || '')}</span>`).join('')}</p>` : ''}
    <div class="rmult"><span>재료량</span><div class="cnt"><button data-r="mult" data-v="-1" aria-label="줄이기">−</button><b>×${R.mult}</b><button data-r="mult" data-v="1" aria-label="늘리기">+</button></div><small>${R.mult > 1 ? `${R.mult}회분 (큐브 만들 때)` : '1회분 (센터 기준 1인분)'}</small></div>
    <table class="ringt">${rows}</table>
    ${ss.length ? `<h4 class="rh">조리 순서</h4><ol class="rsteps">${ss.map((x, i) => `<li><i>${String.fromCharCode(0x2460 + Math.min(i, 19))}</i>${esc(x)}</li>`).join('')}</ol>` : ''}
    <p class="foot" style="margin-top:6px">${it.src ? '작성: ' + esc(it.src) + '. ' : ''}센터 표준레시피 기준이에요. 처음 먹는 재료는 한 번에 하나씩 3일 관찰해요.</p>
    <div class="actions"><button class="secondary" data-act="close">닫기</button><button class="primary" data-r="meal" data-v="${esc(name)}">급식 기록하기</button></div>`);
  $sheet.dataset.dish = idx;
}

// ---------- 동작 ----------
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-r]'); if (!b || b.tagName === 'INPUT') return;
  const v = b.dataset.v;
  switch (b.dataset.r) {
    case 'open': S.tab = 'food'; S.view = 'recipe'; render(); window.scrollTo(0, 0); break;
    case 'mon': S.menuMonth = shiftMonth(curMenuMonth(), +v); render(); break;
    case 'stage': R.stage = v; render(); break;
    case 'dish': R.mult = 1; openDish(+v); break;
    case 'mult': R.mult = Math.min(20, Math.max(1, R.mult + +v)); openDish(+$sheet.dataset.dish); break;
    case 'meal': closeSheet(); openMeal(null); setTimeout(() => { const el = document.getElementById('ml-menu'); if (el) el.value = v; }, 0); break;
    case 'del': {
      const ym = curMenuMonth();
      if (confirm(`${ym.replace('-', '년 ')}월 표준레시피를 지울까요? 가족 모두에게서 지워져요.`) && await write('deleteRecipe', ym)) toast('레시피를 지웠어요');
      break;
    }
  }
});
document.addEventListener('change', async e => {
  const inp = e.target; if (!inp.dataset || inp.dataset.r !== 'file' || !inp.files[0]) return;
  const file = inp.files[0]; inp.value = '';
  try {
    toast('엑셀 읽는 중…');
    const p = await parseXlsx(file), month = pickMonth(p.monthNo, curMenuMonth()), [yy, mm] = month.split('-');
    const cnt = p.stages.map(s => `${s.stage} ${grouped(s).length}가지`).join(', ');
    if (monthDoc(month) && !confirm(`${yy}년 ${+mm}월 레시피가 이미 있어요. 새 파일로 바꿀까요?`)) return;
    if (!confirm(`${yy}년 ${+mm}월 표준레시피로 저장할게요.\n${cnt}`)) return;
    if (await write('saveRecipe', toDoc(p, month, file))) { S.menuMonth = month; S.tab = 'food'; S.view = 'recipe'; R.stage = ''; render(); window.scrollTo(0, 0); toast('레시피를 정리해서 저장했어요'); }
  } catch (x) { console.error(x); toast('레시피를 읽지 못했어요: ' + ((x && x.message) || '')); }
});

const css = document.createElement('style');
css.textContent = `
.rbox{margin-top:12px}.rbox .nextcard{margin-bottom:8px}
.rup{display:flex;align-items:center;justify-content:center;cursor:pointer;margin-top:8px}
.rcard{display:flex;flex-direction:column;gap:4px;width:100%;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:4px;padding:12px 14px;margin-top:10px}
.rcard.today{border:2px solid var(--red);background:#FFFDF7}
.rcard .rtop{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.rcard b{font-family:var(--display);font-weight:400;font-size:18px;color:var(--navy);line-height:1.25;word-break:keep-all}
.rcard small{font-size:12px;color:var(--muted)}
.ral{display:inline-block;font-size:11px;color:var(--red);border:1px solid var(--red);border-radius:3px;padding:0 5px;white-space:nowrap}
.ralrow{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 10px}
.rnew{display:flex;flex-wrap:wrap;gap:4px}
.rnew i,.rst{font-style:normal;font-size:11px;border-radius:3px;padding:1px 6px;white-space:nowrap}
.rnew i.new,.rst.new{background:var(--navy);color:var(--paper)}.rnew i.bad,.rst.bad{background:var(--red);color:#fff}.rnew i.test,.rst.test{border:1px dashed var(--navy);color:var(--navy)}.rst.ok{color:var(--muted);border:1px solid var(--line)}
.rmult{display:flex;align-items:center;gap:10px;margin:0 0 8px;font-size:13px}.rmult small{color:var(--muted);font-size:12px}
.ringt{width:100%;border-collapse:collapse;font-size:14px;margin-bottom:12px;border-top:2px solid var(--ink)}
.ringt td{padding:7px 2px;border-bottom:1px dashed var(--line);vertical-align:top}
.ringt td small{display:block;font-size:11px;color:var(--muted)}
.ringt .rg{text-align:right;font-weight:700;white-space:nowrap;padding-right:10px}
.ringt td:last-child{text-align:right;width:52px}
.rh{font-family:var(--display);font-weight:400;font-size:17px;color:var(--navy);margin:4px 0 6px}
.rsteps{margin:0 0 8px;padding:0;list-style:none;font-size:14px;line-height:1.6}.rsteps li{display:flex;gap:6px;margin-bottom:6px}
.rsteps li i{font-style:normal;color:var(--red);font-weight:700;flex-shrink:0}`;
document.head.appendChild(css);

window.RECIPES = { render: renderRecipes, foodHtml };
})();
