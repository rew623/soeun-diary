// 캐릭터 — 소은이(아기 다람쥐 탐정), 엄마 수사관·아빠 수사관 다람쥐
// SVG로 그려서 사진 없이도 어디서든 써요. 탭마다 캐릭터가 나와서 그 탭에서 할 일을 말풍선으로 알려 줘요
// 캐릭터를 누르면 다음 말을 해요 (첫 말은 지금 상황에 맞는 안내)
(function () {
const FUR = { baby: '#E59A5C', mom: '#D9895A', dad: '#B97648' };
const DARK = { baby: '#C77A41', mom: '#B96E40', dad: '#985C34' };
const INK = '#5A3420';

// 손에 드는 소품 (오른손 근처)
const PROPS = {
  lens: '<circle cx="90" cy="80" r="10" fill="#DCE7F1" fill-opacity=".85" stroke="#1F2A44" stroke-width="4"/><path d="M86 77a4 4 0 0 1 4-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M83 88l-9 10" stroke="#8A5A36" stroke-width="5" stroke-linecap="round"/>',
  shield: '<path d="M90 70l12 4v9c0 8-6 13-12 15-6-2-12-7-12-15v-9z" fill="#1F2A44"/><path d="M84 84l4 4 8-9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  spoon: '<path d="M74 104l17-24" stroke="#C9B48E" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="94" cy="75" rx="8" ry="5.5" transform="rotate(-55 94 75)" fill="#F6EBD6" stroke="#C9B48E" stroke-width="2.5"/><ellipse cx="94" cy="75" rx="4.5" ry="3" transform="rotate(-55 94 75)" fill="#F4D58C"/><path d="M100 64q3-4 0-8M106 66q3-4 0-8" stroke="#E0C9A2" stroke-width="2" fill="none" stroke-linecap="round"/>',
  thermo: '<rect x="85" y="66" width="7" height="28" rx="3.5" fill="#fff" stroke="#B3261E" stroke-width="2"/><rect x="87.2" y="76" width="2.6" height="18" fill="#B3261E"/><circle cx="88.5" cy="97" r="5.5" fill="#B3261E"/>',
  camera: '<rect x="73" y="80" width="30" height="21" rx="6" fill="#1F2A44"/><rect x="78" y="76" width="9" height="5" rx="2" fill="#1F2A44"/><circle cx="88" cy="90.5" r="6.5" fill="#DCE7F1" stroke="#FFF8EC" stroke-width="2.5"/><circle cx="98" cy="84" r="1.6" fill="#F6B4AA"/>',
  acorn: '<g transform="translate(4 -9)"><ellipse cx="88" cy="93" rx="8.5" ry="10" fill="#D99A5B"/><path d="M78 88q10-11 20 0z" fill="#7A4B2A"/><path d="M88 78v-5" stroke="#7A4B2A" stroke-width="2.5" stroke-linecap="round"/><path d="M84 93q2 4 5 4" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/></g>',
  note: '<rect x="76" y="72" width="24" height="30" rx="3" fill="#FFFDF7" stroke="#C9B48E" stroke-width="2" transform="rotate(8 88 87)"/><path d="M81 81h14M80 87h14M79 93h9" stroke="#C9B48E" stroke-width="2" stroke-linecap="round" transform="rotate(8 88 87)"/><circle cx="96" cy="97" r="5" fill="none" stroke="#B3261E" stroke-width="2"/>',
  heart: '<path d="M88 100c-9-6-14-11-14-17a6 6 0 0 1 14-3 6 6 0 0 1 14 3c0 6-5 11-14 17z" fill="#F08A8A"/><path d="M80 82a3 3 0 0 1 4-2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>',
  rattle: '<path d="M78 98l12-17" stroke="#F4C542" stroke-width="4" stroke-linecap="round"/><circle cx="94" cy="75" r="8.5" fill="#F49C9C"/><circle cx="91" cy="72" r="1.6" fill="#fff"/><circle cx="97" cy="77" r="1.6" fill="#fff"/><circle cx="93" cy="79" r="1.2" fill="#FCE8B4"/><path d="M89 69a6 6 0 0 1 5-2" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  bottle: '<g transform="rotate(18 90 84)"><path d="M86 68q4-7 8 0z" fill="#F4C542"/><rect x="84.5" y="68" width="11" height="4" rx="1.5" fill="#7FC4E8"/><rect x="85" y="72" width="10" height="24" rx="4" fill="#FFFDF7" stroke="#9DBEE3" stroke-width="1.6"/><rect x="86.5" y="82" width="7" height="12.5" rx="2.5" fill="#FFF3DD"/><path d="M87 77h3M87 81h3" stroke="#9DBEE3" stroke-width="1.2"/></g>',
  balloon: '<path d="M80 96q8-8 2-16t10-16" stroke="#B9A889" stroke-width="1.4" fill="none"/><ellipse cx="94" cy="54" rx="10" ry="12" fill="#F49C9C"/><path d="M92 66l2 3 2-3z" fill="#E07A7A"/><path d="M89 48a5 6 0 0 1 4-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>',
  bouquet: '<circle cx="88" cy="73" r="5" fill="#F49CB8"/><circle cx="97" cy="76" r="5" fill="#FCE8B4"/><circle cx="93" cy="67" r="4.5" fill="#F6B4AA"/><circle cx="88" cy="73" r="1.6" fill="#E59A5C"/><circle cx="97" cy="76" r="1.6" fill="#E59A5C"/><circle cx="93" cy="67" r="1.4" fill="#E59A5C"/><path d="M80 98l7-20 13 5z" fill="#C9E4C5" stroke="#7FB77E" stroke-width="1.2"/><path d="M84 88l8 3" stroke="#F49C9C" stroke-width="2.4" stroke-linecap="round"/>',
  coffee: '<path d="M89 70q-3-4 0-8M95 70q-3-4 0-8" stroke="#C9B48E" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M82 74h16l-2 20q0 3-3 3h-6q-3 0-3-3z" fill="#FFFDF7" stroke="#B97648" stroke-width="1.8"/><ellipse cx="90" cy="75" rx="7.5" ry="2" fill="#8C5530"/><path d="M97 79q6 1 4 7t-6 2" stroke="#B97648" stroke-width="1.8" fill="none"/><rect x="83.5" y="83" width="13" height="4" fill="#F49C9C" opacity=".7"/>',
  gift: '<rect x="78" y="80" width="22" height="19" rx="2" fill="#D9473D"/><rect x="87" y="80" width="4" height="19" fill="#F4C542"/><rect x="78" y="87" width="22" height="4" fill="#F4C542"/><ellipse cx="85" cy="78" rx="4.5" ry="3" fill="#F4C542" transform="rotate(-20 85 78)"/><ellipse cx="93" cy="78" rx="4.5" ry="3" fill="#F4C542" transform="rotate(20 93 78)"/><circle cx="89" cy="79" r="1.8" fill="#C99A1E"/>',
  candy: '<path d="M82 100l9-26q3-8 9-6t3 9" stroke="#FFFDF7" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M82 100l9-26q3-8 9-6t3 9" stroke="#D9473D" stroke-width="5.5" fill="none" stroke-linecap="butt" stroke-dasharray="3.2 3.2"/>',
  bell: '<path d="M90 70q-9 2-9 15l-3 5h24l-3-5q0-13-9-15z" fill="#F4C542" stroke="#C99A1E" stroke-width="1.4"/><circle cx="90" cy="92" r="2.4" fill="#C99A1E"/><path d="M85 69l5 2 5-2" stroke="#D9473D" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M85 78a5 5 0 0 1 3-4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  wrench: '<path d="M79 98l14-17" stroke="#8C99A6" stroke-width="5" stroke-linecap="round"/><circle cx="96" cy="77" r="7" fill="#9AA5B1"/><circle cx="99" cy="74" r="3.2" fill="#FFF8EC"/><path d="M80 97l5-6" stroke="#B3261E" stroke-width="5" stroke-linecap="round"/>'
};

// 소은 탐정 모자 (도토리로 바꿔 쓰기, GAME.skin())
const HATS = {
  crown: '<path d="M32 37l4-17 9 9 9-13 9 13 9-9 4 17z" fill="#F4C542" stroke="#C99A1E" stroke-width="1.5" stroke-linejoin="round"/><circle cx="54" cy="18" r="2.6" fill="#B3261E"/><circle cx="40" cy="28" r="2" fill="#3C8DDB"/><circle cx="68" cy="28" r="2" fill="#3C8DDB"/>',
  flower: [[31, 38, '#F49C9C'], [39, 31, '#FCE8B4'], [47, 28, '#F6B4AA'], [55, 27, '#FCE8B4'], [63, 28, '#F49C9C'], [71, 31, '#FCE8B4'], [79, 38, '#F6B4AA']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}" stroke="#fff" stroke-width="1"/><circle cx="${x}" cy="${y}" r="1.6" fill="#E59A5C"/>`).join('') + '<path d="M35 34l-3-4M59 27l3-4" stroke="#7FB77E" stroke-width="2" stroke-linecap="round"/>',
  santa: '<path d="M28 38q26-36 52 0z" fill="#D9473D"/><path d="M74 30q16-8 13 12" stroke="#D9473D" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="87" cy="45" r="5" fill="#fff"/><rect x="25" y="34" width="58" height="8" rx="4" fill="#fff"/>',
  party: '<path d="M43 35l13-30 13 30z" fill="#7FC4E8"/><path d="M47 27h18M51 18h10" stroke="#FCE8B4" stroke-width="3.2"/><circle cx="56" cy="5" r="3.8" fill="#F49C9C"/>',
  bok: '<path d="M29 39q25-28 50 0z" fill="#2B2B3A"/><path d="M31 37q23 8 46 0" stroke="#E0B341" stroke-width="2.6" fill="none"/><circle cx="54" cy="17" r="3.2" fill="#D9473D"/><path d="M54 20v9M50 21l-6 10M58 21l6 10" stroke="#D9473D" stroke-width="1.8" stroke-linecap="round"/><circle cx="36" cy="38" r="2.6" fill="#E0B341"/><circle cx="72" cy="38" r="2.6" fill="#E0B341"/>',
  det: '<path d="M27 40q27-30 54 0z" fill="#D4B27A"/><path d="M36 30l36 0M31 36h46M44 22v16M54 18v20M64 22v16" stroke="#B08A50" stroke-width="1.6" opacity=".8"/><path d="M30 39q24 8 48 0l2 4q-26 9-52 0z" fill="#A9844C"/><circle cx="54" cy="16" r="3.5" fill="#B3261E"/>',
  beanie: '<path d="M28 40q26-36 52 0z" fill="#7FC4E8"/><path d="M40 22v14M48 18v18M56 17v19M64 19v17" stroke="#6AB3DA" stroke-width="2"/><rect x="25" y="34" width="58" height="9" rx="4.5" fill="#5BA8D1"/><circle cx="54" cy="10" r="6" fill="#FFFDF7"/>',
  cap: '<path d="M30 39q24-32 48 0z" fill="#B3261E"/><path d="M62 37q18-3 27 4q-13 3-27-1z" fill="#8E1E17"/><circle cx="54" cy="14" r="2.6" fill="#8E1E17"/><path d="M54 15v22" stroke="#8E1E17" stroke-width="1.2" opacity=".6"/><text x="46" y="33" font-size="10" font-weight="700" font-family="sans-serif" fill="#fff">S</text>',
  straw: '<ellipse cx="54" cy="37" rx="37" ry="7" fill="#E8C77A"/><path d="M38 37q0-22 16-22t16 22z" fill="#F0D48E"/><rect x="38" y="29" width="32" height="5" fill="#F49C9C"/><path d="M24 37q30 6 60 0" stroke="#D4B062" stroke-width="1.2" fill="none"/>',
  bunny: '<g transform="rotate(-14 42 24)"><ellipse cx="42" cy="13" rx="6.5" ry="16" fill="#FFFDF7" stroke="#F0D0D8"/><ellipse cx="42" cy="14" rx="3" ry="11" fill="#F6B4AA"/></g><g transform="rotate(14 66 24)"><ellipse cx="66" cy="13" rx="6.5" ry="16" fill="#FFFDF7" stroke="#F0D0D8"/><ellipse cx="66" cy="14" rx="3" ry="11" fill="#F6B4AA"/></g><path d="M27 38q27-24 54 0" stroke="#F49CB8" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
  bear: '<path d="M27 39q27-26 54 0" stroke="#8C5530" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="33" cy="24" r="8" fill="#B98A5E"/><circle cx="33" cy="24" r="4" fill="#F6B4AA"/><circle cx="75" cy="24" r="8" fill="#B98A5E"/><circle cx="75" cy="24" r="4" fill="#F6B4AA"/>',
  beret: '<ellipse cx="50" cy="31" rx="27" ry="9" fill="#B3261E" transform="rotate(-10 50 31)"/><path d="M27 36q24 6 50-4" stroke="#8E1E17" stroke-width="2" fill="none"/><circle cx="54" cy="21" r="2.6" fill="#8E1E17"/>',
  tiara: '<path d="M34 37l4-12 6 7 10-14 10 14 6-7 4 12z" fill="#F4E08A" stroke="#C99A1E" stroke-width="1.5" stroke-linejoin="round"/><circle cx="54" cy="27" r="3" fill="#F49CB8"/><circle cx="41" cy="32" r="1.8" fill="#7FC4E8"/><circle cx="67" cy="32" r="1.8" fill="#7FC4E8"/>',
  antler: '<path d="M27 38q27-24 54 0" stroke="#8C5530" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M36 30l-6-16M33 22l-7-3M32 17l2-7M72 30l6-16M75 22l7-3M76 17l-2-7" stroke="#A0703F" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="46" cy="31" r="2.4" fill="#3E8E5A"/><circle cx="49" cy="29.5" r="1.8" fill="#D9473D"/>',
  elfhat: '<path d="M30 39Q54 31 78 39L64 15Q58 5 44 3Q52 11 50 19Z" fill="#3E8E5A"/><path d="M28 37q26-8 52 0v5q-26-8-52 0z" fill="#F4C542"/><circle cx="44" cy="3.5" r="3.4" fill="#F4C542" stroke="#C99A1E"/>',
  chef: '<ellipse cx="45" cy="20" rx="10" ry="9" fill="#fff" stroke="#E0C9A2"/><ellipse cx="63" cy="20" rx="10" ry="9" fill="#fff" stroke="#E0C9A2"/><ellipse cx="54" cy="15" rx="11" ry="9" fill="#fff" stroke="#E0C9A2"/><rect x="38" y="24" width="32" height="13" rx="3" fill="#fff" stroke="#E0C9A2"/>'
};
// 옷 (도토리로 사서 소은·엄마·아빠 따로 입히기, GAME.wear(who)) — 몸통 타원 안에 맞춰 그림(clip), 밖으로 나오는 건 out
const CLIP = 'clip-path="url(#chbd)"';
const star = (x, y, r, c) => `<path d="M${x} ${y - r}l${r * .29} ${r * .6} ${r * .66} .1-${r * .48} ${r * .45} ${r * .12} ${r * .66}-${r * .59}-${r * .32}-${r * .59} ${r * .32} ${r * .12}-${r * .66}-${r * .48}-${r * .45} ${r * .66}-.1z" fill="${c}"/>`;
const OUTFITS = {
  stripe: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#FFFDF7"/>${[84, 92, 100, 108].map(y => `<rect x="28" y="${y}" width="52" height="4" fill="#7FC4E8"/>`).join('')}</g>`,
  overall: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#FCE8B4"/><rect x="28" y="97" width="52" height="20" fill="#5B7FB5"/><rect x="43" y="90" width="22" height="10" rx="2" fill="#5B7FB5"/><path d="M42 76l3 16M66 76l-3 16" stroke="#5B7FB5" stroke-width="4"/><circle cx="45" cy="92" r="1.8" fill="#F4C542"/><circle cx="63" cy="92" r="1.8" fill="#F4C542"/><path d="M49 104h10" stroke="#46679A" stroke-width="1.5"/></g>`,
  hanbok: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#7FB77E"/><rect x="28" y="74" width="52" height="25" fill="#F49C9C"/><path d="M42 78l12 14 12-14" stroke="#fff" stroke-width="3.2" fill="none"/>${['#F4C542', '#7FC4E8', '#F6B4AA', '#B3D98F'].map((c, i) => `<rect x="${28 + i * 3}" y="84" width="3" height="16" fill="${c}"/><rect x="${68 + i * 3}" y="84" width="3" height="16" fill="${c}"/>`).join('')}</g><path d="M56 92q6 2 8 12M56 92q2 4 1 13" stroke="#B3261E" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="56" cy="92" r="2.4" fill="#B3261E"/>`,
  rain: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#F4C542"/><path d="M54 84v32" stroke="#E0AE1F" stroke-width="1.5"/><path d="M40 104h8M60 104h8" stroke="#E0AE1F" stroke-width="2" stroke-linecap="round"/></g>${[90, 99, 108].map(y => `<circle cx="57" cy="${y}" r="1.9" fill="#2B2622"/>`).join('')}`,
  sailor: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#FFFDF7"/><path d="M34 78l20 18 20-18v8l-20 17-20-17z" fill="#1F2A44"/><path d="M37 84l17 15 17-15" stroke="#fff" stroke-width="1.4" fill="none"/></g><path d="M54 98l-7-4v8zM54 98l7-4v8z" fill="#B3261E"/><circle cx="54" cy="98" r="2" fill="#D9473D"/>`,
  dino: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#8FCB7A"/><ellipse cx="54" cy="101" rx="13" ry="13" fill="#D6EFB8"/><path d="M46 96h16M45 102h18M47 108h14" stroke="#B5DC92" stroke-width="1.6"/><circle cx="36" cy="92" r="3" fill="#6FAE5E"/><circle cx="72" cy="96" r="2.6" fill="#6FAE5E"/><circle cx="35" cy="103" r="2" fill="#6FAE5E"/></g>`,
  pajama: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#BFD8F2"/>${star(40, 92, 4, '#FCE8B4')}${star(66, 100, 4, '#FCE8B4')}${star(46, 108, 3, '#fff')}${star(70, 88, 2.6, '#fff')}<path d="M54 84v32" stroke="#9DBEE3" stroke-width="1.4" stroke-dasharray="2 2"/></g>`,
  hoodie: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#B98A5E"/><rect x="42" y="100" width="24" height="14" rx="5" fill="#A47650"/><path d="M42 106h24" stroke="#93683F" stroke-width="1"/></g><path d="M50 84v10M58 84v10" stroke="#FFFDF7" stroke-width="1.8" stroke-linecap="round"/><circle cx="50" cy="95" r="1.6" fill="#FFFDF7"/><circle cx="58" cy="95" r="1.6" fill="#FFFDF7"/>`,
  tutu: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#F6C9D6"/></g><ellipse cx="54" cy="104" rx="30" ry="7" fill="#F49CB8" opacity=".92"/>${[30, 38, 46, 54, 62, 70, 78].map(x => `<circle cx="${x}" cy="108" r="4" fill="#F7B3C8"/>`).join('')}${star(54, 92, 3.4, '#fff')}`,
  suit: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#2E3B5C"/><path d="M45 78l9 20 9-20z" fill="#fff"/><path d="M45 78l9 20-5 4-8-20zM63 78l-9 20 5 4 8-20z" fill="#24304D"/></g><path d="M54 86l-2.5 3 2.5 12 2.5-12z" fill="#B3261E"/><circle cx="54" cy="105" r="1.5" fill="#E0C9A2"/><circle cx="54" cy="110" r="1.5" fill="#E0C9A2"/>`,
  trench: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#D4B27A"/><path d="M36 80l18 16 18-16-3-6-15 13-15-13z" fill="#C09A5E"/><rect x="28" y="101" width="52" height="5" fill="#A9844C"/><rect x="51" y="100" width="6" height="7" rx="1" fill="none" stroke="#F4C542" stroke-width="1.6"/></g><circle cx="48" cy="96" r="1.6" fill="#7A5A30"/><circle cx="60" cy="96" r="1.6" fill="#7A5A30"/>`,
  apron: `<path d="M44 84l-4-8M64 84l4-8" stroke="#F49C9C" stroke-width="2.2"/><g ${CLIP}><rect x="41" y="84" width="26" height="34" rx="6" fill="#FFFDF7" stroke="#F49C9C" stroke-width="2"/><path d="M28 98h13M67 98h13" stroke="#F49C9C" stroke-width="2.4"/></g><path d="M54 104c-4-4-7 0-3.5 3L54 110l3.5-3c3.5-3 .5-7-3.5-3z" fill="#F49C9C"/>`,
  knit: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#F3E3C3"/>${[40, 54, 68].map(x => `<path d="M${x} 82q-4 4 0 8t0 8 0 8 0 8" stroke="#E0C9A2" stroke-width="3" fill="none"/><path d="M${x} 82q4 4 0 8t0 8 0 8 0 8" stroke="#E7D3AF" stroke-width="3" fill="none"/>`).join('')}<rect x="28" y="110" width="52" height="6" fill="#E7D3AF"/></g>`,
  santa: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#D9473D"/><rect x="50" y="80" width="8" height="40" fill="#fff"/><rect x="28" y="101" width="52" height="5" fill="#2B2622"/><rect x="50" y="100" width="8" height="7" rx="1" fill="#F4C542"/><rect x="28" y="111" width="52" height="5" fill="#fff"/></g>`,
  soccer: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#B3261E"/><path d="M45 79l9 9 9-9" stroke="#fff" stroke-width="2.6" fill="none"/><path d="M28 86h8M72 86h8" stroke="#fff" stroke-width="3"/></g><text x="54" y="109" text-anchor="middle" font-size="15" font-weight="700" font-family="sans-serif" fill="#fff">7</text>`,
  dress: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#FCE1E4"/>${[[38, 92, '#F49C9C'], [62, 90, '#FCE8B4'], [48, 104, '#FCE8B4'], [70, 106, '#F49C9C'], [56, 96, '#F6B4AA'], [36, 108, '#F6B4AA']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${c}"/><circle cx="${x}" cy="${y}" r="1" fill="#fff"/>`).join('')}<rect x="28" y="96" width="52" height="3" fill="#F49C9C"/></g>`,
  bee: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#F4C542"/>${[90, 100, 110].map(y => `<rect x="28" y="${y}" width="52" height="5" fill="#2B2622"/>`).join('')}</g><ellipse cx="30" cy="84" rx="7" ry="5" fill="#fff" opacity=".85" stroke="#D8E8F2"/><ellipse cx="78" cy="84" rx="7" ry="5" fill="#fff" opacity=".85" stroke="#D8E8F2"/>`,
  tiger: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#F0A04B"/><ellipse cx="54" cy="102" rx="12" ry="12" fill="#FCEBD3"/>${[[32, 88], [32, 100], [74, 90], [74, 102]].map(([x, y]) => `<path d="M${x - 4} ${y}q4-2 8 0" stroke="#2B2622" stroke-width="2.6" fill="none"/>`).join('')}<path d="M50 84l4 4 4-4" stroke="#2B2622" stroke-width="2.2" fill="none"/></g>`,
  hanbokB: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#5B7FB5"/><rect x="28" y="74" width="52" height="24" fill="#7FC4E8"/><path d="M42 78l12 14 12-14" stroke="#fff" stroke-width="3.2" fill="none"/><rect x="28" y="97" width="52" height="3" fill="#F4C542"/></g><path d="M56 92q6 2 8 12M56 92q2 4 1 13" stroke="#1F2A44" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="56" cy="92" r="2.4" fill="#1F2A44"/>`,
  rudolph: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#A0703F"/><ellipse cx="54" cy="102" rx="13" ry="12" fill="#E8C9A0"/></g><path d="M42 86q12 7 24 0" stroke="#B3261E" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="54" cy="91" r="3.4" fill="#F4C542" stroke="#C99A1E"/><path d="M52.5 92h3" stroke="#C99A1E" stroke-width="1"/>`,
  elf: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#3E8E5A"/><path d="M28 106l6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6v18H28z" fill="#F4C542"/><rect x="28" y="95" width="52" height="4" fill="#2B2622"/><rect x="51" y="94" width="6" height="6" rx="1" fill="none" stroke="#F4C542" stroke-width="1.5"/></g><path d="M43 81l11 8 11-8" stroke="#D9473D" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  santaDress: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#D9473D"/><rect x="51" y="80" width="6" height="18" fill="#fff"/></g><path d="M33 99q21 5 42 0l9 13q-30 9-60 0z" fill="#D9473D"/><path d="M24 112q30 9 60 0" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="54" cy="85" r="1.8" fill="#D9473D"/><circle cx="54" cy="92" r="1.8" fill="#D9473D"/>`,
  cardigan: `<g ${CLIP}><rect x="28" y="74" width="52" height="42" fill="#FFFDF7"/><rect x="28" y="74" width="20" height="42" fill="#C9A7D9"/><rect x="60" y="74" width="20" height="42" fill="#C9A7D9"/><rect x="28" y="110" width="52" height="6" fill="#B691C9"/></g>${[90, 98, 106].map(y => `<circle cx="49" cy="${y}" r="1.7" fill="#fff" stroke="#B691C9"/>`).join('')}`
};
// who: baby | mom | dad, prop: PROPS 이름, face: 얼굴만(동그란 사진 칸용), outfit: 옷 id(없으면 GAME.wear)
function svg(who = 'baby', prop = '', o = {}) {
  const f = FUR[who] || FUR.baby, d = DARK[who] || DARK.baby, size = o.size || 72;
  const vb = o.face ? '16 12 76 76' : '0 0 120 120';
  const wear = o.face ? '' : o.outfit != null ? o.outfit : (window.GAME && GAME.wear ? GAME.wear(who) : '');
  const tail = o.face ? '' : `<path d="M70 100c34 0 44-32 30-52-9-13-27-10-25 5" fill="none" stroke="${d}" stroke-width="24" stroke-linecap="round"/><path d="M72 99c26-2 34-28 24-44-6-9-17-7-17 2" fill="none" stroke="#F0B67E" stroke-width="9" stroke-linecap="round" opacity=".75"/>`;
  const body = o.face ? '' : `<ellipse cx="54" cy="95" rx="24" ry="20" fill="${f}"/><ellipse cx="54" cy="99" rx="14" ry="13" fill="#FCEBD3"/>
    <ellipse cx="43" cy="114" rx="8" ry="4.5" fill="${d}"/><ellipse cx="65" cy="114" rx="8" ry="4.5" fill="${d}"/>
    ${wear && OUTFITS[wear] ? `<clipPath id="chbd"><ellipse cx="54" cy="95" rx="24" ry="20"/></clipPath>${OUTFITS[wear]}` : `${who === 'mom' ? `<path d="M36 80l18 14 18-14-3-5-15 11-15-11z" fill="#EAD7B4"/>` : ''}${who === 'dad' ? `<path d="M36 80l18 14 18-14-3-5-15 11-15-11z" fill="#C9B48E"/><path d="M51 88l3 8 3-8z" fill="#B3261E"/>` : ''}
    ${who === 'baby' ? `<path d="M46 80q8 5 16 0" stroke="#F6B4AA" stroke-width="4" fill="none" stroke-linecap="round"/>` : ''}`}
    <ellipse cx="38" cy="92" rx="6" ry="8" fill="${d}" transform="rotate(20 38 92)"/>
    ${prop && PROPS[prop] ? PROPS[prop] : ''}
    <ellipse cx="74" cy="90" rx="6" ry="8" fill="${d}" transform="rotate(-25 74 90)"/>`;
  const ears = `<path d="M30 42l-3-24 18 14z" fill="${f}"/><path d="M32 38l-2-13 10 8z" fill="#F6B4AA"/><path d="M27 19l-3-6M27 18l2-6" stroke="${d}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M78 42l3-24-18 14z" fill="${f}"/><path d="M76 38l2-13-10 8z" fill="#F6B4AA"/><path d="M81 19l3-6M81 18l-2-6" stroke="${d}" stroke-width="2.5" stroke-linecap="round"/>`;
  const head = `<ellipse cx="54" cy="56" rx="31" ry="28" fill="${f}"/><ellipse cx="54" cy="67" rx="17" ry="12" fill="#FCEBD3"/>`;
  const eye = (x) => who === 'dad' && o.wink !== false
    ? `<ellipse cx="${x}" cy="55" rx="4.5" ry="5.5" fill="#2B2622"/><circle cx="${x + 1.5}" cy="53" r="1.6" fill="#fff"/>`
    : `<ellipse cx="${x}" cy="55" rx="5" ry="6" fill="#2B2622"/><circle cx="${x + 1.6}" cy="52.6" r="2" fill="#fff"/><circle cx="${x - 1.6}" cy="57.5" r=".9" fill="#fff"/>`;
  const lash = who === 'mom' ? `<path d="M35 51l-3-2M37 49l-2-3M73 51l3-2M71 49l2-3" stroke="#2B2622" stroke-width="1.6" stroke-linecap="round"/>` : '';
  const face = `${eye(42)}${eye(66)}${lash}
    <ellipse cx="33" cy="65" rx="6" ry="4" fill="#F49C9C" opacity=".7"/><ellipse cx="75" cy="65" rx="6" ry="4" fill="#F49C9C" opacity=".7"/>
    <ellipse cx="54" cy="62.5" rx="3.4" ry="2.5" fill="${INK}"/>
    <path d="M49 66.5q2.5 3 5 0q2.5 3 5 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${who === 'baby' ? `<rect x="51.6" y="68" width="4.8" height="4" rx="1.2" fill="#fff" stroke="${INK}" stroke-width=".9"/>` : ''}`;
  // 모자·장식
  let hat = '';
  // 소은: 산 모자(명절·생일엔 저절로) / 엄마·아빠: GAME.hatOf(who)로 고른 모자, 없으면 원래 리본·중절모
  const skin = who === 'baby' ? (o.hat || (window.GAME && GAME.skin ? GAME.skin() : 'det')) : (o.hat != null ? o.hat : (window.GAME && GAME.hatOf ? GAME.hatOf(who) : ''));
  if (skin && HATS[skin]) hat = HATS[skin];
  else if (who === 'baby') hat = HATS.det;
  else if (who === 'mom') hat = `<path d="M24 30l-10-7v14zM24 30l10-7v14z" fill="#B3261E"/><circle cx="24" cy="30" r="3.2" fill="#D9473D"/>`;
  else if (who === 'dad') hat = `<ellipse cx="54" cy="36" rx="32" ry="6.5" fill="#1F2A44"/><path d="M37 36q0-21 17-21t17 21z" fill="#1F2A44"/><path d="M37.5 30h33v5h-33z" fill="#B3261E"/><path d="M48 18q6 4 12 0" stroke="#2E3B5C" stroke-width="2" fill="none"/>`;
  const glasses = who === 'dad' ? `<circle cx="42" cy="55" r="8.5" fill="none" stroke="#1F2A44" stroke-width="2.4"/><circle cx="66" cy="55" r="8.5" fill="none" stroke="#1F2A44" stroke-width="2.4"/><path d="M50.5 55h7" stroke="#1F2A44" stroke-width="2.4"/>` : '';
  const bandage = prop === 'thermo' || prop === 'shield' ? `<g transform="rotate(-22 70 38)"><rect x="61" y="35" width="18" height="7" rx="3.5" fill="#F6C9A8"/><rect x="67" y="35" width="6" height="7" fill="#EDB48D"/></g>` : '';
  return `<svg class="chr" width="${size}" height="${size}" viewBox="${vb}" aria-hidden="true">${tail}${body}${ears}${head}${face}${glasses}${hat}${bandage}</svg>`;
}

// ---------- 탭별 안내 ----------
const short = () => { const n = (S.profile && S.profile.name) || '우리 아기'; return /^[가-힣]{3}$/.test(n) ? n.slice(1) : n; };
const WHO = { b: ['baby', () => `${short()} 탐정`], m: ['mom', () => '엄마 수사관'], d: ['dad', () => '아빠 수사관'] };
// [말하는 사람, 소품, 말]
// 받침 있는 이름은 '소은이'처럼 불러요 (소은이는, 소은이가)
const nick = () => { const n = short(), c = n.charCodeAt(n.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? n + '이' : n; };
function lines(tab) {
  const n = nick(), L = [];
  if (tab === 'grow') {
    const d = daysBetween(S.profile.birth, today()) + 1, last = S.records.map(r => r.date).sort().pop();
    const gap = last ? daysBetween(last, today()) : null;
    if (gap != null && gap >= 14) L.push(['b', 'lens', `마지막 측정이 ${gap}일 전이에요. 오늘 몸무게 한 번 재 볼까요? 오른쪽 아래 '+ 새 증거 기록'!`]);
    L.push(['b', 'lens', `수사 ${d}일째! 몸무게·키를 재면 '+ 새 증거 기록'을 눌러 주세요. 그래프에 빨간 점으로 찍어 둘게요.`]);
    L.push(['m', 'heart', `${n}는 오늘도 쑥쑥 자라는 중이에요. 기록을 누르면 고칠 수 있고, 사진을 누르면 크게 볼 수 있어요.`]);
    L.push(['d', 'lens', `숫자 칸(몸무게·키·머리둘레)을 누르면 그래프가 바뀌어요. 백분위는 참고만 하기!`]);
  } else if (tab === 'vac') {
    const np = nextPeriod();
    if (np) L.push(['b', 'shield', `다음 출동은 ${np.name} 접종, ${ddayText(pDate(np))}! 병원을 예약하면 '예약일 입력'으로 날짜를 맞춰 주세요.`]);
    L.push(['b', 'shield', `주사 맞고 오면 '사건 해결 처리'로 도장 꽝! 저 씩씩했죠?`]);
    L.push(['d', 'note', `맨 위 '영유아검진' 칸에서 건강검진·구강검진 일정도 같이 챙겨요.`]);
    L.push(['m', 'heart', `접종한 날은 열이 날 수 있어요. 긴급 출동 탭에 체온을 남겨 두면 안심이에요.`]);
  } else if (tab === 'food') {
    L.push(['b', 'spoon', `새 식재료는 3일 동안 심문해요. 이상 없으면 '무혐의'로 통과!`]);
    L.push(['b', 'acorn', `도토리는 아직 이르대요… 대신 쌀미음부터 냠냠!`]);
    L.push(['m', 'spoon', `먹은 양(완식·잘먹음·절반·거부)을 남기면 ${n}가 좋아하는 음식을 알 수 있어요.`]);
    L.push(['d', 'note', `센터 식단표는 PDF·사진·엑셀 다 올릴 수 있어요. 맨 아래 '센터 식단'에서!`]);
  } else if (tab === 'sick') {
    const ep = typeof activeEp === 'function' && activeEp();
    if (ep) L.push(['b', 'thermo', `지금 사건 수사 중이에요. 체온·약 먹은 시간을 바로 남기면 교대할 때 헷갈리지 않아요.`]);
    else L.push(['b', 'thermo', `오늘은 건강 이상 없음! 아플 땐 '+ 체온'만 눌러도 사건 파일이 열려요.`]);
    L.push(['d', 'lens', `밤이나 휴일엔 맨 위 '응급실·야간 진료 병원'을 눌러요. 지금 문 연 곳부터 보여 줘요.`]);
    L.push(['m', 'heart', `진료 기록에 의사 선생님께 물어볼 것을 적어 가면 깜빡하지 않아요.`]);
  } else if (tab === 'town') {
    L.push(['b', 'acorn', `산책 지수가 높은 시간에 나가요! 막대를 보면 몇 시가 좋은지 한눈에 보여요.`]);
    L.push(['d', 'lens', `특보나 미세먼지 경보가 내려지면 빨간 표시가 떠요. 그날은 집에서 수사해요.`]);
    L.push(['m', 'heart', `주말엔 아래 행사 목록에서 ${n}랑 갈 만한 곳을 찾아봐요. 지역은 맨 위에서 바꿔요.`]);
  } else if (tab === 'album') {
    L.push(['b', 'camera', `찰칵! 여러 장 한 번에 올리면 찍은 날짜별로 정리해 드려요. 올리다 나가도 이어서 올려요.`]);
    L.push(['b', 'camera', `100일 보고서 사진은 미리 올려 둬도 돼요. '보고서 사진 미리 올리기'를 눌러요.`]);
    L.push(['m', 'heart', `마음에 드는 사진은 크게 보고 '보드에 붙이기'! 수사 보드에 꽂혀요.`]);
    L.push(['d', 'note', `첫 미소, 첫 뒤집기… 처음 본 순간은 '최초 목격 기록'으로 남겨요.`]);
  }
  return L;
}
const seen = {};
const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
function guide(tab) {
  const L = lines(tab); if (!L.length) return '';
  if (seen[tab] == null) seen[tab] = 0;
  const i = seen[tab] % L.length, [w, prop, text] = L[i], [who, name] = WHO[w];
  // 성장 수사(첫 화면)는 소은 탐정의 방 (도토리 놀이터 > 꾸미기에서 도토리로 산 가구·벽지가 보여요)
  if (tab === 'grow' && window.GAME && GAME.roomSvg) return `<div class="guide ghome g-${who}" aria-live="polite"><button class="gchar groomb" data-guide="${tab}" aria-label="다음 말 듣기">${GAME.roomSvg()}</button><button class="ghedit" data-game="shop">🛋️ 방 꾸미기</button>
    <div class="gbub"><b>${esc(name())}</b><p>${esc(text)}</p><small>${L.length > 1 ? `${i + 1}/${L.length} · 방을 누르면 다음 말` : ''}</small></div></div>`;
  return `<div class="guide g-${who}" aria-live="polite"><button class="gchar" data-guide="${tab}" aria-label="다음 말 듣기">${svg(who, prop, { size: 84 })}</button>
    <div class="gbub"><b>${esc(name())}</b><p>${esc(text)}</p><small>${L.length > 1 ? `${i + 1}/${L.length} · 저를 누르면 다음 말` : ''}</small></div></div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-guide]'); if (!b || e.target.closest('[data-rfx],[data-roompic]') || b.closest('.groom-edit')) return;
  const tab = b.dataset.guide; seen[tab] = (seen[tab] || 0) + 1;
  const old = b.closest('.guide'), t = document.createElement('div'); t.innerHTML = guide(tab);
  const nu = t.firstElementChild; old.replaceWith(nu); nu.classList.add('hop');
});

const css = document.createElement('style');
css.textContent = `
.chr{display:block;overflow:visible}
.guide{display:flex;align-items:flex-end;gap:6px;margin:14px 0 4px}
.gchar{flex-shrink:0;border:0;background:none;padding:0;margin-bottom:-4px;filter:drop-shadow(0 3px 0 rgba(150,110,60,.18))}
.gbub{position:relative;flex:1;min-width:0;background:#FFFDF7;border:1.5px solid var(--line);border-radius:20px 20px 20px 6px;padding:10px 14px 8px;box-shadow:0 3px 0 #E6D2AE;margin-bottom:12px}
.gbub::before{content:"";position:absolute;left:-9px;bottom:10px;width:14px;height:14px;background:#FFFDF7;border-left:1.5px solid var(--line);border-bottom:1.5px solid var(--line);transform:rotate(45deg) skew(10deg,10deg);border-radius:0 0 0 4px}
.gbub b{font-family:var(--display);font-weight:400;font-size:14px;color:var(--red)}
.g-mom .gbub b{color:#C25A7A}.g-dad .gbub b{color:var(--navy)}
.gbub p{margin:2px 0 2px;font-size:14px;line-height:1.55;word-break:keep-all}
.gbub small{font-size:11px;color:var(--muted)}
.guide.hop .gchar{animation:ghop .45s cubic-bezier(.3,1.6,.5,1)}
.guide.hop .gbub{animation:gpop .3s ease-out}
@keyframes ghop{0%{transform:translateY(0)}40%{transform:translateY(-10px) rotate(-6deg)}100%{transform:none}}
@keyframes gpop{0%{opacity:.3;transform:scale(.96)}100%{opacity:1;transform:none}}
.gchar .chr{animation:gbob 3.2s ease-in-out infinite;transform-origin:50% 100%}
.ghome{position:relative;flex-direction:column;align-items:stretch;gap:0}
.ghome .gchar{width:100%;margin:0;filter:none}
.ghome .groom{border-radius:20px;border:1.5px solid var(--line);box-shadow:0 4px 0 #E6D2AE}
.ghome .gbub{margin:12px 0 0;border-radius:20px}
.ghome .gbub::before{left:50%;top:-9px;bottom:auto;margin-left:-7px;border:0;border-left:1.5px solid var(--line);border-top:1.5px solid var(--line);transform:rotate(45deg);border-radius:4px 0 0 0}
.ghedit{position:absolute;left:8px;top:4px;border:0;border-radius:99px;background:rgba(255,253,247,.92);font-size:12px;padding:3px 9px;box-shadow:0 2px 4px rgba(0,0,0,.12)}
.guide.ghome.hop .gchar{animation:none}
@keyframes gbob{0%,100%{transform:none}50%{transform:translateY(-2px) rotate(1.5deg)}}
@media (prefers-reduced-motion:reduce){.gchar .chr,.guide.hop .gchar,.guide.hop .gbub{animation:none}}
.idb .ph.chrph{background:#FCEBD3;border-color:var(--line);overflow:hidden;padding:0}
.idb .ph.chrph .chr{width:100%;height:100%}
.loading .chr{margin:0 auto 10px;animation:gbob 1.4s ease-in-out infinite}`;
document.head.appendChild(css);

window.CHARS = { svg, guide };
})();
