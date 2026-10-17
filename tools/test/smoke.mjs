// 전체 점검: 탭 7개·소탭·안쪽 화면을 차례로 열어 오류가 나는지 보고, 화면 사진을 남겨요
// node tools/test/smoke.mjs [사진 폴더=/tmp/smoke]   → 마지막 줄 'OK' 또는 오류 목록
import { launch } from './harness.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/smoke'; fs.mkdirSync(OUT, { recursive: true });
const { b, page, errs } = await launch();
const shot = async n => { await page.waitForTimeout(350); await page.screenshot({ path: `${OUT}/${n}.png` }); };
const go = async (n, f) => { const e0 = errs.length; try { await page.evaluate(f); } catch (e) { errs.push(n + ': ' + e.message); } await shot(n); if (errs.length > e0) console.log('✗', n, errs.slice(e0).join(' | ').slice(0, 300)); else console.log('✓', n); };
const tabs = ['grow', 'day', 'town', 'album', 'vac', 'meal', 'sick'];
for (const t of tabs) await go('tab-' + t, `S.view='';S.tab='${t}';render();scrollTo(0,0)`);
await go('day-pattern', `S.tab='day';render();document.querySelector('.dysub [data-v="pat"]')&&document.querySelector('.dysub [data-v="pat"]').click()`);
await go('day-week', `document.querySelector('.dyseg [data-v="week"]')&&document.querySelector('.dyseg [data-v="week"]').click()`);
await go('town-info', `S.tab='town';S.townView='info';render()`);
await go('album-family', `S.tab='album';S.albumView='family';render()`);
await go('album-board', `S.tab='album';S.albumView='board';render()`);
await go('vac-checkup', `S.tab='vac';S.vacView='check';render()`);
await go('vac-dev', `S.tab='vac';S.vacView='dev';render()`);
for (const v of ['settings', 'medals', 'fun', 'wanted', 'look', 'capsule', 'paper', 'explore', 'studio', 'movie', 'book', 'posts', 'claims'])
  await go('view-' + v, `S.tab='grow';S.view='${v}';render();scrollTo(0,0)`);
await go('back-home', `S.view='';S.tab='grow';render()`);
console.log(errs.length ? 'ERRORS ' + errs.length : 'OK');
await b.close();
process.exit(errs.length ? 1 : 0);
