// 월간 소은일보 (S.view='paper') — 달마다 그달 기록으로 신문 한 장을 저절로 만들어요 (canvas 1080×1600 → 카톡 보내기·저장·인쇄)
// 기사: 성장(키·몸무게), 최초 목격, 예방접종·검진, 수배범, 닮은꼴 판결, 탐험, 이유식, 봉인된 증거물, 독자 투고(그달 메모), 이달의 날씨(data/wx-YYYY-MM.json, 2026.10부터 Actions가 하루 한 번 남김)
// 제1호는 태어난 달. 매달 1~5일에는 성장 수사 탭에 지난달 호 발행 띠 (본 호는 localStorage soeun-paper-seen)
(function () {
const P = { ym: '', tok: 0, wx: {}, drawn: '' };
const W = 1080, H = 1600, M = 60;
const SEEN = 'soeun-paper-seen';
const INK = '#2B2622', MUTED = '#6B5F52', NAVY = '#1F2A44', RED = '#B3261E', PAPER = '#F6F0E1';
const dot = d => d.replace(/-/g, '.');
const nm = () => ((S.profile && S.profile.name) || '우리 아기').replace(/^[가-힣](?=[가-힣]{2}$)/, '');
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); };
const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const nextYm = ym => { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };
const prevYm = ym => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
const issueNo = ym => { const b = S.profile.birth; return (+ym.slice(0, 4) - +b.slice(0, 4)) * 12 + (+ym.slice(5) - +b.slice(5, 7)) + 1; };
function months() { const L = []; for (let ym = S.profile.birth.slice(0, 7); ym <= today().slice(0, 7); ym = nextYm(ym)) L.push(ym); return L.reverse(); }
const regionCode = () => { try { return localStorage.getItem('soeun-hosp-region') || 'wonju'; } catch (e) { return 'wonju'; } };
const SKY = { 1: '맑음', 3: '구름 많음', 4: '흐림' };

// ---------- 그달 이야기 모으기 ----------
function issue(ym) {
  const b = S.profile.birth, t = today(), inM = d => !!d && d.slice(0, 7) === ym;
  const d0 = ym === b.slice(0, 7) ? b : ym + '-01', end = addDays(nextYm(ym) + '-01', -1), d1 = end < t ? end : t;
  const by = L => L.slice().sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
  const recs = by(S.records || []), lastOf = (k, until) => recs.filter(r => r[k] != null && r[k] !== '' && r.date <= until).pop();
  const w1 = lastOf('weight', d1), w0 = lastOf('weight', addDays(d0, -1)), h1 = lastOf('height', d1), h0 = lastOf('height', addDays(d0, -1));
  const wIn = w1 && inM(w1.date), hIn = h1 && inM(h1.date);
  const firsts = (S.moments || []).filter(m => (m.type === 'first' || !m.type) && inM(m.date)).sort((x, y) => x.date < y.date ? -1 : 1);
  const photos = (S.moments || []).filter(m => m.photo && inM(m.date)).concat((S.records || []).filter(r => r.photo && inM(r.date)));
  const phBy = r => photos.filter(x => x.by === r).length;
  const vacs = (S.vaccines || []).filter(v => inM(v.done)), chks = (S.checkups || []).filter(c => inM(c.done));
  const foods = (S.foods || []).filter(f => f.result === '통과' && inM(f.start)), devs = (S.devs || []).filter(x => inM(x.at));
  const caps = (S.capsules || []).filter(c => inM(c.sealed));
  const days = new Set([...(S.records || []).map(r => r.date), ...(S.moments || []).map(m => m.date), ...(S.meals || []).map(m => m.date), ...(S.vaccines || []).map(v => v.done)].filter(inM));
  // 수배범: 그달에 끝난(일요일이 그달인) 주
  const wanted = []; if (window.WANTED) { for (let ws = WANTED.monday(d0); ws <= d1; ws = addDays(ws, 7)) { const e = addDays(ws, 6); if (inM(e) || (inM(ws) && e > d1)) { const s = WANTED.stat(ws); if (ws <= t) wanted.push(s); } } }
  const look = window.LOOK ? LOOK.monthStat(ym) : null, verdict = look && LOOK.verdict(look);
  const places = window.EXPLORE ? EXPLORE.places().filter(p => !p.home && inM(p.first)) : [];
  // 기념일
  const ann = []; for (let k = 100; k <= 1500; k += 100) { const d = addDays(b, k - 1); if (inM(d)) ann.push([d, `생후 ${k}일`]); }
  for (let y = 1; y <= 5; y++) { const d = addMonths(b, 12 * y); if (inM(d)) ann.push([d, y === 1 ? '첫 돌' : `${y}돌`]); }
  // 독자 투고: 그달 메모 중 가장 긴 것
  const memos = [...(S.records || []).filter(r => inM(r.date) && r.memo).map(r => ({ by: r.by, t: r.memo, d: r.date })), ...(S.moments || []).filter(m => inM(m.date) && m.memo).map(m => ({ by: m.by, t: m.memo, d: m.date }))].sort((x, y) => y.t.length - x.t.length);
  // 대표 사진: 그달 월별 사진 → 최초 목격 사진 → 가장 최근 사진
  const ok = id => !!safeImg(PHOTOS[id]);
  const pool = CV.photos().filter(p => inM(p.date) && p.id !== 'profile');
  const main = pool.find(p => p.type === 'month') || pool.find(p => p.type === 'first') || pool[0] || null;
  const rest = pool.filter(p => !main || p.id !== main.id), strip = [];
  if (rest.length) { const n = Math.min(4, rest.length); for (let i = 0; i < n; i++) strip.push(rest[Math.floor(i * rest.length / n)]); }
  const kg = v => (+v).toFixed(2).replace(/0$/, '');
  return { ym, d0, d1, no: issueNo(ym), w1, w0, h1, h0, wIn, hIn, kg, firsts, photos, phBy, vacs, chks, foods, devs, caps, days, wanted, look, verdict, places, ann, memo: memos[0] || null, main: main && ok(main.id) ? main : null, strip: strip.filter(p => ok(p.id)), partial: d1 < end };
}
function headline(I) {
  const n = nm(), sub = josa(n + ' 탐정', '은', '는');
  const past = I.ann.filter(a => a[0] <= I.d1);
  if (past.length) return ['경축', `${n} 탐정 ${past[0][1]} 돌파!`, `${fmtK(past[0][0], true)} 온 가족이 축하했다`];
  if (I.firsts.length) { const f = I.firsts[0]; return ['속보', `${f.title} 성공… 최초 목격자는 ${f.by || '수사관'}${f.by ? ' 수사관' : ''}`, `생후 ${dayNo(f.date)}일${I.firsts.length > 1 ? ` · 이달 최초 목격 ${I.firsts.length}건` : ''}`]; }
  if (I.w1 && I.w0 && I.wIn && Math.floor(+I.w1.weight) > Math.floor(+I.w0.weight)) return ['속보', `${n} 탐정 ${Math.floor(+I.w1.weight)}kg 돌파!`, `${I.kg(I.w0.weight)}kg → ${I.kg(I.w1.weight)}kg, 한 달 새 ${Math.round((I.w1.weight - I.w0.weight) * 1000)}g 증량`];
  if (I.vacs.length) return ['단독', `주사 ${I.vacs.length}방에도 씩씩… 예방접종 작전 성공`, I.vacs.slice(0, 3).map(v => v.name).join(' · ')];
  if (I.photos.length >= 10) return ['특종', `이달의 증거 사진 ${I.photos.length}장 확보`, `엄마 수사관 ${I.phBy('엄마')}장 · 아빠 수사관 ${I.phBy('아빠')}장`];
  return ['오늘의 소식', `${sub} 이번 달도 무럭무럭`, `생후 ${dayNo(I.d0)}~${dayNo(I.d1)}일의 수사 보고`];
}
function articles(I) {
  const A = [], n = nm();
  if (I.w1 || I.h1) {
    const L = [];
    if (I.w1) L.push(`몸무게 ${I.kg(I.w1.weight)}kg${I.w0 && I.wIn ? ` (지난달보다 ${I.w1.weight >= I.w0.weight ? '+' : ''}${Math.round((I.w1.weight - I.w0.weight) * 1000)}g)` : I.wIn ? '' : ' (지난 기록)'}`);
    if (I.h1) L.push(`키 ${fmt('height', I.h1.height)}cm${I.h0 && I.hIn ? ` (${I.h1.height >= I.h0.height ? '+' : ''}${(I.h1.height - I.h0.height).toFixed(1)}cm)` : I.hIn ? '' : ' (지난 기록)'}`);
    A.push(['📏 성장 면', L.join('. ') + '.']);
  }
  const soon = I.ann.filter(a => a[0] > I.d1);
  if (soon.length) A.push(['📅 다가오는 날', soon.map(a => `${fmtK(a[0], true)} ${a[1]} (D-${daysBetween(today(), a[0])})`).join(', ') + '. 수사관들은 기념 준비에 들어갔다.']);
  if (I.firsts.length) A.push(['👀 사건·사고', I.firsts.map(f => `${fmtK(f.date, true)} ${f.title}${f.by ? ` (목격: ${f.by} 수사관)` : ''}`).join('. ') + '.']);
  if (I.vacs.length || I.chks.length) A.push(['💉 보건 면', [I.vacs.length ? `예방접종 ${I.vacs.length}건 완료: ${I.vacs.map(v => v.name).join(', ')}. 울음은 증거 불충분.` : '', I.chks.map(c => `${c.id[0] === 'o' ? '구강검진' : '영유아 건강검진'} ${c.id.slice(1)}차를 받았다${c.hospital ? ` (${c.hospital})` : ''}.`).join(' ')].filter(Boolean).join(' ')]);
  const caught = I.wanted.filter(s => s.caught), gone = I.wanted.filter(s => s.over && !s.caught);
  if (I.wanted.length) A.push(['🚨 수배 소식', caught.length ? `이달 수배범 ${caught.length}명 체포: ${caught.map(s => s.v[3]).join(', ')}.${gone.length ? ` ${gone.map(s => s.v[3]).join(', ')}은(는) 아직 도주 중.` : ''}` : `${I.wanted.map(s => s.v[3]).join(', ')}을(를) 추적 중. 수사관들의 분발이 요구된다.`]);
  if (I.look && I.look.n) A.push(['🔍 닮은꼴 판결', `${I.look.n}표 중 엄마 닮음 ${I.look.pm}%, 아빠 닮음 ${I.look.pd}%, 반반 ${I.look.pb}%.${I.verdict ? ` 판결: '${I.verdict.title}'.` : ''}`]);
  if (I.places.length) A.push(['🗺️ 탐험 소식', `처음 가 본 곳 ${I.places.length}곳: ${I.places.slice(0, 4).map(p => EXPLORE.label(p)).join(', ')}${I.places.length > 4 ? ' 등' : ''}.`]);
  if (I.foods.length) A.push(['🥄 급식 면', `새 식재료 ${I.foods.length}가지 무혐의 통과: ${I.foods.map(f => f.name).join(', ')}.`]);
  if (I.devs.length) A.push(['✅ 발달 소식', `발달 체크 ${I.devs.length}개 확인. 수사관들 감탄 연발.`]);
  if (I.caps.length) A.push(['🔒 봉인 소식', I.caps.map(c => `${c.by || '수사관'} 수사관이 ${c.occ || dot(c.open)}에 열릴 편지를 봉인했다`).join('. ') + '. 내용은 극비.']);
  if (I.memo) A.push(['✉️ 독자 투고', `"${I.memo.t.length > 110 ? I.memo.t.slice(0, 108) + '…' : I.memo.t}" — ${I.memo.by ? I.memo.by + ' 수사관' : '독자'} (${fmtMD(I.memo.d)})`]);
  const wx = P.wx[I.ym] && P.wx[I.ym][regionCode()];
  if (wx) {
    const D = Object.values(wx), cnt = k => D.filter(r => r[2] === k).length, rain = D.filter(r => r[3] >= 2 || r[4] >= 1).length, snow = D.filter(r => r[5] > 0).length;
    const tmax = Math.max(...D.map(r => r[1])), tmin = Math.min(...D.map(r => r[0]));
    A.push(['☀️ 이달의 날씨', `맑음 ${cnt(1)}일 · 구름 많음 ${cnt(3)}일 · 흐림 ${cnt(4)}일${rain ? ` · 비 온 날 ${rain}일` : ''}${snow ? ` · 눈 온 날 ${snow}일` : ''}. 가장 더울 때 ${Math.round(tmax)}℃, 가장 추울 때 ${Math.round(tmin)}℃. (${D.length}일 기록, 예보 기준)`]);
  }
  const ads = [['📢 광고', `소은 탐정 사무소 수사관 상시 모집. 자격: 무한한 사랑. 급여: ${n} 웃음 무제한.`], ['📢 광고', `도토리 은행: 지금 모은 도토리 🌰 ${(S.game && +S.game.acorn) || 0}개. 이자는 뽀뽀로 지급.`], ['📢 광고', '꿀잠 연구소: 오늘 밤 통잠 성공 시 수사관 전원 포상 휴가.']];
  A.push(ads[hash(I.ym) % ads.length]);
  return A;
}
function numbers(I) {
  const L = [];
  if (I.w1) L.push([`${I.kg(I.w1.weight)}kg`, '몸무게']);
  if (I.h1) L.push([`${fmt('height', I.h1.height)}cm`, '키']);
  L.push([`${I.photos.length}장`, '증거 사진']);
  L.push([`${I.days.size}일`, '수사한 날']);
  if (I.firsts.length) L.push([`${I.firsts.length}건`, '최초 목격']);
  else if (I.vacs.length) L.push([`${I.vacs.length}건`, '예방접종']);
  return L.slice(0, 5);
}

// ---------- 그리기 ----------
async function loadWx(ym) {
  if (P.wx[ym] !== undefined) return;
  P.wx[ym] = null;
  try { const r = await fetch(`data/wx-${ym}.json`, { cache: 'no-cache' }); if (r.ok) P.wx[ym] = await r.json(); } catch (e) {}
}
const lineH = (ctx, text, font, w) => { ctx.font = font; return CV.wrap(ctx, text, w); };
async function draw(cv, ym) {
  const tok = ++P.tok, I = issue(ym);
  await loadWx(ym);
  const [tag, head, sub] = headline(I), A = articles(I), NUM = numbers(I), name = nm() + '일보';
  await CV.fonts(name, head, sub, A.map(a => a.join(' ')).join(' '), NUM.flat().join(' '), '제호년월발행인엄마아빠수사관구독료뽀뽀한번생후일이달의숫자증거사진');
  const imgs = {}, want = [I.main, ...I.strip].filter(Boolean);
  await Promise.all(want.map(async p => { try { imgs[p.id] = await CV.img(safeImg(PHOTOS[p.id])); } catch (e) {} }));
  let sq = {}; try { sq.baby = await CV.svgImg(CHARS.svg('baby', 'note', { size: 200 })); sq.mom = await CV.svgImg(CHARS.svg('mom', 'heart', { size: 200 })); sq.dad = await CV.svgImg(CHARS.svg('dad', 'camera', { size: 200 })); } catch (e) {}
  if (tok !== P.tok) return false;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  // 종이
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 0; i < 1400; i++) { ctx.fillStyle = rnd() < .5 ? 'rgba(120,100,70,.07)' : 'rgba(255,255,255,.25)'; ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2); }
  const rule = (y, w = 2, x0 = M, x1 = W - M, c = INK) => { ctx.fillStyle = c; ctx.fillRect(x0, y, x1 - x0, w); };
  // 머리
  const [y4, m2] = [ym.slice(0, 4), +ym.slice(5)];
  CV.text(ctx, `제${I.no}호${I.no === 1 ? ' (창간호)' : ''}`, M, 64, '24px "Gowun Dodum"', MUTED, 'left');
  CV.text(ctx, `${y4}년 ${m2}월호${I.partial ? ' · 진행 중' : ''}`, W / 2, 64, '24px "Gowun Dodum"', MUTED, 'center');
  CV.text(ctx, `사건 파일 No.${fileNo()}`, W - M, 64, '24px "Gowun Dodum"', MUTED, 'right');
  rule(78, 3);
  if (sq.mom) ctx.drawImage(sq.mom, M + 6, 88, 120, 120);
  if (sq.dad) ctx.drawImage(sq.dad, W - M - 126, 88, 120, 120);
  CV.text(ctx, name, W / 2, 196, '124px Jua', NAVY, 'center', 700);
  CV.text(ctx, `생후 ${dayNo(I.d0)}~${dayNo(I.d1)}일 · 발행인 엄마 수사관·아빠 수사관 · 구독료 뽀뽀 한 번`, W / 2, 246, '24px "Gowun Dodum"', INK, 'center', W - 2 * M);
  rule(264, 3); rule(271, 1);
  // 큰 제목
  ctx.font = '30px Jua'; const tw = ctx.measureText(tag).width + 28;
  ctx.fillStyle = RED; CV.rr(ctx, M, 300, tw, 46, 8); ctx.fill();
  CV.text(ctx, tag, M + tw / 2, 334, '30px Jua', '#fff', 'center');
  const hl = lineH(ctx, head, '62px Jua', W - 2 * M - tw - 20).slice(0, 2);
  let y = 344; hl.forEach((l, i) => { CV.text(ctx, l, i === 0 ? M + tw + 20 : M, y + i * 74, '62px Jua', INK, 'left'); });
  y += (hl.length - 1) * 74 + 46;
  CV.text(ctx, sub, M, y, '28px "Gowun Dodum"', MUTED, 'left', W - 2 * M);
  y += 26;
  // 대표 사진 + 이달의 숫자
  const top = y, pw = 610, ph = 440, nx = M + pw + 30, nw = W - M - nx;
  if (I.main && imgs[I.main.id]) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; ctx.fillStyle = '#fff'; ctx.fillRect(M, top, pw, ph); ctx.restore();
    CV.cover(ctx, imgs[I.main.id], M + 8, top + 8, pw - 16, ph - 16, 1, .5, .3);
    CV.text(ctx, `▲ ${fmtK(I.main.date, true)} 생후 ${dayNo(I.main.date)}일${I.main.title ? ` · ${I.main.title}` : ''}의 ${nm()} 탐정`, M, top + ph + 34, '22px "Gowun Dodum"', MUTED, 'left', pw);
  } else {
    ctx.fillStyle = '#EDE3CC'; ctx.fillRect(M, top, pw, ph);
    if (sq.baby) ctx.drawImage(sq.baby, M + pw / 2 - 130, top + ph / 2 - 150, 260, 260);
    CV.text(ctx, '이달의 사진을 기다리는 중', M + pw / 2, top + ph - 40, '26px "Gowun Dodum"', MUTED, 'center');
  }
  ctx.fillStyle = '#EFE5CF'; CV.rr(ctx, nx, top, nw, ph, 14); ctx.fill();
  CV.text(ctx, '이달의 숫자', nx + nw / 2, top + 50, '32px Jua', RED, 'center');
  rule(top + 66, 2, nx + 24, nx + nw - 24, RED);
  const step = (ph - 90) / Math.max(1, NUM.length);
  NUM.forEach(([v, l], i) => { const yy = top + 90 + step * i + step / 2; CV.text(ctx, v, nx + nw / 2, yy + 6, '46px Jua', NAVY, 'center', nw - 30); CV.text(ctx, l, nx + nw / 2, yy + 36, '22px "Gowun Dodum"', MUTED, 'center'); });
  y = top + ph + 56;
  // 사진 줄
  const strip = I.strip.filter(p => imgs[p.id]);
  if (strip.length >= 2) {
    const gap = 14, n = strip.length, sw = (W - 2 * M - gap * (n - 1)) / n, sh = 150;
    strip.forEach((p, i) => { const x = M + i * (sw + gap); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, sw, sh); CV.cover(ctx, imgs[p.id], x + 5, y + 5, sw - 10, sh - 10, 1, .5, .35); CV.text(ctx, fmtMD(p.date), x + sw - 10, y + sh - 12, '20px Jua', '#fff', 'right'); });
    y += sh + 26;
  }
  rule(y, 2); y += 18;
  // 기사 (두 단, 넘치면 뺌)
  const colW = (W - 2 * M - 40) / 2, cols = [M, M + colW + 40], bottom = H - 96, bodyF = '25px "Gowun Dodum"', LH = 37;
  let ci = 0, cy = y;
  ctx.fillStyle = 'rgba(43,38,34,.35)'; ctx.fillRect(M + colW + 19, y, 1.5, bottom - y);
  for (const [h, body] of A) {
    const lines = lineH(ctx, body, bodyF, colW), need = 44 + lines.length * LH + 16;
    if (cy + need > bottom) { if (ci === 0) { ci = 1; cy = y; } if (cy + need > bottom) continue; }
    CV.text(ctx, h, cols[ci], cy + 32, '30px Jua', h.includes('광고') ? RED : NAVY, 'left', colW);
    lines.forEach((l, i) => CV.text(ctx, l, cols[ci], cy + 44 + LH * (i + 1) - 8, bodyF, INK, 'left'));
    cy += need;
  }
  // 꼬리
  rule(H - 80, 1);
  CV.text(ctx, `${name}는 엄마 수사관·아빠 수사관이 함께 만듭니다 · 성장 수사 일지 · 발행 ${dot(today())}`, W / 2, H - 46, '22px "Gowun Dodum"', MUTED, 'center', W - 2 * M);
  return true;
}

// ---------- 화면 ----------
function render_() {
  const L = months(), ym = L.includes(P.ym) ? P.ym : defYm();
  P.ym = ym;
  return `<header class="vhead noprint"><span class="no">사건 파일 No.${fileNo()}</span><h1>월간 ${esc(nm())}일보</h1><p>그달 기록으로 신문 한 장을 만들어요. 카톡으로 보내거나 인쇄할 수 있어요.</p></header>
  <div class="chips ppms noprint">${L.map(m => `<button class="chip${m === ym ? ' on' : ''}" data-pp="ym" data-v="${m}">${m.slice(0, 4) !== today().slice(0, 4) ? m.slice(2, 4) + '년 ' : ''}${+m.slice(5)}월호${m === today().slice(0, 7) ? ' (진행 중)' : ''}</button>`).join('')}</div>
  <div class="ppwrap"><canvas id="ppcv" class="ppcv" width="${W}" height="${H}" aria-label="${+ym.slice(5)}월호 신문"></canvas><p class="ppload" id="pp-load">신문 찍는 중…</p></div>
  <div class="stact noprint"><button class="primary" data-pp="share">📤 카톡으로 보내기</button><button class="secondary" data-pp="save">💾 저장</button><button class="secondary" data-pp="print">🖨️ 인쇄</button></div>
  <button class="secondary noprint" data-pp="close" style="width:100%;margin-top:10px">돌아가기</button>`;
}
function defYm() { const t = today(), cur = t.slice(0, 7), pv = prevYm(cur); return +t.slice(8) <= 5 && pv >= S.profile.birth.slice(0, 7) ? pv : cur; }
function mount() {
  const cv = document.getElementById('ppcv'); if (!cv) return;
  draw(cv, P.ym).then(ok => { const l = document.getElementById('pp-load'); if (ok && l) l.hidden = true; }).catch(e => { console.error(e); const l = document.getElementById('pp-load'); if (l) l.textContent = '신문을 만들지 못했어요: ' + ((e && e.message) || ''); });
}
const fname = () => `${nm()}일보_${P.ym.slice(0, 4)}년${+P.ym.slice(5)}월호.jpg`;
function blob() { const cv = document.getElementById('ppcv'); return new Promise((res, rej) => { try { cv.toBlob(b => b ? res(b) : rej(new Error('만들지 못했어요')), 'image/jpeg', .92); } catch (e) { rej(e); } }); }
function banner() {
  if (!S.profile || !S.profile.birth) return '';
  const t = today(), pv = prevYm(t.slice(0, 7)); let seen = '';
  try { seen = localStorage.getItem(SEEN) || ''; } catch (e) {}
  if (+t.slice(8) > 5 || pv < S.profile.birth.slice(0, 7) || seen >= pv) return '';
  return `<button class="ppban" data-pp="openprev"><span class="ppbi">📰</span><span><b>${esc(nm())}일보 ${+pv.slice(5)}월호</b>가 나왔어요! 지난달 소식을 신문으로 봐요</span><em>보기 ›</em></button>`;
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-pp]'); if (!b || b.disabled) return;
  const a = b.dataset.pp;
  if (a === 'open') { P.ym = ''; S.view = 'paper'; render(); window.scrollTo(0, 0); return; }
  if (a === 'openprev') { P.ym = prevYm(today().slice(0, 7)); try { localStorage.setItem(SEEN, P.ym); } catch (x) {} S.view = 'paper'; render(); window.scrollTo(0, 0); return; }
  if (a === 'close') { S.view = ''; render(); window.scrollTo(0, 0); return; }
  if (a === 'ym') { P.ym = b.dataset.v; render(); return; }
  if (a === 'print') { window.print(); return; }
  if (a === 'share' || a === 'save') {
    b.disabled = true;
    try { const bl = await blob(); if (a === 'save') { CV.save(bl, fname()); toast('신문을 저장했어요'); } else { const r = await CV.share(bl, fname(), `${nm()}일보 ${+P.ym.slice(5)}월호`); if (r === 'saved') toast('공유가 안 되는 폰이라 저장했어요'); } if (window.GAME) GAME.mark('paper'); }
    catch (x) { toast((x && x.name === 'SecurityError') ? '사진을 다시 불러온 뒤 해 주세요 (인터넷 확인)' : '만들지 못했어요: ' + ((x && x.message) || '')); }
    b.disabled = false;
  }
});

const css = document.createElement('style');
css.textContent = `
.ppms{margin-top:12px}.ppms .chip.on{background:var(--navy);color:#fff}
.ppwrap{position:relative;margin-top:12px}
.ppcv{display:block;width:100%;height:auto;border-radius:6px;box-shadow:0 6px 16px rgba(60,40,20,.22);background:#F6F0E1}
.ppload{position:absolute;left:0;right:0;top:40%;text-align:center;font-family:var(--display);color:var(--navy);font-size:18px}
.ppban{display:flex;align-items:center;gap:10px;width:100%;margin:10px 0 4px;padding:12px 14px;border-radius:18px;border:1.5px solid var(--line);background:#FFFDF7;font-size:14px;text-align:left;color:var(--ink);box-shadow:0 3px 0 #E6D2AE}
.ppban .ppbi{font-size:24px}.ppban span{flex:1;min-width:0}.ppban em{font-style:normal;color:var(--red);font-weight:700;white-space:nowrap}
@media print{
  .noprint{display:none!important}
  .ppcv{width:100%!important;max-width:190mm;margin:0 auto;box-shadow:none!important;border-radius:0}
  .ppwrap{margin:0}.ppload{display:none!important}
}`;
document.head.appendChild(css);
window.PAPER = { render: render_, mount, banner, issue };
})();
