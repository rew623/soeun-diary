// 실제처럼 쌓인 데이터 (2026-07-06 출생, 오늘 2026-10-11)
window.__seed = async function () {
  const U = i => 'https://firebasestorage.googleapis.com/v0/b/t/o/p' + i + '.jpg?alt=media&token=x';
  const ph = (id, i) => { PHOTOS[id] = U(i % 8); };
  DB.profile = { name: '미리보기', birth: '2026-07-06', sex: 'F', photo: true, mom: '엄마', dad: '아빠', momPhoto: true, dadPhoto: true };
  PHOTOS.profile = U(1); PHOTOS.mom = U(2); PHOTOS.dad = U(3);
  DB.records = [
    { id: 'r1', date: '2026-07-06', weight: 3.26, height: 51, head: 34, memo: '태어난 날', photo: false, by: '엄마' },
    { id: 'r2', date: '2026-07-20', weight: 3.7, height: 53, head: null, memo: '', photo: false, by: '아빠' },
    { id: 'r3', date: '2026-08-06', weight: 4.5, height: 56, head: 37, memo: '1개월 검진', photo: true, by: '엄마' },
    { id: 'r4', date: '2026-09-06', weight: 5.4, height: 59, head: 39, memo: '', photo: false, by: '엄마' },
    { id: 'r5', date: '2026-10-06', weight: 6.3, height: 62, head: 40.5, memo: '3개월! 목을 꽤 가눔', photo: false, by: '아빠' }];
  ph('r3', 4);
  const M = [];
  // 월별 사진 0~3개월
  [0, 1, 2, 3].forEach(n => { const id = 'mo' + n; M.push({ id, type: 'month', title: n + '개월', date: addMonths('2026-07-06', n) > today() ? today() : addMonths('2026-07-06', n), memo: '', photo: true, by: n % 2 ? '아빠' : '엄마' }); ph(id, n); });
  // 최초 목격
  [['첫 사회적 미소', '2026-08-20', '아빠'], ['소리 내어 웃음', '2026-09-15', '엄마'], ['뒤집기 시도', '2026-10-03', '엄마']].forEach(([t, d, b], i) => { const id = 'fi' + i; M.push({ id, type: 'first', title: t, date: d, memo: i === 0 ? '아빠 보고 웃었다' : '', photo: true, by: b }); ph(id, i + 3); });
  M.push({ id: 'fx0', type: 'extra', of: 'fi0', title: '', date: '2026-08-20', memo: '', photo: true, by: '아빠' }); ph('fx0', 6);
  // 현장 사진 70장 (7~10월), 시각·일부 위치
  for (let i = 0; i < 70; i++) { const day = new Date(2026, 6, 8 + Math.floor(i * 1.3)); const d = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`; if (d > today()) break; const id = 'fr' + i; M.push({ id, type: 'free', title: i % 9 === 0 ? '산책' : '', date: d, tm: `1${i % 9}:${String(10 + i % 40).padStart(2, '0')}:00`, memo: '', photo: true, by: i % 3 ? '엄마' : '아빠', geo: i % 4 === 0 ? `37.3${5 + i % 3}${i % 10},127.9${i % 7}0` : '' }); ph(id, i); }
  // 산책날 사진 (10/4 10:10~10:40)
  for (let i = 0; i < 5; i++) { const id = 'wk' + i; M.push({ id, type: 'free', title: '', date: '2026-10-04', tm: `10:${String(12 + i * 6).padStart(2, '0')}:00`, memo: '', photo: true, by: '엄마', geo: i < 2 ? `37.36${i},127.91${i}` : '' }); ph(id, i + 2); }
  // 가족 사진
  for (let i = 0; i < 6; i++) { const id = 'fa' + i; M.push({ id, type: 'fam', who: '', title: i ? '' : '첫 가족사진', date: `2026-0${7 + Math.floor(i / 2)}-1${i}`, memo: '', photo: true, by: '아빠' }); ph(id, i + 1); }
  M.filter((m, i) => i % 11 === 0 && m.type === 'free').forEach(m => m.board = true);
  DB.moments = M;
  // 탐문 기록
  const enc = nums => { let out = ''; for (let v of nums) { v = v < 0 ? ~(v << 1) : v << 1; while (v >= 0x20) { out += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } out += String.fromCharCode(v + 63); } return out; };
  const pack = (v, t0, pts) => { const n = []; let a = 0, b = 0, c = 0; pts.forEach(([la, lo, t]) => { const A = Math.round(la * 1e5), B = Math.round(lo * 1e5); n.push(A - a, B - b, t - c); a = A; b = B; c = t; }); return `${v}:${Math.round(t0 / 1000)}:${enc(n)}`; };
  const g = []; for (let i = 0; i <= 30; i++) g.push([37.35 + i * 0.0004, 127.90 + Math.sin(i / 4) * 0.001 + i * 0.0002, i * 80]);
  DB.walks = [
    { id: 'w1', date: '2026-10-04', kind: 'walk', title: '아침 산책', place: '샘마루공원', geo: '37.3610,127.9100', start: '10:05', end: '10:48', dist: '1850', path: pack(1, new Date(2026, 9, 4, 10, 5).getTime(), g), pics: '', memo: '처음으로 강아지를 한참 쳐다봤다', who: '엄마', wx: '☀️ 18° · 산책 지수 85', mood: 'look', by: '엄마' },
    { id: 'w2', date: '2026-09-27', kind: 'cafe', title: '', place: '컴포즈커피', geo: '37.3748,127.8735', start: '16:08', end: '', dist: '', path: '', pics: 'fr60', memo: '', who: '엄마,아빠', wx: '', mood: 'sleep', by: '아빠' },
    { id: 'w3', date: '2026-10-09', kind: 'fam', title: '할머니 댁', place: '할머니 댁', geo: '37.40,127.95', start: '13:00', end: '17:00', dist: '', path: pack(2, new Date(2026, 9, 9, 13).getTime(), [[37.35, 127.90, 0], [37.40, 127.95, 14400]]), pics: '', memo: '', who: '엄마,아빠', wx: '', mood: 'happy', by: '엄마' }];
  // 긴급 출동
  DB.eps = [{ id: 'e1', title: '열감기', start: '2026-09-18', end: '2026-09-20' }];
  DB.logs = [{ id: 'l1', ep: 'e1', kind: 'temp', value: '38.2', at: '2026-09-18T21:10', memo: '', by: '엄마' }, { id: 'l2', ep: 'e1', kind: 'med', value: '챔프 3ml', at: '2026-09-18T21:20', memo: '', by: '엄마' }, { id: 'l3', ep: 'e1', kind: 'temp', value: '37.1', at: '2026-09-19T08:00', memo: '', by: '아빠' }];
  DB.visits = [{ id: 'vi1', date: '2026-09-19', hospital: '우리동네 소아과', diag: '감기', rx: '해열제', next: '', ask: '분유 양' }];
  DB.capsules = [{ id: 'ca1', title: '첫 돌에 열어 봐', body: '사랑해', open: '2027-07-06', occ: 'd1', sealed: '2026-09-01', photo: false, by: '엄마' }];
  DB.looks = [{ id: '2026-10-10_mom', date: '2026-10-10', pick: 'mom', parts: 'eye', by: '엄마' }, { id: '2026-10-10_dad', date: '2026-10-10', pick: 'dad', parts: 'nose', by: '아빠' }];
  DB.game = Object.assign(DB.game || {}, { acorn: 42 });
  MOCK.getPhotos = ids => { const o = {}; ids.forEach(id => { if (PHOTOS[id]) o[id] = PHOTOS[id]; }); return o; };
  await refresh();
};
