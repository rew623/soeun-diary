# 서버·자동 작업 (Actions·Functions·data/*.json)

기능별 자세한 설명과 지금까지의 결정(사용자 요청 이유). 이 영역을 고칠 때만 읽고, 고친 뒤 이 파일만 고쳐요.

- data/h-{시군}.json · p-{시군}.json · regions.json: Actions가 매주 만드는 강원 시·군별 병원·약국 목록과 시·군 가운데·범위 (직접 고치지 않음)
- data/town.json(날씨·미세먼지, 한 시간마다 — 앱은 10분 넘으면 다시 받음, 날씨 시간별 [시각, 기온, 하늘, 강수형태, 강수확률, 풍속, 습도, 강수량mm, 적설cm]) · events.json(강원 행사) · disease.json(감염병 주간) · posts.json(육아 인기글)·news.json(시·군 아이 행사 소식)·posts-meta.json(글 바뀐 날) 하루 한 번 · wx-YYYY-MM.json(날씨 일기: 시·군별 하루 요약 [최저, 최고, 하늘, 비·눈 시간, 강수mm, 적설cm, 시간 수], 그날 첫 실행 때 한 번, 소은일보 '이달의 날씨'): .github/workflows/town.yml이 만듦 (직접 고치지 않음)
- .github/workflows/storage-cors.yml + scripts/storage-cors.mjs: 사진 저장소(Storage 버킷)에 앱 주소(https://rew623.github.io)의 사진 읽기(CORS GET) 허용 — 사진관·영상·신문이 사진을 canvas로 그리려면 꼭 필요. 스크립트를 바꾸면 저절로 한 번 실행, 시크릿 FIREBASE_SERVICE_ACCOUNT (2026.10.11 설정 완료 — 확인: storage.googleapis.com/버킷/아무경로에 Origin 붙여 OPTIONS 보내면 access-control-allow-origin이 앱 주소로 옴). 시크릿이 없으면 Google Cloud Shell에서: echo '[{"origin":["https://rew623.github.io"],"method":["GET","HEAD"],"maxAgeSeconds":3600}]' > cors.json && gcloud storage buckets update gs://soeun-diary.firebasestorage.app --cors-file=cors.json
- .github/workflows/hospitals.yml: 병원 정보 받기 (매주 월 03:00 KST + 수동), 시크릿 DATA_GO_KR_KEY
- .github/workflows/notify.yml: 아침 알림 (매일 08:50 KST, notify.mjs + firebase-admin), 시크릿 FIREBASE_SERVICE_ACCOUNT(없으면 건너뜀). 예방접종 D-3·1·당일, 영유아검진 기간 시작·마감 7일 전, 이유식 3일째, 100·200일·생일·매달 그날. 보기 전용 가족에겐 기념일만. 수동 실행 test=1이면 알림 받는 폰마다 시험 알림 하나, dry=1이면 연습(안 보냄). 저장소가 공개라 로그엔 알림 종류·개수만(이름·접종 내용 X)
- functions/ (index.js·feedcore.mjs·package.json) + firebase.json·.firebaserc: Firebase 서버 수유 알람. 고치면 Google Cloud Shell에서 다시 올림: git clone https://github.com/rew623/soeun-diary.git && cd soeun-diary/functions && npm install && cd .. && npx -y firebase-tools@13 deploy --only functions --project soeun-diary --force (처음엔 로그인 필요하면 npx -y firebase-tools@13 login --no-localhost)
- .github/workflows/feed.yml: 수유 알람 예비 (10분마다 feed.mjs, 서버가 멈췄을 때만, 시크릿 FIREBASE_SERVICE_ACCOUNT, 수동 실행 dry=1이면 연습)
- .github/workflows/town.yml: 동네 정보 받기 (한 시간마다 fetch-town.mjs, 하루 한 번 KST 05시 넘어 오늘 아직 못 받았으면 fetch-daily.mjs — 받은 날은 data/daily-at.txt, 9시 넘으면 실패해도 그날은 그만, api.mjs는 서버가 연달아 4번 응답 없으면 그 실행에선 건너뜀(예전엔 공공데이터 서버가 멈춘 새벽에 25분 다시 시도하다 취소돼 날씨가 몇 시간 안 바뀜), 수동 실행 what=town/daily/all)
- .github/scripts/: 공공데이터 API 호출 스크립트 (lib.mjs 공통(XML), api.mjs 공통(JSON), 시·군 목록 REGIONS, build-regions.mjs)
  - 쓰는 API(공공데이터포털 활용신청 필요, 키는 DATA_GO_KR_KEY 하나): 기상청 단기예보·중기예보(육상 강원영서/영동, 기온 시·군 지점 MID_TA)·기상특보, 에어코리아 대기오염정보·측정소정보·미세먼지 경보, 한국관광공사 국문 관광정보(KorService2), 질병관리청 전수신고 감염병 발생현황(EIDAPIService/PeriodBasic, 올해 주별이 없으면 작년 같은 때로 live:false)
  - 네이버 검색 API(블로그·카페글·뉴스, posts.json의 news = 시·군별 아이 행사 소식, NAVER API HUB 키 · 예전 개발자센터 키는 2027.6까지): fetch-posts.mjs, 시크릿 NAVER_CLIENT_ID · NAVER_CLIENT_SECRET (없으면 건너뜀)
- 지인용 연결: 자세한 건 docs/friend-setup.md
