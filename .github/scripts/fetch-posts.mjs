// 육아 인기글 모음: 네이버 검색 API(블로그·카페글)로 월령별·주제별·시·군별 글 목록 → data/posts.json
// 네이버 개발자센터에서 "검색" API 애플리케이션을 만들고 시크릿 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 을 넣어야 해요
import { readFile, writeFile } from 'node:fs/promises';
import { REGIONS, dataFile } from './lib.mjs';

const ID = (process.env.NAVER_CLIENT_ID || '').trim(), SECRET = (process.env.NAVER_CLIENT_SECRET || '').trim();
if (!ID || !SECRET) { console.log('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 시크릿이 없어 건너뛰어요'); process.exit(0); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const clean = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&(#\d+|\w+);/g, (m, e) => e[0] === '#' ? String.fromCharCode(+e.slice(1)) : (ENT[e] ?? m)).replace(/\s+/g, ' ').trim();
// 광고·체험단 글은 빼요
const AD = /협찬|원고료|체험단|제공받아|제공 받아|업체로부터|광고|공구|공동구매|최저가|할인코드|쿠폰|분양|대출|보험설계/;
let calls = 0, fails = 0;

async function search(kind, query, sort, n) {
  const url = `https://openapi.naver.com/v1/search/${kind}.json?query=${encodeURIComponent(query)}&display=${Math.min(100, n * 3)}&sort=${sort}`;
  for (let i = 0; ; i++) {
    try {
      calls++;
      const res = await fetch(url, { headers: { 'X-Naver-Client-Id': ID, 'X-Naver-Client-Secret': SECRET } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`HTTP ${res.status} ${j.errorMessage || ''}`);
      return (j.items || []).map(x => ({
        t: clean(x.title), d: clean(x.description).slice(0, 90), u: x.link,
        s: kind === 'blog' ? clean(x.bloggername) : clean(x.cafename), k: kind === 'blog' ? 'b' : 'c',
        dt: x.postdate ? `${x.postdate.slice(0, 4)}-${x.postdate.slice(4, 6)}-${x.postdate.slice(6, 8)}` : ''
      })).filter(x => x.t && x.u && !AD.test(x.t + ' ' + x.d)).slice(0, n);
    } catch (e) {
      if (i >= 2 || /401|403/.test(e.message)) { fails++; console.warn(`  ${kind} "${query}" 실패: ${e.message}`); return []; }
      await sleep(1000 * 2 ** i);
    }
  }
}
// 블로그·카페를 번갈아 섞고 같은 글은 한 번만
async function mix(query, sort, n) {
  const [b, c] = [await search('blog', query, sort, n), await search('cafearticle', query, sort, n)];
  const out = [], seen = new Set();
  for (let i = 0; out.length < n && (i < b.length || i < c.length); i++) for (const x of [b[i], c[i]]) if (x && !seen.has(x.t) && out.length < n) { seen.add(x.t); out.push(x); }
  await sleep(150);
  return out;
}

const TOPICS = [['수면', '아기 수면교육'], ['이유식', '아기 이유식'], ['발달', '아기 발달 놀이'], ['아플 때', '아기 열 감기 대처'], ['육아템', '육아템 추천'], ['외출', '아기랑 가볼만한곳'], ['예방접종', '아기 예방접종 후기'], ['엄마·아빠', '육아 꿀팁']];
const out = { months: {}, topics: {}, regions: {} };
for (let m = 0; m <= 24; m++) { out.months[m] = await mix(m === 0 ? '신생아 육아' : `${m}개월 아기`, 'sim', 12); console.log(`월령 ${m}개월: ${out.months[m].length}`); }
for (const [k, q] of TOPICS) { out.topics[k] = await mix(q, 'sim', 12); console.log(`주제 ${k}: ${out.topics[k].length}`); }
for (const r of REGIONS) { out.regions[r.code] = await mix(`${r.name.replace(/[시군]$/, '')} 아기랑`, 'date', 10); console.log(`지역 ${r.name}: ${out.regions[r.code].length}`); }
console.log(`호출 ${calls}번, 실패 ${fails}번`);
if (fails > calls / 2) { console.error('절반 넘게 실패했어요 (키·사용 API 설정을 확인해 주세요)'); process.exit(1); }

const file = dataFile('posts.json');
let old = null; try { old = JSON.parse(await readFile(file, 'utf8')); } catch (e) {}
const body = { topicNames: TOPICS.map(([k]) => k), ...out };
if (old && JSON.stringify({ ...old, updated: 0 }) === JSON.stringify({ updated: 0, ...body })) { console.log('바뀐 게 없어요'); process.exit(0); }
await writeFile(file, JSON.stringify({ updated: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), ...body }) + '\n');
console.log('posts.json 저장');
