# 뼈대 — index.html·main-*.js·app.js·sw.js·설정·육아 글

- 2026.10.13: index.html 안의 큰 스크립트를 순서 그대로 main-core·main-render·main-sick·main-album·main-meal·main-sheets·main-boot.js로 나눔(전역 그대로, 내용 안 바뀜). index.html엔 HTML·CSS만. 아래 설명의 'index.html'은 이 main-*.js들을 뜻함
- 시험: tools/test/smoke.mjs(전 화면 점검)·harness.mjs(launch), 올리기 tools/ship.sh, 연관 지도 tools/deps.mjs → docs/deps.md

기능별 자세한 설명과 지금까지의 결정(사용자 요청 이유). 이 영역을 고칠 때만 읽고, 고친 뒤 이 파일만 고쳐요.

- index.html: 주소 ?tab=day 등으로 열면 그 탭(알림에서 열 때). 화면 대부분 (탭 렌더링, 편집창 sheet, 그래프, 클릭 처리 switch, 상태 S, 미리보기용 MOCK/DB)
- app.js: Firebase 연결 (로그인, 가족 공간, onSnapshot 구독, 저장 API, 사진 업로드, 새 버전 안내(앱을 보는 동안 1분마다·돌아올 때 서버 sw.js VERSION과 비교 → 다르면 reg.update, 20초 안에 못 받으면 띠를 먼저 보여 주고 누르면 서비스 워커 지우고 다시 불러옴), 알림 켜기(대상 정보 → 🔔 아침 알림)·알림 켠 폰은 하루 한 번 토큰 다시 받기 refreshPush)
- config.js: Firebase 설정 (수정 금지)
- sw.js: 서비스 워커 (앱 파일 캐시 우선, 사진 캐시, data/*.json 네트워크 우선, 공유로 받은 사진 POST ./share-in → share-in 캐시 → ./?shared=1), VERSION
- manifest.webmanifest: 설치용 정보 + share_target(갤러리 앱 '공유 → 수사 일지', 안드로이드 크롬 '앱 설치'로 깐 앱만 — 홈 화면 바로가기·삼성 인터넷 설치면 안 뜸, 크롬이 바뀐 설정을 받는 데 하루쯤 걸릴 수 있음, 아이폰은 안 됨. 삼성 갤러리 공유 옵션 '위치정보 포함'이 켜져 있으면 위치가 같이 옴). 앱이 열리면 ALBUM.shared()가 꺼내 '현장 사진첩 / 가족 사진 / 🐾 탐문 기록으로(WALK.formWith)' 골라 올림, 창에 찍은 시각·위치 있는 사진 수 표시
- map-key.js: 카카오맵 JavaScript 키 (공개용, 등록 도메인 rew623.github.io)
- posts.js: 육아 글 모음 (S.view='posts', 떠 있는 동그란 📚 버튼 48px — 아래 탭 화면에서만, 안쪽 화면(S.view)에선 숨김): 네이버 블로그·카페 글 월령별(0~24개월)·주제별·우리 동네, 떠 있는 버튼(짧게 누르면 열기, 0.6초 길게 누른 채 끌면 옮기기, 위치 localStorage soeun-posts-pos, 새 글 빨간 점은 작은 posts-meta.json으로 — 글 전체 posts.json은 글 모음을 열 때만 받음), 읽은 글 표시(soeun-posts-read), 목록은 8개씩(안 읽은 글 먼저, 앱 열 때마다 순서 섞기 P.seed, '🔄 다른 글 보기'·'모두 보기'), posts.json은 월령·주제 30개·지역 20개(정확도순+최신순 pool)
- settings.js: ⚙️ 설정(S.view='settings', 성장 수사 맨 위 filebar의 ⚙️ · 대상 정보 창 아래 단추): 앱 버전(이 폰 = 서비스 워커에 'ver' 메시지로 물음, 없으면 shell-캐시 이름 · 최신 = sw.js의 VERSION, 숫자로 비교) + 업데이트(reg.update → waiting에 'skip'), 아래 메뉴 탭 보이기/숨기기(localStorage soeun-tabs-off, index.html hiddenTabs() — 탭 바·좌우 밀기 순서에서 빠짐, 숨긴 탭으로 링크 이동하면 그동안만 보임), 첫 화면 카드(soeun-home-off: game 지령 카드·thief 깍정이 카드+방 창밖, homeOn()), 탐문 기본 출발지 보기·지우기(WALK.home/setHome, 두 폰 같이), 탭 안내 말풍선 숨기기(soeun-guide-off — 성장 수사의 방은 그대로, CHARS.guide), 📚 단추 숨기기(soeun-posts-hide)·자리 처음대로(POSTS.resetPos), 가족·알림(FAM.settingsHtml), 사진 사본 지우기(photo- 캐시)·앱 다시 불러오기, 수사 통계. 설정은 폰마다
- push-key.js: 알림 VAPID 공개키(Firebase 콘솔 → 클라우드 메시징 → 웹 푸시 인증서, 2026.10.11 넣음). 비어 있으면 알림 끔. 바꾸면 VERSION 올릴 것
- 새 JS 파일은 index.html의 <script>와 sw.js의 SHELL 목록에 추가할 것
- 백업·내보내기(2026.10.13, settings.js '💾 백업·내보내기'): app.js backupData()(가족 문서·모든 컬렉션·care·병원·레시피·검진·game → JSON, Timestamp는 {__ts:ms}) → soeun-backup-YYYYMMDD.json(폰이면 공유 창, 아니면 다운로드, localStorage soeun-backup-at) · 하루 수사 CSV(엑셀용 BOM) · 되살리기 restoreData(같은 id로 merge 400개씩 — 지금 기록은 안 지움, 도토리는 지금 0일 때만). 보기 전용은 백업만. 사진은 주소만 들어감
- 다시 그리기 가볍게(2026.10.13): apply()(데이터가 바뀌어 그릴 때)는 render.soft — 만든 화면 글이 지난번과 같으면 #app DOM을 안 건드림($app.__h). 사용자 동작으로 부르는 render()는 늘 새로 그림
- 첫 화면 부가 카드 끄기(설정 '첫 화면 카드', homeOn): game·thief·charges·look·guess·capsule·paper + '🎯 핵심만 보기'(모두 끔)/'모두 켜기'
- 테마(2026.10.13 사용자 요청, 설정 '🎨 테마', 폰마다 localStorage soeun-theme): themes.css — html[data-theme=kitty|conan|purin|cinna]가 색 변수(--paper·--card·--navy·--red·--line 등)와 바탕 무늬(SVG)만 바꿈, 기본은 탐정 수첩. index.html 머리 스크립트가 처음 그리기 전에 data-theme·theme-color를 넣음(깜빡임 없게). 새 화면 CSS는 색을 변수로 써야 테마를 따라감
- 테마 그림(2026.10.13 사용자 요청 '단조롭다·컨셉 같지 않다·눈 아프다'): themes.js — 테마는 탐정 수첩·명탐정 코난·산리오 친구들·헬로키티·폼폼푸린·시나모롤·디즈니(THEME.list). 컨셉마다 직접 그린 캐릭터(리본 고양이·푸딩 강아지·구름 강아지·분홍 두건 토끼·동그란 귀 생쥐·세일러 오리·꿀단지 곰)와 소품, 컨셉 옷 입은 우리 다람쥐(CHARS.svg)를 410×650 바탕 타일에 13개 + 작은 반짝이 26개로 흩어 그림(투명도 .42~.5), 맨 위 띠(#app::before)·제목 밑줄(.vhead::after)도 컨셉 무늬. 지금 테마 것만 <style id="themeart">로 만듦. 색은 themes.css(눈부심 줄이려고 밝기·채도를 기본 크라프트 수준, 카드는 물든 흰색, 강조색 탁하게). index.html 머리 스크립트의 테마 색 목록과 THEME.list 색을 같이 맞출 것
- 명탐정 코난 테마 등장인물(2026.10.13 사용자 요청 '등장인물 그림이 없어'): themes.js human()·hface()로 2등신 사람 캐릭터 — 꼬마 명탐정(손가락 '범인은 너!'·돋보기 안경 반짝·축구공), 가라테 누나, 괴도 신사(실크햇·외눈 안경·망토·카드), 발명가 박사, 쿨한 과학자 소녀, 잠자는 탐정 아저씨, 소년 탐정단 얼굴 둘 + 코난 옷 다람쥐. 바탕 그림 위 글자(제목·단추 글자)는 themes.css halo
- 화면 전환 버벅임(2026.10.13 사용자 요청 '뻑뻑해졌다'): 큰 바탕 SVG 타일을 처음 한 번 캔버스로 PNG(blob URL)로 구워 바꿔 끼움(themes.js bake, 폰 배율 최대 2). 글자 halo 그림자 3겹→2겹(blur 3px)
- 제목줄 글씨 혼자 두 줄 방지(2026.10.13): index.html .sh·.agh 앞쪽 글씨 flex:none+nowrap, 뒤쪽 설명이 줄어들게(꾸미기 '모자'·놀이터 '함께 놀기')
- 몸무게 표시 소수점 셋째 자리까지(2026.10.17 사용자 요청): main-core.js fmt('weight')가 늘 toFixed(3) — 6.450kg. 저장값은 그대로(입력한 만큼), 키·머리둘레는 소수 1자리 그대로
- 증거 기록 카드(.stat .v) 한 줄 고정(nowrap, 20px, 몸무게 .vw 17px) — 6.445kg가 두 줄로 꺾이던 것(2026.10.17)
- 아기 이름 일반화(2026.10.29): 코드에 박힌 '소은'을 프로필 이름으로 — CV.short()/CV.nick()(studio.js), characters.js short()/nick(), game.js WHO[0][1] getter, room.js keyName 등. 앱 이름(manifest name)은 '성장 수사 일지'. 지인이 쓰는 방법은 docs/friend-setup.md
- 로그인 없이 둘러보기(2026.10.29 사용자 요청): 출입 화면 '로그인 없이 둘러보기 (예시 데이터)' → window.__enterDemo(main-core.js): DEMO=true, MOCK DB로만 앱을 열고(날짜는 생후 100일쯤으로 옮김) Firebase 연결·저장·폰 사본(saveCache·game local) 모두 안 함, 위 띠의 '나가기'(새로 고침)로 처음 화면
- app.js: Firestore initializeFirestore에 experimentalAutoDetectLongPolling 추가(2026.10.31) — 아이폰 홈화면 앱에서 실시간 연결이 막혀 다른 폰의 변경(사진 날짜·놀이 기록)이 안 오던 문제 의심
