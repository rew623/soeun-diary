// 미리보기(MOCK) 앱을 진짜 브라우저로 띄우는 시험 도구 — Firebase 없이 index.html의 MOCK/DB + 시험 데이터(seed.js)로 돌아요
// 쓰는 법: import { launch } from './harness.mjs'; const { b, page, errs } = await launch(); ... await b.close();
// 사진은 색 칠한 그림(SVG), 카카오맵은 가짜(kakao-stub.js), 글꼴은 폰 기본 글꼴 (모양 확인용, 진짜 글꼴은 아님)
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const COLORS = ['#F4C9A8', '#BFD8F2', '#D7E8C4', '#F2D0E0', '#E8DCC2', '#CFC6EE', '#F6E3A2', '#C9E6E2'];
const photo = n => `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="${COLORS[n % 8]}"/><circle cx="300" cy="330" r="150" fill="#FFE3CF"/><circle cx="250" cy="310" r="14" fill="#333"/><circle cx="350" cy="310" r="14" fill="#333"/><path d="M255 390q45 40 90 0" stroke="#333" stroke-width="10" fill="none"/></svg>`;
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
export async function launch(opt = {}) {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ permissions: ['geolocation'], geolocation: { latitude: 37.35, longitude: 127.9, accuracy: 5 }, timezoneId: 'Asia/Seoul', locale: 'ko-KR', viewport: { width: opt.w || 384, height: opt.h || 832 }, isMobile: true, hasTouch: true, deviceScaleFactor: opt.dpr || 1, serviceWorkers: 'block' });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errs.push(m.text()); });
  await page.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.hostname === 'firebasestorage.googleapis.com') return r.fulfill({ contentType: 'image/svg+xml', headers: { 'Access-Control-Allow-Origin': '*' }, body: photo(+((u.pathname.match(/p(\d+)/) || [0, 0])[1])) });
    if (u.hostname === 'dapi.kakao.com') return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(HERE, 'kakao-stub.js')) });
    if (u.hostname !== 'app.test') return r.abort();
    const p = u.pathname === '/' ? '/index.html' : u.pathname;
    if (p === '/app.js') return r.fulfill({ contentType: 'text/javascript', body: 'window.__resolveAPI({call:async(fn,a)=>MOCK[fn](...a)});' });
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ body: fs.readFileSync(f), contentType: TYPES[path.extname(p)] || 'application/octet-stream' });
  });
  await page.addInitScript(() => { localStorage.setItem('investigator', '엄마'); });
  await page.goto('https://app.test/'); await page.waitForTimeout(1200);
  if (opt.seed !== false) {
    await page.addScriptTag({ path: path.join(HERE, 'seed.js') }); await page.evaluate(() => window.__seed()); await page.waitForTimeout(500);
    await page.addScriptTag({ path: path.join(HERE, 'seed-care.js') }); await page.evaluate(() => window.__seedCare()); await page.waitForTimeout(300);
  }
  await page.evaluate(() => { if (window.GAME) { GAME.check = () => {}; } if (window.WANTED) WANTED.check = () => {}; });   // 축하 효과가 화면을 가리지 않게
  return { b, page, errs };
}
