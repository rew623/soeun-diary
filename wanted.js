// 이번 주 수배범 — 매주 월요일 귀여운 수배범 포스터가 붙고, 엄마·아빠가 이번 주에 남긴 기록·사진으로 체력을 깎아 일요일까지 체포해요 (부부 협동)
// 계산은 이미 남긴 기록(남긴 때 t, 없으면 그 기록의 날짜)으로 해서 두 폰에 같게 보여요. 저장하는 건 현상금 받은 주(game/shared의 wanted 칸)뿐
// 체력은 지난 4주 평균 공격량의 80% (30~150). 현상금은 도토리 10개, 금요일까지 잡으면 5개 더 (두 폰이 두 번 받지 않게 runTransaction)
(function () {
const W = { ws: '', more: false, paying: false, tried: {} };
const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const pad = n => String(n).padStart(2, '0');
const dayOf = ms => { const x = new Date(ms); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const WDK = '일월화수목금토';
const wd = d => WDK[new Date(pd(d)).getUTCDay()];
const monday = d => addDays(d, -((new Date(pd(d)).getUTCDay() + 6) % 7));
const md = d => `${+d.slice(5, 7)}월 ${+d.slice(8)}일`;

// [나이(개월) 부터, 까지, id, 이름, 그림, 죄목, 특징]
const VILLAINS = [
  [0, 4, 'dawn', '새벽 기상 백작', '🦇', '매일 새벽 수사관 기상 소집', '새벽 3시에 가장 활발함'],
  [0, 5, 'grumble', '잠투정 대마왕', '😤', '졸린데도 안 자겠다고 버티기', '눈 비비면서 끝까지 버팀'],
  [0, 3, 'hiccup', '딸꾹질 도사', '🎐', '수유 뒤 딸꾹질로 수사 방해', '한번 시작하면 10분'],
  [0, 4, 'burp', '트림 묵비권단', '🤐', '등을 두드려도 트림 거부', '눕히면 그제야 끄억'],
  [0, 6, 'hold', '안아줘 협박범', '🤱', '내려놓는 순간 사이렌 가동', '등에 센서 장착'],
  [0, 12, 'bath', '목욕 거부단', '🛁', '물만 닿으면 집단 항의', '씻고 나면 세상 행복'],
  [0, 3, 'mitten', '손싸개 탈출범', '🧤', '손싸개 벗고 얼굴 긁기 시도', '손재주 비상'],
  [0, 4, 'smile', '배냇짓 미소 도둑', '😊', '자면서 웃어 수사관 심장 절도', '증거 사진 촬영 극히 어려움'],
  [3, 9, 'drool', '침 무단 방류범', '💧', '턱받이 순식간에 흠뻑', '이가 날 때 활동 증가'],
  [2, 7, 'fist', '주먹 시식꾼', '✊', '주먹째 입에 넣고 시식', '양손 번갈아 시식'],
  [3, 8, 'roll', '뒤집기 폭주족', '🔄', '눕히기만 하면 뒤집기 질주', '돌아오는 법은 아직 모름'],
  [2, 9, 'babble', '옹알이 소음범', '🗣️', '새벽에 혼자 옹알옹알 연설', '알아들어 주면 크게 웃음'],
  [3, 12, 'hair', '머리카락 사냥꾼', '💇', '수사관 머리카락 기습 공격', '악력 최상급'],
  [3, 12, 'paci', '쪽쪽이 실종범', '🍼', '쪽쪽이를 침대 밑으로 던짐', '찾아 주면 또 던짐'],
  [5, 14, 'spoon', '숟가락 탈취범', '🥄', '이유식 숟가락 강제 압수', '한번 쥐면 안 놓음'],
  [6, 18, 'splash', '이유식 투척범', '🥣', '한 입 먹고 반은 바닥에', '바닥 청소는 수사관 몫'],
  [7, 16, 'crawl', '기어서 도주범', '🐛', '한눈판 사이 현장 이탈', '소파 뒤로 잠적'],
  [6, 18, 'taste', '바닥 감식반장', '🔍', '눈에 띄는 건 일단 입으로 감식', '먼지 한 톨도 놓치지 않음'],
  [10, 36, 'drawer', '서랍 털이범', '🗄️', '열 수 있는 건 다 열어 봄', '잠금장치 연구 중'],
  [10, 36, 'remote', '리모컨 은닉범', '📺', '리모컨 행방 묘연', '늘 소파 틈에 숨김'],
  [10, 36, 'tissue', '휴지 풀기 장인', '🧻', '두루마리 휴지 끝까지 풀기', '다 풀고 뿌듯해함'],
  [9, 36, 'sock', '양말 실종 사건범', '🧦', '신기기만 하면 양말 벗어 던짐', '꼭 한 짝만 숨김'],
  [14, 60, 'nope', '"아니야" 대왕', '🙅', '모든 질문에 일단 "아니야"', '좋아도 아니야'],
  [12, 60, 'climb', '소파 등반가', '🧗', '소파·식탁 무단 등반', '내려오는 법은 연구 중'],
  [0, 999, 'cute', '귀여움 과다 소지범', '💖', '현장 수사관 전원 심쿵 유발', '가중처벌 대상']
];
// 공격: [그림, 이름, 피해, 설명, 세는 말]
const KIND = {
  photo: ['📷', '사진', 2, '1장마다 (한 사람이 하루 12장까지)', '장'],
  rec: ['📏', '성장 기록', 8, '사진까지 붙이면 10', '건'],
  first: ['👀', '최초 목격', 15, '결정적 증거!', '건'],
  month: ['🗓️', '월별 증거 사진', 10, '', '장'],
  meal: ['🥄', '급식 기록', 3, '', '건'],
  food: ['🥕', '새 식재료 심문', 5, '', '가지'],
  visit: ['🏥', '병원 기록', 6, '', '건'],
  log: ['🌡️', '아픈 날 기록', 2, '하루 5건까지', '건'],
  vac: ['💉', '예방접종', 10, '', '건'],
  chk: ['🩺', '영유아검진', 15, '', '회'],
  dev: ['✅', '발달 체크', 3, '', '개'],
  guess: ['⚖️', '몸무게 예측', 3, '', '번'],
  look: ['🔍', '닮은꼴 판정', 2, '', '번'],
  cap: ['🔒', '봉인된 증거물', 10, '', '통'],
  team: ['🤝', '협동 공격', 5, '같은 날 엄마·아빠 둘 다 기록하면', '']
};
const CAP = { photo: 12, log: 5 };
const BOUNTY = 10, EARLY = 5;

// ---------- 계산 (화면을 그릴 때마다 부르니 기록이 그대로면 저장해 둔 걸 써요) ----------
let memo = null;
function events() {
  const src = [S.moments, S.records, S.meals, S.foods, S.visits, S.logs, S.vaccines, S.checkups, S.devs, S.guesses, S.looks, S.capsules];
  if (memo && memo.day === today() && memo.src.every((a, i) => a === src[i])) return memo.E;
  const E = [], add = (d, who, k, n) => { if (d && /^\d{4}-\d\d-\d\d$/.test(d)) E.push({ d, who: who === '엄마' || who === '아빠' ? who : '', k, n: n == null ? KIND[k][2] : n }); };
  const when = (o, d) => o.t ? dayOf(o.t) : d;                  // 남긴 날 (예전에 옮겨 온 기록은 그 기록의 날짜)
  (S.moments || []).forEach(m => { const ty = m.type || 'first', d = when(m, m.date); if (ty === 'first') add(d, m.by, 'first'); else if (ty === 'month') add(d, m.by, 'month'); else if (m.photo) add(d, m.by, 'photo'); });
  (S.records || []).forEach(r => add(when(r, r.date), r.by, 'rec', r.photo ? 10 : 8));
  (S.meals || []).forEach(m => add(when(m, m.date), m.by, 'meal'));
  (S.foods || []).forEach(f => add(when(f, f.start), f.by, 'food'));
  (S.visits || []).forEach(v => add(when(v, v.date), v.by, 'visit'));
  (S.logs || []).forEach(l => add(when(l, String(l.at || '').slice(0, 10)), l.by, 'log'));
  (S.vaccines || []).forEach(v => { if (v.done) add(v.done, v.by, 'vac'); });
  (S.checkups || []).forEach(c => { if (c.done) add(c.done, c.by, 'chk'); });
  (S.devs || []).forEach(x => add(x.at, x.by, 'dev'));
  (S.guesses || []).forEach(g => add(g.at, g.by, 'guess'));
  (S.looks || []).forEach(x => add(x.date, x.by, 'look'));
  (S.capsules || []).forEach(c => add(c.sealed, c.by, 'cap'));
  memo = { day: today(), src, E, weeks: {}, raw: {} };
  return E;
}
// 그 주 공격 목록 (하루 상한·협동 공격 포함, 날짜순)
function weekRaw(ws) {
  events(); if (memo.raw[ws]) return memo.raw[ws];
  const we = addDays(ws, 7), cnt = {}, who = {}, out = [];
  memo.E.filter(e => e.d >= ws && e.d < we).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0).forEach(e => {
    if (CAP[e.k]) { const key = e.d + e.who + e.k; cnt[key] = (cnt[key] || 0) + 1; if (cnt[key] > CAP[e.k]) return; }
    out.push(e); if (e.who) (who[e.d] = who[e.d] || new Set()).add(e.who);
  });
  Object.keys(who).forEach(d => { if (who[d].size === 2) out.push({ d, who: '', k: 'team', n: KIND.team[2] }); });
  out.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : (a.k === 'team') - (b.k === 'team'));
  return memo.raw[ws] = out;
}
const sum = L => L.reduce((a, e) => a + e.n, 0);
function hpOf(ws) {
  const b = S.profile.birth; let tot = 0, n = 0;
  for (let i = 1; i <= 4; i++) { const w = addDays(ws, -7 * i); if (addDays(w, 7) <= b) break; tot += sum(weekRaw(w)); n++; }
  return Math.max(30, Math.min(150, Math.round((n ? tot / n : 0) * .8 / 5) * 5));
}
function pool(ws) {
  const b = S.profile.birth, [mo] = monthsDays(b, ws < b ? b : ws), L = VILLAINS.filter(v => mo >= v[0] && mo < v[1]);
  return L.length ? L : VILLAINS;
}
const pick0 = ws => { const L = pool(ws); return L[hash(ws + (S.profile.name || '')) % L.length]; };
// 지난주와 같은 수배범이면 다음 수배범으로
function villain(ws) { const v = pick0(ws); if (v[2] !== pick0(addDays(ws, -7))[2]) return v; const L = pool(ws); return L[(L.indexOf(v) + 1) % L.length]; }
function stat(ws) {
  events(); if (memo.weeks[ws]) return memo.weeks[ws];
  const L = weekRaw(ws), hp = hpOf(ws), by = { 엄마: 0, 아빠: 0, '': 0 };
  let acc = 0, caught = '';
  for (const e of L) { by[e.who] += e.n; acc += e.n; if (!caught && acc >= hp) caught = e.d; }
  const end = addDays(ws, 6), early = !!caught && caught <= addDays(ws, 4);
  return memo.weeks[ws] = { ws, end, v: villain(ws), hp, dmg: acc, left: Math.max(0, hp - acc), by, team: L.filter(e => e.k === 'team').length, L, caught, early, over: today() > end, bounty: caught ? BOUNTY + (early ? EARLY : 0) : 0 };
}
const cur = () => monday(today());

// ---------- 현상금 (이번 주·지난주에 잡았는데 아직 안 받았으면) ----------
function check() {
  if (W.paying || S.mode !== 'ok' || !S.profile || !S.profile.birth || !S.game || !S.game.srv || (S.me && S.me.viewer) || typeof run !== 'function') return;
  const got = String(S.game.wanted || ''), c = cur();
  const due = [addDays(c, -7), c].filter(ws => ws > got && !W.tried[ws] && addDays(ws, 7) > S.profile.birth).map(stat).filter(s => s.caught);
  if (!due.length) return;
  W.paying = true;
  (async () => {
    let n = 0;
    for (const s of due) {
      W.tried[s.ws] = true;
      try { await run('saveGame', {}, s.bounty, undefined, { key: 'wanted', val: s.ws }); S.game.wanted = s.ws; n++; setTimeout(() => { if (window.GAME) GAME.confetti(); toast(`🚨 ${s.v[3]} 체포! 현상금 도토리 🌰 +${s.bounty}${s.early ? ' (주말 전 체포 보너스 포함)' : ''}`); }, 600 + n * 2300); }
      catch (e) { /* 다른 폰이 먼저 받았거나 인터넷이 안 되면 이번엔 그냥 둬요 (다음에 앱을 열 때 다시) */ }
    }
    if (n && window.__app && __app.refresh) __app.refresh();
  })().finally(() => { W.paying = false; });
}

// ---------- 성장 수사 탭 카드 ----------
function card() {
  if (!S.profile || !S.profile.birth) return '';
  const s = stat(cur()), v = s.v, pct = Math.round(s.left / s.hp * 100), dl = daysBetween(today(), s.end);
  return `<section class="wcard${s.caught ? ' got' : ''}" data-wt="open" role="button" tabindex="0" aria-label="이번 주 수배범 ${esc(v[3])} 자세히 보기">
    <div class="wpost" aria-hidden="true"><b>WANTED</b><span class="wface">${v[4]}</span><small>🌰 ${s.caught ? s.bounty : BOUNTY}</small></div>
    <div class="wbody">
      <h2 class="sh"><span>🚨 이번 주 수배범</span><span>${s.caught ? md(s.caught) + ' 체포' : dl > 0 ? `D-${dl} · 일요일까지` : '오늘 자정까지!'}</span></h2>
      <b class="wname">${esc(v[3])}</b>
      <small class="wcrime">죄목: ${esc(v[5])}</small>
      <div class="whp" role="meter" aria-label="수배범 남은 체력" aria-valuemin="0" aria-valuemax="${s.hp}" aria-valuenow="${s.left}"><i style="width:${pct}%"></i></div>
      <small class="whpt">${s.caught ? `체포 완료! 현상금 🌰 ${s.bounty}${s.early ? ' · 주말 전 체포 보너스' : ''}` : `남은 체력 <b>${s.left}</b>/${s.hp} · 엄마 ${s.by['엄마']} · 아빠 ${s.by['아빠']}${s.team ? ` · 🤝 ${s.team * KIND.team[2]}` : ''}`}</small>
    </div>
    ${s.caught ? '<span class="wstamp" aria-hidden="true">체포</span>' : ''}
  </section>`;
}

// ---------- 수배범 화면 (S.view='wanted') ----------
function attackLog(s) {
  const days = {};
  s.L.forEach(e => { const g = days[e.d] = days[e.d] || {}, key = e.who + '|' + e.k; const x = g[key] = g[key] || { who: e.who, k: e.k, n: 0, c: 0 }; x.n += e.n; x.c++; });
  const ds = Object.keys(days).sort().reverse();
  if (!ds.length) return `<p class="vempty">${s.over ? '이 주에는 공격 기록이 없어요.' : '아직 공격이 없어요. 사진 한 장, 기록 하나가 공격이 돼요!'}</p>`;
  return ds.map(d => `<div class="wday"><b>${md(d)} (${wd(d)})</b><div class="wchips">${Object.values(days[d]).map(x => { const k = KIND[x.k]; return `<span class="wchip ${x.who === '엄마' ? 'mom' : x.who === '아빠' ? 'dad' : 'all'}">${x.who ? `<em>${x.who}</em>` : ''}${k[0]} ${k[1]}${x.k !== 'team' && x.c > 1 ? ` ${x.c}${k[4]}` : ''} <strong>−${x.n}</strong></span>`; }).join('')}</div></div>`).join('');
}
function render_() {
  const c = cur(), ws = W.ws && W.ws <= c ? W.ws : c, s = stat(ws), v = s.v, pct = Math.round(s.left / s.hp * 100), dl = daysBetween(today(), s.end);
  const status = s.caught ? `<span class="wpstamp got">체포 완료<small>${md(s.caught)}</small></span>` : s.over ? '<span class="wpstamp gone">도주</span>' : '';
  const tot = s.by['엄마'] + s.by['아빠'] || 1;
  // 체포 기록부 (지난 주들)
  const weeks = []; for (let w = c; w >= monday(S.profile.birth) && weeks.length < 104; w = addDays(w, -7)) weeks.push(w);
  const past = weeks.slice(1).map(stat), nGot = past.filter(x => x.caught).length;
  const shown = W.more ? weeks : weeks.slice(0, 9);
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>${ws === c ? '이번 주 수배범' : '지난 수배범'}</h1><p>${md(ws)}(월) ~ ${md(s.end)}(일) · 엄마·아빠가 이번 주에 남긴 기록과 사진이 공격이 돼요. 체력을 0으로 만들면 체포!</p></header>
  <div class="wposter">
    <div class="wph"><span>현상 수배</span><b>WANTED</b></div>
    <div class="wmug"><span class="wface">${v[4]}</span></div>
    <b class="wpname">${esc(v[3])}</b>
    <p class="wpline"><em>죄목</em>${esc(v[5])}</p>
    <p class="wpline"><em>특징</em>${esc(v[6])}</p>
    <div class="wpbounty">현상금 🌰 ${BOUNTY}<small>금요일까지 잡으면 +${EARLY}</small></div>
    <div class="whp big" role="meter" aria-label="수배범 남은 체력" aria-valuemin="0" aria-valuemax="${s.hp}" aria-valuenow="${s.left}"><i style="width:${pct}%"></i></div>
    <p class="wphp">남은 체력 <b>${s.left}</b> / ${s.hp}${s.caught ? '' : s.over ? ' · 일요일까지 못 잡았어요' : dl > 0 ? ` · 일요일까지 D-${dl}` : ' · 오늘 자정까지!'}</p>
    ${status}
  </div>
  ${s.caught ? `<p class="wgot">🎉 ${md(s.caught)} ${esc(v[3])} 체포! 현상금 도토리 🌰 ${s.bounty}${s.early ? ` (주말 전 체포 보너스 +${EARLY} 포함)` : ''}${String((S.game && S.game.wanted) || '') >= ws ? ' · 받았어요' : ''}</p>` : ''}
  <section><h2 class="sh"><span>공격 기여도</span><span>총 ${s.dmg}</span></h2>
    <div class="wshare" aria-hidden="true">${s.by['엄마'] ? `<i class="mom" style="flex:${s.by['엄마']}"></i>` : ''}${s.by['아빠'] ? `<i class="dad" style="flex:${s.by['아빠']}"></i>` : ''}${!s.by['엄마'] && !s.by['아빠'] ? '<i class="none"></i>' : ''}</div>
    <div class="wlegend"><span><i class="mom"></i>엄마 수사관 <b>${s.by['엄마']}</b> (${Math.round(s.by['엄마'] / tot * 100)}%)</span><span><i class="dad"></i>아빠 수사관 <b>${s.by['아빠']}</b> (${Math.round(s.by['아빠'] / tot * 100)}%)</span>${s.by[''] ? `<span>🤝 협동·함께 <b>${s.by['']}</b></span>` : ''}</div>
  </section>
  <section><h2 class="sh"><span>공격 기록</span><span>${s.L.length}번</span></h2>${attackLog(s)}</section>
  <section${isFold('w-weak', true) ? ' class="folded"' : ''}><h2 class="sh" data-fold="w-weak"><span>수배범의 약점</span><span>공격 방법</span></h2>
    <div class="wweak">${Object.values(KIND).map(k => `<span><i>${k[0]}</i><b>${k[1]}</b><strong>−${k[2]}</strong>${k[3] ? `<small>${k[3]}</small>` : ''}</span>`).join('')}</div>
    <p class="foot" style="margin-top:10px">체력은 지난 4주 평균 공격량에 맞춰 정해져요 (30~150). 남긴 날을 기준으로 세요.</p></section>
  <section><h2 class="sh"><span>체포 기록부</span><span>체포 ${nGot} · 도주 ${past.filter(x => x.over && !x.caught).length}</span></h2>
    <div class="wminis">${shown.map(w => { const x = stat(w); return `<button class="wmini${x.caught ? ' got' : x.over ? ' gone' : ''}${w === ws ? ' on' : ''}" data-wt="week" data-v="${w}"><span class="wface">${x.v[4]}</span><b>${esc(x.v[3])}</b><small>${x.caught ? md(x.caught) + ' 체포' : w === c ? '추적 중' : '도주'}</small><em>${md(w)}~</em></button>`; }).join('')}</div>
    ${weeks.length > 9 ? `<button class="addperiod" data-wt="more">${W.more ? '최근 것만 보기 ▴' : `전체 ${weeks.length}주 보기 ▾`}</button>` : ''}</section>
  <button class="secondary" data-wt="close" style="width:100%;margin-top:16px">돌아가기</button>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-wt]'); if (!b) return;
  switch (b.dataset.wt) {
    case 'open': W.ws = ''; S.view = 'wanted'; render(); window.scrollTo(0, 0); break;
    case 'week': W.ws = b.dataset.v; render(); window.scrollTo(0, 0); break;
    case 'more': W.more = !W.more; render(); break;
    case 'close': goBack(); break;
  }
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.wcard[data-wt]')) { e.preventDefault(); e.target.click(); } });

const css = document.createElement('style');
css.textContent = `
.wcard{position:relative;display:flex;gap:12px;align-items:stretch;cursor:pointer;-webkit-tap-highlight-color:transparent}
.wpost{flex:0 0 84px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:2px;background:#F3E3BF;border:1.5px solid #C9A86A;border-radius:10px;padding:7px 4px 6px;box-shadow:inset 0 0 0 3px #FBF1DA,0 3px 6px rgba(107,58,30,.15);transform:rotate(-2deg)}
.wpost b{font-family:var(--display);font-size:13px;letter-spacing:1px;color:#6B3A1E}
.wpost small{font-size:11px;color:#6B3A1E;font-weight:700}
.wface{font-size:40px;line-height:1.15;font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif}
.wbody{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.wbody .sh{margin-bottom:2px}
.wname{font-family:var(--display);font-weight:400;font-size:20px;color:var(--navy);line-height:1.2}
.wcrime{font-size:12px;color:var(--muted)}
.whp{height:12px;border-radius:99px;background:#F3D3CF;overflow:hidden;margin-top:5px}
.whp i{display:block;height:100%;min-width:0;border-radius:99px;background:var(--red);transition:width .6s}
.whp.big{height:18px;margin-top:12px}
.whpt{font-size:12px;color:var(--ink);margin-top:2px}
.whpt b{color:var(--red)}
.wcard.got .whp i{background:#C9BFB2}
.wstamp{position:absolute;right:16px;top:40px;border:3px double var(--red);color:var(--red);font-family:var(--display);font-size:24px;padding:0 12px;border-radius:8px;transform:rotate(-14deg);background:rgba(255,253,247,.75);pointer-events:none;animation:wstamp .5s cubic-bezier(.2,1.6,.4,1) both}
@keyframes wstamp{from{transform:rotate(-14deg) scale(2.2);opacity:0}to{transform:rotate(-14deg) scale(1);opacity:1}}
.wposter{position:relative;margin:16px auto 0;max-width:360px;background:#F3E3BF;border:2px solid #C9A86A;border-radius:14px;padding:18px 18px 16px;text-align:center;box-shadow:inset 0 0 0 6px #FBF1DA,0 8px 18px rgba(107,58,30,.22);background-image:radial-gradient(rgba(140,100,50,.10) 1px,transparent 1.4px);background-size:9px 9px}
.wph span{display:block;font-family:var(--display);font-size:18px;color:#6B3A1E;letter-spacing:6px}
.wph b{display:block;font-family:var(--display);font-weight:400;font-size:44px;line-height:1;color:#6B3A1E;letter-spacing:4px}
.wmug{margin:12px auto 10px;width:170px;height:150px;display:grid;place-items:center;border:3px solid #6B3A1E;border-radius:6px;background:repeating-linear-gradient(#FFF8EC 0 22px,#E8D7B4 22px 24px)}
.wmug .wface{font-size:96px}
.wpname{display:block;font-family:var(--display);font-weight:400;font-size:28px;color:var(--navy);line-height:1.2;word-break:keep-all}
.wpline{margin:6px 0 0;font-size:14px;color:var(--ink);word-break:keep-all}
.wpline em{font-style:normal;font-size:12px;color:#fff;background:#6B3A1E;border-radius:99px;padding:1px 8px;margin-right:6px}
.wpbounty{margin-top:10px;font-family:var(--display);font-size:24px;color:var(--red)}
.wpbounty small{display:block;font-family:var(--body);font-size:12px;color:#6B3A1E}
.wphp{margin:6px 0 0;font-size:13px}
.wphp b{color:var(--red);font-size:16px}
.wpstamp{position:absolute;right:14px;top:150px;display:flex;flex-direction:column;align-items:center;border:4px double var(--red);color:var(--red);font-family:var(--display);font-size:30px;line-height:1.1;padding:4px 14px;border-radius:10px;transform:rotate(-16deg);background:rgba(255,253,247,.8);animation:wstamp .5s cubic-bezier(.2,1.6,.4,1) both}
.wpstamp small{font-size:13px}
.wpstamp.gone{border-color:#6B5F52;color:#6B5F52}
.wgot{margin:14px 0 0;padding:10px 14px;border-radius:14px;background:#FCE8B4;font-size:14px;text-align:center}
.wshare{display:flex;gap:2px;height:16px;margin:6px 0 8px}
.wshare i{display:block;border-radius:4px;min-width:6px}
.wshare i.mom,.wlegend i.mom{background:#D9546A}.wshare i.dad,.wlegend i.dad{background:#3F6FA8}.wshare i.none{flex:1;background:#E9DFD0}
.wlegend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px}
.wlegend span{display:inline-flex;align-items:center;gap:6px}
.wlegend i{width:12px;height:12px;border-radius:3px;display:inline-block}
.wday{padding:8px 0;border-top:1px dashed var(--line)}
.wday:first-of-type{border-top:0}
.wday>b{font-size:13px;color:var(--navy)}
.wchips{display:flex;flex-wrap:wrap;gap:6px;margin-top:5px}
.wchip{display:inline-flex;align-items:center;gap:4px;font-size:12px;background:#FFFDF7;border:1.5px solid var(--line);border-radius:99px;padding:3px 10px}
.wchip em{font-style:normal;font-size:11px;font-weight:700;color:var(--ink);padding-right:5px;border-right:1px solid var(--line)}
.wchip.mom{border-color:#E9A2AE}.wchip.dad{border-color:#9DB4D3}
.wchip strong{color:var(--red)}
.wweak{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.wweak span{display:grid;grid-template-columns:auto 1fr auto;align-items:center;column-gap:6px;background:#FFFDF7;border:1px solid var(--line);border-radius:12px;padding:6px 10px;font-size:13px}
.wweak i{font-style:normal}
.wweak strong{color:var(--red)}
.wweak small{grid-column:1/-1;font-size:11px;color:var(--muted);line-height:1.3}
.wminis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.wmini{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;background:#F3E3BF;border:1.5px solid #C9A86A;border-radius:12px;padding:8px 4px 6px;min-width:0}
.wmini .wface{font-size:30px}
.wmini b{font-family:var(--display);font-weight:400;font-size:13px;color:var(--navy);line-height:1.2;word-break:keep-all;text-align:center}
.wmini small{font-size:11px;color:#6B3A1E}
.wmini em{font-style:normal;font-size:11px;color:var(--muted)}
.wmini.got::after{content:"체포";position:absolute;top:6px;right:4px;font-family:var(--display);font-size:13px;color:var(--red);border:2px solid var(--red);border-radius:6px;padding:0 4px;transform:rotate(-12deg);background:rgba(255,253,247,.8)}
.wmini.gone{filter:grayscale(.7);opacity:.8}
.wmini.on{outline:3px solid var(--navy);outline-offset:1px}`;
document.head.appendChild(css);
window.WANTED = { card, render: render_, check, stat, monday, events };
})();
