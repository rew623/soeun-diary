// 육아 자료실 — 네이버 블로그·카페에서 월령별·주제별·우리 동네 육아 글을 모아 보여 줘요 (S.view='posts')
// 데이터: Actions(town.yml)가 하루 한 번 만드는 data/posts.json. 글은 원래 사이트(네이버)에서 열려요
(function () {
const P = { data: null, at: 0, loading: false, tab: 'month', topic: '', month: null, read: {} };
const READK = 'soeun-posts-read';
try { P.read = JSON.parse(localStorage.getItem(READK) || '{}') || {}; } catch (e) {}
const NAMES = { chuncheon: '춘천시', wonju: '원주시', gangneung: '강릉시', donghae: '동해시', taebaek: '태백시', sokcho: '속초시', samcheok: '삼척시', hongcheon: '홍천군', hoengseong: '횡성군', yeongwol: '영월군', pyeongchang: '평창군', jeongseon: '정선군', cheorwon: '철원군', hwacheon: '화천군', yanggu: '양구군', inje: '인제군', goseong: '고성군', yangyang: '양양군' };
const reg = () => { try { const r = localStorage.getItem('soeun-hosp-region'); return NAMES[r] ? r : 'wonju'; } catch (e) { return 'wonju'; } };
const myMonth = () => Math.min(24, monthsDays(S.profile.birth, today())[0]);

async function load(force) {
  if (P.loading || (!force && P.at && Date.now() - P.at < 60 * 60e3)) return;
  P.loading = true;
  P.data = await fetch('data/posts.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  P.at = Date.now(); P.loading = false;
  if (S.mode === 'ok') render();
}

// 성장 수사 탭에 붙는 한 줄 카드
function card() {
  if (!P.at) { load(); return ''; }
  const m = myMonth(), L = P.data && P.data.months && P.data.months[m];
  const top = L && L[0];
  return `<button class="postcard" data-post="open"><span class="pci" aria-hidden="true">📚</span><span class="pct"><small>육아 자료실 · ${m === 0 ? '신생아' : m + '개월'} 아기 글${P.data ? ` · ${esc(P.data.updated || '')}` : ''}</small><b>${top ? esc(top.t) : '네이버 블로그·카페 육아 글 모아 보기'}</b></span><span class="pcgo">›</span></button>`;
}

function list(L) {
  if (!L || !L.length) return `<p class="vempty">${P.loading ? '불러오는 중…' : '글을 아직 못 받았어요. 처음 설정하면 하루 안에 생겨요.'}</p>`;
  return `<div class="plist">${L.map(x => `<a class="post ${P.read[x.u] ? 'read' : ''}" href="${esc(x.u)}" target="_blank" rel="noopener" data-post="read" data-u="${esc(x.u)}">
    <span class="pk ${x.k}">${x.k === 'b' ? '블로그' : '카페'}</span>
    <span class="ptx"><b>${esc(x.t)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}<em>${esc(x.s || '')}${x.dt ? ' · ' + x.dt.slice(5).replace('-', '.') : ''}</em></span></a>`).join('')}</div>`;
}

function render_() {
  if (!P.at) load();
  const D = P.data || {}, m = P.month == null ? myMonth() : P.month, code = reg();
  const topics = D.topicNames || ['수면', '이유식', '발달', '아플 때', '육아템', '외출', '예방접종', '엄마·아빠'];
  const tp = P.topic || topics[0];
  const seg = `<div class="seg" style="margin-top:14px">${[['month', '월령별'], ['topic', '주제별'], ['town', '우리 동네']].map(([k, l]) => `<button class="${P.tab === k ? 'on' : ''}" data-post="tab" data-v="${k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (P.tab === 'month') {
    body = `<div class="pmon"><button data-post="mon" data-v="-1" aria-label="이전 월령" ${m <= 0 ? 'disabled' : ''}>◀</button><b>${m === 0 ? '신생아' : m + '개월 아기'}</b>${m === myMonth() ? '<em>지금</em>' : ''}<button data-post="mon" data-v="1" aria-label="다음 월령" ${m >= 24 ? 'disabled' : ''}>▶</button></div>${list(D.months && D.months[m])}`;
  } else if (P.tab === 'topic') {
    body = `<div class="chips" style="margin:2px 0 12px">${topics.map(t => `<button class="chip ${t === tp ? 'on' : ''}" data-post="topic" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>${list(D.topics && D.topics[tp])}`;
  } else {
    body = `<p class="hint" style="margin:0 0 10px">${NAMES[code]} 근처 "아기랑" 최신 글이에요. 지역은 병원 수사·동네 탐문에서 바꿔요.</p>${list(D.regions && D.regions[code])}`;
  }
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>육아 자료실</h1><p>네이버 블로그·카페 글을 하루 한 번 모아요. 누르면 원래 글이 열려요.</p></header>
    ${seg}<section style="margin-top:12px">${body}</section>
    <p class="foot">광고·체험단으로 보이는 글은 빼고 보여 줘요. 글 내용은 쓴 사람의 경험이니, 건강 문제는 꼭 소아과와 상의해 주세요.</p>
    <button class="secondary" data-post="close" style="width:100%;margin-top:12px">돌아가기</button>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-post]'); if (!b) return;
  const v = b.dataset.v;
  switch (b.dataset.post) {
    case 'open': S.view = 'posts'; P.month = null; render(); window.scrollTo(0, 0); load(); break;
    case 'close': S.view = ''; render(); window.scrollTo(0, 0); break;
    case 'tab': P.tab = v; render(); break;
    case 'mon': P.month = Math.max(0, Math.min(24, (P.month == null ? myMonth() : P.month) + +v)); render(); break;
    case 'topic': P.topic = v; render(); break;
    case 'read': P.read[b.dataset.u] = Date.now(); try { const k = Object.keys(P.read); if (k.length > 300) k.sort((a, c) => P.read[a] - P.read[c]).slice(0, k.length - 300).forEach(x => delete P.read[x]); localStorage.setItem(READK, JSON.stringify(P.read)); } catch (x) {} b.classList.add('read'); break;
  }
});

const css = document.createElement('style');
css.textContent = `
.postcard{width:100%;display:flex;align-items:center;gap:10px;margin-top:10px;background:#FFFDF7;border:1.5px solid var(--line);border-radius:18px;padding:10px 12px;text-align:left;box-shadow:0 3px 0 #E6D2AE}
.pci{flex-shrink:0;width:42px;height:42px;border-radius:50%;background:var(--butter);display:grid;place-items:center;font-size:22px}
.pct{flex:1;display:flex;flex-direction:column;min-width:0}.pct small{font-size:12px;color:var(--muted)}
.pct b{font-size:14.5px;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pcgo{font-size:24px;color:var(--muted)}
.pmon{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px}
.pmon b{font-family:var(--display);font-weight:400;font-size:20px;color:var(--navy)}
.pmon em{font-style:normal;font-size:11px;background:var(--red);color:#fff;border-radius:99px;padding:1px 8px}
.pmon button{border:1.5px solid var(--line);background:#fff;border-radius:99px;width:40px;height:40px;color:var(--navy)}
.pmon button:disabled{opacity:.35}
.chip.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.plist{display:flex;flex-direction:column}
.post{display:flex;gap:10px;align-items:flex-start;padding:11px 0;border-bottom:1px dashed var(--line);color:inherit;text-decoration:none}
.post:last-child{border-bottom:0}
.pk{flex-shrink:0;font-size:11px;border-radius:99px;padding:2px 8px;margin-top:2px;color:#fff;background:#2E7D5B}
.pk.c{background:#C25A7A}
.ptx{flex:1;display:flex;flex-direction:column;min-width:0}
.ptx b{font-size:15px;line-height:1.4;color:var(--navy);word-break:keep-all}
.ptx small{font-size:12.5px;color:var(--ink);opacity:.8;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ptx em{font-style:normal;font-size:11px;color:var(--muted);margin-top:2px}
.post.read b{color:var(--muted);font-weight:400}`;
document.head.appendChild(css);

window.POSTS = { card, render: render_, load };
})();
