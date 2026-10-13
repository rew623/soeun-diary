# 소은이 성장 수사 일지 — 작업 규칙

## 꼭 지킬 것
- 앱: GitHub Pages(main/root) PWA + Firebase(Auth/Firestore/Storage, Blaze). 빌드 없음 — 전역 스크립트들(index.html의 <script> 순서대로)
- 요청한 부분만 바꿈. 탭 7개(성장 수사/하루 수사/동네 탐문/사건 앨범/예방접종/급식 수사/긴급 출동) 유지
- config.js 수정 금지. Firestore 구조(docs/data.md)는 바꾸기 전에 사용자에게 알리고 이전 방법 제시
- 디자인: 탐정 수첩 테마, 남색 #1F2A44, 크라프트지, 도장 빨강 #B3261E, 글꼴 Jua(제목)·Gowun Dodum(본문)만
- 생후 일수는 태어난 날 = 1일. 공개 저장소라 개인 기록·이름·키는 커밋 금지
- main에 바로 올림(브랜치 X). 파일을 바꾸면 sw.js VERSION을 올림 → `tools/ship.sh`가 해 줌
- 끝나면 바뀐 파일과 새 VERSION을 짧게 알림 (한국어)

## 일하는 법 (토큰 아끼기 — 사용자는 화면 캡처로 짧은 수정 요청을 자주 함)
1. 캡처 속 한글 문구로 `grep -n` → 그 함수 근처만 `sed -n`으로 읽기 (긴 줄은 `cut -c1-300`). 파일 통째로 읽지 않기
2. 그 기능의 자세한 설명·예전 결정은 아래 표의 `docs/*.md` 중 **해당 파일 하나만** 필요할 때 읽기
3. 데이터 칸·모듈 함수를 바꾸면 `docs/deps.md`(누가 쓰는지 표, `node tools/deps.mjs`로 다시 만듦)에 나온 파일도 확인 — 연관 기능이 빠지지 않게
4. 확인: `node tools/test/smoke.mjs` (MOCK로 모든 탭·화면 열어 오류 점검, 사진은 /tmp/smoke), 특정 화면은 `tools/test/harness.mjs`의 launch()로 Playwright
5. 올리기: `tools/ship.sh <<'MSG' … MSG` (VERSION 올림·문법 검사·커밋·push, `SMOKE=1`이면 전체 점검까지)
6. 고친 내용은 해당 `docs/*.md`에만 한 줄로 적기. **CLAUDE.md는 규칙·지도가 바뀔 때만** (고치면 대화마다 통째로 다시 읽혀 비쌈)

## 지도
| 영역 | 파일 | 문서 |
|---|---|---|
| 뼈대: 상태 S·MOCK/DB·NAV·폰 사본 | main-core.js (+ index.html: HTML·CSS만), app.js(Firebase·저장 API), sw.js | docs/core.md |
| 화면 그리기·성장 수사·예방접종 탭·그래프·탭 바 | main-render.js | docs/core.md, docs/health.md |
| 긴급 출동 / 사건 앨범 / 급식 수사 탭 | main-sick.js / main-album.js / main-meal.js | docs/health.md, docs/album.md |
| 편집창(sheet)들·클릭 처리 switch(data-act) | main-sheets.js | docs/core.md |
| 시작·좌우 밀기·당겨서 새로고침 / 설정 / 육아 글 | main-boot.js / settings.js / posts.js | docs/core.md |
| 화면·동작 공통 규칙 (뒤로가기·아래 창·z-index·속도·사진 고르기) | — | docs/ui-rules.md |
| 하루 수사 (수유·기저귀·잠·수유 알람·다른 앱 가져오기) | day.js, functions/ | docs/day.md |
| 동네 탐문 (날씨·탐험 지도·탐문 기록) | town.js, explore.js, walk.js | docs/town.md |
| 사건 앨범·사진 도구·영상·신문·봉인·닮은꼴 | album.js, family.js, dupes.js, memories.js, viewer.js, board.js, focus.js, studio.js, posecam.js, movie.js, music.js, paper.js, book.js, capsule.js, look.js | docs/album.md |
| 놀이 (계급·도토리·방·캐릭터·깍정이) | game.js, fun.js, room.js, characters.js, wanted.js, charges.js | docs/game.md |
| 예방접종·검진·발달·급식·긴급 출동 | index.html 일부, checkups.js, dev.js, recipes.js, hospitals.js | docs/health.md |
| 서버·자동 작업 (Actions·Functions·data/*.json·알림) | .github/, functions/, data/ | docs/ops.md |
| Firestore 구조 | — | docs/data.md |
| 연관 지도 (자동) | — | docs/deps.md |

## 자주 쓰는 공통 도구 (main-*.js 전역)
- 상태 `S`(tab·view·데이터 배열), `render()`(#app 전체 다시 그림 — 연달아 부르지 않기), `refresh()`
- 편집창 `openSheet(html)`/`closeSheet()`, 확인창 `await ask(글, {ok, danger, no})`(confirm 금지), 알림 띠 `toast(글)`
- 저장 `await write('API이름', ...)`(app.js API, MOCK에도 같은 이름 필요), 안쪽 화면 `S.view='이름'` + 돌아가기 `goBack()`/`data-act="back"`
- 글자 `esc()`, 조사 `jo(낱말,'은','는')`·`joRo()`, 날짜 `today()`·`addDays()`
- 새 JS 파일은 index.html <script>(순서 중요: main-core → … → main-boot는 기능 파일들 뒤)와 sw.js SHELL에 추가
- CSS: 공통은 index.html <style>(아기자기 꾸미기는 <style id="cute">), 기능 화면 CSS는 각 JS 파일 안
