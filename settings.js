// 앱 설정 (S.view='settings', 성장 수사 맨 위 ⚙️ 단추)
// 버전·업데이트 · 아래 메뉴 탭 보이기/숨기기(성장 수사는 늘 보임) · 첫 화면 카드 · 사진 올리기 기본 창 · 떠 있는 📚 단추 · 가족·알림(FAM) · 이 폰 저장 공간 · 기록 통계
// 설정은 이 폰에만 기억해요 (localStorage soeun-tabs-off, soeun-home-off, soeun-guide-off, soeun-posts-hide) — 엄마·아빠 폰마다 따로
(function () {
const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const TABS = [['day', '하루 수사', '🍼'], ['town', '동네 탐문', '🗺️'], ['album', '사건 앨범', '📷'], ['vac', '예방접종', '💉'], ['food', '급식 수사', '🥄'], ['sick', '긴급 출동', '🚨']];
const CARDS = [['game', '🔥 오늘의 수사 지령·놀이터 카드'], ['thief', '🎩 괴도 깍정이 추적 카드 (방 창밖의 깍정이도)'], ['charges', '🚔 장난 혐의 사실'], ['look', '👀 닮은꼴 판정단 카드'], ['guess', '⚖️ 몸무게 예측 대결'], ['capsule', '✉️ 봉인된 증거물 알림'], ['paper', '📰 이달의 소은일보 알림']];   // 첫 화면 부가 카드 (2026.10.13: 핵심만 보기)
const V = { ver: '', latest: '', checked: false, est: null, busy: false };
const sw = () => 'serviceWorker' in navigator;
const num = v => (String(v).match(/\d+/g) || []).map(Number);
const cmp = (a, b) => { const x = num(a), y = num(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };   // '2026.10.11-9' < '2026.10.11-13'

// ---------- 버전: 이 폰에 깔린 것(캐시 이름 shell-버전) · 서버의 최신(sw.js) ----------
async function versions() {
  // 지금 이 화면을 맡은 서비스 워커에게 물어보고, 대답이 없으면(예전 버전) 캐시 이름 중 가장 새 것
  V.ver = await new Promise(res => { try { const c = sw() && navigator.serviceWorker.controller; if (!c) return res(''); const ch = new MessageChannel(), t = setTimeout(() => res(''), 700); ch.port1.onmessage = e => { clearTimeout(t); res(String(e.data || '')); }; c.postMessage('ver', [ch.port2]); } catch (e) { res(''); } });
  if (!V.ver) try { if (window.caches) { const L = (await caches.keys()).filter(x => x.startsWith('shell-')).map(x => x.slice(6)).sort(cmp); V.ver = L.pop() || ''; } } catch (e) {}
  try { const t = await (await fetch('sw.js?v=' + Date.now(), { cache: 'no-store' })).text(), m = /VERSION\s*=\s*'([^']+)'/.exec(t); V.latest = m ? m[1] : ''; } catch (e) { V.latest = ''; }
  try { if (navigator.storage && navigator.storage.estimate) V.est = await navigator.storage.estimate(); } catch (e) {}
  V.checked = true; paint();
}
const newer = () => !!(V.latest && V.ver && cmp(V.latest, V.ver) > 0);
async function update() {
  if (!sw()) { location.reload(); return; }
  V.busy = true; paint(); toast('새 버전을 받는 중…');
  try {
    const reg = await navigator.serviceWorker.getRegistration(); if (!reg) { location.reload(); return; }
    await reg.update();
    const go = w => { if (w) w.postMessage('skip'); };   // app.js가 바뀐 걸 보고 새로 불러와요
    if (reg.waiting) return go(reg.waiting);
    const w = reg.installing; if (w) { w.addEventListener('statechange', () => { if (w.state === 'installed') go(reg.waiting || w); }); return; }
    toast('이미 최신 버전이에요'); V.busy = false; versions();
  } catch (e) { V.busy = false; paint(); toast('업데이트를 받지 못했어요. 인터넷을 확인해 주세요'); }
}
const mb = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'GB' : Math.max(.1, n / 1e6).toFixed(1) + 'MB';

function render_() {
  const off = hiddenTabs(), home = get('soeun-home-off', []), fab = !get('soeun-posts-hide', false);
  const M = S.moments || [], ph = M.filter(m => m.photo).length, d = S.profile && S.profile.birth ? daysBetween(S.profile.birth, today()) + 1 : 0;
  const stat = [['📏', '성장 기록', (S.records || []).length], ['📷', '사진', ph], ['🐾', '탐문 기록', (S.walks || []).length], ['💉', '접종 완료', (S.vaccines || []).filter(v => v.done).length], ['👀', '최초 목격', M.filter(m => (m.type || 'first') === 'first').length], ['📅', '수사 일수', d]];
  const sw2 = (on, attr, label, sub) => `<button class="stsw${on ? ' on' : ''}" ${attr} role="switch" aria-checked="${on}"><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span><i></i></button>`;
  return `<header class="vhead"><span class="no">수사 본부</span><h1>⚙️ 설정</h1><p>이 폰에만 적용돼요. 엄마·아빠 폰마다 따로 정할 수 있어요.</p></header>
  <section class="stsec"><h2 class="sh"><span>앱 버전</span><span id="st-vst">${!V.checked ? '확인 중…' : newer() ? '새 버전 있음' : V.latest ? '최신' : ''}</span></h2>
    <div class="stver"><div><small>이 폰</small><b id="st-ver">${esc(V.ver || (V.checked ? '알 수 없음' : '…'))}</b></div><div><small>최신</small><b>${esc(V.latest || (V.checked ? '확인 못 함' : '…'))}</b></div></div>
    ${newer() ? `<button class="primary" data-stg="update" style="width:100%" ${V.busy ? 'disabled' : ''}>⬆️ 새 버전으로 업데이트</button>` : `<button class="ghost" data-stg="check" style="width:100%">🔄 새 버전 확인</button>`}
    <p class="foot" style="margin:8px 0 0">새 버전이 나오면 화면 아래에 '새 버전이 있어요'도 떠요.</p></section>
  <section class="stsec"><h2 class="sh"><span>아래 메뉴 탭</span><span>${TABS.length - off.length + 1}/${TABS.length + 1}개 보임</span></h2>
    <p class="foot" style="margin:0 0 8px">잘 안 쓰는 탭은 숨겨 두고, 필요할 때 다시 켜요. 숨겨도 기록·알림은 그대로예요. 성장 수사는 첫 화면이라 늘 보여요.</p>
    <div class="stlist">${TABS.map(([k, l, i]) => sw2(!off.includes(k), `data-stg="tab" data-v="${k}"`, `${i} ${l}`, '')).join('')}</div></section>
  <section class="stsec"><h2 class="sh"><span>첫 화면 카드</span><span>성장 수사</span></h2>
    <div class="stlist">${CARDS.map(([k, l]) => sw2(!home.includes(k), `data-stg="card" data-v="${k}"`, l, '')).join('')}</div>
    <div class="stbtns"><button class="ghost" data-stg="cards" data-v="core">🎯 핵심만 보기 (부가 카드 모두 끄기)</button><button class="ghost" data-stg="cards" data-v="all">모두 켜기</button></div></section>
  <section class="stsec"><h2 class="sh"><span>💾 백업·내보내기</span><span>${(() => { const t = get('soeun-backup-at', ''); return t ? '마지막 백업 ' + t.slice(0, 10) : '아직 백업 안 함'; })()}</span></h2>
    <p class="sttip">기록 전체(성장·하루 수사·예방접종·급식·앨범 정보·탐문·놀이)를 파일 하나로 받아 두면, 실수로 지우거나 계정에 문제가 생겨도 되살릴 수 있어요. 한 달에 한 번 카톡 '나와의 채팅'이나 구글 드라이브에 보내 두세요. 사진은 파일 안에 주소만 들어 있어요(사진 자체는 서버에 그대로).${S.game ? ` <br>놀이 저장 칸 크기: ${Math.max(1, Math.round(new Blob([JSON.stringify(S.game)]).size / 1024))}KB / 한계 1,024KB` : ''}</p>
    <div class="stbtns"><button data-stg="backup">📦 전체 백업 파일 받기</button><button class="ghost" data-stg="csv">📊 하루 수사 기록 표(CSV)</button>${!(S.me && S.me.viewer) ? '<button class="ghost" data-stg="restore">♻️ 백업 파일로 되살리기</button>' : ''}</div></section>
  ${(() => { const h = window.WALK && WALK.home ? WALK.home() : null; return `<section class="stsec"><h2 class="sh"><span>🏠 본부 (우리 집)</span><span>탐문 기본 출발지 · 두 폰 같이</span></h2>
    <p class="foot" style="margin:0">${h ? `🏠 <b>${esc(h.n || `${h.lat.toFixed(3)}, ${h.lng.toFixed(3)}`)}</b> — 탐험 지도의 본부이고, 다녀온 곳을 기록하면 출발지로 저절로 들어가요. <button class="ghost" data-stg="whome" style="min-height:34px;margin-left:4px">지우기</button>` : '아직 안 정했어요. 동네 탐문 탭의 「본부 (우리 집)」이나 탐문 기록의 출발지에서 정해요.'}</p></section>`; })()}
  <section class="stsec"><h2 class="sh"><span>탭 안내 말풍선</span><span>화면 줄이기</span></h2>
    <div class="stlist">${sw2(!get('soeun-guide-off', false), 'data-stg="guide"', '🐿️ 탭마다 캐릭터 안내 말풍선 보이기', '익숙해지면 꺼서 화면을 짧게 써요 (성장 수사의 방은 그대로)')}</div></section>
  <section class="stsec"><h2 class="sh"><span>떠 있는 단추</span><span>📚 육아 글</span></h2>
    <div class="stlist">${sw2(fab, 'data-stg="fab"', '📚 육아 글 단추 보이기', '숨겨도 방의 우편함이나 아래 단추로 열 수 있어요')}</div>
    <div class="st2"><button class="ghost" data-stg="fabreset">단추 자리 처음대로</button><button class="ghost" data-stg="posts">📚 육아 글 열기</button></div></section>
  ${window.FAM ? `<section class="stsec"><h2 class="sh"><span>가족·알림</span><span>함께 쓰기</span></h2>${FAM.settingsHtml()}</section>` : ''}
  <section class="stsec"><h2 class="sh"><span>이 폰 저장 공간</span><span>${V.est && V.est.usage ? mb(V.est.usage) + ' 사용' : ''}</span></h2>
    <p class="foot" style="margin:0 0 8px">사진을 빨리 보여 주려고 이 폰에 사본을 둬요. 지워도 사진은 그대로고, 볼 때 다시 받아요.</p>
    <div class="st2"><button class="ghost" data-stg="clearph">🧹 사진 사본 지우기</button><button class="ghost" data-stg="reload">🔁 앱 다시 불러오기</button></div></section>
  <section class="stsec"><h2 class="sh"><span>수사 통계</span><span>${esc(CV.nick())}</span></h2>
    <div class="ststat">${stat.map(([i, l, n]) => `<span><i>${i}</i><b>${n.toLocaleString()}</b><small>${l}</small></span>`).join('')}</div>
    <button class="ghost" data-act="settings" style="width:100%;margin-top:10px">🕵️ 명탐정 정보 고치기</button></section>
  <p class="foot" style="text-align:center;margin:14px 0 0">소은이 성장 수사 일지 · ${esc(V.ver || '')}<br>${CHARS.svg('thief', '', { face: true, size: 34 })}</p>
  <button class="secondary" data-stg="back" style="width:100%;margin-top:12px">돌아가기</button>`;
}
// 그린 뒤 버전 칸만 다시
// ---------- 백업·내보내기 (2026.10.13) ----------
const stamp = () => today().replace(/-/g, '');
async function give(blob, name, title) {
  const f = new File([blob], name, { type: blob.type });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title }); return true; } } catch (e) { if (e && e.name === 'AbortError') return false; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); return true;
}
async function backup() {
  try {
    const bk = await run('backupData'), n = Object.values(bk.cols || {}).reduce((a, l) => a + (l || []).length, 0) + Object.keys(bk.care || {}).length;
    const ok = await give(new Blob([JSON.stringify(bk)], { type: 'application/json' }), `soeun-backup-${stamp()}.json`, '수사 일지 백업');
    if (ok) { put('soeun-backup-at', new Date().toISOString()); render(); toast(`📦 백업 파일을 만들었어요 (기록 ${n}묶음)\n안전한 곳(카톡 나와의 채팅·드라이브)에 보관해요`); }
  } catch (e) { toast('백업 실패: ' + ((e && e.message) || e)); }
}
function csv() {
  const L = (S.cares || []).slice().sort((a, b) => (a.date + a.t).localeCompare(b.date + b.t));
  if (!L.length) { toast('하루 수사 기록이 아직 없어요'); return; }
  const KN = { formula: '분유', breast: '모유수유', pump: '유축수유', diaper: '기저귀', sleep: '수면', bath: '목욕', memo: '메모' };
  const q = v => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const rows = [['날짜', '시각', '끝', '종류', 'ml', '왼쪽(분)', '오른쪽(분)', '소변', '대변', '대변 양', '대변 상태', '목욕(분)', '메모', '누가']]
    .concat(L.map(c => [c.date, c.t, c.e, KN[c.k] || c.k, c.ml || '', c.l ? Math.round(c.l) : '', c.r ? Math.round(c.r) : '', c.pee ? 'O' : '', c.poo ? 'O' : '', c.amt, c.st, c.dur || '', c.memo, c.by]));
  give(new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }), `soeun-day-${stamp()}.csv`, '하루 수사 기록');
}
function restore() {
  let inp = document.getElementById('st-restore');
  if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.id = 'st-restore'; inp.accept = '.json,application/json'; inp.style.display = 'none'; document.body.appendChild(inp); }
  inp.value = '';
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    let bk; try { bk = JSON.parse(await f.text()); } catch (e) { toast('파일을 읽지 못했어요'); return; }
    if (!bk || bk.app !== 'soeun-diary') { toast('수사 일지 백업 파일이 아니에요'); return; }
    const n = Object.values(bk.cols || {}).reduce((a, l) => a + (l || []).length, 0), d = Object.keys(bk.care || {}).length;
    if (!(await ask(`${String(bk.at || '').slice(0, 10)} 백업으로 되살릴까요?\n기록 ${n}개 · 하루 수사 ${d}일\n\n지금 있는 기록은 지우지 않고, 없어진 기록은 되살아나요. 같은 기록은 백업 때 내용으로 돌아가요.`, { ok: '되살리기', danger: true }))) return;
    const r = await write('restoreData', bk); if (r) toast(`♻️ ${r.n || 0}개 묶음을 되살렸어요`);
  };
  inp.click();
}
function paint() { if (S.view === 'settings') render(); }
function open() { closeSheet(); S.view = 'settings'; render(); window.scrollTo(0, 0); versions(); }

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-stg]'); if (!b) return;
  const a = b.dataset.stg, v = b.dataset.v;
  if (a === 'open') return open();
  if (a === 'back') return goBack();
  if (a === 'check') { V.checked = false; paint(); return versions(); }
  if (a === 'update') return update();
  if (a === 'tab') { const off = hiddenTabs(); const i = off.indexOf(v); if (i >= 0) off.splice(i, 1); else off.push(v); put('soeun-tabs-off', off); toast(i >= 0 ? `${(TABS.find(t => t[0] === v) || [])[1]} 탭을 다시 보여요` : `${(TABS.find(t => t[0] === v) || [])[1]} 탭을 숨겼어요`); render(); return; }
  if (a === 'card') { const off = get('soeun-home-off', []); const i = off.indexOf(v); if (i >= 0) off.splice(i, 1); else off.push(v); put('soeun-home-off', off); render(); return; }
  if (a === 'cards') { put('soeun-home-off', v === 'core' ? CARDS.map(c => c[0]) : []); render(); toast(v === 'core' ? '🎯 첫 화면엔 핵심만 보여요 (여기서 다시 켤 수 있어요)' : '첫 화면 카드를 모두 켰어요'); return; }
  if (a === 'backup') return backup();
  if (a === 'csv') return csv();
  if (a === 'restore') return restore();
  if (a === 'whome') { if (!(await ask('본부(탐문 기본 출발지)를 지울까요?', { ok: '지우기', danger: true }))) return; WALK.setHome(null); render(); toast('기본 출발지를 지웠어요'); return; }
  if (a === 'guide') { put('soeun-guide-off', !get('soeun-guide-off', false)); render(); toast(get('soeun-guide-off', false) ? '탭 안내 말풍선을 숨겼어요' : '탭 안내 말풍선을 다시 보여요'); return; }
  if (a === 'fab') { put('soeun-posts-hide', !get('soeun-posts-hide', false)); render(); return; }
  if (a === 'fabreset') { if (window.POSTS && POSTS.resetPos) POSTS.resetPos(); toast('📚 단추를 처음 자리로 돌렸어요'); return; }
  if (a === 'posts') { S.view = 'posts'; render(); window.scrollTo(0, 0); if (window.POSTS) POSTS.load(); return; }
  if (a === 'clearph') { if (!(await ask('이 폰에 둔 사진 사본을 지울까요?\n사진은 그대로고, 볼 때 다시 받아요.', { ok: '지우기' }))) return; try { const ks = window.caches ? (await caches.keys()).filter(k => k.startsWith('photo-')) : []; await Promise.all(ks.map(k => caches.delete(k))); } catch (x) {} toast('사진 사본을 지웠어요'); versions(); return; }
  if (a === 'reload') { if (!navigator.onLine) { toast('인터넷이 연결되면 다시 불러올 수 있어요'); return; } location.reload(); return; }
});

const css = document.createElement('style');
css.textContent = `
.stsec .sh{margin-bottom:8px}
.stver{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}.stver div{background:#FFFDF7;border:1.5px solid var(--line);border-radius:14px;padding:8px 12px}.stver small{display:block;font-size:12px;color:var(--muted)}.stver b{font-family:var(--display);font-weight:400;font-size:17px;color:var(--navy);word-break:break-all}
.stlist{display:flex;flex-direction:column;gap:6px}.stbtns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.stbtns button{flex:1 1 auto;min-height:44px;font-size:14px}.sttip{font-size:12.5px;color:var(--muted);line-height:1.55;margin:0 0 4px}
.stsw{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;border:1.5px solid var(--line);background:#FFFDF7;border-radius:14px;padding:10px 12px;min-height:52px;color:var(--ink)}
.stsw span{display:flex;flex-direction:column;min-width:0}.stsw b{font-weight:400;font-size:15px}.stsw small{font-size:12px;color:var(--muted)}
.stsw i{flex-shrink:0;position:relative;width:46px;height:28px;border-radius:99px;background:#D8CEBF;transition:background .2s}.stsw i::after{content:'';position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s}
.stsw.on i{background:var(--red)}.stsw.on i::after{transform:translateX(18px)}
.stseg{display:grid;grid-template-columns:1fr 1fr;gap:8px}.stseg button{display:flex;flex-direction:column;gap:2px;text-align:left;border:1.5px solid var(--line);background:#FFFDF7;border-radius:14px;padding:10px 12px;color:var(--ink)}.stseg b{font-weight:400;font-size:14px}.stseg small{font-size:12px;color:var(--muted)}
.stseg button.on{border-color:var(--red);box-shadow:inset 0 0 0 1.5px var(--red);background:#FFF5F2}
.st2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.st2 .ghost{min-height:46px;font-size:13.5px}
.ststat{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.ststat span{display:flex;flex-direction:column;align-items:center;background:#FFFDF7;border:1.5px solid var(--line);border-radius:14px;padding:8px 4px}.ststat i{font-style:normal;font-size:18px}.ststat b{font-family:var(--display);font-weight:400;font-size:20px;color:var(--navy)}.ststat small{font-size:12px;color:var(--muted)}
.stsec .famcode{font-size:28px}
.filebar .stgear{min-width:40px;padding:0 10px}`;
document.head.appendChild(css);
window.SETTINGS = { render: render_, open };
})();
