// 임시 탐색: 포털 화면과 그 화면의 스크립트에서 통계 요청 주소(.do)를 찾아 출력
const B = 'https://dportal.kdca.go.kr';
const get = async (u, o = {}) => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' }, ...o }); return { s: r.status, t: await r.text(), h: r.headers }; };
for (const p of ['/pot/is/st/hfmd.do', '/pot/is/st/influ.do']) {
  try {
    const r = await get(B + p); console.log('PAGE', p, r.s, r.t.length);
    const srcs = [...r.t.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]).filter(s => !/jquery|bootstrap|swiper/i.test(s));
    console.log(' scripts:', srcs.join(' '));
    const inline = [...r.t.matchAll(/["'`](\/pot\/[^"'`\s]+\.do[^"'`\s]*)["'`]/g)].map(m => m[1]); console.log(' inline .do:', [...new Set(inline)].join(' '));
    for (const s of srcs.slice(0, 12)) {
      const u = s.startsWith('http') ? s : B + (s.startsWith('/') ? '' : '/pot/is/st/') + s;
      try { const j = await get(u); const f = [...j.t.matchAll(/["'`](\/pot\/[^"'`\s]+\.do[^"'`\s]*)["'`]/g)].map(m => m[1]); if (f.length) console.log(' js', u, [...new Set(f)].join(' ')); } catch (e) { console.log(' js fail', u, e.message); }
    }
  } catch (e) { console.log('PAGE fail', p, e.message); }
}
