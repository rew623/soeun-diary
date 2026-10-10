// 아침 알림: 가족 공간마다 오늘 챙길 일을 골라 Firebase Cloud Messaging으로 보내요 (notify.yml, 매일 08:50 KST)
// 시크릿 FIREBASE_SERVICE_ACCOUNT (Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 JSON 전체)
// 보내는 것: 예방접종 D-3·D-1·당일(예약일 또는 권장일), 영유아검진 기간 시작·마감 7일 전, 이유식 3일 관찰 끝, 100일·200일·첫 돌
import admin from 'firebase-admin';

const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
if (!raw) { console.log('FIREBASE_SERVICE_ACCOUNT 시크릿이 없어 건너뛰어요'); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
const db = admin.firestore(), fcm = admin.messaging();
const DRY = process.env.DRY === '1';
const URL = 'https://rew623.github.io/soeun-diary/';

const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const pd = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const days = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const addDays = (s, n) => new Date(pd(s) + n * 864e5).toISOString().slice(0, 10);
const addMonths = (s, m) => { const [y, mo, d] = s.split('-').map(Number); return new Date(Date.UTC(y, mo - 1 + m, d)).toISOString().slice(0, 10); };
// checkups.js와 같은 일정
const CHECKS = [['g1', '영유아검진 1차', { d: 14 }, { d: 35 }], ['g2', '영유아검진 2차', { m: 4 }, { m: 6 }], ['g3', '영유아검진 3차', { m: 9 }, { m: 12 }], ['g4', '영유아검진 4차', { m: 18 }, { m: 24 }], ['o1', '구강검진 1차', { m: 18 }, { m: 29 }], ['g5', '영유아검진 5차', { m: 30 }, { m: 36 }], ['g6', '영유아검진 6차', { m: 42 }, { m: 48 }], ['o2', '구강검진 2차', { m: 42 }, { m: 53 }], ['g7', '영유아검진 7차', { m: 54 }, { m: 60 }], ['o3', '구강검진 3차', { m: 54 }, { m: 65 }], ['g8', '영유아검진 8차', { m: 66 }, { m: 71 }]];
const win = (b, f, t) => f.d != null ? [addDays(b, f.d), addDays(b, t.d)] : [addMonths(b, f.m), addDays(addMonths(b, t.m + 1), -1)];
const all = async (ref, c) => (await ref.collection(c).get()).docs.map(d => ({ id: d.id, ...d.data() }));

let sent = 0, dropped = 0;
for (const fam of (await db.collection('families').get()).docs) {
  const f = fam.data(), b = f.birth; if (!b) continue;
  const tokens = await all(fam.ref, 'push'); if (!tokens.length) continue;
  const name = (f.name || '우리 아기').replace(/^[가-힣](?=[가-힣]{2}$)/, ''), msgs = [];   // 성 빼고 부르기 (소은)
  const add = (title, body, tag, all) => msgs.push({ title, body, tag, all: !!all });
  // 예방접종
  const periods = await all(fam.ref, 'periods'), vacs = await all(fam.ref, 'vaccines');
  for (const p of periods) {
    const vs = vacs.filter(v => v.period === p.id), left = vs.filter(v => !v.done); if (!vs.length || !left.length) continue;
    const date = p.confirmed || (p.month !== '' && p.month != null ? addMonths(b, +p.month) : ''); if (!date) continue;
    const dd = days(today, date);
    if ([3, 1, 0].includes(dd)) add(dd ? `💉 ${p.name} 접종 D-${dd}` : `💉 오늘 ${p.name} 접종날이에요`, `${left.map(v => v.name).join(', ')} · ${p.confirmed ? '예약한 날' : '권장일 기준, 병원 예약했나요?'}`, 'vac-' + p.id);
  }
  // 영유아검진
  const done = new Set((await all(fam.ref, 'checkups')).filter(c => c.done).map(c => c.id));
  for (const [id, nm, fr, to] of CHECKS) {
    if (done.has(id)) continue; const [s, e] = win(b, fr, to);
    if (s === today) add(`🩺 ${nm} 기간 시작`, `오늘부터 ${e.slice(5).replace('-', '/')}까지 받을 수 있어요. 미리 예약해 두세요`, 'chk-' + id);
    else if (days(today, e) === 7) add(`🩺 ${nm} 마감 7일 전`, `${e.slice(5).replace('-', '/')}까지예요. 아직 안 받았다면 꼭 챙겨요`, 'chk-' + id);
  }
  // 이유식 3일 관찰
  for (const fd of await all(fam.ref, 'food')) if (!fd.result && fd.start && days(fd.start, today) === 2) add(`🥄 ${fd.name} 심문 3일째`, `오늘까지 이상 없으면 무혐의(통과)로 판정해 주세요`, 'food-' + fd.id);
  // 기념일 (보기 전용 가족에게도)
  const dn = days(b, today) + 1;
  if (dn === 100) add(`🎉 오늘 ${name} 생후 100일!`, `100일 사건 보고서가 기밀 해제됐어요. 사건 앨범에서 열어 보세요`, 'day100', true);
  if (dn === 200) add(`🌟 오늘 ${name} 생후 200일!`, `벌써 200일이에요. 오늘 사진 한 장 남겨요`, 'day200', true);
  if (today.slice(5) === b.slice(5) && today > b) add(`🎂 오늘 ${name} 생일!`, `${+today.slice(0, 4) - +b.slice(0, 4)}번째 생일 축하해요`, 'bday', true);
  if (dn > 1 && dn !== 100 && today.slice(8) === b.slice(8) && dn < 800) add(`📸 ${name} 생후 ${Math.round(days(b, today) / 30.44)}개월 되는 날`, `월별 증거 사진 찍을 시간이에요`, 'month', true);
  // 봉인된 증거물이 열리는 날 (기념일처럼 보기 전용 가족에게도)
  for (const c of await all(fam.ref, 'capsule')) if (c.open === today) add('🔓 오늘 봉인된 증거물이 열려요', `${c.by || '수사관'} 수사관이 ${String(c.sealed || '').replace(/-/g, '.')}에 봉인한 편지예요. 사건 앨범 → 봉인된 증거물에서 열어 보세요`, 'cap-' + c.id, true);
  // 매달 1일: 지난달 소은일보 발행
  if (today.slice(8) === '01' && addDays(today, -1).slice(0, 7) >= b.slice(0, 7)) add(`📰 ${name}일보 ${+addDays(today, -1).slice(5, 7)}월호 발행`, '지난달 소식이 신문 한 장에 담겼어요. 가족 단톡방에 보내 볼까요?', 'paper', true);
  if (!msgs.length) continue;
  console.log(`${fam.id}: ${msgs.map(m => m.title).join(' / ')} → ${tokens.length}대`);
  for (const t of tokens) {
    for (const m of msgs) {
      if (t.viewer && !m.all) continue;   // 보기 전용 가족에겐 기념일만
      if (DRY) continue;
      try { await fcm.send({ token: t.token, data: { title: m.title, body: m.body, tag: m.tag, url: URL }, webpush: { headers: { Urgency: 'high', TTL: '43200' } } }); sent++; }
      catch (e) {
        const c = e.errorInfo && e.errorInfo.code || e.code || '';
        if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(c)) { await fam.ref.collection('push').doc(t.id).delete(); dropped++; console.log(`  끊긴 폰 정리: ${t.id.slice(0, 8)}`); }
        else console.warn(`  보내기 실패 ${t.id.slice(0, 8)}: ${c} ${e.message}`);
      }
    }
  }
}
console.log(`보낸 알림 ${sent}개, 정리한 폰 ${dropped}대${DRY ? ' (연습 모드)' : ''}`);
process.exit(0);
