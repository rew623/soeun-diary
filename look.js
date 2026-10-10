// 닮은꼴 판정단 — 하루 한 번 엄마·아빠가 "오늘 소은이는 누구 닮았나" 판정해요. 둘 다 판정하면 서로의 판정이 공개되고, 달마다 비율과 판결문이 나와요
// 저장: families/{fid}/look/{날짜_mom|dad} { date, pick: mom|dad|both, parts: 닮은 곳 id 쉼표로, by } — 오늘 판정은 몇 번이든 바꿀 수 있어요
// 그래프 색: 엄마 #D9546A · 반반 #CBC2B4(가운데 회색) · 아빠 #3F6FA8 (엄마↔아빠 양쪽으로 갈리는 막대, 색약 검사 통과, 글자로도 같이 적어요)
(function () {
const L = { ym: '', parts: new Set() };
const PARTS = [['eyes', '눈'], ['brow', '눈썹'], ['nose', '코'], ['mouth', '입'], ['face', '얼굴형'], ['ear', '귀'], ['hair', '머리카락'], ['smile', '웃는 모습'], ['sleep', '잠버릇'], ['mood', '성격']];
const PN = Object.fromEntries(PARTS);
const PICK = { mom: '엄마 닮음', both: '반반', dad: '아빠 닮음' };
const PI = { mom: '👩', both: '⚖️', dad: '👨' };
const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); };
const rk = r => r === '엄마' ? 'mom' : r === '아빠' ? 'dad' : '';
const WDK = '일월화수목금토';
const md = d => `${+d.slice(5, 7)}월 ${+d.slice(8)}일 (${WDK[new Date(pd(d)).getUTCDay()]})`;
const votes = () => (S.looks || []).filter(x => x.date && PICK[x.pick] && (x.by === '엄마' || x.by === '아빠'));
const of = (d, r) => votes().find(x => x.date === d && x.by === r);
const partsOf = x => String((x && x.parts) || '').split(',').filter(p => PN[p]);
const canVote = () => !(S.me && S.me.viewer);

// ---------- 한 달 모아 보기 ----------
function stat(V) {
  const c = { mom: 0, dad: 0, both: 0 }, parts = {};
  V.forEach(x => { c[x.pick]++; if (x.pick !== 'both') partsOf(x).forEach(p => { const o = parts[p] = parts[p] || { mom: 0, dad: 0 }; o[x.pick]++; }); });
  const n = V.length, pm = n ? Math.round(c.mom / n * 100) : 0, pdd = n ? Math.round(c.dad / n * 100) : 0;
  return { n, c, parts, pm, pd: pdd, pb: n ? 100 - pm - pdd : 0 };
}
// 오늘 판정은 둘 다 할 때까지 통계에서도 빼요 (숫자로 상대 판정을 짐작하지 않게)
const counted = () => { const t = today(), open = of(t, '엄마') && of(t, '아빠'); return votes().filter(x => x.date !== t || open); };
const monthStat = ym => Object.assign(stat(counted().filter(x => x.date.slice(0, 7) === ym)), { ym });
// 엄마 ← 반반 → 아빠 막대 (조각 사이 2px 틈, 끝은 둥글게)
const bar = (st, sm) => st.n ? `<div class="lkbar${sm ? ' sm' : ''}" role="img" aria-label="엄마 닮음 ${st.pm}%, 반반 ${st.pb}%, 아빠 닮음 ${st.pd}%">${['mom', 'both', 'dad'].filter(k => st.c[k]).map(k => `<i class="${k}" style="flex:${st.c[k]}" title="${PICK[k]} ${st.c[k]}표"></i>`).join('')}</div>` : `<div class="lkbar${sm ? ' sm' : ''} empty" role="img" aria-label="아직 판정 없음"></div>`;
const legend = st => `<div class="lklegend"><span><i class="mom"></i>엄마 닮음 <b>${st.pm}%</b> <small>${st.c.mom}표</small></span><span><i class="both"></i>반반 <b>${st.pb}%</b> <small>${st.c.both}표</small></span><span><i class="dad"></i>아빠 닮음 <b>${st.pd}%</b> <small>${st.c.dad}표</small></span></div>`;

// ---------- 판결문 ----------
function verdict(st) {
  if (st.n < 2) return null;
  const nick = CV.nick(), m = +st.ym.slice(5), diff = st.pm - st.pd, win = diff > 0 ? '엄마' : diff < 0 ? '아빠' : '', subj = josa(nick, '은', '는');
  const top = side => Object.entries(st.parts).filter(([, o]) => o[side] > 0).sort((a, b) => b[1][side] - a[1][side]).slice(0, 2).map(([p, o]) => `${PN[p]}(${o[side]}표)`);
  const tm = top('mom'), td = top('dad');
  const title = !win ? '반반 공동 소유' : Math.abs(diff) >= 30 ? `${win} 판박이` : `${win} 우세`;
  const main = !win ? `피고 ${subj} ${m}월 한 달 동안 엄마·아빠 수사관을 똑같이 닮았으므로 '반반 공동 소유'로 판결한다.`
    : Math.abs(diff) >= 30 ? `피고 ${subj} ${m}월 한 달 동안 ${win} 수사관과 ${win === '엄마' ? st.pm : st.pd}% 일치하므로 '${win} 판박이'로 판결한다.`
    : `피고 ${subj} ${m}월 한 달 동안 ${win} 수사관 쪽으로 조금 더 기울었으므로 '${win} 우세'로 판결한다.`;
  const ev = [tm.length ? `엄마의 ${tm.join('·')}` : '', td.length ? `아빠의 ${td.join('·')}` : ''].filter(Boolean);
  const closers = ['단, 귀여움은 피고 본인의 것으로 인정한다.', '이의가 있는 수사관은 뽀뽀 열 번으로 항소할 수 있다.', '다음 달 재판에서 다시 다투기로 한다.', '패소한 수사관은 오늘 밤 재우기 당번을 맡는다.', '판결에 불복하면 볼 비비기 형에 처한다.', '양측 수사관은 판결을 기념해 사진 한 장을 남긴다.'];
  return { title, main, evidence: ev.length ? `결정적 증거: ${ev.join(', ')}.` : '', closer: closers[hash(st.ym + nick) % closers.length] };
}
const vbox = (st, v) => v ? `<div class="lkverdict"><span class="lkvno">사건 ${st.ym.replace('-', '-닮-')}호 · 판결문</span><b>${esc(v.title)}</b><p><em>주문</em>${esc(v.main)}</p>${v.evidence ? `<p>${esc(v.evidence)}</p>` : ''}<p>${esc(v.closer)}</p><span class="lkvstamp">판결</span></div>` : '<p class="vempty">이번 달 판정이 2표 이상 모이면 판결문이 나와요.</p>';

// ---------- 오늘 판정 ----------
function todayPhoto() { const p = CV.photos()[0]; return p ? safeImg(PHOTOS[p.id]) : ''; }
function todayHtml(big) {
  const t = today(), me = myRole(), other = me === '엄마' ? '아빠' : '엄마', mo = of(t, '엄마'), da = of(t, '아빠'), mine = me ? of(t, me) : null;
  const pz = x => partsOf(x).length ? ` <small>(${partsOf(x).map(p => PN[p]).join('·')})</small>` : '';
  const who = (r, x, hide) => `<span class="lkwho"><b>${r} 수사관</b>${!x ? '<small>아직</small>' : hide ? '판정 완료 🤫' : `${PI[x.pick]} ${PICK[x.pick]}${pz(x)}`}</span>`;
  const ph = todayPhoto();
  let body;
  if (mo && da) {
    const same = mo.pick === da.pick, res = same ? (mo.pick === 'both' ? '만장일치! 오늘은 딱 반반 ⚖️' : `만장일치! 오늘은 ${mo.pick === 'mom' ? '엄마' : '아빠'} 판박이 ${PI[mo.pick]}`) : '의견 불일치! 오늘 판결은 보류 🤔';
    body = `<div class="lkreveal">${who('엄마', mo)}${who('아빠', da)}</div><p class="lkres">오늘의 판결: <b>${res}</b></p>${me && canVote() ? `<div class="lkacts">${mine && mine.pick !== 'both' ? `<button class="ghost" data-lk="parts">${partsOf(mine).length ? '닮은 곳 고치기' : '어디가 닮았나요?'}</button>` : ''}<button class="ghost" data-lk="pick-open">판정 바꾸기</button></div>` : ''}`;
  } else if (mine && canVote()) {
    body = `<p class="lkmine">내 판정: <b>${PI[mine.pick]} ${PICK[mine.pick]}</b>${pz(mine)}</p>
      <p class="lkwait">${other} 수사관이 판정하면 서로 공개돼요 🤫</p>
      <div class="lkacts">${mine.pick !== 'both' ? `<button class="ghost" data-lk="parts">${partsOf(mine).length ? '닮은 곳 고치기' : '어디가 닮았나요?'}</button>` : ''}<button class="ghost" data-lk="pick-open">판정 바꾸기</button></div>`;
  } else if (me && canVote()) {
    body = `<p class="lkq">오늘 ${esc(josa(CV.nick(), '은', '는'))} 누구를 닮았나요?</p>
      <div class="lkpicks">${['mom', 'both', 'dad'].map(k => `<button class="lkp ${k}" data-lk="pick" data-v="${k}"><span>${PI[k]}</span>${PICK[k]}</button>`).join('')}</div>
      ${of(t, other) ? `<p class="lkwait">${other} 수사관은 판정 완료 🤫 내가 판정하면 공개돼요</p>` : ''}`;
  } else {
    body = `<div class="lkreveal">${who('엄마', mo, true)}${who('아빠', da, true)}</div><p class="lkwait">엄마·아빠 둘 다 판정하면 공개돼요</p>`;
  }
  return `<div class="lktoday${big ? ' big' : ''}">${ph ? `<button class="lkph" data-view="${CV.photos()[0].id}" aria-label="오늘의 증거 사진 크게 보기"><img src="${ph}" alt="" loading="lazy" decoding="async"><small>증거 사진</small></button>` : ''}<div class="lkbody">${body}</div></div>`;
}

// ---------- 성장 수사 탭 카드 ----------
function card() {
  if (!S.profile || !S.profile.birth) return '';
  const st = monthStat(today().slice(0, 7));
  return `<section class="lkcard"><h2 class="sh"><span>🔍 닮은꼴 판정단</span><span>하루 한 번</span></h2>
    ${todayHtml(false)}
    <button class="lkmonth" data-lk="open"><span>${+today().slice(5, 7)}월 판정</span>${bar(st, true)}<span class="lkmt">${st.n ? `엄마 ${st.pm}% · 아빠 ${st.pd}%` : '아직 없어요'} ›</span></button>
  </section>`;
}

// ---------- 판정단 화면 (S.view='look') ----------
function render_() {
  const V = votes(), months = [...new Set(V.map(x => x.date.slice(0, 7)).concat(today().slice(0, 7)))].sort().reverse();
  const ym = months.includes(L.ym) ? L.ym : months[0], st = monthStat(ym), v = verdict(st), all = stat(counted());
  const days = [...new Set(V.filter(x => x.date.slice(0, 7) === ym).map(x => x.date))].sort().reverse();
  const partRows = Object.entries(st.parts).sort((a, b) => (b[1].mom + b[1].dad) - (a[1].mom + a[1].dad));
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>닮은꼴 판정단</h1><p>엄마·아빠 수사관이 하루 한 번 "오늘은 누구 닮았나" 판정해요. 둘 다 판정하면 서로 공개되고, 달마다 판결이 나와요.</p></header>
  <section><h2 class="sh"><span>오늘의 판정</span><span>${md(today())}</span></h2>${todayHtml(true)}</section>
  <section><h2 class="sh"><span>${+ym.slice(5)}월 판정 결과</span><span>${st.n}표</span></h2>
    ${months.length > 1 ? `<div class="chips lkms">${months.map(m => `<button class="chip${m === ym ? ' on' : ''}" data-lk="ym" data-v="${m}">${m.slice(0, 4) !== today().slice(0, 4) ? m.slice(2, 4) + '년 ' : ''}${+m.slice(5)}월</button>`).join('')}</div>` : ''}
    ${bar(st)}${legend(st)}
    ${vbox(st, v)}
    ${partRows.length ? `<h3 class="lkh3">닮은 곳 판정</h3><div class="lkparts">${partRows.map(([p, o]) => `<span><b>${PN[p]}</b>${o.mom ? `<em class="mom">엄마 ${o.mom}</em>` : ''}${o.dad ? `<em class="dad">아빠 ${o.dad}</em>` : ''}</span>`).join('')}</div>` : ''}
    ${days.length ? `<h3 class="lkh3">날마다 판정</h3><div class="lkdays">${days.map(d => { const m = of(d, '엄마'), a = of(d, '아빠'), hide = d === today() && !(m && a); return `<div class="lkday"><b>${md(d)}</b><span>${['엄마', '아빠'].map(r => { const x = r === '엄마' ? m : a; return x ? `${r} → ${hide && r !== myRole() ? '🤫' : PICK[x.pick]}` : `${r} → -`; }).join(' · ')}</span></div>`; }).join('')}</div>` : ''}
  </section>
  ${months.length > 1 || all.n ? `<section><h2 class="sh"><span>지금까지</span><span>총 ${all.n}표</span></h2>${bar(all)}${legend(all)}
    <div class="lkhist">${months.filter(m => monthStat(m).n).map(m => { const x = monthStat(m), vv = verdict(x); return `<button class="lkhrow" data-lk="ym" data-v="${m}"><b>${+m.slice(5)}월</b>${bar(x, true)}<small>${vv ? esc(vv.title) : x.n + '표'}</small></button>`; }).join('')}</div></section>` : ''}
  <button class="secondary" data-lk="close" style="width:100%;margin-top:16px">돌아가기</button>`;
}

// ---------- 저장 ----------
async function save(pick, parts) {
  const me = myRole(); if (!me) { toast('먼저 어느 수사관인지 골라 주세요'); if (typeof openRole === 'function') openRole(); return false; }
  const t = today(), ex = of(t, me), other = me === '엄마' ? '아빠' : '엄마';
  const keep = parts != null ? parts : (ex && ex.pick === pick ? partsOf(ex).join(',') : '');
  const res = await write('saveItem', 'look', { id: `${t}_${rk(me)}`, date: t, pick, parts: pick === 'both' ? '' : keep, by: me });
  if (!res) return false;
  const o = of(t, other);
  if (o && parts == null) { const same = o.pick === pick; setTimeout(() => toast(same ? `만장일치! ${other} 수사관도 ${PICK[pick]} ${PI[pick]}` : `${other} 수사관 판정은 ${PICK[o.pick]}! 의견이 갈렸어요`), 400); }
  else if (parts == null) toast(`판정 완료! ${other} 수사관이 판정하면 공개돼요`);
  return true;
}
function openParts() {
  const me = myRole(), ex = me && of(today(), me); if (!ex || ex.pick === 'both') return;
  L.parts = new Set(partsOf(ex));
  openSheet(`<h3>어디가 ${ex.pick === 'mom' ? '엄마' : '아빠'}를 닮았나요?</h3>
    <p class="hint">여러 개 골라도 돼요. 달마다 판결문의 증거가 돼요.</p>
    <div class="chips lkpc">${PARTS.map(([k, n]) => `<button class="chip${L.parts.has(k) ? ' on' : ''}" data-lk="part" data-v="${k}">${n}</button>`).join('')}</div>
    <div class="actions" style="margin-top:16px"><button class="secondary" data-act="close">취소</button><button class="primary" data-lk="parts-save">저장</button></div>`);
}
function openPick() {
  const me = myRole(), ex = me && of(today(), me);
  openSheet(`<h3>오늘 판정 바꾸기</h3>
    <div class="lkpicks">${['mom', 'both', 'dad'].map(k => `<button class="lkp ${k}${ex && ex.pick === k ? ' on' : ''}" data-lk="repick" data-v="${k}"><span>${PI[k]}</span>${PICK[k]}</button>`).join('')}</div>
    <div class="actions" style="margin-top:16px"><button class="secondary" data-act="close">닫기</button></div>`);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-lk]'); if (!b || b.disabled) return;
  const a = b.dataset.lk;
  if (a === 'open') { L.ym = ''; S.view = 'look'; render(); window.scrollTo(0, 0); return; }
  if (a === 'close') { S.view = ''; render(); window.scrollTo(0, 0); return; }
  if (a === 'ym') { L.ym = b.dataset.v; render(); return; }
  if (!canVote()) { toast('보기 전용이라 판정은 엄마·아빠 수사관만 할 수 있어요'); return; }
  if (a === 'pick') { b.disabled = true; await save(b.dataset.v); b.disabled = false; return; }
  if (a === 'repick') { closeSheet(); await save(b.dataset.v); return; }
  if (a === 'pick-open') { openPick(); return; }
  if (a === 'parts') { openParts(); return; }
  if (a === 'part') { const k = b.dataset.v; if (L.parts.has(k)) L.parts.delete(k); else L.parts.add(k); b.classList.toggle('on', L.parts.has(k)); return; }
  if (a === 'parts-save') { const ex = of(today(), myRole()); if (!ex) return; if (await save(ex.pick, [...L.parts].join(','))) { closeSheet(); toast('닮은 곳을 적었어요'); } }
});

const css = document.createElement('style');
css.textContent = `
.lktoday{display:flex;gap:12px;align-items:flex-start}
.lkph{flex:0 0 72px;border:0;background:#FFFDF7;padding:4px 4px 16px;box-shadow:0 3px 8px rgba(43,38,34,.18);transform:rotate(-3deg);position:relative}
.lkph img{display:block;width:64px;height:72px;object-fit:cover;object-position:center 25%}
.lkph small{position:absolute;left:0;right:0;bottom:1px;font-size:11px;color:var(--muted);text-align:center}
.lktoday.big .lkph{flex-basis:104px}.lktoday.big .lkph img{width:96px;height:110px}
.lkbody{flex:1;min-width:0}
.lkq{margin:0 0 8px;font-family:var(--display);font-size:17px;color:var(--navy)}
.lkpicks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.lkp{display:flex;flex-direction:column;align-items:center;gap:2px;border:2px solid var(--line);background:#FFFDF7;border-radius:16px;padding:8px 2px;font-size:13px;font-weight:700;color:var(--ink);min-height:62px}
.lkp span{font-size:22px;line-height:1.1}
.lkp.mom{border-color:#E9A2AE}.lkp.dad{border-color:#9DB4D3}.lkp.both{border-color:#CBC2B4}
.lkp.on{outline:3px solid var(--navy);outline-offset:1px}
.lkp:active{transform:translateY(2px)}
.lkmine{margin:0;font-size:14px}.lkmine b{font-family:var(--display);font-weight:400;font-size:17px;color:var(--navy)}
.lkwait{margin:6px 0 0;font-size:12px;color:var(--muted)}
.lkacts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.lkreveal{display:flex;flex-direction:column;gap:4px}
.lkwho{font-size:14px}.lkwho b{display:inline-block;min-width:76px;font-family:var(--display);font-weight:400;color:var(--navy)}
.lkwho small{color:var(--muted)}
.lkres{margin:8px 0 0;font-size:13px}.lkres b{color:var(--red)}
.lkchg{margin-top:6px;border:0;background:none;color:var(--muted);font-size:12px;text-decoration:underline;padding:4px 0}
.lkmonth{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;width:100%;margin-top:12px;border:0;border-top:1px dashed var(--line);background:none;padding:10px 0 0;font-size:12px;color:var(--ink);text-align:left}
.lkmt{color:var(--muted);white-space:nowrap}
.lkbar{display:flex;gap:2px;height:18px;margin:6px 0 8px}
.lkbar.sm{height:10px;margin:0}
.lkbar i{display:block;border-radius:4px;min-width:4px}
.lkbar.empty{background:#EFE6D8;border-radius:4px}
.lkbar i.mom,.lklegend i.mom{background:#D9546A}.lkbar i.both,.lklegend i.both{background:#CBC2B4}.lkbar i.dad,.lklegend i.dad{background:#3F6FA8}
.lklegend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px}
.lklegend span{display:inline-flex;align-items:center;gap:5px}
.lklegend i{width:12px;height:12px;border-radius:3px;display:inline-block}
.lklegend small{color:var(--muted)}
.lkms{margin-bottom:10px}
.lkms .chip.on{background:var(--navy);color:#fff}
.lkverdict{position:relative;margin-top:14px;background:#FFFDF7;border:1px solid var(--line);border-left:4px solid var(--navy);border-radius:10px;padding:12px 14px 14px;box-shadow:0 3px 8px rgba(43,38,34,.1)}
.lkvno{display:block;font-size:11px;color:var(--muted);letter-spacing:1px}
.lkverdict b{display:block;font-family:var(--display);font-weight:400;font-size:24px;color:var(--navy);margin:2px 0 6px}
.lkverdict p{margin:4px 0 0;font-size:14px;line-height:1.6;word-break:keep-all}
.lkverdict em{font-style:normal;font-size:11px;color:#fff;background:var(--navy);border-radius:99px;padding:1px 8px;margin-right:6px}
.lkvstamp{position:absolute;right:12px;top:10px;border:3px double var(--red);color:var(--red);font-family:var(--display);font-size:18px;padding:0 10px;border-radius:8px;transform:rotate(-12deg)}
.lkh3{font-size:13px;color:var(--navy);margin:16px 0 6px}
.lkparts{display:flex;flex-wrap:wrap;gap:6px}
.lkparts span{display:inline-flex;align-items:center;gap:5px;background:#FFFDF7;border:1px solid var(--line);border-radius:99px;padding:3px 10px;font-size:13px}
.lkparts em{font-style:normal;font-size:12px;padding:0 6px;border-radius:99px}
.lkparts em.mom{background:#F8D9DE}.lkparts em.dad{background:#D9E3F0}
.lkdays{display:flex;flex-direction:column}
.lkday{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px dashed var(--line);font-size:13px}
.lkday b{font-weight:400;color:var(--muted);white-space:nowrap}
.lkday span{text-align:right}
.lkhist{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.lkhrow{display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:10px;border:0;background:none;padding:4px 0;font-size:13px;text-align:left}
.lkhrow small{color:var(--muted)}
.lkpc .chip.on{background:var(--navy);color:#fff}`;
document.head.appendChild(css);
window.LOOK = { card, render: render_, monthStat, verdict, votes };
})();
