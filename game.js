// 게임 요소 — 수사관 계급(경험치), 훈장 수첩, 연속 수사, 오늘의 수사 지령, 도토리·모자 가게, 놀이터(생후 며칠 퀴즈, 사진 짝맞추기)
// 계급·훈장·연속 수사는 이미 남긴 기록(by·날짜)으로 계산해서 두 폰에 같게 보여요 (저장 안 함)
// 도토리·모자·게임 최고 기록은 이 폰에만 저장 (localStorage soeun-game)
(function () {
const KEY = 'soeun-game';
function st() {
  let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  return Object.assign({ acorn: 0, hats: ['det'], hat: 'det', quizBest: 0, memBest: 0, done: [], seenMedals: null, seenRank: null, played: {} }, s || {});
}
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
const played = k => st().played[k] === today();
function mark(k) { const s = st(); if (s.played[k] === today()) return; s.played[k] = today(); save(s); }
const hash = t => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// ---------- 수사관 계급 ----------
const WEIGHT = { records: 10, meals: 5, logs: 3, moments: 12, foods: 10, visits: 10 };
function xp(role, since) {
  let x = 0;
  const dOf = (k, o) => k === 'logs' ? String(o.at || '').slice(0, 10) : k === 'foods' ? o.start : o.date;
  for (const [k, w] of Object.entries(WEIGHT)) (S[k] || []).forEach(o => { if (o.by === role && (!since || (dOf(k, o) || '') >= since)) x += w + (o.photo ? 3 : 0); });
  (S.vaccines || []).forEach(v => { if (v.done && v.by === role && (!since || v.done >= since)) x += 15; });
  (S.checkups || []).forEach(c => { if (c.done && c.by === role && (!since || c.done >= since)) x += 20; });
  return x;
}
const RANKS = [[0, '순경'], [40, '경장'], [120, '경사'], [250, '경위'], [450, '경감'], [700, '경정'], [1000, '총경'], [1400, '경무관'], [1900, '치안감'], [2500, '치안정감'], [3200, '치안총감']];
function rank(role) {
  const x = xp(role); let i = 0;
  while (i + 1 < RANKS.length && x >= RANKS[i + 1][0]) i++;
  const cur = RANKS[i], nx = RANKS[i + 1];
  return { x, lv: i + 1, name: cur[1], next: nx ? nx[1] : '', need: nx ? nx[0] - x : 0, pct: nx ? Math.round((x - cur[0]) / (nx[0] - cur[0]) * 100) : 100 };
}
// 수사관 신분증에 붙는 계급 줄
function rankHtml(role) { const r = rank(role); return `<span class="grank"><b>${r.name}</b><i><u style="width:${r.pct}%"></u></i></span>`; }

// ---------- 연속 수사 ----------
function activeDays() {
  const d = new Set();
  (S.records || []).forEach(r => d.add(r.date)); (S.meals || []).forEach(m => d.add(m.date));
  (S.logs || []).forEach(l => d.add(String(l.at || '').slice(0, 10))); (S.vaccines || []).forEach(v => v.done && d.add(v.done));
  (S.foods || []).forEach(f => d.add(f.start)); (S.visits || []).forEach(v => d.add(v.date));
  return d;
}
function streak() { const d = activeDays(); let t = today(); if (!d.has(t)) t = addDays(t, -1); let n = 0; while (d.has(t)) { n++; t = addDays(t, -1); } return n; }

// ---------- 사진 (퀴즈·짝맞추기 재료) ----------
function photoPool() {
  const out = [];
  (S.moments || []).forEach(m => { if (m.photo && m.date && safeImg(PHOTOS[m.id]) && m.type !== 'report') out.push({ key: m.id, date: m.date, t: m.title || '' }); });
  (S.records || []).forEach(r => { if (r.photo && safeImg(PHOTOS[r.id])) out.push({ key: r.id, date: r.date, t: '' }); });
  return out;
}

// ---------- 오늘의 수사 지령 ----------
const POOL = [
  { id: 'rec', t: '몸무게나 키 재서 기록하기', ok: () => S.records.some(r => r.date === today()), when: () => true, act: 'addrec' },
  { id: 'photo', t: '오늘 사진 한 장 남기기', ok: () => S.moments.some(m => m.date === today() && m.photo) || S.records.some(r => r.date === today() && r.photo), when: () => true, tab: 'album' },
  { id: 'meal', t: '급식 기록 하나 남기기', ok: () => S.meals.some(m => m.date === today()), when: () => S.meals.length > 0 || monthsDays(S.profile.birth, today())[0] >= 4, tab: 'food' },
  { id: 'town', t: '동네 탐문에서 산책 지수 보기', ok: () => played('town'), when: () => true, tab: 'town' },
  { id: 'post', t: '📚 육아 글 하나 읽기', ok: () => { let r = {}; try { r = JSON.parse(localStorage.getItem('soeun-posts-read') || '{}'); } catch (e) {} const t0 = Date.parse(today() + 'T00:00:00+09:00'); return Object.values(r).some(v => v >= t0); }, when: () => true, view: 'posts' },
  { id: 'quiz', t: '놀이터: 생후 며칠 퀴즈 한 판', ok: () => played('quiz'), when: () => photoPool().length >= 4, view: 'play' },
  { id: 'mem', t: '놀이터: 사진 짝맞추기 한 판', ok: () => played('mem'), when: () => true, view: 'play' },
  { id: 'temp', t: '체온 재서 남기기', ok: () => S.logs.some(l => l.kind === 'temp' && String(l.at).startsWith(today())), when: () => typeof activeEp === 'function' && !!activeEp(), tab: 'sick' },
  { id: 'board', t: '마음에 드는 사진 보드에 붙이기', ok: () => played('board'), when: () => photoPool().length >= 3, tab: 'album' }
];
function missions() {
  const pool = POOL.filter(m => { try { return m.when(); } catch (e) { return false; } });
  const seed = hash(today() + (S.profile.name || '')), out = [];
  for (let i = 0; out.length < Math.min(3, pool.length) && i < 50; i++) { const m = pool[(seed + i * 7) % pool.length]; if (!out.includes(m)) out.push(m); }
  return out.map(m => ({ ...m, on: (() => { try { return !!m.ok(); } catch (e) { return false; } })() }));
}

// ---------- 훈장 ----------
const fp = () => (S.foods || []).filter(f => f.result === '통과').length;
const photos = () => (S.moments || []).filter(m => m.photo).length + (S.records || []).filter(r => r.photo).length;
const MEDALS = [
  ['first-rec', '🔎', '첫 증거', '성장 기록 1건', () => S.records.length >= 1],
  ['rec10', '📏', '증거 수집가', '성장 기록 10건', () => S.records.length >= 10],
  ['rec30', '📐', '측정의 달인', '성장 기록 30건', () => S.records.length >= 30],
  ['ph30', '📷', '사진 수사관', '사진 30장', () => photos() >= 30],
  ['ph100', '🎞️', '사진 100장 돌파', '사진 100장', () => photos() >= 100],
  ['ph300', '🖼️', '전속 사진사', '사진 300장', () => photos() >= 300],
  ['first1', '👀', '첫 목격자', '최초 목격 1건', () => S.moments.some(m => m.type === 'first' || !m.type)],
  ['first5', '🕵️', '목격 전문가', '최초 목격 5건', () => S.moments.filter(m => m.type === 'first' || !m.type).length >= 5],
  ['vac5', '💉', '주사 용사', '예방접종 5건 해결', () => S.vaccines.filter(v => v.done).length >= 5],
  ['vac15', '🛡️', '면역 요새', '예방접종 15건 해결', () => S.vaccines.filter(v => v.done).length >= 15],
  ['food5', '🥄', '미식 탐정', '식재료 5개 통과', () => fp() >= 5],
  ['food15', '🍲', '미식가', '식재료 15개 통과', () => fp() >= 15],
  ['d50', '🎈', '50일 통과', '생후 50일', () => dayNo(today()) >= 50],
  ['d100', '💯', '100일 돌파', '생후 100일', () => dayNo(today()) >= 100],
  ['d200', '🌟', '200일 돌파', '생후 200일', () => dayNo(today()) >= 200],
  ['d365', '🎂', '첫 돌', '생후 1년', () => dayNo(today()) >= 366],
  ['st3', '🔥', '3일 연속 수사', '3일 연속 기록', () => streak() >= 3],
  ['st7', '⚡', '일주일 개근', '7일 연속 기록', () => streak() >= 7],
  ['st30', '🏅', '한 달 개근', '30일 연속 기록', () => streak() >= 30],
  ['team', '🤝', '환상의 팀워크', '엄마·아빠 모두 경장 이상', () => rank('엄마').lv >= 2 && rank('아빠').lv >= 2],
  ['mis5', '📜', '지령 수행자', '오늘의 지령 5번 완수', () => st().done.length >= 5],
  ['mis30', '🎖️', '특급 요원', '오늘의 지령 30번 완수', () => st().done.length >= 30],
  ['quiz', '🧠', '눈썰미 왕', '생후 며칠 퀴즈 8점 이상', () => st().quizBest >= 8],
  ['mem', '🃏', '기억력 왕', '짝맞추기 10번 안에 성공', () => st().memBest > 0 && st().memBest <= 10]
];
const medalsOn = () => MEDALS.filter(m => { try { return m[4](); } catch (e) { return false; } }).map(m => m[0]);

// ---------- 축하 (계급 승진·훈장·지령 완수) ----------
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'gconf';
  const C = ['#B3261E', '#F4C542', '#7FC4E8', '#F49C9C', '#7FB77E', '#1F2A44'];
  box.innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${C[i % C.length]};animation-delay:${Math.random() * .3}s;animation-duration:${1.1 + Math.random() * .8}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join('');
  document.body.appendChild(box); setTimeout(() => box.remove(), 2400);
}
let checking = false;
function check() {
  if (checking || S.mode !== 'ok' || !S.profile || !S.profile.birth) return;
  checking = true;
  setTimeout(() => {
    checking = false;
    const s = st(), msgs = [];
    // 계급
    const now = { 엄마: rank('엄마').lv, 아빠: rank('아빠').lv };
    if (s.seenRank) for (const r of ['엄마', '아빠']) if (now[r] > (s.seenRank[r] || 1)) msgs.push(`🎉 ${r} 수사관 ${rank(r).name}(으)로 승진!`);
    s.seenRank = now;
    // 훈장
    const on = medalsOn();
    if (s.seenMedals) on.filter(id => !s.seenMedals.includes(id)).forEach(id => { const m = MEDALS.find(x => x[0] === id); msgs.push(`${m[1]} 훈장 획득: ${m[2]}`); });
    s.seenMedals = on;
    // 오늘의 지령 완수 → 도토리 3개
    const ms = missions();
    if (ms.length && ms.every(m => m.on) && !s.done.includes(today())) { s.done.push(today()); s.done = s.done.slice(-400); s.acorn += 3; msgs.push('📜 오늘의 지령 완수! 도토리 🌰 +3'); }
    save(s);
    if (msgs.length) { confetti(); msgs.forEach((m, i) => setTimeout(() => toast(m), i * 2300)); }
  }, 300);
}

// ---------- 성장 수사 탭: 지령 카드 ----------
function card() {
  if (!S.profile || !S.profile.birth) return '';
  const ms = missions(), n = ms.filter(m => m.on).length, all = ms.length && n === ms.length, s = st(), sk = streak();
  return `<section class="gcard${all ? ' all' : ''}">
    <div class="gtop"><span class="gchip">🔥 ${sk ? sk + '일 연속 수사' : '오늘 첫 수사를 시작해요'}</span><span class="gchip">🌰 ${s.acorn}</span><button class="ghost" data-game="medals">훈장 수첩 ›</button></div>
    <h2 class="sh"><span>오늘의 수사 지령</span><span>${n}/${ms.length} 완료</span></h2>
    <div class="gms">${ms.map(m => `<button class="gm${m.on ? ' on' : ''}" data-game="go" data-id="${m.id}"><i>${m.on ? '✓' : ''}</i><span>${esc(m.t)}</span>${m.on ? '' : '<em>›</em>'}</button>`).join('')}</div>
    ${all ? '<span class="stamp gdone">지령 완수</span>' : '<p class="foot" style="margin:6px 0 0">셋 다 하면 도토리 🌰 3개! 도토리로 소은 탐정 모자를 바꿀 수 있어요.</p>'}
  </section>`;
}

// ---------- 훈장 수첩 화면 ----------
const HATS = [['det', '탐정 모자', 0], ['flower', '꽃 화관', 5], ['party', '생일 고깔', 8], ['chef', '요리사 모자', 10], ['santa', '산타 모자', 12], ['crown', '왕관', 15]];
function medalsView() {
  const s = st(), on = medalsOn(), sk = streak(), wk = addDays(today(), -6);
  const card = role => { const r = rank(role), k = role === '엄마' ? 'mom' : 'dad', w = xp(role, wk);
    return `<div class="grc"><span class="grf">${CHARS.svg(k, '', { face: true, size: 56 })}</span><span class="grt"><small>${role} 수사관 · Lv.${r.lv}</small><b>${r.name}</b><i><u style="width:${r.pct}%"></u></i><small>${r.next ? `${r.next}까지 ${r.need}점` : '최고 계급!'} · 이번 주 +${w}점</small></span></div>`; };
  const wm = xp('엄마', wk), wd = xp('아빠', wk);
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>훈장 수첩</h1><p>기록을 남길수록 수사관 계급이 올라가요. 기록 하나하나가 경험치예요.</p></header>
    <section><h2 class="sh"><span>수사관 계급</span><span>${wm || wd ? `이번 주 ${wm === wd ? '동점!' : (wm > wd ? '엄마' : '아빠') + ' 수사관 우세'}` : ''}</span></h2>${card('엄마')}${card('아빠')}
      <p class="foot" style="margin-top:8px">경험치: 성장 기록 10 · 사진 +3 · 최초 목격 12 · 예방접종 15 · 검진 20 · 식재료 10 · 급식 5 · 체온·투약 3</p></section>
    <section><h2 class="sh"><span>도토리 주머니</span><span>🌰 ${s.acorn}개 · 🔥 ${sk}일 연속</span></h2>
      <p class="hint" style="margin:0 0 10px">도토리는 오늘의 지령 완수(+3)와 놀이터에서 모여요. 모자를 사서 소은 탐정에게 씌워 보세요. (이 폰에만 저장)</p>
      <div class="ghats">${HATS.map(([id, nm, c]) => { const own = s.hats.includes(id), cur = s.hat === id;
        return `<button class="ghat${cur ? ' cur' : ''}" data-game="hat" data-id="${id}">${CHARS.svg('baby', '', { face: true, size: 58, hat: id })}<b>${nm}</b><small>${cur ? '쓰는 중' : own ? '쓰기' : `🌰 ${c}`}</small></button>`; }).join('')}</div></section>
    <section><h2 class="sh"><span>놀이터</span><span>하루 첫 판은 도토리 🌰 +1</span></h2>
      <div class="gplay"><button data-game="quiz"><span>🧠</span><b>생후 며칠 퀴즈</b><small>사진 보고 생후 며칠인지 맞히기${s.quizBest ? ` · 최고 ${s.quizBest}점` : ''}</small></button>
      <button data-game="mem"><span>🃏</span><b>사진 짝맞추기</b><small>소은이 사진 카드 짝 찾기${s.memBest ? ` · 최고 ${s.memBest}번` : ''}</small></button></div></section>
    <section><h2 class="sh"><span>훈장</span><span>${on.length}/${MEDALS.length}</span></h2>
      <div class="gmed">${MEDALS.map(([id, ic, nm, how]) => `<div class="gmd${on.includes(id) ? ' on' : ''}"><span>${on.includes(id) ? ic : '🔒'}</span><b>${nm}</b><small>${how}</small></div>`).join('')}</div></section>
    <button class="secondary" data-game="close" style="width:100%;margin-top:14px">돌아가기</button>`;
}

// ---------- 놀이터 ----------
const G = { game: '', q: null, m: null };
function playView() {
  const back = '<button class="secondary" data-game="medals" style="width:100%;margin-top:14px">훈장 수첩으로</button>';
  if (G.game === 'quiz') return quizView() + back;
  if (G.game === 'mem') return memView() + back;
  return medalsView();
}
// 생후 며칠 퀴즈
function quizStart() {
  const pool = shuffle(photoPool());
  if (pool.length < 4) { toast('사진이 4장 이상 있어야 할 수 있어요'); return false; }
  const rounds = pool.slice(0, Math.min(10, pool.length)).map(p => {
    const ans = dayNo(p.date), opts = new Set([ans]);
    for (let k = 0; opts.size < 4 && k < 300; k++) { const o = ans + (Math.random() < .5 ? -1 : 1) * (3 + Math.floor(Math.random() * Math.max(10, ans * .4))); if (o >= 1 && o <= dayNo(today())) opts.add(o); }
    for (let k = 1; opts.size < 4; k++) opts.add(ans + k * 5);
    return { ...p, ans, opts: shuffle([...opts]) };
  });
  G.q = { rounds, i: 0, score: 0, picked: null }; return true;
}
function quizView() {
  const q = G.q; if (!q) return '';
  if (q.i >= q.rounds.length) {
    const s = st(), best = q.score > s.quizBest;
    return `<header class="vhead"><span class="no">놀이터</span><h1>퀴즈 결과</h1></header><section class="gq end"><span class="gbig">${q.score}<small>/${q.rounds.length}</small></span><b>${q.score === q.rounds.length ? '완벽해요! 소은이 전담 수사관 인정 🎖️' : q.score >= q.rounds.length * .7 ? '눈썰미가 대단해요!' : '사진 속 소은이가 너무 빨리 자라죠?'}</b>${best ? '<span class="stamp">최고 기록</span>' : ''}<button class="primary" data-game="quiz" style="margin-top:14px;width:100%">한 판 더</button></section>`;
  }
  const r = q.rounds[q.i], ph = safeImg(PHOTOS[r.key]);
  return `<header class="vhead"><span class="no">놀이터 · ${q.i + 1}/${q.rounds.length} · ${q.score}점</span><h1>생후 며칠?</h1></header>
    <section class="gq"><img src="${ph}" alt="">${r.t ? `<small class="gqt">${esc(r.t)}</small>` : ''}
      <div class="gqo">${r.opts.map(o => `<button data-game="qa" data-v="${o}" class="${q.picked == null ? '' : o === r.ans ? 'right' : o === q.picked ? 'wrong' : 'dim'}" ${q.picked == null ? '' : 'disabled'}>생후 ${o}일</button>`).join('')}</div>
      ${q.picked == null ? '' : `<p class="gqa">${q.picked === r.ans ? '⭕ 정답!' : '❌ 아쉬워요'} ${fmtK(r.date, true)}, 생후 ${r.ans}일이었어요</p><button class="primary" data-game="qn" style="width:100%">${q.i + 1 < q.rounds.length ? '다음 사진' : '결과 보기'}</button>`}</section>`;
}
function quizEnd() {
  const q = G.q, s = st(); let gain = 0;
  if (s.played.quiz !== today()) gain++;
  if (q.score === q.rounds.length && q.rounds.length >= 5) gain += 2;
  s.quizBest = Math.max(s.quizBest, q.score); s.played.quiz = today(); s.acorn += gain; save(s);
  if (gain) toast(`도토리 🌰 +${gain}`);
}
// 사진 짝맞추기 (사진이 6장 안 되면 그림 카드)
const EMO = ['🍼', '🧸', '🌰', '🐿️', '🎈', '🧦', '🦆', '🍓'];
function memStart() {
  const pool = shuffle(photoPool()).slice(0, 6);
  const faces = pool.length >= 6 ? pool.map(p => ({ k: p.key, img: safeImg(PHOTOS[p.key]) })) : EMO.slice(0, 6).map(e => ({ k: e, e }));
  G.m = { cards: shuffle([...faces, ...faces]).map((f, i) => ({ ...f, i, open: false, done: false })), first: null, moves: 0, lock: false, left: 6 };
}
function memView() {
  const m = G.m; if (!m) return '';
  return `<header class="vhead"><span class="no">놀이터 · <span id="gmv">${m.moves}</span>번 뒤집음</span><h1>사진 짝맞추기</h1></header>
    <section class="gmem" id="gmem">${m.cards.map(c => `<button class="gc${c.open || c.done ? ' open' : ''}${c.done ? ' done' : ''}" data-game="mc" data-i="${c.i}"><span class="back">🌰</span><span class="face">${c.img ? `<img src="${c.img}" alt="">` : `<b>${c.e}</b>`}</span></button>`).join('')}</section>
    ${m.left ? '' : `<section class="gq end"><b>${m.moves}번 만에 성공!</b><button class="primary" data-game="mem" style="margin-top:10px;width:100%">한 판 더</button></section>`}`;
}
function memFlip(i) {
  const m = G.m, c = m.cards[i]; if (!m || m.lock || c.open || c.done) return;
  c.open = true; document.querySelector(`.gc[data-i="${i}"]`).classList.add('open');
  if (m.first == null) { m.first = i; return; }
  const a = m.cards[m.first]; m.moves++; const mv = document.getElementById('gmv'); if (mv) mv.textContent = m.moves;
  if (a.k === c.k) {
    a.done = c.done = true; m.first = null; m.left--;
    [a.i, c.i].forEach(j => document.querySelector(`.gc[data-i="${j}"]`).classList.add('done'));
    if (!m.left) {
      const s = st(); let gain = s.played.mem !== today() ? 1 : 0; if (m.moves <= 10) gain += 2;
      s.memBest = s.memBest ? Math.min(s.memBest, m.moves) : m.moves; s.played.mem = today(); s.acorn += gain; save(s);
      confetti(); setTimeout(() => { render(); if (gain) toast(`도토리 🌰 +${gain}`); }, 500);
    }
  } else {
    m.lock = true;
    setTimeout(() => { a.open = c.open = false; [a.i, c.i].forEach(j => { const el = document.querySelector(`.gc[data-i="${j}"]`); if (el) el.classList.remove('open'); }); m.first = null; m.lock = false; }, 800);
  }
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-game]'); if (!b) return;
  const v = b.dataset.v;
  switch (b.dataset.game) {
    case 'medals': S.view = 'medals'; G.game = ''; render(); window.scrollTo(0, 0); break;
    case 'close': S.view = ''; G.game = ''; render(); window.scrollTo(0, 0); break;
    case 'go': {
      const m = POOL.find(x => x.id === b.dataset.id); if (!m) return;
      if (m.act === 'addrec') { const f = document.querySelector('.fab'); if (f) f.click(); }
      else if (m.view === 'play') { S.view = 'medals'; render(); setTimeout(() => { const el = document.querySelector('.gplay'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60); }
      else if (m.view) { S.view = m.view; render(); window.scrollTo(0, 0); }
      else if (m.tab) { S.tab = m.tab; S.view = ''; if (m.tab === 'album') S.albumView = 'album'; render(); window.scrollTo(0, 0); }
      break;
    }
    case 'hat': {
      const s = st(), h = HATS.find(x => x[0] === b.dataset.id); if (!h) return;
      if (!s.hats.includes(h[0])) { if (s.acorn < h[2]) { toast(`도토리가 ${h[2] - s.acorn}개 더 필요해요`); return; } s.acorn -= h[2]; s.hats.push(h[0]); toast(`${h[1]}을(를) 샀어요!`); confetti(); }
      s.hat = h[0]; save(s); render(); break;
    }
    case 'quiz': if (quizStart()) { G.game = 'quiz'; S.view = 'play'; render(); window.scrollTo(0, 0); } break;
    case 'qa': { const q = G.q, r = q.rounds[q.i]; if (q.picked != null) return; q.picked = +v; if (q.picked === r.ans) q.score++; render(); break; }
    case 'qn': { const q = G.q; q.i++; q.picked = null; if (q.i >= q.rounds.length) quizEnd(); render(); window.scrollTo(0, 0); break; }
    case 'mem': memStart(); G.game = 'mem'; S.view = 'play'; render(); window.scrollTo(0, 0); break;
    case 'mc': memFlip(+b.dataset.i); break;
  }
});

const css = document.createElement('style');
css.textContent = `
.grank{display:flex;align-items:center;gap:5px;margin-top:2px}
.grank b{font-family:var(--display);font-weight:400;font-size:12px;color:#fff;background:var(--navy);border-radius:99px;padding:0 7px;line-height:1.5}
.grank i{flex:1;height:5px;border-radius:99px;background:var(--card2);overflow:hidden;min-width:24px}
.grank u{display:block;height:100%;background:var(--red);border-radius:99px}
.gcard{position:relative}
.gtop{display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap}
.gchip{font-size:12.5px;background:#FFFDF7;border:1.5px solid var(--line);border-radius:99px;padding:3px 10px;white-space:nowrap}
.gtop .ghost{margin-left:auto;min-height:32px;padding:3px 12px;font-size:12.5px}
.gms{display:flex;flex-direction:column;gap:6px}
.gm{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:#FFFDF7;border:1.5px solid var(--line);border-radius:14px;padding:9px 12px;min-height:46px;font-size:14.5px}
.gm i{width:24px;height:24px;border-radius:50%;border:2px dashed var(--line);display:grid;place-items:center;font-style:normal;font-weight:700;flex-shrink:0;color:#fff}
.gm.on{background:#F3F8EE;border-color:#B9D7A8}.gm.on i{background:#5E9E57;border:0}.gm.on span{color:var(--muted);text-decoration:line-through}
.gm em{margin-left:auto;font-style:normal;color:var(--muted);font-size:18px}
.gdone{position:absolute;right:16px;bottom:12px;margin:0;font-size:18px}
.gcard.all .gms{opacity:.85}
.grc{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px dashed var(--line)}
.grf{width:56px;height:56px;border-radius:50%;background:#FCEBD3;overflow:hidden;flex-shrink:0;border:1.5px solid var(--line)}
.grt{flex:1;display:flex;flex-direction:column;min-width:0}.grt small{font-size:12px;color:var(--muted)}
.grt b{font-family:var(--display);font-weight:400;font-size:22px;color:var(--navy);line-height:1.2}
.grt i{display:block;height:8px;border-radius:99px;background:var(--card2);overflow:hidden;margin:3px 0}.grt u{display:block;height:100%;background:var(--red);border-radius:99px}
.ghats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.ghat{display:flex;flex-direction:column;align-items:center;gap:2px;background:#FFFDF7;border:1.5px solid var(--line);border-radius:16px;padding:8px 4px}
.ghat .chr{border-radius:50%;background:#FCEBD3}
.ghat b{font-size:13px}.ghat small{font-size:11.5px;color:var(--muted)}
.ghat.cur{border:2.5px solid var(--red)}.ghat.cur small{color:var(--red);font-weight:700}
.gplay{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gplay button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;background:var(--navy);color:#fff;border:0;border-radius:18px;padding:12px;box-shadow:0 3px 0 #121a2e}
.gplay span{font-size:28px}.gplay b{font-family:var(--display);font-weight:400;font-size:17px}.gplay small{font-size:11.5px;color:#C7CFE0;line-height:1.4}
.gmed{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.gmd{display:flex;flex-direction:column;align-items:center;text-align:center;gap:1px;padding:10px 4px;border-radius:16px;background:var(--card2);opacity:.6}
.gmd span{font-size:26px;filter:grayscale(1)}.gmd b{font-size:12.5px}.gmd small{font-size:10.5px;color:var(--muted);line-height:1.3}
.gmd.on{background:#FFFDF7;border:1.5px solid #E8C770;opacity:1;box-shadow:0 3px 0 #EBD9A6}.gmd.on span{filter:none}
.gq{display:flex;flex-direction:column;align-items:center;gap:10px}
.gq img{width:100%;max-height:52vh;object-fit:contain;border-radius:16px;background:var(--card2);border:4px solid #FFFDF7;box-shadow:0 4px 12px rgba(43,38,34,.2)}
.gqt{font-size:12px;color:var(--muted)}
.gqo{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}
.gqo button{min-height:54px;border-radius:16px;border:2px solid var(--line);background:#FFFDF7;font-family:var(--display);font-size:18px;color:var(--navy)}
.gqo .right{background:#5E9E57;border-color:#5E9E57;color:#fff}.gqo .wrong{background:var(--red);border-color:var(--red);color:#fff}.gqo .dim{opacity:.45}
.gqa{margin:2px 0;font-size:14px}
.gq.end{position:relative;text-align:center;padding:20px 14px}.gq.end b{font-size:16px}
.gbig{font-family:var(--display);font-size:64px;color:var(--red);line-height:1}.gbig small{font-size:24px;color:var(--muted)}
.gq.end .stamp{position:absolute;right:16px;top:14px;margin:0}
.gmem{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px!important}
.gc{position:relative;aspect-ratio:3/4;border:0;padding:0;background:none;perspective:600px}
.gc span{position:absolute;inset:0;border-radius:14px;display:grid;place-items:center;backface-visibility:hidden;transition:transform .35s;overflow:hidden}
.gc .back{background:var(--navy);font-size:30px;box-shadow:inset 0 0 0 3px #FFFDF7,0 3px 0 #121a2e}
.gc .face{background:#FFFDF7;transform:rotateY(180deg);border:2px solid var(--line)}
.gc .face img{width:100%;height:100%;object-fit:cover}.gc .face b{font-size:38px}
.gc.open .back{transform:rotateY(180deg)}.gc.open .face{transform:none}
.gc.done .face{border-color:#5E9E57;box-shadow:0 0 0 3px #CFE6C3}
.gconf{position:fixed;inset:0;pointer-events:none;z-index:40;overflow:hidden}
.gconf i{position:absolute;top:-12px;width:8px;height:12px;border-radius:2px;animation:gfall 1.4s cubic-bezier(.3,.6,.5,1) forwards}
@keyframes gfall{to{top:105%;transform:translateX(30px) rotate(540deg)}}
@media (prefers-reduced-motion:reduce){.gc span{transition:none}}`;
document.head.appendChild(css);

window.GAME = { rankHtml, card, check, mark, skin: () => st().hat, medals: medalsView, play: playView };
})();
