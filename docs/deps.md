# 연관 지도 (자동 생성: node tools/deps.mjs — 손으로 고치지 않음)

데이터 칸이나 모듈 함수를 바꾸면 오른쪽 파일들도 같이 확인해요.

## 데이터 (S.칸 → 읽는 파일)
| 칸 | 파일 |
|---|---|
| S.capsules | capsule, main-core, movie, paper, wanted |
| S.cares | characters, day, fun, game, main-core, settings |
| S.checkups | checkups, game, main-core, paper, wanted |
| S.cubes | main-core, main-meal, main-sheets |
| S.devs | dev, main-core, movie, paper, wanted |
| S.eps | main-core, main-sheets, main-sick |
| S.foods | fun, game, main-core, main-meal, main-sheets, movie, paper, recipes, wanted |
| S.game | board, game, main-core, movie, paper, room, settings, wanted |
| S.guesses | game, main-core, movie, wanted |
| S.logs | charges, claims, day, fun, game, main-core, main-sick, movie, wanted |
| S.looks | look, main-core, movie, wanted |
| S.me | album, board, capsule, claims, day, explore, focus, game, look, main-core, main-render, main-sheets, main-sick, paper, settings, studio, town, viewer, walk, wanted |
| S.meals | charges, day, fun, game, main-core, main-meal, movie, paper, wanted |
| S.menus | main-core, main-meal, viewer |
| S.moments | album, board, book, charges, dupes, explore, family, focus, fun, game, main-album, main-core, memories, movie, paper, posecam, room, settings, studio, viewer, walk, wanted |
| S.periods | claims, main-album, main-core, main-render, main-sheets |
| S.profile | album, board, book, calendar, capsule, characters, charges, checkups, day, dev, family, fun, game, look, main-album, main-boot, main-core, main-meal, main-render, main-sheets, main-sick, memories, movie, music, paper, posecam, posts, recipes, room, settings, studio, town, viewer, walk, wanted |
| S.records | book, characters, charges, fun, game, main-core, main-render, main-sheets, memories, movie, paper, room, settings, studio, viewer, wanted |
| S.vaccines | book, charges, claims, fun, game, main-album, main-core, main-render, main-sheets, movie, paper, settings, wanted |
| S.visits | claims, fun, game, hospitals, main-core, main-sick, movie, wanted |
| S.walks | characters, day, explore, game, main-core, paper, settings, walk |

## 모듈 (만든 파일 → 부르는 파일)
| 모듈 (파일) | 부르는 파일 |
|---|---|
| ALBUM (album) | calendar, family, main-album, main-core, main-render, main-sheets, posecam, studio, viewer, walk |
| BOARD (board) | main-album, main-render, viewer |
| BOOK (book) | main-render |
| CAL (calendar) | main-album |
| CAPSULE (capsule) | main-render |
| CHARGES (charges) | board, main-render |
| CHARS (characters) | board, book, day, explore, family, fun, game, main-album, main-core, main-meal, main-render, main-sheets, main-sick, memories, movie, paper, room, settings, themes, town, walk, wanted |
| CHECKUPS (checkups) | board, main-render |
| CLAIM (claims) | checkups, main-render, main-sheets, main-sick |
| CV (studio) | album, capsule, claims, dupes, explore, focus, look, main-meal, main-render, movie, paper, posecam, settings, viewer, walk, wanted |
| DAY (day) | main-render, main-sick |
| DEV (dev) | main-render |
| DUPES (dupes) | album |
| EXPLORE (explore) | album, family, main-render, movie, paper, viewer, walk |
| FAM (app) | main-sheets, settings |
| FAMILY (family) | main-album, viewer |
| FOCUS (focus) | album, main-render, main-sheets, paper, studio, viewer |
| FUN (fun) | game, main-render |
| GAME (game) | board, capsule, characters, day, fun, main-core, main-render, main-sheets, movie, paper, posecam, room, settings, studio, town, viewer, walk, wanted |
| HOSP (hospitals) | board, explore, main-render, main-sick, town, viewer, walk |
| LOOK (look) | main-render, movie, paper |
| MEMO (memories) | main-album |
| MOVIE (movie) | main-render, viewer |
| MUSIC (music) | movie, room |
| PAPER (paper) | main-render |
| POSECAM (posecam) | viewer |
| POSTS (posts) | main-render, room, settings |
| RECIPES (recipes) | main-meal, main-render |
| ROOMS (room) | game |
| SETTINGS (settings) | main-render |
| THEME (themes) | settings |
| TOWN (town) | main-render, room, walk |
| VIEWER (viewer) | board, main-sheets |
| WALK (walk) | album, day, explore, main-render, paper, settings, viewer |
| WANTED (wanted) | characters, main-render, movie, paper, room |
