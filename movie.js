// 성장 영상 만들기 — 앱의 사진·키/몸무게·최초 목격으로 짧은 영상을 만들어 폰에 저장하거나 카톡으로 보내요 (S.view='movie')
// canvas에 장면을 그리고 MediaRecorder로 녹화해요 (mp4가 되는 폰은 mp4, 아니면 webm). 음악은 직접 만든 오르골 '반짝반짝 작은 별'
// 녹화는 body에 붙인 겹침 창에서 (앱이 다시 그려져도 안 끊기게). 영상 길이만큼 걸리고, 화면이 꺼지거나 다른 앱으로 가면 멈춰요
(function () {
const M = { tpl: 'story', speed: 2.6, music: true, sq: false, busy: false, abort: false, url: '', blob: null, ext: 'mp4', el: null, lock: null };
const TPLS = [['story', '📖 성장 스토리', '달마다 대표 사진과 키·몸무게, 최초 목격'], ['d100', '💯 100일의 기록', '태어나서 100일까지 사진으로'], ['pose', '📷 같은 포즈 타임랩스', '월별 증거 사진이 스르륵 자라요'], ['month', '🗓 이번 달 하이라이트', '이번 달에 찍은 사진 모음']];
const XF = .6;   // 장면 사이 겹쳐 바뀌는 시간(초)

// ---------- 장면 만들기 ----------
function pool() { return CV.photos().filter(p => p.type !== 'rec' && p.type !== 'report'); }
const firstsIn = (a, b) => (S.moments || []).filter(m => (m.type === 'first' || !m.type) && m.date >= a && m.date < b).map(m => m.title).filter(Boolean);
const even = (L, n) => L.length <= n ? L : Array.from({ length: n }, (_, i) => L[Math.round(i * (L.length - 1) / (n - 1))]);
function scenes() {
  const b = S.profile.birth, t = today(), nick = CV.nick(), P = pool(), out = [], asc = L => L.slice().sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
  const photo = (p, l1, l2, l3, l4, k = 'photo') => out.push({ k, src: safeImg(PHOTOS[p.id]), l1, l2, l3, l4 });
  const cover = safeImg(PHOTOS.profile) || (P[P.length - 1] && safeImg(PHOTOS[P[P.length - 1].id])) || '';
  const fam = P.find(p => p.type === 'fam') || P[0];
  const end = (main, sub) => out.push({ k: 'end', main, sub, src: fam ? safeImg(PHOTOS[fam.id]) : cover });
  if (M.tpl === 'story') {
    out.push({ k: 'title', main: `${nick} 성장 수사 일지`, sub: `${CV.dot(b)} 태어남 · 오늘 생후 ${dayNo(t)}일`, src: cover });
    const [mo] = monthsDays(b, t);
    for (let i = 0; i <= Math.min(mo, 36); i++) {
      const from = addMonths(b, i), to = addMonths(b, i + 1), slot = i ? S.moments.find(m => m.type === 'month' && m.title === i + '개월' && safeImg(PHOTOS[m.id])) : null;
      const inR = asc(P.filter(p => p.date >= from && p.date < to && p.type !== 'month' && p.type !== 'profile'));
      const p = slot ? { id: slot.id, date: slot.date } : inR.find(x => x.type === 'first') || inR.find(x => x.type === 'fam') || inR[Math.floor(inR.length / 2)] || (i === 0 && safeImg(PHOTOS.profile) ? { id: 'profile', date: b } : null);
      if (!p) continue;
      const f = firstsIn(from, to);
      photo(p, i ? `${i}개월` : '태어난 달', `생후 ${dayNo(p.date)}일 · ${CV.dot(p.date)}`, CV.stats(p.date), f.length ? '✨ ' + f.slice(0, 3).join(' · ') : '');
    }
    const R = (S.records || []).slice().sort((x, y) => x.date < y.date ? -1 : 1), w0 = R.find(r => r.weight != null && r.weight !== ''), w1 = R.slice().reverse().find(r => r.weight != null && r.weight !== '');
    end(`오늘 생후 ${dayNo(t)}일`, w0 && w1 && w0 !== w1 ? `몸무게 ${fmt('weight', w0.weight)}kg → ${fmt('weight', w1.weight)}kg` : '건강하게 자라는 중');
  } else if (M.tpl === 'd100') {
    const e = addDays(b, 99), last = t < e ? t : e;
    out.push({ k: 'title', main: `${nick}의 100일`, sub: `${CV.dot(b)} ~ ${CV.dot(e)}`, src: cover });
    even(asc(P.filter(p => p.date >= b && p.date <= last && p.type !== 'profile')), 18).forEach(p => { const f = firstsIn(p.date, addDays(p.date, 1)); photo(p, `생후 ${dayNo(p.date)}일`, CV.dot(p.date), f.length ? '✨ ' + f.join(' · ') : '', ''); });
    end(t >= e ? '100일 축하해! 🎉' : `100일까지 D-${daysBetween(t, e)}`, `엄마 수사관 · 아빠 수사관이 함께 기록했어요`);
  } else if (M.tpl === 'pose') {
    out.push({ k: 'title', main: '같은 포즈 타임랩스', sub: `${nick} · 매달 같은 자리에서`, src: cover, short: true });
    (S.moments || []).filter(m => m.type === 'month' && safeImg(PHOTOS[m.id])).sort((x, y) => parseInt(x.title) - parseInt(y.title)).forEach(m => photo({ id: m.id, date: m.date }, m.title, `생후 ${dayNo(m.date)}일`, '', '', 'pose'));
    end(`지금 생후 ${dayNo(t)}일`, '다음 달에도 같은 자리에서 📷');
  } else {
    const m0 = t.slice(0, 7) + '-01';
    out.push({ k: 'title', main: `${nick}의 ${+t.slice(5, 7)}월`, sub: '이번 달 수사 하이라이트', src: cover, short: true });
    even(asc(P.filter(p => p.date >= m0 && p.type !== 'profile')), 20).forEach(p => photo(p, fmtK(p.date, true), `생후 ${dayNo(p.date)}일`, '', ''));
    end(`${+t.slice(5, 7)}월 수사 끝!`, '다음 달에 또 만나요');
  }
  // 시간표
  let t0 = 0; out.forEach(s => { s.dur = s.k === 'title' ? (s.short ? 2.4 : 3.2) : s.k === 'end' ? 3.8 : s.k === 'pose' ? 1.3 : M.speed; s.t0 = t0; t0 += s.dur - XF; });
  return out;
}
const total = sc => sc.length ? sc[sc.length - 1].t0 + sc[sc.length - 1].dur : 0;

// ---------- 그리기 ----------
const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
function drawScene(ctx, W, H, s, lt, a, i, n, ch) {
  ctx.save(); ctx.globalAlpha = a;
  const up = ease(lt / .7), p = lt / s.dur;
  if (s.k === 'photo' || s.k === 'pose') {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
    if (s.img) { const z = s.k === 'pose' ? 1 : 1.04 + .09 * p, fx = i % 2 ? .35 + .3 * p : .65 - .3 * p; CV.cover(ctx, s.img, 0, 0, W, H, z, fx, .45); }
    if (s.k === 'pose') {
      CV.rr(ctx, W - 250, 40, 210, 92, 46); ctx.fillStyle = 'rgba(31,42,68,.85)'; ctx.fill(); CV.text(ctx, s.l1, W - 145, 104, '56px Jua', '#FCE8B4');
      CV.text(ctx, s.l2, W - 145, 172, '28px "Gowun Dodum"', '#fff');
    } else {
      const g = ctx.createLinearGradient(0, H * .5, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,14,28,.82)'); ctx.fillStyle = g; ctx.fillRect(0, H * .5, W, H * .5);
      ctx.globalAlpha = a * up; const dy = (1 - up) * 40, lines = [s.l2, s.l3, s.l4].filter(Boolean);
      let y = H - 70 - lines.length * 46 + dy;
      CV.text(ctx, s.l1, 50, y, `${W > 800 ? 84 : 72}px Jua`, '#FCE8B4', 'left', W - 100); y += 54;
      lines.forEach((l, j) => { CV.text(ctx, l, 50, y + j * 46, j === 2 || l.startsWith('✨') ? '32px Jua' : '30px "Gowun Dodum"', l.startsWith('✨') ? '#F6B4AA' : '#fff', 'left', W - 100); });
      ctx.globalAlpha = a; CV.rr(ctx, 30, 34, 300, 50, 25); ctx.fillStyle = 'rgba(255,253,247,.85)'; ctx.fill(); CV.text(ctx, `🔍 사건 파일 No.${fileNo()}`, 180, 68, '24px "Gowun Dodum"', '#1F2A44');
    }
  } else {
    CV.kraft(ctx, W, H);
    const isEnd = s.k === 'end', pw = W * .62, ph = pw * 1.18, cy = H * (isEnd ? .36 : .4);
    if (s.img) { ctx.save(); ctx.translate(W / 2, cy); ctx.rotate((isEnd ? 2.5 : -2.5) * Math.PI / 180 * (1 - .3 * up)); ctx.shadowColor = 'rgba(60,40,20,.35)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10; ctx.fillStyle = '#FFFDF8'; ctx.fillRect(-pw / 2 - 18, -ph / 2 - 18, pw + 36, ph + 78); ctx.shadowColor = 'transparent'; CV.cover(ctx, s.img, -pw / 2, -ph / 2, pw, ph, 1 + .05 * p); ctx.restore(); CV.tape(ctx, W / 2, cy - ph / 2 - 20, 190, 50, -4); }
    ctx.globalAlpha = a * up; const ty = cy + ph / 2 + 150 + (1 - up) * 30;
    CV.text(ctx, s.main, W / 2, ty, `${W > 800 ? 80 : 68}px Jua`, '#1F2A44', 'center', W - 80);
    CV.text(ctx, s.sub, W / 2, ty + 58, '32px "Gowun Dodum"', '#6B5F52', 'center', W - 80);
    if (!isEnd) CV.stamp(ctx, W - 120, 120, 78, '수사 개시', `No.${fileNo()}`, -12);
    else CV.stamp(ctx, W - 120, 120, 78, '수사 중', 'To be continued', -12);
    if (ch) { const k = isEnd ? ['mom', 'baby', 'dad'] : ['baby'], sz = isEnd ? 150 : 180; k.forEach((w, j) => { const im = ch[w]; if (!im) return; const bob = Math.sin((lt * 3 + j) * 2) * 6, x = isEnd ? W / 2 + (j - 1) * (sz * .9) - sz / 2 : 30, yy = H - sz - 30 + bob; ctx.drawImage(im, x, yy, sz, sz); }); }
  }
  // 위쪽 진행 점
  ctx.globalAlpha = a * .9; const dw = Math.min(16, (W - 80) / n - 6), x0 = W / 2 - n * (dw + 6) / 2;
  for (let j = 0; j < n; j++) { ctx.fillStyle = j <= i ? '#F4C542' : 'rgba(255,255,255,.45)'; CV.rr(ctx, x0 + j * (dw + 6), 14, dw, 6, 3); ctx.fill(); }
  ctx.restore();
}
function drawFrame(ctx, W, H, sc, t, ch) {
  ctx.globalAlpha = 1; ctx.fillStyle = '#1F2A44'; ctx.fillRect(0, 0, W, H);
  sc.forEach((s, i) => { if (t < s.t0 || t > s.t0 + s.dur) return; const lt = t - s.t0, a = i === 0 ? 1 : Math.min(1, lt / XF); drawScene(ctx, W, H, s, lt, a, i, sc.length, ch); });
  const T = total(sc); if (t > T - .8) { ctx.globalAlpha = Math.min(1, (t - (T - .8)) / .8); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

// ---------- 음악: 오르골 반짝반짝 작은 별 ----------
const MEL = [60, 60, 67, 67, 69, 69, 67, 0, 65, 65, 64, 64, 62, 62, 60, 0, 67, 67, 65, 65, 64, 64, 62, 0, 67, 67, 65, 65, 64, 64, 62, 0, 60, 60, 67, 67, 69, 69, 67, 0, 65, 65, 64, 64, 62, 62, 60, 0];
const CH = { C: [48, 52, 55], F: [53, 57, 60], G: [55, 59, 62] }, HAR = 'C C F C F C G C C F C G C F C G C C F C F C G C'.split(' ');
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function music(ac, out, len) {
  const t0 = ac.currentTime + .05, beat = 60 / 96, master = ac.createGain(), dl = ac.createDelay(1), fb = ac.createGain(), wet = ac.createGain();
  master.gain.setValueAtTime(.0001, t0); master.gain.exponentialRampToValueAtTime(.9, t0 + .8); master.gain.setValueAtTime(.9, t0 + Math.max(1, len - 2)); master.gain.exponentialRampToValueAtTime(.0001, t0 + len);
  dl.delayTime.value = .31; fb.gain.value = .25; wet.gain.value = .3; master.connect(out); master.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(out);
  try { master.connect(ac.destination); wet.connect(ac.destination); } catch (e) {}
  const note = (m, t, d, v, type = 'sine') => { const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain(); o.type = type; o.frequency.value = hz(m); o2.type = 'triangle'; o2.frequency.value = hz(m) * 2; g2.gain.value = .25;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master); o.start(t); o2.start(t); o.stop(t + d + .05); o2.stop(t + d + .05); };
  for (let k = 0, t = t0; t < t0 + len; k++, t += beat) {
    const mi = k % MEL.length; if (MEL[mi]) note(MEL[mi] + 12, t, 1.4, .16);
    if (k % 2 === 0) { const c = CH[HAR[(k / 2 | 0) % HAR.length]]; note(c[0] - 12, t, 1.8, .07); c.forEach((m, j) => note(m + 12, t + beat * (j + 1) / 3, .9, .04)); }
  }
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
    const name = `${CV.nick()}_성장영상_${today().replace(/-/g, '')}.${M.ext}`;
    if (b.dataset.mv === 'close') close();
    if (b.dataset.mv === 'save' && M.blob) { CV.save(M.blob, name); toast('영상을 저장했어요 (다운로드 폴더)'); }
    if (b.dataset.mv === 'share' && M.blob) { const r = await CV.share(M.blob, name, `${CV.nick()} 성장 영상`); if (r === 'saved') toast('공유가 안 되는 폰이라 저장했어요'); }
  });
  return el;
}
const msg = (t, p) => { const el = M.el; el.querySelector('.mvmsg').textContent = t; if (p != null) el.querySelector('.mvprog i').style.width = Math.round(p * 100) + '%'; };
function close() {
  if (!M.el || M.el.hidden) return false;
  if (M.busy) { if (!confirm('영상 만들기를 그만둘까요?')) return true; M.abort = true; }
  M.el.hidden = true; document.documentElement.classList.remove('pc-open');
  const v = M.el.querySelector('video'); v.pause(); return true;
}
async function make() {
  if (M.busy) return;
  const sc = scenes(), nPh = sc.filter(s => s.src && s.k !== 'title' && s.k !== 'end').length;
  if (nPh < (M.tpl === 'pose' ? 2 : 1)) { toast(M.tpl === 'pose' ? '월별 증거 사진이 2장 이상 있어야 해요' : '이 영상에 넣을 사진이 아직 없어요'); return; }
  const mime = pickMime(); if (!mime) { toast('이 폰(브라우저)에서는 영상을 만들 수 없어요'); return; }
  M.ext = /mp4/.test(mime) ? 'mp4' : 'webm';
  let ac = null; if (M.music) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch (e) { ac = null; } }   // 누른 순간에 만들어야 소리가 나요
  const el = overlay(), cv = el.querySelector('canvas'), vid = el.querySelector('video'), W = 720, H = M.sq ? 720 : 1280;
  cv.width = W; cv.height = H; cv.hidden = false; vid.hidden = true; vid.removeAttribute('src'); el.querySelector('.mvact').hidden = true; el.querySelector('.mvbar').hidden = false;
  el.hidden = false; document.documentElement.classList.add('pc-open'); M.busy = true; M.abort = false;
  if (M.url) { URL.revokeObjectURL(M.url); M.url = ''; M.blob = null; }
  try {
    const srcs = [...new Set(sc.map(s => s.src).filter(Boolean))], cache = {};
    for (let i = 0; i < srcs.length; i++) { if (M.abort) throw new Error('stop'); msg(`사진 불러오는 중… ${i + 1}/${srcs.length}`, i / srcs.length * .15); try { cache[srcs[i]] = await prep(srcs[i]); } catch (e) {} }
    sc.forEach(s => { s.img = s.src ? cache[s.src] || null : null; });
    const ch = {}; for (const w of ['baby', 'mom', 'dad']) { try { ch[w] = await CV.svgImg(CHARS.svg(w, w === 'baby' ? 'lens' : w === 'mom' ? 'heart' : 'camera', { size: 240 })); } catch (e) {} }
    await CV.fonts(...sc.map(s => [s.l1, s.l2, s.l3, s.l4, s.main, s.sub].join(' ')), '수사 개시 중 To be continued No.');
    const T = total(sc), ctx = cv.getContext('2d'), stream = cv.captureStream(30);
    if (ac) { const dest = ac.createMediaStreamDestination(); music(ac, dest, T); dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr)); }
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3000000, audioBitsPerSecond: 128000 }), chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    try { M.lock = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch (e) { M.lock = null; }
    drawFrame(ctx, W, H, sc, 0, ch); rec.start(); // 나눠 받지 않아야 영상 길이가 제대로 적혀요 (webm은 나눠 받으면 길이 없음)
    const st = performance.now();
    await new Promise(done => { const tick = () => { if (M.abort || document.visibilityState === 'hidden') { M.abort = true; return done(); } const t = (performance.now() - st) / 1000; drawFrame(ctx, W, H, sc, Math.min(t, T), ch); msg(`영상 만드는 중… ${Math.min(100, Math.round(t / T * 100))}% · 화면을 켜 둔 채로 기다려 주세요`, .15 + .85 * Math.min(1, t / T)); if (t >= T + .2) return done(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    rec.stop(); await stopped; stream.getTracks().forEach(tr => tr.stop());
    if (M.abort) throw new Error('stop');
    M.blob = new Blob(chunks, { type: mime.split(';')[0] }); M.url = URL.createObjectURL(M.blob);
    cv.hidden = true; vid.hidden = false; vid.src = M.url; el.querySelector('.mvbar').hidden = true; el.querySelector('.mvact').hidden = false;
    toast(`영상 완성! ${Math.round(T)}초 · ${(M.blob.size / 1048576).toFixed(1)}MB`); if (window.GAME) GAME.mark('movie');
  } catch (e) {
    if (e && e.message === 'stop') { if (!M.el.hidden) { msg(document.visibilityState === 'hidden' ? '화면이 꺼지거나 다른 앱으로 가서 멈췄어요. 다시 만들어 주세요' : '그만뒀어요', 0); el.querySelector('.mvact').hidden = false; el.querySelector('[data-mv=share]').hidden = el.querySelector('[data-mv=save]').hidden = true; } }
    else { msg('만들지 못했어요: ' + ((e && e.message) || ''), 0); el.querySelector('.mvact').hidden = false; }
  } finally {
    M.busy = false; try { M.lock && M.lock.release(); } catch (x) {} M.lock = null; try { ac && ac.close(); } catch (x) {}
    if (M.blob) { el.querySelector('[data-mv=share]').hidden = false; el.querySelector('[data-mv=save]').hidden = false; }
  }
}

// ---------- 화면 ----------
function render_() {
  const sc = scenes(), T = total(sc), ph = sc.filter(s => s.k === 'photo' || s.k === 'pose'), ok = !!pickMime();
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>성장 영상 만들기</h1><p>앱에 모인 사진과 키·몸무게, 최초 목격으로 음악이 흐르는 영상을 만들어요. 카톡으로 바로 보낼 수 있어요.</p></header>
    <section><h2 class="sh"><span>🎞 어떤 영상?</span></h2>
      <div class="mvt">${TPLS.map(([k, l, d]) => `<button class="${M.tpl === k ? 'on' : ''}" data-mvset="tpl" data-v="${k}"><b>${l}</b><small>${d}</small></button>`).join('')}</div></section>
    <section><h2 class="sh"><span>🎬 장면 ${sc.length}개</span><span>약 ${Math.round(T)}초</span></h2>
      ${ph.length ? `<div class="mvsb">${sc.map(s => `<span class="${s.k}">${s.src ? `<img src="${s.src}" alt="" loading="lazy">` : '<i>🐿️</i>'}<small>${esc(s.l1 || s.main || '')}</small></span>`).join('')}</div>` : `<p class="vempty">${M.tpl === 'pose' ? '월별 증거 사진이 2장 이상 모이면 만들 수 있어요. 📷 같은 포즈 촬영기로 찍어 보세요.' : '이 영상에 넣을 사진이 아직 없어요.'}</p>`}
      <div class="mvopt"><span>장면 길이</span>${[[1.8, '빠르게'], [2.6, '보통'], [3.5, '천천히']].map(([v, l]) => `<button class="${M.speed === v ? 'on' : ''}" data-mvset="speed" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="mvopt"><span>화면</span><button class="${M.sq ? '' : 'on'}" data-mvset="sq" data-v="0">세로 (폰 화면)</button><button class="${M.sq ? 'on' : ''}" data-mvset="sq" data-v="1">정사각</button></div>
      <div class="mvopt"><span>음악</span><button class="${M.music ? 'on' : ''}" data-mvset="music" data-v="1">🎵 오르골 자장가</button><button class="${M.music ? '' : 'on'}" data-mvset="music" data-v="0">없음</button></div></section>
    ${ok ? `<button class="primary mvgo" data-mvset="make" ${ph.length ? '' : 'disabled'}>🎬 영상 만들기</button><p class="foot" style="text-align:center;margin-top:6px">영상 길이(약 ${Math.round(T)}초)만큼 걸려요. 만드는 동안 화면을 켜 두세요.</p>` : '<p class="vempty">이 폰(브라우저)에서는 영상 만들기를 쓸 수 없어요. 크롬이나 사파리 최신 버전에서 해 주세요.</p>'}
    <button class="secondary" data-mvset="close" style="width:100%;margin-top:12px">돌아가기</button>`;
}
function open(tpl) { if (tpl) M.tpl = tpl; S.view = 'movie'; render(); window.scrollTo(0, 0); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-mvset]'); if (!b) return;
  const v = b.dataset.v;
  switch (b.dataset.mvset) {
    case 'open': open(v); break;
    case 'close': S.view = ''; render(); window.scrollTo(0, 0); break;
    case 'tpl': M.tpl = v; render(); break;
    case 'speed': M.speed = +v; render(); break;
    case 'sq': M.sq = v === '1'; render(); break;
    case 'music': M.music = v === '1'; render(); break;
    case 'make': make(); break;
  }
});

const css = document.createElement('style');
css.textContent = `
.mvt{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mvt button{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;padding:12px;border-radius:16px;border:1.5px solid var(--line);background:#FFFDF7;min-height:84px}
.mvt b{font-family:var(--display);font-weight:400;font-size:16px;color:var(--navy)}.mvt small{font-size:12px;color:var(--muted);line-height:1.35}
.mvt button.on{border:2.5px solid var(--red);background:#FFF3EF}
.mvsb{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 8px}
.mvsb span{flex:0 0 auto;width:66px;display:flex;flex-direction:column;align-items:center;gap:3px}
.mvsb img,.mvsb i{width:66px;height:88px;border-radius:10px;object-fit:cover;background:var(--card2);display:grid;place-items:center;font-style:normal;font-size:26px}
.mvsb .title img,.mvsb .end img{outline:2px solid var(--butter)}.mvsb small{font-size:11px;color:var(--navy);text-align:center;line-height:1.2;max-width:66px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mvopt{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px}.mvopt span{font-size:13px;color:var(--muted);min-width:62px}
.mvopt button{border:1.5px solid var(--line);background:#fff;border-radius:99px;padding:6px 12px;font-size:13px;color:var(--navy);min-height:36px}.mvopt button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
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
