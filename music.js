// 영상 음악 — WebAudio로 직접 연주해요 (음악 파일 없이, 저작권 걱정 없이: 직접 만든 곡 + 저작권이 끝난 옛 멜로디)
// 요즘 영상 느낌(2026.10.11 사용자 요청 '오르골은 촌스러워'): 시네마틱 성장기(펠트 피아노+현악 패드+심장 박동) · 로파이 오후(일렉 피아노+붐뱁 드럼+LP 잡음) · 산뜻한 어쿠스틱(우쿨렐레 스트럼=카플러스-스트롱+박수+글로켄) · 꿈결 앰비언트
// 예전 곡: 따뜻한 피아노(파헬벨 카논 진행) · 포근한 자장가 · 반짝반짝 작은 별 · 산책 피크닉 · 꼬마 탐정 테마 · 행복한 행진(환희의 송가) · 생일 축하해
// 📁 내 음악: 폰의 음악 파일을 이 폰 IndexedDB(soeun-music)에 두고 <audio>로 흘려 녹음 (곡 저작권은 고른 사람 몫)
// MUSIC.play(ac, 출력(들), id, 길이초) → { stop }: 1.5초 앞까지만 조금씩 예약해서 녹화 중에도 가벼워요. MUSIC.pick(영상 종류) 추천, MUSIC.preview(id) 10초 미리 듣기
(function () {
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = s => { const m = /^([A-G])(#|b)?(\d)$/.exec(s); return m ? 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) : 0; };
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
// 멜로디 "C5:2 D5 R:.5" (음:박, 박 생략=1, R=쉼표) · 화음 "C G:2 Am7" (이름:박, 박 생략=마디 길이)
const mel = s => s.trim().split(/\s+/).map(t => { const [n, d] = t.split(':'); return [n === 'R' ? 0 : midi(n), +(d || 1)]; });
const chords = (s, beats) => s.trim().split(/\s+/).map(t => { const [n, d] = t.split(':'); return [n, +(d || beats)]; });
function tones(name) {
  const m = /^([A-G])(#|b)?(m)?(7)?$/.exec(name) || [];
  const r = 48 + NOTE[m[1] || 'C'] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), L = [r, r + (m[3] ? 3 : 4), r + 7];
  if (m[4]) L.push(r + 10);
  return L;
}

// 새 곡용 화음: n = 화음 음들(midi), b = 베이스
const cd = (n, b) => ({ n: n.map(midi), b: midi(b) });
const SONGS = {
  cine: { name: '🎬 시네마틱 성장기', desc: '피아노·현악, 뭉클하게', bpm: 72, beats: 4, style: 'cine', inst: 'felt', vel: .07, melFrom: 8,
    prog: [cd(['C4', 'E4', 'G4'], 'C3'), cd(['B3', 'D4', 'G4'], 'B2'), cd(['A3', 'C4', 'E4'], 'A2'), cd(['A3', 'C4', 'F4'], 'F2'), cd(['A3', 'C4', 'E4'], 'A2'), cd(['A3', 'C4', 'F4'], 'F2'), cd(['C4', 'E4', 'G4'], 'C3'), cd(['B3', 'D4', 'G4'], 'G2')],
    mel: mel('E5:2 D5 C5 D5:3 B4 C5:2 E5 A5 A5:3 G5 E5:2 C5:2 F5:2 E5 D5 E5:3 C5 D5:4') },
  lofi: { name: '☕ 로파이 오후', desc: '잔잔한 브이로그', bpm: 78, beats: 4, style: 'lofi', inst: 'ep', vel: .045, melFrom: 8, trem: true, crackle: true, duckMel: true,
    prog: [cd(['F3', 'A3', 'C4', 'E4', 'G4'], 'F2'), cd(['E3', 'G3', 'B3', 'D4'], 'E2'), cd(['D3', 'F3', 'A3', 'C4', 'E4'], 'D2'), cd(['C3', 'E3', 'G3', 'B3', 'D4'], 'C2')],
    mel: mel('R:1 E5:.5 G5:.5 A5:1.5 G5:.5 E5:2 D5:1 C5:1 R:1 A4:.5 C5:.5 D5:1.5 E5:.5 D5:3 R:1') },
  acou: { name: '🌤️ 산뜻한 어쿠스틱', desc: '우쿨렐레·박수, 경쾌하게', bpm: 110, beats: 4, style: 'acou', inst: 'bells', vel: .09, melFrom: 4,
    prog: [cd(['C4', 'E4', 'G4', 'C5'], 'C3'), cd(['A3', 'C4', 'E4', 'A4'], 'A2'), cd(['A3', 'C4', 'F4', 'A4'], 'F2'), cd(['B3', 'D4', 'G4', 'B4'], 'G2')],
    mel: mel('G5:.5 E5:.5 G5 A5 G5 E5:.5 C5:.5 E5 A4:2 A4:.5 C5:.5 F5 E5 C5 D5 E5:.5 D5:.5 B4:2') },
  dream: { name: '🌙 꿈결 앰비언트', desc: '포근하고 몽글몽글', bpm: 64, beats: 4, style: 'dream', inst: 'ep', vel: .03,
    prog: [cd(['C4', 'E4', 'G4', 'B4', 'D5'], 'C3'), cd(['A3', 'C4', 'E4', 'G4', 'B4'], 'A2'), cd(['F3', 'A3', 'C4', 'E4', 'G4'], 'F2'), cd(['G3', 'B3', 'D4', 'E4'], 'G2')], mel: [] },

  canon: { name: '🎹 따뜻한 피아노', desc: '잔잔하고 뭉클하게', bpm: 72, inst: 'piano', vel: .15, acc: 'arp', drums: '',
    ch: chords('D A Bm F#m G D G A', 4),
    mel: mel('F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 D5:2 C#5:2 B4:2 A4:2 G4:2 F#4:2 G4:2 E4:2 ' +
      'F#5 G5 F#5 E5 D5 E5 D5 C#5 B4 C#5 B4 A4 B4 A4 B4 C#5 D5 E5 D5 C#5 B4 C#5 B4 A4 G4 A4 G4 F#4 G4 F#4 E4:2') },
  lullaby: { name: '🌙 포근한 자장가', desc: '느린 3박자 오르골', bpm: 66, inst: 'box', vel: .17, acc: 'waltz', drums: '',
    ch: chords('F Dm Bb C F Bb C F', 3),
    mel: mel('A4:2 C5 D5:2 A4 Bb4:2 D5 C5:3 A4 C5 F5 D5:2 Bb4 G4 A4 Bb4 A4:3 ' +
      'C5:2 A4 F5:2 D5 D5 C5 Bb4 G4:3 A4:2 C5 Bb4 D5 F5 E5:2 G4 F4:3') },
  twinkle: { name: '⭐ 반짝반짝 작은 별', desc: '오르골', bpm: 96, inst: 'box', vel: .17, acc: 'harp', drums: '',
    ch: chords('C C F C F C G C C F C G C F C G C C F C F C G C', 2),
    mel: mel('C5 C5 G5 G5 A5 A5 G5:2 F5 F5 E5 E5 D5 D5 C5:2 G5 G5 F5 F5 E5 E5 D5:2 G5 G5 F5 F5 E5 E5 D5:2 C5 C5 G5 G5 A5 A5 G5:2 F5 F5 E5 E5 D5 D5 C5:2') },
  picnic: { name: '🌼 산책 피크닉', desc: '경쾌한 마림바', bpm: 116, inst: 'marimba', vel: .22, acc: 'bounce', drums: 'shaker',
    ch: chords('G C D G Em C D G C D Bm Em C D G G', 4),
    mel: mel('B4:.5 D5:.5 G5 D5:.5 B4:.5 D5 E5:.5 G5:.5 E5 C5 R F#5:.5 A5:.5 F#5 D5:.5 E5:.5 F#5 G5:2 D5 R ' +
      'B4:.5 E5:.5 G5 E5:.5 G5:.5 B5 A5 G5:.5 E5:.5 C5 E5 D5:.5 E5:.5 F#5 A5 F#5 G5:3 R ' +
      'G5:.5 E5:.5 C5 E5 G5 F#5:.5 E5:.5 D5 F#5 A5 B5:1.5 A5:.5 F#5 D5 E5:3 R ' +
      'E5:.5 F#5:.5 G5 E5 C5 D5:.5 E5:.5 F#5 A5 F#5 G5 D5 E5 F#5 G5:3 R') },
  detective: { name: '🕵️ 꼬마 탐정 테마', desc: '살금살금 수사 분위기', bpm: 104, inst: 'pluck', vel: .15, acc: 'walk', drums: 'brush',
    ch: chords('Dm Dm Gm A7 Dm Bb A7 Dm', 4),
    mel: mel('D4:.5 R:.5 F4:.5 R:.5 A4:.5 G#4:.5 A4 F4:.5 E4:.5 D4 R:2 G4:.5 R:.5 Bb4:.5 R:.5 D5:.5 C#5:.5 D5 C#5:.5 Bb4:.5 A4 R:2 ' +
      'A4:.5 G4:.5 F4:.5 E4:.5 D4 F4 D4:.5 F4:.5 Bb4 A4:.5 G4:.5 F4 E4:.5 F4:.5 G4:.5 E4:.5 C#4 A3 D4:2 R:2') },
  joy: { name: '🎉 행복한 행진', desc: '기념일 축하', bpm: 112, inst: 'bells', vel: .15, acc: 'march', drums: 'march',
    ch: chords('C G C G C G C C G G7 G C C G C C', 4),
    mel: mel('E5 E5 F5 G5 G5 F5 E5 D5 C5 C5 D5 E5 E5:1.5 D5:.5 D5:2 E5 E5 F5 G5 G5 F5 E5 D5 C5 C5 D5 E5 D5:1.5 C5:.5 C5:2 ' +
      'D5 D5 E5 C5 D5 E5:.5 F5:.5 E5 C5 D5 E5:.5 F5:.5 E5 D5 C5 D5 G4:2 E5 E5 F5 G5 G5 F5 E5 D5 C5 C5 D5 E5 D5:1.5 C5:.5 C5:2') },
  bday: { name: '🎂 생일 축하해', desc: '생일·돌', bpm: 100, inst: 'box', vel: .18, acc: 'waltz', drums: '',
    ch: chords('C:1 C:3 G:3 G:3 C:3 C:3 F:3 C:2 G:1 C:3'),
    mel: mel('G4:.75 G4:.25 A4 G4 C5 B4:2 G4:.75 G4:.25 A4 G4 D5 C5:2 G4:.75 G4:.25 G5 E5 C5 B4 A4 F5:.75 F5:.25 E5 C5 D5 C5:3') }
};
const ORDER = ['cine', 'lofi', 'acou', 'dream', 'canon', 'lullaby', 'twinkle', 'picnic', 'detective', 'joy', 'bday'];
const MODERN = ['cine', 'lofi', 'acou', 'dream'];

// ---------- 소리 ----------
let NOISE = null;
function noiseBuf(ac) { if (NOISE && NOISE.sampleRate === ac.sampleRate) return NOISE; const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (NOISE = b); }
function env(ac, t, a, d, v) { const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); return g; }
function osc(ac, type, f, t, end, dest, detune) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune; o.connect(dest); o.start(t); o.stop(end); }
function lp(ac, f0, t, f1, dt, q) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; if (t == null) f.frequency.value = f0; else f.frequency.setValueAtTime(f0, t);   // 시각 없이 부르면(베이스) 그냥 값으로 — 예전엔 여기서 멈춰 피크닉·탐정·행진 곡이 1초 만에 끊겼어요
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dt); if (q) f.Q.value = q; return f; }
function voice(ac, out, kind, m, t, d, v) {
  const f = hz(m);
  if (kind === 'box') { const L = Math.max(1.2, d * 1.5), g = env(ac, t, .01, L, v); g.connect(out); osc(ac, 'sine', f, t, t + L + .1, g); const g2 = ac.createGain(); g2.gain.value = .25; g2.connect(g); osc(ac, 'triangle', f * 2, t, t + L + .1, g2); return; }
  if (kind === 'piano') { const L = Math.min(2.8, d + 1.2), fl = lp(ac, 3200, t, 900, 1.2), g = env(ac, t, .006, L, v); fl.connect(g); g.connect(out); osc(ac, 'triangle', f, t, t + L + .1, fl); const g2 = ac.createGain(); g2.gain.value = .3; g2.connect(fl); osc(ac, 'sine', f * 2, t, t + L + .1, g2, 3); return; }
  if (kind === 'marimba') { const g = env(ac, t, .004, .5, v); g.connect(out); osc(ac, 'sine', f, t, t + .6, g); const g2 = env(ac, t, .002, .07, v * .45); g2.connect(out); osc(ac, 'sine', f * 4, t, t + .15, g2); return; }
  if (kind === 'pluck') { const fl = lp(ac, 2600, t, 320, .28, 2), g = env(ac, t, .004, Math.min(.5, d + .12), v); fl.connect(g); g.connect(out); osc(ac, 'sawtooth', f, t, t + .7, fl); return; }
  if (kind === 'bells') { const g = env(ac, t, .004, 1.6, v); g.connect(out); osc(ac, 'sine', f, t, t + 1.7, g); const g2 = env(ac, t, .002, .5, v * .35); g2.connect(out); osc(ac, 'sine', f * 2.76, t, t + .6, g2); const g3 = env(ac, t, .002, .25, v * .15); g3.connect(out); osc(ac, 'sine', f * 5.4, t, t + .3, g3); return; }
  if (kind === 'bass') { const fl = lp(ac, 700), g = env(ac, t, .01, Math.min(.9, d), v); fl.connect(g); g.connect(out); osc(ac, 'triangle', f, t, t + d + .2, fl); osc(ac, 'sine', f, t, t + d + .2, fl); return; }
  // 일렉 피아노(로즈 느낌): FM — 처음엔 쨍하고 금방 부드러워져요
  if (kind === 'ep') { const L = Math.min(3.2, d + 1.4), g = env(ac, t, .006, L, v), car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain();
    car.frequency.value = f; mod.frequency.value = f; mg.gain.setValueAtTime(f * 1.7, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, f * .12), t + .8);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(out); car.start(t); mod.start(t); car.stop(t + L + .1); mod.stop(t + L + .1);
    const g2 = env(ac, t, .002, .22, v * .22); g2.connect(out); osc(ac, 'sine', f * 7.1, t, t + .3, g2); return; }
  // 펠트 피아노: 부드러운 삼각파 + 살짝 어긋난 사인(코러스) + 해머 소리
  if (kind === 'felt') { const L = Math.min(4.5, d + 2.2), fl = lp(ac, 2400, t, 650, 1.8), g = env(ac, t, .01, L, v); fl.connect(g); g.connect(out);
    osc(ac, 'triangle', f, t, t + L + .1, fl); const g2 = ac.createGain(); g2.gain.value = .4; g2.connect(fl); osc(ac, 'sine', f, t, t + L + .1, g2, 7); const g3 = ac.createGain(); g3.gain.value = .14; g3.connect(fl); osc(ac, 'sine', f * 2, t, t + L + .1, g3, -5);
    const n = ac.createBufferSource(), hf = ac.createBiquadFilter(), hg = env(ac, t, .001, .045, v * .3); n.buffer = noiseBuf(ac); hf.type = 'bandpass'; hf.frequency.value = Math.min(5000, f * 3); n.connect(hf); hf.connect(hg); hg.connect(out); n.start(t, Math.random() * .5); n.stop(t + .07); return; }
  // 서브 베이스
  if (kind === 'sub') { const g = env(ac, t, .02, Math.min(1.8, d * .95), v); g.connect(out); osc(ac, 'sine', f, t, t + d + .15, g); const g2 = ac.createGain(); g2.gain.value = .18; g2.connect(g); osc(ac, 'triangle', f * 2, t, t + d + .15, g2); }
}
// 현악 패드: 살짝 어긋난 톱니파 셋을 천천히 열리는 필터로 (화음 하나를 길게)
function pad(ac, out, notes, t, dur, v) {
  const fl = ac.createBiquadFilter(), g = ac.createGain(); fl.type = 'lowpass'; fl.Q.value = .6; fl.frequency.setValueAtTime(500, t); fl.frequency.linearRampToValueAtTime(1500, t + dur * .6);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(1.3, dur * .45)); g.gain.setValueAtTime(v, t + dur - .05); g.gain.exponentialRampToValueAtTime(.0001, t + dur + 1.3);
  fl.connect(g); g.connect(out); notes.forEach(m => [-8, 0, 8].forEach(dt => osc(ac, 'sawtooth', hz(m), t, t + dur + 1.4, fl, dt)));
}
// 우쿨렐레: 카플러스-스트롱(잡음을 한 주기 길이로 되풀이하며 다듬기)으로 만든 뜯는 소리, 음마다 한 번 만들어 둬요
const KS = {};
function ksBuf(ac, m) {
  const k = ac.sampleRate + ':' + m; if (KS[k]) return KS[k];
  const sr = ac.sampleRate, N = Math.max(2, Math.round(sr / hz(m))), len = Math.floor(sr * 1.3), b = ac.createBuffer(1, len, sr), d = b.getChannelData(0);
  let p = 0; for (let i = 0; i < N; i++) { p = p * .5 + (Math.random() * 2 - 1) * .5; d[i] = p; }   // 부드러운 잡음 (나일론 줄)
  const damp = .995 - Math.min(.01, hz(m) / 80000);
  for (let i = N; i < len; i++) d[i] = damp * .5 * (d[i - N] + d[i - N + 1 < i ? i - N + 1 : i - N]);
  return (KS[k] = b);
}
function uke(ac, out, m, t, v) { const s = ac.createBufferSource(), fl = lp(ac, 3800), g = ac.createGain(); s.buffer = ksBuf(ac, m); g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(out); s.start(t); s.stop(t + 1.3); }
// LP 판 잡음 (로파이)
let CRK = null;
function crackleBuf(ac) {
  if (CRK && CRK.sampleRate === ac.sampleRate) return CRK;
  const len = ac.sampleRate * 3, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); let q = 0;
  for (let i = 0; i < len; i++) { q = q * .92 + (Math.random() * 2 - 1) * .08; d[i] = q * .05; if (Math.random() < .0004) d[i] += (Math.random() * 2 - 1) * .55; }
  return (CRK = b);
}
function drum(ac, out, kind, t, v) {
  if (kind === 'kick') { const o = ac.createOscillator(), g = env(ac, t, .003, .22, v); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + .18); o.connect(g); g.connect(out); o.start(t); o.stop(t + .3); return; }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(); s.buffer = noiseBuf(ac);
  if (kind === 'hat' || kind === 'shaker') { f.type = 'highpass'; f.frequency.value = kind === 'hat' ? 7000 : 5000; } else { f.type = 'bandpass'; f.frequency.value = kind === 'snare' ? 1800 : 1200; f.Q.value = .8; }
  const g = env(ac, t, .002, { shaker: .06, hat: .04, clap: .12, snare: .15 }[kind] || .1, v);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * .5); s.stop(t + .3);
}
// 반주 (화음 한 칸)
function accomp(ac, out, s, name, t, beats, spb, next) {
  const c = tones(name), r = c[0];
  if (s.acc === 'arp') { const P = [r, c[2], r + 12, c[1] + 12, c[2] + 12, c[1] + 12, r + 12, c[2]]; for (let k = 0; k < beats * 2; k++) voice(ac, out, 'piano', P[k % 8], t + k * spb / 2, spb * .9, k ? .045 : .065); return; }
  if (s.acc === 'waltz') { voice(ac, out, 'piano', r, t, spb * 1.5, .08); for (let b = 1; b < beats; b++) c.slice(0, 3).forEach(m => voice(ac, out, 'piano', m + 12, t + b * spb, spb * .8, .028)); return; }
  if (s.acc === 'harp') { voice(ac, out, 'piano', r, t, spb * beats * .9, .07); for (let b = 0; b < beats; b++) for (let j = 0; j < 3; j++) voice(ac, out, 'box', c[j] + 12, t + b * spb + spb * j / 3, .9, .035); return; }
  if (s.acc === 'bounce') { for (let b = 0; b < beats; b++) { voice(ac, out, 'bass', b % 2 ? c[2] : r, t + b * spb, spb * .8, .11); [c[1] + 12, c[2] + 12].forEach(m => voice(ac, out, 'marimba', m, t + b * spb + spb / 2, spb * .4, .04)); } return; }
  if (s.acc === 'walk') { const nr = tones(next || name)[0], W = [r, c[1], c[2], nr - 1]; for (let b = 0; b < beats; b++) { voice(ac, out, 'bass', W[b % 4], t + b * spb, spb * .85, .12); if (b % 2) c.slice(0, 3).forEach(m => voice(ac, out, 'piano', m + 12, t + b * spb, spb * .3, .022)); } return; }
  if (s.acc === 'march') { for (let b = 0; b < beats; b++) { voice(ac, out, 'bass', b % 2 ? c[2] : r, t + b * spb, spb * .7, .1); if (!(b % 2)) [r + 12, c[2] + 12].forEach(m => voice(ac, out, 'bells', m, t + b * spb, spb, .03)); } }
}
function drums(ac, out, s, t, beats, spb) {
  if (s.drums === 'shaker') for (let b = 0; b < beats; b++) { drum(ac, out, 'shaker', t + b * spb, .03); drum(ac, out, 'shaker', t + b * spb + spb / 2, .05); drum(ac, out, b % 2 ? 'clap' : 'kick', t + b * spb, b % 2 ? .05 : .13); }
  else if (s.drums === 'brush') for (let b = 0; b < beats; b++) { drum(ac, out, 'hat', t + b * spb, .04); drum(ac, out, 'hat', t + b * spb + spb * .66, .025); if (b % 2) drum(ac, out, 'snare', t + b * spb, .03); }
  else if (s.drums === 'march') for (let b = 0; b < beats; b++) { drum(ac, out, b % 2 ? 'snare' : 'kick', t + b * spb, b % 2 ? .06 : .14); drum(ac, out, 'hat', t + b * spb + spb / 2, .02); }
}
// 새 곡들의 한 마디 (i = 몇 번째 마디: 악기가 하나씩 더해져요)
const duckAt = (B, t) => { const g = B.duck.gain; g.setValueAtTime(1, t); g.linearRampToValueAtTime(.55, t + .015); g.linearRampToValueAtTime(1, t + .3); };
const STYLE = {
  cine(ac, B, ch, i, t, spb) {
    voice(ac, B.bus, 'felt', ch.b, t, spb * 4, .075);
    const a = [ch.n[0], ch.n[2], ch.n[0] + 12, ch.n[1] + 12, ch.n[2] + 12, ch.n[1] + 12, ch.n[0] + 12, ch.n[2]];
    a.forEach((m, k) => voice(ac, B.bus, 'felt', m, t + k * spb / 2, spb * .9, k ? .038 : .05));
    if (i >= 4) pad(ac, B.keys, ch.n.map(m => m + 12), t, spb * 4, .016);
    if (i >= 8) { drum(ac, B.bus, 'kick', t, .1); drum(ac, B.bus, 'kick', t + spb * .55, .06); duckAt(B, t); }   // 심장 박동
    if (i >= 12 && i % 2) voice(ac, B.bus, 'bells', ch.n[2] + 24, t + spb * 3, spb, .018);
  },
  lofi(ac, B, ch, i, t, spb) {
    const v = ch.n.map(m => m < 55 ? m + 12 : m);
    v.forEach((m, j) => voice(ac, B.keys, 'ep', m, t + j * .012, spb * 1.8, .06));
    v.slice(1).forEach((m, j) => voice(ac, B.keys, 'ep', m, t + spb * 2.5 + j * .01, spb * .8, .036));
    if (i < 2) return;   // 처음 두 마디는 피아노만
    voice(ac, B.bus, 'sub', ch.b, t, spb * 2.2, .2); voice(ac, B.bus, 'sub', ch.b + (i % 2 ? 7 : 12), t + spb * 3, spb * .9, .13);
    const st = spb / 4, sw = st * .3, K = i % 4 === 3 ? [0, 7, 10, 14] : [0, 7, 10];
    K.forEach(k => { drum(ac, B.bus, 'kick', t + k * st, .16); duckAt(B, t + k * st); });
    [4, 12].forEach(k => drum(ac, B.bus, 'snare', t + k * st, .07));
    for (let k = 0; k < 16; k += 2) drum(ac, B.bus, 'hat', t + k * st + (k % 4 === 2 ? sw : 0), k % 4 ? .018 : .028);
  },
  acou(ac, B, ch, i, t, spb) {
    const P = [[0, 1], [2, 1], [3, 0], [5, 0], [6, 1], [7, 0]];   // 다운 · 다운업 · 업다운업
    P.forEach(([p, dn]) => { const tt = t + p * spb / 2, L = dn ? ch.n : ch.n.slice().reverse(); L.forEach((m, j) => uke(ac, B.keys, m, tt + j * .013, dn ? .2 : .11)); });
    if (i >= 1) { voice(ac, B.bus, 'sub', ch.b, t, spb * 1.5, .15); voice(ac, B.bus, 'sub', ch.b, t + spb * 2, spb * 1.5, .12); }
    if (i >= 2) { [0, 2].forEach(b => drum(ac, B.bus, 'kick', t + b * spb, .13)); [1, 3].forEach(b => drum(ac, B.bus, 'clap', t + b * spb, .07)); for (let k = 0; k < 8; k++) drum(ac, B.bus, 'shaker', t + k * spb / 2, k % 2 ? .035 : .02); }
  },
  dream(ac, B, ch, i, t, spb) {
    pad(ac, B.keys, ch.n, t, spb * 4, .014);
    voice(ac, B.bus, 'sub', ch.b, t, spb * 3.6, .07);
    [0, 1.5, 3].forEach((bt, k) => voice(ac, B.bus, 'ep', ch.n[(k + i) % ch.n.length] + 12, t + bt * spb, spb * 1.6, .028));
    const pen = [0, 2, 4, 7, 9]; [0, 1].forEach(k => voice(ac, B.bus, 'bells', 84 + pen[(i * 3 + k * 2) % 5], t + (k * 2 + .75) * spb, .6, .011));
  }
};
function reverb(ac) {
  const len = Math.floor(ac.sampleRate * 2.2), b = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  const c = ac.createConvolver(); c.buffer = b; return c;
}

// ---------- 연주 ----------
// ---------- 📁 내 음악 (이 폰 IndexedDB soeun-music 에 파일째로) ----------
let MINE;   // { name, size } · null = 없음 · undefined = 아직 안 읽음
function mdb() { return new Promise((res, rej) => { const r = indexedDB.open('soeun-music', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function mineGet() { try { const db = await mdb(); return await new Promise(res => { const q = db.transaction('f').objectStore('f').get('mine'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (e) { return null; } }
async function mineSet(file) {
  if (!file || !/^audio\//.test(file.type || 'audio/') ) throw new Error('음악 파일을 골라 주세요');
  if (file.size > 40e6) throw new Error('음악 파일이 너무 커요 (40MB까지)');
  const db = await mdb(), blob = file.slice(0, file.size, file.type || 'audio/mpeg');
  await new Promise((res, rej) => { const tx = db.transaction('f', 'readwrite'); tx.objectStore('f').put({ name: file.name, type: file.type, size: file.size, blob, at: Date.now() }, 'mine'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  MINE = { name: file.name, size: file.size }; return MINE;
}
async function mineInfo() { if (MINE === undefined) { const r = await mineGet(); MINE = r ? { name: r.name, size: r.size } : null; } return MINE; }
// <audio>로 흘려서(긴 곡도 메모리 적게) 출력에 연결. 앞뒤는 부드럽게, 짧으면 되풀이. ready = 소리가 나기 시작할 때
function playMine(ac, outs, len) {
  let a = null, url = '', stopped = false; const g = ac.createGain(); g.gain.value = .0001;
  (Array.isArray(outs) ? outs : [outs]).forEach(o => { try { g.connect(o); } catch (e) {} });
  const ready = mineGet().then(r => {
    if (!r || stopped) return;
    url = URL.createObjectURL(r.blob); a = new Audio(); a.src = url; a.loop = true; a.preload = 'auto';
    ac.createMediaElementSource(a).connect(g);
    return a.play().then(() => { const t = ac.currentTime; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(1, t + .6); g.gain.setValueAtTime(1, t + Math.max(.7, len - 2)); g.gain.exponentialRampToValueAtTime(.0001, t + len); });
  }).catch(() => {});
  return { ready, stop() { stopped = true; try { g.gain.cancelScheduledValues(ac.currentTime); g.gain.setTargetAtTime(.0001, ac.currentTime, .08); } catch (e) {} setTimeout(() => { try { a && a.pause(); } catch (e) {} if (url) URL.revokeObjectURL(url); }, 450); } };
}
// ---------- 🎻 실제 연주 (위키미디어 공용의 퍼블릭 도메인·CC0 연주, music.yml이 music/에 넣어 둠) ----------
let REAL = null, realP = null;   // [{ id, name, desc, file, sec, title, artist, license, src }]
function loadReal() {
  if (realP) return realP;
  realP = fetch('music/tracks.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { REAL = (j && Array.isArray(j.tracks) ? j.tracks : []).filter(t => /^r-[a-z0-9-]+$/.test(t.id) && /^music\/r-[a-z0-9-]+\.mp3$/.test(t.file)); return REAL; }).catch(() => { REAL = []; realP = null; return REAL; });
  return realP;
}
const realOf = id => (REAL || []).find(t => t.id === id) || null;
// 파일을 통째로 받아(blob) <audio>로 흘려요 — 녹화 중 끊기지 않게. 곡보다 영상이 길면 되풀이
function playUrl(ac, outs, len, getBlob) {
  let a = null, url = '', stopped = false; const g = ac.createGain(); g.gain.value = .0001;
  (Array.isArray(outs) ? outs : [outs]).forEach(o => { try { g.connect(o); } catch (e) {} });
  const ready = getBlob().then(b => {
    if (!b || stopped) return;
    url = URL.createObjectURL(b); a = new Audio(); a.src = url; a.loop = true; a.preload = 'auto';
    ac.createMediaElementSource(a).connect(g);
    return a.play().then(() => { const t = ac.currentTime; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(1, t + .6); g.gain.setValueAtTime(1, t + Math.max(.7, len - 2)); g.gain.exponentialRampToValueAtTime(.0001, t + len); });
  }).catch(() => {});
  return { ready, stop() { stopped = true; try { g.gain.cancelScheduledValues(ac.currentTime); g.gain.setTargetAtTime(.0001, ac.currentTime, .08); } catch (e) {} setTimeout(() => { try { a && a.pause(); } catch (e) {} if (url) URL.revokeObjectURL(url); }, 450); } };
}
function play(ac, outs, id, len, ahead = 1.5) {
  if (id === 'mine' && ac) return playMine(ac, outs, len);
  if (realOf(id) && ac) { const t = realOf(id); return playUrl(ac, outs, len, () => fetch(t.file).then(r => r.ok ? r.blob() : null)); }
  const s = SONGS[id]; if (!s || !ac) return { stop() {} };
  const bus = ac.createGain(), dry = ac.createGain(), wet = ac.createGain(), rv = reverb(ac), comp = ac.createDynamicsCompressor(), master = ac.createGain();
  wet.gain.value = .22; bus.connect(dry); bus.connect(rv); rv.connect(wet); dry.connect(comp); wet.connect(comp); comp.connect(master);
  (Array.isArray(outs) ? outs : [outs]).forEach(o => { try { master.connect(o); } catch (e) {} });
  const T0 = ac.currentTime + .08, end = T0 + len, spb = 60 / s.bpm;
  master.gain.setValueAtTime(.0001, T0); master.gain.exponentialRampToValueAtTime(.9, T0 + .8);
  master.gain.setValueAtTime(.9, Math.max(T0 + .9, end - 2)); master.gain.exponentialRampToValueAtTime(.0001, end);
  // 새 곡: 건반·패드는 keys → duck(킥에 맞춰 살짝 숨 쉬기) → bus, 로파이는 트레몰로·LP 잡음
  const keys = ac.createGain(), duck = ac.createGain(), B = { bus, keys, duck }, extra = [];
  keys.connect(duck); duck.connect(bus);
  if (s.trem) { const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 4.3; lg.gain.value = .12; keys.gain.value = .88; lfo.connect(lg); lg.connect(keys.gain); lfo.start(T0); lfo.stop(end + 1); extra.push(lfo); }
  if (s.crackle) { const c = ac.createBufferSource(), hp = ac.createBiquadFilter(), cg = ac.createGain(); c.buffer = crackleBuf(ac); c.loop = true; hp.type = 'highpass'; hp.frequency.value = 900; cg.gain.value = .5; c.connect(hp); hp.connect(cg); cg.connect(comp); c.start(T0); c.stop(end + .5); extra.push(c); }
  if (s.style === 'acou') s.prog.forEach(ch => ch.n.forEach(m => ksBuf(ac, m)));   // 우쿨렐레 소리는 미리 만들어 둬요 (녹화 중 끊김 없게)
  let mi = 0, ci = 0, tm = T0 + (s.melFrom || 0) * (s.beats || 4) * spb, tc = T0;
  const tick = () => {
    const until = ac.currentTime + ahead;
    if (s.mel.length) while (tm < until && tm < end) { const [m, b] = s.mel[mi++ % s.mel.length]; if (m) voice(ac, s.duckMel ? keys : bus, s.inst, m, tm, b * spb, s.vel); tm += b * spb; }
    if (s.style) while (tc < until && tc < end) { STYLE[s.style](ac, B, s.prog[ci % s.prog.length], ci, tc, spb); ci++; tc += s.beats * spb; }
    else while (tc < until && tc < end) { const [n, b] = s.ch[ci % s.ch.length], nx = s.ch[(ci + 1) % s.ch.length][0]; ci++; accomp(ac, bus, s, n, tc, b, spb, nx); drums(ac, bus, s, tc, b, spb); tc += b * spb; }
  };
  tick(); const iv = setInterval(tick, 250);
  return { stop() { clearInterval(iv); try { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(.0001, ac.currentTime, .08); } catch (e) {} extra.forEach(x => { try { x.stop(ac.currentTime + .4); } catch (e) {} }); } };
}
// 영상 종류·기념일에 맞춰 고르기
function pick(tpl) {
  const t = today(), b = S.profile.birth;
  if (daysBetween(b, t) > 330) { for (let y = +t.slice(0, 4) - 1; y <= +t.slice(0, 4); y++) { const d = daysBetween(`${y}${b.slice(4)}`, t); if (d >= -3 && d <= 3) return 'bday'; } }
  if (tpl === 'd100') return dayNo(t) >= 100 ? 'acou' : 'dream';
  if (tpl === 'pose') return 'dream';
  if (tpl === 'month') return 'lofi';
  return 'cine';
}
// 미리 듣기 (10초)
let PV = null;
function stopPreview() { if (!PV) return; const p = PV; PV = null; clearTimeout(p.t); try { p.p.stop(); } catch (e) {} setTimeout(() => { try { p.ac.close(); } catch (e) {} }, 400); if (p.done) p.done(); }
function preview(id, done) {
  stopPreview(); if (!SONGS[id] && id !== 'mine' && !realOf(id)) return false;
  let ac; try { ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch (e) { return false; }
  PV = { ac, id, done, p: play(ac, ac.destination, id, 10) }; PV.t = setTimeout(stopPreview, 10300);
  return true;
}
window.MUSIC = { SONGS, ORDER, MODERN, play, pick, preview, stopPreview, playing: () => PV && PV.id, mineInfo, mineSet, mine: () => MINE, loadReal, real: () => REAL, realOf };
})();
