// 임시 탐색: 목록·상세 화면의 HTML 구조를 잘라서 출력
const B = 'http://www.wjeducare.or.kr/toy/m4/';
const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }); const buf = new Uint8Array(await r.arrayBuffer()); const ct = r.headers.get('content-type') || ''; let t = new TextDecoder('utf-8').decode(buf); if (/euc-kr|ks_c/i.test(ct) || /charset=(euc-kr|ks_c_5601)/i.test(t.slice(0, 2000))) t = new TextDecoder('euc-kr').decode(buf); return { s: r.status, ct, t }; };
const L = await get(B + 'sub1.asp?seq=-1&page=1&search1=1&search2=1&search3=000&SearchString=');
console.log('LIST', L.s, L.ct, L.t.length);
const t = L.t.replace(/\s+/g, ' ');
for (const m of t.matchAll(/<select[^>]*>.*?<\/select>/g)) console.log('SELECT', m[0].slice(0, 1500));
const i = t.indexOf('대여가능'); console.log('AROUND', t.slice(Math.max(0, i - 2500), i + 600));
const links = [...new Set([...t.matchAll(/href="([^"]*sub1[^"]*)"/g)].map(m => m[1]))]; console.log('LINKS', links.slice(0, 30).join('\n'));
const pg = [...new Set([...t.matchAll(/page=(\d+)/g)].map(m => +m[1]))]; console.log('PAGES', pg.join(','));
const d = links.find(x => /seq=\d{2,}/.test(x));
if (d) { const D = await get(B + d.replace(/^\.?\/?/, '').replace(/&amp;/g, '&')); const dt = D.t.replace(/\s+/g, ' '); const j = dt.indexOf('장난감명'); console.log('DETAIL', d, D.s, dt.slice(Math.max(0, j - 1500), j + 1500)); }
