// 성장 영상 만들기 (S.view='movie') — 앱의 사진과 기록으로 음악이 흐르는 영상을 만들어 폰에 저장하거나 카톡으로 보내요
// 🕵️ 수사 일지 총정리: 앱에 남긴 기록 전부를 장면으로 (프로필 · 성장 그래프 · 최초 목격 · 월별 사진 보드 · 접종 도장 · 수배범 · 닮은꼴 판결 · 탐험 지도 · 수사관 신분증 · 봉인된 편지 · 사진 몽타주 · 방 엔딩), 소은 탐정 캐릭터가 나와요
// 📖 성장 스토리 · 💯 100일 · 📷 같은 포즈 · 🗓 이번 달: 사진은 장면마다 폴라로이드 · 수사 보드 · 필름 · 꽉 찬 화면으로 저절로 꾸며요 (테이프 · 스티커 · 낙서 · 캐릭터)
// 음악은 music.js (7곡, 영상 종류·기념일로 추천, 미리 듣기). canvas에 그리며 MediaRecorder로 녹화 (mp4 되면 mp4, 아니면 webm), 녹화는 body에 붙인 겹침 창에서
(function () {
const M = { tpl: 'recap', speed: 2.6, song: 'auto', sq: false, busy: false, abort: false, url: '', blob: null, ext: 'mp4', el: null, lock: null };
const TPLS = [['recap', '🕵️ 수사 일지 총정리', '지금까지 남긴 기록 전부를 한 편으로 (성장 그래프·최초 목격·수배범·탐험…)'], ['story', '📖 성장 스토리', '달마다 대표 사진과 키·몸무게, 최초 목격'], ['d100', '💯 100일의 기록', '태어나서 100일까지 사진으로'], ['pose', '📷 같은 포즈 타임랩스', '월별 증거 사진이 스르륵 자라요'], ['month', '🗓 이번 달 하이라이트', '이번 달에 찍은 사진 모음']];
const XF = .6;   // 장면 사이 겹쳐 바뀌는 시간(초)
const STK = ['💖', '⭐', '🍼', '🧸', '🌸', '🎈', '✨', '🐿️', '🌰', '🎀', '🌙', '💯'];
const LAYS = { story: ['pola', 'full', 'board', 'film'], d100: ['full', 'pola', 'film', 'pola'], month: ['pola', 'full', 'pola', 'film'] };
const A = { bg: {}, emo: {}, ch: {}, room: null, roomAR: .7, W: 720, H: 1280 };
const isSq = () => M.sq && M.tpl !== 'recap';

// ---------- 장면 만들기 ----------
function pool() { return CV.photos().filter(p => p.type !== 'rec' && p.type !== 'report'); }
const firstsIn = (a, b) => (S.moments || []).filter(m => (m.type === 'first' || !m.type) && m.date >= a && m.date < b).map(m => m.title).filter(Boolean);
const even = (L, n) => L.length <= n ? L : Array.from({ length: n }, (_, i) => L[Math.round(i * (L.length - 1) / (n - 1))]);
const asc = L => L.slice().sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
const baseName = () => ((S.profile && S.profile.name) || '우리 아기').replace(/^[가-힣](?=[가-힣]{2}$)/, '');
function scenes() {
  const out = [];
  if (M.tpl === 'recap') recap(out); else classic(out);
  let t0 = 0; out.forEach(s => { s.t0 = t0; t0 += s.dur - XF; });
  return out;
}
function classic(out) {
  const b = S.profile.birth, t = today(), nick = CV.nick(), P = pool();
  let j = 0;
  const photo = (p, l1, l2, l3, l4, k = 'photo') => {
    const lay = k === 'pose' ? 'pose' : (M.tpl === 'story' && l4 && l4.startsWith('✨')) ? 'board' : LAYS[M.tpl][j % 4];
    out.push({ k, lay, src: safeImg(PHOTOS[p.id]), l1, l2, l3, l4, date: p.date, no: j + 1, rot: [-3, 2.5, -1.5, 3][j % 4], st: [STK[(j * 5 + 1) % STK.length], STK[(j * 7 + 4) % STK.length]], bgk: j % 2 ? 'kraft' : 'gingham', ico: '📷', dur: k === 'pose' ? 1.3 : M.speed + (lay === 'pola' || lay === 'board' ? .4 : 0) });
    j++;
  };
  const cover = safeImg(PHOTOS.profile) || (P[P.length - 1] && safeImg(PHOTOS[P[P.length - 1].id])) || '';
  const fam = P.find(p => p.type === 'fam') || P[0];
  const title = (main, sub, short) => out.push({ k: 'title', main, sub, src: cover, dur: short ? 2.6 : 3.4, ico: '🎬' });
  const end = (main, sub) => out.push({ k: 'end', main, sub, src: fam ? safeImg(PHOTOS[fam.id]) : cover, dur: 4, ico: '🏠' });
  if (M.tpl === 'story') {
    title(`${nick} 성장 수사 일지`, `${CV.dot(b)} 태어남 · 오늘 생후 ${dayNo(t)}일`);
    const [mo] = monthsDays(b, t);
    for (let i = 0; i <= Math.min(mo, 36); i++) {
      const from = addMonths(b, i), to = addMonths(b, i + 1), slot = i ? S.moments.find(m => m.type === 'month' && m.title === i + '개월' && safeImg(PHOTOS[m.id])) : null;
      const inR = asc(P.filter(p => p.date >= from && p.date < to && p.type !== 'month' && p.type !== 'profile'));
      const p = slot ? { id: slot.id, date: slot.date } : inR.find(x => x.type === 'first') || inR.find(x => x.type === 'fam') || inR[Math.floor(inR.length / 2)] || (i === 0 && safeImg(PHOTOS.profile) ? { id: 'profile', date: b } : null);
      if (!p) continue;
      const f = firstsIn(from, to);
      photo(p, i ? `${i}개월` : '태어난 달', `생후 ${dayNo(p.date)}일 · ${CV.dot(p.date)}`, CV.stats(p.date), f.length ? '✨ ' + f.slice(0, 3).join(' · ') : '');
    }
    const R = asc((S.records || []).filter(r => r.weight != null && r.weight !== '')), w0 = R[0], w1 = R[R.length - 1];
    end(`오늘 생후 ${dayNo(t)}일`, w0 && w1 && w0 !== w1 ? `몸무게 ${fmt('weight', w0.weight)}kg → ${fmt('weight', w1.weight)}kg` : '건강하게 자라는 중');
  } else if (M.tpl === 'd100') {
    const e = addDays(b, 99), last = t < e ? t : e;
    title(`${nick}의 100일`, `${CV.dot(b)} ~ ${CV.dot(e)}`);
    even(asc(P.filter(p => p.date >= b && p.date <= last && p.type !== 'profile')), 18).forEach(p => { const f = firstsIn(p.date, addDays(p.date, 1)); photo(p, `생후 ${dayNo(p.date)}일`, CV.dot(p.date), f.length ? '✨ ' + f.join(' · ') : '', ''); });
    end(t >= e ? '100일 축하해! 🎉' : `100일까지 D-${daysBetween(t, e)}`, '엄마 수사관 · 아빠 수사관이 함께 기록했어요');
  } else if (M.tpl === 'pose') {
    title('같은 포즈 타임랩스', `${nick} · 매달 같은 자리에서`, true);
    (S.moments || []).filter(m => m.type === 'month' && safeImg(PHOTOS[m.id])).sort((x, y) => parseInt(x.title) - parseInt(y.title)).forEach(m => photo({ id: m.id, date: m.date }, m.title, `생후 ${dayNo(m.date)}일`, '', '', 'pose'));
    end(`지금 생후 ${dayNo(t)}일`, '다음 달에도 같은 자리에서 📷');
  } else {
    const m0 = t.slice(0, 7) + '-01';
    title(`${nick}의 ${+t.slice(5, 7)}월`, '이번 달 수사 하이라이트', true);
    even(asc(P.filter(p => p.date >= m0 && p.type !== 'profile')), 20).forEach(p => photo(p, fmtK(p.date, true), `생후 ${dayNo(p.date)}일`, CV.stats(p.date), ''));
    end(`${+t.slice(5, 7)}월 수사 끝!`, '다음 달에 또 만나요');
  }
}
// 수사 일지 총정리: 기록이 있는 장면만
function recap(out) {
  const b = S.profile.birth, t = today(), base = baseName(), P = pool(), [mo, rd] = monthsDays(b, t);
  out.push({ k: 'rOpen', dur: 4.6, ico: '🎬', lab: '오프닝', base, days: dayNo(t) });
  const month1 = (S.moments || []).find(m => m.type === 'month' && safeImg(PHOTOS[m.id]));
  const prof = safeImg(PHOTOS.profile) ? 'profile' : (month1 || P[P.length - 1] || {}).id;
  out.push({ k: 'rProfile', dur: 4.4, ico: '🪪', lab: '프로필', src: prof ? safeImg(PHOTOS[prof]) : '', lines: [`이름  ${S.profile.name || base}`, `생일  ${CV.dot(b)}`, `수사 ${dayNo(t)}일째 · ${mo}개월 ${rd}일`] });
  const WR = asc((S.records || []).filter(r => r.weight != null && r.weight !== '')), HR = asc((S.records || []).filter(r => r.height != null && r.height !== ''));
  if (WR.length >= 2) out.push({ k: 'rGrowth', dur: 5.6, ico: '📈', lab: '성장 그래프', pts: WR.map(r => [daysBetween(b, r.date), +r.weight]), h: HR.length >= 2 ? [+HR[0].height, +HR[HR.length - 1].height] : null });
  const F = asc((S.moments || []).filter(m => m.type === 'first' || !m.type));
  if (F.length) { const L = F.slice(-5); out.push({ k: 'rFirsts', dur: 1.9 + .85 * L.length, ico: '👀', lab: '최초 목격', n: F.length, items: L.map(m => ({ t: m.title, d: m.date, by: m.by, src: m.photo ? safeImg(PHOTOS[m.id]) : '' })) }); }
  const MP = (S.moments || []).filter(m => m.type === 'month' && safeImg(PHOTOS[m.id])).sort((x, y) => parseInt(x.title) - parseInt(y.title));
  if (MP.length >= 2) { const L = even(MP, 9); out.push({ k: 'rBoard', dur: 2.1 + .42 * L.length, ico: '📌', lab: '월별 사진', items: L.map(m => ({ t: m.title, src: safeImg(PHOTOS[m.id]) })) }); }
  const V = (S.vaccines || []).filter(v => v.done).sort((x, y) => x.done < y.done ? -1 : x.done > y.done ? 1 : 0);
  if (V.length) out.push({ k: 'rVacc', dur: 2.4 + .32 * Math.min(7, V.length), ico: '💉', lab: '예방접종', n: V.length, items: V.slice(-7).map(v => ({ t: v.name, d: v.done })) });
  if (window.WANTED) { const C = []; for (let ws = WANTED.monday(b); ws <= t; ws = addDays(ws, 7)) { const x = WANTED.stat(ws); if (x.caught) C.push(x); } if (C.length) out.push({ k: 'rWanted', dur: 2.6 + .6 * Math.min(4, C.length), ico: '🚨', lab: '수배범', n: C.length, items: C.slice(-4).map(x => ({ e: x.v[4], t: x.v[3], d: x.caught })) }); }
  if (window.LOOK) { const VV = LOOK.votes(); if (VV.length >= 2) { const c = { mom: 0, dad: 0, both: 0 }; VV.forEach(x => c[x.pick]++); const n = VV.length, pm = Math.round(c.mom / n * 100), pdd = Math.round(c.dad / n * 100); out.push({ k: 'rLook', dur: 4.8, ico: '🔍', lab: '닮은꼴', n, c, pm, pd: pdd, pb: 100 - pm - pdd, title: pm === pdd ? '반반 공동 소유' : `${pm > pdd ? '엄마' : '아빠'} ${Math.abs(pm - pdd) >= 30 ? '판박이' : '우세'}` }); } }
  if (window.EXPLORE) { const PL = EXPLORE.places(); if (PL.length) { const gw = new Set(); PL.forEach(p => { const r = EXPLORE.regionOf(p); if (r && r.g && /강원/.test(r.s || '')) gw.add(r.g); }); out.push({ k: 'rMap', dur: 5.6, ico: '🗺️', lab: '탐험 지도', n: PL.filter(p => !p.home).length, gw: gw.size, pts: PL.slice().sort((x, y) => x.first < y.first ? -1 : 1).map(p => { const l = EXPLORE.label(p); return { lat: p.c.lat, lng: p.c.lng, home: !!p.home, label: p.home ? '우리 집' : l === '이름 모를 곳' ? `${fmtMD(p.first)} 탐험` : l }; }) }); } }
  const ALL = [S.records, S.moments, S.meals, S.foods, S.visits, S.logs, S.devs, S.guesses, S.looks, S.capsules];
  const recBy = r => { let n = 0; ALL.forEach(L => (L || []).forEach(o => { if (o.by === r) n++; })); (S.vaccines || []).forEach(v => { if (v.done && v.by === r) n++; }); return n; };
  const phBy = r => (S.moments || []).filter(m => m.photo && m.by === r).length + (S.records || []).filter(x => x.photo && x.by === r).length;
  const rk = r => (window.GAME && GAME.rank) ? GAME.rank(r) : { name: '순경', lv: 1 };
  const days = new Set([...(S.records || []).map(r => r.date), ...(S.moments || []).map(m => m.date), ...(S.meals || []).map(m => m.date), ...(S.vaccines || []).filter(v => v.done).map(v => v.done)].filter(Boolean)).size;
  const photos = (S.moments || []).filter(m => m.photo).length + (S.records || []).filter(r => r.photo).length;
  out.push({ k: 'rTeam', dur: 5, ico: '🕵️', lab: '수사관', mom: { r: rk('엄마'), n: recBy('엄마'), ph: phBy('엄마') }, dad: { r: rk('아빠'), n: recBy('아빠'), ph: phBy('아빠') }, photos, days, acorn: Math.max(0, +((S.game && S.game.acorn) || 0)) });
  const CP = (S.capsules || []).filter(c => c.open > t).sort((x, y) => x.open < y.open ? -1 : 1);
  if (CP.length) out.push({ k: 'rCapsule', dur: 4.4, ico: '🔒', lab: '봉인 편지', n: CP.length, next: CP[0], opened: (S.capsules || []).filter(c => c.open <= t).length });
  const MT = even(asc(P.filter(p => p.type !== 'profile' && p.type !== 'month')), 12);
  if (MT.length >= 3) out.push({ k: 'rMontage', dur: 2.4 + .3 * MT.length, ico: '📷', lab: '사진 몽타주', n: photos, items: MT.map(p => ({ src: safeImg(PHOTOS[p.id]), d: p.date })) });
  out.push({ k: 'rEnd', dur: 8, ico: '🏠', lab: '엔딩', credits: [['🎬 주연', `${base} 탐정`], ['🕵️ 수사', '엄마 수사관 · 아빠 수사관'], ['📷 증거 사진', `${photos}장`], ['📝 수사 기록', `${recBy('엄마') + recBy('아빠')}건`], ['🗓️ 수사 기간', `${CV.dot(b)} ~ ${CV.dot(t)} (${dayNo(t)}일)`]] });
}
const total = sc => sc.length ? sc[sc.length - 1].t0 + sc[sc.length - 1].dur : 0;

// ---------- 그림 도구 ----------
const clamp = x => x < 0 ? 0 : x > 1 ? 1 : x;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const back = x => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };   // 살짝 튀어나왔다 자리 잡기
const fin = (lt, at, d = .45) => ease((lt - at) / d);
const pop = (lt, at, d = .45) => lt < at ? 0 : back((lt - at) / d);
function bgDraw(ctx, k) { const c = A.bg[k]; if (c) ctx.drawImage(c, 0, 0); else { ctx.fillStyle = '#EAD7B7'; ctx.fillRect(0, 0, A.W, A.H); } }
function emo(e) {
  if (A.emo[e]) return A.emo[e];
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.fillText(e, 64, 70);
  return (A.emo[e] = c);
}
function sticker(ctx, e, x, y, s, rot = 0, sc = 1) { if (sc <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180); ctx.scale(sc, sc); ctx.drawImage(emo(e), -s / 2, -s / 2, s, s); ctx.restore(); }
function chr(ctx, k, x, y, s, lt, ph = 0) { const im = A.ch[k]; if (im) ctx.drawImage(im, x, y + Math.sin(lt * 5 + ph) * s * .03, s, s); }
function txt(ctx, t, x, y, size, color, align = 'center', maxW = 0, face = 'Jua') { CV.text(ctx, t, x, y, `${Math.round(size)}px ${face === 'Jua' ? 'Jua' : '"Gowun Dodum"'}`, color, align, maxW); }
function fade(ctx, a, fn) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= Math.min(1, a); fn(); ctx.restore(); }
function scaleAt(ctx, x, y, sc, fn) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y); fn(); ctx.restore(); }
// 폴라로이드 (아래 여백에 손글씨)
function pola(ctx, img, cx, cy, w, h, rot, cap, z = 1, capSize) {
  const m = w * .055, bot = w * .2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180);
  ctx.shadowColor = 'rgba(40,25,10,.35)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#FFFDF8'; ctx.fillRect(-w / 2 - m, -h / 2 - m, w + 2 * m, h + m + bot);
  ctx.shadowColor = 'transparent';
  if (img) CV.cover(ctx, img, -w / 2, -h / 2, w, h, z, .5, .4); else { ctx.fillStyle = '#EDE3CC'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.drawImage(emo('🐿️'), -w * .2, -w * .2, w * .4, w * .4); }
  if (cap) CV.text(ctx, cap, 0, h / 2 + bot * .68, `${Math.round(capSize || w * .085)}px Jua`, '#3A3330', 'center', w);
  ctx.restore();
}
// 메모 카드 (줄 공책)
function card(ctx, x, y, w, h, rot, lines, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= Math.min(1, a); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot * Math.PI / 180); ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = 'rgba(40,25,10,.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; ctx.fillStyle = '#FFFDF7'; ctx.fillRect(0, 0, w, h); ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(179,38,30,.5)'; ctx.fillRect(0, 30, w, 2); ctx.fillStyle = 'rgba(63,111,168,.16)'; for (let yy = 30 + 46; yy < h - 6; yy += 46) ctx.fillRect(0, yy, w, 1.5);
  lines.forEach((l, i) => { const [t, f, c] = Array.isArray(l) ? l : [l]; CV.text(ctx, t, 22, 66 + i * 46, f || '29px "Gowun Dodum"', c || '#2B2622', 'left', w - 44); });
  ctx.restore();
}
function doodle(ctx, kind, x, y, s, c, rot = 0, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= Math.min(1, a); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = c; ctx.lineWidth = Math.max(3, s * .1); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  if (kind === 'star') { for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .22 : s * .5, an = -Math.PI / 2 + i * Math.PI / 5; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); }
  else if (kind === 'heart') { ctx.moveTo(0, s * .35); ctx.bezierCurveTo(-s * .55, 0, -s * .3, -s * .45, 0, -s * .15); ctx.bezierCurveTo(s * .3, -s * .45, s * .55, 0, 0, s * .35); }
  else if (kind === 'spark') { for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; ctx.moveTo(Math.cos(an) * s * .15, Math.sin(an) * s * .15); ctx.lineTo(Math.cos(an) * s * .5, Math.sin(an) * s * .5); } }
  else { for (let i = 0; i <= 30; i++) { const an = i * .45, r = s * .05 + i * s * .016; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * r, Math.sin(an) * r); } }
  ctx.stroke(); ctx.restore();
}
function pin(ctx, x, y, c = '#D33A2C') { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.arc(x + 3, y + 5, 11, 0, 7); ctx.fill(); const g = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 12); g.addColorStop(0, '#FF9A8A'); g.addColorStop(1, c); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); ctx.restore(); }
function thread(ctx, x1, y1, x2, y2, p = 1) {
  if (p <= 0) return; const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + 40;
  ctx.save(); ctx.strokeStyle = '#C8282C'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let i = 1; i <= 20; i++) { const t = clamp(p) * i / 20, u = 1 - t; ctx.lineTo(u * u * x1 + 2 * u * t * mx + t * t * x2, u * u * y1 + 2 * u * t * my + t * t * y2); }
  ctx.stroke(); ctx.restore();
}
// 도장이 쾅 (크게 → 제자리)
function slam(ctx, cx, cy, r, top, big, rot, lt, at) { const p = (lt - at) / .3; if (p < 0) return; const sc = p >= 1 ? 1 : 2.4 - 1.4 * ease(p); ctx.save(); ctx.globalAlpha *= Math.min(1, p * 1.6); ctx.translate(cx, cy); ctx.scale(sc, sc); CV.stamp(ctx, 0, 0, r, top, big, rot); ctx.restore(); }
function miniStamp(ctx, cx, cy, t, rot, lt, at, size = 40) {
  const p = (lt - at) / .28; if (p < 0) return; const sc = p >= 1 ? 1 : 2.2 - 1.2 * ease(p);
  ctx.save(); ctx.globalAlpha *= Math.min(1, p * 1.6) * .92; ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180); ctx.scale(sc, sc);
  ctx.font = `${size}px Jua`; const w = ctx.measureText(t).width + size * .8, h = size * 1.35;
  ctx.strokeStyle = '#B3261E'; ctx.lineWidth = size * .09; CV.rr(ctx, -w / 2, -h / 2, w, h, size * .22); ctx.stroke(); ctx.lineWidth = size * .04; CV.rr(ctx, -w / 2 + size * .14, -h / 2 + size * .14, w - size * .28, h - size * .28, size * .16); ctx.stroke();
  ctx.fillStyle = '#B3261E'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, 0, size * .05); ctx.restore();
}
function poster(ctx, cx, cy, w, h, rot, e, name, sub, sc = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180); ctx.scale(sc, sc);
  ctx.shadowColor = 'rgba(40,20,0,.35)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8; ctx.fillStyle = '#F3E3BF'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#C9A86A'; ctx.lineWidth = 4; ctx.strokeRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18);
  CV.text(ctx, 'WANTED', 0, -h / 2 + 62, `${Math.round(w * .17)}px Jua`, '#6B3A1E', 'center', w - 30);
  ctx.drawImage(emo(e), -w * .25, -h * .06 - w * .25, w * .5, w * .5);
  CV.text(ctx, name, 0, h / 2 - 66, `${Math.round(w * .1)}px Jua`, '#1F2A44', 'center', w - 30);
  if (sub) CV.text(ctx, sub, 0, h / 2 - 28, `${Math.round(w * .075)}px "Gowun Dodum"`, '#6B3A1E', 'center', w - 30);
  ctx.restore();
}
function envelope(ctx, cx, cy, w, h, rot) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180);
  ctx.shadowColor = 'rgba(80,50,20,.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; ctx.fillStyle = '#F6E7C8'; CV.rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#EAD3A6'; ctx.beginPath(); ctx.moveTo(-w / 2 + 4, -h / 2 + 4); ctx.lineTo(0, h * .1); ctx.lineTo(w / 2 - 4, -h / 2 + 4); ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(-8, h * .06, 4, 0, h * .1, 40); g.addColorStop(0, '#D44A40'); g.addColorStop(1, '#9E1F18'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, h * .1, 36, 0, 7); ctx.fill();
  ctx.drawImage(emo('🔒'), -20, h * .1 - 20, 40, 40); ctx.restore();
}
// 총정리 장면 머리 (분홍 알약 + 노란 밑줄 제목)
function heading(ctx, W, tag, title, lt, dark) {
  const a = fin(lt, .05, .45), dy = (1 - a) * -30;
  fade(ctx, a, () => {
    ctx.font = '26px Jua'; const tw = ctx.measureText(tag).width + 40;
    ctx.fillStyle = dark ? 'rgba(255,253,247,.94)' : '#F8D8D1'; CV.rr(ctx, W / 2 - tw / 2, 88 + dy, tw, 48, 24); ctx.fill();
    txt(ctx, tag, W / 2, 122 + dy, 26, '#1F2A44');
    ctx.font = '62px Jua'; const w = Math.min(W - 80, ctx.measureText(title).width);
    ctx.fillStyle = dark ? 'rgba(252,232,180,.45)' : '#FCE8B4'; ctx.fillRect(W / 2 - w / 2 - 12, 192 + dy, w + 24, 24);
    if (dark) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 8; txt(ctx, title, W / 2, 210 + dy, 62, '#FFFDF7', 'center', W - 80); ctx.restore(); }
    else txt(ctx, title, W / 2, 210 + dy, 62, '#1F2A44', 'center', W - 80);
  });
}

// ---------- 꾸민 사진 장면 ----------
function drawPhoto(ctx, W, H, s, lt, i) {
  const p = lt / s.dur, port = H > W * 1.3;
  let lay = s.lay;
  if (!s.img && (lay === 'full' || lay === 'pose')) lay = 'pola';
  if (!port && (lay === 'board' || lay === 'film')) lay = 'pola';
  if (lay === 'pose') {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); CV.cover(ctx, s.img, 0, 0, W, H, 1, .5, .45);
    CV.rr(ctx, W - 250, 40, 210, 92, 46); ctx.fillStyle = 'rgba(31,42,68,.85)'; ctx.fill(); txt(ctx, s.l1, W - 145, 104, 56, '#FCE8B4');
    txt(ctx, s.l2, W - 145, 172, 28, '#fff', 'center', 0, 'g');
    return;
  }
  if (lay === 'full') {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
    const z = 1.04 + .09 * p, fx = i % 2 ? .35 + .3 * p : .65 - .3 * p; CV.cover(ctx, s.img, 0, 0, W, H, z, fx, .45);
    ctx.save(); ctx.strokeStyle = 'rgba(255,253,247,.85)'; ctx.lineWidth = 8; CV.rr(ctx, 18, 18, W - 36, H - 36, 26); ctx.stroke(); ctx.restore();
    const g = ctx.createLinearGradient(0, H * .5, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,14,28,.82)'); ctx.fillStyle = g; ctx.fillRect(0, H * .5, W, H * .5);
    const up = ease(lt / .7), lines = [s.l2, s.l3, s.l4].filter(Boolean);
    fade(ctx, up, () => { let y = H - 76 - lines.length * 46 + (1 - up) * 40; txt(ctx, s.l1, 50, y, W > 800 ? 84 : 72, '#FCE8B4', 'left', W - 100); y += 54; lines.forEach((l, j) => txt(ctx, l, 50, y + j * 46, l.startsWith('✨') ? 32 : 30, l.startsWith('✨') ? '#F6B4AA' : '#fff', 'left', W - 100, l.startsWith('✨') ? 'Jua' : 'g')); });
    CV.rr(ctx, 34, 40, 300, 50, 25); ctx.fillStyle = 'rgba(255,253,247,.88)'; ctx.fill(); txt(ctx, `🔍 사건 파일 No.${fileNo()}`, 184, 74, 24, '#1F2A44', 'center', 0, 'g');
    sticker(ctx, s.st[0], W - 96, 112, 96, 12, pop(lt, .35));
    doodle(ctx, 'spark', W - 170, 76, 40, '#FFFFFF', 0, fin(lt, .6));
    return;
  }
  if (lay === 'pola') {
    bgDraw(ctx, s.bgk);
    const pw = port ? W * .7 : H * .5, ph = pw * 1.1, cy = port ? H * .4 : H * .41, e = pop(lt, .05, .55), sc = 1.12 - .12 * clamp(e);
    fade(ctx, e * 1.6, () => scaleAt(ctx, W / 2, cy, sc, () => pola(ctx, s.img, W / 2, cy, pw, ph, s.rot, s.l1, 1.02 + .05 * p)));
    if (e > .6) CV.tape(ctx, W / 2, cy - ph / 2 - pw * .055 - 4, pw * .4, 46, -3 + s.rot);
    sticker(ctx, s.st[0], W / 2 + pw / 2 - 6, cy - ph / 2 + 18, port ? 104 : 80, 14, pop(lt, .5));
    sticker(ctx, s.st[1], W / 2 - pw / 2 + 10, cy + ph / 2 - 30, port ? 92 : 70, -12, pop(lt, .7));
    doodle(ctx, 'star', W / 2 - pw / 2 - 44, cy - ph / 2 + 30, 44, '#F4C542', .2, fin(lt, .8));
    doodle(ctx, 'heart', W / 2 + pw / 2 + 36, cy + ph / 4, 40, '#E07A9A', -.2, fin(lt, 1));
    const lines = (port ? [s.l2, s.l3, s.l4] : [s.l2]).filter(Boolean);
    if (lines.length) { const cw = port ? W - 120 : W - 80, chh = 34 + lines.length * 46, y = port ? cy + ph / 2 + pw * .2 + 50 : H - chh - 14, ce = fin(lt, .55, .5); card(ctx, W / 2 - cw / 2, y + (1 - ce) * 60, cw, chh, 1.2, lines.map(l => [l, l.startsWith('✨') ? '30px Jua' : '29px "Gowun Dodum"', l.startsWith('✨') ? '#B3261E' : '#2B2622']), ce); }
    return;
  }
  if (lay === 'board') {
    bgDraw(ctx, 'cork');
    const w = W * .62, h = w * 1.12, x = W / 2 - w / 2 - 14, y = 170, e = pop(lt, .05, .5);
    fade(ctx, e * 1.5, () => scaleAt(ctx, x + w / 2, y + h / 2, 1.1 - .1 * clamp(e), () => {
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-2 * Math.PI / 180); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; ctx.fillStyle = '#FFFDF8'; ctx.fillRect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 24); ctx.shadowColor = 'transparent';
      if (s.img) CV.cover(ctx, s.img, -w / 2, -h / 2, w, h, 1.02 + .05 * p, .5, .4); else { ctx.fillStyle = '#EDE3CC'; ctx.fillRect(-w / 2, -h / 2, w, h); }
      ctx.restore();
    }));
    fade(ctx, fin(lt, .35), () => { ctx.save(); ctx.translate(x + 36, y + 70); ctx.rotate(-.18); ctx.fillStyle = '#FCE8B4'; ctx.fillRect(-64, -24, 150, 48); txt(ctx, `증거물 #${s.no}`, 11, 9, 26, '#5C3A12'); ctx.restore(); });
    pin(ctx, x + w / 2, y - 4);
    const lines = [s.l1, s.l2, s.l3, s.l4].filter(Boolean), cx = 70, cyy = y + h + 56, cw = W - 140, chh = 34 + lines.length * 46, ce = fin(lt, .6, .5);
    if (ce > 0) { pin(ctx, x + 34, y + h - 10, '#2E6CC8'); thread(ctx, x + 34, y + h - 10, cx + 30, cyy + 12, fin(lt, .9, .5)); card(ctx, cx, cyy + (1 - ce) * 50, cw, chh, 2, lines.map((l, j) => [l, j === 0 ? '36px Jua' : l.startsWith('✨') ? '29px Jua' : '28px "Gowun Dodum"', j === 0 ? '#1F2A44' : l.startsWith('✨') ? '#B3261E' : '#2B2622']), ce); pin(ctx, cx + 30, cyy + 12, '#2E6CC8'); }
    chr(ctx, 'babyLens', W - 250, H - 270, 230, lt);
    sticker(ctx, '🔍', 90, H - 120, 80, -14, pop(lt, 1.1));
    return;
  }
  // 필름
  bgDraw(ctx, 'dark');
  const sx = 40, sw = W - 80, sy = 170, sh = sw * 1.12, e = fin(lt, 0, .5);
  fade(ctx, e, () => {
    ctx.fillStyle = '#0A0A0E'; ctx.fillRect(sx, sy, sw, sh);
    for (let yy = sy + 14; yy < sy + sh - 20; yy += 46) { ctx.fillStyle = '#E8E2D0'; CV.rr(ctx, sx + 12, yy, 24, 30, 5); ctx.fill(); CV.rr(ctx, sx + sw - 36, yy, 24, 30, 5); ctx.fill(); }
    const px = sx + 54, pw = sw - 108, py = sy + 26, ph = sh - 52;
    if (s.img) CV.cover(ctx, s.img, px, py, pw, ph, 1.03 + .06 * p, .5, .4); else { ctx.fillStyle = '#2A2A33'; ctx.fillRect(px, py, pw, ph); }
    if (s.date) { ctx.save(); ctx.shadowColor = 'rgba(255,140,40,.8)'; ctx.shadowBlur = 8; txt(ctx, `'${s.date.slice(2, 4)} ${s.date.slice(5, 7)} ${s.date.slice(8)}`, px + pw - 20, py + ph - 24, 34, '#FF9A3C', 'right'); ctx.restore(); }
    txt(ctx, `${s.no}A`, sx + 70, sy - 10, 24, '#FF9A3C', 'left');
  });
  const up = fin(lt, .3, .5), lines = [s.l2, s.l3, s.l4].filter(Boolean);
  fade(ctx, up, () => { const y = sy + sh + 90 + (1 - up) * 30; txt(ctx, s.l1, W / 2, y, 70, '#FCE8B4', 'center', W - 80); lines.forEach((l, j) => txt(ctx, l, W / 2, y + 54 + j * 44, l.startsWith('✨') ? 30 : 29, l.startsWith('✨') ? '#F6B4AA' : '#FFFFFF', 'center', W - 80, l.startsWith('✨') ? 'Jua' : 'g')); });
}
function drawTitle(ctx, W, H, s, lt) {
  bgDraw(ctx, 'kraft');
  const isEnd = s.k === 'end', up = ease(lt / .7), p = lt / s.dur, port = H > W * 1.3, pw = port ? W * .62 : H * .44, ph = pw * 1.18, cy = H * (isEnd ? .36 : .4);
  if (s.img) { const e = pop(lt, 0, .6); fade(ctx, e * 1.5, () => scaleAt(ctx, W / 2, cy, 1.1 - .1 * clamp(e), () => pola(ctx, s.img, W / 2, cy, pw, ph, isEnd ? 2.5 : -2.5, '', 1 + .05 * p))); CV.tape(ctx, W / 2, cy - ph / 2 - 20, 190, 50, -4); }
  fade(ctx, up, () => { const ty = cy + ph / 2 + pw * .2 + (port ? 110 : 60) + (1 - up) * 30; txt(ctx, s.main, W / 2, ty, W > 800 ? 80 : port ? 68 : 54, '#1F2A44', 'center', W - 80); txt(ctx, s.sub, W / 2, ty + (port ? 58 : 44), port ? 32 : 26, '#6B5F52', 'center', W - 80, 'g'); });
  slam(ctx, W - 120, 120, 78, isEnd ? '수사 중' : '수사 개시', isEnd ? 'To be continued' : `No.${fileNo()}`, -12, lt, .5);
  sticker(ctx, isEnd ? '💖' : '✨', 90, cy - ph / 2, 80, -12, pop(lt, .8));
  doodle(ctx, 'star', W - 90, cy + ph / 3, 46, '#F4C542', .3, fin(lt, 1));
  const k = isEnd ? ['mom', 'babyLens', 'dad'] : ['babyLens'], sz = port ? (isEnd ? 150 : 180) : 120;
  k.forEach((w, j) => chr(ctx, w, isEnd ? W / 2 + (j - 1) * (sz * .9) - sz / 2 : 30, H - sz - 26, sz, lt, j));
}

// ---------- 총정리 장면 ----------
const RC = {
  rOpen(ctx, W, H, s, lt) {
    bgDraw(ctx, 'kraft');
    const e = fin(lt, 0, .5), fy = 250 + (1 - e) * 60;
    fade(ctx, e, () => {
      ctx.fillStyle = '#C99A55'; CV.rr(ctx, 70, fy - 46, 250, 70, 16); ctx.fill();
      ctx.save(); ctx.shadowColor = 'rgba(60,35,10,.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; ctx.fillStyle = '#E2BD78'; CV.rr(ctx, 56, fy, W - 112, 530, 24); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#EBCB8E'; CV.rr(ctx, 56, fy + 26, W - 112, 504, 24); ctx.fill();
      txt(ctx, `CASE FILE No.${fileNo()}`, 195, fy - 2, 26, '#5C3A12');
    });
    const ty = (str, a, b) => { const L = Array.from(str); return L.slice(0, Math.round(L.length * clamp((lt - a) / (b - a)))).join(''); };
    txt(ctx, ty(`${s.base} 탐정`, .5, 1.3), W / 2, fy + 196, 104, '#1F2A44', 'center', W - 160);
    txt(ctx, ty('수사 일지', 1.3, 1.9), W / 2, fy + 320, 104, '#B3261E', 'center', W - 160);
    fade(ctx, fin(lt, 1.9, .5), () => txt(ctx, `총정리 · 수사 ${s.days}일째`, W / 2, fy + 420, 38, '#5C3A12', 'center', 0, 'g'));
    slam(ctx, W - 150, fy + 40, 80, '수사 기록', '총정리', -14, lt, 2.4);
    const wx = -320 + (W / 2 - 150 + 320) * ease((lt - .2) / 1.3);
    chr(ctx, 'babyLens', wx, 875, 300, lt);
    if (lt > 1.6 && lt < 2.4) doodle(ctx, 'spark', wx + 255, 930, 64, '#FFFFFF', 0, 1 - Math.abs(lt - 2) / .4);
    sticker(ctx, '🔍', 110, 860, 92, -12, pop(lt, .8));
    sticker(ctx, '✨', W - 110, 1010, 82, 10, pop(lt, 1.2));
    fade(ctx, fin(lt, 2.7, .5), () => txt(ctx, '엄마 수사관 · 아빠 수사관의 기록', W / 2, H - 64, 30, '#5C3A12'));
  },
  rProfile(ctx, W, H, s, lt) {
    bgDraw(ctx, 'gingham'); heading(ctx, W, '수사 대상', '프로필', lt);
    const e = pop(lt, .3, .6), cy = 560 - (1 - clamp(e)) * 120;
    fade(ctx, e * 1.4, () => { pola(ctx, s.img, W / 2, cy, 420, 470, -3, '', 1 + .04 * lt / s.dur); CV.tape(ctx, W / 2, cy - 235 - 26, 180, 48, -4); });
    const ce = fin(lt, .9, .5);
    card(ctx, 70, 930 + (1 - ce) * 80, W - 140, 34 + 3 * 46 + 10, 1.5, s.lines.map((l, j) => [l, j ? '30px "Gowun Dodum"' : '34px Jua', j ? '#2B2622' : '#1F2A44']), ce);
    sticker(ctx, '💖', W - 120, 330, 96, 12, pop(lt, 1.1));
    sticker(ctx, '⭐', 110, 820, 84, -10, pop(lt, 1.3));
    doodle(ctx, 'star', W - 95, 800, 46, '#F4C542', .3, fin(lt, 1.5));
  },
  rGrowth(ctx, W, H, s, lt) {
    bgDraw(ctx, 'grid'); heading(ctx, W, '성장 기록', '쑥쑥 자란 증거', lt);
    const x0 = 112, x1 = W - 70, y0 = 330, y1 = 850, P = s.pts, dmax = Math.max(30, P[P.length - 1][0]), ks = P.map(q => q[1]), kmin = Math.floor(Math.min(...ks) - .3), kmax = Math.ceil(Math.max(...ks) + .3);
    const X = d => x0 + (x1 - x0) * d / dmax, Y = k => y1 - (y1 - y0) * (k - kmin) / ((kmax - kmin) || 1);
    fade(ctx, fin(lt, .2, .4), () => {
      ctx.strokeStyle = '#1F2A44'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0 - 10); ctx.lineTo(x0, y1); ctx.lineTo(x1 + 10, y1); ctx.stroke();
      for (let k = kmin; k <= kmax; k++) { const y = Y(k); ctx.fillStyle = 'rgba(31,42,68,.12)'; ctx.fillRect(x0, y, x1 - x0, 1.5); txt(ctx, `${k}kg`, x0 - 14, y + 9, 24, '#6B5F52', 'right'); }
      const months = Math.floor(dmax / 30.44), st = Math.max(1, Math.ceil(months / 6)); for (let m = 0; m <= months; m += st) txt(ctx, m ? `${m}개월` : '출생', X(m * 30.44), y1 + 38, 22, '#6B5F52', 'center', 0, 'g');
    });
    const f = ease((lt - .6) / 2.6) * (P.length - 1), n = Math.min(P.length - 1, Math.floor(f)), fr = f - n;
    const at = j => [X(P[j][0]), Y(P[j][1])];
    ctx.save(); ctx.strokeStyle = '#B3261E'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let j = 0; j <= Math.min(n + 1, P.length - 1); j++) { let [x, y] = at(j); if (j === n + 1) { const [px, py] = at(n); x = px + (x - px) * fr; y = py + (y - py) * fr; } j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    for (let j = 0; j <= n; j++) { const [x, y] = at(j); ctx.save(); ctx.fillStyle = '#FFFDF7'; ctx.strokeStyle = '#B3261E'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
    const [ax, ay] = at(n), [bx, by] = at(Math.min(n + 1, P.length - 1)), tx = ax + (bx - ax) * fr, tyy = ay + (by - ay) * fr;
    chr(ctx, 'babyCam', Math.min(W - 150, Math.max(10, tx - 64)), tyy - 150, 132, lt);
    const w0 = P[0][1], w1 = P[P.length - 1][1], done = fin(lt, 3.2, .5);
    fade(ctx, fin(lt, .7, .4), () => txt(ctx, `${fmt('weight', w0)}kg`, X(P[0][0]) + 14, Y(w0) + 44, 28, '#6B5F52', 'left'));
    fade(ctx, done, () => { const [lx, ly] = at(P.length - 1); txt(ctx, `${fmt('weight', w1)}kg`, lx - 70, ly + 52, 36, '#B3261E', 'right'); });
    const c = ease((lt - 3.2) / 1), diff = (w1 - w0) * c;
    fade(ctx, fin(lt, 3.1, .4), () => {
      txt(ctx, `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}kg`, W / 2, 1010, 96, '#B3261E');
      txt(ctx, `몸무게 ${fmt('weight', w0)}kg → ${fmt('weight', w1)}kg`, W / 2, 1076, 32, '#1F2A44', 'center', W - 80, 'g');
      if (s.h) txt(ctx, `키 ${fmt('height', s.h[0])}cm → ${fmt('height', s.h[1])}cm`, W / 2, 1124, 30, '#6B5F52', 'center', W - 80, 'g');
    });
  },
  rFirsts(ctx, W, H, s, lt) {
    bgDraw(ctx, 'kraft'); heading(ctx, W, '최초 목격 기록', `${s.n}건 확보`, lt);
    const top = 300, gap = 172, L = s.items;
    fade(ctx, fin(lt, .3), () => { ctx.strokeStyle = 'rgba(31,42,68,.45)'; ctx.setLineDash([10, 10]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(96, top); ctx.lineTo(96, top + gap * L.length - 20); ctx.stroke(); ctx.setLineDash([]); });
    L.forEach((it, j) => {
      const at = .6 + j * .85, e = fin(lt, at, .45); if (e <= 0) return;
      const y = top + j * gap, x = 140 + (1 - e) * 160, w = W - 170, h = 148, tw = it.img ? w - 190 : w - 46;
      fade(ctx, e, () => {
        ctx.save(); ctx.shadowColor = 'rgba(40,25,10,.22)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5; ctx.fillStyle = '#FFFDF7'; CV.rr(ctx, x, y, w, h, 18); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#B3261E'; CV.rr(ctx, x, y, 10, h, 5); ctx.fill();
        txt(ctx, `${fmtK(it.d, true)} · 생후 ${dayNo(it.d)}일`, x + 30, y + 40, 24, '#6B5F52', 'left', tw, 'g');
        txt(ctx, it.t, x + 30, y + 90, 40, '#1F2A44', 'left', tw);
        if (it.by) txt(ctx, `목격: ${it.by} 수사관`, x + 30, y + 128, 24, '#B3261E', 'left', tw, 'g');
        if (it.img) { ctx.save(); ctx.translate(x + w - 82, y + h / 2); ctx.rotate(.05); ctx.fillStyle = '#fff'; ctx.fillRect(-64, -64, 128, 128); CV.cover(ctx, it.img, -58, -58, 116, 116); ctx.restore(); }
      });
      sticker(ctx, '👀', 96, y + h / 2, 56, 0, pop(lt, at, .4));
    });
  },
  rBoard(ctx, W, H, s, lt) {
    bgDraw(ctx, 'cork'); heading(ctx, W, '월별 증거 사진', `${s.items.length}장`, lt, true);
    const L = s.items, cols = 3, rows = Math.ceil(L.length / cols), cw = (W - 70) / cols, pw = L.length <= 3 ? 196 : L.length <= 6 ? 180 : 168, ph = pw * 1.11, y0 = L.length <= 3 ? 470 : L.length <= 6 ? 360 : 290, rh = Math.min(330, (H - 110 - y0) / rows);
    const pos = L.map((it, j) => { const c = j % cols, r = Math.floor(j / cols), n = Math.min(cols, L.length - r * cols); return [W / 2 + (c - (n - 1) / 2) * cw, y0 + r * rh + ph / 2 + 34, [-6, 4, -3, 5, -4, 3, -5, 6, -2][j % 9]]; });
    const vis = L.map((it, j) => pop(lt, .6 + j * .42, .45));
    L.forEach((it, j) => { const e = vis[j]; if (e <= 0) return; const [x, y, r] = pos[j]; fade(ctx, e * 1.5, () => scaleAt(ctx, x, y, 1.25 - .25 * clamp(e), () => pola(ctx, it.img, x, y, pw, ph, r, it.t, 1, 26))); });
    for (let j = 1; j < L.length; j++) if (vis[j] > 0) thread(ctx, pos[j - 1][0], pos[j - 1][1] - ph / 2 - 12, pos[j][0], pos[j][1] - ph / 2 - 12, fin(lt, .6 + j * .42 + .1, .35));
    L.forEach((it, j) => { if (vis[j] > 0) pin(ctx, pos[j][0], pos[j][1] - ph / 2 - 12); });
  },
  rVacc(ctx, W, H, s, lt) {
    bgDraw(ctx, 'kraft'); heading(ctx, W, '예방접종 작전', `${s.n}건 해결`, lt);
    const L = s.items, x = 60, y = 290, w = W - 120, rowH = 76, h = 120 + L.length * rowH, e = fin(lt, .3, .5);
    fade(ctx, e, () => {
      ctx.save(); ctx.translate(0, (1 - e) * 60);
      ctx.save(); ctx.shadowColor = 'rgba(40,25,10,.25)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6; ctx.fillStyle = '#FFFDF7'; ctx.fillRect(x, y, w, h); ctx.restore();
      txt(ctx, '예방접종 출동 기록부', W / 2, y + 62, 36, '#1F2A44');
      ctx.fillStyle = 'rgba(31,42,68,.5)'; ctx.fillRect(x + 30, y + 86, w - 60, 2);
      L.forEach((v, j) => { const ry = y + 120 + j * rowH; txt(ctx, v.t, x + 34, ry + 30, 29, '#2B2622', 'left', w - 250, 'g'); txt(ctx, CV.dot(v.d).slice(2), x + w - 150, ry + 30, 24, '#6B5F52', 'right', 0, 'g'); ctx.fillStyle = 'rgba(185,150,105,.35)'; ctx.fillRect(x + 30, ry + 50, w - 60, 1.5); });
      ctx.restore();
    });
    L.forEach((v, j) => miniStamp(ctx, x + w - 74, y + 120 + j * rowH + 20, '완료', -12, lt, .9 + j * .32, 26));
    slam(ctx, W - 160, Math.min(H - 180, y + h + 110), 92, '면역 요새', `${s.n}건`, -14, lt, 1.2 + L.length * .32);
    chr(ctx, 'babyShield', 36, H - 300, 250, lt);
  },
  rWanted(ctx, W, H, s, lt) {
    bgDraw(ctx, 'cork'); heading(ctx, W, '체포한 수배범', `${s.n}명`, lt, true);
    const L = s.items, n = L.length, pw = 290, ph = 390;
    const pos = n === 1 ? [[W / 2, 660]] : n === 2 ? [[W / 2 - 160, 660], [W / 2 + 160, 660]] : [[W / 2 - 160, 520], [W / 2 + 160, 520], [W / 2 - 160, 945], [W / 2 + 160, 945]];
    L.forEach((it, j) => { const at = .5 + j * .6, e = pop(lt, at, .45); if (e <= 0) return; const [x, y] = pos[j]; fade(ctx, e * 1.4, () => poster(ctx, x, y, pw, ph, [-4, 3, 2, -3][j], it.e, it.t, `${fmtMD(it.d)} 체포`, 1.2 - .2 * clamp(e))); pin(ctx, x, y - ph / 2 + 16); miniStamp(ctx, x + 50, y + 30, '체포', -16, lt, at + .45, 50); });
    if (s.n > n) fade(ctx, fin(lt, .5 + n * .6, .4), () => txt(ctx, `외 ${s.n - n}명 더 체포`, W / 2, H - 60, 34, '#FFFDF7'));
  },
  rLook(ctx, W, H, s, lt) {
    bgDraw(ctx, 'gingham'); heading(ctx, W, '닮은꼴 판결', `총 ${s.n}표`, lt);
    const e = clamp(pop(lt, .3, .5)), dy = (1 - e) * 40;
    fade(ctx, e, () => { chr(ctx, 'momF', 70, 320 + dy, 220, lt); chr(ctx, 'dadF', W - 290, 320 + dy, 220, lt, 1.5); txt(ctx, '엄마 수사관', 180, 584, 32, '#2B2622'); txt(ctx, '아빠 수사관', W - 180, 584, 32, '#2B2622'); });
    const g = ease((lt - .8) / 1.3), bw = W - 140, y = 640, h = 46, fr = [s.c.mom, s.c.both, s.c.dad], tot = fr.reduce((a, b) => a + b, 0) || 1, cols = ['#D9546A', '#CBC2B4', '#3F6FA8'];
    let x = W / 2 - bw * g / 2;
    fr.forEach((v, j) => { if (!v) return; const w = bw * g * v / tot - 2; if (w <= 1) return; ctx.fillStyle = cols[j]; CV.rr(ctx, x, y, w, h, 8); ctx.fill(); x += w + 2; });
    fade(ctx, fin(lt, 2, .4), () => {
      const sw = (cx, c) => { ctx.fillStyle = c; CV.rr(ctx, cx, y + 70, 22, 22, 5); ctx.fill(); };
      sw(70, cols[0]); txt(ctx, `엄마 닮음 ${s.pm}%`, 102, y + 90, 30, '#2B2622', 'left');
      sw(W - 70 - 22, cols[2]); txt(ctx, `아빠 닮음 ${s.pd}%`, W - 104, y + 90, 30, '#2B2622', 'right');
      if (s.pb) txt(ctx, `반반 ${s.pb}%`, W / 2, y + 140, 26, '#6B5F52', 'center', 0, 'g');
    });
    const ve = pop(lt, 2.4, .5); if (ve > 0) fade(ctx, ve, () => scaleAt(ctx, W / 2, 900, 1.3 - .3 * clamp(ve), () => txt(ctx, `판결: ${s.title}`, W / 2, 900, 64, '#1F2A44', 'center', W - 100)));
    slam(ctx, W - 140, 1040, 74, '닮은꼴 판정단', '판결', -12, lt, 2.9);
    chr(ctx, 'babyNote', 50, H - 300, 240, lt);
  },
  rMap(ctx, W, H, s, lt) {
    bgDraw(ctx, 'map'); heading(ctx, W, '탐험 지도', `${s.n}곳 탐험`, lt);
    const P = s.pts, box = [90, 320, W - 90, 880], la = P.map(p => p.lat), lo = P.map(p => p.lng);
    const lat0 = Math.min(...la), lat1 = Math.max(...la), lng0 = Math.min(...lo), lng1 = Math.max(...lo), k = Math.cos((lat0 + lat1) / 2 * Math.PI / 180);
    const sx = Math.max(.002, (lng1 - lng0) * k), sy = Math.max(.002, lat1 - lat0), sc = Math.min((box[2] - box[0]) / sx, (box[3] - box[1]) / sy) * .8;
    const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2, mla = (lat0 + lat1) / 2, mlo = (lng0 + lng1) / 2;
    const pts = P.map(p => [cx + (p.lng - mlo) * k * sc, cy - (p.lat - mla) * sc]);
    const f = ease((lt - .6) / 2.4) * Math.max(0, pts.length - 1), n = Math.min(pts.length - 1, Math.floor(f)), fr = f - n;
    if (pts.length > 1) { ctx.save(); ctx.strokeStyle = '#B3261E'; ctx.lineWidth = 5; ctx.setLineDash([16, 12]); ctx.lineCap = 'round'; ctx.beginPath(); for (let j = 0; j <= Math.min(n + 1, pts.length - 1); j++) { let [x, y] = pts[j]; if (j === n + 1) { const [px, py] = pts[n]; x = px + (x - px) * fr; y = py + (y - py) * fr; } j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore(); }
    P.forEach((p, j) => {
      if (j > f + .001) return; const [x, y] = pts[j], e = pop(lt, .6 + 2.4 * (P.length > 1 ? j / (P.length - 1) : 0), .35);
      if (p.home) sticker(ctx, '🏠', x, y, 60, 0, e); else { ctx.save(); ctx.strokeStyle = '#B3261E'; ctx.lineWidth = 7; ctx.lineCap = 'round'; const r = 14 * clamp(e); ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); ctx.restore(); }
      if (j < 8) fade(ctx, e, () => { ctx.font = '26px Jua'; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(246,234,205,.95)'; ctx.strokeText(p.label, x, y + 46); ctx.fillStyle = '#5C3A12'; ctx.fillText(p.label, x, y + 46); });
    });
    fade(ctx, fin(lt, .3, .5), () => { ctx.save(); ctx.translate(W - 105, 370); ctx.strokeStyle = '#5C3A12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.stroke(); ctx.fillStyle = '#B3261E'; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(9, 0); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#5C3A12'; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(9, 0); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill(); txt(ctx, 'N', 0, -42, 24, '#5C3A12'); ctx.restore(); });
    fade(ctx, fin(lt, 2.9, .5), () => { txt(ctx, `처음 가 본 곳 ${s.n}곳`, W / 2, 990, 42, '#1F2A44'); if (s.gw) txt(ctx, `강원 시·군 도장 ${s.gw}/18`, W / 2, 1046, 32, '#5C3A12', 'center', 0, 'g'); });
    chr(ctx, 'babyLens', W - 270, H - 280, 240, lt);
  },
  rTeam(ctx, W, H, s, lt) {
    bgDraw(ctx, 'kraft'); heading(ctx, W, '수사관 활약', '엄마·아빠 수사관', lt);
    const cw = (W - 100) / 2, chh = 480, y = 290;
    [['엄마', s.mom, 'mom', 40, -1], ['아빠', s.dad, 'dad', W / 2 + 10, 1]].forEach(([r, d, k, x, dir], j) => {
      const e = fin(lt, .4 + j * .3, .5); if (e <= 0) return;
      fade(ctx, e, () => {
        ctx.save(); ctx.translate(dir * (1 - e) * 200, 0);
        ctx.save(); ctx.shadowColor = 'rgba(40,25,10,.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; ctx.fillStyle = '#FFF8EC'; CV.rr(ctx, x, y, cw, chh, 26); ctx.fill(); ctx.restore();
        ctx.strokeStyle = '#1F2A44'; ctx.lineWidth = 3; CV.rr(ctx, x + 8, y + 8, cw - 16, chh - 16, 20); ctx.stroke();
        txt(ctx, '수사관 신분증', x + cw / 2, y + 46, 22, '#6B5F52', 'center', 0, 'g');
        chr(ctx, k, x + cw / 2 - 100, y + 58, 200, lt, j);
        txt(ctx, `${r} 수사관`, x + cw / 2, y + 298, 36, '#1F2A44', 'center', cw - 30);
        const rt = `${d.r.name} · Lv.${d.r.lv}`; ctx.font = '26px Jua'; const pw = ctx.measureText(rt).width + 36; ctx.fillStyle = '#B3261E'; CV.rr(ctx, x + cw / 2 - pw / 2, y + 320, pw, 44, 22); ctx.fill(); txt(ctx, rt, x + cw / 2, y + 352, 26, '#FFFFFF');
        txt(ctx, `기록 ${d.n}건`, x + cw / 2, y + 412, 28, '#2B2622', 'center', 0, 'g');
        txt(ctx, `사진 ${d.ph}장`, x + cw / 2, y + 454, 28, '#2B2622', 'center', 0, 'g');
        ctx.restore();
      });
    });
    const c = ease((lt - 1.5) / 1.3), num = v => Math.round(v * c);
    [['📷', '증거 사진', `${num(s.photos)}장`], ['🗓️', '기록한 날', `${num(s.days)}일`], ['🌰', '모은 도토리', `${num(s.acorn)}개`]].forEach(([em, l, v], j) => {
      const yy = 860 + j * 110; fade(ctx, fin(lt, 1.4 + j * .2, .4), () => { ctx.fillStyle = 'rgba(255,253,247,.88)'; CV.rr(ctx, 80, yy, W - 160, 90, 45); ctx.fill(); sticker(ctx, em, 140, yy + 45, 54); txt(ctx, l, 190, yy + 57, 30, '#6B5F52', 'left', 0, 'g'); txt(ctx, v, W - 110, yy + 60, 42, '#1F2A44', 'right'); });
    });
  },
  rCapsule(ctx, W, H, s, lt) {
    bgDraw(ctx, 'gingham'); heading(ctx, W, '봉인된 증거물', `${s.n}통 봉인 중`, lt);
    const n = Math.min(3, s.n);
    for (let j = n - 1; j >= 0; j--) { const e = pop(lt, .4 + j * .3, .5); if (e <= 0) continue; fade(ctx, e, () => envelope(ctx, W / 2 + (j - (n - 1) / 2) * 60, 560 + j * 26 + Math.sin(lt * 2.2 + j) * 8, 440, 280, [-6, 3, 8][j])); }
    const c = s.next, dd = daysBetween(today(), c.open);
    fade(ctx, fin(lt, 1.4, .5), () => { txt(ctx, `${c.occ || CV.dot(c.open)}${c.occ ? ` (${CV.dot(c.open)})` : ''}에`, W / 2, 860, 40, '#1F2A44', 'center', W - 80); txt(ctx, '열릴 편지가 기다리고 있어요', W / 2, 920, 40, '#1F2A44', 'center', W - 80); });
    const pe = pop(lt, 2, .5); if (pe > 0) fade(ctx, pe, () => scaleAt(ctx, W / 2, 1020, 1.3 - .3 * clamp(pe), () => { ctx.fillStyle = '#B3261E'; CV.rr(ctx, W / 2 - 130, 980, 260, 84, 42); ctx.fill(); txt(ctx, `D-${dd}`, W / 2, 1042, 54, '#FFFFFF'); }));
    if (s.opened) fade(ctx, fin(lt, 2.4, .4), () => txt(ctx, `열린 편지 ${s.opened}통`, W / 2, 1130, 28, '#6B5F52', 'center', 0, 'g'));
    doodle(ctx, 'heart', 110, 760, 50, '#E07A9A', -.3, fin(lt, 1));
    doodle(ctx, 'heart', W - 110, 420, 40, '#E07A9A', .3, fin(lt, 1.2));
  },
  rMontage(ctx, W, H, s, lt) {
    bgDraw(ctx, 'kraft'); heading(ctx, W, '증거 사진', `총 ${s.n}장`, lt);
    let sd = 3; const rnd = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    s.items.forEach((it, j) => { const x = 150 + rnd() * (W - 300), y = 390 + rnd() * (H - 680), r = (rnd() - .5) * 28, e = pop(lt, .5 + j * .3, .4); if (e <= 0) return; fade(ctx, e * 1.4, () => scaleAt(ctx, x, y, 1.5 - .5 * clamp(e), () => pola(ctx, it.img, x, y, 220, 240, r, fmtMD(it.d), 1, 26))); });
    fade(ctx, fin(lt, .5 + s.items.length * .3 + .2, .5), () => { ctx.fillStyle = 'rgba(255,253,247,.92)'; CV.rr(ctx, 80, H - 160, W - 160, 84, 42); ctx.fill(); txt(ctx, '모두 우리 가족의 보물 💖', W / 2, H - 104, 38, '#1F2A44'); });
  },
  rEnd(ctx, W, H, s, lt) {
    bgDraw(ctx, 'kraft');
    const rw = W - 60, rh = rw * A.roomAR, ry = 110;
    if (A.room) fade(ctx, fin(lt, 0, .6), () => { ctx.save(); ctx.shadowColor = 'rgba(40,25,10,.3)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; ctx.fillStyle = '#FFF8EC'; CV.rr(ctx, 30, ry, rw, rh, 26); ctx.fill(); ctx.restore(); ctx.save(); CV.rr(ctx, 30, ry, rw, rh, 26); ctx.clip(); ctx.drawImage(A.room, 30, ry, rw, rh); ctx.restore(); });
    else ['mom', 'babyLens', 'dad'].forEach((k, j) => chr(ctx, k, W / 2 + (j - 1) * 200 - 100, 200, 200, lt, j));
    const ty = ry + (A.room ? rh : 330) + 100, pe = pop(lt, .6, .6);
    if (pe > 0) fade(ctx, pe, () => scaleAt(ctx, W / 2, ty, 1.3 - .3 * clamp(pe), () => txt(ctx, 'To be continued…', W / 2, ty, 76, '#1F2A44')));
    s.credits.forEach(([a, b], j) => fade(ctx, fin(lt, 1.4 + j * .5, .5), () => { const yy = ty + 92 + j * 64; txt(ctx, a, W / 2 - 18, yy, 28, '#B3261E', 'right'); txt(ctx, b, W / 2, yy, 29, '#1F2A44', 'left', W / 2 - 40, 'g'); }));
    fade(ctx, fin(lt, 4.4, .6), () => txt(ctx, '앞으로도 수사는 계속됩니다 💖', W / 2, H - 70, 34, '#B3261E'));
    slam(ctx, W - 120, ry + 40, 70, '수사 중', 'To be continued', -12, lt, 1);
  }
};

// ---------- 한 장면, 한 화면 ----------
function drawScene(ctx, W, H, s, lt, a, i, n) {
  ctx.save(); ctx.globalAlpha = a;
  if (RC[s.k]) RC[s.k](ctx, W, H, s, lt); else if (s.k === 'title' || s.k === 'end') drawTitle(ctx, W, H, s, lt); else drawPhoto(ctx, W, H, s, lt, i);
  ctx.globalAlpha = a * .9; const dw = Math.min(16, (W - 80) / n - 6), x0 = W / 2 - n * (dw + 6) / 2;
  for (let j = 0; j < n; j++) { ctx.fillStyle = j <= i ? '#F4C542' : 'rgba(255,255,255,.55)'; CV.rr(ctx, x0 + j * (dw + 6), 14, dw, 6, 3); ctx.fill(); }
  ctx.restore();
}
function drawFrame(ctx, W, H, sc, t) {
  ctx.globalAlpha = 1; ctx.fillStyle = '#1F2A44'; ctx.fillRect(0, 0, W, H);
  sc.forEach((s, i) => { if (t < s.t0 || t > s.t0 + s.dur) return; const lt = t - s.t0, a = i === 0 ? 1 : Math.min(1, lt / XF); drawScene(ctx, W, H, s, lt, a, i, sc.length); });
  const T = total(sc); if (t > T - .8) { ctx.globalAlpha = Math.min(1, (t - (T - .8)) / .8); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

// ---------- 녹화 전에 한 번 만드는 재료 (배경·캐릭터·스티커·방) ----------
function mkBg(W, H) {
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
  let sd = 5; const rnd = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
  A.bg = {};
  { const [c, x] = mk(); CV.kraft(x, W, H); A.bg.kraft = c; }
  { const [c, x] = mk(); x.fillStyle = '#FFF6EE'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(224,122,154,.13)'; for (let i = 0; i < W; i += 40) x.fillRect(i, 0, 20, H); for (let j = 0; j < H; j += 40) x.fillRect(0, j, W, 20); A.bg.gingham = c; }
  { const [c, x] = mk(); x.fillStyle = '#C49460'; x.fillRect(0, 0, W, H); for (let i = 0; i < 3500; i++) { x.fillStyle = rnd() < .5 ? 'rgba(90,55,20,.22)' : 'rgba(240,200,140,.22)'; x.beginPath(); x.arc(rnd() * W, rnd() * H, .8 + rnd() * 2.2, 0, 7); x.fill(); } x.strokeStyle = '#7A4E24'; x.lineWidth = 26; x.strokeRect(13, 13, W - 26, H - 26); x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 4; x.strokeRect(28, 28, W - 56, H - 56); A.bg.cork = c; }
  { const [c, x] = mk(); x.fillStyle = '#FBF7EC'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(63,111,168,.10)'; for (let i = 0; i < W; i += 30) x.fillRect(i, 0, 1.2, H); for (let j = 0; j < H; j += 30) x.fillRect(0, j, W, 1.2); x.fillStyle = 'rgba(63,111,168,.18)'; for (let i = 0; i < W; i += 150) x.fillRect(i, 0, 2, H); for (let j = 0; j < H; j += 150) x.fillRect(0, j, W, 2); A.bg.grid = c; }
  { const [c, x] = mk(); const g = x.createRadialGradient(W / 2, H / 2, W * .2, W / 2, H / 2, H * .75); g.addColorStop(0, '#F3E3BC'); g.addColorStop(1, '#C9A46A'); x.fillStyle = g; x.fillRect(0, 0, W, H); for (let i = 0; i < 1200; i++) { x.fillStyle = 'rgba(120,80,30,.08)'; x.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 3, 1 + rnd() * 2); }
    x.strokeStyle = 'rgba(120,80,30,.16)'; x.lineWidth = 2; for (let k = 0; k < 7; k++) { x.beginPath(); const cx = rnd() * W, cy = rnd() * H, r = 60 + rnd() * 160; for (let a = 0; a <= 6.4; a += .2) { const rr = r * (1 + .15 * Math.sin(a * 3 + k)); x[a ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .7); } x.stroke(); } A.bg.map = c; }
  { const [c, x] = mk(); x.fillStyle = '#14182A'; x.fillRect(0, 0, W, H); A.bg.dark = c; }
}
async function prepAssets(W, H, sc) {
  A.W = W; A.H = H; A.ch = {}; A.room = null; mkBg(W, H);
  for (const [k, w, pr, face] of [['babyLens', 'baby', 'lens'], ['babyCam', 'baby', 'camera'], ['babyShield', 'baby', 'shield'], ['babyNote', 'baby', 'note'], ['mom', 'mom', 'heart'], ['dad', 'dad', 'camera'], ['momF', 'mom', '', 1], ['dadF', 'dad', '', 1]]) {
    try { A.ch[k] = await CV.svgImg(CHARS.svg(w, pr, face ? { face: 1, size: 220 } : { size: 260 })); } catch (e) {}
  }
  if (sc.some(s => s.k === 'rEnd') && window.GAME && GAME.roomSvg) {
    try { const svg = GAME.roomSvg(), vb = /viewBox="([\d.\s-]+)"/.exec(svg); if (vb) { const [, , w, h] = vb[1].trim().split(/\s+/).map(Number); if (w && h) A.roomAR = h / w; } A.room = await CV.svgImg(svg.replace(/<image\b[^>]*\/?>/g, '')); } catch (e) { A.room = null; }
  }
  STK.concat(['🔍', '👀', '🏠', '🔒', '🎉', '📷', '✨', '🗓️', '🌰', '🐿️']).forEach(emo);
  sc.forEach(s => (s.items || []).forEach(it => { if (it.e) emo(it.e); }));
}

// ---------- 녹화 ----------
const pickMime = () => { if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return ''; for (const m of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {} } return ''; };
async function prep(src) { const im = await CV.img(src), k = Math.min(1, 960 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c; }
function overlay() {
  if (M.el) return M.el;
  const el = document.createElement('div'); el.className = 'mvo'; el.hidden = true;
  el.innerHTML = `<div class="mvtop"><b>🎬 성장 영상</b><button class="mvx" data-mv="close" aria-label="닫기">✕</button></div>
    <div class="mvbox"><canvas></canvas><video controls playsinline hidden></video></div>
    <div class="mvbar"><div class="mvprog"><i></i></div><p class="mvmsg"></p></div>
    <div class="mvact" hidden><button class="primary" data-mv="share">📤 카톡으로 보내기</button><button class="secondary" data-mv="save">💾 폰에 저장</button><button class="ghost" data-mv="close">닫기</button></div>`;
  document.body.appendChild(el); M.el = el;
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-mv]'); if (!b) return;
    const name = `${CV.nick()}_${M.tpl === 'recap' ? '수사일지총정리' : '성장영상'}_${today().replace(/-/g, '')}.${M.ext}`;
    if (b.dataset.mv === 'close') close();
    if (b.dataset.mv === 'save' && M.blob) { CV.save(M.blob, name); toast('영상을 저장했어요 (다운로드 폴더)'); }
    if (b.dataset.mv === 'share' && M.blob) { const r = await CV.share(M.blob, name, `${CV.nick()} 성장 영상`); if (r === 'saved') toast('공유가 안 되는 폰이라 저장했어요'); }
  });
  return el;
}
const msg = (t, p) => { const el = M.el; el.querySelector('.mvmsg').textContent = t; if (p != null) el.querySelector('.mvprog i').style.width = Math.round(p * 100) + '%'; };
function close() {
  if (!M.el || M.el.hidden) return false;
  if (M.busy && !M.abort) { ask('영상 만들기를 그만둘까요?', { ok: '그만두기', no: '계속 만들기', danger: true }).then(ok => { if (ok) { M.abort = true; close(); } }); return true; }
  M.el.hidden = true; document.documentElement.classList.remove('pc-open');
  const v = M.el.querySelector('video'); v.pause(); return true;
}
const songOf = () => M.song === 'auto' ? (window.MUSIC ? MUSIC.pick(M.tpl) : 'none') : M.song;
async function make() {
  if (M.busy) return;
  const mime = pickMime(); if (!mime) { toast('이 폰(브라우저)에서는 영상을 만들 수 없어요'); return; }
  if (window.MUSIC) MUSIC.stopPreview();
  const sid = songOf();
  let ac = null; if (sid !== 'none' && window.MUSIC) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch (e) { ac = null; } }   // 누른 순간에 만들어야 소리가 나요 (기다리는 일보다 먼저)
  if (M.tpl === 'recap' && window.EXPLORE && EXPLORE.places().length) { M.busy = true; toast('탐험 지도 동네 이름 찾는 중…'); try { await EXPLORE.prepare(3500); } catch (e) {} M.busy = false; }
  const sc = scenes(), photos = sc.filter(s => s.k === 'photo' || s.k === 'pose');
  if (M.tpl !== 'recap' && photos.length < (M.tpl === 'pose' ? 2 : 1)) { toast(M.tpl === 'pose' ? '월별 증거 사진이 2장 이상 있어야 해요' : '이 영상에 넣을 사진이 아직 없어요'); try { ac && ac.close(); } catch (e) {} return; }
  M.ext = /mp4/.test(mime) ? 'mp4' : 'webm';
  const el = overlay(), cv = el.querySelector('canvas'), vid = el.querySelector('video'), W = 720, H = isSq() ? 720 : 1280;
  cv.width = W; cv.height = H; cv.hidden = false; vid.hidden = true; vid.removeAttribute('src'); el.querySelector('.mvact').hidden = true; el.querySelector('.mvbar').hidden = false;
  el.hidden = false; document.documentElement.classList.add('pc-open'); M.busy = true; M.abort = false;
  if (M.url) { URL.revokeObjectURL(M.url); M.url = ''; M.blob = null; }
  let player = null;
  try {
    const srcs = [...new Set(sc.flatMap(s => [s.src, ...(s.items || []).map(it => it.src)]).filter(Boolean))], cache = {};
    let bad = 0;
    for (let i = 0; i < srcs.length; i++) { if (M.abort) throw new Error('stop'); msg(`사진 불러오는 중… ${i + 1}/${srcs.length}`, i / Math.max(1, srcs.length) * .12); try { cache[srcs[i]] = await prep(srcs[i]); } catch (e) { bad++; } }
    sc.forEach(s => { s.img = s.src ? cache[s.src] || null : null; (s.items || []).forEach(it => { it.img = it.src ? cache[it.src] || null : null; }); });
    if (srcs.length && bad >= Math.max(1, srcs.length / 2) && !(await ask(`사진 ${srcs.length}장 중 ${bad}장을 불러오지 못했어요.\n사진 저장소 설정(CORS)이 아직이면 이래요. 사진 없이 만들까요?`, { ok: '그래도 만들기', no: '그만두기' }))) throw new Error('stop');
    msg('꾸미기 재료 준비 중…', .13);
    await prepAssets(W, H, sc);
    await CV.fonts(...sc.map(s => [s.l1, s.l2, s.l3, s.l4, s.main, s.sub, s.lab, (s.items || []).map(it => it.t).join(' '), (s.lines || []).join(' '), (s.credits || []).flat().join(' ')].join(' ')), '수사 개시 중 To be continued No. 프로필 성장 기록 최초 목격 월별 증거 사진 예방접종 작전 체포한 수배범 닮은꼴 판결 탐험 지도 수사관 활약 봉인된 증거물 완료 면역 요새 WANTED 엄마 아빠 판박이 우세 반반');
    const T = total(sc), ctx = cv.getContext('2d'), stream = cv.captureStream(30);
    if (ac) { const dest = ac.createMediaStreamDestination(); player = MUSIC.play(ac, [dest, ac.destination], sid, T); dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr)); }
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3500000, audioBitsPerSecond: 128000 }), chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    try { M.lock = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch (e) { M.lock = null; }
    drawFrame(ctx, W, H, sc, 0); rec.start(); // 나눠 받지 않아야 영상 길이가 제대로 적혀요 (webm은 나눠 받으면 길이 없음)
    const st = performance.now();
    await new Promise(done => { const tick = () => { if (M.abort || document.visibilityState === 'hidden') { M.abort = true; return done(); } const t = (performance.now() - st) / 1000; drawFrame(ctx, W, H, sc, Math.min(t, T)); msg(`영상 만드는 중… ${Math.min(100, Math.round(t / T * 100))}% · 화면을 켜 둔 채로 기다려 주세요`, .15 + .85 * Math.min(1, t / T)); if (t >= T + .2) return done(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    rec.stop(); await stopped; stream.getTracks().forEach(tr => tr.stop());
    if (M.abort) throw new Error('stop');
    M.blob = new Blob(chunks, { type: mime.split(';')[0] }); M.url = URL.createObjectURL(M.blob);
    cv.hidden = true; vid.hidden = false; vid.src = M.url; el.querySelector('.mvbar').hidden = true; el.querySelector('.mvact').hidden = false;
    toast(`영상 완성! ${Math.round(T)}초 · ${(M.blob.size / 1048576).toFixed(1)}MB`); if (window.GAME) GAME.mark('movie');
  } catch (e) {
    if (e && e.message === 'stop') { if (!M.el.hidden) { msg(document.visibilityState === 'hidden' ? '화면이 꺼지거나 다른 앱으로 가서 멈췄어요. 다시 만들어 주세요' : '그만뒀어요', 0); el.querySelector('.mvact').hidden = false; el.querySelector('[data-mv=share]').hidden = el.querySelector('[data-mv=save]').hidden = true; } }
    else { console.error(e); msg('만들지 못했어요: ' + ((e && e.message) || ''), 0); el.querySelector('.mvact').hidden = false; }
  } finally {
    M.busy = false; try { player && player.stop(); } catch (x) {} try { M.lock && M.lock.release(); } catch (x) {} M.lock = null; const a0 = ac; setTimeout(() => { try { a0 && a0.close(); } catch (x) {} }, 300);
    if (M.blob) { el.querySelector('[data-mv=share]').hidden = false; el.querySelector('[data-mv=save]').hidden = false; }
  }
}

// ---------- 화면 ----------
function render_() {
  const sc = scenes(), T = total(sc), ph = sc.filter(s => s.k === 'photo' || s.k === 'pose'), ok = !!pickMime(), rc = M.tpl === 'recap';
  const SG = window.MUSIC ? MUSIC.SONGS : {}, rec = window.MUSIC ? MUSIC.pick(M.tpl) : '', playing = window.MUSIC && MUSIC.playing(), cur = songOf();
  const can = rc || ph.length >= (M.tpl === 'pose' ? 2 : 1);
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>성장 영상 만들기</h1><p>앱에 모인 사진과 기록으로 음악이 흐르는 영상을 만들어요. 사진은 알아서 꾸며 넣고, 카톡으로 바로 보낼 수 있어요.</p></header>
    <section><h2 class="sh"><span>🎞 어떤 영상?</span></h2>
      <div class="mvt">${TPLS.map(([k, l, d]) => `<button class="${M.tpl === k ? 'on' : ''}${k === 'recap' ? ' wide' : ''}" data-mvset="tpl" data-v="${k}"><b>${l}</b><small>${d}</small></button>`).join('')}</div></section>
    <section><h2 class="sh"><span>🎬 장면 ${sc.length}개</span><span>약 ${Math.round(T)}초</span></h2>
      ${can ? `<div class="mvsb">${sc.map(s => `<span class="${s.k}">${s.src && !rc ? `<img src="${s.src}" alt="" loading="lazy">` : `<i>${s.ico || '🐿️'}</i>`}<small>${esc(s.lab || s.l1 || s.main || '')}</small></span>`).join('')}</div>` : `<p class="vempty">${M.tpl === 'pose' ? '월별 증거 사진이 2장 이상 모이면 만들 수 있어요. 📷 같은 포즈 촬영기로 찍어 보세요.' : '이 영상에 넣을 사진이 아직 없어요.'}</p>`}
      ${rc ? '<p class="foot" style="margin:6px 0 0">기록이 있는 장면만 들어가요. 기록이 쌓일수록 영상이 길어져요.</p>' : `<div class="mvopt"><span>장면 길이</span>${[[1.8, '빠르게'], [2.6, '보통'], [3.5, '천천히']].map(([v, l]) => `<button class="${M.speed === v ? 'on' : ''}" data-mvset="speed" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="mvopt"><span>화면</span><button class="${M.sq ? '' : 'on'}" data-mvset="sq" data-v="0">세로 (폰 화면)</button><button class="${M.sq ? 'on' : ''}" data-mvset="sq" data-v="1">정사각</button></div>`}</section>
    <section><h2 class="sh"><span>🎵 음악</span><span>${M.song === 'auto' && SG[rec] ? `추천: ${esc(SG[rec].name.replace(/^\S+\s/, ''))}` : ''}</span></h2>
      <div class="mvsongs">${['auto'].concat(window.MUSIC ? MUSIC.ORDER : [], ['none']).map(id => { const s = SG[id] || {}, nm = id === 'auto' ? '✨ 추천' : id === 'none' ? '🔇 음악 없이' : s.name, ds = id === 'auto' ? (SG[rec] ? SG[rec].name : '') : id === 'none' ? '' : s.desc; return `<button class="${M.song === id ? 'on' : ''}" data-mvset="song" data-v="${id}"><b>${esc(nm || '')}</b>${ds ? `<small>${esc(ds)}</small>` : ''}</button>`; }).join('')}</div>
      ${cur !== 'none' && SG[cur] ? `<button class="ghost mvpv" data-mvset="pv">${playing ? '■ 미리 듣기 멈추기' : `▶ 미리 듣기 (10초) · ${esc(SG[cur].name)}`}</button>` : ''}
      <p class="foot" style="margin:8px 0 0">음악은 앱이 직접 연주해요. 직접 만든 곡과 저작권이 끝난 옛 멜로디라 마음껏 공유해도 돼요.</p></section>
    ${ok ? `<button class="primary mvgo" data-mvset="make" ${can ? '' : 'disabled'}>🎬 영상 만들기</button><p class="foot" style="text-align:center;margin-top:6px">영상 길이(약 ${Math.round(T)}초)만큼 걸려요. 만드는 동안 화면을 켜 두세요.</p>` : '<p class="vempty">이 폰(브라우저)에서는 영상 만들기를 쓸 수 없어요. 크롬이나 사파리 최신 버전에서 해 주세요.</p>'}
    <button class="secondary" data-mvset="close" style="width:100%;margin-top:12px">돌아가기</button>`;
}
function open(tpl) { if (tpl) M.tpl = tpl; S.view = 'movie'; render(); window.scrollTo(0, 0); }
const rerender = () => { if (S.view === 'movie') render(); };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-mvset]'); if (!b) return;
  const v = b.dataset.v;
  switch (b.dataset.mvset) {
    case 'open': open(v); break;
    case 'close': if (window.MUSIC) MUSIC.stopPreview(); goBack(); break;
    case 'tpl': M.tpl = v; if (window.MUSIC) MUSIC.stopPreview(); render(); break;
    case 'speed': M.speed = +v; render(); break;
    case 'sq': M.sq = v === '1'; render(); break;
    case 'song': M.song = v; if (window.MUSIC && MUSIC.playing()) { if (songOf() === 'none') MUSIC.stopPreview(); else MUSIC.preview(songOf(), rerender); } render(); break;
    case 'pv': if (!window.MUSIC) break; if (MUSIC.playing()) MUSIC.stopPreview(); else MUSIC.preview(songOf(), rerender); render(); break;
    case 'make': make(); break;
  }
});

const css = document.createElement('style');
css.textContent = `
.mvt{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mvt button{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;padding:12px;border-radius:16px;border:1.5px solid var(--line);background:#FFFDF7;min-height:84px}
.mvt button.wide{grid-column:1/-1;min-height:0;background:linear-gradient(120deg,#FFF3DD,#FCE1E4)}
.mvt b{font-family:var(--display);font-weight:400;font-size:16px;color:var(--navy)}.mvt small{font-size:12px;color:var(--muted);line-height:1.35}
.mvt button.on{border:2.5px solid var(--red);background:#FFF3EF}
.mvsb{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 8px}
.mvsb span{flex:0 0 auto;width:66px;display:flex;flex-direction:column;align-items:center;gap:3px}
.mvsb img,.mvsb i{width:66px;height:88px;border-radius:10px;object-fit:cover;background:var(--card2);display:grid;place-items:center;font-style:normal;font-size:26px}
.mvsb .title img,.mvsb .end img{outline:2px solid var(--butter)}.mvsb small{font-size:11px;color:var(--navy);text-align:center;line-height:1.2;max-width:66px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mvopt{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px}.mvopt span{font-size:13px;color:var(--muted);min-width:62px}
.mvopt button{border:1.5px solid var(--line);background:#fff;border-radius:99px;padding:6px 12px;font-size:13px;color:var(--navy);min-height:36px}.mvopt button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.mvsongs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.mvsongs button{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;padding:8px 9px;border-radius:14px;border:1.5px solid var(--line);background:#FFFDF7;min-height:58px;min-width:0}
.mvsongs b{font-family:var(--display);font-weight:400;font-size:13.5px;color:var(--navy);line-height:1.25;word-break:keep-all}
.mvsongs small{font-size:11px;color:var(--muted);line-height:1.3;word-break:keep-all}
.mvsongs button.on{border:2.5px solid var(--navy);background:#EEF2F8}
.mvpv{width:100%;margin-top:10px}
.mvgo{width:100%;min-height:56px;font-size:17px;margin-top:16px}
.mvo{position:fixed;inset:0;z-index:72;background:#0E1424;color:#fff;display:flex;flex-direction:column;align-items:center;gap:12px;padding:max(10px,env(safe-area-inset-top)) 12px max(14px,env(safe-area-inset-bottom))}
.mvo[hidden]{display:none}
.mvtop{width:100%;display:flex;align-items:center;justify-content:space-between}.mvtop b{font-family:var(--display);font-weight:400;font-size:18px}
.mvx{width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:18px}
.mvbox{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center}
.mvbox canvas,.mvbox video{max-width:100%;max-height:100%;border-radius:14px;background:#000;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.mvbox canvas[hidden],.mvbox video[hidden]{display:none}
.mvbar{width:100%;max-width:420px}.mvbar[hidden]{display:none}.mvprog{height:8px;border-radius:99px;background:rgba(255,255,255,.18);overflow:hidden}.mvprog i{display:block;height:100%;width:0;background:#F4C542;transition:width .3s}
.mvmsg{margin:8px 0 0;font-size:13px;text-align:center;opacity:.9}
.mvact{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.mvact[hidden]{display:none}.mvact button{min-height:48px}.mvact .ghost{color:#fff;border-color:rgba(255,255,255,.4);background:transparent}`;
document.head.appendChild(css);

window.MOVIE = { open, render: render_, close, busy: () => M.busy };
})();
