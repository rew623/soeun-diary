// Firebase 서버(Cloud Functions, Blaze): 1분마다 수유 알람 확인 → 정한 시각에 거의 맞춰 알림
// 올리기(처음 한 번, 고칠 때마다): Google Cloud Shell에서 README의 '수유 알람 서버 올리기' 명령
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { runFeed } from './feedcore.mjs';

initializeApp();
export const feedAlarm = onSchedule({ schedule: 'every 1 minutes', timeZone: 'Asia/Seoul', region: 'asia-northeast3', memory: '256MiB', timeoutSeconds: 50, retryCount: 0, maxInstances: 1 }, async () => {
  const r = await runFeed(getFirestore(), getMessaging(), { from: 'fn' });
  if (r.sent) console.log(`수유 알람 ${r.sent}개 보냄`);
});
