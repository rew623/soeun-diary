// 공공데이터포털 JSON API 공통 도구 (산책 지수·행사·감염병)
const raw = (process.env.DATA_GO_KR_KEY || '').trim();
if (!raw) { console.error('DATA_GO_KR_KEY 시크릿이 비어 있어요'); process.exit(1); }
const KEY = raw.includes('%') ? raw : encodeURIComponent(raw);
export const sleep = ms => new Promise(r => setTimeout(r, ms));
const qs = o => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

// 서버가 아예 답을 안 할 때(점검 등): 연달아 4번 통째로 실패하면 그 서버는 이번 실행에서 더 묻지 않아요 (예전엔 25분 내내 다시 시도하다 작업이 취소돼 아무것도 못 올렸음)
const dead = {}, DEAD = 4;
export async function getJson(base, params) {
  const url = `${base}?serviceKey=${KEY}&${qs(params)}`, host = new URL(base).host;
  if ((dead[host] || 0) >= DEAD) throw new Error(`${host} 응답 없음 — 이번엔 건너뛰어요`);
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) }), txt = await res.text();   // 20초 안에 답이 없으면 다시 시도
      const em = /SERVICE_KEY_IS_NOT_REGISTERED_ERROR|NO_OPENAPI_SERVICE_ERROR|LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR/.exec(txt);
      if (em) throw new Error({ SERVICE_KEY_IS_NOT_REGISTERED_ERROR: '공공데이터포털에서 이 API를 활용신청하지 않았거나 아직 반영 전이에요', NO_OPENAPI_SERVICE_ERROR: '없어진 API 주소예요', LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR: '하루 호출 한도를 넘었어요' }[em[0]] + ` (${em[0]})`);
      let j; try { j = JSON.parse(txt); } catch (e) { throw new Error(`JSON 아님 (HTTP ${res.status}): ${txt.replace(/\s+/g, ' ').slice(0, 300)}`); }
      const h = j.response && j.response.header;
      if (!h) throw new Error('알 수 없는 응답: ' + txt.slice(0, 300));
      if (!/^0+$/.test(String(h.resultCode))) throw new Error(`API 오류 ${h.resultCode} ${h.resultMsg}`);
      dead[host] = 0;
      return j.response.body;
    } catch (e) {
      const net = /fetch failed|aborted|timeout|ECONN|ENOTFOUND|EAI_AGAIN/i.test(e.message + (e.cause ? ' ' + e.cause.code : ''));
      if (i >= 2 && net) dead[host] = (dead[host] || 0) + 1;
      if (i >= 2 || /SERVICE_KEY|등록되지 않은|NOT_REGISTERED|LIMITED/.test(e.message)) throw e;
      console.warn(`  다시 시도 (${i + 1}/2): ${e.message}`);
      await sleep(1500 * 2 ** i);
    }
  }
}
export const list = body => { const it = body && body.items; return Array.isArray(it) ? it : it && it.item ? [].concat(it.item) : []; };

