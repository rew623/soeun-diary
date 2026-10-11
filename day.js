// 하루 수사 — 수유·이유식·기저귀·잠·목욕·메모를 한곳에 (S.tab='day', 사용자 요청 2026.10.11: '꼬미의 하루'처럼 한 기능·한 탭으로)
// 일간: 기록(동그란 빠른 단추 + 시간순 목록, 진행 중 타이머) · 패턴(24시간 시계 + 하루 합계)
// 주간: 통계(날마다 막대 + 7일 평균 ↔ 최근 3일 평균) · 패턴(7일 × 24시간)
// 저장: families/{fid}/care/{YYYY-MM-DD} 의 items 맵 (app.js careSave/careDelete, 하루에 문서 하나)
//   이유식은 급식 수사의 급식 기록(meal — 먹인 시각 tm), 체온·투약·증상은 긴급 출동 기록(log)을 그대로 같이 보여 줘요 (기록은 하나 — 어디서 고쳐도 같게)
(function () {
const D = { mode: 'day', sub: { day: 'log', week: 'stat' }, date: '', wk: '', stat: 'formula', off: new Set(), sel: {}, tip: '', iv: 0 };
// 종류: 차트 색은 고정 순서 (색약 검사 통과 — 분유·모유·유축·이유식·소변·대변·수면·목욕), 글자는 늘 잉크색
const K = {
  formula: { n: '분유', i: '🍼', c: '#d45a0c' },
  breast: { n: '모유수유', i: '🤱', c: '#d63f86' },
  pump: { n: '유축수유', i: '🍶', c: '#7b52d6' },
  solid: { n: '이유식', i: '🥣', c: '#4a9614' },
  pee: { n: '소변', i: '💧', c: '#2a78d6' },
  poo: { n: '대변', i: '💩', c: '#b36a00' },
  sleep: { n: '수면', i: '😴', c: '#3f4cc0' },
  bath: { n: '목욕', i: '🛁', c: '#11958a' },
  memo: { n: '메모', i: '📝', c: '#8a7a55' },
  temp: { n: '체온', i: '🌡️', c: '#B3261E' }, med: { n: '투약', i: '💊', c: '#B3261E' }, sym: { n: '증상', i: '🤒', c: '#B3261E' }
};
const CHART = ['formula', 'breast', 'pump', 'solid', 'pee', 'poo', 'sleep', 'bath'];
// 5칸 × 2줄 (자주 쓰는 것 첫 줄, 옆으로 밀지 않아도 다 보여요)
const QUICK = [['formula', '🍼', '분유'], ['breast', '🤱', '모유수유'], ['solid', '🥣', '이유식'], ['diaper', '🧷', '소변/대변'], ['sleep', '😴', '수면'], ['pump', '🍶', '유축수유'], ['bath', '🛁', '목욕'], ['memo', '📝', '메모'], ['temp', '🌡️', '체온'], ['med', '💊', '투약']];
const PH = { memo: '기록하고 싶은 정보가 있다면 적어 주세요', formula: '예: 160 탔다가 130 먹음', pump: '예: 냉동 모유 데워서 먹임', breast: '예: 왼쪽 먹다가 잠듦', diaper: '예: 엉덩이가 살짝 빨개요', sleep: '예: 안아서 재움, 중간에 한 번 깸', bath: '예: 물 38도, 머리도 감김' };
const AMT = { 조금: '양 조금', 보통: '양 보통', 많이: '양 많이' }, STT = { 묽음: '묽은 변', 보통: '보통 변', 단단: '단단한 변', 설사: '설사' };
const SLOT_T = { 아침: '08:00', 점심: '12:00', 저녁: '18:00', 간식: '15:00' };
const p2 = n => String(n).padStart(2, '0');
const hmOf = d => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
const ymdOf = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const msOf = (date, t) => { const [y, m, d] = date.split('-').map(Number), [h, mi] = (t || '00:00').split(':').map(Number); return new Date(y, m - 1, d, h || 0, mi || 0).getTime(); };
const dayStart = date => msOf(date, '00:00');
const wdOf = date => '일월화수목금토'[new Date(msOf(date, '12:00')).getDay()];
const monday = date => { const w = new Date(msOf(date, '12:00')).getDay(); return addDays(date, -((w + 6) % 7)); };
const dLabel = date => { const [, m, d] = date.split('-').map(Number); return `${m}월 ${d}일 (${wdOf(date)})`; };
const wLabel = (a, b) => { const [, m1, d1] = a.split('-').map(Number), [, m2, d2] = b.split('-').map(Number); return m1 === m2 ? `${m1}월 ${d1}일 ~ ${d2}일` : `${m1}월 ${d1}일 ~ ${m2}월 ${d2}일`; };
const durTxt = min => { min = Math.max(0, Math.round(min)); const h = Math.floor(min / 60), m = min % 60; return h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`; };
const agoTxt = ms => { const m = Math.floor((Date.now() - ms) / 60000); return m < 1 ? '방금' : `${durTxt(m)} 전`; };
const canWrite = () => !(S.me && S.me.viewer);
const newCid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const $ = id => document.getElementById(id);
const num = v => { const n = parseFloat(String(v || '').replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; };

// ---------- 모든 기록을 한 줄로: 하루 수사(care) + 이유식(meal) + 긴급 출동(log) ----------
let EC = null;
function evs() {
  if (EC && EC.c === S.cares && EC.m === S.meals && EC.l === S.logs && !(S.cares || []).some(c => c.live)) return EC.v;
  const out = [];
  (S.cares || []).forEach(c => {
    if (!c.date || !c.t) return;
    const s = msOf(c.date, c.t); let e = null;
    if (c.live) e = Math.max(s, Date.now());
    else if (c.e) { e = msOf(c.date, c.e); if (e < s) e += 864e5; }
    else if (c.k === 'breast' && (+c.l || +c.r)) e = s + ((+c.l || 0) + (+c.r || 0)) * 60000;
    else if (c.k === 'bath' && +c.dur) e = s + c.dur * 60000;
    const kinds = c.k === 'diaper' ? [c.pee ? 'pee' : '', c.poo ? 'poo' : ''].filter(Boolean) : [c.k];
    out.push({ src: 'care', id: c.id, date: c.date, k: c.k, kinds: kinds.length ? kinds : ['pee'], t: c.t, s, e, raw: c });
  });
  (S.meals || []).forEach(m => { if (!m.date) return; const t = /^\d\d:\d\d/.test(m.tm || '') ? m.tm.slice(0, 5) : (SLOT_T[m.slot] || '12:00'); out.push({ src: 'meal', id: m.id, date: m.date, k: 'solid', kinds: ['solid'], t, s: msOf(m.date, t), e: null, raw: m, guess: !m.tm }); });
  (S.logs || []).forEach(l => { if (!/^\d{4}-\d{2}-\d{2}T\d\d:\d\d/.test(l.at || '')) return; const date = l.at.slice(0, 10), t = l.at.slice(11, 16), k = l.kind === 'temp' ? 'temp' : l.kind === 'med' ? 'med' : 'sym'; out.push({ src: 'log', id: l.id, date, k, kinds: [k], t, s: msOf(date, t), e: null, raw: l }); });
  out.sort((a, b) => a.s - b.s);
  EC = { c: S.cares, m: S.meals, l: S.logs, v: out }; return out;
}
const ofDay = date => evs().filter(e => e.date === date);
// 그날(0시~24시)에 잔 시간: 밤잠처럼 전날 시작한 것도 그날 몫만, 겹친 잠(두 사람이 같은 잠을 남긴 때 등)은 한 번만
function sleptMin(L, date) {
  const a = dayStart(date), b = a + 864e5, I = L.map(e => [Math.max(e.s, a), Math.min(e.e || e.s, b)]).filter(x => x[1] > x[0]).sort((x, y) => x[0] - y[0]);
  let sum = 0, cs = 0, ce = 0;
  I.forEach(([s, f]) => { if (s > ce) { sum += ce - cs; cs = s; ce = f; } else ce = Math.max(ce, f); });
  return (sum + ce - cs) / 60000;
}
// ---------- 수유 알람: 다음 수유 예정 (마지막 분유·모유·유축 + 낮/밤 간격, 두 폰 같이 game/shared feed) ----------
// 알림은 .github/workflows/feed.yml이 10분마다 확인해서 보내요 (.github/scripts/feed.mjs — 계산은 여기와 같게)
const FD = { on: 0, day: 4, night: 7, ns: '20:00', ne: '06:00', pre: 10 };
const feedCfg = () => Object.assign({}, FD, (window.GAME && GAME.store && GAME.store.get().feed) || {});
const inNight = (hm, c) => c.ns <= c.ne ? hm >= c.ns && hm < c.ne : hm >= c.ns || hm < c.ne;
function nextFeed() {
  const c = feedCfg(), L = evs().filter(e => e.src === 'care' && ['formula', 'breast', 'pump'].includes(e.k) && e.s <= Date.now()), last = L[L.length - 1];
  if (!last) return { c };
  const night = inNight(last.t, c); return { c, last, night, due: last.s + (night ? c.night : c.day) * 36e5 };
}
const leftTxt = due => { const m = Math.round((due - Date.now()) / 60000); return m >= 0 ? `${durTxt(m)} 남음` : `${durTxt(-m)} 지났어요`; };
function feedBar() {
  const f = nextFeed(), c = f.c;
  if (!f.last) return `<button class="dynext" data-dy="feedset"><span>⏰</span><div><small>수유 알람 ${c.on ? '켬' : '꺼짐'}</small><b class="sm">분유·모유를 남기면 다음 수유 시각을 알려 줘요</b></div><i>⚙️</i></button>`;
  const d = new Date(f.due), dd = ymdOf(d), when = (dd === today() ? '' : dd > today() ? '내일 ' : '') + hmOf(d), late = f.due < Date.now();
  return `<button class="dynext${late ? ' late' : ''}" data-dy="feedset"><span>⏰</span><div><small>다음 수유 예정 · ${c.on ? '🔔 알람 켬' : '알람 꺼짐'}</small><b>${when}</b><em data-feedleft="${f.due}">${leftTxt(f.due)}</em><small>마지막 수유 ${f.last.t} + ${f.night ? '밤' : '낮'} ${f.night ? c.night : c.day}시간</small></div><i>⚙️</i></button>`;
}
function feedSheet() {
  const c = feedCfg(), cw = canWrite(); let push = ''; try { push = localStorage.getItem('soeun-push') || ''; } catch (e) {}
  const step = (id, v, d, lab) => `<div class="dyside"><b>${lab}</b><button type="button" data-dy="min" data-t="${id}" data-v="-${d}">−</button><span><input id="${id}" inputmode="decimal" value="${v}"><small>시간</small></span><button type="button" data-dy="min" data-t="${id}" data-v="${d}">＋</button></div>`;
  openSheet(`<h3>⏰ 수유 알람</h3>
    <label class="check"><input type="checkbox" id="fa-on" ${c.on ? 'checked' : ''} ${cw ? '' : 'disabled'}> 다음 수유 시간에 알림 받기 <small>(엄마·아빠 폰 같이)</small></label>
    <p class="hint" style="margin:10px 0 6px">마지막 수유(분유·모유·유축)에서 이만큼 지나면 알려요.</p>
    ${step('fa-day', c.day, .5, '낮')}${step('fa-night', c.night, .5, '밤<br><small>막수 뒤</small>')}
    <div class="field"><span>밤으로 칠 시간 <small>(마지막 수유가 이 사이면 밤 간격)</small></span><div class="dytpr">${tpick('fa-ns', c.ns)}${tpick('fa-ne', c.ne)}</div></div>
    <div class="field"><span>미리 알림</span><div class="quick" id="fa-pre">${[0, 10, 15, 30].map(x => `<button type="button" data-act="pick1" data-v="${x}" class="${+c.pre === x ? 'on' : ''}">${x ? x + '분 전' : '딱 그때'}</button>`).join('')}</div></div>
    <p class="foot" style="margin:4px 0 10px">알림은 서버가 10분마다 확인해서 보내서 10~30분쯤 늦게 올 수 있어요. 그래서 알림에 <b>수유 예정 시각</b>을 적어 보내요.${push ? ' 이 폰은 알림 받는 중이에요.' : ''}</p>
    ${push ? '' : '<button type="button" class="ghost" data-fam="push-on" style="width:100%;min-height:46px;margin-bottom:10px">🔔 이 폰에서 알림 받기 켜기</button>'}
    <p class="err" id="fa-err"></p>
    <div class="actions"><button class="secondary" data-act="close">닫기</button>${cw ? '<button class="primary" data-dy="feedsave">저장</button>' : ''}</div>`);
}
function feedSave() {
  const v = id => num(($(id) || {}).value), on = $('fa-on') && $('fa-on').checked, pre = document.querySelector('#fa-pre .on');
  const day = Math.round(v('fa-day') * 2) / 2, night = Math.round(v('fa-night') * 2) / 2, ns = ($('fa-ns') || {}).value, ne = ($('fa-ne') || {}).value;
  if (!(day >= 1 && day <= 12) || !(night >= 1 && night <= 14)) { $('fa-err').textContent = '간격은 1~12시간(밤은 14시간)으로 적어 주세요'; return; }
  if (!/^\d\d:\d\d$/.test(ns || '') || !/^\d\d:\d\d$/.test(ne || '')) { $('fa-err').textContent = '밤 시간을 확인해 주세요'; return; }
  const s = GAME.store.get(); s.feed = { on: on ? 1 : 0, day, night, ns, ne, pre: pre ? +pre.dataset.v : 10 }; GAME.store.set(s);
  closeSheet(); render(); toast(on ? '⏰ 수유 알람을 켰어요\n엄마·아빠 폰에 같이 와요' : '수유 알람 설정을 저장했어요');
}

// ---------- 하루 숫자 ----------
function stats(date) {
  const L = ofDay(date), care = k => L.filter(e => e.src === 'care' && e.k === k);
  const F = care('formula'), P = care('pump'), B = care('breast'), dia = care('diaper'), sl = care('sleep'), ba = care('bath'), so = L.filter(e => e.k === 'solid');
  const iv = A => { if (A.length < 2) return null; const t = A.map(e => e.s).sort((a, b) => a - b); let g = 0; for (let i = 1; i < t.length; i++) g += t[i] - t[i - 1]; return g / (t.length - 1) / 36e5; };
  const sleeps = evs().filter(e => e.src === 'care' && e.k === 'sleep' && (e.date === date || e.date === addDays(date, -1)));
  const sleepMin = sleptMin(sleeps, date);
  const unit = so.some(e => /ml/i.test(e.raw.amount || '')) ? 'ml' : 'g';
  return {
    formula: { ml: F.reduce((a, e) => a + (+e.raw.ml || 0), 0), n: F.length, iv: iv(F) },
    pump: { ml: P.reduce((a, e) => a + (+e.raw.ml || 0), 0), n: P.length, iv: iv(P) },
    breast: { n: B.length, min: B.reduce((a, e) => a + ((+e.raw.l || 0) + (+e.raw.r || 0) || (e.e ? (e.e - e.s) / 60000 : 0)), 0), iv: iv(B) },
    solid: { n: so.length, amt: so.reduce((a, e) => a + num(e.raw.amount), 0), unit },
    pee: { n: dia.filter(e => e.raw.pee).length }, poo: { n: dia.filter(e => e.raw.poo).length },
    sleep: { min: sleepMin, n: sl.length, long: sleeps.reduce((a, e) => Math.max(a, e.e ? (e.e - e.s) / 60000 : 0), 0) },
    bath: { n: ba.length }, any: L.some(e => e.src === 'care' || e.k === 'solid')
  };
}

// ---------- 목록 한 줄 ----------
function line(e) {
  const r = e.raw, k = e.k;
  let name = (K[k] || K.memo).n, det = '';
  const span = e.e && e.e > e.s ? `⏱ ${durTxt((e.e - e.s) / 60000)} (${r.t}~${hmOf(new Date(e.e))})` : '';   // 걸린 시간 (끝 시각·목욕 분이 있으면)
  if (k === 'formula' || k === 'pump') det = [r.ml ? `${r.ml}ml` : '', span].filter(Boolean).join(' · ');
  else if (k === 'breast') det = r.live ? `수유 중 · <b data-el="${e.id}"></b>` : [r.l ? `왼쪽 ${Math.round(r.l)}분` : '', r.r ? `오른쪽 ${Math.round(r.r)}분` : ''].filter(Boolean).concat(span ? [span] : []).join(' · ');
  else if (k === 'diaper') { name = [r.pee ? '소변' : '', r.poo ? '대변' : ''].filter(Boolean).join('·') || '기저귀'; det = r.poo ? [AMT[r.amt] || r.amt, STT[r.st] || r.st].filter(Boolean).join(' · ') : ''; }
  else if (k === 'sleep') det = r.live ? `자는 중 · <b data-el="${e.id}"></b>` : e.e ? `${durTxt((e.e - e.s) / 60000)} · ${r.t}~${r.e}` : '';
  else if (k === 'bath') det = span || (r.dur ? `⏱ ${r.dur}분` : '');
  else if (k === 'solid') det = [r.menu, r.amount, r.eat].filter(Boolean).map(esc).join(' · ');
  else if (k === 'temp') det = `${esc(r.value)}℃`;
  else if (k === 'med') det = [r.value, r.dose].filter(Boolean).map(esc).join(' ');
  else if (k === 'sym') det = esc(r.value || '');
  const memo = e.src === 'care' ? r.memo : e.src === 'meal' ? '' : r.memo;
  const dot = k === 'diaper' ? (r.poo ? K.poo.c : K.pee.c) : (K[k] || K.memo).c;
  const act = e.src === 'care' ? `data-dy="edit" data-id="${e.id}"` : e.src === 'meal' ? `data-act="editmeal" data-id="${e.id}"` : `data-dy="editlog" data-id="${e.id}"`;
  return `<button class="dyrow${r.live ? ' live' : ''}${D.flash === e.id ? ' flash' : ''}" ${act}><span class="dyt">${e.t}${e.guess ? '<small>쯤</small>' : ''}</span><span class="dydot" style="--c:${dot}"></span><span class="dyb"><b>${k === 'diaper' ? (r.poo ? '💩 ' : '💧 ') : (K[k] || K.memo).i + ' '}${name}</b><small>${[det, memo ? esc(memo) : ''].filter(Boolean).join(' · ')}${r.by ? ` <em>${esc(r.by)}</em>` : ''}</small></span><i>›</i></button>`;
}

// ---------- 화면 ----------
function render_() {
  if (!D.date || D.date > today()) D.date = today();
  if (!D.wk) D.wk = monday(D.date);
  const wk = D.mode === 'week', sub = D.sub[D.mode];
  const seg = `<div class="seg dyseg">${[['day', '📅', '일간'], ['week', '🗓️', '주간']].map(([k, i, l]) => `<button class="${D.mode === k ? 'on' : ''}" data-dy="mode" data-v="${k}"><i>${i}</i>${l}</button>`).join('')}</div>`;
  const we = addDays(D.wk, 6), nextOk = wk ? addDays(D.wk, 7) <= today() : D.date < today();
  const nav = `<div class="dynav"><button data-dy="prev" aria-label="이전">‹</button><label class="dyd">${wk ? wLabel(D.wk, we) : dLabel(D.date)}<input type="date" id="dy-pick" value="${wk ? D.wk : D.date}" max="${today()}" min="${S.profile.birth}" aria-label="날짜 고르기"></label><button data-dy="next" aria-label="다음" ${nextOk ? '' : 'disabled'}>›</button></div>
    ${(wk ? today() > we || today() < D.wk : D.date !== today()) ? '<button class="dytoday" data-dy="today">오늘로</button>' : ''}`;
  const tabs = wk ? [['stat', '통계'], ['pat', '패턴']] : [['log', '기록'], ['pat', '패턴']];
  const subt = `<div class="dysub">${tabs.map(([k, l]) => `<button class="${sub === k ? 'on' : ''}" data-dy="sub" data-v="${k}">${l}</button>`).join('')}</div>`;
  const body = wk ? (sub === 'pat' ? weekPat() : weekStat()) : (sub === 'pat' ? dayPat() : dayLog());
  const foot = wk ? (sub === 'pat' ? '막대 하나가 기록 하나예요. 수면은 연한 기둥으로 이어져요. 위 단추로 보고 싶은 것만 골라요.' : '막대를 누르면 그날 숫자가 보여요. 패턴 변화는 이 주 평균과 최근 3일 평균을 견줘요.')
    : sub === 'pat' ? '전날 밤에 잠든 잠도 이날 몫(0시부터)만큼 그려요. 위 단추로 보고 싶은 것만 골라요.' : '🥣 이유식은 급식 수사의 급식 기록, 🌡️ 체온·💊 투약은 긴급 출동 기록과 같은 기록이에요. 어디서 고쳐도 같이 바뀌어요.';
  // 안내 말풍선은 맨 아래 (자주 누르는 기록 단추가 첫 화면에 보이게)
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>24시 잠복 수사</h1>${seg}</header>
  ${nav}${subt}${body}<div class="dyguide">${CHARS.guide('day')}</div><p class="foot">${foot}</p>`;
}
function quickRow() {
  if (!canWrite()) return '';
  return `<div class="dyq" data-noswipe>${QUICK.map(([k, i, l]) => `<button data-dy="add" data-k="${k}" style="--c:${(K[k === 'diaper' ? 'pee' : k] || K.memo).c}"><span>${i}</span><b>${l}</b></button>`).join('')}</div>`;
}
function liveCards() {
  const L = (S.cares || []).filter(c => c.live);
  if (!L.length) return '';
  return L.map(c => {
    const kk = K[c.k] || K.memo, br = c.k === 'breast';
    return `<div class="dylive" style="--c:${kk.c}"><span class="dyli">${kk.i}</span><div><b>${br ? '모유수유 중' : c.k === 'sleep' ? '자는 중' : kk.n + ' 중'}</b><small>${c.date !== today() ? fmtMD(c.date) + ' ' : ''}${c.t} 시작 · <b data-el="${c.id}"></b>${br ? ` · 지금 <u>${c.side === 'r' ? '오른쪽' : '왼쪽'}</u>` : ''}</small></div>
      <div class="dylb">${br ? `<button data-dy="switch" data-id="${c.id}">↔ ${c.side === 'r' ? '왼쪽' : '오른쪽'}으로</button>` : ''}<button class="go" data-dy="end" data-id="${c.id}">${c.k === 'sleep' ? '■ 깼어요' : '■ 끝'}</button></div></div>`;
  }).join('');
}
function dayLog() {
  const st = stats(D.date), isT = D.date === today(), L = ofDay(D.date).slice().reverse();
  let last = '';
  if (isT) {   // 오늘: 마지막 수유·기저귀·잠 (언제였는지가 제일 궁금하니까 크게)
    const now = Date.now(), A = evs().filter(e => e.s <= now), feed = A.filter(e => ['formula', 'pump', 'breast', 'solid'].includes(e.k)).pop(), dia = A.filter(e => e.k === 'diaper').pop();
    const sl = A.filter(e => e.k === 'sleep').pop(), sleeping = sl && sl.raw.live;
    const box = (ic, lab, e, sub) => `<div><small>${ic} ${lab}</small>${e ? `<b>${e}</b><em>${sub}</em>` : '<b class="no">-</b><em>기록 없음</em>'}</div>`;
    last = `<p class="dylh">마지막 기록</p><div class="dylast">${box('🍼', '수유', feed && feed.t, feed && agoTxt(feed.s))}${box('🧷', '기저귀', dia && dia.t, dia && agoTxt(dia.s))}${sleeping ? box('😴', '자는 중', sl.t, `<b data-el="${sl.id}"></b>`) : box('😴', '깬 시각', sl && sl.e ? hmOf(new Date(sl.e)) : '', sl && sl.e ? agoTxt(sl.e) : '')}</div>`;
  }
  const chips = [[st.formula.n, `🍼 분유 ${st.formula.ml}ml · ${st.formula.n}회`], [st.breast.n, `🤱 모유 ${st.breast.n}회${st.breast.min ? ` · ${durTxt(st.breast.min)}` : ''}`], [st.pump.n, `🍶 유축 ${st.pump.ml}ml`], [st.solid.n, `🥣 이유식 ${st.solid.n}회`],
    [st.pee.n, `💧 소변 ${st.pee.n}`], [st.poo.n, `💩 대변 ${st.poo.n}`], [st.sleep.min, `😴 ${durTxt(st.sleep.min)}`], [st.bath.n, `🛁 목욕 ${st.bath.n}`]].filter(x => x[0]).map(x => `<span>${x[1]}</span>`).join('');
  return `${liveCards()}${isT ? feedBar() : ''}${quickRow()}
    <section class="dysum">${last}${chips ? `<div class="dychips">${chips}</div>` : `<p class="vempty" style="margin:4px 0">${isT ? '아직 오늘 기록이 없어요. 위 동그란 단추로 남겨요.' : '이날 기록이 없어요.'}</p>`}</section>
    ${L.length ? `<section class="dylist">${L.map(line).join('')}</section>` : ''}
    ${canWrite() ? '<button class="ghost dyimp" data-dy="imp">📥 다른 앱 기록 붙여넣기</button>' : ''}`;
}

// ---------- 일간 패턴: 24시간 시계 ----------
function chips(single) {
  return `<div class="dyfl">${CHART.filter(k => !single || !['poo'].includes(k)).map(k => {
    const on = single ? D.stat === (k === 'pee' ? 'diaper' : k) : !D.off.has(k), lab = single && k === 'pee' ? '소변/대변' : K[k].n;
    return `<button class="${on ? 'on' : ''}" data-dy="${single ? 'stat' : 'flt'}" data-v="${single && k === 'pee' ? 'diaper' : k}" style="--c:${K[k].c}" aria-pressed="${on}"><i></i>${lab}</button>`;
  }).join('')}</div>`;
}
function arc(cx, cy, r0, r1, a0, a1) {
  const P = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)], big = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = P(r1, a0), [x1, y1] = P(r1, a1), [x2, y2] = P(r0, a1), [x3, y3] = P(r0, a0);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r1} ${r1} 0 ${big} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A${r0} ${r0} 0 ${big} 0 ${x3.toFixed(1)} ${y3.toFixed(1)}Z`;
}
function dayPat() {
  const date = D.date, a = dayStart(date), b = a + 864e5, W = 320, C = W / 2, R1 = 132, R0 = 54;
  const list = evs().filter(e => e.src !== 'log' && e.k !== 'memo' && (e.date === date || (e.k === 'sleep' && e.date === addDays(date, -1) && (e.e || 0) > a)));
  let g = `<circle cx="${C}" cy="${C}" r="${R1}" fill="#FFFDF7" stroke="var(--line)" stroke-width="1"/>`;
  for (let h = 0; h < 24; h++) { const an = h / 24 * 2 * Math.PI, x0 = C + (R1 + 4) * Math.sin(an), y0 = C - (R1 + 4) * Math.cos(an), x1 = C + (R1 + (h % 6 ? 8 : 11)) * Math.sin(an), y1 = C - (R1 + (h % 6 ? 8 : 11)) * Math.cos(an);
    g += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="var(--muted)" stroke-width="1"/>`;
    if (h % 2 === 0) g += `<text x="${(C + (R1 + 21) * Math.sin(an)).toFixed(1)}" y="${(C - (R1 + 21) * Math.cos(an) + 4).toFixed(1)}" text-anchor="middle" class="dyax${h % 6 ? '' : ' b'}">${h}</text>`; }
  const marks = [], tips = [];
  // 수면 같은 긴 것 먼저(아래), 그 위에 수유·기저귀
  list.slice().sort((x, y) => (y.k === 'sleep') - (x.k === 'sleep')).forEach(e => {
    e.kinds.forEach((kk, j) => {
      if (D.off.has(kk) || !K[kk]) return;
      const s = Math.max(e.s, a), f = e.e ? Math.min(e.e, b) : 0, dur = f > s ? f - s : 0;
      let a0 = (s - a) / 864e5 * 2 * Math.PI, a1 = dur > 8 * 60000 ? (f - a) / 864e5 * 2 * Math.PI : a0 + Math.PI / 72;   // 짧은 건 10분 폭
      if (dur <= 8 * 60000) { a0 -= Math.PI / 144; a1 -= Math.PI / 144; }
      const ri = kk === 'sleep' ? R0 : R0 + 4, ro = kk === 'sleep' ? R1 : R1 - 4, ti = tips.length;
      tips.push(`${K[kk].i} ${K[kk].n} · ${e.t}${e.e && e.k !== 'formula' && e.k !== 'pump' ? `~${e.raw.e || hmOf(new Date(e.e))}` : ''}${e.raw.ml ? ` · ${e.raw.ml}ml` : ''}`);
      marks.push(`<path d="${arc(C, C, ri, ro, a0, a1)}" fill="${K[kk].c}" fill-opacity="${kk === 'sleep' ? .28 : .92}" stroke="#FFFDF7" stroke-width="1.5" data-dy="tip" data-v="${ti}"/>`);
    });
  });
  const [mo, dd] = monthsDays(S.profile.birth, date);
  g += marks.join('') + `<circle cx="${C}" cy="${C}" r="${R0 - 2}" fill="var(--card)" stroke="var(--line)"/><text x="${C}" y="${C - 4}" text-anchor="middle" class="dyc1">${mo}개월</text><text x="${C}" y="${C + 18}" text-anchor="middle" class="dyc1">${dd}일</text>`;
  D.tips = tips;
  const st = stats(date), row = (l, v) => `<tr><th>${l}</th><td>${v}</td></tr>`;
  const t1 = [st.formula.n ? row('🍼 분유', `${st.formula.ml}ml · ${st.formula.n}회`) : '', st.pump.n ? row('🍶 유축수유', `${st.pump.ml}ml · ${st.pump.n}회`) : '', st.breast.n ? row('🤱 모유수유', `${st.breast.n}회${st.breast.min ? ` · ${durTxt(st.breast.min)}` : ''}`) : '', st.solid.n ? row('🥣 이유식', `${st.solid.n}회${st.solid.amt ? ` · ${st.solid.amt}${st.solid.unit}` : ''}`) : ''].join('');
  const t2 = [row('💧 소변', `${st.pee.n}회`), row('💩 대변', `${st.poo.n}회`)].join('');
  const t3 = [row('😴 수면', st.sleep.min ? `${durTxt(st.sleep.min)}${st.sleep.n ? ` · ${st.sleep.n}번` : ''}` : '-'), row('🛁 목욕', `${st.bath.n}회`)].join('');
  return `${chips(false)}
    <div class="dyclock"><svg viewBox="-12 -12 ${W + 24} ${W + 24}" role="img" aria-label="${dLabel(date)} 24시간 기록 시계">${g}</svg><p class="dytip" id="dy-tip">${list.length ? '조각을 누르면 무슨 기록인지 보여요' : '이날 기록이 없어요'}</p></div>
    <table class="dytbl f"><thead><tr><th>수유·이유식</th><th>합계</th></tr></thead><tbody>${t1 || row('-', '기록 없음')}</tbody></table>
    <table class="dytbl d"><thead><tr><th>소변/대변</th><th>횟수</th></tr></thead><tbody>${t2}</tbody></table>
    <table class="dytbl s"><thead><tr><th>수면·목욕</th><th>합계</th></tr></thead><tbody>${t3}</tbody></table>`;
}

// ---------- 주간 통계: 날마다 막대 + 패턴 변화 ----------
const METRICS = {
  formula: [['ml', '분유 섭취량', 'ml', s => s.formula.ml], ['n', '분유 횟수', '회', s => s.formula.n], ['iv', '분유 평균 간격', '시간', s => s.formula.iv]],
  breast: [['n', '모유수유 횟수', '회', s => s.breast.n], ['min', '모유수유 시간', '분', s => Math.round(s.breast.min)], ['iv', '모유수유 평균 간격', '시간', s => s.breast.iv]],
  pump: [['ml', '유축수유 양', 'ml', s => s.pump.ml], ['n', '유축수유 횟수', '회', s => s.pump.n]],
  solid: [['n', '이유식 횟수', '회', s => s.solid.n], ['amt', '이유식 먹은 양', '', s => s.solid.amt]],
  diaper: [['pee', '소변 횟수', '회', s => s.pee.n], ['poo', '대변 횟수', '회', s => s.poo.n]],
  sleep: [['min', '하루 수면 시간', '시간', s => s.sleep.min ? Math.round(s.sleep.min / 6) / 10 : 0], ['long', '가장 오래 잔 시간', '시간', s => s.sleep.long ? Math.round(s.sleep.long / 6) / 10 : 0], ['n', '잠든 횟수', '회', s => s.sleep.n]],
  bath: [['n', '목욕 횟수', '회', s => s.bath.n]]
};
const fmtV = (v, u) => v == null ? '-' : u === '시간' ? `${(Math.round(v * 10) / 10)}${u}` : `${Math.round(v)}${u}`;
function bars(key, days, vals, unit, color) {
  const W = 320, H = 150, top = 26, base = 120, bw = 16, step = W / 7, max = Math.max(1, ...vals.filter(v => v != null));
  const fut = days.map(d => d > today()), has = vals.some((v, i) => v && !fut[i]);
  let sel = D.sel[key]; if (sel == null || !(vals[sel] > 0)) { sel = -1; for (let i = 6; i >= 0; i--) if (!fut[i] && vals[i] > 0) { sel = i; break; } }
  let g = [0, .5, 1].map(f => `<line x1="8" x2="${W - 8}" y1="${(base - (base - top) * f).toFixed(1)}" y2="${(base - (base - top) * f).toFixed(1)}" stroke="var(--line)" stroke-width="1" stroke-dasharray="${f ? '2 4' : ''}" opacity="${f ? .6 : 1}"/>`).join('');
  vals.forEach((v, i) => {
    const x = step * i + step / 2;
    if (v > 0) { const h = Math.max(4, (base - top) * v / max), y = base - h; g += `<path d="M${(x - bw / 2).toFixed(1)} ${base}V${(y + 4).toFixed(1)}Q${(x - bw / 2).toFixed(1)} ${y.toFixed(1)} ${(x - bw / 2 + 4).toFixed(1)} ${y.toFixed(1)}H${(x + bw / 2 - 4).toFixed(1)}Q${(x + bw / 2).toFixed(1)} ${y.toFixed(1)} ${(x + bw / 2).toFixed(1)} ${(y + 4).toFixed(1)}V${base}Z" fill="${color}" fill-opacity="${i === sel ? 1 : .55}"/>`; }
    g += `<rect x="${(x - step / 2).toFixed(1)}" y="0" width="${step.toFixed(1)}" height="${H}" fill="transparent" data-dy="bar" data-k="${key}" data-v="${i}"/>`;
    g += `<text x="${x.toFixed(1)}" y="${H - 8}" text-anchor="middle" class="dyax${days[i] === today() ? ' b' : ''}">${+days[i].slice(8)}일</text>`;
  });
  if (sel >= 0) { const x = step * sel + step / 2, h = Math.max(4, (base - top) * vals[sel] / max), y = base - h - 8, t = fmtV(vals[sel], unit), w = Math.max(40, t.length * 8 + 14); g += `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - 18).toFixed(1)}" width="${w}" height="20" rx="10" fill="#FFF3E2" stroke="${color}" stroke-width="1"/><text x="${x.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" class="dypill">${t}</text>`; }
  return has ? `<svg viewBox="0 0 ${W} ${H}" class="dybars" role="img" aria-label="날마다 막대 그래프">${g}</svg>`
    : `<div class="dynone"><span>📊</span>아직 기록된 내용이 없어요 ☁️<div class="dynd">${days.map(d => `<i>${+d.slice(8)}일</i>`).join('')}</div></div>`;
}
function change(vals, days, unit) {
  const ok = days.map((d, i) => ({ d, v: vals[i] })).filter(x => x.d <= today() && x.v != null && x.v > 0);
  if (!ok.length) return '';
  const avg = A => A.reduce((a, x) => a + x.v, 0) / A.length, a7 = avg(ok), a3 = avg(ok.slice(-3)), ar = a3 > a7 * 1.05 ? '↑' : a3 < a7 * .95 ? '↓' : '=';
  return `<div class="dychg"><b>패턴 변화</b><div><span><small>${ok.length < 7 ? `${ok.length}일` : '7일'} 평균</small><em>${fmtV(a7, unit).replace(/([0-9.]+)/, '<big>$1</big> ')}</em></span><i>${ar}</i><span><small>최근 ${Math.min(3, ok.length)}일 평균</small><em>${fmtV(a3, unit).replace(/([0-9.]+)/, '<big>$1</big> ')}</em></span></div></div>`;
}
function weekStat() {
  const days = [...Array(7)].map((_, i) => addDays(D.wk, i)), S7 = days.map(d => stats(d)), M = METRICS[D.stat] || METRICS.formula;
  const colorOf = D.stat === 'diaper' ? (k => k === 'poo' ? K.poo.c : K.pee.c) : (() => K[D.stat].c);
  return `${chips(true)}${M.map(([k, title, unit, f]) => {
    const vals = S7.map(s => { const v = f(s); return v == null ? null : v; }), u = D.stat === 'solid' && k === 'amt' ? (S7.find(s => s.solid.n) || { solid: { unit: 'g' } }).solid.unit : unit, key = D.stat + '.' + k;
    return `<section class="dywk"><h3>${title}<small>${D.wk === monday(today()) ? '이번 주' : '그 주'}</small></h3><div data-ch="${key}">${bars(key, days, vals, u, colorOf(k))}</div>${change(vals, days, u)}</section>`;
  }).join('')}`;
}
// ---------- 주간 패턴: 7일 × 24시간 ----------
function weekPat() {
  const days = [...Array(7)].map((_, i) => addDays(D.wk, i)), W = 320, colW = (W - 30) / 7, top = 22, hh = 17, H = top + 24 * hh + 6;
  let g = '';
  for (let h = 0; h <= 24; h += 3) g += `<line x1="0" x2="${(colW * 7).toFixed(1)}" y1="${top + h * hh}" y2="${top + h * hh}" stroke="var(--line)" stroke-width="${h % 6 ? .5 : 1}" opacity="${h % 6 ? .5 : .9}"/>${h % 6 ? '' : `<text x="${(colW * 7 + 4).toFixed(1)}" y="${top + h * hh + 4}" class="dyax">${p2(h)}</text>`}`;
  days.forEach((d, i) => { const x = i * colW; g += `<rect x="${(x + 2).toFixed(1)}" y="${top}" width="${(colW - 4).toFixed(1)}" height="${24 * hh}" rx="4" fill="#FFFDF7" opacity=".7"/><text x="${(x + colW / 2).toFixed(1)}" y="14" text-anchor="middle" class="dyax${d === today() ? ' b' : ''}">${wdOf(d)} ${+d.slice(8)}</text>`; });
  const marks = [], pts = [];
  evs().filter(e => e.src !== 'log' && e.k !== 'memo').forEach(e => {
    e.kinds.forEach(kk => {
      if (D.off.has(kk) || !K[kk]) return;
      days.forEach((d, i) => {
        const a = dayStart(d), b = a + 864e5, x = i * colW;
        if (kk === 'sleep' && e.e) { const s = Math.max(e.s, a), f = Math.min(e.e, b); if (f > s) marks.push(`<rect x="${(x + colW * .2).toFixed(1)}" y="${(top + (s - a) / 36e5 * hh).toFixed(1)}" width="${(colW * .6).toFixed(1)}" height="${Math.max(3, (f - s) / 36e5 * hh).toFixed(1)}" rx="3" fill="${K.sleep.c}" fill-opacity=".28"/>`); return; }
        if (e.s >= a && e.s < b) pts.push(`<rect x="${(x + 5).toFixed(1)}" y="${(top + (e.s - a) / 36e5 * hh - 2).toFixed(1)}" width="${(colW - 10).toFixed(1)}" height="4" rx="2" fill="${K[kk].c}"/>`);
      });
    });
  });
  return `${chips(false)}<div class="dywpat"><svg viewBox="-4 0 ${W + 8} ${H}" role="img" aria-label="일주일 기록 패턴">${g}${marks.join('')}${pts.join('')}</svg></div>`;
}

// ---------- 기록 남기기·고치기 ----------
let F = null;
function lastMl(k) { const L = (S.cares || []).filter(c => c.k === k && +c.ml).sort((a, b) => (b.date + b.t).localeCompare(a.date + a.t)); return L[0] ? +L[0].ml : (k === 'pump' ? 80 : 120); }
function openForm(k, c) {
  if (!canWrite()) { toast('보기 전용이라 기록은 엄마·아빠 수사관이 남겨요'); return; }
  const now = new Date(), d0 = c ? c.date : D.date, t0 = c ? c.t : (D.date === today() ? hmOf(now) : '12:00');
  const liveBr = !!(c && c.live && c.k === 'breast' && c.seg), add = liveBr ? Math.max(0, (Date.now() - c.seg) / 60000) : 0;
  F = { k, id: c ? c.id : newCid(), old: c ? c.date : '', edit: !!c, live: c ? c.live : 0, side: c ? c.side : '', seg: liveBr ? Date.now() : c ? c.seg : 0, at: c ? c.at : 0, pee: c ? !!c.pee : true, poo: c ? !!c.poo : false };
  const kk = K[k === 'diaper' ? 'pee' : k] || K.memo, title = k === 'diaper' ? '소변/대변' : kk.n, icon = k === 'diaper' ? '🧷' : kk.i;
  // 시각은 폰 시계 창(헷갈려요) 대신 숫자 칸 + ▲▼ (사용자 요청)
  const hasE = ['formula', 'pump', 'breast', 'sleep'].includes(k);
  const tIn = `<label class="field"><span>날짜</span><input id="dy-d" type="date" value="${d0}" min="${S.profile.birth}" max="${today()}"></label>
    <div class="dytpr${hasE ? '' : ' one'}"><div class="field"><span>${k === 'sleep' ? '잠든 시각' : k === 'breast' || k === 'bath' ? '시작 시각' : '시각'}</span>${tpick('dy-t', t0)}</div>
    ${hasE ? `<div class="field"><span>${k === 'sleep' ? '깬 시각' : '끝난 시각'} <small>(선택)</small></span>${tpick('dy-e', (c && c.e) || '', true)}<div class="dytpq"><button type="button" class="ghost" data-dy="now" data-t="dy-e">${k === 'sleep' ? '지금 깼어요' : '지금 끝'}</button><button type="button" class="ghost" data-dy="tpx" data-t="dy-e" aria-label="끝난 시각 지우기">비우기</button></div></div>` : ''}</div>`;
  let body = '';
  if (k === 'formula' || k === 'pump') {
    const v = c ? +c.ml : lastMl(k);
    body = `<div class="dyamt"><button type="button" data-dy="ml" data-v="-10" aria-label="10ml 빼기">−</button><span><input id="dy-ml" inputmode="numeric" value="${v}" aria-label="양"><small>ml</small></span><button type="button" data-dy="ml" data-v="10" aria-label="10ml 더하기">＋</button></div>
      <div class="quick dyqk">${[60, 80, 100, 120, 140, 160, 180, 200, 220, 240].map(x => `<button type="button" data-dy="mlset" data-v="${x}" class="${x === v ? 'on' : ''}">${x}</button>`).join('')}</div>`;
  } else if (k === 'breast') {
    const side = (s, lab) => `<div class="dyside"><b>${lab}</b><button type="button" data-dy="min" data-t="dy-${s}" data-v="-1">−</button><span><input id="dy-${s}" inputmode="numeric" value="${c ? Math.round((+c[s] || 0) + (liveBr && (c.side === 'r' ? 'r' : 'l') === s ? add : 0)) : 0}"><small>분</small></span><button type="button" data-dy="min" data-t="dy-${s}" data-v="1">＋</button></div>`;
    body = `${liveBr ? `<p class="hint">⏱ 지금 ${c.side === 'r' ? '오른쪽' : '왼쪽'}을 재는 중이에요. 끝났으면 아래 '지금 끝났어요'를 누르고 저장해요.</p>` : ''}${side('l', '왼쪽')}${side('r', '오른쪽')}<div class="quick dyqk">${[5, 10, 15, 20].map(x => `<button type="button" data-dy="minset" data-v="${x}">양쪽 ${x}분</button>`).join('')}</div>
      ${c ? '' : '<button type="button" class="ghost dytimer" data-dy="timer" data-k="breast">⏱ 타이머로 재기 (지금 왼쪽부터)</button>'}`;
  } else if (k === 'diaper') {
    body = `<div class="field"><span>무엇인가요?</span><div class="quick dymulti" id="dy-pp"><button type="button" data-dy="pp" data-v="pee" class="${F.pee ? 'on' : ''}">💧 소변</button><button type="button" data-dy="pp" data-v="poo" class="${F.poo ? 'on' : ''}">💩 대변</button></div></div>
      <div class="field dypoo"><span>대변이면 양</span><div class="quick" id="dy-amt">${['조금', '보통', '많이'].map(x => `<button type="button" data-act="pick1" data-v="${x}" class="${c && c.amt === x ? 'on' : ''}">${x}</button>`).join('')}</div></div>
      <div class="field dypoo"><span>상태</span><div class="quick" id="dy-st">${['묽음', '보통', '단단', '설사'].map(x => `<button type="button" data-act="pick1" data-v="${x}" class="${c && c.st === x ? 'on' : ''}">${x}</button>`).join('')}</div></div>`;
  } else if (k === 'sleep') {
    body = c ? '' : '<button type="button" class="ghost dytimer" data-dy="timer" data-k="sleep">⏱ 지금 잠들었어요 (깨면 위 카드에서 \'깼어요\')</button>';
  } else if (k === 'bath') {
    body = `<div class="field"><span>목욕 시간</span></div><div class="dyamt sm"><button type="button" data-dy="min" data-t="dy-dur" data-v="-5" aria-label="5분 빼기">−</button><span><input id="dy-dur" inputmode="numeric" value="${c ? +c.dur || '' : 10}" aria-label="목욕 시간(분)"><small>분</small></span><button type="button" data-dy="min" data-t="dy-dur" data-v="5" aria-label="5분 더하기">＋</button></div>
      <div class="quick dyqk">${[5, 10, 15, 20, 30].map(x => `<button type="button" data-act="fill" data-t="dy-dur" data-v="${x}">${x}분</button>`).join('')}</div>`;
  }
  openSheet(`<h3>${icon} ${title} ${c ? '수정' : '기록'}</h3>${body}${tIn}
    <label class="field"><span>${k === 'memo' ? '메모' : '메모 (선택)'}</span><textarea id="dy-memo" maxlength="300" placeholder="${PH[k] || '예: 메모'}">${esc((c && c.memo) || '')}</textarea></label>
    <p class="err" id="dy-err"></p>
    <div class="actions">${c ? `<button class="danger" data-dy="del" data-id="${c.id}">삭제</button>` : ''}<button class="secondary" data-act="close">닫기</button><button class="primary" data-dy="save">${c ? '수정 완료' : '저장'}</button></div>`);
  if (k === 'diaper') pooSync();
}
// 시각 고르기: 시·분 숫자 칸(직접 입력) + ▲▼, 값은 숨은 칸(id)에 HH:MM (비우면 '')
function tpick(id, v, empty) {
  const [h, m] = /^\d\d:\d\d/.test(v || '') ? v.split(':') : ['', ''];
  const col = (u, val) => `<div class="dytpc"><button type="button" data-dy="tp" data-t="${id}" data-u="${u}" data-v="1" aria-label="${u === 'h' ? '1시간' : '1분'} 올리기">▲</button><input class="dytpi" data-tp="${id}" data-u="${u}" inputmode="numeric" maxlength="2" value="${val}" placeholder="--" aria-label="${u === 'h' ? '시' : '분'}"><button type="button" data-dy="tp" data-t="${id}" data-u="${u}" data-v="-1" aria-label="${u === 'h' ? '1시간' : '1분'} 내리기">▼</button></div>`;
  return `<div class="dytp${empty && !h ? ' empty' : ''}" id="${id}-w"><input type="hidden" id="${id}" value="${h ? h + ':' + m : ''}">${col('h', h)}<b>:</b>${col('m', m)}<small class="dytpa" id="${id}-a">${h ? ampm(+h) : ''}</small></div>`;
}
const ampm = h => (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + '시';
function tpSet(id, hm) {
  const hid = $(id), w = $(id + '-w'); if (!hid || !w) return;
  hid.value = hm || ''; const [h, m] = hm ? hm.split(':') : ['', ''];
  w.querySelector('[data-u="h"].dytpi').value = h; w.querySelector('[data-u="m"].dytpi').value = m;
  w.classList.toggle('empty', !hm); const a = $(id + '-a'); if (a) a.textContent = hm ? ampm(+h) : '';
  if (window.__app) __app.sheetDirty();
}
function tpStep(id, u, d) {
  const hid = $(id); if (!hid) return; let [h, m] = /^\d\d:\d\d$/.test(hid.value) ? hid.value.split(':').map(Number) : (() => { const n = new Date(); return [n.getHours(), n.getMinutes()]; })();
  let t = h * 60 + m + (u === 'h' ? 60 : 1) * d; t = ((t % 1440) + 1440) % 1440;
  tpSet(id, `${p2(Math.floor(t / 60))}:${p2(t % 60)}`);
}
document.addEventListener('input', e => {
  const el = e.target; if (!el.classList || !el.classList.contains('dytpi')) return;
  const id = el.dataset.tp, w = $(id + '-w'); if (!w) return;
  const hi = w.querySelector('[data-u="h"].dytpi'), mi = w.querySelector('[data-u="m"].dytpi');
  el.value = el.value.replace(/\D/g, '').slice(0, 2);
  const h = hi.value === '' ? NaN : Math.min(23, +hi.value), m = mi.value === '' ? (hi.value === '' ? NaN : 0) : Math.min(59, +mi.value);
  if (isNaN(h)) { $(id).value = ''; w.classList.add('empty'); return; }
  $(id).value = `${p2(h)}:${p2(m)}`; w.classList.remove('empty'); const a = $(id + '-a'); if (a) a.textContent = ampm(h);
  if (el.dataset.u === 'h' && el.value.length === 2) mi.focus();
});
document.addEventListener('focusout', e => { const el = e.target; if (el.classList && el.classList.contains('dytpi') && el.value !== '') el.value = p2(Math.min(el.dataset.u === 'h' ? 23 : 59, +el.value)); });
function pooSync() { document.querySelectorAll('#sheet .dypoo').forEach(x => x.classList.toggle('off', !F.poo)); }
function grab() {
  const v = id => { const el = $(id); return el ? el.value.trim() : ''; }, m = [0, v('dy-d'), v('dy-t').slice(0, 5)];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m[1])) return { err: '날짜를 확인해 주세요' };
  if (!/^\d{2}:\d{2}$/.test(m[2])) return { err: '시각을 확인해 주세요' };
  if (m[1] > today() || m[1] < S.profile.birth) return { err: '날짜를 확인해 주세요' };
  const it = { id: F.id, k: F.k, t: m[2], e: /^\d\d:\d\d/.test(v('dy-e')) ? v('dy-e').slice(0, 5) : '', memo: v('dy-memo'), live: F.live, side: F.side, seg: F.seg, at: F.at || Date.now() };
  if (F.k === 'formula' || F.k === 'pump') { it.ml = num(v('dy-ml')); if (!it.ml) return { err: '양(ml)을 적어 주세요' }; }
  if (F.k === 'breast') { it.l = num(v('dy-l')); it.r = num(v('dy-r')); }
  if (F.k === 'diaper') { if (!F.pee && !F.poo) return { err: '소변·대변 중 하나는 골라 주세요' }; it.pee = F.pee; it.poo = F.poo; const a = document.querySelector('#dy-amt .on'), s = document.querySelector('#dy-st .on'); it.amt = F.poo && a ? a.dataset.v : ''; it.st = F.poo && s ? s.dataset.v : ''; }
  if (F.k === 'bath') it.dur = num(v('dy-dur'));
  if (F.k === 'memo' && !it.memo) return { err: '메모를 적어 주세요' };
  if (it.e && F.live) it.live = 0;   // 끝난 시각을 적으면 타이머는 끝
  return { date: m[1], it };
}
async function save(b) {
  const g = grab(), er = $('dy-err'); if (g.err) { if (er) er.textContent = g.err; return; }
  b.disabled = true;
  const res = await write('careSave', g.date, g.it, F.old || '');
  b.disabled = false;
  if (!res) return;
  const k = F.k; F = null; closeSheet(); D.date = g.date; D.wk = monday(g.date); render();
  toast(`${k === 'diaper' ? '🧷 기저귀' : (K[k] || K.memo).i + ' ' + (K[k] || K.memo).n} 기록을 남겼어요`);
}
// 빠른 단추: 누르는 그 순간, 같은 종류의 가장 최근 기록과 똑같은 값으로 바로 남겨요 (사용자 요청 2026.10.11)
// 다 먹이고 나서 목록에서 눌러 양·메모를 고쳐요. 처음(최근 기록 없음)·메모는 창을 열어요, 수면은 바로 타이머
async function quickAdd(k, btn) {
  if (!canWrite()) { toast('보기 전용이라 기록은 엄마·아빠 수사관이 남겨요'); return; }
  if (k === 'sleep') { startTimer('sleep'); return; }
  const last = (S.cares || []).filter(c => c.k === k && !c.live).sort((a, b) => (b.date + b.t).localeCompare(a.date + a.t))[0];
  if (k === 'memo' || !last) { openForm(k, null); return; }
  const now = new Date(), it = { id: newCid(), k, t: hmOf(now), e: '', memo: '', live: 0, at: Date.now() };
  ['ml', 'l', 'r', 'dur', 'pee', 'poo', 'amt', 'st'].forEach(x => { if (last[x] != null && last[x] !== '') it[x] = last[x]; });
  if (/^\d\d:\d\d$/.test(last.e || '') && k !== 'breast') { const d = (msOf('2000-01-01', last.e) - msOf('2000-01-01', last.t) + 864e5) % 864e5; if (d && d < 4 * 36e5) it.e = hmOf(new Date(now.getTime() + d)); }   // 걸린 시간도 최근과 같게 (끝 시각 = 지금 + 그만큼)
  if (btn) btn.disabled = true;
  const res = await write('careSave', ymdOf(now), it, '');
  if (btn) btn.disabled = false;
  if (!res) return;
  D.mode = 'day'; D.sub.day = 'log'; D.date = today(); D.flash = it.id; render(); setTimeout(() => { if (D.flash === it.id) D.flash = ''; }, 2600);
  const det = k === 'formula' || k === 'pump' ? ` ${it.ml}ml` : k === 'breast' ? ` 왼쪽 ${Math.round(it.l || 0)}분·오른쪽 ${Math.round(it.r || 0)}분` : k === 'diaper' ? ` ${[it.pee ? '소변' : '', it.poo ? '대변' : ''].filter(Boolean).join('·')}` : k === 'bath' ? ` ${it.dur || 0}분` : '';
  toast(`${k === 'diaper' ? '🧷' : (K[k] || K.memo).i} ${hmOf(now)}${det} 바로 남겼어요\n다르면 목록에서 눌러 고쳐요`);
}
// ---------- 다른 앱(베이비빌리 등) 기록 붙여넣기: 한 줄에 기록 하나 ----------
// 형식: 2026-10-05 08:30 분유 160 [~08:50] [# 메모] · 모유 왼10 오8 · 유축 80 · 소변 · 대변 [많이] [묽음] · 소변대변 · 수면 ~10:40 · 목욕 15분 · 메모 내용
const IMPK = [['소변대변', 'diaper'], ['분유', 'formula'], ['유축', 'pump'], ['모유', 'breast'], ['소변', 'diaper'], ['대변', 'diaper'], ['수면', 'sleep'], ['잠', 'sleep'], ['목욕', 'bath'], ['메모', 'memo']];
function parseImp(txt) {
  const out = [], bad = [];
  String(txt || '').split(/\r?\n/).forEach((ln, i) => {
    const raw = ln.trim(); if (!raw || raw.startsWith('//')) return;
    const m = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})\s+(\d{1,2}):(\d{2})\s+(\S+)\s*(.*)$/.exec(raw); if (!m) { bad.push(i + 1); return; }
    const date = `${m[1]}-${p2(m[2])}-${p2(m[3])}`, t = `${p2(m[4])}:${m[5]}`, w = m[6]; let rest = m[7] || '', memo = '';
    const hi = rest.indexOf('#'); if (hi >= 0) { memo = rest.slice(hi + 1).trim(); rest = rest.slice(0, hi); }
    const kk = IMPK.find(([n]) => w.startsWith(n)); if (!kk) { bad.push(i + 1); return; }
    const k = kk[1], e = (/~\s*(\d{1,2}):(\d{2})/.exec(rest) || []), it = { id: 'c' + (date + t + k + w).replace(/\D/g, '').slice(2) + k.slice(0, 2) + i.toString(36), k, t, e: e[1] ? `${p2(e[1])}:${e[2]}` : '', memo, live: 0, at: Date.now() };
    rest = rest.replace(/~\s*\d{1,2}:\d{2}/, '');
    if (k === 'formula' || k === 'pump') it.ml = num((/(\d+)/.exec(rest) || [])[1]);
    if (k === 'breast') { it.l = num((/왼\D*(\d+)/.exec(rest) || [])[1]); it.r = num((/오\D*(\d+)/.exec(rest) || [])[1]); if (!it.l && !it.r) { const n = num((/(\d+)/.exec(rest) || [])[1]); if (n) it.e = it.e || hmOf(new Date(msOf(date, t) + n * 60000)); } }
    if (k === 'diaper') { it.pee = w.includes('소변') ? 1 : 0; it.poo = w.includes('대변') ? 1 : 0; it.amt = (/조금|보통|많이/.exec(rest) || [''])[0]; it.st = (/묽음|단단|설사/.exec(rest) || [''])[0] || (it.poo && /보통/.test(rest.replace(it.amt, '')) ? '보통' : ''); }
    if (k === 'bath') it.dur = num((/(\d+)/.exec(rest) || [])[1]);
    if (k === 'memo') it.memo = (rest.trim() + (memo ? ' ' + memo : '')).trim();
    out.push({ date, it });
  });
  return { out, bad };
}
function impSheet() {
  openSheet(`<h3>📥 다른 앱 기록 붙여넣기</h3>
    <p class="hint">베이비빌리 등 다른 앱 기록을 한 줄에 하나씩 붙여 넣어요. (Claude가 캡처를 읽어 이 형식으로 만들어 드려요)</p>
    <pre class="dyimpex">2026-10-05 08:30 분유 160
2026-10-05 09:10 소변
2026-10-05 11:20 대변 많이 묽음
2026-10-05 12:00 모유 왼10 오8
2026-10-05 13:00 수면 ~14:30
2026-10-05 19:00 목욕 15분
2026-10-05 20:00 메모 오늘 많이 웃음</pre>
    <button type="button" class="ghost dyocrb" data-dy="impocr">📷 캡처 사진으로 읽기 <small>(꼬미의 하루·베이비빌리 등 기록 화면, 여러 장 가능)</small></button>
    <input type="file" id="dy-impf" accept="image/*,application/octet-stream" multiple hidden>
    <p class="hint" id="dy-ocrst"></p>
    <label class="field"><span>붙여 넣을 기록 <small>(사진에서 읽은 것도 여기 들어와요 — 틀린 줄은 고쳐 주세요)</small></span><textarea id="dy-imp" rows="8" placeholder="여기에 붙여 넣어요"></textarea></label>
    <p class="hint" id="dy-impn"></p><p class="err" id="dy-err"></p>
    <div class="actions"><button class="secondary" data-act="close">닫기</button><button class="primary" data-dy="impgo">가져오기</button></div>`);
}
document.addEventListener('input', e => { if (e.target.id !== 'dy-imp') return; const r = parseImp(e.target.value), n = $('dy-impn'); if (n) n.textContent = `${r.out.length}개 읽음${r.bad.length ? ` · 못 읽은 줄 ${r.bad.slice(0, 8).join(', ')}번` : ''}`; });
// ---------- 캡처 사진 글자 읽기 (Tesseract.js, 폰 안에서 — 사진은 어디에도 안 올라가요) ----------
// 처음 한 번 글자 사전(한국어 약 1.5MB)을 받아 두고, 다음부턴 폰에 저장된 걸 써요
const TJS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let ocrW = null;
function ocrLoad() {
  if (window.Tesseract) return Promise.resolve();
  return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = TJS; sc.onload = res; sc.onerror = () => rej(new Error('글자 읽기 도구를 받지 못했어요. 인터넷을 확인해 주세요')); document.head.appendChild(sc); });
}
async function ocrWorker(st) {
  if (ocrW) return ocrW; await ocrLoad();
  ocrW = await Tesseract.createWorker('kor+eng', 1, { logger: m => { if (st && m.status && /load|init/.test(m.status)) st(`글자 사전 준비 중… ${Math.round((m.progress || 0) * 100)}%`); } });
  return ocrW;
}
const OK = [['소변+대변', '소변대변'], ['소변대변', '소변대변'], ['소변/대변', '소변대변'], ['대변+소변', '소변대변'], ['모유', '모유'], ['분유', '분유'], ['유축', '유축'], ['소변', '소변'], ['대변', '대변'], ['수면', '수면'], ['낮잠', '수면'], ['밤잠', '수면'], ['목욕', '목욕'], ['메모', '메모'], ['이유식', '이유식']];
// 글자 색으로 짐작 (글자를 잘못 읽었을 때): 주황=분유, 파랑=소변, 분홍=모유, 초록=이유식
function hueKind(cv, bb) {
  if (!cv || !bb) return ''; const x = Math.max(0, bb.x0), y = Math.max(0, bb.y0), w = Math.min(cv.width - x, bb.x1 - bb.x0), h = Math.min(cv.height - y, bb.y1 - bb.y0); if (w < 2 || h < 2) return '';
  const d = cv.getContext('2d').getImageData(x, y, w, h).data; let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < .25) continue; let hu = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn); hu = (hu * 60 + 360) % 360; sx += Math.cos(hu * Math.PI / 180); sy += Math.sin(hu * Math.PI / 180); n++; }
  if (n < 8) return ''; const hu = (Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360;
  return hu < 15 || hu >= 320 ? '모유' : hu < 55 ? '분유' : hu < 160 ? '이유식' : hu < 260 ? '소변' : '모유';
}
function ocrLines(data, cv, date0, noDate) {
  let date = date0, cur = null, found = ''; const out = [], skip = [], seen = {};
  const T = today(), L = (data.lines || []).slice().sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const fin = () => {
    if (!cur) return; let { t, kind, det } = cur; det = (det || '').replace(/[>›<‹]/g, '').trim(); if (det === '-' || det === '—') det = '';
    const key = t + '|' + (seen[t] = (seen[t] || 0) + 1);   // 같은 분에 기록 둘(분유·소변)도 따로
    if (!kind) { skip.push({ key, t }); cur = null; return; }
    if (kind === '이유식') { skip.push({ key, t: t + ' 이유식' }); cur = null; return; }   // 이유식은 급식 기록이라 따로
    let ex = '', memo = '';
    if (kind === '분유' || kind === '유축') { const m = /(\d{2,3})\s*m/i.exec(det) || /(\d{2,3})/.exec(det); if (m) { let v = +m[1]; if (v > 400 && v % 10 === 0) v /= 10; ex = String(v); det = det.slice(det.indexOf(m[0]) + m[0].length).replace(/^\s*[lI1|]?\s*/, ''); } }
    if (kind === '모유') { const l = /왼\D{0,3}(\d+)/.exec(det), r = /오\D{0,4}(\d+)/.exec(det); if (l || r) { ex = `${l ? '왼' + l[1] : ''} ${r ? '오' + r[1] : ''}`.trim(); det = ''; } else { const m = /(\d+)\s*분/.exec(det); if (m) { ex = m[1] + '분'; det = det.replace(m[0], '').trim(); } } }
    if (kind === '수면' || kind === '분유' || kind === '유축') { const r = /(\d{1,2}):(\d{2})\s*[~\-–]\s*(\d{1,2}):(\d{2})/.exec(det); if (r) { ex += ` ~${p2(r[3])}:${r[4]}`; det = det.replace(r[0], '').trim(); } else if (kind === '수면') { const h = /(\d+)\s*시간/.exec(det), mi = /(\d+)\s*분/.exec(det); if (h || mi) { const e = msOf(date, t) + ((h ? +h[1] * 60 : 0) + (mi ? +mi[1] : 0)) * 60000; ex = '~' + hmOf(new Date(e)); det = ''; } } }
    if (kind === '목욕') { const m = /(\d+)\s*분/.exec(det) || /^\s*(\d{1,2})/.exec(det); if (m) { ex = m[1] + '분'; det = det.replace(m[0], '').replace(/^\d+/, '').trim(); } }
    if (kind === '대변' || kind === '소변대변') { const a = /조금|보통|많이/.exec(det); if (a && det.trim() === a[0]) { ex = a[0]; det = ''; } }
    memo = det.replace(/^\s*[0-9lI|]{0,3}\s*[·ㆍ・•]\s*/, '').replace(/^[\s·ㆍ・•\-–—.,。:;|[\]{}()lI]+/, '').replace(/\s+/g, ' ').trim();
    const hg = (memo.match(/[가-힣]/g) || []).length; if (memo && (hg < 2 || hg / memo.replace(/\s/g, '').length < .5)) memo = '';   // 깨진 글자(한글이 적은 것)는 버려요
    out.push({ key, memo: !!memo, s: `${date} ${t} ${kind}${ex ? ' ' + ex : ''}${memo ? (kind === '메모' ? ' ' : ' # ') + memo : ''}` }); cur = null;
  };
  L.forEach(ln => {
    const txt = ln.text.replace(/\s+/g, ' ').trim(); if (!txt) return;
    const dm = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(txt);
    if (dm && !noDate && +dm[1] >= 1 && +dm[1] <= 12 && +dm[2] >= 1 && +dm[2] <= 31) { let y = +T.slice(0, 4), d = `${y}-${p2(dm[1])}-${p2(dm[2])}`; if (d > T) d = `${y - 1}-${p2(dm[1])}-${p2(dm[2])}`; fin(); date = found = d; return; }
    let tm = /^\W{0,2}([0-2]?\d)\s*[:;.]\s*([0-5]\d)\b(.*)$/.exec(txt);
    if (!tm) { const t2 = /^\W{0,2}([0-2]\d)[1Il|]?([0-5]\d)\b(.*)$/.exec(txt); if (t2 && OK.some(([w]) => t2[3].replace(/\s/g, '').includes(w))) tm = t2; }   // ':'을 '1'로 잘못 읽은 시각 (17112 → 17:12)
    if (tm && +tm[1] < 24) {
      fin(); const rest = tm[3]; let kind = (OK.find(([w]) => rest.replace(/\s/g, '').includes(w)) || [])[1] || '';
      if (!kind && ln.words && ln.words.length > 1) kind = hueKind(cv, (ln.words.find((w, i) => i > 0 && /[^\d:;.\s]/.test(w.text)) || {}).bbox);
      cur = { t: `${p2(tm[1])}:${tm[2]}`, kind, det: '' };
      const after = rest.replace(new RegExp((OK.find(([w]) => rest.replace(/\s/g, '').includes(w)) || [''])[0].split('').map(c => c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('\\s*')), '').replace(/[>›]/g, '').trim();   // 같은 줄에 뒤따르는 내용
      if (after && /\d|[가-힣]/.test(after) && kind) cur.det = after;
      return;
    }
    if (cur && !cur.det) cur.det = txt; else if (cur && cur.det && txt.length < 30 && /[가-힣]/.test(txt) && !/모유수유|이유식|유축수유/.test(txt)) cur.det += ' ' + txt;
  });
  fin(); return { out, skip, date: found };
}
async function impOcr(files) {
  const st = m => { const el = $('dy-ocrst'); if (el) el.textContent = m; }, ta = $('dy-imp'); if (!files.length || !ta) return;
  try {
    const w = await ocrWorker(st); let all = [], sk = []; const warn = [];
    for (let i = 0; i < files.length; i++) {
      st(`사진 ${i + 1}/${files.length} 읽는 중…`);
      // 두 번 읽어 합쳐요: 원래 크기(날짜·시각을 잘 읽음) + 크게 키운 것(한글 메모를 잘 읽음)
      const bm = await createImageBitmap(files[i]), mk = sc => { const cv = document.createElement('canvas'); cv.width = Math.round(bm.width * sc); cv.height = Math.round(bm.height * sc); const cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(bm, 0, 0, cv.width, cv.height); return cv; };
      const c1 = mk(1), a = ocrLines((await w.recognize(c1)).data, c1, D.date || today());
      if (!a.date) {   // 날짜를 못 읽었으면 화면 위쪽만 크게 키워서 한 번 더
        const top = document.createElement('canvas'), h = Math.round(bm.height * .3), k = Math.min(3, 2000 / bm.width); top.width = Math.round(bm.width * k); top.height = Math.round(h * k); top.getContext('2d').drawImage(bm, 0, 0, bm.width, h, 0, 0, top.width, top.height);
        const tx = ((await w.recognize(top)).data.text || '').replace(/\s+/g, ' '), dm = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(tx) || /(\d{1,2})\s*\D{1,2}\s*(\d{1,2})\s*\D{0,2}\s*\(/.exec(tx);
        if (dm && +dm[1] >= 1 && +dm[1] <= 12 && +dm[2] >= 1 && +dm[2] <= 31) { const T = today(), y = +T.slice(0, 4); let d = `${y}-${p2(dm[1])}-${p2(dm[2])}`; if (d > T) d = `${y - 1}-${p2(dm[1])}-${p2(dm[2])}`; a.date = d; a.out.forEach(x => { x.s = d + x.s.slice(10); }); }
        else warn.push(`사진 ${i + 1}의 날짜를 못 읽어 ${fmtMD(D.date || today())}로 넣었어요 — 고쳐 주세요`);
      }
      let res = a.out, miss = a.skip; const sc = Math.min(2.5, 1800 / bm.width);
      if (sc > 1.3) {
        st(`사진 ${i + 1}/${files.length} 한 번 더 자세히 읽는 중…`);
        const c2 = mk(sc), z = ocrLines((await w.recognize(c2)).data, c2, a.date || D.date || today(), true), M = new Map(res.map(x => [x.key, x]));
        z.out.forEach(x => { const o = M.get(x.key); if (!o || (x.memo && !o.memo) || o.s.split(' ')[2] === x.s.split(' ')[2]) M.set(x.key, x); });   // 같은 줄이면 키운 쪽(메모가 잘 읽힘)
        res = [...M.values()]; miss = a.skip.filter(m => !M.has(m.key)).concat(z.skip.filter(m => !M.has(m.key) && !a.skip.some(q => q.key === m.key)));
        res.sort((p, q) => q.s.slice(11, 16).localeCompare(p.s.slice(11, 16)));
      }
      all = all.concat(res.map(x => x.s)); sk = sk.concat(miss.map(m => m.t));
    }
    if (all.length) { ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + all.join('\n'); ta.dispatchEvent(new Event('input', { bubbles: true })); if (window.__app) __app.sheetDirty(); }
    st((warn.length ? '⚠️ ' + warn.join(' · ') + '\n' : '') + (all.length ? `📷 ${all.length}개 읽었어요. 아래 글을 한 번 훑어보고 틀린 곳만 고쳐서 '가져오기'를 눌러요${sk.length ? ` · 못 읽은 기록 ${sk.length}개(${sk.slice(0, 4).join(', ')}) — 직접 적어 주세요` : ''}` : '기록을 찾지 못했어요. 시각(예: 10:23)이 보이는 기록 화면을 캡처해 주세요'));
  } catch (e) { st('읽지 못했어요: ' + (e.message || e)); }
}
document.addEventListener('change', e => { if (e.target.id === 'dy-impf') { const f = [...(e.target.files || [])]; e.target.value = ''; impOcr(f); } });
async function impGo(b) {
  const r = parseImp(($('dy-imp') || {}).value), er = $('dy-err');
  if (!r.out.length) { er.textContent = '읽은 기록이 없어요. 형식을 확인해 주세요'; return; }
  // 이미 같은 날·같은 시각·같은 종류 기록이 있으면 빼요 (두 번 넣어도 겹치지 않게)
  const have = new Set((S.cares || []).map(c => c.date + c.t + c.k)), L = r.out.filter(x => !have.has(x.date + x.it.t + x.it.k) && x.date >= S.profile.birth && x.date <= today()), skip = r.out.length - L.length;
  if (!L.length) { er.textContent = '모두 이미 있는 기록이에요'; return; }
  if (!(await ask(`${L.length}개 기록을 넣을까요?${skip ? `\n(이미 있거나 날짜가 맞지 않는 ${skip}개는 빼요)` : ''}${r.bad.length ? `\n못 읽은 줄 ${r.bad.length}개는 빠져요` : ''}`, { ok: '넣기' }))) return;
  b.disabled = true; const res = await write('careImport', L); b.disabled = false; if (!res) return;
  closeSheet(); const last = L.map(x => x.date).sort().pop(); D.mode = 'day'; D.sub.day = 'log'; D.date = last; render(); toast(`📥 ${L.length}개 기록을 넣었어요`);
}
// 타이머: 수면(잠든 시각부터) · 모유수유(왼쪽·오른쪽 따로 쌓기) — 두 폰이 같이 봐요
async function startTimer(k) {
  const now = new Date(), it = { id: newCid(), k, t: hmOf(now), live: 1, at: Date.now() };
  if (k === 'breast') Object.assign(it, { side: 'l', seg: Date.now(), l: 0, r: 0 });
  const res = await write('careSave', ymdOf(now), it, ''); if (!res) return;
  F = null; closeSheet(); D.mode = 'day'; D.sub.day = 'log'; D.date = today(); render();
  toast(k === 'sleep' ? '😴 잘 자요… 깨면 위 카드에서 \'깼어요\'를 눌러요' : '🤱 수유 타이머 시작 · 쪽을 바꾸면 ↔를 눌러요');
}
async function endTimer(id, sw) {
  const c = (S.cares || []).find(x => x.id === id); if (!c) return;
  const now = Date.now(), it = Object.assign({}, c), add = c.seg ? Math.max(0, (now - c.seg) / 60000) : 0;
  if (c.k === 'breast') { if (c.side === 'r') it.r = (+c.r || 0) + add; else it.l = (+c.l || 0) + add; }
  if (sw) { it.side = c.side === 'r' ? 'l' : 'r'; it.seg = now; }
  else {
    it.live = 0; it.seg = 0; const end = new Date(now); it.e = hmOf(end);
    if (now - msOf(c.date, c.t) > 26 * 36e5) it.e = '';   // 하루 넘게 켜 둔 건 끝 시각을 비워요 (고치기에서 맞춰요)
  }
  delete it.date;
  const res = await write('careSave', c.date, it, ''); if (!res) return;
  render(); if (!sw) toast(c.k === 'sleep' ? `😴 ${durTxt((now - msOf(c.date, c.t)) / 60000)} 잤어요` : `🤱 수유 끝 · 왼쪽 ${Math.round(it.l || 0)}분 · 오른쪽 ${Math.round(it.r || 0)}분`);
}
// 진행 중 시간 글자만 고쳐요 (화면 전체를 다시 그리지 않게)
function tick() {
  const L = (S.cares || []).filter(c => c.live), fl = document.querySelectorAll('[data-feedleft]');
  if ((!L.length && !fl.length) || S.tab !== 'day' || S.view) { clearInterval(D.iv); D.iv = 0; return; }
  fl.forEach(el => { el.textContent = leftTxt(+el.dataset.feedleft); el.closest('.dynext').classList.toggle('late', +el.dataset.feedleft < Date.now()); });
  L.forEach(c => {
    const t = Date.now() - msOf(c.date, c.t), txt = c.k === 'breast' ? (() => { const add = c.seg ? (Date.now() - c.seg) / 60000 : 0, l = (+c.l || 0) + (c.side !== 'r' ? add : 0), r = (+c.r || 0) + (c.side === 'r' ? add : 0); return `왼쪽 ${Math.floor(l)}분 · 오른쪽 ${Math.floor(r)}분`; })() : `${durTxt(t / 60000)}째`;
    document.querySelectorAll(`[data-el="${c.id}"]`).forEach(el => { el.textContent = txt; });
  });
}
function afterRender() {
  if (S.tab !== 'day' || S.view) return;
  tick(); if (((S.cares || []).some(c => c.live) || document.querySelector('[data-feedleft]')) && !D.iv) D.iv = setInterval(tick, 15000);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-dy]'); if (!b || b.disabled) return;
  const a = b.dataset.dy, v = b.dataset.v;
  if (a === 'mode') { D.mode = v; if (v === 'week') D.wk = monday(D.date); render(); return; }
  if (a === 'sub') { D.sub[D.mode] = v; render(); return; }
  if (a === 'prev' || a === 'next') { const n = a === 'prev' ? -1 : 1; if (D.mode === 'week') { const w = addDays(D.wk, 7 * n); if (w <= today()) D.wk = w; } else { const d = addDays(D.date, n); if (d <= today() && d >= S.profile.birth) D.date = d; } D.sel = {}; render(); return; }
  if (a === 'today') { D.date = today(); D.wk = monday(today()); D.sel = {}; render(); return; }
  if (a === 'add') {
    const k = b.dataset.k;
    if (k === 'solid') { openMeal(null, { date: D.date, tm: D.date === today() ? hmOf(new Date()) : '12:00' }); return; }
    if (k === 'temp' || k === 'med') { openLog(k); return; }
    quickAdd(k, b); return;
  }
  if (a === 'edit') { const c = (S.cares || []).find(x => x.id === b.dataset.id); if (c) openForm(c.k, c); return; }
  if (a === 'editlog') { const l = (S.logs || []).find(x => x.id === b.dataset.id); if (l) openLog(l.kind, l.id); return; }
  if (a === 'save') { save(b); return; }
  if (a === 'del') {
    const c = (S.cares || []).find(x => x.id === b.dataset.id); if (!c) return;
    if (!(await ask('이 기록을 지울까요?', { ok: '지우기', danger: true }))) return;
    if (await write('careDelete', c.date, c.id)) { F = null; closeSheet(); render(); toast('기록을 지웠어요'); }
    return;
  }
  if (a === 'timer') { startTimer(b.dataset.k); return; }
  if (a === 'end' || a === 'switch') { endTimer(b.dataset.id, a === 'switch'); return; }
  if (a === 'ml' || a === 'mlset') { const el = $('dy-ml'); if (!el) return; const n = a === 'ml' ? Math.max(0, num(el.value) + +v) : +v; el.value = n; document.querySelectorAll('#sheet .dyqk button').forEach(x => x.classList.toggle('on', +x.dataset.v === n)); if (window.__app) __app.sheetDirty(); return; }
  if (a === 'now') { tpSet(b.dataset.t, hmOf(new Date())); return; }
  if (a === 'tpx') { tpSet(b.dataset.t, ''); return; }
  if (a === 'tp') { tpStep(b.dataset.t, b.dataset.u, +v); return; }
  if (a === 'min') { const el = $(b.dataset.t); if (el) { el.value = Math.max(0, num(el.value) + +v); if (window.__app) __app.sheetDirty(); } return; }
  if (a === 'minset') { ['dy-l', 'dy-r'].forEach(id => { const el = $(id); if (el) el.value = v; }); if (window.__app) __app.sheetDirty(); return; }
  if (a === 'pp') { if (!F) return; F[v] = !F[v]; b.classList.toggle('on', F[v]); pooSync(); if (window.__app) __app.sheetDirty(); return; }
  if (a === 'flt') { if (D.off.has(v)) D.off.delete(v); else D.off.add(v); render(); return; }
  if (a === 'stat') { D.stat = v; D.sel = {}; render(); return; }
  if (a === 'bar') {
    const key = b.dataset.k; D.sel[key] = +v;
    const box = document.querySelector(`[data-ch="${CSS.escape(key)}"]`); if (box) { const [st, mk] = key.split('.'), M = (METRICS[st] || []).find(x => x[0] === mk); if (M) { const days = [...Array(7)].map((_, i) => addDays(D.wk, i)), vals = days.map(d => M[3](stats(d))), u = st === 'solid' && mk === 'amt' ? (days.map(stats).find(s => s.solid.n) || { solid: { unit: 'g' } }).solid.unit : M[2]; box.innerHTML = bars(key, days, vals, u, st === 'diaper' ? (mk === 'poo' ? K.poo.c : K.pee.c) : K[st].c); } }
    return;
  }
  if (a === 'imp') { impSheet(); return; }
  if (a === 'impgo') { impGo(b); return; }
  if (a === 'impocr') { const f = $('dy-impf'); if (f) f.click(); return; }
  if (a === 'feedset') { feedSheet(); return; }
  if (a === 'feedsave') { feedSave(); return; }
  if (a === 'tip') { const t = $('dy-tip'); if (t && D.tips) t.textContent = D.tips[+v] || ''; return; }
});
document.addEventListener('change', e => {
  if (e.target.id !== 'dy-pick' || !e.target.value) return;
  const d = e.target.value > today() ? today() : e.target.value;
  if (D.mode === 'week') D.wk = monday(d); else D.date = d;
  D.sel = {}; render();
});
// 앱이 열려 있을 때 수유 예정 시각이 되면 소리 + 창 (알람 켬일 때, 예정 시각마다 이 폰에서 한 번)
let ringAC = null, ringOn = null;
function ring() {
  try {
    ringAC = ringAC || new (window.AudioContext || window.webkitAudioContext)(); if (ringAC.state === 'suspended') ringAC.resume();
    const ac = ringAC, g = ac.createGain(); g.connect(ac.destination); g.gain.value = .25; const t0 = ac.currentTime;
    for (let i = 0; i < 20; i++) [880, 1175, 1568].forEach((f, j) => { const o = ac.createOscillator(), e = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; o.connect(e); e.connect(g); const s = t0 + i * 1.5 + j * .16; e.gain.setValueAtTime(0, s); e.gain.linearRampToValueAtTime(1, s + .02); e.gain.exponentialRampToValueAtTime(.001, s + .5); o.start(s); o.stop(s + .55); });
    ringOn = g; if (navigator.vibrate) navigator.vibrate([600, 200, 600, 200, 1200]);
  } catch (e) {}
}
function ringStop() { try { if (ringOn) { ringOn.disconnect(); ringOn = null; } if (navigator.vibrate) navigator.vibrate(0); } catch (e) {} }
setInterval(() => {
  if (S.mode !== 'ok' || !S.profile) return; const f = nextFeed(); if (!f.c.on || !f.due) return;
  const at = f.due - (+f.c.pre || 0) * 60e3; if (Date.now() < at || Date.now() > f.due + 30 * 60e3) return;
  let done = ''; try { done = localStorage.getItem('soeun-feed-rang') || ''; } catch (e) {} if (done === String(f.due)) return;
  try { localStorage.setItem('soeun-feed-rang', String(f.due)); } catch (e) {}
  ring();
  ask(`🍼 수유 시간이에요\n${hmOf(new Date(f.due))} 예정 · 마지막 수유 ${f.last.t}`, { ok: '🍼 분유 바로 남기기', no: '소리 끄기' }).then(ok => { ringStop(); if (ok) { S.tab = 'day'; S.view = ''; render(); quickAdd('formula'); } });
}, 20000);
document.addEventListener('pointerdown', () => { try { if (!ringAC) ringAC = new (window.AudioContext || window.webkitAudioContext)(); if (ringAC.state === 'suspended') ringAC.resume(); } catch (e) {} }, { once: true, capture: true });   // 소리를 낼 수 있게 첫 터치 때 미리 깨워 둬요
// 성장 수사 첫 화면 등에서 쓰는 오늘 요약 (마지막 수유 등)
function summary() { const s = stats(today()); return s; }

const css = document.createElement('style');
css.textContent = `
.dynav{display:flex;align-items:center;justify-content:center;gap:10px;margin:14px 0 4px}
.dynav>button{width:44px;height:44px;border-radius:50%;border:1.5px solid var(--line);background:#FFFDF7;color:var(--navy);font-size:24px;line-height:1}
.dynav>button:disabled{opacity:.3}
.dyd{position:relative;font-family:var(--display);font-size:clamp(17px,5vw,21px);color:var(--navy);padding:6px 10px;border-radius:12px;text-align:center}
.dyd input{position:absolute;inset:0;opacity:0;width:100%;height:100%}
.dytoday{display:block;margin:0 auto 6px;min-height:32px;border-radius:99px;border:1.5px solid var(--red);background:#FFF6F3;color:var(--red);font-size:13px;padding:0 14px}
.dysub{display:flex;gap:18px;border-bottom:1.5px solid var(--line);margin:8px 0 12px;padding:0 4px}
.dysub button{border:0;background:none;padding:8px 2px;font-family:var(--display);font-size:17px;color:var(--muted);border-bottom:3px solid transparent;margin-bottom:-1.5px;min-height:44px}
.dysub button.on{color:var(--navy);border-bottom-color:var(--red)}
.dyq{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px 2px;padding:2px 0 12px}
.dyq button{min-width:0;border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:4px;padding:0}
.dyq button span{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-size:26px;background:color-mix(in srgb,var(--c) 16%,#FFFDF7);border:2px solid color-mix(in srgb,var(--c) 45%,transparent);box-shadow:0 2px 0 rgba(31,42,68,.08)}
.dyq button b{font-weight:400;font-size:12.5px;color:var(--ink);white-space:nowrap}
.dyq button:active span{transform:scale(.94)}
.dylive{display:flex;align-items:center;gap:10px;background:#FFFDF7;border:2px solid var(--c);border-radius:16px;padding:10px 12px;margin:6px 0 10px;box-shadow:0 3px 0 color-mix(in srgb,var(--c) 30%,transparent)}
.dyli{font-size:28px}.dylive>div:nth-child(2){flex:1;min-width:0}.dylive b{font-family:var(--display);font-weight:400;font-size:17px;color:var(--navy)}
.dylive small{display:block;font-size:12.5px;color:var(--muted)}.dylive small b{font-family:var(--body);font-size:12.5px;color:var(--ink)}
.dylb{display:flex;flex-direction:column;gap:6px}.dylb button{min-height:38px;border-radius:99px;border:1.5px solid var(--navy);background:#fff;color:var(--navy);font-size:13px;padding:0 12px;white-space:nowrap}
.dylb button.go{background:var(--c);border-color:var(--c);color:#fff}
.dysum{padding:12px 14px}
.dylh{margin:0 0 4px;font-size:12px;color:var(--muted)}
.dylast{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0 0 10px}
.dylast>div{background:#FFFDF7;border:1px solid var(--line);border-radius:12px;padding:7px 4px 6px;text-align:center;min-width:0}
.dylast small{display:block;font-size:12px;color:var(--muted);white-space:nowrap}
.dylast>div>b{display:block;font-family:var(--display);font-weight:400;font-size:22px;color:var(--navy);line-height:1.2}.dylast>div>b.no{color:var(--muted)}
.dylast em{display:block;font-style:normal;font-size:12px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dylast em b{font-weight:400}
.dychips{display:flex;flex-wrap:wrap;gap:6px}.dychips span{font-size:12.5px;background:#FFFDF7;border:1px solid var(--line);border-radius:99px;padding:3px 10px}
.dylist{padding:4px 10px}
.dyrow{display:flex;align-items:flex-start;gap:10px;width:100%;border:0;background:none;text-align:left;padding:10px 2px;position:relative;min-height:60px}
.dyrow+.dyrow{border-top:1px dashed var(--line)}
.dyt{flex:0 0 46px;font-family:var(--display);font-size:16px;color:var(--muted);padding-top:2px}.dyt small{font-size:11px;margin-left:1px}
.dydot{flex:0 0 18px;height:18px;border-radius:50%;margin-top:3px;background:color-mix(in srgb,var(--c) 30%,#fff);border:2px solid var(--c)}
.dyb{flex:1;min-width:0}.dyb b{display:block;font-family:var(--display);font-weight:400;font-size:16px;color:var(--navy)}
.dyb small{display:block;font-size:13px;color:var(--ink);opacity:.85;line-height:1.5}.dyb em{font-style:normal;font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:8px;padding:0 5px;margin-left:4px;white-space:nowrap}
.dyrow i{font-style:normal;color:var(--muted);font-size:20px;padding-top:6px}
.dynext{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:#FFFDF7;border:2px solid var(--navy);border-radius:16px;padding:10px 12px;margin:2px 0 12px;box-shadow:0 3px 0 rgba(31,42,68,.15)}
.dynext>span{font-size:28px}.dynext>div{flex:1;min-width:0}.dynext small{display:block;font-size:12px;color:var(--muted)}
.dynext b{font-family:var(--display);font-weight:400;font-size:26px;color:var(--navy);margin-right:8px}.dynext b.sm{font-size:15px;display:block}.dynext em{font-style:normal;font-size:14px;color:var(--ink)}
.dynext.late{border-color:var(--red)}.dynext.late em{color:var(--red);font-weight:700}.dynext>i{font-style:normal;font-size:20px}
.dyocrb{display:block;width:100%;min-height:48px;margin:0 0 6px;font-size:14.5px}.dyocrb small{display:block;font-size:12px;color:var(--muted)}
.dyimp{display:block;width:100%;min-height:42px;margin:6px 0 0;font-size:13.5px}
.dyimpex{background:#FFFDF7;border:1px dashed var(--line);border-radius:10px;padding:8px 10px;font-size:12px;line-height:1.6;white-space:pre-wrap;margin:0 0 10px;font-family:var(--body)}
.dyrow.flash{animation:dyflash 2.4s ease-out}@keyframes dyflash{0%,40%{background:#FFE7A8}100%{background:transparent}}
.dyrow.live{background:color-mix(in srgb,#FFF3E2 70%,transparent);border-radius:12px}
.dyfl{display:flex;flex-wrap:wrap;gap:6px;padding:2px 0 10px}   /* 두 줄로 감아서 고른 칸이 늘 보이게 */
.dyfl button{flex:0 0 auto;display:flex;align-items:center;gap:5px;min-height:36px;border-radius:99px;border:1.5px solid var(--line);background:#FFFDF7;color:var(--muted);font-size:13px;padding:0 11px}
.dyfl button i{width:10px;height:10px;border-radius:50%;background:var(--c);opacity:.35}
.dyfl button.on{border-color:var(--c);color:var(--ink);background:color-mix(in srgb,var(--c) 12%,#FFFDF7)}.dyfl button.on i{opacity:1}
.dyclock{background:var(--card);border-radius:18px;padding:8px 6px 10px;margin-bottom:12px}
.dyclock svg{display:block;width:100%;max-width:360px;margin:0 auto}
.dyclock path{cursor:pointer}
.dyax{font-size:12px;fill:var(--muted);font-family:var(--body)}.dyax.b{font-weight:700;fill:var(--navy)}
.dyc1{font-family:var(--display);font-size:19px;fill:var(--navy)}
.dytip{text-align:center;margin:4px 0 0;font-size:13px;color:var(--ink);min-height:20px}
.dytbl{width:100%;border-collapse:separate;border-spacing:0;margin:0 0 12px;border:1.5px solid var(--line);border-radius:14px;overflow:hidden;background:#FFFDF7;font-size:14px}
.dytbl th,.dytbl td{padding:10px 12px;text-align:center;border-top:1px solid var(--line)}.dytbl thead th{border-top:0;font-family:var(--display);font-weight:400;font-size:15px;color:var(--navy)}
.dytbl.f thead{background:color-mix(in srgb,#d45a0c 14%,#FFFDF7)}.dytbl.d thead{background:color-mix(in srgb,#2a78d6 13%,#FFFDF7)}.dytbl.s thead{background:color-mix(in srgb,#3f4cc0 12%,#FFFDF7)}
.dytbl tbody th{font-weight:400;width:50%}
.dywk{padding:12px 12px 14px}.dywk h3{display:flex;justify-content:space-between;align-items:center;margin:0 0 6px;font-family:var(--display);font-weight:400;font-size:18px;color:var(--navy)}
.dywk h3 small{font-family:var(--body);font-size:12px;color:var(--muted);background:#FFFDF7;border:1px solid var(--line);border-radius:8px;padding:2px 8px}
.dybars{display:block;width:100%}.dybars rect[data-dy]{cursor:pointer}
.dypill{font-size:12px;font-weight:700;fill:var(--ink);font-family:var(--body)}
.dynone{text-align:center;color:var(--muted);font-size:13px;padding:22px 0 8px}.dynone span{display:block;font-size:26px;opacity:.5}
.dynd{display:flex;justify-content:space-around;margin-top:22px;border-top:1px solid var(--line);padding-top:6px}.dynd i{font-style:normal;font-size:12px}
.dychg{background:#FFFDF7;border-radius:14px;padding:10px 14px;margin-top:8px}.dychg>b{font-family:var(--display);font-weight:400;font-size:16px;color:var(--navy)}
.dychg>div{display:flex;align-items:center;justify-content:space-around;margin-top:4px}.dychg span{text-align:center}.dychg small{display:block;font-size:12px;color:var(--muted)}
.dychg em{font-style:normal;font-size:14px;color:var(--ink)}.dychg big{font-family:var(--display);font-size:28px;color:var(--navy)}.dychg i{font-style:normal;font-size:22px;color:var(--muted)}
.dywpat{background:var(--card);border-radius:18px;padding:10px 8px}.dywpat svg{display:block;width:100%}
.dyamt{display:flex;align-items:center;justify-content:center;gap:14px;margin:4px 0 8px}
.dyamt>button,.dyside>button{width:52px;height:52px;border-radius:50%;border:1.5px solid var(--navy);background:#fff;color:var(--navy);font-size:26px;line-height:1}
.dyamt span{display:flex;align-items:baseline;gap:4px}
.dyamt input{width:120px;border:0;border-bottom:3px solid var(--red);background:none;text-align:center;font-family:var(--display);font-size:52px;color:var(--red);padding:0}
.dyamt small{font-family:var(--display);font-size:22px;color:var(--red)}
.dyqk{justify-content:center}.dyqk button.on{background:var(--navy);color:#fff}
.dyside{display:flex;align-items:center;gap:10px;margin:0 0 10px}.dyside>b{flex:0 0 56px;font-family:var(--display);font-weight:400;font-size:17px;color:var(--navy)}
.dyside span{flex:1;display:flex;align-items:baseline;justify-content:center;gap:4px}.dyside input{width:72px;border:0;border-bottom:3px solid var(--red);background:none;text-align:center;font-family:var(--display);font-size:34px;color:var(--red)}
.dyside small{font-size:15px;color:var(--red)}
.dytimer{width:100%;min-height:48px;margin:2px 0 12px;font-size:15px}
.dytpr{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dytpr.one{grid-template-columns:1fr}
.field .dytp{display:flex;flex-direction:row;align-items:center;gap:4px;flex-wrap:wrap}.dytp>b{font-family:var(--display);font-size:26px;color:var(--navy)}
.field .dytpc{display:flex;width:auto;flex-direction:column;align-items:center;gap:2px}
.field .dytpc button{width:52px;padding:0;height:34px;border-radius:10px;border:1.5px solid var(--line);background:#FFFDF7;color:var(--navy);font-size:15px;line-height:1}
.dytpc button:active{background:var(--navy);color:#fff}
.field .dytp .dytpi{display:block;width:52px;min-width:0;min-height:0;flex:none;height:46px;margin:0;text-align:center;font-family:var(--display);font-size:26px;color:var(--red);border:1.5px solid var(--line);border-radius:10px;background:#fff;padding:0}
.field .dytp.empty .dytpi{color:var(--muted)}
.field .dytpa{flex-basis:100%;font-size:12px;color:var(--muted);min-height:16px}
.dytpq{display:flex;gap:6px;margin-top:4px}.dytpq button{flex:1;min-height:38px;font-size:13px;padding:0 6px}
.dyguide{margin-top:16px}
.dymulti button{min-height:46px;font-size:15px;padding:0 18px}
.dypoo.off{opacity:.4;pointer-events:none}
.dyamt.sm input{width:90px;font-size:42px}.dyamt.sm small{font-size:18px}`;
document.head.appendChild(css);
window.DAY = { render: render_, afterRender, summary, stats, open: (k) => { S.tab = 'day'; S.view = ''; render(); if (k) openForm(k, null); } };
})();
