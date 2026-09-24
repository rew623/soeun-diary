// 국립중앙의료원 전국 약국 정보 조회 서비스에서 원주시 약국을 받아 pharmacies.json으로 저장해요
// 실행: DATA_GO_KR_KEY=... node .github/scripts/fetch-pharmacies.mjs
import { allRegion, times, coords, save } from './lib.mjs';

const BASE = 'https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire';
const OUT = new URL('../../pharmacies.json', import.meta.url);

const { Q0, rows } = await allRegion(BASE, '원주시');
if (!rows.length) { console.error('원주시 약국이 한 곳도 오지 않았어요. 기존 pharmacies.json은 그대로 둬요'); process.exit(1); }

const seen = new Set(), list = [];
for (const r of rows) {
  if (!r.hpid || seen.has(r.hpid)) continue;
  seen.add(r.hpid);
  list.push({ hpid: r.hpid, name: r.dutyName || '', kind: '약국', addr: r.dutyAddr || '', tel: r.dutyTel1 || '', ...coords(r), t: times(r) });
}
await save(OUT, { region: '강원 원주시', q0: Q0 }, list);
