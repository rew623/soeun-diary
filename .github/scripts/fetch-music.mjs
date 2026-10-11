// 성장 영상용 '실제 연주' 클래식 곡을 위키미디어 공용(Wikimedia Commons)에서 받아 music/ 에 넣어요 (music.yml)
// 저작권: 곡(작곡)도 연주(녹음)도 퍼블릭 도메인(PD)이거나 CC0인 파일만 골라요 — 파일 설명의 라이선스(LicenseShortName)를 확인해서
//   PD·CC0이 아니면 건너뛰어요. 그래서 영상에 넣어 카톡으로 보내도 괜찮아요. 출처·연주자는 music/tracks.json에 남겨요
// 받은 파일은 앞 무음을 자르고 최대 150초로 줄여 끝을 부드럽게 줄인 뒤 mp3(모노 80kbps, 곡마다 약 1.5MB)로 바꿔요 (ffmpeg)
import { writeFile, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const OUT = new URL('../../music/', import.meta.url);
const UA = 'SoeunDiaryMusic/1.0 (https://github.com/rew623/soeun-diary; GitHub Actions)';
const API = 'https://commons.wikimedia.org/w/api.php';
const MAXSEC = 150;
// 곡 목록: id, 이름(앱에 보이는 것), 설명, 찾을 말, 제목에 꼭 있어야 할 말(엉뚱한 파일 거르기)
const WANT = [
  { id: 'r-brahms', name: '🌙 브람스 자장가', desc: '실제 연주 · 포근하게 잠드는 노래', q: ['Brahms Wiegenlied', 'Brahms Lullaby', 'Guten Abend gut Nacht Brahms'], must: /brahms|wiegenlied|guten abend|lullaby|ninna nanna|berceuse/i },
  { id: 'r-twinkle', name: '⭐ 반짝반짝 작은 별 변주곡', desc: '실제 연주 · 모차르트', q: ['Mozart Ah vous dirai-je Maman', 'Mozart K. 265 variations', 'Twinkle Twinkle Little Star'], must: /vous dirai|k\.? ?265|twinkle/i },
  { id: 'r-gymno', name: '☁️ 짐노페디 1번', desc: '실제 연주 · 사티, 잔잔한 피아노', q: ['Satie Gymnopedie 1', 'Gymnopédie No. 1', 'Gymnopedie'], must: /gymnop/i },
  { id: 'r-clair', name: '🌕 달빛 (클레르 드 륀)', desc: '실제 연주 · 드뷔시', q: ['Debussy Clair de lune', 'Suite bergamasque Clair de lune'], must: /clair de lune/i },
  { id: 'r-canon', name: '🎻 캐논', desc: '실제 연주 · 파헬벨', q: ['Pachelbel Canon in D', 'Pachelbel Canon'], must: /pachelbel|canon/i },
  { id: 'r-trau', name: '💭 트로이메라이 (꿈)', desc: '실제 연주 · 슈만 어린이 정경', q: ['Schumann Träumerei', 'Schumann Traumerei Kinderszenen'], must: /tr(ä|a|ae)umerei|kinderszenen/i },
  { id: 'r-noct', name: '🌌 녹턴 Op.9-2', desc: '실제 연주 · 쇼팽', q: ['Chopin Nocturne Op. 9 No. 2', 'Chopin Nocturne E flat major Op 9'], must: /nocturne/i },
  { id: 'r-bach', name: '🎹 프렐류드 C장조', desc: '실제 연주 · 바흐 평균율 1번', q: ['Bach Prelude C major BWV 846', 'Well-Tempered Clavier Prelude 1 C major'], must: /846|prelude|präludium|praeludium/i },
  { id: 'r-nacht', name: '🎺 아이네 클라이네 나흐트무지크', desc: '실제 연주 · 모차르트, 신나게', q: ['Eine kleine Nachtmusik Allegro', 'Mozart Serenade K. 525'], must: /nachtmusik|k\.? ?525/i },
  { id: 'r-elise', name: '🌸 엘리제를 위하여', desc: '실제 연주 · 베토벤', q: ['Beethoven Für Elise', 'Fur Elise'], must: /elise/i },
  { id: 'r-spring', name: '🌱 사계 중 봄', desc: '실제 연주 · 비발디, 산뜻하게', q: ['Vivaldi Spring Allegro', 'Vivaldi Four Seasons Spring La primavera'], must: /spring|primavera|printemps|frühling/i },
  { id: 'r-swan', name: '🦢 백조', desc: '실제 연주 · 생상스 동물의 사육제', q: ['Saint-Saëns The Swan', 'Le cygne Saint-Saens'], must: /swan|cygne|schwan/i },
];
const OKLIC = /^(public domain|pd\b|pd-|cc0|cc-zero)/i;
const OKMIME = /^(audio\/(ogg|x-flac|flac|wav|x-wav|mpeg|mp3|webm|opus)|application\/ogg|video\/webm)$/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function api(params) {
  const u = API + '?' + new URLSearchParams(Object.assign({ format: 'json', formatversion: '2', origin: '*' }, params));
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    if (r.ok) return r.json();
    console.log('  API', r.status, '다시 해 봐요'); await sleep(3000 * (i + 1));
  }
  throw new Error('API 실패');
}
async function candidates(w) {
  const seen = new Map();
  for (const q of w.q) {
    const j = await api({ action: 'query', generator: 'search', gsrnamespace: '6', gsrsearch: q + ' filetype:audio', gsrlimit: '25', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata' });
    for (const p of (j.query && j.query.pages) || []) {
      const ii = (p.imageinfo || [])[0]; if (!ii || seen.has(p.title)) continue;
      const em = ii.extmetadata || {}, lic = strip((em.LicenseShortName || {}).value), title = p.title.replace(/^File:/, '');
      const text = [title, strip((em.ObjectName || {}).value), strip((em.ImageDescription || {}).value)].join(' ');
      if (!w.must.test(text)) continue;
      if (!OKLIC.test(lic)) { console.log(`  건너뜀(라이선스 ${lic || '없음'}): ${title}`); continue; }
      if (!OKMIME.test(ii.mime) || ii.size < 250e3 || ii.size > 120e6) continue;
      let score = Math.min(ii.size, 40e6) / 1e6;
      if (/musopen/i.test(text + strip((em.Credit || {}).value) + strip((em.Artist || {}).value))) score += 30;
      if (/midi|synth|ringtone|music box|carillon|whistl/i.test(text)) score -= 25;
      seen.set(p.title, { title, url: ii.url, page: ii.descriptionurl, mime: ii.mime, size: ii.size, lic, artist: strip((em.Artist || {}).value).slice(0, 120), credit: strip((em.Credit || {}).value).slice(0, 160), score });
    }
    await sleep(1200);
  }
  return [...seen.values()].sort((a, b) => b.score - a.score);
}
const dur = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).toString().trim() || 0;

await mkdir(OUT, { recursive: true });
const tracks = [];
for (const w of WANT) {
  console.log(`▶ ${w.name}`);
  let list = []; try { list = await candidates(w); } catch (e) { console.log('  찾기 실패:', e.message); continue; }
  let done = false;
  for (const c of list.slice(0, 4)) {
    const raw = new URL(`raw-${w.id}`, OUT).pathname, out = new URL(`${w.id}.mp3`, OUT).pathname;
    try {
      console.log(`  받기: ${c.title} (${c.lic}, ${(c.size / 1e6).toFixed(1)}MB)`);
      const r = await fetch(c.url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error('받기 ' + r.status);
      await writeFile(raw, Buffer.from(await r.arrayBuffer()));
      const d0 = dur(raw); if (d0 < 45) throw new Error(`너무 짧아요(${Math.round(d0)}초)`);
      const len = Math.min(MAXSEC, d0), fade = Math.min(6, len / 8);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-vn', '-af', `silenceremove=start_periods=1:start_threshold=-50dB,atrim=0:${len},afade=t=in:d=0.4,afade=t=out:st=${(len - fade).toFixed(2)}:d=${fade.toFixed(2)},loudnorm=I=-16:TP=-1.5:LRA=11`, '-ac', '1', '-ar', '44100', '-b:a', '80k', out]);
      const d1 = dur(out);
      tracks.push({ id: w.id, name: w.name, desc: w.desc, file: `music/${w.id}.mp3`, sec: Math.round(d1), full: Math.round(d0), title: c.title, artist: c.artist, credit: c.credit, license: c.lic, src: c.page });
      console.log(`  ✔ ${Math.round(d1)}초, ${((await stat(out)).size / 1e6).toFixed(2)}MB`); done = true;
    } catch (e) { console.log('  ✘', e.message); }
    finally { await rm(raw, { force: true }); }
    if (done) break;
    await sleep(1500);
  }
  if (!done) console.log('  → 알맞은 PD/CC0 연주를 못 찾았어요');
}
// 목록에 없는 옛 파일은 지워요
for (const f of await readdir(OUT)) if (/\.mp3$/.test(f) && !tracks.some(t => t.file === 'music/' + f)) await rm(new URL(f, OUT), { force: true });
await writeFile(new URL('tracks.json', OUT), JSON.stringify({ at: new Date().toISOString().slice(0, 10), tracks }, null, 1) + '\n');
console.log(`곡 ${tracks.length}개 준비`);
