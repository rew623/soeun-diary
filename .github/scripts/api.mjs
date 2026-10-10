// 공공데이터포털 JSON API 공통 도구 (산책 지수·행사·감염병)
const raw = (process.env.DATA_GO_KR_KEY || '').trim();
if (!raw) { console.error('DATA_GO_KR_KEY 시크릿이 비어 있어요'); process.exit(1); }
const KEY = raw.includes('%') ? raw : encodeURIComponent(raw);
export const sleep = ms => new Promise(r => setTimeout(r, ms));
const qs = o => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

export async function getJson(base, params) {
  const url = `${base}?serviceKey=${KEY}&${qs(params)}`;
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url), txt = await res.text();
      let j; try { j = JSON.parse(txt); } catch (e) { throw new Error(`JSON 아님 (HTTP ${res.status}): ${txt.replace(/\s+/g, ' ').slice(0, 300)}`); }
      const h = j.response && j.response.header;
      if (!h) throw new Error('알 수 없는 응답: ' + txt.slice(0, 300));
      if (!/^0+$/.test(String(h.resultCode))) throw new Error(`API 오류 ${h.resultCode} ${h.resultMsg}`);
      return j.response.body;
    } catch (e) {
      if (i >= 2 || /SERVICE_KEY|등록되지 않은|NOT_REGISTERED|LIMITED/.test(e.message)) throw e;
      console.warn(`  다시 시도 (${i + 1}/2): ${e.message}`);
      await sleep(1500 * 2 ** i);
    }
  }
}
export const list = body => { const it = body && body.items; return Array.isArray(it) ? it : it && it.item ? [].concat(it.item) : []; };

