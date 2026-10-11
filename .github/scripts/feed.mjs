// 수유 알람 예비: Firebase 서버(functions/feedAlarm)가 1시간 넘게 멈춰 있을 때만 대신 보내요 (feed.yml, 10분마다)
// 계산은 functions/feedcore.mjs 하나를 같이 써요
import admin from 'firebase-admin';
import { runFeed } from '../../functions/feedcore.mjs';

const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
if (!raw) { console.log('FIREBASE_SERVICE_ACCOUNT 시크릿이 없어 건너뛰어요'); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
const r = await runFeed(admin.firestore(), admin.messaging(), { from: 'gh', dry: process.env.DRY === '1' });
console.log(`수유 알람(예비) 보낸 가족 ${r.fams}곳, 알림 ${r.sent}개`);
process.exit(0);
