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
