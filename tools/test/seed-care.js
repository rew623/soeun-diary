// 하루 수사 시험 데이터: 지난 9일치 분유·기저귀·잠·목욕·모유·유축 + 이유식 몇 끼
window.__seedCare = async function (opt = {}) {
  let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
  const p2 = n => String(n).padStart(2, '0'), hm = m => `${p2(Math.floor(m / 60) % 24)}:${p2(Math.round(m) % 60)}`;
  const nowD = new Date(), nowM = nowD.getHours() * 60 + nowD.getMinutes(), T = today();
  const C = []; let n = 0;
  const add = (date, o) => { C.push(Object.assign({ id: 'cs' + (n++).toString(36).padStart(4, '0'), date, k: 'memo', t: '00:00', e: '', ml: 0, l: 0, r: 0, dur: 0, pee: 0, poo: 0, amt: '', st: '', memo: '', live: 0, side: '', seg: 0, by: n % 3 ? '엄마' : '아빠', at: Date.now() - 1e6 }, o)); };
  for (let i = 9; i >= 0; i--) {
    const date = addDays(T, -i), lim = i === 0 ? nowM - 20 : 1440;
    if (i === 3 && !opt.full) continue;   // 하루는 비워 둬요 (빈 날 막대)
    // 분유: 3시간쯤마다 (밤엔 한 번)
    for (let m = 60 + rnd() * 40; m < lim; m += 160 + rnd() * 70) add(date, { k: 'formula', t: hm(m), ml: [120, 130, 140, 150, 160, 180][Math.floor(rnd() * 6)] + (9 - i) * 2, e: rnd() < .4 ? hm(m + 15) : '', memo: rnd() < .12 ? '반쯤 먹고 잠' : '' });
    // 기저귀
    for (let m = 90 + rnd() * 60; m < lim; m += 140 + rnd() * 80) { const poo = rnd() < .25; add(date, { k: 'diaper', t: hm(m), pee: 1, poo: poo ? 1 : 0, amt: poo ? ['조금', '보통', '많이'][Math.floor(rnd() * 3)] : '', st: poo ? ['묽음', '보통'][Math.floor(rnd() * 2)] : '' }); }
    // 낮잠 2~3번
    [[600, 70], [840, 90], [1050, 40]].forEach(([s, d]) => { const st = s + rnd() * 40, en = st + d + rnd() * 30; if (en < lim) add(date, { k: 'sleep', t: hm(st), e: hm(en) }); });
    // 밤잠 (21시쯤 → 다음 날 새벽, e < t)
    if (i > 0) add(date, { k: 'sleep', t: hm(1290 + rnd() * 40), e: hm(320 + rnd() * 60) });
    // 목욕
    if (1140 < lim && rnd() < .8) add(date, { k: 'bath', t: hm(1140 + rnd() * 30), dur: [10, 15, 20][Math.floor(rnd() * 3)] });
    // 모유·유축
    if (i % 2 === 0 && 480 < lim) add(date, { k: 'breast', t: hm(470 + rnd() * 30), l: 8 + Math.floor(rnd() * 6), r: 6 + Math.floor(rnd() * 6) });
    if (i % 3 === 0 && 720 < lim) add(date, { k: 'pump', t: hm(700 + rnd() * 30), ml: 60 + Math.floor(rnd() * 5) * 10 });
  }
  add(addDays(T, -1), { k: 'memo', t: '16:20', memo: '오늘 처음으로 소리 내어 웃었어요' });
  DB.cares = C;
  // 이유식(급식 기록): 먹인 시각 있는 것 + 없는 것(끼니로 짐작)
  DB.meals = [
    { id: 'me1', date: addDays(T, -2), tm: '11:40', slot: '점심', menu: '쌀미음', amount: '30g', eat: '잘먹음', memo: '', photo: false, by: '엄마' },
    { id: 'me2', date: addDays(T, -1), tm: '', slot: '아침', menu: '쌀미음', amount: '40g', eat: '완식', memo: '', photo: false, by: '아빠' },
    { id: 'me3', date: T, tm: '09:10', slot: '아침', menu: '찹쌀미음', amount: '45g', eat: '절반', memo: '', photo: false, by: '엄마' }];
  DB.foods = DB.foods && DB.foods.length ? DB.foods : [{ id: 'fd1', name: '쌀', start: addDays(T, -6), end: addDays(T, -4), result: 'ok', memo: '' }];
  await refresh();
};
