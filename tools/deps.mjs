// 연관 지도 만들기: 어떤 데이터(S.칸)·모듈(GAME. 등)을 어느 파일이 쓰는지 → docs/deps.md
// 데이터 칸이나 모듈 함수를 바꿀 때 이 표의 파일들도 같이 확인 (node tools/deps.mjs 로 다시 만듦)
import fs from 'fs';
const files = fs.readdirSync('.').filter(f => /\.(js|html)$/.test(f) && !['config.js', 'map-key.js', 'push-key.js', 'sw.js'].includes(f));
const src = Object.fromEntries(files.map(f => [f, fs.readFileSync(f, 'utf8')]));
const uses = re => { const m = {}; for (const [f, t] of Object.entries(src)) for (const x of t.matchAll(re)) (m[x[1]] = m[x[1]] || new Set()).add(f.replace(/\.js$/, '')); return m; };
const row = (k, set) => `| ${k} | ${[...set].sort().join(', ')} |`;
const S = uses(/\bS\.(records|periods|vaccines|eps|logs|visits|moments|foods|meals|cubes|menus|cares|walks|guesses|looks|capsules|devs|checkups|game|profile|me)\b/g);
const mods = {}; for (const [f, t] of Object.entries(src)) { const m = /window\.([A-Z]{2,})\s*=/.exec(t); if (m) mods[m[1]] = f; }
const M = uses(new RegExp(`\\b(${Object.keys(mods).join('|')})\\.[a-zA-Z]`, 'g'));
let out = '# 연관 지도 (자동 생성: node tools/deps.mjs — 손으로 고치지 않음)\n\n데이터 칸이나 모듈 함수를 바꾸면 오른쪽 파일들도 같이 확인해요.\n\n## 데이터 (S.칸 → 읽는 파일)\n| 칸 | 파일 |\n|---|---|\n';
out += Object.keys(S).sort().map(k => row('S.' + k, S[k])).join('\n');
out += '\n\n## 모듈 (만든 파일 → 부르는 파일)\n| 모듈 (파일) | 부르는 파일 |\n|---|---|\n';
out += Object.keys(M).sort().map(k => row(`${k} (${mods[k].replace(/\.js$/, '')})`, new Set([...M[k]].filter(f => f + '.js' !== mods[k])))).join('\n') + '\n';
fs.writeFileSync('docs/deps.md', out); console.log('docs/deps.md', out.length, 'bytes');
