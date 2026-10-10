// 캐릭터 — 소은이(아기 다람쥐 탐정), 엄마 수사관·아빠 수사관 다람쥐
// SVG로 그려서 사진 없이도 어디서든 써요. 탭마다 캐릭터가 나와서 그 탭에서 할 일을 말풍선으로 알려 줘요
// 캐릭터를 누르면 다음 말을 해요 (첫 말은 지금 상황에 맞는 안내)
(function () {
const FUR = { baby: '#E59A5C', mom: '#D9895A', dad: '#B97648' };
const DARK = { baby: '#C77A41', mom: '#B96E40', dad: '#985C34' };
const INK = '#5A3420';

// 손에 드는 소품 (오른손 근처)
const PROPS = {
  lens: '<circle cx="90" cy="80" r="10" fill="#DCE7F1" fill-opacity=".85" stroke="#1F2A44" stroke-width="4"/><path d="M86 77a4 4 0 0 1 4-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M83 88l-9 10" stroke="#8A5A36" stroke-width="5" stroke-linecap="round"/>',
  shield: '<path d="M90 70l12 4v9c0 8-6 13-12 15-6-2-12-7-12-15v-9z" fill="#1F2A44"/><path d="M84 84l4 4 8-9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  spoon: '<path d="M74 104l17-24" stroke="#C9B48E" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="94" cy="75" rx="8" ry="5.5" transform="rotate(-55 94 75)" fill="#F6EBD6" stroke="#C9B48E" stroke-width="2.5"/><ellipse cx="94" cy="75" rx="4.5" ry="3" transform="rotate(-55 94 75)" fill="#F4D58C"/><path d="M100 64q3-4 0-8M106 66q3-4 0-8" stroke="#E0C9A2" stroke-width="2" fill="none" stroke-linecap="round"/>',
  thermo: '<rect x="85" y="66" width="7" height="28" rx="3.5" fill="#fff" stroke="#B3261E" stroke-width="2"/><rect x="87.2" y="76" width="2.6" height="18" fill="#B3261E"/><circle cx="88.5" cy="97" r="5.5" fill="#B3261E"/>',
  camera: '<rect x="73" y="80" width="30" height="21" rx="6" fill="#1F2A44"/><rect x="78" y="76" width="9" height="5" rx="2" fill="#1F2A44"/><circle cx="88" cy="90.5" r="6.5" fill="#DCE7F1" stroke="#FFF8EC" stroke-width="2.5"/><circle cx="98" cy="84" r="1.6" fill="#F6B4AA"/>',
  acorn: '<g transform="translate(4 -9)"><ellipse cx="88" cy="93" rx="8.5" ry="10" fill="#D99A5B"/><path d="M78 88q10-11 20 0z" fill="#7A4B2A"/><path d="M88 78v-5" stroke="#7A4B2A" stroke-width="2.5" stroke-linecap="round"/><path d="M84 93q2 4 5 4" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/></g>',
  note: '<rect x="76" y="72" width="24" height="30" rx="3" fill="#FFFDF7" stroke="#C9B48E" stroke-width="2" transform="rotate(8 88 87)"/><path d="M81 81h14M80 87h14M79 93h9" stroke="#C9B48E" stroke-width="2" stroke-linecap="round" transform="rotate(8 88 87)"/><circle cx="96" cy="97" r="5" fill="none" stroke="#B3261E" stroke-width="2"/>',
  heart: '<path d="M88 100c-9-6-14-11-14-17a6 6 0 0 1 14-3 6 6 0 0 1 14 3c0 6-5 11-14 17z" fill="#F08A8A"/><path d="M80 82a3 3 0 0 1 4-2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>'
};

// who: baby | mom | dad, prop: PROPS 이름, face: 얼굴만(동그란 사진 칸용)
function svg(who = 'baby', prop = '', o = {}) {
  const f = FUR[who] || FUR.baby, d = DARK[who] || DARK.baby, size = o.size || 72;
  const vb = o.face ? '16 12 76 76' : '0 0 120 120';
  const tail = o.face ? '' : `<path d="M70 100c34 0 44-32 30-52-9-13-27-10-25 5" fill="none" stroke="${d}" stroke-width="24" stroke-linecap="round"/><path d="M72 99c26-2 34-28 24-44-6-9-17-7-17 2" fill="none" stroke="#F0B67E" stroke-width="9" stroke-linecap="round" opacity=".75"/>`;
  const body = o.face ? '' : `<ellipse cx="54" cy="95" rx="24" ry="20" fill="${f}"/><ellipse cx="54" cy="99" rx="14" ry="13" fill="#FCEBD3"/>
    <ellipse cx="43" cy="114" rx="8" ry="4.5" fill="${d}"/><ellipse cx="65" cy="114" rx="8" ry="4.5" fill="${d}"/>
    ${who === 'mom' ? `<path d="M36 80l18 14 18-14-3-5-15 11-15-11z" fill="#EAD7B4"/>` : ''}${who === 'dad' ? `<path d="M36 80l18 14 18-14-3-5-15 11-15-11z" fill="#C9B48E"/><path d="M51 88l3 8 3-8z" fill="#B3261E"/>` : ''}
    ${who === 'baby' ? `<path d="M46 80q8 5 16 0" stroke="#F6B4AA" stroke-width="4" fill="none" stroke-linecap="round"/>` : ''}
    <ellipse cx="38" cy="92" rx="6" ry="8" fill="${d}" transform="rotate(20 38 92)"/>
    ${prop && PROPS[prop] ? PROPS[prop] : ''}
    <ellipse cx="74" cy="90" rx="6" ry="8" fill="${d}" transform="rotate(-25 74 90)"/>`;
  const ears = `<path d="M30 42l-3-24 18 14z" fill="${f}"/><path d="M32 38l-2-13 10 8z" fill="#F6B4AA"/><path d="M27 19l-3-6M27 18l2-6" stroke="${d}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M78 42l3-24-18 14z" fill="${f}"/><path d="M76 38l2-13-10 8z" fill="#F6B4AA"/><path d="M81 19l3-6M81 18l-2-6" stroke="${d}" stroke-width="2.5" stroke-linecap="round"/>`;
  const head = `<ellipse cx="54" cy="56" rx="31" ry="28" fill="${f}"/><ellipse cx="54" cy="67" rx="17" ry="12" fill="#FCEBD3"/>`;
  const eye = (x) => who === 'dad' && o.wink !== false
    ? `<ellipse cx="${x}" cy="55" rx="4.5" ry="5.5" fill="#2B2622"/><circle cx="${x + 1.5}" cy="53" r="1.6" fill="#fff"/>`
    : `<ellipse cx="${x}" cy="55" rx="5" ry="6" fill="#2B2622"/><circle cx="${x + 1.6}" cy="52.6" r="2" fill="#fff"/><circle cx="${x - 1.6}" cy="57.5" r=".9" fill="#fff"/>`;
  const lash = who === 'mom' ? `<path d="M35 51l-3-2M37 49l-2-3M73 51l3-2M71 49l2-3" stroke="#2B2622" stroke-width="1.6" stroke-linecap="round"/>` : '';
  const face = `${eye(42)}${eye(66)}${lash}
    <ellipse cx="33" cy="65" rx="6" ry="4" fill="#F49C9C" opacity=".7"/><ellipse cx="75" cy="65" rx="6" ry="4" fill="#F49C9C" opacity=".7"/>
    <ellipse cx="54" cy="62.5" rx="3.4" ry="2.5" fill="${INK}"/>
    <path d="M49 66.5q2.5 3 5 0q2.5 3 5 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${who === 'baby' ? `<rect x="51.6" y="68" width="4.8" height="4" rx="1.2" fill="#fff" stroke="${INK}" stroke-width=".9"/>` : ''}`;
  // 모자·장식
  let hat = '';
  if (who === 'baby') hat = `<path d="M27 40q27-30 54 0z" fill="#D4B27A"/><path d="M36 30l36 0M31 36h46M44 22v16M54 18v20M64 22v16" stroke="#B08A50" stroke-width="1.6" opacity=".8"/><path d="M30 39q24 8 48 0l2 4q-26 9-52 0z" fill="#A9844C"/><circle cx="54" cy="16" r="3.5" fill="#B3261E"/>`;
  if (who === 'mom') hat = `<path d="M24 30l-10-7v14zM24 30l10-7v14z" fill="#B3261E"/><circle cx="24" cy="30" r="3.2" fill="#D9473D"/>`;
  if (who === 'dad') hat = `<ellipse cx="54" cy="36" rx="32" ry="6.5" fill="#1F2A44"/><path d="M37 36q0-21 17-21t17 21z" fill="#1F2A44"/><path d="M37.5 30h33v5h-33z" fill="#B3261E"/><path d="M48 18q6 4 12 0" stroke="#2E3B5C" stroke-width="2" fill="none"/>`;
  const glasses = who === 'dad' ? `<circle cx="42" cy="55" r="8.5" fill="none" stroke="#1F2A44" stroke-width="2.4"/><circle cx="66" cy="55" r="8.5" fill="none" stroke="#1F2A44" stroke-width="2.4"/><path d="M50.5 55h7" stroke="#1F2A44" stroke-width="2.4"/>` : '';
  const bandage = prop === 'thermo' || prop === 'shield' ? `<g transform="rotate(-22 70 38)"><rect x="61" y="35" width="18" height="7" rx="3.5" fill="#F6C9A8"/><rect x="67" y="35" width="6" height="7" fill="#EDB48D"/></g>` : '';
  return `<svg class="chr" width="${size}" height="${size}" viewBox="${vb}" aria-hidden="true">${tail}${body}${ears}${head}${face}${glasses}${hat}${bandage}</svg>`;
}

// ---------- 탭별 안내 ----------
const short = () => { const n = (S.profile && S.profile.name) || '우리 아기'; return /^[가-힣]{3}$/.test(n) ? n.slice(1) : n; };
const WHO = { b: ['baby', () => `${short()} 탐정`], m: ['mom', () => '엄마 수사관'], d: ['dad', () => '아빠 수사관'] };
// [말하는 사람, 소품, 말]
// 받침 있는 이름은 '소은이'처럼 불러요 (소은이는, 소은이가)
const nick = () => { const n = short(), c = n.charCodeAt(n.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? n + '이' : n; };
function lines(tab) {
  const n = nick(), L = [];
  if (tab === 'grow') {
    const d = daysBetween(S.profile.birth, today()) + 1, last = S.records.map(r => r.date).sort().pop();
    const gap = last ? daysBetween(last, today()) : null;
    if (gap != null && gap >= 14) L.push(['b', 'lens', `마지막 측정이 ${gap}일 전이에요. 오늘 몸무게 한 번 재 볼까요? 오른쪽 아래 '+ 새 증거 기록'!`]);
    L.push(['b', 'lens', `수사 ${d}일째! 몸무게·키를 재면 '+ 새 증거 기록'을 눌러 주세요. 그래프에 빨간 점으로 찍어 둘게요.`]);
    L.push(['m', 'heart', `${n}는 오늘도 쑥쑥 자라는 중이에요. 기록을 누르면 고칠 수 있고, 사진을 누르면 크게 볼 수 있어요.`]);
    L.push(['d', 'lens', `숫자 칸(몸무게·키·머리둘레)을 누르면 그래프가 바뀌어요. 백분위는 참고만 하기!`]);
  } else if (tab === 'vac') {
    const np = nextPeriod();
    if (np) L.push(['b', 'shield', `다음 출동은 ${np.name} 접종, ${ddayText(pDate(np))}! 병원을 예약하면 '예약일 입력'으로 날짜를 맞춰 주세요.`]);
    L.push(['b', 'shield', `주사 맞고 오면 '사건 해결 처리'로 도장 꽝! 저 씩씩했죠?`]);
    L.push(['d', 'note', `맨 위 '영유아검진' 칸에서 건강검진·구강검진 일정도 같이 챙겨요.`]);
    L.push(['m', 'heart', `접종한 날은 열이 날 수 있어요. 긴급 출동 탭에 체온을 남겨 두면 안심이에요.`]);
  } else if (tab === 'food') {
    L.push(['b', 'spoon', `새 식재료는 3일 동안 심문해요. 이상 없으면 '무혐의'로 통과!`]);
    L.push(['b', 'acorn', `도토리는 아직 이르대요… 대신 쌀미음부터 냠냠!`]);
    L.push(['m', 'spoon', `먹은 양(완식·잘먹음·절반·거부)을 남기면 ${n}가 좋아하는 음식을 알 수 있어요.`]);
    L.push(['d', 'note', `센터 식단표는 PDF·사진·엑셀 다 올릴 수 있어요. 맨 아래 '센터 식단'에서!`]);
  } else if (tab === 'sick') {
    const ep = typeof activeEp === 'function' && activeEp();
    if (ep) L.push(['b', 'thermo', `지금 사건 수사 중이에요. 체온·약 먹은 시간을 바로 남기면 교대할 때 헷갈리지 않아요.`]);
    else L.push(['b', 'thermo', `오늘은 건강 이상 없음! 아플 땐 '+ 체온'만 눌러도 사건 파일이 열려요.`]);
    L.push(['d', 'lens', `밤이나 휴일엔 맨 위 '응급실·야간 진료 병원'을 눌러요. 지금 문 연 곳부터 보여 줘요.`]);
    L.push(['m', 'heart', `진료 기록에 의사 선생님께 물어볼 것을 적어 가면 깜빡하지 않아요.`]);
  } else if (tab === 'album') {
    L.push(['b', 'camera', `찰칵! 여러 장 한 번에 올리면 찍은 날짜별로 정리해 드려요. 올리다 나가도 이어서 올려요.`]);
    L.push(['b', 'camera', `100일 보고서 사진은 미리 올려 둬도 돼요. '보고서 사진 미리 올리기'를 눌러요.`]);
    L.push(['m', 'heart', `마음에 드는 사진은 크게 보고 '보드에 붙이기'! 수사 보드에 꽂혀요.`]);
    L.push(['d', 'note', `첫 미소, 첫 뒤집기… 처음 본 순간은 '최초 목격 기록'으로 남겨요.`]);
  }
  return L;
}
const seen = {};
const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
function guide(tab) {
  const L = lines(tab); if (!L.length) return '';
  if (seen[tab] == null) seen[tab] = 0;
  const i = seen[tab] % L.length, [w, prop, text] = L[i], [who, name] = WHO[w];
  return `<div class="guide g-${who}" aria-live="polite"><button class="gchar" data-guide="${tab}" aria-label="다음 말 듣기">${svg(who, prop, { size: 84 })}</button>
    <div class="gbub"><b>${esc(name())}</b><p>${esc(text)}</p><small>${L.length > 1 ? `${i + 1}/${L.length} · 저를 누르면 다음 말` : ''}</small></div></div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-guide]'); if (!b) return;
  const tab = b.dataset.guide; seen[tab] = (seen[tab] || 0) + 1;
  const old = b.closest('.guide'), t = document.createElement('div'); t.innerHTML = guide(tab);
  const nu = t.firstElementChild; old.replaceWith(nu); nu.classList.add('hop');
});

const css = document.createElement('style');
css.textContent = `
.chr{display:block;overflow:visible}
.guide{display:flex;align-items:flex-end;gap:6px;margin:14px 0 4px}
.gchar{flex-shrink:0;border:0;background:none;padding:0;margin-bottom:-4px;filter:drop-shadow(0 3px 0 rgba(150,110,60,.18))}
.gbub{position:relative;flex:1;min-width:0;background:#FFFDF7;border:1.5px solid var(--line);border-radius:20px 20px 20px 6px;padding:10px 14px 8px;box-shadow:0 3px 0 #E6D2AE;margin-bottom:12px}
.gbub::before{content:"";position:absolute;left:-9px;bottom:10px;width:14px;height:14px;background:#FFFDF7;border-left:1.5px solid var(--line);border-bottom:1.5px solid var(--line);transform:rotate(45deg) skew(10deg,10deg);border-radius:0 0 0 4px}
.gbub b{font-family:var(--display);font-weight:400;font-size:14px;color:var(--red)}
.g-mom .gbub b{color:#C25A7A}.g-dad .gbub b{color:var(--navy)}
.gbub p{margin:2px 0 2px;font-size:14px;line-height:1.55;word-break:keep-all}
.gbub small{font-size:11px;color:var(--muted)}
.guide.hop .gchar{animation:ghop .45s cubic-bezier(.3,1.6,.5,1)}
.guide.hop .gbub{animation:gpop .3s ease-out}
@keyframes ghop{0%{transform:translateY(0)}40%{transform:translateY(-10px) rotate(-6deg)}100%{transform:none}}
@keyframes gpop{0%{opacity:.3;transform:scale(.96)}100%{opacity:1;transform:none}}
.gchar .chr{animation:gbob 3.2s ease-in-out infinite;transform-origin:50% 100%}
@keyframes gbob{0%,100%{transform:none}50%{transform:translateY(-2px) rotate(1.5deg)}}
@media (prefers-reduced-motion:reduce){.gchar .chr,.guide.hop .gchar,.guide.hop .gbub{animation:none}}
.idb .ph.chrph{background:#FCEBD3;border-color:var(--line);overflow:hidden;padding:0}
.idb .ph.chrph .chr{width:100%;height:100%}
.loading .chr{margin:0 auto 10px;animation:gbob 1.4s ease-in-out infinite}`;
document.head.appendChild(css);

window.CHARS = { svg, guide };
})();
