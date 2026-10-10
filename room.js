// 소은 탐정의 방 — 성장 수사(첫 화면) 안내 자리의 방 그림과, 도토리 놀이터 > 꾸미기의 가게
// 자리(슬롯)마다 산 물건 중 하나를 골라 놓아요. 창밖은 지금 시간(낮·저녁·밤)과 계절(봄 벚꽃·여름 초록·가을 낙엽·겨울 눈)로 저절로 바뀌어요
// 저장: GAME.store 의 room(산 물건 id들), slot({자리: 물건 id}) — 두 폰이 같이 씀 (Firestore game/shared)
(function () {
const st = () => GAME.store.get(), save = s => GAME.store.set(s);
const VW = 320, VH = 180;

// [자리, 이름, 비워 둘 수 있나, 미리보기 viewBox]
const SLOTS = [
  ['wall', '벽지', 0, ''], ['floor', '바닥', 0, ''], ['win', '창문', 1, '14 26 82 74'], ['ceil', '천장 장식', 1, '40 0 240 50'],
  ['hang', '매달기', 1, '172 0 64 64'], ['wallC', '벽 가운데', 1, '100 22 70 80'], ['rug', '러그', 1, '60 140 200 40'],
  ['floorL', '바닥 왼쪽', 1, '20 92 66 84'], ['floorM', '바닥 소품', 1, '74 118 46 58'], ['floorR', '바닥 오른쪽 가구', 1, '214 70 70 106'],
  ['corner', '구석', 1, '262 70 56 106'], ['pet', '반려동물', 1, '208 128 52 50'],
  ['fam', '함께 있는 수사관', 1, ''], ['pic', '사진 액자 · 📷 우리 사진을 넣는 특수 소품', 1, '232 2 70 66']
];
const WALLC = { cream: '#FFF3DD', pink: '#FBE3E0', mint: '#E3F2E6', sky: '#E2EEF8', lilac: '#EEE6F7', butter: '#FFF6CC' };
const t = s => s;   // 그림 조각 (읽기 쉽게)
// [id, 자리, 이름, 도토리, 그림(문자열 또는 함수)]
const CAT = [
  // 벽지 (그림은 roomSvg에서)
  ['cream', 'wall', '크림', 0], ['pink', 'wall', '분홍', 4], ['mint', 'wall', '민트', 4], ['sky', 'wall', '하늘', 4], ['lilac', 'wall', '라일락', 6], ['butter', 'wall', '버터', 4],
  ['dots', 'wall', '땡땡이', 7], ['stripe', 'wall', '줄무늬', 7], ['stars', 'wall', '별 무늬', 8], ['gingham', 'wall', '깅엄 체크', 8],
  // 바닥
  ['wood', 'floor', '나무 마루', 0], ['checker', 'floor', '체크 바닥', 5], ['grass', 'floor', '잔디 매트', 6], ['puzzle', 'floor', '퍼즐 매트', 7], ['cloudf', 'floor', '하늘 카펫', 6],
  // 창문
  ['curtainP', 'win', '분홍 커튼', 5, t('<path d="M16 30q12 30 2 64h-6V30z" fill="#F49C9C"/><path d="M90 30q-12 30-2 64h6V30z" fill="#F49C9C"/><path d="M12 28h84" stroke="#B97648" stroke-width="3" stroke-linecap="round"/>')],
  ['curtainB', 'win', '하늘 커튼', 5, t('<path d="M16 30q12 30 2 64h-6V30z" fill="#9CC4E4"/><path d="M90 30q-12 30-2 64h6V30z" fill="#9CC4E4"/><path d="M12 28h84" stroke="#B97648" stroke-width="3" stroke-linecap="round"/><circle cx="14" cy="62" r="3" fill="#F4C542"/><circle cx="92" cy="62" r="3" fill="#F4C542"/>')],
  ['flowerbox', 'win', '창가 꽃상자', 6, t('<rect x="18" y="88" width="70" height="10" rx="3" fill="#C97B4A"/>' + [26, 38, 50, 62, 74].map((x, i) => `<path d="M${x} 88v-7" stroke="#5E9E57" stroke-width="2"/><circle cx="${x}" cy="79" r="4" fill="${['#F49C9C', '#F4C542', '#F6B4AA', '#B18AE0', '#F49C9C'][i]}"/>`).join(''))],
  ['roundwin', 'win', '동그란 창', 7, 'ROUND'], ['weatherwin', 'win', '날씨 창', 14, 'WEATHER'],
  // 천장 장식
  ['garland', 'ceil', '깃발 가랜드', 9, t('<path d="M60 18q100 30 200 0" stroke="#B9A889" stroke-width="1.5" fill="none"/>' + [70, 95, 120, 145, 170, 195, 220, 245].map((x, i) => `<path d="M${x} ${20 + Math.sin(i / 7 * Math.PI) * 18}l8 0-4 10z" fill="${['#F49C9C', '#FCE8B4', '#7FC4E8', '#7FB77E'][i % 4]}"/>`).join(''))],
  ['lights', 'ceil', '알전구 줄', 8, t('<path d="M50 12q110 34 220 0" stroke="#6B5F52" stroke-width="1.2" fill="none"/>' + Array.from({ length: 11 }, (_, i) => { const x = 58 + i * 20, y = 13 + Math.sin(i / 10 * Math.PI) * 16; return `<ellipse cx="${x}" cy="${y + 5}" rx="3.2" ry="4.4" fill="${['#F4C542', '#F49C9C', '#7FC4E8', '#7FB77E'][i % 4]}"/><circle cx="${x}" cy="${y + 5}" r="7" fill="${['#F4C542', '#F49C9C', '#7FC4E8', '#7FB77E'][i % 4]}" opacity=".18"/>`; }).join(''))],
  ['starline', 'ceil', '별 줄 장식', 8, t('<path d="M60 10q100 26 200 0" stroke="#B9A889" stroke-width="1.2" fill="none"/>' + Array.from({ length: 7 }, (_, i) => { const x = 72 + i * 29, y = 14 + Math.sin(i / 6 * Math.PI) * 13; return `<path d="M${x} ${y}l2.4 5 5.4.6-4 3.7 1.1 5.4-4.9-2.7-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" fill="${i % 2 ? '#F4C542' : '#FCE8B4'}" stroke="#E0B341" stroke-width=".8"/>`; }).join(''))],
  // 매달기
  ['musicbox', 'hang', '오르골 모빌', 14, 'MUSIC'],
  ['mobile', 'hang', '모빌', 7, t('<path d="M200 0v18M180 18h40M180 18v12M220 18v12M200 18v20" stroke="#B9A889" stroke-width="1.5"/><circle cx="180" cy="34" r="5" fill="#F4C542"/><path d="M216 30l4 8 4-8z" fill="#7FC4E8"/><circle cx="200" cy="42" r="5" fill="#F49C9C"/>')],
  ['balloons', 'hang', '풍선 다발', 6, t('<path d="M196 58q-4-14 -8-24M202 58q0-14 2-28M208 58q6-12 12-22" stroke="#B9A889" stroke-width="1" fill="none"/><ellipse cx="186" cy="24" rx="9" ry="11" fill="#F49C9C"/><ellipse cx="204" cy="18" rx="9" ry="11" fill="#7FC4E8"/><ellipse cx="221" cy="27" rx="9" ry="11" fill="#F4C542"/><path d="M182 18a4 4 0 0 1 4-3" stroke="#fff" stroke-width="2" fill="none"/>')],
  ['moonlamp', 'hang', '달 조명', 7, t('<path d="M204 0v14" stroke="#B9A889" stroke-width="1.5"/><path d="M212 16a17 17 0 1 0 0 30a13 13 0 0 1 0-30z" fill="#FCE8B4" stroke="#E0B341"/><circle cx="200" cy="31" r="22" fill="#FCE8B4" opacity=".18"/>')],
  ['cloudmob', 'hang', '구름 모빌', 6, t('<path d="M204 0v12" stroke="#B9A889" stroke-width="1.5"/><path d="M186 28a8 8 0 0 1 8-10a10 10 0 0 1 19 0a8 8 0 0 1 4 15h-27a6 6 0 0 1-4-5z" fill="#fff" stroke="#DCE7F1"/><path d="M192 38v8M202 38v10M212 38v6" stroke="#7FC4E8" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 3"/>')],
  // 벽 가운데
  ['frame', 'wallC', '소은이 액자', 10, 'FRAME'],
  ['clock', 'wallC', '벽시계', 12, 'CLOCK'],
  ['miniboard', 'wallC', '꼬마 수사 보드', 8, t('<rect x="108" y="38" width="56" height="44" rx="3" fill="#C79A6B" stroke="#A9764A" stroke-width="3"/><rect x="114" y="44" width="14" height="16" fill="#fff" transform="rotate(-6 121 52)"/><rect x="140" y="46" width="14" height="16" fill="#fff" transform="rotate(5 147 54)"/><rect x="126" y="62" width="16" height="12" fill="#EAD9B2"/><path d="M121 46L147 48M147 48L134 64" stroke="#B3261E" stroke-width="1"/><circle cx="121" cy="46" r="1.8" fill="#B3261E"/><circle cx="147" cy="48" r="1.8" fill="#B3261E"/><circle cx="134" cy="64" r="1.8" fill="#B3261E"/>')],
  ['toyshelf', 'wallC', '벽 선반', 5, t('<rect x="104" y="72" width="64" height="5" rx="2" fill="#B97648"/><path d="M110 77v6M162 77v6" stroke="#8C5530" stroke-width="3"/><rect x="110" y="58" width="12" height="14" rx="2" fill="#7FC4E8"/><text x="116" y="69" font-size="9" text-anchor="middle" fill="#fff" font-family="Jua">A</text><circle cx="134" cy="65" r="7" fill="#F49C9C"/><path d="M150 72v-12l8 6z" fill="#F4C542"/><path d="M146 72h16" stroke="#7FB77E" stroke-width="2"/>')],
  ['sign', 'wallC', '탐정 사무소 팻말', 12, 'SIGN'],
  ['calendar', 'wallC', '기념일 달력', 12, 'CAL'], ['tvw', 'wallC', '추억 TV', 18, 'TV'],
  // 러그
  ['rug', 'rug', '동그란 러그', 4, t('<ellipse cx="160" cy="166" rx="92" ry="14" fill="#F6B4AA" opacity=".85"/><ellipse cx="160" cy="166" rx="70" ry="9" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="5 5"/>')],
  ['rainbow', 'rug', '무지개 러그', 6, t(['#F49C9C', '#F4C542', '#7FB77E', '#7FC4E8'].map((c, i) => `<path d="M${84 + i * 10} 176a${76 - i * 10} ${22 - i * 4} 0 0 1 ${152 - i * 20} 0" fill="none" stroke="${c}" stroke-width="7"/>`).join(''))],
  ['starrug', 'rug', '별 러그', 6, t('<path d="M0 -20L5.9 -8.1 19 -6.2 9.5 3.1 11.8 16.2 0 10-11.8 16.2-9.5 3.1-19 -6.2-5.9 -8.1z" fill="#F4C542" stroke="#E0B341" stroke-width="1.2" transform="translate(160 165) scale(2.4 .7)"/>')],
  ['cloudrug', 'rug', '구름 러그', 5, t('<path d="M96 172a12 12 0 0 1 14-14a20 20 0 0 1 36-6a22 22 0 0 1 38 2a16 16 0 0 1 30 10a10 10 0 0 1 4 8z" fill="#fff" stroke="#DCE7F1" stroke-width="2"/>')],
  // 바닥 왼쪽
  ['plant', 'floorL', '화분', 5, t('<path d="M38 152h24l-4 20H42z" fill="#C97B4A"/><path d="M50 152c-14-10-16-26-6-34 2 12 6 18 6 34zM50 152c12-12 18-24 10-34-4 12-8 20-10 34zM50 152c-2-16 2-28 0-40" stroke="#5E9E57" stroke-width="4" fill="#7FB77E" stroke-linecap="round"/>')],
  ['teddy', 'floorL', '곰인형', 7, t('<circle cx="40" cy="128" r="6" fill="#B97648"/><circle cx="62" cy="128" r="6" fill="#B97648"/><circle cx="51" cy="138" r="13" fill="#C98B5A"/><ellipse cx="51" cy="160" rx="15" ry="13" fill="#C98B5A"/><ellipse cx="51" cy="142" rx="5" ry="4" fill="#F1D5B5"/><circle cx="46" cy="135" r="1.8" fill="#2B2622"/><circle cx="56" cy="135" r="1.8" fill="#2B2622"/><circle cx="51" cy="141" r="1.5" fill="#5A3420"/><path d="M44 150q7 5 14 0" stroke="#B3261E" stroke-width="3" fill="none"/><ellipse cx="39" cy="170" rx="6" ry="4" fill="#B97648"/><ellipse cx="63" cy="170" rx="6" ry="4" fill="#B97648"/>')],
  ['rocking', 'floorL', '흔들목마', 9, t('<path d="M26 170q26 10 52 0" stroke="#B97648" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M36 168v-14M68 168v-14" stroke="#B97648" stroke-width="3"/><path d="M34 156h36q4-12-4-14H40q-8 2-6 14z" fill="#F6B4AA"/><path d="M64 144q4-16 12-14q4 2 2 10l-8 6z" fill="#F6B4AA"/><circle cx="74" cy="134" r="1.5" fill="#2B2622"/><path d="M68 132l-2-6" stroke="#B97648" stroke-width="3" stroke-linecap="round"/><path d="M34 148q-6 6-4 12" stroke="#B97648" stroke-width="3" fill="none" stroke-linecap="round"/>')],
  ['toybox', 'floorL', '장난감 상자', 6, t('<circle cx="40" cy="138" r="6" fill="#F49C9C"/><rect x="50" y="128" width="12" height="12" rx="2" fill="#7FC4E8"/><path d="M60 140l6-14 4 14z" fill="#F4C542"/><rect x="30" y="140" width="44" height="32" rx="4" fill="#F4C542"/><rect x="30" y="140" width="44" height="7" fill="#E0B341"/><text x="52" y="164" font-size="12" text-anchor="middle" fill="#fff" font-family="Jua">TOY</text>')],
  // 바닥 소품
  ['bank', 'floorM', '도토리 저금통', 12, 'BANK'], ['nightlamp', 'floorM', '버섯 무드등', 12, 'LAMP'],
  ['jar', 'floorM', '도토리 항아리', 12, t('<path d="M88 168c-12 0-14-24-4-30h20c10 6 8 30-4 30z" fill="#E8C770" stroke="#C99A1E"/><ellipse cx="94" cy="138" rx="10" ry="3" fill="#C99A1E"/><ellipse cx="90" cy="134" rx="5" ry="6" fill="#D99A5B"/><path d="M85 131q5-6 10 0z" fill="#7A4B2A"/><ellipse cx="99" cy="133" rx="5" ry="6" fill="#D99A5B"/><path d="M94 130q5-6 10 0z" fill="#7A4B2A"/>')],
  ['blocks', 'floorM', '쌓기 블록', 4, t('<rect x="80" y="156" width="14" height="14" rx="2" fill="#7FC4E8"/><rect x="95" y="156" width="14" height="14" rx="2" fill="#F49C9C"/><rect x="87" y="141" width="14" height="14" rx="2" fill="#F4C542" transform="rotate(-6 94 148)"/><text x="87" y="167" font-size="9" text-anchor="middle" fill="#fff" font-family="Jua">소</text><text x="102" y="167" font-size="9" text-anchor="middle" fill="#fff" font-family="Jua">은</text>')],
  ['ball', 'floorM', '비치볼', 3, t('<circle cx="95" cy="160" r="12" fill="#fff" stroke="#E0C9A2"/><path d="M95 148a12 12 0 0 1 0 24" fill="#F49C9C"/><path d="M95 148q-8 12 0 24" fill="#7FC4E8"/><path d="M95 148q8 12 0 24" fill="#F4C542" opacity=".9"/>')],
  ['train', 'floorM', '꼬마 기차', 5, t('<rect x="78" y="152" width="18" height="12" rx="2" fill="#B3261E"/><rect x="82" y="144" width="10" height="9" rx="1" fill="#1F2A44"/><rect x="98" y="155" width="14" height="9" rx="2" fill="#7FC4E8"/><circle cx="83" cy="166" r="3.5" fill="#2B2622"/><circle cx="92" cy="166" r="3.5" fill="#2B2622"/><circle cx="105" cy="166" r="3" fill="#2B2622"/><path d="M96 159h2" stroke="#6B5F52" stroke-width="2"/>')],
  // 바닥 오른쪽 가구
  ['albumshelf', 'floorR', '성장 앨범 책장', 15, 'BOOK'], ['radio', 'floorR', '자장가 라디오', 14, 'RADIO'],
  ['shelf', 'floorR', '책장', 10, t('<rect x="232" y="96" width="40" height="72" rx="3" fill="#B97648"/><path d="M234 120h36M234 144h36" stroke="#8C5530" stroke-width="2"/><rect x="237" y="102" width="6" height="16" fill="#7FC4E8"/><rect x="245" y="104" width="6" height="14" fill="#F49C9C"/><rect x="253" y="101" width="6" height="17" fill="#F4C542"/><rect x="238" y="126" width="16" height="16" rx="3" fill="#FCEBD3"/><circle cx="262" cy="134" r="6" fill="#D99A5B"/>')],
  ['tent', 'floorR', '놀이 텐트', 11, t('<path d="M248 84l-26 88h52z" fill="#FCE8B4" stroke="#E0C590" stroke-width="2"/><path d="M248 84l-10 88M248 84l10 88" stroke="#F49C9C" stroke-width="3"/><path d="M248 120l-12 52h24z" fill="#F8D8D1"/><path d="M244 80l4 4 4-4" stroke="#B97648" stroke-width="2.5" fill="none"/><path d="M244 78l-4-6M252 78l4-6" stroke="#B97648" stroke-width="2.5" stroke-linecap="round"/>')],
  ['crib', 'floorR', '아기 침대', 12, t('<rect x="222" y="112" width="52" height="40" rx="5" fill="none" stroke="#fff" stroke-width="4"/><path d="M232 112v40M242 112v40M252 112v40M262 112v40" stroke="#fff" stroke-width="3"/><rect x="224" y="140" width="48" height="12" fill="#DCE7F1"/><path d="M222 152v20M274 152v20" stroke="#E0C9A2" stroke-width="4"/><ellipse cx="236" cy="138" rx="9" ry="5" fill="#F8D8D1"/>')],
  ['piano', 'floorR', '장난감 피아노', 9, t('<rect x="224" y="128" width="48" height="26" rx="4" fill="#F49C9C"/><rect x="228" y="140" width="40" height="10" fill="#fff"/>' + [233, 238, 243, 248, 253, 258, 263].map(x => `<path d="M${x} 140v10" stroke="#E0C9A2"/>`).join('') + [231, 236, 246, 251, 256].map(x => `<rect x="${x}" y="140" width="3" height="6" fill="#2B2622"/>`).join('') + '<path d="M230 154v18M266 154v18" stroke="#B97648" stroke-width="3"/>')],
  ['sofa', 'floorR', '꼬마 소파', 10, t('<rect x="220" y="128" width="56" height="30" rx="10" fill="#9CC4E4"/><rect x="226" y="118" width="44" height="22" rx="9" fill="#B9D6EE"/><rect x="216" y="132" width="12" height="26" rx="6" fill="#86B4DA"/><rect x="268" y="132" width="12" height="26" rx="6" fill="#86B4DA"/><path d="M226 158v12M270 158v12" stroke="#8C5530" stroke-width="3"/><rect x="236" y="124" width="14" height="12" rx="4" fill="#F8D8D1" transform="rotate(-10 243 130)"/>')],
  // 구석
  ['lamp', 'corner', '스탠드', 8, t('<path d="M272 172h20M282 172v-52" stroke="#1F2A44" stroke-width="3"/><path d="M268 122l14-24 14 24z" fill="#FCE8B4" stroke="#E0C590"/><ellipse cx="282" cy="124" rx="22" ry="5" fill="#FCE8B4" opacity=".5"/>')],
  ['monstera', 'corner', '몬스테라', 8, t('<path d="M280 150h24l-3 22h-18z" fill="#F6EBD6" stroke="#E0C9A2"/><path d="M292 150c0-20-4-36-16-48M292 150c2-18 8-32 18-40M292 150c-4-12-12-18-20-20" stroke="#5E9E57" stroke-width="2.5" fill="none"/><path d="M276 102c-12 4-14 18-6 24 6-8 10-14 6-24zM310 110c10 6 6 20-4 22-2-10-2-16 4-22zM272 130c-10-2-14 8-8 14 6-2 10-8 8-14z" fill="#7FB77E"/>')],
  ['giraffe', 'corner', '키재기 기린', 14, 'GIRAFFE'], ['mailbox', 'corner', '육아 글 우편함', 12, 'MAIL'], ['xtree', 'corner', '크리스마스 트리', 14, 'TREE'],
  // 반려동물
  ['cat', 'pet', '낮잠 고양이', 12, t('<ellipse cx="234" cy="166" rx="18" ry="9" fill="#F4C542"/><circle cx="220" cy="160" r="8" fill="#F4C542"/><path d="M214 155l1-7 5 4zM222 152l4-5 2 6z" fill="#F4C542"/><path d="M216 160q2 2 4 0M222 160q2 2 4 0" stroke="#5A3420" stroke-width="1.2" fill="none"/><path d="M250 166q8-2 6-10" stroke="#F4C542" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M232 160q4-3 8 0M236 168q4-3 8 0" stroke="#E0B341" stroke-width="1.5" fill="none"/><text x="240" y="150" font-size="8" fill="#6B5F52" font-family="Jua">z z</text>')],
  ['dog', 'pet', '강아지', 13, t('<ellipse cx="236" cy="164" rx="14" ry="10" fill="#FFFDF7" stroke="#E0C9A2"/><circle cx="230" cy="148" r="10" fill="#FFFDF7" stroke="#E0C9A2"/><ellipse cx="221" cy="149" rx="4" ry="8" fill="#C98B5A"/><ellipse cx="239" cy="149" rx="4" ry="8" fill="#C98B5A"/><circle cx="227" cy="146" r="1.6" fill="#2B2622"/><circle cx="233" cy="146" r="1.6" fill="#2B2622"/><ellipse cx="230" cy="151" rx="2.2" ry="1.6" fill="#2B2622"/><path d="M250 160q6-6 4-12" stroke="#E0C9A2" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M226 156h8" stroke="#B3261E" stroke-width="2.5"/>')],
  ['bunny', 'pet', '토끼', 11, t('<ellipse cx="234" cy="164" rx="13" ry="10" fill="#fff" stroke="#E0C9A2"/><circle cx="226" cy="152" r="8" fill="#fff" stroke="#E0C9A2"/><ellipse cx="222" cy="138" rx="3" ry="9" fill="#fff" stroke="#E0C9A2"/><ellipse cx="229" cy="137" rx="3" ry="9" fill="#fff" stroke="#E0C9A2"/><ellipse cx="229" cy="137" rx="1.3" ry="6" fill="#F6B4AA"/><circle cx="223" cy="151" r="1.4" fill="#2B2622"/><circle cx="246" cy="164" r="3.5" fill="#fff" stroke="#E0C9A2"/><circle cx="222" cy="155" r="2" fill="#F6B4AA" opacity=".7"/>')],
  ['chick', 'pet', '병아리 셋', 9, t([[222, 0], [236, 2], [248, -1]].map(([x, d]) => `<ellipse cx="${x}" cy="${166 + d}" rx="7" ry="6" fill="#F4C542"/><circle cx="${x - 2}" cy="${158 + d}" r="4.5" fill="#F4C542"/><path d="M${x - 7} ${158 + d}l-3 1 3 1" fill="#E59A5C"/><circle cx="${x - 3}" cy="${157 + d}" r=".9" fill="#2B2622"/>`).join(''))],
  // 함께 있는 수사관 (엄마·아빠 다람쥐)
  ['fam-both', 'fam', '엄마·아빠 같이', 0], ['fam-mom', 'fam', '엄마랑', 0], ['fam-dad', 'fam', '아빠랑', 0],
  // 사진 액자: 우리 실제 사진이 들어가는 특수 소품 (나무 액자는 기본 무료, 나머지는 사서 걸기) (s.pic = 고른 사진 id, 안 고르면 최근 가족 사진)
  ['pic-wood', 'pic', '나무 액자', 0, 'PIC'], ['pic-white', 'pic', '하얀 액자', 3, 'PIC'], ['pic-heart', 'pic', '하트 액자', 5, 'PIC'], ['pic-gold', 'pic', '금색 액자', 8, 'PIC']
];
const DEFAULT = { wall: 'cream', floor: 'wood' };
const item = id => CAT.find(c => c[0] === id);

// 예전에 산 물건(한꺼번에 놓이던 방식)을 자리별로 옮겨요
function state() {
  const s = st();
  if (!s.slot) {
    s.slot = { ...DEFAULT };
    if (s.wall && WALLC[s.wall]) s.slot.wall = s.wall;
    (s.walls || []).forEach(w => { if (!s.room.includes(w)) s.room.push(w); });
    for (const id of s.room) { const c = item(id); if (c && !s.slot[c[1]]) s.slot[c[1]] = id; }
    save(s);
  }
  if (addNew(s) && !S.game) save(s);
  return s;
}
// 함께 있는 수사관은 기본으로 둘 다, 기본 나무 액자는 무료로 걸어 둠 (다른 액자는 사야 함)
function addNew(s) { let ch = false; if (!('fam' in s.slot)) { s.slot.fam = 'fam-both'; ch = true; } if (!('pic' in s.slot)) { s.slot.pic = 'pic-wood'; ch = true; } if (s.slot.pic && !owns(s, s.slot.pic)) { s.slot.pic = 'pic-wood'; ch = true; } return ch; }
const owns = (s, id) => { const c = item(id); return !!c && (c[3] === 0 || s.room.includes(id)); };

// ---------- 특수 소품: 방에서 누르면 기능이 나와요 (값이 더 비싸요) ----------
const R = { edit: false, night: false, radio: null, music: 0, tree: 0 };
const FXDESC = { FRAME: '누르면 소은이 프로필 사진 이야기', CLOCK: '지금 시각으로 바늘이 움직여요 · 누르면 생후 며칠째인지', SIGN: '아기 이름이 들어가요 · 누르면 사건 파일 번호', GIRAFFE: '최근 키를 보여 줘요 · 누르면 키 변화', PIC: '우리 실제 사진을 넣어요 · 누르면 사진 고르기',
  CAL: '오늘 날짜와 다음 기념일 D-day · 누르면 기념일 안내', TV: '최근 사진이 나와요 · 누르면 성장 스토리 재생', MUSIC: '누르면 오르골 자장가가 흘러나와요', BANK: '모은 도토리 수가 보여요 · 누르면 도토리 놀이터로',
  LAMP: '누르면 방 불을 끄고 무드등을 켜요', RADIO: '누르면 잔잔한 잠 소리(백색소음)를 틀고 끄기', BOOK: '누르면 성장 앨범 책이 열려요', MAIL: '새 육아 글이 오면 깃발이 올라가요 · 누르면 육아 글 모음', WEATHER: '지금 산책 지수·기온이 걸려요 · 누르면 동네 탐문', TREE: '누르면 트리 불이 반짝이고 크리스마스까지 며칠 남았는지 알려 줘요' };
function latest(...types) { for (const t of types) { const m = (S.moments || []).filter(x => x.type === t && x.photo && safeImg(PHOTOS[x.id])).sort((a, b) => a.date < b.date ? 1 : -1)[0]; if (m) return safeImg(PHOTOS[m.id]); } return safeImg(PHOTOS.profile) || ''; }
// 다음 기념일: 100일마다 + 돌
function nextDay() {
  if (!S.profile || !S.profile.birth) return null;
  const n = dayNo(today()), L = [];
  for (let k = 100; k <= 1500; k += 100) L.push([k, k + '일']);
  for (let y = 1; y <= 4; y++) L.push([dayNo(addMonths(S.profile.birth, 12 * y)), y === 1 ? '첫 돌' : y + '돌']);
  const m = L.filter(x => x[0] >= n).sort((a, b) => a[0] - b[0])[0]; return m ? { t: m[1], d: m[0] - n } : null;
}
let AC = null; const ac = () => { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; };
function playTune() {
  const c = ac(), N = [523, 523, 784, 784, 880, 880, 784, 0, 698, 698, 659, 659, 587, 587, 523], t0 = c.currentTime + .05, d = .42;
  N.forEach((f, i) => { if (!f) return; const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + i * d); g.gain.linearRampToValueAtTime(.16, t0 + i * d + .02); g.gain.exponentialRampToValueAtTime(.001, t0 + i * d + d * .95); o.connect(g).connect(c.destination); o.start(t0 + i * d); o.stop(t0 + i * d + d); });
  R.music = Date.now() + N.length * d * 1000; render(); setTimeout(() => render(), N.length * d * 1000 + 100);
}
function toggleRadio() {
  if (R.radio) { try { R.radio.g.gain.setTargetAtTime(0, R.radio.c.currentTime, .3); R.radio.src.stop(R.radio.c.currentTime + 1); } catch (e) {} clearTimeout(R.radio.t); R.radio = null; render(); toast('라디오를 껐어요'); return; }
  const c = ac(), len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.2; }   // 브라운 노이즈 (부드러운 쉬- 소리)
  const src = c.createBufferSource(), g = c.createGain(); src.buffer = buf; src.loop = true; g.gain.value = 0; g.gain.setTargetAtTime(.35, c.currentTime, .8); src.connect(g).connect(c.destination); src.start();
  R.radio = { c, src, g, t: setTimeout(() => { if (R.radio) toggleRadio(); }, 30 * 60e3) }; render(); toast('📻 잠 소리를 틀었어요 (30분 뒤 저절로 꺼져요)');
}
const go = (fn) => { closeSheet(); fn(); render(); window.scrollTo(0, 0); };
const FX = {
  FRAME: () => toast('소은이 프로필 사진이에요. 대상 정보에서 바꿀 수 있어요 📸'),
  CLOCK: () => { const d = new Date(Date.now() + 9 * 3600e3); toast(`⏰ 지금 ${d.getUTCHours()}시 ${d.getUTCMinutes()}분 · 소은이 생후 ${dayNo(today())}일째`); },
  SIGN: () => toast(`🕵️ ${((S.profile && S.profile.name) || '우리 아기')} 탐정 사무소 · 사건 파일 No.${fileNo()}`),
  GIRAFFE: () => { const L = (S.records || []).filter(r => r.height != null && r.height !== '').sort((a, b) => a.date < b.date ? 1 : -1);
    if (!L.length) return toast('🦒 아직 키 기록이 없어요. 성장 수사에서 재 볼까요?');
    const a = L[0], b = L[1], df = b ? Math.round((a.height - b.height) * 10) / 10 : null; toast(`🦒 최근 키 ${fmt('height', a.height)}cm (${fmtK(a.date, true)})${df != null ? ` · 지난번보다 ${df >= 0 ? '+' : ''}${df}cm` : ''}`); },
  PIC: () => openPics(),
  CAL: () => { const m = nextDay(); toast(`📅 오늘 생후 ${dayNo(today())}일${m ? (m.d ? ` · ${m.t}까지 ${m.d}일 남았어요` : ` · 오늘이 ${m.t}이에요! 🎉`) : ''}`); },
  TV: () => { if (window.SLIDE) SLIDE.open(); },
  MUSIC: () => { playTune(); toast('🎶 반짝반짝 작은 별 ~'); },
  BANK: () => go(() => { S.view = 'medals'; if (window.GAME) GAME.hub('deco'); toast(`🐷 도토리 ${st().acorn || 0}개 모았어요!`); }),
  LAMP: () => { R.night = !R.night; render(); toast(R.night ? '🍄 무드등을 켰어요. 쉿, 잘 자요' : '💡 방 불을 켰어요'); },
  RADIO: () => toggleRadio(),
  BOOK: () => go(() => { S.view = 'book'; }),
  MAIL: () => go(() => { S.view = 'posts'; }),
  WEATHER: () => go(() => { S.tab = 'town'; S.view = ''; }),
  TREE: () => { const t = today(), y = +t.slice(0, 4), x = t > `${y}-12-25` ? `${y + 1}-12-25` : `${y}-12-25`, n = daysBetween(t, x);
    R.tree = Date.now() + 8000; render(); setTimeout(() => render(), 8100); toast(n ? `🎄 크리스마스까지 ${n}일 남았어요!` : '🎄 메리 크리스마스! 🎅'); }
};

// ---------- 그림 ----------
function season() { const m = +today().slice(5, 7); return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; }
function windowSvg(round) {
  const h = new Date(Date.now() + 9 * 3600e3).getUTCHours(), se = season();
  const [sky, sun] = h >= 6 && h < 17 ? ['#CFE6F7', '<circle cx="70" cy="46" r="7" fill="#FCE8B4"/>']
    : h >= 17 && h < 20 ? ['#F6C9A8', '<circle cx="66" cy="66" r="8" fill="#F49C9C"/>']
    : ['#2E3B5C', '<path d="M70 40a7 7 0 1 0 6 11 6 6 0 0 1-6-11z" fill="#FCE8B4"/><circle cx="34" cy="44" r="1.3" fill="#fff"/><circle cx="76" cy="76" r="1.2" fill="#fff"/>'];
  const view = se === 'spring' ? '<circle cx="30" cy="80" r="9" fill="#F8C8D4"/><circle cx="42" cy="76" r="7" fill="#F6B4C4"/><circle cx="40" cy="58" r="1.6" fill="#F8C8D4"/><circle cx="62" cy="70" r="1.4" fill="#F8C8D4"/><circle cx="52" cy="50" r="1.2" fill="#F8C8D4"/>'
    : se === 'summer' ? '<circle cx="32" cy="80" r="11" fill="#7FB77E"/><circle cx="46" cy="82" r="8" fill="#9CCB8E"/>'
    : se === 'autumn' ? '<circle cx="32" cy="80" r="10" fill="#E8A15A"/><circle cx="45" cy="82" r="7" fill="#D9713E"/><path d="M60 58l2 3-3 1zM48 66l2 2-3 1z" fill="#E8A15A"/>'
    : '<path d="M22 84h62v4H22z" fill="#fff"/><circle cx="34" cy="50" r="1.5" fill="#fff"/><circle cx="50" cy="62" r="1.8" fill="#fff"/><circle cx="66" cy="54" r="1.4" fill="#fff"/><circle cx="40" cy="72" r="1.6" fill="#fff"/><circle cx="74" cy="70" r="1.3" fill="#fff"/>';
  if (round) return `<clipPath id="rwcl-r"><circle cx="53" cy="61" r="30"/></clipPath><g clip-path="url(#rwcl-r)"><rect x="20" y="28" width="66" height="66" fill="${sky}"/>${sun}${view}</g><circle cx="53" cy="61" r="30" fill="none" stroke="#fff" stroke-width="5"/><path d="M53 31v60M23 61h60" stroke="#fff" stroke-width="3"/>`;
  return `<clipPath id="rwcl-s"><rect x="22" y="34" width="62" height="54" rx="6"/></clipPath><g clip-path="url(#rwcl-s)"><rect x="22" y="34" width="62" height="54" fill="${sky}"/>${sun}${view}</g><rect x="22" y="34" width="62" height="54" rx="6" fill="none" stroke="#fff" stroke-width="4"/><path d="M53 34v54M22 61h62" stroke="#fff" stroke-width="3"/>`;
}
function wallSvg(id) {
  const base = `<rect width="${VW}" height="130" fill="${WALLC[id] || (id === 'dots' ? '#FFF3DD' : id === 'stripe' ? '#FBF1E4' : id === 'stars' ? '#E2EEF8' : '#FFF7EC')}"/>`;
  if (id === 'dots') return base + Array.from({ length: 60 }, (_, i) => `<circle cx="${(i % 12) * 28 + ((i / 12 | 0) % 2) * 14 + 6}" cy="${(i / 12 | 0) * 26 + 10}" r="3" fill="#F6D2C8"/>`).join('');
  if (id === 'stripe') return base + Array.from({ length: 16 }, (_, i) => `<rect x="${i * 20}" width="10" height="130" fill="#F4E0C8" opacity=".7"/>`).join('');
  if (id === 'stars') return base + Array.from({ length: 30 }, (_, i) => { const x = (i * 53) % VW, y = (i * 37) % 120 + 6; return `<path d="M${x} ${y}l1.5 3 3.3.4-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.4z" fill="#fff"/>`; }).join('');
  if (id === 'gingham') return base + Array.from({ length: 23 }, (_, i) => `<rect x="${i * 14}" width="7" height="130" fill="rgba(179,38,30,.08)"/>`).join('') + Array.from({ length: 10 }, (_, i) => `<rect y="${i * 14}" width="${VW}" height="7" fill="rgba(179,38,30,.08)"/>`).join('');
  return base;
}
function floorSvg(id) {
  if (id === 'checker') return `<rect y="130" width="${VW}" height="50" fill="#F4E3C9"/>` + Array.from({ length: 64 }, (_, i) => (i + (i / 16 | 0)) % 2 ? '' : `<rect x="${(i % 16) * 20}" y="${130 + (i / 16 | 0) * 13}" width="20" height="13" fill="#E9CFA8"/>`).join('');
  if (id === 'grass') return `<rect y="130" width="${VW}" height="50" fill="#CFE8C0"/>` + Array.from({ length: 40 }, (_, i) => `<path d="M${i * 8 + 3} ${150 + (i * 7) % 24}l2-5 2 5" stroke="#9CCB8E" stroke-width="1.2" fill="none"/>`).join('');
  if (id === 'puzzle') { const C = ['#F8D8D1', '#FCE8B4', '#DCE7F1', '#DDEEDB']; return Array.from({ length: 32 }, (_, i) => `<rect x="${(i % 8) * 40}" y="${130 + (i / 8 | 0) * 13}" width="40" height="13" fill="${C[(i + (i / 8 | 0)) % 4]}"/>`).join('') + `<path d="M0 130h${VW}" stroke="#fff" stroke-width="1"/>`; }
  if (id === 'cloudf') return `<rect y="130" width="${VW}" height="50" fill="#DCE7F1"/><path d="M20 160a6 6 0 0 1 10-4a8 8 0 0 1 14 2h-24zM200 150a6 6 0 0 1 10-4a8 8 0 0 1 14 2h-24zM120 172a6 6 0 0 1 10-4a8 8 0 0 1 14 2h-24z" fill="#fff"/>`;
  return `<rect y="130" width="${VW}" height="50" fill="#E8C9A0"/><path d="M0 150h${VW}M0 168h${VW}" stroke="#DDBB8F" stroke-width="1"/>`;
}
function special(id) {
  const ph = safeImg(PHOTOS.profile);
  if (id === 'FRAME') return `<rect x="112" y="40" width="44" height="52" rx="3" fill="#B97648"/><rect x="117" y="45" width="34" height="42" fill="#FCEBD3"/>${ph ? `<image href="${ph}" x="117" y="45" width="34" height="42" preserveAspectRatio="xMidYMid slice"/>` : ''}`;
  if (id === 'CLOCK') { const d = new Date(Date.now() + 9 * 3600e3), hh = d.getUTCHours() % 12 + d.getUTCMinutes() / 60, mm = d.getUTCMinutes(), cx = 135, cy = 62, R = 20, ha = hh / 12 * 2 * Math.PI - Math.PI / 2, ma = mm / 60 * 2 * Math.PI - Math.PI / 2;
    return `<circle cx="${cx}" cy="${cy}" r="${R + 3}" fill="#F49C9C"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="#FFFDF7"/>${[0, 3, 6, 9].map(k => { const a = k / 12 * 2 * Math.PI - Math.PI / 2; return `<circle cx="${(cx + Math.cos(a) * (R - 4)).toFixed(1)}" cy="${(cy + Math.sin(a) * (R - 4)).toFixed(1)}" r="1.6" fill="#1F2A44"/>`; }).join('')}<path d="M${cx} ${cy}L${(cx + Math.cos(ha) * 10).toFixed(1)} ${(cy + Math.sin(ha) * 10).toFixed(1)}" stroke="#1F2A44" stroke-width="2.6" stroke-linecap="round"/><path d="M${cx} ${cy}L${(cx + Math.cos(ma) * 15).toFixed(1)} ${(cy + Math.sin(ma) * 15).toFixed(1)}" stroke="#B3261E" stroke-width="1.8" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="2" fill="#1F2A44"/>`; }
  if (id === 'SIGN') { const n = ((S.profile && S.profile.name) || '우리 아기').replace(/^[가-힣](?=[가-힣]{2}$)/, '');
    return `<path d="M118 30l17-12 17 12" stroke="#8C5530" stroke-width="1.5" fill="none"/><rect x="100" y="30" width="70" height="26" rx="5" fill="#C98B5A" stroke="#8C5530" stroke-width="2"/><text x="135" y="47" font-size="11" text-anchor="middle" fill="#FFF8EC" font-family="Jua"${n.length > 3 ? ' textLength="62" lengthAdjust="spacingAndGlyphs"' : ''}>${esc(n)} 탐정 사무소</text><circle cx="106" cy="36" r="1.5" fill="#8C5530"/><circle cx="164" cy="36" r="1.5" fill="#8C5530"/>`; }
  if (id === 'GIRAFFE') { const hs = (S.records || []).filter(r => r.height != null && r.height !== '').sort((a, b) => a.date < b.date ? 1 : -1)[0], cm = hs ? fmt('height', hs.height) : '';
    return `<rect x="284" y="78" width="10" height="94" rx="4" fill="#F4C542"/>${Array.from({ length: 8 }, (_, i) => `<path d="M284 ${88 + i * 10}h${i % 2 ? 4 : 7}" stroke="#B97648" stroke-width="1.2"/>`).join('')}<circle cx="290" cy="100" r="2.5" fill="#D99A5B"/><circle cx="288" cy="128" r="2.2" fill="#D99A5B"/><circle cx="291" cy="152" r="2.4" fill="#D99A5B"/><ellipse cx="294" cy="74" rx="11" ry="8" fill="#F4C542"/><path d="M290 66l-1-6M298 66l1-6" stroke="#B97648" stroke-width="2" stroke-linecap="round"/><circle cx="297" cy="72" r="1.4" fill="#2B2622"/><ellipse cx="303" cy="77" rx="3" ry="2" fill="#E8B04A"/>${cm ? `<rect x="262" y="112" width="22" height="12" rx="3" fill="#FFFDF7" stroke="#E0C9A2"/><text x="273" y="121" font-size="7" text-anchor="middle" fill="#B3261E" font-family="Jua">${cm}</text>` : ''}`; }
  if (id === 'TREE') { const on = R.tree > Date.now(), C = ['#F4C542', '#F49C9C', '#7FC4E8', '#FFFDF7'];
    const balls = [[284, 112], [296, 120], [280, 132], [300, 140], [288, 146], [276, 154], [304, 156], [292, 132]];
    return `<rect x="286" y="160" width="9" height="12" fill="#8C5530"/><path d="M290.5 92l-14 24h28zM290.5 104l-19 32h38zM290.5 120l-24 42h48z" fill="#3E8E5A"/><path d="M276 116q14 6 29 0M272 136q19 7 38 0M267 162q23 7 47 0" stroke="#F4C542" stroke-width="1.2" fill="none" opacity=".8"/>${balls.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${C[i % 4]}" class="${on ? 'rtw' : ''}" style="animation-delay:${i * .15}s"/>`).join('')}<path d="M290.5 83l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="#F4C542" stroke="#C99A1E" stroke-width=".8" class="${on ? 'rtw' : ''}"/><rect x="270" y="163" width="13" height="10" rx="1.5" fill="#D9473D"/><path d="M276.5 163v10M270 168h13" stroke="#F4C542" stroke-width="1.6"/><rect x="298" y="165" width="11" height="8" rx="1.5" fill="#7FC4E8"/><path d="M303.5 165v8" stroke="#FFFDF7" stroke-width="1.5"/>`; }
  if (id === 'CAL') { const t = today(), m = nextDay();
    return `<rect x="112" y="34" width="46" height="54" rx="4" fill="#FFFDF7" stroke="#E0C9A2" stroke-width="1.5"/><path d="M112 47v-9a4 4 0 0 1 4-4h38a4 4 0 0 1 4 4v9z" fill="#B3261E"/><circle cx="122" cy="34" r="2" fill="#6B5F52"/><circle cx="148" cy="34" r="2" fill="#6B5F52"/><text x="135" y="44.5" font-size="8" fill="#fff" text-anchor="middle" font-family="Jua">${+t.slice(5, 7)}월</text><text x="135" y="69" font-size="21" fill="#1F2A44" text-anchor="middle" font-family="Jua">${+t.slice(8)}</text><text x="135" y="82" font-size="6.5" fill="#B3261E" text-anchor="middle" font-family="Jua">${m ? (m.d ? `${m.t} D-${m.d}` : `오늘 ${m.t}!`) : ''}</text>`; }
  if (id === 'TV') { const ph = latest('month', 'free', 'fam');
    return `<rect x="104" y="36" width="62" height="44" rx="5" fill="#2B2B3A"/><rect x="108" y="40" width="54" height="34" rx="2" fill="#4A5A7A"/>${ph ? `<image href="${ph}" x="108" y="40" width="54" height="34" preserveAspectRatio="xMidYMid slice"/>` : ''}<circle cx="135" cy="57" r="7" fill="rgba(0,0,0,.35)"/><path d="M132.5 53.5v7l6-3.5z" fill="#fff"/><path d="M126 80l-4 7M144 80l4 7" stroke="#2B2B3A" stroke-width="2"/><circle cx="160" cy="77.5" r="1.2" fill="#7FB77E"/>`; }
  if (id === 'MUSIC') return `<rect x="178" y="0" width="54" height="48" fill="transparent"/><path d="M204 0v12" stroke="#B9A889" stroke-width="1.5"/><path d="M190 16h28l-3 6h-22z" fill="#F49CB8"/><ellipse cx="204" cy="16" rx="15" ry="3" fill="#F7B3C8"/><path d="M193 22v12M204 22v18M215 22v12" stroke="#B9A889" stroke-width="1"/>${'<path d="M0 -5l1.5 3.4 3.7.3-2.8 2.4.9 3.6L0 2.8-3.3 4.7l.9-3.6-2.8-2.4 3.7-.3z" fill="#F4C542"/>'.replace('<path', '<path transform="translate(193 38)"')}<path d="M208 40a6 6 0 1 1-6-6 4.6 4.6 0 0 0 6 6z" fill="#FCE8B4"/>${'<path d="M0 -5l1.5 3.4 3.7.3-2.8 2.4.9 3.6L0 2.8-3.3 4.7l.9-3.6-2.8-2.4 3.7-.3z" fill="#7FC4E8"/>'.replace('<path', '<path transform="translate(215 38)"')}<g class="rnotes${R.music > Date.now() ? ' on' : ''}"><text x="222" y="22" font-size="9" fill="#B3261E">♪</text><text x="182" y="28" font-size="8" fill="#1F2A44">♫</text></g>`;
  if (id === 'BANK') { const n = st().acorn || 0;
    return `<rect x="84" y="128" width="30" height="12" rx="6" fill="#FFFDF7" stroke="#E0C9A2"/><text x="99" y="137" font-size="7.5" text-anchor="middle" fill="#8C5530" font-family="Jua">🌰 ${n}</text><ellipse cx="99" cy="159" rx="16" ry="12" fill="#F6B4AA"/><path d="M90 149l-2-6 6 3zM106 149l2-6-6 3z" fill="#F49C9C"/><ellipse cx="85" cy="159" rx="4" ry="5" fill="#F49C9C"/><circle cx="84" cy="158" r=".9" fill="#B97648"/><circle cx="86" cy="160" r=".9" fill="#B97648"/><circle cx="93" cy="155" r="1.4" fill="#2B2622"/><rect x="96" y="147.5" width="8" height="2" rx="1" fill="#C77A6A"/><path d="M90 170v-3M98 171v-3M106 170v-3" stroke="#F49C9C" stroke-width="3" stroke-linecap="round"/><path d="M115 158q4-2 2 2" stroke="#F49C9C" stroke-width="1.5" fill="none"/>`; }
  if (id === 'LAMP') return `${R.night ? '<circle cx="98" cy="146" r="34" fill="url(#rglow)"/>' : ''}<rect x="95" y="150" width="7" height="18" rx="3" fill="#FFF3DD" stroke="#E0C9A2"/><ellipse cx="98.5" cy="169" rx="10" ry="3" fill="#E0C9A2"/><path d="M82 152q2-18 16.5-18t16.5 18z" fill="${R.night ? '#FF8A80' : '#D9473D'}"/><circle cx="91" cy="144" r="2.6" fill="#fff"/><circle cx="104" cy="141" r="2" fill="#fff"/><circle cx="99" cy="148" r="1.8" fill="#fff"/>`;
  if (id === 'RADIO') return `<path d="M232 134l16-16" stroke="#6B5F52" stroke-width="1.5"/><circle cx="248" cy="118" r="1.6" fill="#6B5F52"/><rect x="222" y="134" width="50" height="32" rx="7" fill="#7FB77E"/><circle cx="238" cy="150" r="10" fill="#5E9E57"/>${[[-4, -4], [0, -4], [4, -4], [-4, 0], [0, 0], [4, 0], [-4, 4], [0, 4], [4, 4]].map(([a, b]) => `<circle cx="${238 + a}" cy="${150 + b}" r="1.1" fill="#3F7A3A"/>`).join('')}<rect x="252" y="140" width="15" height="8" rx="2" fill="#FFFDF7"/><path d="M256 140v8" stroke="#B3261E" stroke-width="1.2"/><circle cx="256" cy="157" r="3" fill="#F4C542"/><circle cx="264" cy="157" r="3" fill="#F49C9C"/><path d="M228 166v4M266 166v4" stroke="#5E9E57" stroke-width="3"/><g class="rwave${R.radio ? ' on' : ''}"><path d="M276 140q4 6 0 12M281 136q6 10 0 20" stroke="#7FB77E" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>`;
  if (id === 'BOOK') { const C = ['#F49C9C', '#F4C542', '#7FC4E8', '#7FB77E', '#C9A7D9', '#F6B4AA'];
    return `<rect x="228" y="92" width="46" height="78" rx="3" fill="#B97648"/><rect x="231" y="95" width="40" height="72" fill="#8C5530"/><path d="M231 119h40M231 143h40" stroke="#B97648" stroke-width="3"/>${[0, 1, 2].map(r => C.map((c, i) => i < 5 ? `<rect x="${233 + i * 7.4}" y="${97 + r * 24}" width="6" height="${20 - (i + r) % 3 * 2}" rx="1" fill="${C[(i + r * 2) % 6]}"/>` : '').join('')).join('')}<rect x="236" y="84" width="30" height="10" rx="2" fill="#FFFDF7" stroke="#E0C9A2"/><text x="251" y="91.5" font-size="6.5" text-anchor="middle" fill="#8C5530" font-family="Jua">성장 앨범</text>`; }
  if (id === 'MAIL') { const nu = window.POSTS && POSTS.fresh && POSTS.fresh();
    return `<rect x="288" y="128" width="5" height="44" fill="#8C5530"/><path d="M276 114q0-8 8-8h12q8 0 8 8v16h-28z" fill="#B3261E"/><rect x="280" y="117" width="20" height="3" rx="1.5" fill="#8E1E17"/><path d="M304 110v12" stroke="#6B5F52" stroke-width="1.5"/><path d="M304 110h7l-2 3 2 3h-7" fill="${nu ? '#F4C542' : '#E0C9A2'}"/>${nu ? '<circle cx="279" cy="108" r="5.5" fill="#F4C542" stroke="#fff" stroke-width="1.2"/><text x="279" y="110.6" font-size="7" text-anchor="middle" fill="#8C5530" font-family="Jua">N</text>' : ''}`; }
  if (id === 'WEATHER') { const w = window.TOWN && TOWN.now && TOWN.now();
    return `<path d="M88 30l14-12" stroke="#B9A889" stroke-width="1"/><rect x="98" y="8" width="58" height="14" rx="7" fill="#FFFDF7" stroke="#E0C9A2"/><text x="127" y="18" font-size="8" text-anchor="middle" fill="#1F2A44" font-family="Jua">${w ? `${w.ico} 산책 ${w.s} · ${w.tmp}°` : '☀️ 날씨 보기'}</text>`; }
  return '';
}
// 가족 사진 액자: 고른 사진 → 최근 가족 사진 → 최근 현장 사진 → 프로필 사진
function picSrc() {
  const id = (st().pic || ''), own = id && safeImg(PHOTOS[id]); if (own) return own;
  const by = t => (S.moments || []).filter(m => m.type === t && m.photo && safeImg(PHOTOS[m.id])).sort((a, b) => a.date < b.date ? 1 : -1)[0];
  const m = by('fam') || by('free') || by('month'); return (m && safeImg(PHOTOS[m.id])) || safeImg(PHOTOS.profile) || '';
}
function picSvg(id) {
  const ph = picSrc(), x = 240, y = 16, w = 54, h = 42;
  const fr = { 'pic-white': ['#FFFDF7', '#E0C9A2'], 'pic-heart': ['#F49CB8', '#E07A9A'], 'pic-gold': ['#E8C350', '#B98F1E'] }[id] || ['#B97648', '#8C5530'];
  return `<g data-rfx="PIC" class="rfx"><path d="M${x + 10} ${y}L${x + w / 2} ${y - 10}L${x + w - 10} ${y}" stroke="#8C5530" stroke-width="1.2" fill="none"/><circle cx="${x + w / 2}" cy="${y - 10}" r="1.8" fill="#8C5530"/>
    <rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" rx="3" fill="rgba(0,0,0,.08)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fr[0]}" stroke="${fr[1]}" stroke-width="1.5"/>
    <rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" fill="#FFF8EC"/>
    ${ph ? `<image href="${ph}" x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" preserveAspectRatio="xMidYMid slice"/>` : `<text x="${x + w / 2}" y="${y + h / 2 + 3}" font-size="7" text-anchor="middle" fill="#B9A889">우리 가족 사진</text>`}
    ${id === 'pic-heart' ? `<path d="M${x + w / 2} ${y + h + 6}c-5-5-9 0-4.5 3.5L${x + w / 2} ${y + h + 13}l4.5-3.5c4.5-3.5.5-8.5-4.5-3.5z" fill="#E07A9A"/>` : ''}${id === 'pic-gold' ? `<circle cx="${x}" cy="${y}" r="2.4" fill="#F4E08A"/><circle cx="${x + w}" cy="${y}" r="2.4" fill="#F4E08A"/><circle cx="${x}" cy="${y + h}" r="2.4" fill="#F4E08A"/><circle cx="${x + w}" cy="${y + h}" r="2.4" fill="#F4E08A"/>` : ''}</g>`;
}
function draw(id) { const c = item(id); if (!c || !c[4]) return ''; if (c[4] === 'PIC') return picSvg(id);
  return /^[A-Z]+$/.test(c[4]) ? (FX[c[4]] ? `<g data-rfx="${c[4]}" class="rfx">${special(c[4])}</g>` : special(c[4])) : c[4]; }
const chr = (who, prop, x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">${CHARS.svg(who, prop, { size: 120 }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`;
// 자리마다 옮긴 만큼(s.pos[자리] = [dx, dy]) 움직여 그려요. 식구: 아빠 > 엄마 > 소은 크기
const BASE = { mom: [50, 80, .7], dad: [182, 64, .8], baby: [118, 92, .66], solo: [118, 72, .82] };
function roomSvg(edit) {
  const s = state(), sl = s.slot, P = s.pos || {};
  const off = k => { const p = P[k]; return p ? [+p[0] || 0, +p[1] || 0] : [0, 0]; };
  const mv = (k, inner) => { if (!inner) return ''; const [dx, dy] = off(k); return `<g data-mv="${k}"${dx || dy ? ` transform="translate(${dx} ${dy})"` : ''}>${inner}</g>`; };
  const fam = sl.fam || '', mom = fam === 'fam-both' || fam === 'fam-mom', dad = fam === 'fam-both' || fam === 'fam-dad';
  const person = (who, b) => { const [dx, dy] = off(who); return `<g data-mv="${who}">${chr(who, window.GAME && GAME.propOf ? GAME.propOf(who) : '', b[0] + dx, b[1] + dy, b[2])}</g>`; };
  const order = ['ceil', 'hang', 'wallC', 'rug', 'floorR', 'corner', 'floorL', 'floorM'];
  return `<svg class="groom${edit ? ' groom-edit' : ''}" viewBox="0 0 ${VW} ${VH}" aria-label="소은 탐정의 방"><defs><radialGradient id="rglow"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".9"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient></defs>
    ${wallSvg(sl.wall)}<path d="M0 120h${VW}" stroke="rgba(0,0,0,.05)" stroke-width="10"/>${floorSvg(sl.floor)}<path d="M0 130h${VW}" stroke="rgba(150,110,60,.35)" stroke-width="2"/>
    ${mv('win', windowSvg(sl.win === 'roundwin') + (sl.win && sl.win !== 'roundwin' ? draw(sl.win) : ''))}
    ${order.filter(k => k !== 'floorM').map(k => sl[k] ? mv(k, draw(sl[k])) : '').join('')}${sl.pic ? mv('pic', draw(sl.pic)) : ''}
    ${dad ? person('dad', BASE.dad) : ''}${mom ? person('mom', BASE.mom) : ''}
    ${sl.pet ? mv('pet', draw(sl.pet)) : ''}
    ${person('baby', mom || dad ? BASE.baby : BASE.solo)}
    ${sl.floorM ? mv('floorM', draw(sl.floorM)) : ''}
    ${R.night ? `<rect width="${VW}" height="${VH}" fill="#0B1430" opacity=".5" pointer-events="none"/>${sl.floorM === 'nightlamp' ? (() => { const [dx, dy] = off('floorM'); return `<circle cx="${98 + dx}" cy="${146 + dy}" r="40" fill="url(#rglow)" pointer-events="none"/>`; })() : ''}` : ''}</svg>`;
}
// 꾸미기 화면 위쪽: 방 그림 + 위치 옮기기
function editorHtml() {
  return `<div class="redit"><button class="${R.edit ? 'primary' : 'ghost'}" data-roomedit="1">${R.edit ? '✓ 다 옮겼어요' : '✋ 위치 옮기기'}</button>${R.edit ? '<button class="ghost" data-roomreset="1">처음 자리로</button>' : ''}</div>
    ${R.edit ? '<p class="hint" style="margin:4px 0 6px;color:var(--red)">방 그림에서 소품이나 엄마·아빠·소은이를 손가락으로 끌어 옮겨요.</p>' : '<p class="hint" style="margin:4px 0 6px">방에서 소은·엄마·아빠를 누르면 그 식구 꾸미기로 가요.</p>'}${roomSvg(R.edit)}`;
}

// ---------- 가게 (도토리 놀이터 > 꾸미기) ----------
function preview(c) {
  const [id, slot, , , g] = c, vb = (SLOTS.find(x => x[0] === slot) || [])[3];
  if (slot === 'wall') return `<i class="rsw" style="background:${WALLC[id] || ({ dots: 'radial-gradient(#F6D2C8 2px,#FFF3DD 2.5px) 0 0/9px 9px', stripe: 'repeating-linear-gradient(90deg,#F4E0C8 0 5px,#FBF1E4 5px 10px)', stars: '#E2EEF8', gingham: 'repeating-linear-gradient(90deg,rgba(179,38,30,.12) 0 4px,transparent 4px 8px),repeating-linear-gradient(rgba(179,38,30,.12) 0 4px,#FFF7EC 4px 8px)' }[id] || '#FFF7EC')}">${id === 'stars' ? '✦' : ''}</i>`;
  if (slot === 'floor') return `<svg class="rpv" viewBox="0 130 120 50">${floorSvg(id)}</svg>`;
  if (slot === 'fam') return `<span class="rpp rfam">${id !== 'fam-dad' ? CHARS.svg('mom', '', { face: true, size: 26 }) : ''}${id !== 'fam-mom' ? CHARS.svg('dad', '', { face: true, size: 26 }) : ''}</span>`;
  const inner = id === 'roundwin' ? windowSvg(true) : slot === 'win' ? windowSvg(false) + draw(id) : draw(id);
  return `<svg class="rpv" viewBox="${vb}">${inner.replace(/ data-rfx="[A-Z]+"/g, '')}</svg>`;
}
// 자리마다 접기 (기본 접힘, data-fold r-{자리} → localStorage soeun-fold), 위·아래에 모두 펼치기/접기
function shopHtml() {
  const s = state(), allOpen = SLOTS.every(([slot]) => !isFold('r-' + slot, true));
  const bar = `<div class="rbar"><button class="ghost" data-roomfold="${allOpen ? 'close' : 'open'}">${allOpen ? '모두 접기 ▴' : '모두 펼치기 ▾'}</button></div>`;
  return bar + SLOTS.map(([slot, nm, opt]) => {
    const L = CAT.filter(c => c[1] === slot), cur = s.slot[slot] || '', ci = cur && item(cur), have = L.filter(c => owns(s, c[0])).length;
    return `<div class="amon rgrp${isFold('r-' + slot, true) ? ' folded' : ''}"><h3 class="agh" data-fold="r-${slot}"><span>${nm}</span><small class="rcur">${ci ? ci[2] : '비어 있음'} · ${have}/${L.length}</small></h3><div class="rshop">${opt ? `<button class="rit${!cur ? ' cur' : ''}" data-room="${slot}" data-id=""><span class="rpp">∅</span><b>비우기</b><small>${!cur ? '비어 있음' : ''}</small></button>` : ''}${L.map(c => {
      const own = owns(s, c[0]), on = cur === c[0];
      const fxk = c[4] === 'PIC' ? 'PIC' : (FX[c[4]] ? c[4] : '');
      return `<button class="rit${on ? ' cur' : ''}${own ? '' : ' lock'}${fxk ? ' rsp' : ''}" data-room="${slot}" data-id="${c[0]}">${fxk ? '<i class="rsx">✨</i>' : ''}${preview(c)}<b>${c[2]}</b><small>${on ? '놓는 중' : own ? '놓기' : `🌰 ${c[3]}`}</small></button>`;
    }).join('')}</div></div>`;
  }).join('') + bar;
}
function count() { const s = state(); return { own: CAT.filter(c => c[3] > 0 && s.room.includes(c[0])).length, all: CAT.filter(c => c[3] > 0).length }; }

document.addEventListener('click', e => {
  const f = e.target.closest('[data-roomfold]');
  if (f) { const v = f.dataset.roomfold === 'close'; SLOTS.forEach(([slot]) => setFold('r-' + slot, v)); render(); if (v) { const el = document.getElementById('ghomeshop'); if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' }); } return; }
  if (e.target.closest('[data-roomedit]')) { R.edit = !R.edit; render(); return; }
  if (e.target.closest('[data-roomreset]')) { const s = state(); s.pos = {}; save(s); render(); toast('처음 자리로 돌렸어요'); return; }
  if (drag.justMoved) { drag.justMoved = false; return; }
  // 꾸미기 화면 방에서 식구를 누르면 그 식구 꾸미기로
  const pg = e.target.closest('#ghomeshop [data-mv=baby], #ghomeshop [data-mv=mom], #ghomeshop [data-mv=dad]');
  if (pg && window.GAME && GAME.kitFor) { GAME.kitFor(pg.dataset.mv); return; }
  const fx = e.target.closest('[data-rfx]');
  if (fx && !e.target.closest('.groom-edit')) { const f = FX[fx.dataset.rfx]; if (f) f(); return; }
  const pk = e.target.closest('[data-roompick]'); if (pk) { const s = state(); s.pic = pk.dataset.roompick; save(s); closeSheet(); render(); toast('액자 사진을 바꿨어요'); return; }
  const b = e.target.closest('[data-room]'); if (!b) return;
  const slot = b.dataset.room, id = b.dataset.id, s = state();
  if (!id) { if (slot === 'fam' || slot === 'pic') s.slot[slot] = ''; else delete s.slot[slot]; save(s); render(); return; }
  const c = item(id); if (!c) return;
  if (!owns(s, id)) {
    // 바로 사지 않고 구매 확인 창 (거기서 '사기'를 누르면 data-ok=1로 다시 와요)
    if (b.dataset.ok !== '1') { { const fxk = c[4] === 'PIC' ? 'PIC' : FX[c[4]] ? c[4] : ''; GAME.confirmBuy(c[2], c[3], preview(c), `data-room="${slot}" data-id="${id}"`, fxk ? `✨ 특수 소품: ${FXDESC[fxk]}` : ''); } return; }
    if (s.acorn < c[3]) { toast(`도토리가 ${c[3] - s.acorn}개 더 필요해요`); return; }
    s.acorn -= c[3]; s.room.push(id); closeSheet(); GAME.confetti(); toast(`${c[2]}을(를) 샀어요! 방에 놓았어요`);
  }
  s.slot[slot] = id; save(s); render();
});

// 액자에 넣을 사진 고르기 (가족 사진 → 현장 사진첩 → 월별·최초 목격 순, 최근 것부터)
function openPics() {
  const rank = { fam: 0, free: 1, month: 2, first: 3 };
  const L = (S.moments || []).filter(m => m.photo && safeImg(PHOTOS[m.id]) && m.type in rank).sort((a, b) => (rank[a.type] - rank[b.type]) || (a.date < b.date ? 1 : -1)).slice(0, 60);
  const cur = st().pic || '';
  pending = undefined;
  openSheet(`<h3>액자에 넣을 사진</h3><p class="hint" style="margin:-6px 0 10px">첫 화면 방 벽에 걸려요. 엄마·아빠 폰에 똑같이 보여요.</p>
    <button class="rpk-auto${!cur ? ' cur' : ''}" data-roompick="">✨ 자동 (가장 최근 가족 사진)</button>
    <div class="rpks">${L.map(m => `<button class="${cur === m.id ? 'cur' : ''}" data-roompick="${m.id}"><img src="${safeImg(PHOTOS[m.id])}" alt="" loading="lazy"></button>`).join('') || '<p class="vempty">아직 사진이 없어요. 사건 앨범에 사진을 올려 주세요.</p>'}</div>
    <div class="actions"><button class="secondary" data-act="close">닫기</button></div>`);
}

// ---------- 위치 옮기기 (꾸미기 화면의 방 그림에서 끌기) ----------
const drag = { d: null, justMoved: false };
document.addEventListener('pointerdown', e => {
  const svg = e.target.closest('svg.groom-edit'), g = svg && e.target.closest('[data-mv]'); if (!g) return;
  e.preventDefault();
  const r = svg.getBoundingClientRect(), k = VW / r.width, p = (state().pos || {})[g.dataset.mv] || [0, 0];
  let bb = { x: 0, y: 0, width: 0, height: 0 }; try { bb = g.getBBox(); } catch (x) {}
  const p0 = [+p[0] || 0, +p[1] || 0], isP = !!BASE[g.dataset.mv];
  // 사람은 transform이 안쪽에 있어서 getBBox가 이미 옮긴 자리 기준
  const bx = isP ? bb.x - p0[0] : bb.x, by = isP ? bb.y - p0[1] : bb.y;
  drag.d = { g, svg, key: g.dataset.mv, x0: e.clientX, y0: e.clientY, k, p0, p: p0.slice(), bx, by, bw: bb.width, bh: bb.height, moved: false };
  svg.appendChild(g); g.classList.add('rdrag');
  try { svg.setPointerCapture(e.pointerId); } catch (x) {}
});
document.addEventListener('pointermove', e => {
  const d = drag.d; if (!d) return;
  let dx = d.p0[0] + (e.clientX - d.x0) * d.k, dy = d.p0[1] + (e.clientY - d.y0) * d.k;
  // 반쯤은 방 안에 남게
  dx = Math.max(-d.bx - d.bw / 2, Math.min(VW - d.bx - d.bw / 2, dx)); dy = Math.max(-d.by - d.bh / 2, Math.min(VH - d.by - d.bh / 2, dy));
  if (Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) > 4) d.moved = true;
  d.p = [Math.round(dx), Math.round(dy)];
  if (BASE[d.key]) { const inner = d.g.firstElementChild, m = /scale\(([^)]+)\)/.exec(inner.getAttribute('transform')), b = d.key === 'baby' ? (d.svg.querySelector('[data-mv=mom],[data-mv=dad]') ? BASE.baby : BASE.solo) : BASE[d.key];
    inner.setAttribute('transform', `translate(${b[0] + d.p[0]} ${b[1] + d.p[1]}) scale(${m ? m[1] : b[2]})`); }
  else d.g.setAttribute('transform', `translate(${d.p[0]} ${d.p[1]})`);
});
const endDrag = () => {
  const d = drag.d; if (!d) return; drag.d = null; d.g.classList.remove('rdrag');
  if (!d.moved) return;
  drag.justMoved = true; setTimeout(() => { drag.justMoved = false; }, 400);
  const s = state(); s.pos = Object.assign({}, s.pos || {}, { [d.key]: d.p }); save(s); render();
};
document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);

const css = document.createElement('style');
css.textContent = `
.rpks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;max-height:48vh;overflow:auto;margin:8px 0}.rpks button{border:0;padding:0;aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--card2)}.rpks img{width:100%;height:100%;object-fit:cover;display:block}.rpks .cur,.rpk-auto.cur{outline:3px solid var(--red);outline-offset:-3px}
.rpk-auto{width:100%;min-height:44px;border:1.5px dashed var(--line);background:#FFFDF7;border-radius:12px;font-size:14px}
.rfam{display:flex;gap:2px;align-items:center;justify-content:center}.rfam .chr{border-radius:50%;background:#FCEBD3}
.rsp{position:relative}.rsx{position:absolute;right:3px;top:2px;font-style:normal;font-size:12px}
.redit{display:flex;gap:6px;justify-content:flex-end;margin:0 0 6px}.redit button{min-height:36px;font-size:13px;padding:6px 12px}
.groom-edit{touch-action:none;outline:2.5px dashed var(--red);outline-offset:3px;border-radius:14px}.groom-edit [data-mv]{cursor:grab}.groom-edit .rdrag{filter:drop-shadow(0 0 4px rgba(179,38,30,.8));cursor:grabbing}
.rfx{cursor:pointer}.rnotes,.rwave{opacity:0;transition:opacity .3s}.rnotes.on,.rwave.on{opacity:1;animation:rbob 1s ease-in-out infinite}
@keyframes rbob{50%{transform:translateY(-3px)}}
.rtw{animation:rtw .6s ease-in-out infinite alternate}@keyframes rtw{from{opacity:.35}to{opacity:1}}
.rbar{display:flex;justify-content:flex-end;margin:8px 0 0}.rbar .ghost{font-size:12.5px;min-height:34px}
.rgrp .agh{margin:8px 0 4px}.rgrp .rcur{margin-left:8px;font-size:11.5px;color:var(--muted);font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.rshop{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:6px}
.rit{display:flex;flex-direction:column;align-items:center;gap:2px;border:1.5px solid var(--line);background:#FFFDF7;border-radius:12px;padding:6px 3px;font-size:11.5px;min-width:0}
.rit b{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.rit small{font-size:10px;color:var(--muted)}
.rit.cur{border:2px solid var(--red);background:#FFF3EF}.rit.cur small{color:var(--red);font-weight:700}
.rit.lock .rpv,.rit.lock .rsw{opacity:.55;filter:grayscale(.3)}
.rpv{width:100%;height:42px;display:block;background:#FFF7EC;border-radius:8px}
.rsw{display:grid;place-items:center;width:100%;height:42px;border-radius:8px;border:1px solid var(--line);font-style:normal;color:#fff;font-size:18px}
.rpp{display:grid;place-items:center;height:42px;font-size:24px;color:var(--muted)}`;
document.head.appendChild(css);

window.ROOMS = { svg: roomSvg, editor: editorHtml, shop: shopHtml, count };
})();
