// 육아 인기글 모음: 네이버 검색 API(블로그·카페글)로 월령별·주제별·시·군별 글 목록 → data/posts.json
// 키: NAVER API HUB(네이버 클라우드, 2026.8~ 새 방식)에서 앱을 만들고 받은 Client ID/Secret → 시크릿 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
// 예전 개발자센터(openapi.naver.com) 키도 2027년 6월까지는 받아 줘요 (HUB 먼저 시도, 안 되면 예전 주소)
import { readFile, writeFile } from 'node:fs/promises';
import { REGIONS, dataFile } from './lib.mjs';

const ID = (process.env.NAVER_CLIENT_ID || '').trim(), SECRET = (process.env.NAVER_CLIENT_SECRET || '').trim();
if (!ID || !SECRET) { console.log('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 시크릿이 없어 건너뛰어요'); process.exit(0); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const clean = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&(#\d+|\w+);/g, (m, e) => e[0] === '#' ? String.fromCharCode(+e.slice(1)) : (ENT[e] ?? m)).replace(/\s+/g, ' ').trim();
// 광고·체험단 글은 빼요
const AD = /아고다|트립닷컴|야놀자|여기어때|협찬|원고료|체험단|제공받아|제공 받아|업체로부터|광고|공구|공동구매|최저가|할인코드|쿠폰|분양|대출|보험설계/;
// 반려동물·관계없는 글 빼기, 육아 글인지 확인
const PET = /고양이|냥이|냥냥|강아지|댕댕|반려|애견|애묘|펫|햄스터|토끼|앵무|도마뱀|분양|수족관 물고기|매머드|사료|입질|급여량|개월령/;
const BABY = /아기|아가|신생아|육아|이유식|유아|돌아기|아이|엄마|아빠|맘|개월|수유|분유|기저귀|어린이집|발달|낮잠|통잠/;
const RECENT = (() => { const d = new Date(Date.now() - 2 * 365 * 864e5); return d.toISOString().slice(0, 10); })();   // 블로그는 2년 안 글만
let calls = 0, fails = 0;

// 어느 주소가 되는지 처음 한 번 알아내서 계속 써요
const WAYS = [
  { name: 'API HUB', url: (k, q) => `https://naverapihub.apigw.ntruss.com/search/v1/${k}?${q}`, h: { 'X-NCP-APIGW-API-KEY-ID': ID, 'X-NCP-APIGW-API-KEY': SECRET } },
  { name: '개발자센터(예전)', url: (k, q) => `https://openapi.naver.com/v1/search/${k}.json?${q}`, h: { 'X-Naver-Client-Id': ID, 'X-Naver-Client-Secret': SECRET } }
];
let way = null;
async function pickWay() {
  for (const w of WAYS) {
    try {
      const res = await fetch(w.url('blog', 'query=' + encodeURIComponent('아기') + '&display=1'), { headers: w.h });
      const t = await res.text();
      if (res.ok && /"items"/.test(t)) { console.log(`네이버 검색: ${w.name} 주소로 받아요`); return w; }
      console.warn(`${w.name}: HTTP ${res.status} ${t.replace(/\s+/g, ' ').slice(0, 200)}`);
    } catch (e) { console.warn(`${w.name}: ${e.message}`); }
  }
  return null;
}
async function search(kind, query, sort, n, ok) {
  const url = way.url(kind, `query=${encodeURIComponent(query)}&display=100&sort=${sort}`);
  for (let i = 0; ; i++) {
    try {
      calls++;
      const res = await fetch(url, { headers: way.h });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`HTTP ${res.status} ${j.errorMessage || ''}`);
      return (j.items || []).map(x => ({
        t: clean(x.title), d: clean(x.description).slice(0, 90), u: x.link,
        s: kind === 'blog' ? clean(x.bloggername) : clean(x.cafename), k: kind === 'blog' ? 'b' : 'c',
        dt: x.postdate ? `${x.postdate.slice(0, 4)}-${x.postdate.slice(4, 6)}-${x.postdate.slice(6, 8)}` : ''
      })).filter(x => x.t && x.u && !AD.test(x.t + ' ' + x.d) && !PET.test(x.t + ' ' + x.d) && (!x.dt || x.dt >= RECENT) && (!ok || ok(x))).slice(0, n);
    } catch (e) {
      if (i >= 2 || /401|403/.test(e.message)) { fails++; console.warn(`  ${kind} "${query}" 실패: ${e.message}`); return []; }
      await sleep(1000 * 2 ** i);
    }
  }
}
// 블로그·카페를 번갈아 섞고 같은 글은 한 번만
async function mix(query, sort, n, ok) {
  const [b, c] = [await search('blog', query, sort, n, ok), await search('cafearticle', query, sort, n, ok)];
  const out = [], seen = new Set();
  for (let i = 0; out.length < n && (i < b.length || i < c.length); i++) for (const x of [b[i], c[i]]) if (x && !seen.has(x.t) && out.length < n) { seen.add(x.t); out.push(x); }
  await sleep(150);
  return out;
}

const TOPICS = [['수면', '아기 수면교육'], ['이유식', '아기 이유식'], ['발달', '아기 발달 놀이'], ['아플 때', '아기 열 감기 대처'], ['육아템', '육아템 추천'], ['외출', '아기랑 가볼만한곳'], ['예방접종', '아기 예방접종 후기'], ['엄마·아빠', '육아 꿀팁']];
way = await pickWay();
if (!way) { console.error('네이버 검색 API에 연결하지 못했어요 (API HUB 앱에 블로그·카페글 검색을 골랐는지, 키를 바르게 넣었는지 확인해 주세요)'); process.exit(1); }
const out = { months: {}, topics: {}, regions: {} };
const babyOk = x => BABY.test(x.t + ' ' + x.d);
for (let m = 0; m <= 24; m++) {
  // 제목에 그 월령이 딱 들어간 글만 (3개월에 13개월·아기고양이 글이 섞이지 않게)
  const mm = new RegExp(`(^|[^0-9])${m}\\s?개월`), ok = m === 0 ? (x => /신생아|조리원|50일|백일|100일/.test(x.t) && babyOk(x)) : (x => mm.test(x.t) && babyOk(x));
  out.months[m] = await mix(m === 0 ? '신생아 육아' : `${m}개월 아기 육아`, 'sim', 12, ok);
  console.log(`월령 ${m}개월: ${out.months[m].length}`);
}
for (const [k, q] of TOPICS) { out.topics[k] = await mix(q, 'sim', 12, babyOk); console.log(`주제 ${k}: ${out.topics[k].length}`); }
for (const r of REGIONS) {
  const base = r.name.replace(/[시군]$/, ''), ok = x => x.t.includes(base) && /아기|아이|유아|키즈|육아|가볼만|가족|어린이|놀이|체험|공원|카페/.test(x.t + ' ' + x.d) && !/아고다|호텔 예약|숙소 예약|펜션|라인업|초대가수/.test(x.t + ' ' + x.d);
  out.regions[r.code] = await mix(`${base} 아기랑 가볼만한곳`, 'date', 10, ok);
  console.log(`지역 ${r.name}: ${out.regions[r.code].length}`);
}
console.log(`호출 ${calls}번, 실패 ${fails}번`);
if (fails > calls / 2) { console.error('절반 넘게 실패했어요 (키·사용 API 설정을 확인해 주세요)'); process.exit(1); }

const file = dataFile('posts.json');
let old = null; try { old = JSON.parse(await readFile(file, 'utf8')); } catch (e) {}
const body = { topicNames: TOPICS.map(([k]) => k), ...out };
if (old && JSON.stringify({ ...old, updated: 0 }) === JSON.stringify({ updated: 0, ...body })) { console.log('바뀐 게 없어요'); process.exit(0); }
await writeFile(file, JSON.stringify({ updated: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), ...body }) + '\n');
console.log('posts.json 저장');
