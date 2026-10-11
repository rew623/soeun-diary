// 수유 알람 계산·보내기 (Firebase 서버 functions/index.js가 1분마다, GitHub Actions feed.yml은 서버가 멈췄을 때만 예비로)
// 설정: families/{fid}/game/shared 의 feed {on, day, night, ns, ne, pre} — day.js와 같은 계산
// 같은 예정 시각엔 한 번만: families/{fid}/game/feedalarm {due, at, hb(서버가 살아 있는 표시)}
const FD = { on: 0, day: 4, night: 7, ns: '20:00', ne: '06:00', pre: 10 };
const KST = 9 * 3600e3;
const ymd = ms => new Date(ms + KST).toISOString().slice(0, 10);
const hm = ms => new Date(ms + KST).toISOString().slice(11, 16);
const msOf = (date, t) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), +t.slice(0, 2), +t.slice(3, 5)) - KST;
const inNight = (t, c) => c.ns <= c.ne ? t >= c.ns && t < c.ne : t >= c.ns || t < c.ne;
const NAME = { formula: '분유', breast: '모유수유', pump: '유축수유' };
const URL = 'https://rew623.github.io/soeun-diary/?tab=day';

export async function runFeed(db, fcm, { from = 'fn', dry = false, log = console.log } = {}) {
  const now = Date.now(); let sent = 0, fams = 0;
  for (const fam of (await db.collection('families').get()).docs) {
    const g = (await fam.ref.collection('game').doc('shared').get()).data() || {}, c = Object.assign({}, FD, g.feed || {});
    if (!c.on) continue;
    const meta = fam.ref.collection('game').doc('feedalarm'), m = (await meta.get()).data() || {};
    if (from === 'fn' && !dry && (!m.hb || now - m.hb > 50 * 60e3)) await meta.set({ hb: now }, { merge: true });   // 서버가 살아 있다는 표시 (가끔만 씀)
    if (from === 'gh' && m.hb && now - m.hb < 70 * 60e3) continue;   // 서버가 돌고 있으면 예비는 쉬어요
    let last = null;
    for (const date of [ymd(now), ymd(now - 864e5)]) {
      const items = ((await fam.ref.collection('care').doc(date).get()).data() || {}).items || {};
      for (const it of Object.values(items)) {
        if (!it || !NAME[it.k] || !/^\d\d:\d\d$/.test(it.t || '')) continue;
        const s = msOf(date, it.t); if (s > now) continue;
        if (!last || s > last.s) last = { s, t: it.t, k: it.k, ml: it.ml };
      }
    }
    if (!last) continue;
    const night = inNight(last.t, c), due = last.s + (night ? +c.night : +c.day) * 36e5;
    if (now < due - (+c.pre || 0) * 60e3 || now > due + 2 * 36e5) continue;   // 아직이거나, 2시간 넘게 지난 건 안 보내요
    if (m.due === due) continue;   // 이 예정 시각엔 이미 보냄
    const tokens = (await fam.ref.collection('push').get()).docs.map(d => ({ id: d.id, ...d.data() })).filter(t => !t.viewer && t.token);
    if (!tokens.length) continue;
    fams++;
    const title = now < due - 60e3 ? `🍼 ${Math.round((due - now) / 60e3)}분 뒤 수유 · ${hm(due)} 예정` : `🍼 수유 시간이에요 · ${hm(due)} 예정`;
    const body = `다음 수유 예정 ${hm(due)} · 마지막 수유 ${last.t} ${NAME[last.k]}${last.ml ? ` ${last.ml}ml` : ''} (${night ? '밤' : '낮'} ${night ? c.night : c.day}시간 간격)`;
    log(`가족 ${fam.id.slice(0, 4)}…: 수유 알람 → ${tokens.length}대 (${from})`);   // 저장소가 공개라 이름·기록 내용은 안 남겨요
    if (dry) continue;
    await meta.set({ due, at: now }, { merge: true });   // 먼저 적어서 두 곳에서 겹쳐 보내지 않게
    for (const t of tokens) {
      try { await fcm.send({ token: t.token, data: { title, body, tag: 'feed', url: URL, alarm: '1' }, webpush: { headers: { Urgency: 'high', TTL: '7200' } } }); sent++; }
      catch (e) { log(`  보내기 실패 ${t.id.slice(0, 8)}: ${(e.errorInfo && e.errorInfo.code) || e.code || ''}`); }
    }
  }
  return { sent, fams };
}
