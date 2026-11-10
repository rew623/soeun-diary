// 임시 탐색 2: 목록의 장난감 한 칸 HTML, 페이지 넘김, 상세 화면
const B = 'http://www.wjeducare.or.kr/toy/m4/';
const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }); return new TextDecoder('euc-kr').decode(new Uint8Array(await r.arrayBuffer())).replace(/\s+/g, ' '); };
const t = await get(B + 'sub1.asp?seq=-1&page=1&search1=1&search2=&search3=&SearchString=');
const i = t.indexOf('sub1_view.asp'); console.log('ITEM', t.slice(Math.max(0, i - 900), i + 1600));
const j = t.lastIndexOf('page='); console.log('PAGING', t.slice(Math.max(0, j - 1200), j + 300));
console.log('COUNT all-status', (t.match(/sub1_view\.asp/g) || []).length, '대여중', (t.match(/대여중/g) || []).length);
const d = await get(B + 'sub1_view.asp?seq=-1&idx=MR000417&page=1&search1=1&search2=1&search3=000&SearchString=');
const k = d.indexOf('장난감명'); console.log('DETAIL', d.slice(Math.max(0, k - 900), k + 1400));
