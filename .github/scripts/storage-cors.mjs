// 사진 저장소(Firebase Storage 버킷)에 "우리 앱 주소에서 사진 읽기(CORS)"를 허용해요 (storage-cors.yml, 한 번만 하면 돼요)
// 이게 있어야 기념 사진관·성장 영상·소은일보가 사진을 canvas에 올려 새 이미지로 저장할 수 있어요 (그냥 보여 주는 건 없어도 돼요)
// 시크릿 FIREBASE_SERVICE_ACCOUNT (아침 알림과 같은 것). 없으면 건너뛰어요
import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';

const ORIGIN = 'https://rew623.github.io';
const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
if (!raw) { console.log('FIREBASE_SERVICE_ACCOUNT 시크릿이 없어 건너뛰어요 → Google Cloud Shell에서 직접 설정하는 방법은 CLAUDE.md 참고'); process.exit(0); }
const cfg = await readFile(new URL('../../config.js', import.meta.url), 'utf8');
const name = (/storageBucket:\s*["']([^"']+)["']/.exec(cfg) || [])[1];
if (!name) { console.error('config.js에서 storageBucket을 못 찾았어요'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
const bucket = admin.storage().bucket(name);
const [meta] = await bucket.getMetadata();
const cur = meta.cors || [];
console.log(`버킷 ${name} 지금 CORS: ${JSON.stringify(cur)}`);
if (cur.some(r => (r.origin || []).some(o => o === ORIGIN || o === '*') && (r.method || []).includes('GET'))) { console.log('이미 허용돼 있어요'); process.exit(0); }
const next = cur.concat([{ origin: [ORIGIN], method: ['GET', 'HEAD'], responseHeader: ['Content-Type', 'Content-Length', 'Cache-Control'], maxAgeSeconds: 3600 }]);
await bucket.setCorsConfiguration(next);
const [after] = await bucket.getMetadata();
console.log(`설정 완료: ${JSON.stringify(after.cors)}`);
process.exit(0);
