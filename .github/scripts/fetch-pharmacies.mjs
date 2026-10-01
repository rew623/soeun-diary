// 국립중앙의료원 전국 약국 정보 조회 서비스에서 강원 약국을 한 번에 받아, 주소로 시·군을 나눠 data/p-{시군}.json으로 저장해요
// 실행: DATA_GO_KR_KEY=... node .github/scripts/fetch-pharmacies.mjs
import { allRegion, times, coords, save, REGIONS, regionOf, dataFile } from './lib.mjs';

const BASE = 'https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire';

const { Q0, rows } = await allRegion(BASE, '');
if (!rows.length) { console.error('강원 약국이 한 곳도 오지 않았어요. 기존 파일은 그대로 둬요'); process.exit(1); }

const by = new Map(REGIONS.map(r => [r.code, []])), seen = new Set();
let noRegion = 0;
for (const r of rows) {
  if (!r.hpid || seen.has(r.hpid)) continue;
  seen.add(r.hpid);
  const reg = regionOf(r.dutyAddr);
  if (!reg) { noRegion++; continue; }
  by.get(reg.code).push({ hpid: r.hpid, name: r.dutyName || '', kind: '약국', addr: r.dutyAddr || '', tel: r.dutyTel1 || '', ...coords(r), t: times(r) });
}
console.log(`강원 약국 ${rows.length}곳 (주소로 시·군을 못 찾은 곳 ${noRegion})`);
for (const reg of REGIONS) await save(dataFile(`p-${reg.code}.json`), { region: '강원 ' + reg.name, code: reg.code, q0: Q0 }, by.get(reg.code));
