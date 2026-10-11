// 수유 알람: 마지막 수유(분유·모유·유축) + 낮/밤 간격이 되면 알림 (feed.yml, 10분마다)
// 설정은 families/{fid}/game/shared 의 feed {on, day, night, ns, ne, pre} (day.js와 같은 계산)
// 같은 예정 시각엔 한 번만: families/{fid}/game/feedalarm {due}
// 저장소가 공개라 Actions 기록엔 가족 id 앞 4글자·개수만 남겨요
import admin from 'firebase-admin';

const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
if (!raw) { console.log('FIREBASE_SERVICE_ACCOUNT 시크릿이 없어 건너뛰어요'); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
const db = admin.firestore(), fcm = admin.messaging();
const DRY = process.env.DRY === '1';
const URL = 'https://rew623.github.io/soeun-diary/';
const FD = { on: 0, day: 4, night: 7, ns: '20:00', ne: '06:00', pre: 10 };
const KST = 9 * 3600e3, now = Date.now();
const ymd = ms => new Date(ms + KST).toISOString().slice(0, 10);
const hm = ms => new Date(ms + KST).toISOString().slice(11, 16);
const msOf = (date, t) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), +t.slice(0, 2), +t.slice(3, 5)) - KST;
const inNight = (t, c) => c.ns <= c.ne ? t >= c.ns && t < c.ne : t >= c.ns || t < c.ne;
const NAME = { formula: '분유', breast: '모유수유', pump: '유축수유' };

let sent = 0, fams = 0;
for (const fam of (await db.collection('families').get()).docs) {
  const g = (await fam.ref.collection('game').doc('shared').get()).data() || {}, c = Object.assign({}, FD, g.feed || {});
  if (!c.on) continue;
  const tokens = (await fam.ref.collection('push').get()).docs.map(d => ({ id: d.id, ...d.data() })).filter(t => !t.viewer && t.token);
  if (!tokens.length) continue;
  // 오늘·어제 하루 수사 문서에서 마지막 수유
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
  const meta = fam.ref.collection('game').doc('feedalarm');
  if (((await meta.get()).data() || {}).due === due) continue;   // 이 예정 시각엔 이미 보냄
  fams++;
  const title = now < due ? `🍼 곧 수유 시간 · ${hm(due)} 예정` : `🍼 수유 시간이에요 · ${hm(due)} 예정`;
  const body = `다음 수유 예정 ${hm(due)} · 마지막 수유 ${last.t} ${NAME[last.k]}${last.ml ? ` ${last.ml}ml` : ''} (${night ? '밤' : '낮'} ${night ? c.night : c.day}시간 간격)`;
  console.log(`가족 ${fam.id.slice(0, 4)}…: 수유 알람 → ${tokens.length}대`);
  if (!DRY) {
    for (const t of tokens) {
      try { await fcm.send({ token: t.token, data: { title, body, tag: 'feed', url: URL }, webpush: { headers: { Urgency: 'high', TTL: '7200' } } }); sent++; }
      catch (e) { console.warn(`  보내기 실패 ${t.id.slice(0, 8)}: ${(e.errorInfo && e.errorInfo.code) || e.code || ''}`); }
    }
    await meta.set({ due, at: now });
  }
}
console.log(`수유 알람 보낸 가족 ${fams}곳, 알림 ${sent}개${DRY ? ' (연습 모드)' : ''}`);
process.exit(0);
