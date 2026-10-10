// 게임 요소 2 (도토리 놀이터의 놀이·계급 칸에 붙어요) — 오늘 누가? 룰렛(집안일 배정), 오늘의 소은 운세(포춘 쿠키), 숨은 도토리 찾기, 스티커 뽑기·스티커북, 소은 탐정 카드, 수사 출석부, 주간 MVP
// 도토리·스티커·룰렛 과제는 game.js와 같은 저장소(GAME.store, 두 폰이 같이 씀). 화면은 S.view='fun' + FUN 모드
(function () {
const st = () => GAME.store.get(), save = s => GAME.store.set(s);
const hash = t => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const nick = () => { const n = (S.profile && S.profile.name) || '우리 아기'; return /^[가-힣]{3}$/.test(n) ? n.slice(1) : n; };
const F = { mode: '', spin: null, task: '', cal: '' };

// ---------- 오늘 누가? (집안일 룰렛) ----------
const DEF_TASKS = ['목욕시키기', '설거지', '젖병 소독', '새벽 당번', '빨래 개기', '분리수거', '산책 담당', '저녁 메뉴 고르기'];
const tasks = () => { const g = st().roulette; if (Array.isArray(g) && g.length) return g; try { const t = JSON.parse(localStorage.getItem('soeun-roulette') || 'null'); return Array.isArray(t) && t.length ? t : DEF_TASKS; } catch (e) { return DEF_TASKS; } };
const SEG = [['엄마', '#F8D8D1'], ['아빠', '#DCE7F1'], ['엄마', '#F8D8D1'], ['아빠', '#DCE7F1'], ['둘이 같이', '#FCE8B4'], ['엄마', '#F8D8D1'], ['아빠', '#DCE7F1'], ['가위바위보!', '#DDEEDB']];
function wheel(rot) {
  const n = SEG.length, R = 130, c = 140, a = 2 * Math.PI / n;
  const seg = SEG.map(([t, col], i) => {
    const a0 = i * a - Math.PI / 2, a1 = a0 + a, x0 = c + R * Math.cos(a0), y0 = c + R * Math.sin(a0), x1 = c + R * Math.cos(a1), y1 = c + R * Math.sin(a1);
    const am = a0 + a / 2, tx = c + R * .62 * Math.cos(am), ty = c + R * .62 * Math.sin(am);
    return `<path d="M${c} ${c}L${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}z" fill="${col}" stroke="#fff" stroke-width="3"/><text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" transform="rotate(${(() => { let r = am * 180 / Math.PI + 90; r = ((r % 360) + 360) % 360; return (r > 90 && r < 270 ? r + 180 : r).toFixed(1); })()} ${tx.toFixed(1)} ${ty.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-family="Jua" font-size="${t.length > 4 ? 13 : 17}" fill="#1F2A44">${t}</text>`;
  }).join('');
  return `<div class="rwrap"><svg class="rwheel" id="rwheel" viewBox="0 0 280 280" style="transform:rotate(${rot}deg)">${seg}<circle cx="140" cy="140" r="22" fill="#1F2A44"/><text x="140" y="141" text-anchor="middle" dominant-baseline="middle" font-size="20">🐿️</text></svg><span class="rpin">▼</span></div>`;
}
function rouletteView() {
  const T = tasks(), sp = F.spin;
  return `<header class="vhead"><span class="no">놀이터</span><h1>오늘 누가?</h1><p>집안일 당번을 룰렛으로 정해요. 결과엔 군말 없기! 🤙</p></header>
    <section><h2 class="sh"><span>무엇을 정할까요?</span><button class="ghost" data-fun="tedit" style="min-height:30px;padding:2px 10px;font-size:12px">목록 고치기</button></h2>
      <div class="chips">${T.map(t => `<button class="chip${F.task === t ? ' on' : ''}" data-fun="task" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      ${wheel(sp ? sp.rot : 0)}
      <button class="primary" data-fun="spin" style="width:100%" ${sp && sp.busy ? 'disabled' : ''}>${F.task ? `"${esc(F.task)}" 돌리기` : '랜덤 과제로 돌리기'}</button>
      <div id="rres">${sp && !sp.busy ? resultHtml(sp) : ''}</div></section>
    <button class="secondary" data-game="medals" style="width:100%;margin-top:14px">놀이터로</button>`;
}
const resultHtml = sp => `<div class="rres"><small>${esc(sp.task)}</small><b>${sp.who === '둘이 같이' ? '둘이 같이 해요 💕' : sp.who === '가위바위보!' ? '가위바위보로 정해요 ✊✌️🖐' : `${sp.who} 수사관 당첨!`}</b><span class="stamp">${sp.who === '둘이 같이' ? '협동 수사' : sp.who === '가위바위보!' ? '재심' : '배정 완료'}</span></div>`;
function spin() {
  const T = tasks(), task = F.task || T[Math.floor(Math.random() * T.length)];
  const k = Math.floor(Math.random() * SEG.length), n = SEG.length, segDeg = 360 / n;
  const prev = F.spin ? F.spin.rot : 0, target = 360 - (k * segDeg + segDeg / 2) + (Math.random() - .5) * segDeg * .6;
  const rot = prev - (prev % 360) + 360 * 5 + target;
  F.spin = { rot, who: SEG[k][0], task, busy: true };
  const w = document.getElementById('rwheel'), btn = document.querySelector('[data-fun=spin]'); if (btn) btn.disabled = true;
  document.getElementById('rres').innerHTML = '';
  if (w) { w.style.transition = 'transform 3.2s cubic-bezier(.12,.75,.15,1)'; requestAnimationFrame(() => { w.style.transform = `rotate(${rot}deg)`; }); }
  setTimeout(() => { F.spin.busy = false; GAME.mark('roulette'); if (S.view === 'fun' && F.mode === 'roulette') { document.getElementById('rres').innerHTML = resultHtml(F.spin); if (btn) btn.disabled = false; GAME.confetti(); } }, 3300);
}
function editTasks() {
  openSheet(`<h3>룰렛 과제 목록</h3><p class="hint">한 줄에 하나씩 적어 주세요. (엄마·아빠 폰에 같이 보여요)</p>
    <label class="field"><span>과제</span><textarea id="rt-list" rows="8">${esc(tasks().join('\n'))}</textarea></label>
    <div class="actions"><button class="secondary" data-fun="treset">처음 목록으로</button><button class="primary" data-fun="tsave">저장</button></div>`);
}

// ---------- 오늘의 소은 운세 (포춘 쿠키, 날짜로 골라 두 폰에 같게) ----------
const FORT = ['오늘은 웃음 폭탄을 세 번 터뜨릴 예정이에요', '수사관 품에서 꿀잠 잘 확률 87%', '새로운 소리를 하나 발견할지도 몰라요', '손가락 빨기 실력이 한 단계 올라가요', '오늘의 행운 단어는 "까꿍"', '엄마 얼굴을 유난히 오래 쳐다볼 거예요', '아빠 노래에 반응할 운세예요', '기저귀 대형 사건이 예고되어 있어요 🚨', '사진 찍으면 인생샷이 나오는 날', '오늘은 옹알이 수다쟁이 데이', '낮잠이 길어질 기미가 보여요 (희망 사항)', '발차기 힘이 세져서 이불이 남아나지 않아요', '수사관들에게 뽀뽀를 많이 받을 운명', '거울 속 친구와 친해지는 날', '먹는 양이 쑥 늘어날 조짐', '오늘의 행운 색은 하늘색', '방긋 웃음 한 번에 피로가 싹 풀리는 날', '산책하면 좋은 일이 생겨요', '새로운 표정을 하나 공개할 예정', '오늘은 엄마 껌딱지 모드', '오늘은 아빠 껌딱지 모드', '쑥쑥 자라는 소리가 들리는 날', '목욕할 때 기분 최고일 운세', '수사 기록 남기기 딱 좋은 날', '조용한 오후를 선물해 줄지도 몰라요', '꼭 안아 주면 행운이 두 배', '딸꾹질 사건이 한 번 있을 수 있어요', '오늘 찍은 사진이 나중에 보물이 돼요', '배냇짓 미소가 터질 확률 높음', '수사관들이 서로 칭찬하면 행운 +1'];
const LUCK = ['딸랑이', '양말', '애착 인형', '거울', '자장가', '손수건', '모빌', '그림책', '쪽쪽이', '포대기'];
function fortune() { const h = hash(today() + nick()); return { t: FORT[h % FORT.length], item: LUCK[(h >> 4) % LUCK.length], score: 70 + (h >> 7) % 31 }; }
function openCookie() {
  const f = fortune(), opened = GAME.played('cookie');
  openSheet(`<h3>오늘의 ${esc(nick())} 운세</h3>
    <div class="cookie${opened ? ' open' : ''}" id="cookie" data-fun="crack"><span class="ck l">🥠</span><span class="ckmsg"><b>${esc(f.t)}</b><small>행운 아이템: ${f.item} · 귀여움 지수 ${f.score}점</small></span></div>
    <p class="hint" style="text-align:center">${opened ? '내일 또 열어 보세요!' : '쿠키를 눌러 깨 보세요 (하루 첫 쿠키는 도토리 🌰 +1)'}</p>
    <div class="actions"><button class="primary" data-act="close">닫기</button></div>`);
}

// ---------- 숨은 도토리 찾기 (하루 한 개, 날짜로 정한 탭 어딘가) ----------
const TABS = ['grow', 'town', 'album', 'vac', 'food', 'sick'];
const TAB_N = { grow: '성장 수사', town: '동네 탐문', album: '사건 앨범', vac: '예방접종', food: '급식 수사', sick: '긴급 출동' };
const huntTab = () => TABS[hash('hunt' + today()) % TABS.length];
function afterRender() {
  const old = document.getElementById('hidacorn'); if (old) old.remove();
  if (S.mode !== 'ok' || S.view || S.tab !== huntTab() || GAME.played('hunt')) return;
  const app = document.getElementById('app'), h = hash('pos' + today());
  const top = 260 + (h % 1000) / 1000 * Math.max(200, app.scrollHeight - 520);
  const el = document.createElement('button'); el.id = 'hidacorn'; el.className = 'hidacorn'; el.setAttribute('aria-label', '숨은 도토리');
  el.textContent = '🌰'; el.style.top = Math.round(top) + 'px'; el.style.left = (8 + (h >> 5) % 80) + '%';
  app.appendChild(el);
}

// ---------- 스티커 뽑기·스티커북 ----------
const STICK = [
  ['s1', '🍼', '젖병', 1], ['s2', '🧸', '곰돌이', 1], ['s3', '🧦', '아기 양말', 1], ['s4', '🎈', '풍선', 1], ['s5', '🦆', '고무 오리', 1], ['s6', '🌰', '도토리', 1], ['s7', '🍓', '딸기', 1], ['s8', '🌼', '데이지', 1], ['s9', '☁️', '구름', 1], ['s10', '🌙', '초승달', 1],
  ['s11', '⭐', '반짝 별', 1], ['s12', '🍪', '쿠키', 1], ['s13', '🐣', '병아리', 1], ['s14', '🎵', '자장가', 1], ['s15', '🛁', '목욕탕', 1], ['s16', '🔎', '돋보기', 1], ['s17', '🧷', '옷핀', 1], ['s18', '👶', '아기', 1],
  ['r1', '🦄', '유니콘', 2], ['r2', '🌈', '무지개', 2], ['r3', '🐿️', '꼬마 다람쥐', 2], ['r4', '🕵️', '명탐정', 2], ['r5', '🎠', '회전목마', 2], ['r6', '🍰', '케이크', 2], ['r7', '🪁', '연', 2], ['r8', '🐳', '고래', 2],
  ['l1', '👑', '황금 왕관', 3], ['l2', '💎', '다이아몬드', 3], ['l3', '🏆', '명예 트로피', 3], ['l4', '🌟', '전설의 별', 3]
];
const RAR = ['', '일반', '희귀', '전설'];
function draw() {
  const s = st(); if (s.acorn < 3) { toast(`도토리가 ${3 - s.acorn}개 더 필요해요`); return null; }
  const r = Math.random(), rar = r < .05 ? 3 : r < .3 ? 2 : 1, pool = STICK.filter(x => x[3] === rar), it = pool[Math.floor(Math.random() * pool.length)];
  s.acorn -= 3; s.stickers = s.stickers || []; const dup = s.stickers.includes(it[0]);
  if (dup) s.acorn += 1; else s.stickers.push(it[0]);
  save(s); GAME.mark('gacha'); return { it, dup };
}
function stickerView() {
  const s = st(), own = s.stickers || [], last = F.last;
  return `<header class="vhead"><span class="no">놀이터</span><h1>스티커 뽑기</h1><p>도토리 3개로 한 번! 이미 있는 스티커가 나오면 도토리 1개를 돌려줘요.</p></header>
    <section class="gacha"><div class="gbox${F.rolling ? ' roll' : ''}" id="gbox">${last && !F.rolling ? `<span class="gst r${last.it[3]}">${last.it[1]}</span><b>${last.it[2]}</b><small class="rr r${last.it[3]}">${RAR[last.it[3]]}${last.dup ? ' · 이미 있어요 (🌰+1)' : ' · 새 스티커!'}</small>` : '<span class="gcap">🥚</span>'}</div>
      <button class="primary" data-fun="draw" style="width:100%">🌰 3개로 뽑기 (지금 ${s.acorn}개)</button></section>
    <section><h2 class="sh"><span>스티커북</span><span>${own.length}/${STICK.length}</span></h2>
      <div class="sbook">${STICK.map(([id, e, nm, r]) => own.includes(id) ? `<span class="sb r${r}"><i>${e}</i><small>${nm}</small></span>` : `<span class="sb off"><i>?</i><small>${RAR[r]}</small></span>`).join('')}</div></section>
    <button class="secondary" data-game="medals" style="width:100%;margin-top:14px">놀이터로</button>`;
}

// ---------- 소은 탐정 카드 (지금 기록으로 만드는 트레이딩 카드) ----------
function cardView() {
  const p = S.profile, d = dayNo(today()), [mo] = monthsDays(p.birth, today());
  const last = k => S.records.filter(r => r[k] != null && r[k] !== '').sort((a, b) => a.date < b.date ? 1 : -1)[0];
  const w = last('weight'), h = last('height'), hd = last('head');
  const firsts = S.moments.filter(m => m.type === 'first' || !m.type).sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 2);
  const tier = d >= 366 ? ['전설', 'leg'] : mo >= 6 || d >= 100 ? ['에픽', 'epic'] : mo >= 1 ? ['레어', 'rare'] : ['일반', 'nor'];
  const ph = safeImg(PHOTOS.profile) || (() => { const m = S.moments.filter(x => x.photo && safeImg(PHOTOS[x.id])).sort((a, b) => a.date < b.date ? 1 : -1)[0]; return m ? safeImg(PHOTOS[m.id]) : ''; })();
  const bar = (label, v, max, unit) => `<div class="tcs"><small>${label}</small><i><u style="width:${Math.min(100, v / max * 100)}%"></u></i><b>${v ? v + unit : '?'}</b></div>`;
  return `<header class="vhead"><span class="no">놀이터</span><h1>소은 탐정 카드</h1><p>지금까지의 기록으로 만든 카드예요. 누르면 뒤집혀요. 자랄수록 등급이 올라가요!</p></header>
    <div class="tcard ${tier[1]}" data-fun="flip"><div class="tci">
      <div class="tcf"><div class="tct"><b>${esc(p.name || '우리 아기')}</b><span>LV.${mo}</span></div>
        <div class="tcp">${ph ? `<img src="${ph}" alt="">` : CHARS.svg('baby', 'lens', { size: 160 })}<em>${tier[0]}</em></div>
        <div class="tcb"><small>귀여움 타입 · 수사 ${d}일째</small>
          ${bar('몸무게', w ? +fmt('weight', w.weight) : 0, 15, 'kg')}${bar('키', h ? +fmt('height', h.height) : 0, 100, 'cm')}${bar('머리둘레', hd ? +fmt('head', hd.head) : 0, 55, 'cm')}
          <p class="tck"><b>특기</b> ${firsts.length ? firsts.map(m => esc(m.title)).join(', ') : '웃음 폭탄'}</p>
          <p class="tck"><b>필살기</b> 새벽 기상 · 귀여움 ∞</p></div></div>
      <div class="tcbk">${CHARS.svg('baby', 'lens', { size: 150 })}<b>성장 수사 일지</b><small>사건 파일 No.${fileNo()} · ${today().replace(/-/g, '.')} 발급</small></div>
    </div></div>
    <p class="foot" style="text-align:center">일반 → 레어(1개월) → 에픽(100일·6개월) → 전설(첫 돌). 화면을 캡처해서 가족에게 자랑해 보세요.</p>
    <button class="secondary" data-game="medals" style="width:100%;margin-top:10px">놀이터로</button>`;
}

// ---------- 수사 출석부 (기록한 날 도장) ----------
function activeDays() {
  const d = new Set();
  (S.records || []).forEach(r => d.add(r.date)); (S.meals || []).forEach(m => d.add(m.date)); (S.logs || []).forEach(l => d.add(String(l.at || '').slice(0, 10)));
  (S.vaccines || []).forEach(v => v.done && d.add(v.done)); (S.foods || []).forEach(f => d.add(f.start)); (S.visits || []).forEach(v => d.add(v.date));
  return d;
}
function attendHtml() {
  const ym = F.cal || today().slice(0, 7), [y, m] = ym.split('-').map(Number), first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const A = activeDays(), cells = [];
  for (let i = 0; i < first; i++) cells.push('<span></span>');
  let cnt = 0;
  for (let dd = 1; dd <= n; dd++) { const ds = `${ym}-${String(dd).padStart(2, '0')}`, on = A.has(ds); if (on) cnt++; cells.push(`<span class="ad${on ? ' on' : ''}${ds === today() ? ' td' : ''}">${dd}${on ? '<i>수사</i>' : ''}</span>`); }
  const prev = (() => { const d = new Date(Date.UTC(y, m - 2, 1)); return d.toISOString().slice(0, 7); })(), next = (() => { const d = new Date(Date.UTC(y, m, 1)); return d.toISOString().slice(0, 7); })();
  return `<section><h2 class="sh"><span>📅 수사 출석부</span><span class="mnav"><button data-fun="cal" data-v="${prev}" ${prev < S.profile.birth.slice(0, 7) ? 'disabled' : ''}>◀</button><b>${y}.${m}</b><button data-fun="cal" data-v="${next}" ${next > today().slice(0, 7) ? 'disabled' : ''}>▶</button></span></h2>
    <div class="acal">${'일월화수목금토'.split('').map(w => `<b>${w}</b>`).join('')}${cells.join('')}</div>
    <p class="foot" style="margin:6px 0 0">이달 ${cnt}일 출석 · 성장·급식·체온·접종·진료 기록을 남긴 날에 도장이 찍혀요.</p></section>`;
}

// ---------- 도토리 놀이터에 붙는 칸: 놀이 칸(함께 놀기), 계급·훈장 칸(출석부) ----------
function playSection() {
  const s = st(), hunt = GAME.played('hunt');
  return `<section><h2 class="sh"><span>함께 놀기</span><span>${hunt ? '오늘 숨은 도토리 찾음 ✓' : `🔍 오늘 도토리는 <b style="color:var(--red)">${TAB_N[huntTab()]}</b> 어딘가에`}</span></h2>
      <div class="gplay">
        <button data-fun="open" data-v="roulette"><span>🎡</span><b>오늘 누가?</b><small>집안일 당번 룰렛</small></button>
        <button data-fun="cookie"><span>🥠</span><b>오늘의 운세</b><small>${GAME.played('cookie') ? '오늘 운세 다시 보기' : '포춘 쿠키 깨기'}</small></button>
        <button data-fun="open" data-v="stickers"><span>🥚</span><b>스티커 뽑기</b><small>스티커북 ${(s.stickers || []).length}/${STICK.length}</small></button>
        <button data-fun="open" data-v="card"><span>🪪</span><b>소은 탐정 카드</b><small>지금 기록으로 만든 카드</small></button>
      </div></section>`;
}
function render_() {
  if (F.mode === 'roulette') return rouletteView();
  if (F.mode === 'stickers') return stickerView();
  if (F.mode === 'card') return cardView();
  return GAME.medals();
}

// ---------- 주간 MVP (월요일에 지난주 결과) ----------
function check() {
  if (S.mode !== 'ok' || !S.profile || !S.profile.birth) return;
  const d = new Date(today() + 'T00:00:00Z'), dow = d.getUTCDay() || 7, mon = addDays(today(), 1 - dow), lastMon = addDays(mon, -7), s = st();
  if (s.mvpWeek === lastMon) return;
  const first = !s.mvpWeek; s.mvpWeek = lastMon; save(s);
  if (first) return;   // 처음엔 조용히
  const m = GAME.xp('엄마', lastMon, mon), a = GAME.xp('아빠', lastMon, mon);
  if (!m && !a) return;
  setTimeout(() => { toast(m === a ? `🏅 지난주 수사 실적 동점! 최고의 팀 (${m}점)` : `🏅 지난주 MVP: ${m > a ? '엄마' : '아빠'} 수사관 (${Math.max(m, a)}점 vs ${Math.min(m, a)}점)`); GAME.confetti(); }, 1200);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-fun], #hidacorn'); if (!b) return;
  if (b.id === 'hidacorn') {
    const s = st(); s.acorn += 1; save(s); GAME.mark('hunt'); b.classList.add('got'); GAME.confetti();
    toast('🔍 숨은 도토리 발견! 🌰 +1'); setTimeout(() => b.remove(), 600); return;
  }
  const v = b.dataset.v;
  switch (b.dataset.fun) {
    case 'open': F.mode = v; F.last = null; S.view = 'fun'; render(); window.scrollTo(0, 0); break;
    case 'task': F.task = F.task === v ? '' : v; render(); break;
    case 'spin': spin(); break;
    case 'tedit': editTasks(); break;
    case 'tsave': { const L = document.getElementById('rt-list').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 20); try { localStorage.setItem('soeun-roulette', JSON.stringify(L)); } catch (x) {} { const s = st(); s.roulette = L; save(s); } F.task = ''; closeSheet(); render(); break; }
    case 'treset': try { localStorage.removeItem('soeun-roulette'); } catch (x) {} { const s = st(); s.roulette = []; save(s); } F.task = ''; closeSheet(); render(); break;
    case 'cookie': openCookie(); break;
    case 'crack': {
      const c = document.getElementById('cookie'); if (!c || c.classList.contains('open')) return;
      c.classList.add('shake');
      setTimeout(() => { c.classList.remove('shake'); c.classList.add('open'); if (!GAME.played('cookie')) { const s = st(); s.acorn += 1; save(s); GAME.mark('cookie'); toast('도토리 🌰 +1'); } }, 600);
      break;
    }
    case 'draw': {
      if (F.rolling) return;
      const r = draw(); if (!r) return;
      F.rolling = true; render();
      setTimeout(() => { F.rolling = false; F.last = r; render(); if (r.it[3] >= 2 && !r.dup) GAME.confetti(); }, 900);
      break;
    }
    case 'flip': b.classList.toggle('flip'); break;
    case 'cal': F.cal = v; render(); break;
  }
});

const css = document.createElement('style');
css.textContent = `
#app{position:relative}
.rwrap{position:relative;width:min(280px,80vw);margin:16px auto 12px}
.rwheel{display:block;width:100%;height:auto;filter:drop-shadow(0 6px 10px rgba(31,42,68,.2))}
.rpin{position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:26px;color:var(--red);text-shadow:0 2px 0 #fff}
.rres{position:relative;margin-top:12px;text-align:center;background:#FFFDF7;border:1.5px solid var(--line);border-radius:18px;padding:14px}
.rres small{display:block;color:var(--muted);font-size:13px}.rres b{font-family:var(--display);font-weight:400;font-size:24px;color:var(--navy)}
.rres .stamp{position:absolute;right:10px;top:-10px;margin:0;background:#FFFDF7}
.cookie{position:relative;display:grid;place-items:center;min-height:150px;cursor:pointer}
.cookie .ck{font-size:96px;transition:transform .5s,opacity .5s}
.cookie.shake .ck{animation:ckshake .6s}
@keyframes ckshake{20%{transform:rotate(-14deg)}40%{transform:rotate(12deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(6deg)}}
.ckmsg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;opacity:0;transform:scale(.8);transition:.4s .1s;background:#FFFDF7;border:2px dashed var(--line);border-radius:16px;padding:14px}
.ckmsg b{font-family:var(--display);font-weight:400;font-size:20px;color:var(--navy);word-break:keep-all;line-height:1.4}.ckmsg small{color:var(--muted)}
.cookie.open .ck{opacity:0;transform:scale(1.4)}.cookie.open .ckmsg{opacity:1;transform:none}
.hidacorn{position:absolute;z-index:3;width:38px;height:38px;border:0;background:none;font-size:24px;padding:0;opacity:.9;animation:hid 2.4s ease-in-out infinite;filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}
.hidacorn.got{animation:hidgot .6s forwards}
@keyframes hid{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg) translateY(-3px)}}
@keyframes hidgot{to{transform:translateY(-60px) scale(1.8);opacity:0}}
.gacha{text-align:center}
.gbox{height:170px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;margin-bottom:12px;background:radial-gradient(circle,#FFFDF7 40%,var(--card2));border-radius:20px}
.gcap{font-size:80px}.gbox.roll .gcap{animation:ckshake .45s infinite}
.gst{font-size:72px;animation:pop .45s cubic-bezier(.3,1.6,.5,1)}@keyframes pop{from{transform:scale(.2)}}
.gst.r3{filter:drop-shadow(0 0 12px gold)}.gst.r2{filter:drop-shadow(0 0 8px #9fd4f5)}
.gbox b{font-family:var(--display);font-weight:400;font-size:20px;color:var(--navy)}
.rr{font-size:12px;font-weight:700}.rr.r1{color:var(--muted)}.rr.r2{color:#3C8DDB}.rr.r3{color:#C99A1E}
.sbook{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.sb{display:flex;flex-direction:column;align-items:center;gap:1px;background:#FFFDF7;border:1.5px solid var(--line);border-radius:12px;padding:6px 2px}
.sb i{font-style:normal;font-size:24px;line-height:1.2}.sb small{font-size:9.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.sb.r2{border-color:#9fd4f5;background:#F2F9FE}.sb.r3{border-color:#E8C770;background:#FFF8E1}
.sb.off{background:var(--card2);border-style:dashed}.sb.off i{color:var(--muted);font-family:var(--display)}
.tcard{perspective:1000px;width:min(300px,86vw);margin:16px auto 10px;aspect-ratio:5/7;cursor:pointer}
.tci{position:relative;width:100%;height:100%;transition:transform .6s;transform-style:preserve-3d}
.tcard.flip .tci{transform:rotateY(180deg)}
.tcf,.tcbk{position:absolute;inset:0;backface-visibility:hidden;border-radius:18px;padding:10px;display:flex;flex-direction:column;gap:6px;box-shadow:0 10px 24px rgba(31,42,68,.3)}
.tcf{background:linear-gradient(160deg,#FFFDF7,#F3E6CE);border:6px solid #C9B48E}
.tcard.rare .tcf{border-color:#7FC4E8}.tcard.epic .tcf{border-color:#B18AE0;background:linear-gradient(160deg,#FFFDF7,#EFE4FB)}
.tcard.leg .tcf{border-color:#E8C770;background:linear-gradient(160deg,#FFF8E1,#FCE8B4,#FFFDF7);animation:shine 3s linear infinite;background-size:200% 200%}
@keyframes shine{50%{background-position:100% 100%}}
.tct{display:flex;justify-content:space-between;align-items:baseline}.tct b{font-family:var(--display);font-weight:400;font-size:20px;color:var(--navy)}.tct span{font-family:var(--display);color:var(--red)}
.tcp{position:relative;flex:1;min-height:0;border-radius:10px;overflow:hidden;background:#FCEBD3;display:grid;place-items:center;border:3px solid #fff}
.tcp img{width:100%;height:100%;object-fit:cover}.tcp em{position:absolute;right:6px;top:6px;font-style:normal;font-size:11px;font-weight:700;background:var(--navy);color:#fff;border-radius:99px;padding:1px 8px}
.tcb small{font-size:11px;color:var(--muted)}
.tcs{display:grid;grid-template-columns:56px 1fr 52px;align-items:center;gap:6px;font-size:12px}.tcs small{font-size:11.5px;color:var(--ink)}
.tcs i{height:6px;border-radius:99px;background:var(--card2);overflow:hidden}.tcs u{display:block;height:100%;background:var(--red)}.tcs b{text-align:right;font-family:var(--display);font-weight:400;color:var(--navy)}
.tck{margin:3px 0 0;font-size:12px}.tck b{color:var(--red);margin-right:4px}
.tcbk{transform:rotateY(180deg);background:var(--navy);color:#fff;align-items:center;justify-content:center;border:6px solid #C9B48E}
.tcbk b{font-family:var(--display);font-weight:400;font-size:24px}.tcbk small{font-size:11px;opacity:.8}
.acal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center}
.acal>b{font-size:11px;color:var(--muted);font-weight:400}
.ad{position:relative;aspect-ratio:1;display:grid;place-items:center;font-size:12px;border-radius:10px;background:#FFFDF7;color:var(--muted)}
.ad.td{outline:2px solid var(--navy)}
.ad.on{color:var(--ink)}
.ad i{position:absolute;inset:3px;display:grid;place-items:center;font-style:normal;font-family:var(--display);font-size:10px;color:var(--red);border:2px solid var(--red);border-radius:50%;transform:rotate(-14deg);opacity:.85}
@media (prefers-reduced-motion:reduce){.hidacorn,.tcard.leg .tcf{animation:none}}`;
document.head.appendChild(css);

window.FUN = { render: render_, playSection, attend: attendHtml, afterRender, check, hunt: huntTab };
})();
