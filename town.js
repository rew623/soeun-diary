// 동네 탐문 — 산책 지수(날씨+미세먼지), 강원 육아·가족 행사, 어린이 감염병 동향
// 데이터는 Actions(town.yml)가 data/town.json · events.json · disease.json 으로 만들어 둬요 (시·군은 병원 수사와 같은 칸을 써요)
(function () {
const T = { town: null, events: null, dis: null, at: 0, loading: false, evAll: false, evKid: true, evMore: 12 };
const REGK = 'soeun-hosp-region';
const NAMES = { chuncheon: '춘천시', wonju: '원주시', gangneung: '강릉시', donghae: '동해시', taebaek: '태백시', sokcho: '속초시', samcheok: '삼척시', hongcheon: '홍천군', hoengseong: '횡성군', yeongwol: '영월군', pyeongchang: '평창군', jeongseon: '정선군', cheorwon: '철원군', hwacheon: '화천군', yanggu: '양구군', inje: '인제군', goseong: '고성군', yangyang: '양양군' };
const reg = () => { try { const r = localStorage.getItem(REGK); return NAMES[r] ? r : 'wonju'; } catch (e) { return 'wonju'; } };
const setReg = r => { try { localStorage.setItem(REGK, r); } catch (e) {} };

async function load(force) {
  if (T.loading || (!force && T.at && Date.now() - T.at < 30 * 60e3)) return;
  T.loading = true;
  const get = n => fetch('data/' + n, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const [a, b, c] = await Promise.all([get('town.json'), get('events.json'), get('disease.json')]);
  T.town = a; T.events = b; T.dis = c; T.at = Date.now(); T.loading = false;
  if (S.mode === 'ok') render();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && T.at && Date.now() - T.at > 30 * 60e3) load(true); });

// ---------- 산책 지수 ----------
const GN = ['좋음', '보통', '나쁨', '매우나쁨'], GC = ['#2E7D5B', '#B8860B', '#C8551E', '#B3261E'];
const g10 = v => v == null ? null : v <= 30 ? 0 : v <= 80 ? 1 : v <= 150 ? 2 : 3;
const g25 = v => v == null ? null : v <= 15 ? 0 : v <= 35 ? 1 : v <= 75 ? 2 : 3;
const gTxt = s => { const i = GN.indexOf((s || '').trim()); return i < 0 ? null : i; };
const mx = (...a) => { const v = a.filter(x => x != null); return v.length ? Math.max(...v) : null; };
const nowKey = () => { const d = new Date(Date.now() + 9 * 3600e3); return d.toISOString().slice(0, 13).replace(/[-T]/g, ''); };   // YYYYMMDDHH (KST)
// 그 시각 미세먼지 등급: 3시간 안은 지금 측정값, 그 뒤는 예보 (영서/영동)
function airAt(t, code) {
  const A = T.town && T.town.air; if (!A) return null;
  const n = A.now && A.now[code], k = nowKey(), dh = (Date.parse(t.slice(0, 4) + '-' + t.slice(4, 6) + '-' + t.slice(6, 8) + 'T' + t.slice(8, 10) + ':00') - Date.parse(k.slice(0, 4) + '-' + k.slice(4, 6) + '-' + k.slice(6, 8) + 'T' + k.slice(8, 10) + ':00')) / 3600e3;
  if (n && dh <= 3) return mx(g10(n.pm10), g25(n.pm25));
  const side = (A.east || []).includes(code) ? 'e' : 'w', d = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
  const f = A.fc || {};
  const v = mx(gTxt(((f.PM10 || {})[d] || {})[side]), gTxt(((f.PM25 || {})[d] || {})[side]));
  return v != null ? v : n ? mx(g10(n.pm10), g25(n.pm25)) : null;
}
// h = [YYYYMMDDHHMM, 기온, 하늘, 강수형태, 강수확률, 풍속, 습도]
function score(h, code) {
  const [t, tmp, , pty, pop, wsd] = h, ag = airAt(t, code), why = [];
  if (pty > 0) return { s: 0, ag, why: [['비·눈 와요']] };
  let s = 100;
  if (tmp < 18) { s -= (18 - tmp) * 4; if (tmp < 10) why.push('쌀쌀해요'); }
  if (tmp > 24) { s -= (tmp - 24) * 7; if (tmp >= 28) why.push('더워요'); }
  if (tmp <= 0 || tmp >= 32) s = Math.min(s, 10);
  if (pop >= 60) { s -= 45; why.push(`비 올 확률 ${pop}%`); } else if (pop >= 30) s -= 15;
  if (wsd >= 7) { s -= 25; why.push('바람 세요'); } else if (wsd >= 4) s -= 10;
  if (ag === 1) s -= 10; else if (ag === 2) { s -= 55; why.push('미세먼지 나쁨'); } else if (ag === 3) { s = Math.min(s, 5); why.push('미세먼지 매우나쁨'); }
  return { s: Math.max(0, Math.min(100, Math.round(s))), ag, why };
}
const LV = s => s >= 80 ? ['산책 딱 좋아요', '출동 OK', 'ok'] : s >= 60 ? ['산책 괜찮아요', '출동 가능', 'ok'] : s >= 40 ? ['짧게만 다녀와요', '잠깐 출동', 'mid'] : ['오늘은 집콕 추천', '출동 보류', 'no'];
function cloth(t) {
  if (t <= 4) return '우주복·두꺼운 담요, 유모차 바람막이 커버';
  if (t <= 11) return '두꺼운 외투 + 모자, 담요 챙기기';
  if (t <= 16) return '긴팔 + 얇은 겉옷, 담요 하나';
  if (t <= 22) return '긴팔 한 겹이면 충분해요';
  if (t <= 27) return '반팔 + 챙 있는 모자, 그늘 위주로';
  return '한낮은 피하고 아침·저녁에 짧게';
}
// 오늘(늦었으면 내일) 낮 시간(07~19시) 점수
function plan(code) {
  const W = T.town && T.town.weather && T.town.weather.data && T.town.weather.data[code]; if (!W || !W.length) return null;
  const k = nowKey(), today = k.slice(0, 8);
  const hrs = W.filter(h => h[0].slice(0, 10) >= k.slice(0, 10)).map(h => ({ h, ...score(h, code) }));
  const day = d => hrs.filter(x => x.h[0].slice(0, 8) === d && +x.h[0].slice(8, 10) >= 7 && +x.h[0].slice(8, 10) <= 19);
  let list = day(today), when = '오늘';
  if (list.length < 2) { const next = hrs.find(x => x.h[0].slice(0, 8) > today); if (next) { list = day(next.h[0].slice(0, 8)); when = '내일'; } }
  if (!list.length) return null;
  // 가장 좋은 연속 시간 (최고점-5 이상, 최대 3시간)
  const top = Math.max(...list.map(x => x.s)); let bi = list.findIndex(x => x.s === top), be = bi;
  while (be + 1 < list.length && be - bi < 2 && list[be + 1].s >= top - 5) be++;
  while (bi > 0 && be - bi < 2 && list[bi - 1].s >= top - 5) bi--;
  const best = list[bi], hr = x => +x.h[0].slice(8, 10);
  return { when, list, top, from: hr(best), to: hr(list[be]) + 1, tmp: best.h[1], ag: best.ag, why: best.why, all: hrs, ico: ico(best.h) };
}
const ico = h => h[3] === 3 ? '🌨️' : h[3] > 0 ? '🌧️' : h[2] >= 4 ? '☁️' : h[2] === 3 ? '⛅' : '☀️';
function babyNote(t) {
  const d = daysBetween(S.profile.birth, today()) + 1;
  if (d <= 30) return '신생아는 집 앞에서 10분쯤 바람 쐬기로 시작해요.';
  if (d < 183 && t >= 23) return '6개월 전엔 선크림 대신 그늘·모자·얇은 긴팔로 햇볕을 가려요.';
  if (t <= 4) return '추운 날은 짧게, 돌아와서 손발이 따뜻한지 확인해요.';
  return '';
}
const leaf = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c9 0 14-6 14-15-9 0-14 5-14 15z"/><path d="M5 19l7-7"/></svg>';

// 성장 수사 탭 카드
function card() {
  if (!T.at) { load(); return ''; }
  const code = reg(), P = plan(code);
  if (!P) return `<button class="walkcard wait" data-town="open">${CHARS.svg('baby', 'acorn', { size: 64 })}<span class="wtx"><small>오늘 산책 지수 · ${NAMES[code]}</small><b>동네 탐문 준비 중</b><span>날씨·미세먼지를 받아 오면 여기에 떠요. 눌러서 행사 보기</span></span></button>`;
  const [lab, stamp, cls] = LV(P.top);
  return `<button class="walkcard ${cls}" data-town="open"><span class="wico" aria-hidden="true">${P.ico}</span>
    <span class="wtx"><small>${P.when} 산책 지수 · ${NAMES[code]}</small><b>${lab}</b><span>${P.top >= 40 ? `${P.from}~${P.to}시 추천 · ` : ''}${P.tmp}℃${P.ag != null ? ` · 미세먼지 ${GN[P.ag]}` : ''}</span></span>
    <span class="wscore"><b>${P.top}</b><i>${stamp}</i></span></button>`;
}

// ---------- 감염병 ----------
const DNOTE = { 홍역: '12개월 전(MMR 접종 전) 아기는 사람 많은 곳을 피해요', 백일해: '어린 아기에게 위험해요. 가족도 Tdap 접종 권장', 수두: '12~15개월 접종 전엔 수두 환자와 접촉 주의', 유행성이하선염: 'MMR 접종으로 예방해요', 성홍열: '열·목 통증·딸기 혀면 소아과로', 장출혈성대장균감염증: '고기는 완전히 익히고 손 씻기', A형간염: '물·음식 위생, 12개월부터 접종', 일본뇌염: '모기 조심 (12개월부터 접종)', 쯔쯔가무시증: '풀밭에 앉지 않기, 긴 옷', '중증열성혈소판감소증후군(SFTS)': '진드기 조심, 풀밭 피하기' };
function trend(x) {
  const w = x.weeks, last = w[w.length - 2] ?? 0, prev = w.slice(-6, -2), avg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 0;   // 이번 주는 신고가 덜 들어와 지난주로 봐요
  const up = avg ? (last - avg) / avg : last ? 1 : 0;
  return { last, avg, up, hot: (x.name === '홍역' && last > 0) || (up >= 0.5 && last >= 10) };
}
function disHtml(compact) {
  const D = T.dis; if (!D || !D.items || !D.items.length) return '';
  const L = D.items.map(x => ({ ...x, ...trend(x) })).sort((a, b) => (b.hot - a.hot) || (b.up - a.up));
  const show = compact ? L.filter(x => x.hot).slice(0, 3) : L;
  const wkLab = (D.weeks[D.weeks.length - 2] || '').replace(/^(\d{4})-(\d+)/, (m, y, w) => `${+w}주`);
  const row = x => `<div class="drow ${x.hot ? 'hot' : ''}"><span class="dn"><b>${esc(x.name)}</b>${DNOTE[x.name] ? `<small>${esc(DNOTE[x.name])}</small>` : ''}</span><span class="dv"><b>${x.last}</b><small>${x.up >= 0.15 ? `▲ ${Math.round(x.up * 100)}%` : x.up <= -0.15 ? `▼ ${Math.round(-x.up * 100)}%` : '비슷'}</small></span>${spark(x.weeks.slice(0, -1))}</div>`;
  if (compact) {
    return `<button class="discard ${show.length ? 'hot' : ''}" data-town="open" data-v="dis">${CHARS.svg('baby', 'thermo', { size: 52, face: true })}<span><small>어린이 감염병 동향 · 전국 ${wkLab}</small><b>${show.length ? show.map(x => esc(x.name)).join(', ') + ' 늘고 있어요' : '크게 늘어난 감염병은 없어요'}</b><span>눌러서 자세히</span></span></button>`;
  }
  return `<section id="tdis"><h2 class="sh"><span>어린이 감염병 동향</span><span>전국 · 지난주(${wkLab}) 신고</span></h2>${L.map(row).join('')}
    <p class="foot" style="margin-top:8px">질병관리청 전수신고 자료예요. 수족구·독감·RSV는 표본감시라 여기엔 없어요. 이번 주 숫자는 신고가 늦게 들어와 지난주 기준으로 봐요.</p></section>`;
}
function spark(w) {
  if (!w.length) return '';
  const m = Math.max(1, ...w), W = 64, H = 22, st = W / Math.max(1, w.length - 1);
  return `<svg class="dsp" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" points="${w.map((v, i) => `${(i * st).toFixed(1)},${(H - 2 - v / m * (H - 4)).toFixed(1)}`).join(' ')}"/></svg>`;
}

// ---------- 행사 ----------
const md = s => s ? `${+s.slice(5, 7)}.${+s.slice(8, 10)}` : '';
function evHtml() {
  const E = T.events; if (!E || !E.items) return `<section><h2 class="sh"><span>강원 행사·축제</span></h2><p class="vempty">행사 정보를 받아 오면 여기에 떠요.</p></section>`;
  const code = reg(), t = today();
  let L = E.items.filter(e => e.end >= t);
  if (!T.evAll) L = L.filter(e => e.region === code);
  if (T.evKid) L = L.filter(e => e.kid);
  const shown = L.slice(0, T.evMore);
  const item = e => { const on = e.start <= t, dd = on ? '진행 중' : 'D-' + daysBetween(t, e.start);
    const map = e.lat && e.lng ? `https://map.kakao.com/link/map/${encodeURIComponent(e.title)},${e.lat},${e.lng}` : `https://map.kakao.com/?q=${encodeURIComponent(e.addr)}`;
    return `<div class="ev">${e.img ? `<img src="${esc(e.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="evph">${leaf}</span>`}
      <span class="evt"><b>${esc(e.title)}</b><small>${md(e.start)}~${md(e.end)} · ${esc(NAMES[e.region] || '강원')}</small><small class="eva">${esc(e.addr)}</small>
      <span class="evb"><a href="${map}" target="_blank" rel="noopener">지도</a><a href="https://m.search.naver.com/search.naver?query=${encodeURIComponent(e.title)}" target="_blank" rel="noopener">검색</a>${e.tel ? `<a href="tel:${esc(e.tel.replace(/[^\d-]/g, ''))}">전화</a>` : ''}</span></span>
      <span class="evd ${on ? 'on' : ''}">${dd}</span></div>`; };
  return `<section id="tev"><h2 class="sh"><span>강원 행사·축제</span><span>${L.length}건</span></h2>
    <div class="quick" style="margin:0 0 10px"><button class="${T.evAll ? '' : 'on'}" data-town="evreg" data-v="0">${NAMES[code]}</button><button class="${T.evAll ? 'on' : ''}" data-town="evreg" data-v="1">강원 전체</button><button class="${T.evKid ? 'on' : ''}" data-town="evkid">아기랑 갈 만한 것만</button></div>
    ${shown.map(item).join('') || `<p class="vempty">${T.evAll ? '' : NAMES[code] + '에 '}해당하는 행사가 없어요.${T.evAll ? '' : ' "강원 전체"도 눌러 보세요.'}</p>`}
    ${L.length > shown.length ? `<button class="addperiod" data-town="evmore">더 보기 (${L.length - shown.length}건)</button>` : ''}
    <p class="foot" style="margin-top:8px">한국관광공사 축제·행사 정보예요. "아기랑 갈 만한 것"은 제목으로 고른 거라 꼭 맞진 않아요. 가기 전에 일정을 한 번 더 확인해 주세요.</p></section>`;
}

// ---------- 동네 탐문 화면 ----------
function render_() {
  if (!T.at) load();
  const code = reg(), P = plan(code), A = T.town && T.town.air && T.town.air.now && T.town.air.now[code];
  const sel = `<select id="town-reg" class="tsel" aria-label="시·군">${Object.entries(NAMES).map(([k, n]) => `<option value="${k}" ${k === code ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  let walk = `<section><h2 class="sh"><span>산책 지수</span></h2><p class="vempty">${T.loading ? '불러오는 중…' : '날씨·미세먼지 정보를 아직 못 받았어요. 처음 설정 뒤 몇 시간 안에 생겨요.'}</p></section>`;
  if (P) {
    const [lab, stamp, cls] = LV(P.top), note = babyNote(P.tmp);
    const bar = x => { const h = +x.h[0].slice(8, 10), c = x.s >= 80 ? 'ok' : x.s >= 60 ? 'ok2' : x.s >= 40 ? 'mid' : 'no'; return `<span class="whb ${c}" title="${h}시 ${x.s}점"><i style="height:${Math.max(6, x.s)}%"></i><b>${x.h[1]}°</b><small>${h}</small>${x.h[3] > 0 ? '<em>☂</em>' : ''}</span>`; };
    walk = `<section class="walk ${cls}"><h2 class="sh"><span>${P.when} 산책 지수</span><span>${esc(T.town.updated || '')} 기준</span></h2>
      <div class="wtop"><span class="wbig">${P.top}</span><span class="wlab"><b>${lab}</b><span>${P.top >= 40 ? `${P.from}시~${P.to}시가 제일 좋아요` : esc(P.why.join(', ') || '밖은 오늘 쉬어요')}</span></span><span class="stamp">${stamp}</span></div>
      <div class="hbars">${P.list.map(bar).join('')}</div>
      <div class="wtips"><p><b>옷차림</b> ${cloth(P.tmp)} (${P.tmp}℃)</p>${note ? `<p><b>아기 수사관 메모</b> ${note}</p>` : ''}</div></section>`;
  }
  const dust = A ? `<section><h2 class="sh"><span>지금 미세먼지</span><span>${esc(A.t || '')}${A.near ? ` · ${esc(A.near)} 측정소 값` : ''}</span></h2>
    <div class="dust">${[['미세먼지', A.pm10, g10(A.pm10), '㎍/㎥'], ['초미세먼지', A.pm25, g25(A.pm25), '㎍/㎥']].map(([n, v, g, u]) => `<div><small>${n}</small><b style="color:${g != null ? GC[g] : 'var(--muted)'}">${g != null ? GN[g] : '—'}</b><span>${v != null ? v + u : '측정 중'}</span></div>`).join('')}</div>
    ${fcLine(code)}</section>` : '';
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>동네 탐문</h1><p>산책하기 좋은 시간, 미세먼지, 강원 행사, 어린이 감염병을 한곳에서 봐요.</p></header>
    <div class="treg"><span>탐문 지역</span>${sel}</div>
    ${walk}${dust}${disHtml(false)}${evHtml()}
    <button class="secondary" data-town="close" style="width:100%;margin-top:18px">돌아가기</button>`;
}
function fcLine(code) {
  const f = T.town.air.fc || {}, side = (T.town.air.east || []).includes(code) ? 'e' : 'w', d0 = today(), d1 = addDays(d0, 1);
  const g = d => { const a = gTxt(((f.PM10 || {})[d] || {})[side]), b = gTxt(((f.PM25 || {})[d] || {})[side]); const v = mx(a, b); return v == null ? '' : `<span style="color:${GC[v]}">${GN[v]}</span>`; };
  const a = g(d0), b = g(d1); if (!a && !b) return '';
  return `<p class="note">예보 (강원${side === 'e' ? '영동' : '영서'}): 오늘 ${a || '—'} · 내일 ${b || '—'}</p>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-town]'); if (!b) return;
  switch (b.dataset.town) {
    case 'open': S.view = 'town'; render(); window.scrollTo(0, 0); if (b.dataset.v === 'dis') setTimeout(() => { const el = document.getElementById('tdis'); if (el) el.scrollIntoView({ block: 'start' }); }, 50); load(true); break;
    case 'close': S.view = ''; render(); window.scrollTo(0, 0); break;
    case 'evreg': T.evAll = b.dataset.v === '1'; T.evMore = 12; render(); break;
    case 'evkid': T.evKid = !T.evKid; T.evMore = 12; render(); break;
    case 'evmore': T.evMore += 12; render(); break;
  }
});
document.addEventListener('change', e => { if (e.target.id === 'town-reg') { setReg(e.target.value); render(); } });

const css = document.createElement('style');
css.textContent = `
.walkcard{width:100%;display:flex;align-items:center;gap:8px;margin-top:12px;background:#FFFDF7;border:1.5px solid var(--line);border-radius:22px;padding:8px 12px 8px 6px;text-align:left;box-shadow:0 4px 0 #E6D2AE;outline:1.5px dashed var(--stitch);outline-offset:-7px}
.walkcard .chr{flex-shrink:0}
.wico{flex-shrink:0;width:58px;height:58px;display:grid;place-items:center;font-size:36px;background:var(--sky);border-radius:50%;margin-left:6px}
.wtx{flex:1;display:flex;flex-direction:column;min-width:0}
.wtx small{font-size:12px;color:var(--muted)}
.wtx b{font-family:var(--display);font-weight:400;font-size:20px;color:var(--navy);line-height:1.3}
.wtx span{font-size:13px}
.walkcard.wait .wtx b{font-size:17px}
.wscore{display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding-right:4px}
.wscore b{font-family:var(--display);font-weight:400;font-size:34px;line-height:1;color:#2E7D5B}
.walkcard.mid .wscore b{color:#C8551E}.walkcard.no .wscore b{color:var(--red)}
.wscore i{font-style:normal;font-size:11px;color:var(--red);border:2px solid currentColor;border-radius:6px;padding:0 5px;transform:rotate(-6deg);margin-top:4px;white-space:nowrap}
.treg{display:flex;align-items:center;gap:10px;margin:14px 0 0;font-size:13px;color:var(--muted)}
.tsel{flex:1;min-height:44px;border:1.5px solid var(--line);border-radius:14px;background:#FFFDF7;padding:0 12px;font:inherit;font-size:16px;color:var(--ink)}
.wtop{position:relative;display:flex;align-items:center;gap:12px}
.wbig{font-family:var(--display);font-size:56px;line-height:1;color:#2E7D5B}
.walk.mid .wbig{color:#C8551E}.walk.no .wbig{color:var(--red)}
.wlab{display:flex;flex-direction:column}.wlab b{font-family:var(--display);font-weight:400;font-size:22px;color:var(--navy)}.wlab span{font-size:13px}
.wtop .stamp{position:absolute;right:0;top:-4px;margin:0}
.hbars{display:flex;gap:3px;align-items:flex-end;margin:14px 0 6px;height:96px}
.whb{position:relative;flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;min-width:0}
.whb i{display:block;width:100%;border-radius:8px 8px 3px 3px;background:#9CC9A8}
.whb.ok2 i{background:#C7DFA0}.whb.mid i{background:#F2C98B}.whb.no i{background:#EBA79C}
.whb b{position:absolute;top:0;font-size:10px;font-weight:400;color:var(--muted)}
.whb small{font-size:10px;color:var(--muted);margin-top:2px}
.whb em{position:absolute;top:13px;font-style:normal;font-size:11px}
.wtips p{margin:6px 0 0;font-size:13px;line-height:1.55}.wtips b{color:var(--red);margin-right:4px}
.dust{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dust>div{background:#FFFDF7;border:1.5px solid var(--line);border-radius:16px;padding:10px 12px;display:flex;flex-direction:column}
.dust small{font-size:12px;color:var(--muted)}.dust b{font-family:var(--display);font-weight:400;font-size:24px}.dust span{font-size:12px;color:var(--muted)}
.drow{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px dashed var(--line);color:var(--muted)}
.drow .dn{flex:1;display:flex;flex-direction:column;min-width:0}.drow .dn b{color:var(--ink);font-size:15px}.drow .dn small{font-size:11.5px;line-height:1.4}
.drow .dv{display:flex;flex-direction:column;align-items:flex-end}.drow .dv b{font-family:var(--display);font-weight:400;font-size:20px;color:var(--navy)}.drow .dv small{font-size:11px}
.drow.hot .dn b,.drow.hot .dv b,.drow.hot .dv small{color:var(--red)}
.drow.hot{color:var(--red)}
.dsp{flex-shrink:0}
.discard{width:100%;display:flex;align-items:center;gap:10px;margin-top:12px;background:#FFFDF7;border:1.5px solid var(--line);border-radius:18px;padding:8px 12px;text-align:left;box-shadow:0 3px 0 #E6D2AE}
.discard .chr{flex-shrink:0;border-radius:50%;background:#FCEBD3}
.discard>span{display:flex;flex-direction:column;min-width:0}.discard small{font-size:12px;color:var(--muted)}.discard b{font-family:var(--display);font-weight:400;font-size:16px;color:var(--navy)}.discard>span>span{font-size:12px;color:var(--muted)}
.discard.hot{border-color:var(--red);background:#FFF3EF}.discard.hot b{color:var(--red)}
.ev{display:flex;gap:10px;padding:10px 0;border-bottom:1px dashed var(--line);align-items:flex-start}
.ev img,.evph{width:72px;height:72px;border-radius:14px;object-fit:cover;flex-shrink:0;background:var(--card2);display:grid;place-items:center;color:var(--muted)}
.evt{flex:1;display:flex;flex-direction:column;min-width:0}.evt b{font-size:15px;line-height:1.35;word-break:keep-all}.evt small{font-size:12px;color:var(--muted)}
.eva{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.evb{display:flex;gap:6px;margin-top:6px}.evb a{border:1.5px solid var(--line);border-radius:99px;padding:3px 10px;font-size:12px;color:var(--navy);text-decoration:none;background:#fff}
.evd{flex-shrink:0;font-family:var(--display);font-size:13px;color:var(--navy);white-space:nowrap}.evd.on{color:var(--red)}`;
document.head.appendChild(css);

window.TOWN = { card, render: render_, sickCard: () => (T.at ? disHtml(true) : (load(), '')), load };
})();
