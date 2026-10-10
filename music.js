// 영상 음악 — WebAudio로 직접 연주해요 (음악 파일 없이, 저작권 걱정 없이: 직접 만든 곡 + 저작권이 끝난 옛 멜로디)
// 곡: 따뜻한 피아노(파헬벨 카논 진행) · 포근한 자장가(직접 만든 3박자) · 반짝반짝 작은 별 · 산책 피크닉(직접 만든 곡) · 꼬마 탐정 테마(직접 만든 곡) · 행복한 행진(환희의 송가) · 생일 축하해
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

const SONGS = {
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
const ORDER = ['canon', 'lullaby', 'twinkle', 'picnic', 'detective', 'joy', 'bday'];

// ---------- 소리 ----------
let NOISE = null;
function noiseBuf(ac) { if (NOISE && NOISE.sampleRate === ac.sampleRate) return NOISE; const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (NOISE = b); }
function env(ac, t, a, d, v) { const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); return g; }
function osc(ac, type, f, t, end, dest, detune) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune; o.connect(dest); o.start(t); o.stop(end); }
function lp(ac, f0, t, f1, dt, q) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dt); if (q) f.Q.value = q; return f; }
function voice(ac, out, kind, m, t, d, v) {
  const f = hz(m);
  if (kind === 'box') { const L = Math.max(1.2, d * 1.5), g = env(ac, t, .01, L, v); g.connect(out); osc(ac, 'sine', f, t, t + L + .1, g); const g2 = ac.createGain(); g2.gain.value = .25; g2.connect(g); osc(ac, 'triangle', f * 2, t, t + L + .1, g2); return; }
  if (kind === 'piano') { const L = Math.min(2.8, d + 1.2), fl = lp(ac, 3200, t, 900, 1.2), g = env(ac, t, .006, L, v); fl.connect(g); g.connect(out); osc(ac, 'triangle', f, t, t + L + .1, fl); const g2 = ac.createGain(); g2.gain.value = .3; g2.connect(fl); osc(ac, 'sine', f * 2, t, t + L + .1, g2, 3); return; }
  if (kind === 'marimba') { const g = env(ac, t, .004, .5, v); g.connect(out); osc(ac, 'sine', f, t, t + .6, g); const g2 = env(ac, t, .002, .07, v * .45); g2.connect(out); osc(ac, 'sine', f * 4, t, t + .15, g2); return; }
  if (kind === 'pluck') { const fl = lp(ac, 2600, t, 320, .28, 2), g = env(ac, t, .004, Math.min(.5, d + .12), v); fl.connect(g); g.connect(out); osc(ac, 'sawtooth', f, t, t + .7, fl); return; }
  if (kind === 'bells') { const g = env(ac, t, .004, 1.6, v); g.connect(out); osc(ac, 'sine', f, t, t + 1.7, g); const g2 = env(ac, t, .002, .5, v * .35); g2.connect(out); osc(ac, 'sine', f * 2.76, t, t + .6, g2); const g3 = env(ac, t, .002, .25, v * .15); g3.connect(out); osc(ac, 'sine', f * 5.4, t, t + .3, g3); return; }
  if (kind === 'bass') { const fl = lp(ac, 700), g = env(ac, t, .01, Math.min(.9, d), v); fl.connect(g); g.connect(out); osc(ac, 'triangle', f, t, t + d + .2, fl); osc(ac, 'sine', f, t, t + d + .2, fl); }
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
function reverb(ac) {
  const len = Math.floor(ac.sampleRate * 2.2), b = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  const c = ac.createConvolver(); c.buffer = b; return c;
}

// ---------- 연주 ----------
function play(ac, outs, id, len, ahead = 1.5) {
  const s = SONGS[id]; if (!s || !ac) return { stop() {} };
  const bus = ac.createGain(), dry = ac.createGain(), wet = ac.createGain(), rv = reverb(ac), comp = ac.createDynamicsCompressor(), master = ac.createGain();
  wet.gain.value = .22; bus.connect(dry); bus.connect(rv); rv.connect(wet); dry.connect(comp); wet.connect(comp); comp.connect(master);
  (Array.isArray(outs) ? outs : [outs]).forEach(o => { try { master.connect(o); } catch (e) {} });
  const T0 = ac.currentTime + .08, end = T0 + len, spb = 60 / s.bpm;
  master.gain.setValueAtTime(.0001, T0); master.gain.exponentialRampToValueAtTime(.9, T0 + .8);
  master.gain.setValueAtTime(.9, Math.max(T0 + .9, end - 2)); master.gain.exponentialRampToValueAtTime(.0001, end);
  let mi = 0, ci = 0, tm = T0, tc = T0;
  const tick = () => {
    const until = ac.currentTime + ahead;
    while (tm < until && tm < end) { const [m, b] = s.mel[mi++ % s.mel.length]; if (m) voice(ac, bus, s.inst, m, tm, b * spb, s.vel); tm += b * spb; }
    while (tc < until && tc < end) { const [n, b] = s.ch[ci % s.ch.length], nx = s.ch[(ci + 1) % s.ch.length][0]; ci++; accomp(ac, bus, s, n, tc, b, spb, nx); drums(ac, bus, s, tc, b, spb); tc += b * spb; }
  };
  tick(); const iv = setInterval(tick, 250);
  return { stop() { clearInterval(iv); try { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(.0001, ac.currentTime, .08); } catch (e) {} } };
}
// 영상 종류·기념일에 맞춰 고르기
function pick(tpl) {
  const t = today(), b = S.profile.birth;
  if (daysBetween(b, t) > 330) { for (let y = +t.slice(0, 4) - 1; y <= +t.slice(0, 4); y++) { const d = daysBetween(`${y}${b.slice(4)}`, t); if (d >= -3 && d <= 3) return 'bday'; } }
  if (tpl === 'd100') return dayNo(t) >= 100 ? 'joy' : 'lullaby';
  if (tpl === 'pose') return 'lullaby';
  if (tpl === 'month') return 'picnic';
  return 'canon';
}
// 미리 듣기 (10초)
let PV = null;
function stopPreview() { if (!PV) return; const p = PV; PV = null; clearTimeout(p.t); try { p.p.stop(); } catch (e) {} setTimeout(() => { try { p.ac.close(); } catch (e) {} }, 400); if (p.done) p.done(); }
function preview(id, done) {
  stopPreview(); if (!SONGS[id]) return false;
  let ac; try { ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch (e) { return false; }
  PV = { ac, id, done, p: play(ac, ac.destination, id, 10) }; PV.t = setTimeout(stopPreview, 10300);
  return true;
}
window.MUSIC = { SONGS, ORDER, play, pick, preview, stopPreview, playing: () => PV && PV.id };
})();
