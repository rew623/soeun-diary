# 소은이 성장 수사 일지 — 작업 규칙
- 앱: GitHub Pages(main/root) 배포 PWA, Firebase(Auth/Firestore/Storage)
- 요청한 부분만 바꾸고 기존 기능·탭 5개(성장 수사/예방접종/급식 수사/긴급 출동/사건 앨범)는 유지
- 파일을 바꾸면 sw.js의 VERSION을 반드시 올릴 것 (형식: YYYY.MM.DD-n)
- config.js는 절대 수정하지 말 것
- 디자인 유지: 탐정 수첩 테마, 남색 #1F2A44, 크라프트지, 도장 빨강 #B3261E, 글꼴 Black Han Sans + Nanum Gothic Coding
- Firestore 구조(families/{fid} 하위 컬렉션, users, invites)는 바꾸지 말 것. 바꿔야 하면 먼저 알리고 기존 데이터 이전 방법을 제시
- 생후 일수는 태어난 날을 1일로 셈
- 작업이 끝나면 브랜치를 따로 만들지 말고 main에 바로 올릴 것
- 끝나면 바뀐 파일과 새 sw.js VERSION을 짧게 알려줄 것

## 파일 지도
- index.html: 화면 대부분 (탭 렌더링, 편집창 sheet, 그래프, 클릭 처리 switch, 상태 S, 미리보기용 MOCK/DB)
- app.js: Firebase 연결 (로그인, 가족 공간, onSnapshot 구독, 저장 API, 사진 업로드, 새 버전 안내)
- config.js: Firebase 설정 (수정 금지)
- sw.js: 서비스 워커 (앱 파일 캐시 우선, 사진 캐시, hospitals/pharmacies.json 네트워크 우선), VERSION
- hospitals.js: 긴급 출동 > 병원 수사 (카카오맵, 목록, 필터, 관심 병원·약국, 공휴일 목록)
- map-key.js: 카카오맵 JavaScript 키 (공개용, 등록 도메인 rew623.github.io)
- viewer.js: 사진·보드 카드 크게 보기(핀치 줌), 안드로이드 뒤로가기, 길게 누르기 막기
- board.js: 사건 앨범 > 수사 보드
- recipes.js: 급식 수사 > 센터 식단 올리기 (엑셀 → 표준레시피, PDF → 식단표 이미지, 사진)
- checkups.js: 예방접종 탭 > 영유아검진 (검진 8회 + 구강검진 3회 일정을 태어난 날로 계산)
- hospitals.json / pharmacies.json: Actions가 매주 만드는 원주시 병원·약국 목록 (직접 고치지 않음)
- .github/workflows/hospitals.yml: 병원 정보 받기 (매주 월 03:00 KST + 수동), 시크릿 DATA_GO_KR_KEY
- .github/scripts/: 공공데이터 API 호출 스크립트 (lib.mjs 공통)
- 새 JS 파일은 index.html의 <script>와 sw.js의 SHELL 목록에 추가할 것

## Firestore 구조
- users/{uid}: { fid } 내가 속한 가족 공간
- invites/{6자리 코드}: { fid, by, exp } 7일짜리 초대 코드
- families/{fid}: 아기 프로필 (name, birth, sex, mom, dad, 사진 URL)
- families/{fid} 하위 컬렉션:
  - members/{uid}: { role(엄마/아빠), name, email }
  - records, periods, vaccines, ep, log, visit, mom(앨범), food, meal, cube, menu(식단표 사진)
  - hospitals/{hpid}: star, memo, lunch, reserve, moonlight, updatedBy, updatedAt (관심 병원·약국)
  - checkups/{g1~g8, o1~o3}: done, hospital, memo, by, updatedAt (받은 검진만 저장, g=건강검진 o=구강검진)
  - recipes/{YYYY-MM}: title, file, stages[{ stage, items[{ d, meal, raw, ing[{ n, g }], how, src }] }], by, updatedAt
- mom 문서의 board: true/false = 수사 보드에 붙인 사진
- 보안 규칙: families/{fid} 아래는 members에 있는 사람만 읽기·쓰기 (members 제외 하위 컬렉션 전체 허용이라 새 컬렉션도 규칙 수정 불필요)
- Storage: families/{fid}/photos/ 에 이미지만 올림 (앱에서 400KB 이하로 줄임)

## 주의할 점
- 파일 선택 칸(input type=file)은 #app 밖(body에 고정)이나 편집창(sheet) 안에 둘 것. 파일 창에서 돌아올 때 화면을 다시 그려 #app 안의 칸이 사라짐
- GitHub Pages 배포(pages build and deployment)가 GitHub 쪽 오류로 가끔 실패함. 실패한 job을 재실행하면 됨
- map-key.js를 바꾸면 sw.js VERSION도 올릴 것 (안 올리면 폰에 반영 안 됨)
- 뒤로가기: 크롬은 화면을 만지기 전에 넣은 기록 칸을 건너뛸 수 있어, 앱을 열자마자 뒤로가기를 누르면 안내 없이 꺼질 수 있음
