#!/usr/bin/env bash
# 올리기 한 번에: sw.js VERSION 올리기(날짜-번호, 확인까지) → 바뀐 JS 문법 검사 → (SMOKE=1이면 전체 점검) → 커밋 → main에 올리기
# 쓰는 법: tools/ship.sh <<'MSG'
#   커밋 제목
#
#   Co-Authored-By: ...
#   MSG
set -euo pipefail
cd "$(dirname "$0")/.."
MSG="$(cat)"; [ -n "$MSG" ] || { echo "커밋 글을 stdin으로 주세요"; exit 1; }
# VERSION: 오늘(KST) 날짜 + 지금 번호 +1
node - <<'JS'
const fs = require('fs'), s = fs.readFileSync('sw.js', 'utf8'), m = /const VERSION = '(\d{4}\.\d{2}\.\d{2})-(\d+)';/.exec(s);
if (!m) { console.error('sw.js VERSION을 못 찾았어요'); process.exit(1); }
const d = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10).replace(/-/g, '.'), v = `${d}-${+m[2] + 1}`;
const n = s.replace(m[0], `const VERSION = '${v}';`); if (n === s) { console.error('VERSION이 안 바뀌었어요'); process.exit(1); }
fs.writeFileSync('sw.js', n); console.log('VERSION', v);
JS
for f in $(git diff --name-only HEAD -- '*.js' '*.mjs'; git ls-files --others --exclude-standard -- '*.js' '*.mjs'); do [ -f "$f" ] && node --check "$f"; done
if [ "${SMOKE:-0}" = 1 ]; then node tools/test/smoke.mjs /tmp/smoke | tail -3; fi
git add -A && git commit -q -F - <<<"$MSG"
for i in 1 2 3 4; do git pull -q --rebase origin main && git push -q origin HEAD:main && break || sleep $((2 ** i)); done
git log --oneline -1; grep -o "const VERSION = '[^']*'" sw.js
