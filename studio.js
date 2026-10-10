// 기념 사진관 — 사진 한 장에 탐정 테마 틀·글씨·스티커·말풍선을 얹어 이미지로 저장·공유 (S.view='studio')
// 그림은 canvas로 그려요. Firebase 사진은 crossOrigin으로 불러와야 저장할 수 있어요 (Storage가 CORS * 허용, sw.js 사진 캐시도 cors로 받아 둠)
// 같이 쓰는 그림 도구 CV는 movie.js(성장 영상)·posecam.js(같은 포즈 촬영기)도 써요
(function () {
// ---------- 같이 쓰는 그림 도구 ----------
const CV = {};
const load1 = src => new Promise((res, rej) => { const im = new Image(); if (!/^(data|blob):/.test(src)) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('사진을 불러오지 못했어요')); im.src = src; });
// 예전에 일반 <img>로 받아 둔 사진이 canvas용으로 안 열리면 주소를 살짝 바꿔 한 번 더
CV.img = async src => { try { return await load1(src); } catch (e) { if (/^(data|blob):/.test(src)) throw e; return load1(src + (src.includes('?') ? '&' : '?') + 'cv=' + Date.now()); } };
// 사진을 칸에 꽉 차게 (z: 확대, fx·fy: 0~1 어느 쪽을 보여 줄지)
CV.cover = (ctx, im, x, y, w, h, z = 1, fx = .5, fy = .5) => {
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height; if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih) * z, dw = iw * s, dh = ih * s;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(im, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh); ctx.restore();
};
CV.rr = (ctx, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
CV.fonts = async (...ts) => { const t = ts.join(' ') + ' 0123456789.,·-kgcm일개월생후 기밀해제사건파일'; try { await Promise.all([document.fonts.load('40px Jua', t), document.fonts.load('40px "Gowun Dodum"', t)]); } catch (e) {} };
let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
// 크라프트지 바탕 (점·얼룩·가장자리 그늘)
CV.kraft = (ctx, W, H, c = '#EAD7B7') => {
  ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); seed = 7;
  for (let i = 0; i < 900; i++) { ctx.fillStyle = rnd() < .5 ? 'rgba(140,110,70,.10)' : 'rgba(255,255,255,.18)'; ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1 + rnd() * 3); }
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,60,30,.22)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
};
CV.tape = (ctx, cx, cy, w, h, rot, c = 'rgba(244,197,66,.78)') => {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-w / 2 + (i % 2 ? 4 : -2), -h / 2 + h * i / 6);
  ctx.lineTo(w / 2, h / 2); for (let i = 6; i >= 0; i--) ctx.lineTo(w / 2 + (i % 2 ? -4 : 2), -h / 2 + h * i / 6); ctx.closePath(); ctx.fill(); ctx.restore();
};
// 빨간 수사 도장
CV.stamp = (ctx, cx, cy, r, top, big, rot, c = '#B3261E') => {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180); ctx.globalAlpha = .9; ctx.strokeStyle = c; ctx.fillStyle = c;
  ctx.lineWidth = r * .07; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = r * .03; ctx.beginPath(); ctx.arc(0, 0, r * .84, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${Math.round(r * .26)}px Jua`; ctx.fillText(top, 0, -r * .36);
  ctx.font = `${Math.round(r * (big.length > 4 ? .34 : .44))}px Jua`; ctx.fillText(big, 0, r * .12);
  ctx.font = `${Math.round(r * .17)}px Jua`; ctx.fillText('★ 소은 탐정 ★', 0, r * .52); ctx.restore();
};
// 글자가 너비를 넘으면 줄 바꾸기 (띄어쓰기 우선, 없으면 글자 단위)
CV.wrap = (ctx, text, maxW) => {
  const out = []; let line = '';
  for (const w of String(text).split(/(\s+)/)) {
    if (ctx.measureText(line + w).width <= maxW) { line += w; continue; }
    if (line.trim()) { out.push(line.trim()); line = ''; }
    if (ctx.measureText(w).width <= maxW) { line = w.trimStart(); continue; }
    for (const ch of Array.from(w)) { if (ctx.measureText(line + ch).width > maxW) { out.push(line); line = ch; } else line += ch; }
  }
  if (line.trim()) out.push(line.trim()); return out;
};
CV.text = (ctx, t, x, y, font, color, align = 'center', maxW = 0) => { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; if (maxW && ctx.measureText(t).width > maxW) { const k = maxW / ctx.measureText(t).width; ctx.font = font.replace(/(\d+)px/, (m, n) => Math.floor(n * k) + 'px'); } ctx.fillText(t, x, y); };
CV.svgImg = svg => CV.img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')));
// 앱 안의 사진 목록 (최근 것부터)
CV.photos = () => {
  const L = [];
  (S.moments || []).forEach(m => { if (m.photo && safeImg(PHOTOS[m.id])) L.push({ id: m.id, date: m.date, type: m.type || 'first', title: m.type === 'month' ? m.title : (m.title || '') }); });
  (S.records || []).forEach(r => { if (r.photo && safeImg(PHOTOS[r.id])) L.push({ id: r.id, date: r.date, type: 'rec', title: '' }); });
  L.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  if (safeImg(PHOTOS.profile)) L.push({ id: 'profile', date: S.profile.birth, type: 'profile', title: '프로필' });
  return L;
};
// 그날까지 마지막 키·몸무게
CV.stats = d => {
  const R = (S.records || []).filter(r => r.date <= d).sort((a, b) => a.date < b.date ? 1 : -1);
  const w = R.find(r => r.weight != null && r.weight !== ''), h = R.find(r => r.height != null && r.height !== '');
  return [w ? `몸무게 ${fmt('weight', w.weight)}kg` : '', h ? `키 ${fmt('height', h.height)}cm` : ''].filter(Boolean).join(' · ');
};
CV.nick = () => { const n = ((S.profile && S.profile.name) || '우리 아기').replace(/^[가-힣](?=[가-힣]{2}$)/, ''); const c = n.charCodeAt(n.length - 1); return n + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '이' : ''); };
CV.dot = d => d.replace(/-/g, '.');
// 오늘이 기념일이거나 3일 안에 오면 그날 (100일마다·돌), 매달 그날이면 N개월, 아니면 오늘
CV.occasion = () => {
  const t = today(), b = S.profile.birth, L = [];
  for (let k = 100; k <= 1500; k += 100) L.push({ d: addDays(b, k - 1), t: k + '일' });
  for (let y = 1; y <= 4; y++) L.push({ d: addMonths(b, 12 * y), t: y === 1 ? '첫 돌' : y + '돌' });
  const near = L.filter(x => x.d >= t && daysBetween(t, x.d) <= 3).sort((a, c) => a.d < c.d ? -1 : 1)[0];
  if (near) return { label: near.t, date: near.d, soon: near.d !== t };
  const [mo] = monthsDays(b, t);
  if (mo > 0 && addMonths(b, mo) === t) return { label: mo + '개월', date: t };
  return { label: '', date: t };
};
// 공유(카톡 등) — 안 되면 저장
CV.share = async (blob, name, title) => {
  const f = new File([blob], name, { type: blob.type });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title }); return 'shared'; } } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  CV.save(blob, name); return 'saved';
};
CV.save = (blob, name) => { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; a.hidden = true; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 60000); };
window.CV = CV;

// ---------- 사진관 ----------
const STK = ['🎉', '🎂', '👑', '💖', '⭐', '🍼', '🧸', '🌸', '🎈', '🔍', '🌰', '🐿️', '💯', '🎀', '🌙', '☀️', '🥳', '👶', '🍀', '🦄'];
const TPL = [['stamp', '탐정 도장'], ['polaroid', '폴라로이드'], ['file', '사건 파일'], ['film', '필름'], ['clean', '깔끔하게']];
const ST = { src: '', key: '', tpl: 'stamp', sq: false, title: '', sub: '', stats: true, stickers: [], bubble: '', bx: .26, by: .12, sel: -1, img: null, loading: false, oc: null };
const WH = () => [1080, ST.sq ? 1080 : 1350];

function open(key) {
  const oc = CV.occasion(), d = oc.date;
  ST.oc = oc; ST.key = key || ''; ST.src = key ? safeImg(PHOTOS[key]) : '';
  if (!ST.src) { const L = CV.photos(), m = L.find(x => x.type === 'month') || L[0]; if (m) { ST.key = m.id; ST.src = safeImg(PHOTOS[m.id]); } }
  ST.title = oc.label ? `${CV.nick()} ${oc.label}` : `${CV.nick()} 생후 ${dayNo(d)}일`;
  ST.sub = oc.label && !/^생후/.test(oc.label) ? `${CV.dot(d)} · 생후 ${dayNo(d)}일` : CV.dot(d);
  ST.stickers = oc.label ? [{ e: '🎉', x: .85, y: .09, s: 120, r: 12 }, { e: '💖', x: .13, y: .63, s: 90, r: -10 }] : []; // 왼쪽 위는 '사건 파일' 글씨 자리라 비워 둠
  ST.bubble = ''; ST.sel = -1; ST.img = null;
  S.view = 'studio'; render(); window.scrollTo(0, 0);
}

// 틀마다 사진 칸 위치와 꾸밈
function drawTpl(ctx, W, H, im) {
  const tq = H > W, title = ST.title, sub = ST.sub, stat = ST.stats ? CV.stats(ST.oc ? ST.oc.date : today()) : '', lab = (ST.oc && ST.oc.label) || `${dayNo(today())}일`;
  if (ST.tpl === 'clean') {
    ctx.fillStyle = '#1F2A44'; ctx.fillRect(0, 0, W, H); if (im) CV.cover(ctx, im, 0, 0, W, H);
    const g = ctx.createLinearGradient(0, H * .55, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(15,20,35,.78)'); ctx.fillStyle = g; ctx.fillRect(0, H * .55, W, H * .45);
    CV.rr(ctx, 40, 40, 360, 64, 32); ctx.fillStyle = 'rgba(255,253,247,.88)'; ctx.fill(); CV.text(ctx, '🔍 소은 탐정 수사 일지', 220, 84, '30px "Gowun Dodum"', '#1F2A44');
    CV.text(ctx, title, W / 2, H - (stat ? 210 : 160), '104px Jua', '#fff', 'center', W - 120);
    CV.text(ctx, sub, W / 2, H - (stat ? 140 : 90), '42px "Gowun Dodum"', 'rgba(255,255,255,.92)', 'center', W - 120);
    if (stat) CV.text(ctx, stat, W / 2, H - 80, '36px "Gowun Dodum"', 'rgba(255,255,255,.85)', 'center', W - 120);
    return;
  }
  if (ST.tpl === 'film') {
    ctx.fillStyle = '#161616'; ctx.fillRect(0, 0, W, H);
    for (const y of [24, H - 64]) for (let x = 22; x < W; x += 74) { CV.rr(ctx, x, y, 40, 40, 8); ctx.fillStyle = '#F5EFE3'; ctx.fill(); }
    const py = 112, ph = H - (tq ? 400 : 330); if (im) CV.cover(ctx, im, 50, py, W - 100, ph); ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.strokeRect(50, py, W - 100, ph);
    CV.text(ctx, CV.dot(ST.oc ? ST.oc.date : today()).slice(2), W - 90, py + ph - 30, '44px Jua', '#F4A340', 'right');
    CV.text(ctx, title, W / 2, py + ph + 110, '92px Jua', '#FFF8EC', 'center', W - 120);
    CV.text(ctx, [sub, stat].filter(Boolean).join('  ·  '), W / 2, py + ph + 172, '36px "Gowun Dodum"', '#CFC6B6', 'center', W - 120);
    return;
  }
  if (ST.tpl === 'polaroid') {
    ctx.fillStyle = '#FCEBE6'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(244,156,156,.22)'; ctx.lineWidth = 26; for (let x = 13; x < W; x += 78) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 13; y < H; y += 78) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const cw = W - 150, chh = H - (tq ? 170 : 130), cx = W / 2, cy = H / 2 + 6;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(1.6 * Math.PI / 180); ctx.shadowColor = 'rgba(80,50,40,.28)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; ctx.fillStyle = '#FFFDF8'; ctx.fillRect(-cw / 2, -chh / 2, cw, chh); ctx.shadowColor = 'transparent';
    const pw = cw - 70, ph = chh - (tq ? 270 : 240); if (im) CV.cover(ctx, im, -cw / 2 + 35, -chh / 2 + 35, pw, ph);
    CV.text(ctx, title, 0, -chh / 2 + 35 + ph + 112, '88px Jua', '#1F2A44', 'center', cw - 80);
    CV.text(ctx, [sub, stat].filter(Boolean).join('  ·  '), 0, -chh / 2 + 35 + ph + 172, '34px "Gowun Dodum"', '#8C7458', 'center', cw - 80);
    ctx.restore(); CV.tape(ctx, W / 2, 62, 220, 58, -3, 'rgba(244,156,184,.75)');
    return;
  }
  if (ST.tpl === 'file') {
    ctx.fillStyle = '#1F2A44'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < W + H; i += 46) { ctx.save(); ctx.translate(i, 0); ctx.rotate(Math.PI / 4); ctx.fillRect(0, 0, 14, H * 2); ctx.restore(); }
    const fx = 60, fy = 120, fw = W - 120, fh = H - 180;
    ctx.fillStyle = '#D9BC8C'; CV.rr(ctx, fx, fy - 54, 330, 90, 18); ctx.fill(); CV.rr(ctx, fx, fy, fw, fh, 22); ctx.fill();
    CV.text(ctx, `CASE No.${fileNo()}`, fx + 165, fy - 10, '38px Jua', '#5C4126');
    const pw = fw - 120, ph = fh - (tq ? 330 : 280), px = fx + 60, py = fy + 60;
    ctx.save(); ctx.translate(px + pw / 2, py + ph / 2); ctx.rotate(-1.5 * Math.PI / 180); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 18; ctx.fillRect(-pw / 2 - 14, -ph / 2 - 14, pw + 28, ph + 28); ctx.shadowColor = 'transparent';
    if (im) CV.cover(ctx, im, -pw / 2, -ph / 2, pw, ph); ctx.restore();
    ctx.strokeStyle = '#9AA5B1'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px + 70, py - 40); ctx.lineTo(px + 70, py + 90); ctx.arc(px + 92, py + 90, 22, Math.PI, 0, true); ctx.lineTo(px + 114, py - 20); ctx.arc(px + 96, py - 20, 18, 0, Math.PI, true); ctx.lineTo(px + 78, py + 70); ctx.stroke();
    CV.stamp(ctx, fx + fw - 150, py + ph - 20, 112, '기밀 해제', lab, -13);
    CV.rr(ctx, fx + 50, py + ph + 52, fw - 100, tq ? 190 : 150, 16); ctx.fillStyle = '#FFFDF7'; ctx.fill();
    CV.text(ctx, title, W / 2, py + ph + (tq ? 142 : 128), '84px Jua', '#1F2A44', 'center', fw - 160);
    CV.text(ctx, [sub, stat].filter(Boolean).join('  ·  '), W / 2, py + ph + (tq ? 206 : 180), '34px "Gowun Dodum"', '#6B5F52', 'center', fw - 160);
    return;
  }
  // stamp: 크라프트지 + 테이프 붙인 사진 + 빨간 도장
  CV.kraft(ctx, W, H);
  CV.text(ctx, `사건 파일 No.${fileNo()} · 증거 사진`, 70, 78, '32px "Gowun Dodum"', '#8C7458', 'left');
  const pw = W - 170, ph = H - (tq ? 420 : 330), cx = W / 2, cy = 112 + ph / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-1.2 * Math.PI / 180); ctx.shadowColor = 'rgba(60,40,20,.3)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; ctx.fillStyle = '#FFFDF8'; ctx.fillRect(-pw / 2 - 20, -ph / 2 - 20, pw + 40, ph + 40); ctx.shadowColor = 'transparent';
  if (im) CV.cover(ctx, im, -pw / 2, -ph / 2, pw, ph); ctx.restore();
  CV.tape(ctx, cx - pw / 2 + 30, cy - ph / 2 - 6, 170, 52, -28); CV.tape(ctx, cx + pw / 2 - 30, cy - ph / 2 - 6, 170, 52, 26);
  CV.stamp(ctx, W - 175, cy + ph / 2 - 50, 118, '기밀 해제', lab, -14);
  const ty = cy + ph / 2 + (tq ? 140 : 112);
  CV.text(ctx, title, W / 2, ty, '100px Jua', '#1F2A44', 'center', W - 120);
  CV.text(ctx, sub, W / 2, ty + 66, '40px "Gowun Dodum"', '#6B5F52', 'center', W - 120);
  if (stat && tq) CV.text(ctx, stat, W / 2, ty + 120, '36px "Gowun Dodum"', '#8C7458', 'center', W - 120);
}
function drawStickers(ctx, W, H, preview) {
  ST.stickers.forEach((s, i) => {
    ctx.save(); ctx.translate(s.x * W, s.y * H); ctx.rotate((s.r || 0) * Math.PI / 180); ctx.font = `${s.s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.e, 0, 0);
    if (preview && ST.sel === i) { ctx.setLineDash([12, 8]); ctx.strokeStyle = '#B3261E'; ctx.lineWidth = 5; ctx.strokeRect(-s.s * .62, -s.s * .62, s.s * 1.24, s.s * 1.24); }
    ctx.restore();
  });
  ST.bubRect = null;
  if (ST.bubble) {
    ctx.font = '46px "Gowun Dodum"'; const lines = CV.wrap(ctx, ST.bubble, W * .5), lh = 58, w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 64, h = lines.length * lh + 44;
    const x = Math.max(10, Math.min(W - w - 10, ST.bx * W - w / 2)), y = Math.max(10, Math.min(H - h - 50, ST.by * H - h / 2));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6; ctx.fillStyle = '#FFFDF8'; CV.rr(ctx, x, y, w, h, 36); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 70, y + h - 2); ctx.lineTo(x + 52, y + h + 42); ctx.lineTo(x + 118, y + h - 2); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#1F2A44'; ctx.lineWidth = 4; CV.rr(ctx, x, y, w, h, 36); ctx.stroke();
    ctx.fillStyle = '#1F2A44'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; lines.forEach((l, i) => ctx.fillText(l, x + 32, y + 22 + lh * (i + 1) - 14));
    if (preview && ST.sel === 'b') { ctx.setLineDash([12, 8]); ctx.strokeStyle = '#B3261E'; ctx.strokeRect(x - 8, y - 8, w + 16, h + 16); ctx.setLineDash([]); }
    ST.bubRect = [x, y, w, h];
  }
}
async function drawAll(ctx, preview) {
  const [W, H] = WH(); await CV.fonts(ST.title, ST.sub, ST.bubble);
  ctx.save(); ctx.clearRect(0, 0, W, H); drawTpl(ctx, W, H, ST.img); ctx.restore(); drawStickers(ctx, W, H, preview);
}
let drawing = 0;
async function redraw() {
  if (!document.getElementById('stcv')) return;
  if (ST.src && (!ST.img || ST.img.__src !== ST.src)) {
    // 불러오는 중이면 끝난 뒤 한 번 더 그림 (그사이 화면을 다시 그려 canvas가 바뀌어도 새 canvas에)
    if (ST.loading) { ST.again = true; return; } ST.loading = true; const want = ST.src;
    try { const im = await CV.img(want); im.__src = want; if (ST.src === want) ST.img = im; } catch (e) { toast('사진을 불러오지 못했어요. 인터넷을 확인해 주세요'); ST.img = null; }
    ST.loading = false; if (ST.again) { ST.again = false; if (ST.src && ST.img && ST.img.__src !== ST.src) return redraw(); }
  }
  const n = ++drawing; await CV.fonts(ST.title, ST.sub, ST.bubble); if (n !== drawing) return;
  const c = document.getElementById('stcv'); if (!c) return;
  const [W, H] = WH(); if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  await drawAll(c.getContext('2d'), true);
}
const later = (() => { let f = 0; return () => { cancelAnimationFrame(f); f = requestAnimationFrame(redraw); }; })();

function render_() {
  const L = CV.photos().slice(0, 40), sel = ST.sel;
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>기념 사진관</h1><p>사진에 탐정 틀·글씨·스티커를 얹어 기념 사진을 만들어요. 카톡으로 바로 보낼 수 있어요.</p></header>
    <div class="stwrap"><canvas id="stcv" class="stcv" width="1080" height="${ST.sq ? 1080 : 1350}" aria-label="기념 사진 미리 보기"></canvas>
      <div class="stsel" id="st-sel">${selBar()}</div></div>
    <section><h2 class="sh"><span>📷 사진 고르기</span><span>${L.length}장</span></h2>
      <div class="stph"><button class="stpf" data-st="file">📱<b>폰에서</b></button>${L.map(p => `<button class="${p.id === ST.key ? 'on' : ''}" data-st="photo" data-id="${p.id}"><img src="${safeImg(PHOTOS[p.id])}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div></section>
    <section><h2 class="sh"><span>🖼️ 틀</span><span class="stratio"><button class="${ST.sq ? '' : 'on'}" data-st="ratio" data-v="45">세로</button><button class="${ST.sq ? 'on' : ''}" data-st="ratio" data-v="11">정사각</button></span></h2>
      <div class="chips">${TPL.map(([k, l]) => `<button class="chip${ST.tpl === k ? ' on' : ''}" data-st="tpl" data-v="${k}">${l}</button>`).join('')}</div></section>
    <section><h2 class="sh"><span>✏️ 글씨</span></h2>
      <label class="field"><span>큰 글씨</span><input id="st-title" maxlength="24" value="${esc(ST.title)}"></label>
      <label class="field"><span>작은 글씨</span><input id="st-sub" maxlength="40" value="${esc(ST.sub)}"></label>
      <label class="check"><input type="checkbox" id="st-stats" ${ST.stats ? 'checked' : ''}> 몸무게·키 넣기 <small style="color:var(--muted)">${esc(CV.stats(ST.oc ? ST.oc.date : today()) || '기록 없음')}</small></label>
      <label class="field"><span>말풍선 (선택)</span><input id="st-bub" maxlength="30" value="${esc(ST.bubble)}" placeholder="예: 수사는 내가 할게!"></label></section>
    <section><h2 class="sh"><span>🌟 스티커</span><span>눌러서 붙이고, 사진 위에서 끌어 옮겨요</span></h2>
      <div class="stk">${STK.map(e => `<button data-st="stk" data-v="${e}">${e}</button>`).join('')}</div></section>
    <div class="stact"><button class="primary" data-st="share">📤 카톡으로 보내기</button><button class="secondary" data-st="save">💾 저장</button><button class="secondary" data-st="album">🗂 사건 앨범에 넣기</button></div>
    <button class="secondary" data-st="close" style="width:100%;margin-top:10px">돌아가기</button>`;
}
function selBar() {
  if (ST.sel === 'b') return `<span>말풍선</span><button data-st="bdel">지우기</button>`;
  const s = ST.stickers[ST.sel]; if (!s) return `<small>스티커나 말풍선을 누르면 크기·돌리기·지우기를 할 수 있어요</small>`;
  return `<span>${s.e}</span><button data-st="ssz" data-v="-1">작게</button><button data-st="ssz" data-v="1">크게</button><button data-st="srot">돌리기</button><button data-st="sdel">지우기</button>`;
}
const updSel = () => { const el = document.getElementById('st-sel'); if (el) el.innerHTML = selBar(); };
function mount() { later(); }

async function exportBlob() {
  const [W, H] = WH(), c = document.createElement('canvas'); c.width = W; c.height = H;
  if (ST.src && !ST.img) await redraw();
  await drawAll(c.getContext('2d'), false);
  return new Promise((res, rej) => { try { c.toBlob(b => b ? res(b) : rej(new Error('만들지 못했어요')), 'image/jpeg', .92); } catch (e) { rej(e); } });
}
const fname = () => `${CV.nick()}_${((ST.oc && ST.oc.label) || dayNo(today()) + '일').replace(/\s/g, '')}_${today().replace(/-/g, '')}.jpg`;

// 폰 사진 고르기 칸은 body에 (파일 창에서 돌아올 때 화면을 다시 그려도 안 사라지게)
const picker = document.createElement('input'); picker.type = 'file'; picker.accept = 'image/*'; picker.hidden = true; document.body.appendChild(picker);
picker.addEventListener('change', () => { const f = picker.files[0]; picker.value = ''; if (!f) return; ST.key = ''; ST.src = URL.createObjectURL(f); ST.img = null; render(); });

document.addEventListener('input', e => {
  if (S.view !== 'studio') return;
  const id = e.target.id;
  if (id === 'st-title') ST.title = e.target.value; else if (id === 'st-sub') ST.sub = e.target.value; else if (id === 'st-bub') { ST.bubble = e.target.value; } else if (id === 'st-stats') ST.stats = e.target.checked; else return;
  later();
});
document.addEventListener('change', e => { if (S.view === 'studio' && e.target.id === 'st-stats') { ST.stats = e.target.checked; later(); } });
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-st]'); if (!b) return;
  const v = b.dataset.v;
  switch (b.dataset.st) {
    case 'open': open(b.dataset.id || ''); break;
    case 'close': S.view = ''; render(); window.scrollTo(0, 0); break;
    case 'file': picker.click(); break;
    case 'photo': ST.key = b.dataset.id; ST.src = safeImg(PHOTOS[b.dataset.id]); ST.img = null; document.querySelectorAll('.stph .on').forEach(x => x.classList.remove('on')); b.classList.add('on'); later(); break;
    case 'tpl': ST.tpl = v; document.querySelectorAll('[data-st=tpl]').forEach(x => x.classList.toggle('on', x === b)); later(); break;
    case 'ratio': ST.sq = v === '11'; render(); break;
    case 'stk': ST.stickers.push({ e: v, x: .3 + Math.random() * .4, y: .25 + Math.random() * .3, s: 130, r: Math.round(Math.random() * 30 - 15) }); ST.sel = ST.stickers.length - 1; updSel(); later(); break;
    case 'ssz': { const s = ST.stickers[ST.sel]; if (s) { s.s = Math.max(50, Math.min(420, s.s * (v === '1' ? 1.2 : 1 / 1.2))); later(); } break; }
    case 'srot': { const s = ST.stickers[ST.sel]; if (s) { s.r = ((s.r || 0) + 20) % 360; later(); } break; }
    case 'sdel': ST.stickers.splice(ST.sel, 1); ST.sel = -1; updSel(); later(); break;
    case 'bdel': ST.bubble = ''; ST.sel = -1; const bi = document.getElementById('st-bub'); if (bi) bi.value = ''; updSel(); later(); break;
    case 'save': case 'share': case 'album': {
      b.disabled = true;
      try {
        const blob = await exportBlob(), n = fname();
        if (b.dataset.st === 'save') { CV.save(blob, n); toast('사진을 저장했어요'); }
        else if (b.dataset.st === 'share') { const r = await CV.share(blob, n, ST.title); if (r === 'saved') toast('공유가 안 되는 폰이라 저장했어요'); }
        else { ALBUM.queue([new File([blob], n, { type: 'image/jpeg', lastModified: Date.now() })]); }
        if (window.GAME) GAME.mark('studio');
      } catch (x) { toast((x && x.name === 'SecurityError') ? '사진을 다시 불러온 뒤 해 주세요 (인터넷 확인)' : '만들지 못했어요: ' + ((x && x.message) || '')); }
      b.disabled = false; break;
    }
  }
});

// 스티커·말풍선 끌기: 손가락은 touch(스티커 위에서만 화면 스크롤 막기), 마우스는 pointer
let dg = null;
const pt = (c, x, y) => { const r = c.getBoundingClientRect(), [W, H] = WH(); return [(x - r.left) / r.width * W, (y - r.top) / r.height * H]; };
function hit(x, y) {
  const [W, H] = WH();
  if (ST.bubRect) { const [bx, by, bw, bh] = ST.bubRect; if (x >= bx && x <= bx + bw && y >= by && y <= by + bh + 40) return 'b'; }
  for (let i = ST.stickers.length - 1; i >= 0; i--) { const s = ST.stickers[i]; if (Math.hypot(x - s.x * W, y - s.y * H) < s.s * .62) return i; }
  return -1;
}
function start(c, cx, cy) {
  const [x, y] = pt(c, cx, cy), h = hit(x, y), [W, H] = WH();
  ST.sel = h; updSel(); later(); if (h === -1) return false;
  const o = h === 'b' ? { x: ST.bx * W, y: ST.by * H } : { x: ST.stickers[h].x * W, y: ST.stickers[h].y * H };
  dg = { c, h, dx: o.x - x, dy: o.y - y }; return true;
}
function move(cx, cy) {
  if (!dg) return; const [x, y] = pt(dg.c, cx, cy), [W, H] = WH(), nx = Math.max(0, Math.min(1, (x + dg.dx) / W)), ny = Math.max(0, Math.min(1, (y + dg.dy) / H));
  if (dg.h === 'b') { ST.bx = nx; ST.by = ny; } else { ST.stickers[dg.h].x = nx; ST.stickers[dg.h].y = ny; }
  later();
}
document.addEventListener('touchstart', e => { if (e.target.id !== 'stcv' || e.touches.length !== 1) return; if (start(e.target, e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault(); }, { passive: false });
document.addEventListener('touchmove', e => { if (!dg) return; e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
document.addEventListener('touchend', () => { dg = null; });
document.addEventListener('mousedown', e => { if (e.target.id === 'stcv' && start(e.target, e.clientX, e.clientY)) e.preventDefault(); });
document.addEventListener('mousemove', e => { if (dg) move(e.clientX, e.clientY); });
document.addEventListener('mouseup', () => { dg = null; });

const css = document.createElement('style');
css.textContent = `
.stwrap{position:sticky;top:0;z-index:3;background:var(--paper);padding:6px 0 4px;margin:0 -6px;border-bottom:1.5px dashed var(--line)}
.stcv{display:block;width:min(70vw,330px);height:auto;margin:0 auto;border-radius:14px;box-shadow:0 6px 18px rgba(43,38,34,.22);background:#EAD7B7}
.stsel{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;min-height:40px;margin-top:6px}
.stsel span{font-size:22px}.stsel small{font-size:12px;color:var(--muted)}.stsel button{min-height:34px;padding:4px 12px;border-radius:99px;border:1.5px solid var(--line);background:#fff;font-size:13px;color:var(--navy)}
.stph{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 6px}
.stph button{flex:0 0 auto;width:72px;height:72px;border-radius:12px;overflow:hidden;border:2px solid transparent;padding:0;background:var(--card2)}
.stph button.on{border-color:var(--red);box-shadow:0 0 0 2px #fff inset}.stph img{width:100%;height:100%;object-fit:cover;display:block}
.stph .stpf{display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:22px;border:1.5px dashed var(--line);background:#FFFDF7}.stpf b{font-size:11px;color:var(--navy)}
.stratio{display:flex;gap:4px}.stratio button{border:1.5px solid var(--line);background:#fff;border-radius:99px;font-size:12px;padding:3px 10px;color:var(--navy)}.stratio button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.stk{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:4px}.stk button{aspect-ratio:1;border:0;background:#FFFDF7;border-radius:10px;font-size:22px;padding:0}
.mbtns{display:flex;gap:8px}.mbtns .storybtn{flex:1;min-width:0;font-size:14px}.mbtns .storybtn.pose{background:linear-gradient(90deg,#9CC4E4,#7FC4E8)}
.anniv{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 4px;padding:12px 14px;border-radius:18px;background:linear-gradient(120deg,#FFF3DD,#FCE1E4);border:1.5px solid #F6C9D6;box-shadow:0 3px 0 rgba(224,122,154,.18)}
.anb{font-size:30px}.ant{flex:1;min-width:150px;display:flex;flex-direction:column}.ant b{font-family:var(--display);font-weight:400;font-size:19px;color:var(--navy)}.ant small{font-size:12.5px;color:#8C7458}
.anbt{display:flex;gap:6px;width:100%}.anbt button{flex:1;min-height:42px;border-radius:99px;border:0;background:var(--navy);color:#fff;font-size:14px}.anbt button+button{background:var(--red)}
.stact{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.stact .primary{grid-column:1/-1;min-height:52px;font-size:16px}`;
document.head.appendChild(css);

window.STUDIO = { open, render: render_, mount };
})();
