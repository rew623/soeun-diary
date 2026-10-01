// 국립중앙의료원 전국 병·의원 찾기 서비스에서 강원 병·의원을 한 번에 받아, 주소로 시·군을 나눠 data/h-{시군}.json으로 저장해요
// 실행: DATA_GO_KR_KEY=... node .github/scripts/fetch-hospitals.mjs
import { all, allRegion, times, coords, save, REGIONS, regionOf, dataFile } from './lib.mjs';

const BASE = 'https://apis.data.go.kr/B552657/HsptlAsembySearchService/getHsptlMdcncListInfoInqire';
// 남길 진료과목 (목록 응답에 진료과목이 없으면 QD 코드로 따로 물어봐요)
const DEPTS = { '소아청소년과': 'D002', '이비인후과': 'D013', '내과': 'D001', '가정의학과': 'D022', '피부과': 'D005', '안과': 'D012' };

const { Q0, rows } = await allRegion(BASE, '');
if (!rows.length) { console.error('강원 병원이 한 곳도 오지 않았어요. 기존 파일은 그대로 둬요'); process.exit(1); }

// 진료과목: 목록 응답에 dgidIdName이 있으면 그걸 쓰고, 없으면 과목별(QD)로 강원 전체를 따로 받아서 채워요
const deptOf = new Map();
if (!rows.some(r => 'dgidIdName' in r)) {
  console.log('목록에 진료과목이 없어서 과목별로 따로 받아요');
  for (const [name, code] of Object.entries(DEPTS)) {
    for (const r of await all(BASE, { Q0, QD: code })) {
      if (!deptOf.has(r.hpid)) deptOf.set(r.hpid, new Set());
      deptOf.get(r.hpid).add(name);
    }
  }
}

const by = new Map(REGIONS.map(r => [r.code, []])), seen = new Set();
let kept = 0, noRegion = 0;
for (const r of rows) {
  if (!r.hpid || seen.has(r.hpid)) continue;
  seen.add(r.hpid);
  const depts = r.dgidIdName != null
    ? r.dgidIdName.split(',').map(s => s.trim()).filter(Boolean)
    : [...(deptOf.get(r.hpid) || [])];
  const er = r.dutyEryn === '1';
  if (!er && !depts.some(d => d in DEPTS)) continue;
  const reg = regionOf(r.dutyAddr);
  if (!reg) { noRegion++; continue; }
  by.get(reg.code).push({ hpid: r.hpid, name: r.dutyName || '', kind: r.dutyDivNam || '', addr: r.dutyAddr || '', tel: r.dutyTel1 || '', ...coords(r), depts, t: times(r), er });
  kept++;
}
console.log(`남긴 병원 ${kept}곳 (강원 전체 ${rows.length}곳 중, 주소로 시·군을 못 찾은 곳 ${noRegion})`);
for (const reg of REGIONS) await save(dataFile(`h-${reg.code}.json`), { region: '강원 ' + reg.name, code: reg.code, q0: Q0 }, by.get(reg.code));
