# 소은이 성장 수사 일지 — 작업 규칙
- 앱: GitHub Pages(main/root) 배포 PWA, Firebase(Auth/Firestore/Storage)
- 요청한 부분만 바꾸고 기존 기능·탭 6개(순서: 성장 수사/동네 탐문/사건 앨범/예방접종/급식 수사/긴급 출동)는 유지 (동네 탐문은 2026.10 사용자 요청으로 추가)
- 파일을 바꾸면 sw.js의 VERSION을 반드시 올릴 것 (형식: YYYY.MM.DD-n)
- config.js는 절대 수정하지 말 것
- 디자인 유지: 탐정 수첩 테마, 남색 #1F2A44, 크라프트지, 도장 빨강 #B3261E, 글꼴 Jua(제목) + Gowun Dodum(본문) (2026.10 사용자 요청으로 Black Han Sans + Nanum Gothic Coding에서 바꿈)
  - 아기자기 꾸미기: index.html의 <style id="cute"> (둥근 카드, 바느질 점선, 깅엄 체크, 마스킹 테이프, 둥둥 뜬 아래 메뉴)
- Firestore 구조(families/{fid} 하위 컬렉션, users, invites)는 바꾸지 말 것. 바꿔야 하면 먼저 알리고 기존 데이터 이전 방법을 제시
- 생후 일수는 태어난 날을 1일로 셈
- 작업이 끝나면 브랜치를 따로 만들지 말고 main에 바로 올릴 것
- 끝나면 바뀐 파일과 새 sw.js VERSION을 짧게 알려줄 것

## 파일 지도
- index.html: 화면 대부분 (탭 렌더링, 편집창 sheet, 그래프, 클릭 처리 switch, 상태 S, 미리보기용 MOCK/DB)
- app.js: Firebase 연결 (로그인, 가족 공간, onSnapshot 구독, 저장 API, 사진 업로드, 새 버전 안내)
- config.js: Firebase 설정 (수정 금지)
- sw.js: 서비스 워커 (앱 파일 캐시 우선, 사진 캐시, data/*.json 네트워크 우선), VERSION
- hospitals.js: 긴급 출동 > 병원 수사 (강원 18개 시·군, 현재 위치의 시·군 자동 선택, 카카오맵(크게 보기), 목록, 필터, 관심 병원·약국, 공휴일 목록)
- map-key.js: 카카오맵 JavaScript 키 (공개용, 등록 도메인 rew623.github.io)
- viewer.js: 사진·보드 카드 크게 보기(3칸 트랙으로 옆으로 넘기기, 핀치 줌), 안드로이드 뒤로가기, 길게 누르기 막기
- board.js: 사건 앨범 > 수사 보드
- recipes.js: 급식 수사 > 센터 식단 올리기 (엑셀 → 표준레시피, PDF → 식단표 이미지, 사진)
- album.js: 사건 앨범 > 현장 사진첩 (여러 장 자유 업로드, mom 컬렉션에 type:'free', 사진 찍은 날짜(EXIF)로 날짜별 묶음), 올리기 줄(IndexedDB soeun-upload: 앱을 나갔다 오거나 다시 켜면 이어서 올림), 100일 보고서 사진(type:'report'), 최초 목격 추가 사진(type:'extra'), 사진첩 길게 눌러 여러 장 골라 삭제·날짜 바꾸기
- characters.js: 다람쥐 캐릭터 SVG (CHARS.svg: baby=소은 탐정, mom=엄마 수사관, dad=아빠 수사관, 소품 lens/shield/spoon/thermo/camera/acorn/note/heart), 탭별 안내 말풍선 CHARS.guide(tab), 편집창 제목 옆엔 이 폰 수사관 얼굴
- town.js: 동네 탐문 탭(S.tab='town'): 산책 지수(날씨+미세먼지+기상특보·미세먼지 경보 점수), 미세먼지, 강원 행사·축제. 어린이 감염병 동향은 TOWN.disHtml()로 예방접종 탭 맨 아래(기본 접힘, data-fold v-dis). 시·군은 병원 수사와 같은 칸(localStorage soeun-hosp-region)
- posts.js: 육아 글 모음 (S.view='posts', 떠 있는 '📚 육아 글' 버튼): 네이버 블로그·카페 글 월령별(0~24개월)·주제별·우리 동네, 어느 화면에서나 떠 있는 버튼(짧게 누르면 열기, 0.6초 길게 누른 채 끌면 옮기기, 위치 localStorage soeun-posts-pos, 새 글 빨간 점), 읽은 글 표시(soeun-posts-read)
- game.js: 게임 요소 — 수사관 계급(기록 by로 경험치 계산, 신분증에 계급), 오늘의 수사 지령(하루 3개, 성장 수사 탭 카드), 연속 수사, 훈장 24개, 도토리·소은 탐정 모자 가게(CHARS HATS, 명절·생일엔 저절로 모자), 다람쥐 집 꾸미기, 몸무게 예측 대결(guess 컬렉션, 성장 수사 탭), 놀이터(생후 며칠 퀴즈, 사진 짝맞추기). 계급·훈장은 기록으로 계산(두 폰 같음), 도토리·모자·최고 기록은 이 폰에만(localStorage soeun-game). 화면 S.view='medals'/'play'
- family.js: 사건 앨범 > 가족(S.albumView='family'): 가족 수사팀 명단(엄마·아빠 + people 컬렉션), 사람별로 모아 보기, 가족 사진은 mom type:'fam' who=사람 id들(ALBUM.queue로 올림)
- memories.js: 사건 앨범 맨 위 '지난 오늘'(지난달·작년 같은 날 사진), '성장 스토리'(월별 사진 인스타 스토리처럼, 뒤로가기로 닫힘 SLIDE.close)
- dev.js: 예방접종 탭 > 발달 체크(S.vacView='dev'), 2~24개월 8단계(CDC 발달 이정표 참고), dev 컬렉션
- book.js: 성장 앨범 책(S.view='book'): 표지 + 달마다 한 쪽, 인쇄·PDF로 저장(window.print, @media print)
- push-key.js: 알림 VAPID 공개키(Firebase 콘솔 → 클라우드 메시징 → 웹 푸시 인증서). 비어 있으면 알림 끔. 바꾸면 VERSION 올릴 것
- charges.js: 성장 수사·수사 보드의 장난 혐의 사실 (기록 근거 + 월령별 단골 혐의, 날짜로 골라 두 폰에 같게)
- checkups.js: 예방접종 탭 > 영유아검진 (검진 8회 + 구강검진 3회 일정을 태어난 날로 계산)
- data/h-{시군}.json · p-{시군}.json · regions.json: Actions가 매주 만드는 강원 시·군별 병원·약국 목록과 시·군 가운데·범위 (직접 고치지 않음)
- data/town.json(날씨·미세먼지, 3시간마다) · events.json(강원 행사) · disease.json(감염병 주간) · posts.json(육아 인기글, 하루 한 번): .github/workflows/town.yml이 만듦 (직접 고치지 않음)
- .github/workflows/hospitals.yml: 병원 정보 받기 (매주 월 03:00 KST + 수동), 시크릿 DATA_GO_KR_KEY
- .github/workflows/notify.yml: 아침 알림 (매일 08:50 KST, notify.mjs + firebase-admin), 시크릿 FIREBASE_SERVICE_ACCOUNT(없으면 건너뜀). 예방접종 D-3·1·당일, 영유아검진 기간 시작·마감 7일 전, 이유식 3일째, 100·200일·생일·매달 그날. 보기 전용 가족에겐 기념일만
- .github/workflows/town.yml: 동네 정보 받기 (3시간마다 fetch-town.mjs, 하루 한 번 KST 05시대 fetch-daily.mjs, 수동 실행 what=town/daily/all)
- .github/scripts/: 공공데이터 API 호출 스크립트 (lib.mjs 공통(XML), api.mjs 공통(JSON), 시·군 목록 REGIONS, build-regions.mjs)
  - 쓰는 API(공공데이터포털 활용신청 필요, 키는 DATA_GO_KR_KEY 하나): 기상청 단기예보·기상특보, 에어코리아 대기오염정보·측정소정보·미세먼지 경보, 한국관광공사 국문 관광정보(KorService2), 질병관리청 전수신고 감염병 발생현황(EIDAPIService/PeriodBasic, 올해 주별이 없으면 작년 같은 때로 live:false)
  - 네이버 검색 API(블로그·카페글, NAVER API HUB 키 · 예전 개발자센터 키는 2027.6까지): fetch-posts.mjs, 시크릿 NAVER_CLIENT_ID · NAVER_CLIENT_SECRET (없으면 건너뜀)
- 새 JS 파일은 index.html의 <script>와 sw.js의 SHELL 목록에 추가할 것

## Firestore 구조
- users/{uid}: { fid } 내가 속한 가족 공간
- invites/{6자리 코드}: { fid, by, exp } 7일짜리 초대 코드 (V로 시작해 9로 끝나면 보기 전용 초대 → 앱에서 쓰기 막음, 이 폰 localStorage viewer-{fid})
- families/{fid}: 아기 프로필 (name, birth, sex, mom, dad, 사진 URL)
- families/{fid} 하위 컬렉션:
  - members/{uid}: { role(엄마/아빠), name, email, viewer(보기 전용이면 true) }
  - records, periods, vaccines, ep, log, visit, mom(앨범), food, meal, cube, menu(식단표 사진), people(가족 앨범의 가족: name, rel, photo, by), dev(발달 체크: 문서 id=항목 id, at, by), guess(몸무게 예측: role, value, at, base=그때 마지막 측정 기록 id, by), push(알림 받는 폰: token, uid, role, viewer, at)
  - hospitals/{hpid}: star, memo, lunch, reserve, moonlight, updatedBy, updatedAt (관심 병원·약국)
  - checkups/{g1~g8, o1~o3}: done, hospital, memo, by, updatedAt (받은 검진만 저장, g=건강검진 o=구강검진)
  - recipes/{YYYY-MM}: title, file, stages[{ stage, items[{ d, meal, raw, ing[{ n, g }], how, src }] }], by, updatedAt
- mom 문서의 type: first(최초 목격) / month(월별 사진) / free(현장 사진첩) / report(100일 보고서 사진, 1장) / extra(최초 목격 추가 사진, of=붙은 최초 목격 문서 id) / fam(가족 사진, who=나온 사람 id 쉼표로: mom·dad·people id), board: true/false = 수사 보드에 붙인 사진
- 보안 규칙: families/{fid} 아래는 members에 있는 사람만 읽기·쓰기 (members 제외 하위 컬렉션 전체 허용이라 새 컬렉션도 규칙 수정 불필요)
- Storage: families/{fid}/photos/ 에 이미지만 올림 (앱에서 400KB 이하로 줄임)

## 주의할 점
- 탭 화면(#app)을 좌우로 밀면 옆 탭으로 넘어감 (index.html 하단). 지도·수사 보드(#bwrap)·입력칸·사진 고르기 중·하위 화면(S.view)은 제외, 막고 싶은 칸엔 data-noswipe
- 사건 앨범 칸과 사진첩 달 묶음은 접기 가능 (data-fold, localStorage soeun-fold). 사진첩은 최근 두 달만 기본으로 펼침
- 파일 선택 칸(input type=file)은 #app 밖(body에 고정)이나 편집창(sheet) 안에 둘 것. 파일 창에서 돌아올 때 화면을 다시 그려 #app 안의 칸이 사라짐
- GitHub Pages 배포(pages build and deployment)가 GitHub 쪽 오류로 가끔 실패함. 실패한 job을 재실행하면 됨
- map-key.js를 바꾸면 sw.js VERSION도 올릴 것 (안 올리면 폰에 반영 안 됨)
- 뒤로가기: 크롬은 화면을 만지기 전에 넣은 기록 칸을 건너뛸 수 있어, 앱을 열자마자 뒤로가기를 누르면 안내 없이 꺼질 수 있음
