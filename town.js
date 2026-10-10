// 동네 탐문 탭(S.tab='town') — 산책 지수(날씨+미세먼지·특보), 강원 행사·축제 / 어린이 감염병 동향은 예방접종 탭 맨 아래(기본 접힘)
// 데이터는 Actions(town.yml)가 data/town.json · events.json · disease.json 으로 만들어 둬요 (시·군은 병원 수사와 같은 칸을 써요)
(function () {
const T = { town: null, events: null, dis: null, at: 0, loading: false, evAll: false, evKid: false, evMore: 12 };
const REGK = 'soeun-hosp-region';
const NAMES = { chuncheon: '춘천시', wonju: '원주시', gangneung: '강릉시', donghae: '동해시', taebaek: '태백시', sokcho: '속초시', samcheok: '삼척시', hongcheon: '홍천군', hoengseong: '횡성군', yeongwol: '영월군', pyeongchang: '평창군', jeongseon: '정선군', cheorwon: '철원군', hwacheon: '화천군', yanggu: '양구군', inje: '인제군', goseong: '고성군', yangyang: '양양군' };
const reg = () => { try { const r = localStorage.getItem(REGK); return NAMES[r] ? r : 'wonju'; } catch (e) { return 'wonju'; } };
const setReg = r => { try { localStorage.setItem(REGK, r); } catch (e) {} };

async function load(force) {
  if (T.loading || (!force && T.at && Date.now() - T.at < 30 * 60e3)) return;
  T.loading = true;
  const get = n => fetch('data/' + n, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const [a, b, c, d] = await Promise.all([get('town.json'), get('events.json'), get('disease.json'), get('posts.json')]);
  T.town = a; T.events = b; T.dis = c; T.news = d && d.news; T.at = Date.now(); T.loading = false;
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
// 지금 발효 중인 기상특보·미세먼지 주의보/경보 (오늘 시간에만 반영)
const BAD = /폭염|한파|호우|대설|태풍|강풍|황사/;
function alerts(code) {
  const out = [], W = T.town && T.town.warn, A = T.town && T.town.alarm;
  ((W && W.list) || []).filter(x => (x.codes || []).includes(code) && BAD.test(x.kind)).forEach(x => out.push({ t: x.kind, k: 'w' }));
  (A || []).filter(x => (x.codes || []).includes(code)).forEach(x => out.push({ t: `${x.item} ${x.gbn}`, k: 'd', g: /경보/.test(x.gbn) ? 3 : 2 }));
  return out;
}
const alertHtml = code => alerts(code).map(a => `<span class="walert">⚠ ${esc(a.t)}</span>`).join('');
// h = [YYYYMMDDHHMM, 기온, 하늘, 강수형태, 강수확률, 풍속, 습도]
function score(h, code) {
  const [t, tmp, , pty, pop, wsd] = h, why = [];
  let ag = airAt(t, code), s = 100;
  if (t.slice(0, 8) === nowKey().slice(0, 8)) for (const a of alerts(code)) {
    if (a.k === 'd') { ag = mx(ag, a.g); continue; }
    if (/경보/.test(a.t)) s = Math.min(s, 10); else s -= 30;
    why.push(a.t + ' 발효 중');
  }
  if (pty > 0) return { s: 0, ag, why: ['비·눈 와요', ...why] };
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

// ---------- 감염병 ----------
const DNOTE = { 홍역: '12개월 전(MMR 접종 전) 아기는 사람 많은 곳을 피해요', 백일해: '어린 아기에게 위험해요. 가족도 Tdap 접종 권장', 수두: '12~15개월 접종 전엔 수두 환자와 접촉 주의', 유행성이하선염: 'MMR 접종으로 예방해요', 성홍열: '열·목 통증·딸기 혀면 소아과로', 장출혈성대장균감염증: '고기는 완전히 익히고 손 씻기', A형간염: '물·음식 위생, 12개월부터 접종', 일본뇌염: '모기 조심 (12개월부터 접종)', 쯔쯔가무시증: '풀밭에 앉지 않기, 긴 옷', '중증열성혈소판감소증후군(SFTS)': '진드기 조심, 풀밭 피하기' };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
// live: 올해 최근 주(이번 주는 신고가 덜 들어와 지난주로) / 아니면 작년 같은 주와 그 뒤 몇 주가 늘었는지
function trend(x, D) {
  const w = x.weeks;
  if (D.live === false) {
    let i = D.weeks.findIndex(k => +k.slice(5) === D.week); if (i < 0) i = Math.min(6, w.length - 1);
    const ahead = avg(w.slice(i, i + 4)), before = avg(w.slice(Math.max(0, i - 4), i)), up = before ? (ahead - before) / before : ahead ? 1 : 0;
    return { last: w[i] || 0, up, i, hot: (x.name === '홍역' && ahead > 0) || (up >= 0.3 && ahead >= 10) };
  }
  const last = w[w.length - 2] ?? 0, a = avg(w.slice(-6, -2)), up = a ? (last - a) / a : last ? 1 : 0;
  return { last, up, i: w.length - 2, hot: (x.name === '홍역' && last > 0) || (up >= 0.5 && last >= 10) };
}
// 예방접종 탭 맨 아래: 제목 한 줄로 접혀 있다가 누르면 펼쳐져요
function disHtml() {
  if (!T.at) { load(); return ''; }
  const D = T.dis; if (!D || !D.items || !D.items.length) return '';
  const live = D.live !== false;
  const L = D.items.map(x => ({ ...x, ...trend(x, D) })).sort((a, b) => (b.hot - a.hot) || (b.up - a.up));
  const hot = L.filter(x => x.hot).length;
  const wkLab = live ? (D.weeks[D.weeks.length - 2] || '').replace(/^(\d{4})-(\d+)/, (m, y, w) => `${+w}주`) : `${D.week}주 전후`;
  const arrow = x => x.up >= 0.15 ? `▲ ${Math.round(x.up * 100)}%` : x.up <= -0.15 ? `▼ ${Math.round(-x.up * 100)}%` : '비슷';
  const row = x => `<div class="drow ${x.hot ? 'hot' : ''}"><span class="dn"><b>${esc(x.name)}</b>${DNOTE[x.name] ? `<small>${esc(DNOTE[x.name])}</small>` : ''}</span><span class="dv"><b>${x.last}</b><small>${live ? arrow(x) : x.up >= 0.15 ? '이맘때 늘어요' : x.hot ? '이맘때 발생' : x.up <= -0.15 ? '이맘때 줄어요' : '비슷'}</small></span>${spark(live ? x.weeks.slice(0, -1) : x.weeks, live ? -1 : x.i)}</div>`;
  return `<section id="tdis" class="dsec${isFold('v-dis', true) ? ' folded' : ''}"><h2 class="sh" data-fold="v-dis"><span>어린이 감염병 동향</span><span>${hot ? `<b class="dhot">늘어남 ${hot}</b>` : ''}${live ? `전국 ${wkLab}` : `작년 ${wkLab}`}</span></h2>
    ${live ? '' : `<p class="hint" style="margin:0 0 6px">올해 주별 숫자는 아직 공개 전이라, 작년 같은 때 전국 신고 수로 "이맘때 많아지는 병"을 보여 줘요. 그래프의 점이 이번 주예요.</p>`}${L.map(row).join('')}
    <p class="foot" style="margin-top:8px">질병관리청 전수신고 자료예요. 수족구·독감·RSV는 표본감시라 여기엔 없어요.${live ? ' 이번 주 숫자는 신고가 늦게 들어와 지난주 기준으로 봐요.' : ''}</p></section>`;
}
function spark(w, mark = -1) {
  if (!w.length) return '';
  const m = Math.max(1, ...w), W = 64, H = 22, st = W / Math.max(1, w.length - 1), y = v => (H - 2 - v / m * (H - 4)).toFixed(1);
  return `<svg class="dsp" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" points="${w.map((v, i) => `${(i * st).toFixed(1)},${y(v)}`).join(' ')}"/>${mark >= 0 && mark < w.length ? `<circle cx="${(mark * st).toFixed(1)}" cy="${y(w[mark])}" r="3" fill="var(--red)"/>` : ''}</svg>`;
}

// ---------- 행사 ----------
const md = s => s ? `${+s.slice(5, 7)}.${+s.slice(8, 10)}` : '';
// ---------- 일주일 산책 예보 (0~3일: 단기예보 시간별, 그 뒤: 중기예보 오전·오후) ----------
const WD = '일월화수목금토';
function midScore(tmax, pop, wf) {
  if (/비|눈|소나기/.test(wf || '')) return 8;
  let s = 100;
  if (tmax < 18) s -= (18 - tmax) * 4; if (tmax > 26) s -= (tmax - 26) * 7;
  if (tmax <= 2 || tmax >= 33) s = Math.min(s, 10);
  if (pop >= 60) s -= 45; else if (pop >= 30) s -= 15;
  if (/흐림/.test(wf || '')) s -= 5;
  return Math.max(0, Math.min(100, Math.round(s)));
}
const wfIco = wf => /눈/.test(wf) ? '🌨️' : /비|소나기/.test(wf) ? '🌧️' : /흐림/.test(wf) ? '☁️' : /구름/.test(wf) ? '⛅' : '☀️';
function week(code) {
  const W = (T.town && T.town.weather && T.town.weather.data && T.town.weather.data[code]) || [], M = T.town && T.town.mid, out = [];
  const late = new Date(Date.now() + 9 * 3600e3).getUTCHours() >= 18, t0 = late ? addDays(today(), 1) : today();   // 저녁이면 내일부터 7일
  for (let i = 0; i < 7; i++) {
    const d = addDays(t0, i), dk = d.replace(/-/g, ''), hrs = W.filter(h => h[0].slice(0, 8) === dk);
    const day = hrs.filter(h => +h[0].slice(8, 10) >= 9 && +h[0].slice(8, 10) <= 18);
    if (day.length >= (d === today() ? 1 : 4)) {   // 오늘은 남은 낮 시간만으로
      const sc = day.map(h => ({ h, ...score(h, code) })), best = sc.reduce((a, b) => b.s > a.s ? b : a), tm = hrs.map(h => h[1]);
      out.push({ d, s: best.s, ico: ico(best.h), hi: Math.max(...tm), lo: Math.min(...tm), at: +best.h[0].slice(8, 10), src: 'short' });
      continue;
    }
    if (!M || !M.tmFc) { out.push({ d, s: null }); continue; }
    const n = daysBetween(`${M.tmFc.slice(0, 4)}-${M.tmFc.slice(4, 6)}-${M.tmFc.slice(6, 8)}`, d), side = (T.town.air && T.town.air.east || []).includes(code) ? 'e' : 'w';
    const L = (M.land || {})[side] || {}, ta = (M.ta || {})[code] || {};
    const pop = Math.max(+(L[`rnSt${n}Pm`] ?? L[`rnSt${n}`] ?? 0), +(L[`rnSt${n}Am`] ?? 0)), wf = L[`wf${n}Pm`] || L[`wf${n}`] || L[`wf${n}Am`] || '';
    const hi = ta[`taMax${n}`], lo = ta[`taMin${n}`];
    if (hi == null && !wf) { out.push({ d, s: null }); continue; }
    out.push({ d, s: hi != null ? midScore(+hi, pop, wf) : (/비|눈/.test(wf) ? 8 : null), ico: wfIco(wf), hi: hi != null ? +hi : null, lo: lo != null ? +lo : null, pop, src: 'mid' });
  }
  return out;
}
function weekHtml(code) {
  const L = week(code); if (!L.some(x => x.s != null)) return '';
  const best = L.filter(x => x.s != null).reduce((a, b) => b.s > a.s ? b : a);
  const c = s => s == null ? 'na' : s >= 80 ? 'ok' : s >= 60 ? 'ok2' : s >= 40 ? 'mid' : 'no';
  return `<div class="wweek"><div class="wwh"><b>📅 일주일 산책 예보</b><small>${best.s >= 60 ? `${+best.d.slice(5, 7)}/${+best.d.slice(8)}(${WD[new Date(best.d + 'T00:00:00Z').getUTCDay()]})이 제일 좋아요` : '이번 주는 짧게 다녀와요'}</small></div>
    <div class="wwd">${L.map((x, i) => `<span class="wd ${c(x.s)}"><small>${x.d === today() ? '오늘' : x.d === addDays(today(), 1) ? '내일' : WD[new Date(x.d + 'T00:00:00Z').getUTCDay()]}</small><em>${x.ico || '·'}</em><b>${x.s == null ? '-' : x.s}</b><i>${x.hi != null ? `${Math.round(x.hi)}°` : ''}${x.lo != null ? `<u>${Math.round(x.lo)}°</u>` : ''}</i></span>`).join('')}</div>
    <p class="foot" style="margin:6px 0 0">3일 뒤부터는 기상청 중기예보(오전·오후)라 대략이에요. 미세먼지는 오늘·내일만 반영돼요.</p></div>`;
}

// ---------- 동네 소식 (네이버 블로그·카페·뉴스에서 찾은 아이 행사 글) ----------
function newsHtml(code) {
  const L = (T.news || {})[code] || [];
  if (!L.length) return '';
  // 기본은 3개만, 펼치면 다 (위·아래에 접기)
  const N = 3, open = T.newsOpen && L.length > N, shown = open ? L : L.slice(0, N);
  return `<section class="tnews" id="tnews"><h2 class="sh"><span>📣 ${NAMES[code]} 아이 행사 소식</span>${open ? '<button class="tnfold" data-town="newsfold">접기 ▴</button>' : `<span>최근 3주 · ${L.length}개</span>`}</h2><p class="hint" style="margin:0 0 4px">블로그·카페·뉴스에서 찾은 글이에요. 하루 한 번 새로 모아요.</p>
    ${shown.map(x => `<a class="post" href="${esc(x.u)}" target="_blank" rel="noopener"><span class="pk ${x.k}">${x.k === 'n' ? '뉴스' : x.k === 'b' ? '블로그' : '카페'}</span><span class="ptx"><b>${esc(x.t)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}<em>${esc(x.s || '')}${x.dt ? ' · ' + x.dt.slice(5).replace('-', '.') : ''}</em></span></a>`).join('')}
    ${L.length > N ? `<button class="addperiod" data-town="${open ? 'newsfold' : 'newsmore'}">${open ? '접기 ▴' : `더 보기 (${L.length - N}개) ▾`}</button>` : ''}</section>`;
}

// ---------- 아기랑 갈 곳 (카카오맵 장소 검색: 내 위치 또는 탐문 지역 둘레 5km) ----------
const PLACES = [['키즈카페', '🧸'], ['수유실', '🍼'], ['공원', '🌳'], ['어린이도서관', '📚'], ['문화센터', '🎨'], ['장난감도서관', '🪀']];
const PL = { q: '', list: null, busy: false, err: '', where: '' };
async function searchPlaces(q) {
  PL.q = q; PL.busy = true; PL.err = ''; PL.list = null; render();
  try {
    if (!window.HOSP || !HOSP.sdk) throw new Error('지도를 불러오지 못했어요');
    await HOSP.sdk();
    if (!kakao.maps.services) throw new Error('장소 검색을 쓸 수 없어요 (앱을 다시 열어 주세요)');
    let lat, lng; PL.where = '';
    try { const p = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000, maximumAge: 300000 })); lat = p.coords.latitude; lng = p.coords.longitude; PL.where = '내 위치'; }
    catch (e) { const r = (HOSP.regionCenter && HOSP.regionCenter(reg())) || { lat: 37.3422, lng: 127.9202 }; lat = r.lat; lng = r.lng; PL.where = NAMES[reg()] + ' 가운데'; }
    const ps = new kakao.maps.services.Places();
    PL.list = await new Promise(res => ps.keywordSearch(q, (data, status) => res(status === kakao.maps.services.Status.OK ? data : []), { location: new kakao.maps.LatLng(lat, lng), radius: 5000, sort: kakao.maps.services.SortBy.DISTANCE }));
  } catch (e) { PL.err = e.message || '찾지 못했어요'; PL.list = []; }
  PL.busy = false; if (S.tab === 'town') render();
}
function placesHtml() {
  const L = PL.list;
  return `<section id="tplace"><h2 class="sh"><span>🧸 아기랑 갈 곳</span><span>${PL.where ? esc(PL.where) + ' 둘레 5km' : '카카오맵에서 찾아요'}</span></h2>
    <div class="chips">${PLACES.map(([q, e]) => `<button class="chip${PL.q === q ? ' on' : ''}" data-town="place" data-v="${q}">${e} ${q}</button>`).join('')}</div>
    ${PL.busy ? '<p class="vempty">찾는 중…</p>' : PL.err ? `<p class="vempty">${esc(PL.err)}</p>` : L ? (L.length ? `<div class="plc">${L.slice(0, 15).map(p => `<a class="plr" href="${esc(p.place_url)}" target="_blank" rel="noopener"><span><b>${esc(p.place_name)}</b><small>${esc(p.road_address_name || p.address_name)}${p.phone ? ' · ' + esc(p.phone) : ''}</small></span><em>${p.distance ? (p.distance >= 1000 ? (p.distance / 1000).toFixed(1) + 'km' : p.distance + 'm') : ''}</em></a>`).join('')}</div>` : '<p class="vempty">근처에서 찾지 못했어요.</p>') : '<p class="foot" style="margin:8px 0 0">위 칸을 누르면 가까운 곳부터 보여 줘요. 누르면 카카오맵에서 열려요.</p>'}
  </section>`;
}

function evHtml() {
  const E = T.events; if (!E || !E.items) return `<section><h2 class="sh"><span>강원 행사·축제</span></h2><p class="vempty">행사 정보를 받아 오면 여기에 떠요.</p></section>`;
  const code = reg(), t = today();
  let L = E.items.filter(e => e.end >= t);
  if (!T.evAll) L = L.filter(e => e.region === code);
  if (T.evKid) L = L.filter(e => e.kid);
  const shown = L.slice(0, T.evMore);
  const item = e => { const on = e.start <= t, dd = on ? '진행 중' : 'D-' + daysBetween(t, e.start);
    const map = e.lat && e.lng ? `https://map.kakao.com/link/map/${encodeURIComponent(e.title)},${e.lat},${e.lng}` : `https://map.kakao.com/?q=${encodeURIComponent(e.addr)}`;
    return `<div class="ev">${e.img ? `<img src="${esc(e.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : `<span class="evph">${leaf}</span>`}
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
  if (window.GAME) GAME.mark('town');   // 오늘의 지령: 동네 탐문 보기
  const code = reg(), P = plan(code), A = T.town && T.town.air && T.town.air.now && T.town.air.now[code];
  const sel = `<select id="town-reg" class="tsel" aria-label="시·군">${Object.entries(NAMES).map(([k, n]) => `<option value="${k}" ${k === code ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  let walk = `<section><h2 class="sh"><span>산책 지수</span></h2><p class="vempty">${T.loading ? '불러오는 중…' : '날씨·미세먼지 정보를 아직 못 받았어요. 처음 설정 뒤 몇 시간 안에 생겨요.'}</p></section>`;
  if (P) {
    const [lab, stamp, cls] = LV(P.top), note = babyNote(P.tmp);
    const bar = x => { const h = +x.h[0].slice(8, 10), c = x.s >= 80 ? 'ok' : x.s >= 60 ? 'ok2' : x.s >= 40 ? 'mid' : 'no'; return `<span class="whb ${c}" title="${h}시 ${x.s}점"><i style="height:${Math.max(6, x.s)}%"></i><b>${x.h[1]}°</b><small>${h}</small>${x.h[3] > 0 ? '<em>☂</em>' : ''}</span>`; };
    walk = `<section class="walk ${cls}"><h2 class="sh"><span>${P.when} 산책 지수</span><span>${esc(T.town.updated || '')} 기준</span></h2>
      <div class="wtop"><span class="wbig">${P.top}</span><span class="wlab"><b>${P.ico} ${lab}</b><span>${P.top >= 40 ? `${P.from}시~${P.to}시가 제일 좋아요` : esc(P.why.join(', ') || '밖은 오늘 쉬어요')}</span></span><span class="stamp">${stamp}</span></div>
      ${P.when === '오늘' && alerts(code).length ? `<div class="walerts">${alertHtml(code)}<small>기상청·에어코리아 발표, 오늘 점수에 반영했어요</small></div>` : ''}
      <div class="hbars">${P.list.map(bar).join('')}</div>
      <div class="wtips"><p><b>옷차림</b> ${cloth(P.tmp)} (${P.tmp}℃)</p>${note ? `<p><b>아기 수사관 메모</b> ${note}</p>` : ''}</div>${weekHtml(code)}</section>`;
  }
  const dust = A ? `<section><h2 class="sh"><span>지금 미세먼지</span><span>${esc(A.t || '')}${A.near ? ` · ${esc(A.near)} 측정소 값` : ''}</span></h2>
    <div class="dust">${[['미세먼지', A.pm10, g10(A.pm10), '㎍/㎥'], ['초미세먼지', A.pm25, g25(A.pm25), '㎍/㎥']].map(([n, v, g, u]) => `<div><small>${n}</small><b style="color:${g != null ? GC[g] : 'var(--muted)'}">${g != null ? GN[g] : '—'}</b><span>${v != null ? v + u : '측정 중'}</span></div>`).join('')}</div>
    ${fcLine(code)}</section>` : '';
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>동네 탐문</h1><p>산책하기 좋은 시간, 미세먼지, 강원 행사를 한곳에서 봐요.</p></header>${CHARS.guide('town')}
    <div class="treg"><span>탐문 지역</span>${sel}</div>
    ${walk}${dust}${newsHtml(code)}${evHtml()}${placesHtml()}`;
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
    case 'open': S.tab = 'town'; S.view = ''; render(); window.scrollTo(0, 0); load(true); break;
    case 'evreg': T.evAll = b.dataset.v === '1'; T.evMore = 12; render(); break;
    case 'evkid': T.evKid = !T.evKid; T.evMore = 12; render(); break;
    case 'evmore': T.evMore += 12; render(); break;
    case 'newsmore': T.newsOpen = true; render(); break;
    case 'newsfold': { T.newsOpen = false; render(); const el = document.getElementById('tnews'); if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' }); break; }
    case 'place': searchPlaces(b.dataset.v); break;
  }
});
document.addEventListener('change', e => { if (e.target.id === 'town-reg') { setReg(e.target.value); render(); } });

const css = document.createElement('style');
css.textContent = `
.walert{display:inline-block;align-self:flex-start;font-size:11.5px;font-weight:700;color:#fff;background:var(--red);border-radius:99px;padding:1px 9px;margin:2px 4px 2px 0}
.walerts{margin-top:10px}.walerts small{display:block;font-size:11px;color:var(--muted);margin-top:2px}
.dhot{display:inline-block;background:var(--red);color:#fff;border-radius:99px;padding:0 8px;font-size:11px;margin-right:6px;letter-spacing:0}
#app section.dsec.folded{padding:10px 14px;box-shadow:0 2px 0 #E6D2AE}
#app section.dsec.folded>.sh{font-size:12px}
.wweek{margin-top:12px;border-top:2px dotted var(--line);padding-top:10px}
.wwh{display:flex;justify-content:space-between;align-items:baseline;gap:6px}.wwh b{font-family:var(--display);font-weight:400;font-size:16px;color:var(--navy)}.wwh small{font-size:12px;color:var(--red)}
.wwd{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin-top:6px}
.wd{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 0;border-radius:12px;background:#FFFDF7;border:1.5px solid var(--line)}
.wd small{font-size:11px;color:var(--muted)}.wd em{font-style:normal;font-size:18px}.wd b{font-family:var(--display);font-weight:400;font-size:17px}
.wd i{font-style:normal;font-size:10.5px;color:var(--ink)}.wd i u{text-decoration:none;color:var(--muted);margin-left:2px}
.wd.ok{background:#EEF7EA;border-color:#B9D7A8}.wd.ok b{color:#2E7D5B}.wd.ok2 b{color:#5E9E57}.wd.mid{background:#FFF6E8}.wd.mid b{color:#C8551E}.wd.no{background:#FDEEEB}.wd.no b{color:var(--red)}.wd.na b{color:var(--muted)}
.plc{display:flex;flex-direction:column;margin-top:8px}
.plr{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px dashed var(--line);color:inherit;text-decoration:none}
.plr span{flex:1;display:flex;flex-direction:column;min-width:0}.plr b{font-size:14.5px;color:var(--navy)}.plr small{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.plr em{font-style:normal;font-size:12px;color:var(--red);white-space:nowrap}
.tnfold{border:1.5px solid var(--line);background:#FFFDF7;border-radius:99px;font-size:12.5px;padding:3px 12px;min-height:30px;color:var(--navy)}
.tnews .post{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px dashed var(--line);color:inherit;text-decoration:none}
.tnews .pk{flex-shrink:0;font-size:11px;border-radius:99px;padding:2px 8px;margin-top:2px;color:#fff;background:#2E7D5B}.tnews .pk.c{background:#C25A7A}.tnews .pk.n{background:var(--navy)}
.tnews .ptx{flex:1;display:flex;flex-direction:column;min-width:0}.tnews .ptx b{font-size:14.5px;line-height:1.4;color:var(--navy);word-break:keep-all}
.tnews .ptx small{font-size:12px;opacity:.8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.tnews .ptx em{font-style:normal;font-size:11px;color:var(--muted)}
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
.ev{display:flex;gap:10px;padding:10px 0;border-bottom:1px dashed var(--line);align-items:flex-start}
.ev img,.evph{width:72px;height:72px;border-radius:14px;object-fit:cover;flex-shrink:0;background:var(--card2);display:grid;place-items:center;color:var(--muted)}
.evt{flex:1;display:flex;flex-direction:column;min-width:0}.evt b{font-size:15px;line-height:1.35;word-break:keep-all}.evt small{font-size:12px;color:var(--muted)}
.eva{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.evb{display:flex;gap:6px;margin-top:6px}.evb a{border:1.5px solid var(--line);border-radius:99px;padding:3px 10px;font-size:12px;color:var(--navy);text-decoration:none;background:#fff}
.evd{flex-shrink:0;font-family:var(--display);font-size:13px;color:var(--navy);white-space:nowrap}.evd.on{color:var(--red)}`;
document.head.appendChild(css);

window.TOWN = { render: render_, disHtml, load };
})();
