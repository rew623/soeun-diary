// 앱 설정 (S.view='settings', 성장 수사 맨 위 ⚙️ 단추)
// 버전·업데이트 · 아래 메뉴 탭 보이기/숨기기(성장 수사는 늘 보임) · 첫 화면 카드 · 사진 올리기 기본 창 · 떠 있는 📚 단추 · 가족·알림(FAM) · 이 폰 저장 공간 · 기록 통계
// 설정은 이 폰에만 기억해요 (localStorage soeun-tabs-off, soeun-home-off, soeun-picker, soeun-posts-hide) — 엄마·아빠 폰마다 따로
(function () {
const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const TABS = [['town', '동네 탐문', '🗺️'], ['album', '사건 앨범', '📷'], ['vac', '예방접종', '💉'], ['food', '급식 수사', '🥄'], ['sick', '긴급 출동', '🚨']];
const CARDS = [['game', '🔥 오늘의 수사 지령·놀이터 카드'], ['thief', '🎩 괴도 깍정이 추적 카드 (방 창밖의 깍정이도)']];
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
  const off = hiddenTabs(), home = get('soeun-home-off', []), pk = get('soeun-picker', 'photo'), fab = !get('soeun-posts-hide', false);
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
    <div class="stlist">${CARDS.map(([k, l]) => sw2(!home.includes(k), `data-stg="card" data-v="${k}"`, l, '')).join('')}</div></section>
  <section class="stsec"><h2 class="sh"><span>사진 올리기</span><span>사건 앨범</span></h2>
    <div class="stseg"><button class="${pk === 'photo' ? 'on' : ''}" data-stg="picker" data-v="photo"><b>📷 폰 사진 선택 창</b><small>빠르게 고르기 (위치는 지워져요)</small></button><button class="${pk === 'gallery' ? 'on' : ''}" data-stg="picker" data-v="gallery"><b>📁 갤러리 앱·파일</b><small>앨범 폴더째 · 위치 그대로</small></button></div>
    <p class="foot" style="margin:8px 0 0">'+ 사진 올리기'를 누르면 고른 창이 바로 열려요.</p></section>
  <section class="stsec"><h2 class="sh"><span>떠 있는 단추</span><span>📚 육아 글</span></h2>
    <div class="stlist">${sw2(fab, 'data-stg="fab"', '📚 육아 글 단추 보이기', '숨겨도 방의 우편함이나 아래 단추로 열 수 있어요')}</div>
    <div class="st2"><button class="ghost" data-stg="fabreset">단추 자리 처음대로</button><button class="ghost" data-stg="posts">📚 육아 글 열기</button></div></section>
  ${window.FAM ? `<section class="stsec"><h2 class="sh"><span>가족·알림</span><span>함께 쓰기</span></h2>${FAM.settingsHtml()}</section>` : ''}
  <section class="stsec"><h2 class="sh"><span>이 폰 저장 공간</span><span>${V.est && V.est.usage ? mb(V.est.usage) + ' 사용' : ''}</span></h2>
    <p class="foot" style="margin:0 0 8px">사진을 빨리 보여 주려고 이 폰에 사본을 둬요. 지워도 사진은 그대로고, 볼 때 다시 받아요.</p>
    <div class="st2"><button class="ghost" data-stg="clearph">🧹 사진 사본 지우기</button><button class="ghost" data-stg="reload">🔁 앱 다시 불러오기</button></div></section>
  <section class="stsec"><h2 class="sh"><span>수사 통계</span><span>${esc(CV.nick())}</span></h2>
    <div class="ststat">${stat.map(([i, l, n]) => `<span><i>${i}</i><b>${n.toLocaleString()}</b><small>${l}</small></span>`).join('')}</div>
    <button class="ghost" data-act="settings" style="width:100%;margin-top:10px">👶 수사 대상 정보 고치기</button></section>
  <p class="foot" style="text-align:center;margin:14px 0 0">소은이 성장 수사 일지 · ${esc(V.ver || '')}<br>${CHARS.svg('thief', '', { face: true, size: 34 })}</p>
  <button class="secondary" data-stg="back" style="width:100%;margin-top:12px">돌아가기</button>`;
}
// 그린 뒤 버전 칸만 다시
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
  if (a === 'picker') { put('soeun-picker', v); render(); toast(v === 'gallery' ? "'+ 사진 올리기'는 갤러리 앱·파일 창으로 열려요" : "'+ 사진 올리기'는 폰 사진 선택 창으로 열려요"); return; }
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
.stlist{display:flex;flex-direction:column;gap:6px}
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
