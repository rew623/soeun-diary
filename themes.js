// 테마 그림 (설정 → 🎨 테마): 컨셉마다 직접 그린 캐릭터·소품을 바탕에 여러 모양으로 흩어 그려요 — 2026.10.13 사용자 요청
// 색 변수는 themes.css, 그림(바탕 무늬·맨 위 띠·제목 밑줄)은 여기서 SVG로 만들어 <style id="themeart">에 넣어요 (지금 테마 것만)
// 공식 그림이 아니라 '컨셉'으로 직접 그린 그림 + 우리 다람쥐 식구(CHARS)가 컨셉 옷을 입은 모습
(function () {
const LIST = [   // [id, 이름, 상태 표시줄 색]
  ['det', '탐정 수첩', '#1F2A44'], ['conan', '명탐정 코난', '#2B4A7E'], ['sanrio', '산리오 친구들', '#7A4C86'], ['kitty', '헬로키티', '#9E3A52'],
  ['purin', '폼폼푸린', '#6E4A26'], ['cinna', '시나모롤', '#46709F'], ['disney', '디즈니', '#2E3170']];
const K = '#4A3A3A';   // 그림 선 색 (진갈색, 새까맣지 않게)
const g = (x, y, r, s, body) => `<g transform="translate(${x} ${y})${r ? ` rotate(${r})` : ''}${s && s !== 1 ? ` scale(${s})` : ''}">${body}</g>`;
const ln = (w = 2) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- 작은 소품 ----------
const star = (r, c, sw) => { let d = ''; for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * .46 : r; d += (i ? 'L' : 'M') + (Math.cos(a) * rr).toFixed(1) + ' ' + (Math.sin(a) * rr).toFixed(1); } return `<path d="${d}z" fill="${c}"${sw ? ` ${ln(sw)}` : ''}/>`; };
const heart = (s, c, sw) => `<path transform="scale(${s})" d="M0 7C-8 1.5-10-3.5-7-6.6c2.3-2.4 5.6-2 7 .9 1.4-2.9 4.7-3.3 7-.9 3 3.1 1 8.1-7 13.6z" fill="${c}"${sw ? ` ${ln(sw)}` : ''}/>`;
const sparkle = (s, c) => `<path transform="scale(${s})" d="M0-8C1-2 2-1 8 0 2 1 1 2 0 8-1 2-2 1-8 0-2-1-1-2 0-8z" fill="${c}"/>`;
const bow = (s, c, c2, dots) => `<g transform="scale(${s})"><path d="M0 0C-4-8-16-10-16-1S-4 7 0 0zM0 0C4-8 16-10 16-1S4 7 0 0z" fill="${c}" ${ln(1.5)}/>${dots ? '<g fill="#fff"><circle cx="-9" cy="-3" r="1.6"/><circle cx="-6" cy="3" r="1.3"/><circle cx="9" cy="-3" r="1.6"/><circle cx="6" cy="3" r="1.3"/></g>' : ''}<ellipse rx="3.8" ry="4.4" fill="${c2 || c}" ${ln(1.5)}/></g>`;
const cloud = (s, c, st) => `<path transform="scale(${s})" d="M-18 7a7 7 0 0 1 1.5-13.5 9.5 9.5 0 0 1 17-5.5 8.5 8.5 0 0 1 14.5 4.5 7 7 0 0 1 3.5 14.5z" fill="${c || '#fff'}"${st ? ` stroke="${st}" stroke-width="1.6"` : ''}/>`;
const flower = (s, c, mid) => `<g transform="scale(${s})">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-6" rx="4.2" ry="5.6" transform="rotate(${a})" fill="${c}" ${ln(1.2)}/>`).join('')}<circle r="3.4" fill="${mid || '#F2C230'}" ${ln(1.2)}/></g>`;
const apple = s => `<g transform="scale(${s})"><path d="M0-6C-5-10-13-8-13 1-13 10-6 15 0 12 6 15 13 10 13 1 13-8 5-10 0-6z" fill="#E25563" ${ln(1.6)}/><path d="M0-6c0-4 1-6 3-8" fill="none" ${ln(1.6)}/><path d="M2-11c4-4 9-2 9-2-3 4-7 4-9 2z" fill="#7DBB6A" ${ln(1.2)}/><ellipse cx="-6" cy="-1" rx="2.2" ry="3.2" fill="#fff" opacity=".6"/></g>`;
const strawberry = s => `<g transform="scale(${s})"><path d="M0 13C-9 6-12-1-9-6c3-3 15-3 18 0 3 5 0 12-9 19z" fill="#E8505B" ${ln(1.5)}/><path d="M-8-6l4-4 4 3 4-3 4 4-8 3z" fill="#7DBB6A" ${ln(1.2)}/>${[[-4, 0], [3, -1], [-1, 5], [5, 5], [-5, 6]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".9" ry="1.3" fill="#FCE8B4"/>`).join('')}</g>`;
const candy = (s, c) => `<g transform="scale(${s})"><path d="M-8 0l-8-6v12zM8 0l8-6v12z" fill="${c}" ${ln(1.3)}/><circle r="8" fill="#fff" ${ln(1.5)}/><path d="M-5-6a8 8 0 0 1 10 0M-7 3a8 8 0 0 0 14 0" fill="none" stroke="${c}" stroke-width="2.6"/></g>`;
const pudding = s => `<g transform="scale(${s})"><ellipse cy="15" rx="17" ry="4" fill="#fff" ${ln(1.5)}/><path d="M-12 14c0-14 4-22 12-22s12 8 12 22z" fill="#F7D56B" ${ln(1.7)}/><path d="M-9-2c2-5 5-6.5 9-6.5s7 1.5 9 6.5c-4 2-14 2-18 0z" fill="#8C5A2B" ${ln(1.3)}/><circle cy="-11" r="3" fill="#E8505B" ${ln(1.2)}/></g>`;
const cup = (s, c) => `<g transform="scale(${s})"><path d="M-11-6h22l-2 16a5 5 0 0 1-5 4h-8a5 5 0 0 1-5-4z" fill="${c || '#fff'}" ${ln(1.6)}/><path d="M11-2c6 0 6 8 0 8" fill="none" ${ln(1.6)}/><ellipse cy="-6" rx="11" ry="2.5" fill="#E8C9A0" ${ln(1.2)}/>${heart(.32, '#fff')}</g>`;
const roll = s => `<g transform="scale(${s})"><circle r="12" fill="#E3B27A" ${ln(1.6)}/><path d="M0 0c2 0 3 2 1 3.5S-4 3-3 0s5-5 7-3 3 8-2 10-10-1-10-6" fill="none" stroke="#B9783E" stroke-width="2" stroke-linecap="round"/><path d="M-10-5c3-6 13-8 19-1-3 2-5-1-7 2s-6-2-8 1-3 0-4-2z" fill="#fff" ${ln(1)}/></g>`;
const spoon = s => `<g transform="scale(${s})"><ellipse cy="-9" rx="5" ry="7" fill="#E6E2DA" ${ln(1.4)}/><rect x="-1.6" y="-3" width="3.2" height="18" rx="1.6" fill="#E6E2DA" ${ln(1.2)}/></g>`;
const paw = (s, c) => `<g transform="scale(${s})" fill="${c}"><ellipse cy="3" rx="5" ry="4.2"/><circle cx="-5.5" cy="-3" r="2"/><circle cx="-2" cy="-6" r="2"/><circle cx="2" cy="-6" r="2"/><circle cx="5.5" cy="-3" r="2"/></g>`;
const lens = s => `<g transform="scale(${s})"><path d="M7 7l11 11" stroke="#8C5A2B" stroke-width="5" stroke-linecap="round"/><circle r="10" fill="#DDEFFB" ${ln(2.4)}/><path d="M-5-4a7 7 0 0 1 6-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>`;
const bowtie = s => `<g transform="scale(${s})"><path d="M0 0L-13-8v16zM0 0l13-8v16z" fill="#C8403A" ${ln(1.6)}/><rect x="-3.5" y="-4" width="7" height="8" rx="2" fill="#A8322D" ${ln(1.4)}/></g>`;
const glasses = s => `<g transform="scale(${s})" fill="#fff" fill-opacity=".5"><circle cx="-10" r="8.5" ${ln(2.6)}/><circle cx="10" r="8.5" ${ln(2.6)}/><path d="M-1.5 0h3M-18.5-1l-5-2M18.5-1l5-2" fill="none" ${ln(2.2)}/></g>`;
const ball = s => `<g transform="scale(${s})"><circle r="11" fill="#fff" ${ln(1.8)}/><path d="M0-4.5l4.3 3.1-1.6 5h-5.4l-1.6-5z" fill="${K}"/><path d="M0-4.5V-11M4.3-1.4l6-2M2.7 3.6l3.8 5.4M-2.7 3.6l-3.8 5.4M-4.3-1.4l-6-2" stroke="${K}" stroke-width="1.4"/></g>`;
const skate = s => `<g transform="scale(${s})"><rect x="-17" y="-3.5" width="34" height="7" rx="3.5" fill="#E8B04B" ${ln(1.6)}/><circle cx="-10" cy="6" r="3" fill="#5B8FD9" ${ln(1.3)}/><circle cx="10" cy="6" r="3" fill="#5B8FD9" ${ln(1.3)}/></g>`;
const shoe = (s, c) => `<g transform="scale(${s})" fill="${c}"><path d="M-5-8c4-1 6 3 5 9-1 5-5 5-6 1s-2-9 1-10z"/><path d="M6-1c3 0 4 3 3 7-1 3-4 3-5 0s-1-7 2-7z"/></g>`;
const qmark = (s, c) => `<g transform="scale(${s})"><path d="M-5-6a5.5 5.5 0 1 1 8 5c-2 1.2-3 2.2-3 4.5" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/><circle cy="9" r="2" fill="${c}"/></g>`;
const badge = s => `<g transform="scale(${s})"><path d="M0-13l11 4v8c0 7-5 11-11 14-6-3-11-7-11-14v-8z" fill="#5B8FD9" ${ln(1.6)}/>${star(6, '#F2C230', 1)}</g>`;
const card = s => `<g transform="scale(${s}) rotate(-8)"><rect x="-13" y="-9" width="26" height="18" rx="2" fill="#fff" ${ln(1.5)}/><path d="M-6 2h12M-3-2h6v-4h-6z" ${ln(1.4)} fill="none"/><path d="M-8 2h16" ${ln(1.4)}/><circle cx="7" cy="5" r="1.4" fill="#C8403A"/></g>`;
const moon = (s, c) => `<path transform="scale(${s})" d="M4-12a12 12 0 1 0 8 19 9.5 9.5 0 0 1-8-19z" fill="${c || '#F6DE7A'}" ${ln(1.4)}/>`;
const dove = s => `<g transform="scale(${s})"><path d="M-12 2c6-1 9-6 14-6 4 0 6 2 8 1-1 3-3 4-5 4 2 3 1 7-4 8-6 1-10-3-13-7z" fill="#fff" ${ln(1.4)}/><path d="M-2-1c-3-6 1-11 6-12-1 5-2 8-6 12z" fill="#fff" ${ln(1.3)}/><circle cx="7" cy="-2" r=".9" fill="${K}"/></g>`;
const wand = s => `<g transform="scale(${s}) rotate(-30)"><rect x="-1.6" y="0" width="3.2" height="26" rx="1.6" fill="#8C6BC8" ${ln(1.2)}/>${star(9, '#F6D46A', 1.4)}${g(12, -6, 0, .5, sparkle(1, '#F6D46A'))}${g(-11, 6, 0, .4, sparkle(1, '#F4B6D4'))}</g>`;
const tiara = s => `<g transform="scale(${s})"><path d="M-15 6l3-12 6 6 6-11 6 11 6-6 3 12z" fill="#F6D46A" ${ln(1.5)}/><circle cy="-2" r="2.6" fill="#7EC4E8" ${ln(1)}/><circle cx="-9" cy="2" r="1.6" fill="#F4A6C6"/><circle cx="9" cy="2" r="1.6" fill="#F4A6C6"/></g>`;
const slipper = s => `<g transform="scale(${s})"><path d="M-15 5c0-6 4-9 9-9 4 0 6 4 10 4 5 0 9 1 11 5z" fill="#CBE7F7" ${ln(1.5)}/><path d="M11 5l2 8" ${ln(1.8)}/>${g(-4, -9, 0, .45, sparkle(1, '#fff'))}</g>`;
const balloons = s => `<g transform="scale(${s})"><path d="M0 12C0 20-3 24-1 30" fill="none" ${ln(1.2)}/><circle cy="0" r="10" fill="#E25563" ${ln(1.5)}/><circle cx="-10" cy="-10" r="6.5" fill="#E25563" ${ln(1.5)}/><circle cx="10" cy="-10" r="6.5" fill="#E25563" ${ln(1.5)}/><path d="M-4-3a5 5 0 0 1 4-3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>`;
const snow = (s, c) => `<g transform="scale(${s})" stroke="${c}" stroke-width="2" stroke-linecap="round" fill="none">${[0, 60, 120].map(a => `<path transform="rotate(${a})" d="M0-11V11M-3-8l3 3 3-3M-3 8l3-3 3 3"/>`).join('')}</g>`;
const shell = s => `<g transform="scale(${s})"><path d="M0 10L-12-2C-10-10 10-10 12-2z" fill="#F7B8C4" ${ln(1.5)}/><path d="M0 10V-7M0 10l-6-15M0 10l6-15M0 10l-10-9M0 10l10-9" ${ln(1.1)}/></g>`;
const castle = s => `<g transform="scale(${s})"><rect x="-22" y="-4" width="44" height="26" fill="#F7E7F0" ${ln(1.6)}/><path d="M-6 22v-9a6 6 0 0 1 12 0v9" fill="#C9B6E4" ${ln(1.4)}/>${[[-22, -14, 10, 30, '#9EC5EA'], [12, -14, 10, 30, '#9EC5EA'], [-6, -28, 12, 26, '#F4A6C6']].map(([x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#F7E7F0" ${ln(1.6)}/><path d="M${x - 2} ${y}l${w / 2 + 2} -${w * 1.3}l${w / 2 + 2} ${w * 1.3}z" fill="${c}" ${ln(1.5)}/>`).join('')}<path d="M0-44v-6l6 2-6 2" fill="#E25563" ${ln(1.1)}/><circle cx="-17" cy="2" r="1.8" fill="${K}"/><circle cx="17" cy="2" r="1.8" fill="${K}"/></g>`;
const firework = (s, c) => `<g transform="scale(${s})" stroke="${c}" stroke-width="2.2" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path transform="rotate(${a})" d="M0-5V-13"/>`).join('')}<circle r="2" fill="${c}" stroke="none"/></g>`;
const honey = s => `<g transform="scale(${s})"><path d="M-12-6h24l-2 16a6 6 0 0 1-6 5h-8a6 6 0 0 1-6-5z" fill="#C9853E" ${ln(1.6)}/><path d="M-13-9h26v4h-26z" fill="#E7B062" ${ln(1.4)}/><path d="M-8-5v6a2 2 0 0 0 4 0v-6M4-5v4a2 2 0 0 0 4 0v-4" fill="#F6C445"/></g>`;

// ---------- 컨셉 캐릭터 (직접 그린 그림) ----------
// 공통 작은 몸 (앉은 모습): 옷 색, 팔 들기
const body = (c, skin, o = {}) => `<path d="M-15 17c-5 9-5 21 0 25h30c5-4 5-16 0-25z" fill="${c}" ${ln(1.8)}/>${o.strap ? `<path d="M-9 18v10M9 18v10" stroke="${o.strap}" stroke-width="3"/>` : ''}<ellipse cx="-19" cy="${o.wave ? 10 : 28}" rx="5.5" ry="7" transform="rotate(${o.wave ? 30 : 15} -19 ${o.wave ? 10 : 28})" fill="${skin}" ${ln(1.8)}/><ellipse cx="19" cy="28" rx="5.5" ry="7" transform="rotate(-15 19 28)" fill="${skin}" ${ln(1.8)}/><ellipse cx="-8" cy="43" rx="7.5" ry="4.5" fill="${skin}" ${ln(1.8)}/><ellipse cx="8" cy="43" rx="7.5" ry="4.5" fill="${skin}" ${ln(1.8)}/>`;
const eyes = (x, y, rx, ry, c, sleep) => sleep ? `<path d="M${-x - 3} ${y}q3 2.5 6 0M${x - 3} ${y}q3 2.5 6 0" fill="none" ${ln(1.6)}/>` : `<ellipse cx="${-x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c || K}"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c || K}"/>`;
const zz = `<path d="M24-26h7l-7 7h7M33-36h5l-5 5h5" fill="none" stroke="#7E9CC9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
// 리본 고양이 (키티 컨셉): 흰 고양이·빨간 리본·노란 코·입 없음
function kitty(o = {}) {
  let s = o.body ? body(o.wear || '#6C9BD8', '#fff', { strap: o.wear ? '' : '#4F7FC0', wave: o.wave }) : '';
  s += `<path d="M-24-6l-1-20 15 9zM24-6l1-20-15 9z" fill="#fff" ${ln(2)}/><ellipse cx="0" cy="0" rx="27" ry="21" fill="#fff" ${ln(2)}/>`;
  s += eyes(10, 1, 2.6, 3.6, K, o.sleep) + `<ellipse cx="0" cy="7" rx="3.6" ry="2.6" fill="#F2C230" ${ln(1.3)}/>`;
  s += `<path d="M-21 2h-11M-21 7h-12M-20 12l-10 3M21 2h11M21 7h12M20 12l10 3" ${ln(1.5)}/>`;
  s += g(14, -17, 15, .95, bow(1, o.bow || '#E0495E', o.bow || '#E0495E'));
  if (o.apple) s += g(22, 30, 0, .9, apple(1));
  if (o.sleep) s += zz;
  return s;
}
// 푸딩 강아지 (폼폼푸린 컨셉): 노란 강아지·갈색 베레모·처진 귀
function purin(o = {}) {
  let s = o.body ? `<ellipse cx="0" cy="29" rx="20" ry="16" fill="#F7D56B" ${ln(1.8)}/><ellipse cx="-17" cy="27" rx="5" ry="6.5" fill="#F7D56B" ${ln(1.8)}/><ellipse cx="17" cy="27" rx="5" ry="6.5" fill="#F7D56B" ${ln(1.8)}/><ellipse cx="-8" cy="43" rx="6.5" ry="4" fill="#F7D56B" ${ln(1.8)}/><ellipse cx="8" cy="43" rx="6.5" ry="4" fill="#F7D56B" ${ln(1.8)}/>` : '';
  s += `<ellipse cx="-24" cy="5" rx="6.5" ry="13" transform="rotate(14 -24 5)" fill="#D9A04A" ${ln(1.8)}/><ellipse cx="24" cy="5" rx="6.5" ry="13" transform="rotate(-14 24 5)" fill="#D9A04A" ${ln(1.8)}/><ellipse rx="25" ry="21" fill="#F7D56B" ${ln(2)}/>`;
  s += `<ellipse cx="3" cy="-19" rx="14" ry="5" fill="#7A4A21" ${ln(1.6)}/><path d="M3-24q1-4 4-5" fill="none" stroke="#7A4A21" stroke-width="3" stroke-linecap="round"/>`;
  s += eyes(8, 1, 2.3, 2.6, K, o.sleep) + `<ellipse cx="0" cy="7" rx="3.2" ry="2.2" fill="#5B3618"/><path d="M-3.5 10q1.75 2.4 3.5 0 1.75 2.4 3.5 0" fill="none" ${ln(1.3)}/>`;
  if (o.pud) s += g(20, 32, 0, .75, pudding(1));
  if (o.sleep) s += zz;
  return s;
}
// 구름 강아지 (시나모롤 컨셉): 흰 강아지·넓은 귀·파란 눈·분홍 볼·돌돌 꼬리
function cinna(o = {}) {
  const st = 'stroke="#8FB3D6" stroke-width="2" stroke-linejoin="round"';
  let s = o.body ? `<path d="M18 30c10 0 11-10 4-11-4 0-4 5 0 5" fill="none" stroke="#8FB3D6" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="0" cy="28" rx="16" ry="14" fill="#fff" ${st}/><ellipse cx="-7" cy="40" rx="6" ry="4" fill="#fff" ${st}/><ellipse cx="7" cy="40" rx="6" ry="4" fill="#fff" ${st}/>` : '';
  const ea = o.fly ? -28 : -8;
  s += `<ellipse cx="-30" cy="2" rx="19" ry="8.5" transform="rotate(${-ea} -30 2)" fill="#fff" ${st}/><ellipse cx="30" cy="2" rx="19" ry="8.5" transform="rotate(${ea} 30 2)" fill="#fff" ${st}/>`;
  s += `<ellipse rx="24" ry="20" fill="#fff" ${st}/>` + eyes(8, 2, 2.5, 3.4, '#3F6FAF', o.sleep) + `<g fill="#F6B4C6"><ellipse cx="-14" cy="9" rx="4" ry="2.6"/><ellipse cx="14" cy="9" rx="4" ry="2.6"/></g><path d="M-3 8q3 3 6 0" fill="none" stroke="#3F6FAF" stroke-width="1.5" stroke-linecap="round"/>`;
  if (o.cup) s += g(19, 30, 0, .8, cup(1, '#fff'));
  if (o.fly) s += g(-26, 30, 0, .7, cloud(1, '#fff', '#8FB3D6'));
  return s;
}
// 분홍 두건 토끼 (마이멜로디 컨셉)
function melody(o = {}) {
  let s = o.body ? body('#F6B7C9', '#fff') : '';
  s += `<ellipse cx="-11" cy="-30" rx="7.5" ry="17" transform="rotate(-12 -11 -30)" fill="#F6B7C9" ${ln(1.8)}/><ellipse cx="11" cy="-30" rx="7.5" ry="17" transform="rotate(12 11 -30)" fill="#F6B7C9" ${ln(1.8)}/>`;
  s += `<ellipse rx="26" ry="23" fill="#F6B7C9" ${ln(2)}/><ellipse cx="0" cy="5" rx="19" ry="15" fill="#fff" ${ln(1.6)}/>`;
  s += eyes(7, 4, 2.2, 3, K) + `<ellipse cx="0" cy="9" rx="2.6" ry="1.9" fill="#F2C230"/><g fill="#F6B4C6"><ellipse cx="-12" cy="11" rx="3.4" ry="2.2"/><ellipse cx="12" cy="11" rx="3.4" ry="2.2"/></g>`;
  s += g(15, -36, 0, .65, flower(1, '#fff', '#F2C230'));
  return s;
}
// 동그란 귀 생쥐 (디즈니 컨셉): 까만 동그란 귀·살구색 얼굴·빨간 반바지
function mouse(o = {}) {
  let s = '';
  if (o.body) s += `<path d="M-13 18c-3 8-2 14 1 16h24c3-2 4-8 1-16z" fill="#2E2A2A"/><path d="M-15 30h30l-2 10h-26z" fill="#D9473D" ${ln(1.6)}/><ellipse cx="-5" cy="34" rx="2" ry="2.8" fill="#fff"/><ellipse cx="5" cy="34" rx="2" ry="2.8" fill="#fff"/><circle cx="-20" cy="${o.wave ? 8 : 26}" r="6" fill="#fff" ${ln(1.6)}/><circle cx="20" cy="26" r="6" fill="#fff" ${ln(1.6)}/><ellipse cx="-9" cy="44" rx="9" ry="5" fill="#F2C230" ${ln(1.6)}/><ellipse cx="9" cy="44" rx="9" ry="5" fill="#F2C230" ${ln(1.6)}/>`;
  s += `<circle cx="-21" cy="-19" r="12" fill="#2E2A2A"/><circle cx="21" cy="-19" r="12" fill="#2E2A2A"/><circle r="21" fill="#2E2A2A"/>`;
  s += `<path d="M0-6c-4-9-14-8-14 2 0 3 1 5 2 7-1 8 4 14 12 14S13 11 12 3c1-2 2-4 2-7 0-10-10-11-14-2z" fill="#F7D3AE"/>`;
  s += `<ellipse cx="-4.5" cy="-3" rx="2.4" ry="4.6" fill="${K}"/><ellipse cx="4.5" cy="-3" rx="2.4" ry="4.6" fill="${K}"/><ellipse cy="5" rx="4.4" ry="3" fill="#2E2A2A"/><path d="M-9 9q9 9 18 0" fill="none" ${ln(1.6)}/>`;
  if (o.bow) s += g(0, -25, 0, 1, bow(1, '#E0495E', '#E0495E', true));
  return s;
}
// 세일러 오리 (디즈니 컨셉)
function duck(o = {}) {
  let s = o.body ? `<path d="M-15 16c-4 10-3 20 0 24h30c3-4 4-14 0-24z" fill="#5B8FD9" ${ln(1.8)}/><path d="M-6 17l6 7 6-7" fill="none" stroke="#fff" stroke-width="2"/>${g(0, 24, 0, .45, bow(1, '#E0495E'))}<ellipse cx="-9" cy="43" rx="9" ry="4" fill="#F2A93B" ${ln(1.6)}/><ellipse cx="9" cy="43" rx="9" ry="4" fill="#F2A93B" ${ln(1.6)}/>` : '';
  s += `<ellipse rx="21" ry="19" fill="#fff" ${ln(2)}/><path d="M-6 6c3-3 18-3 21 1 1 4-10 7-19 4z" fill="#F2A93B" ${ln(1.6)}/>`;
  s += `<ellipse cx="-6" cy="-3" rx="2.4" ry="4" fill="${K}"/><ellipse cx="5" cy="-3" rx="2.4" ry="4" fill="${K}"/>`;
  s += `<path d="M-16-12c4-12 26-12 30 0z" fill="#5B8FD9" ${ln(1.6)}/><rect x="-16" y="-14" width="30" height="4" rx="2" fill="#2E3170"/><path d="M14-12l7 4" stroke="#2E3170" stroke-width="2.4" stroke-linecap="round"/>`;
  return s;
}
// 꿀단지 곰 (디즈니 컨셉)
function bear(o = {}) {
  let s = o.body ? `<path d="M-15 16c-4 10-3 20 0 25h30c3-5 4-15 0-25z" fill="#F2B84B" ${ln(1.8)}/><path d="M-15 16c4 6 26 6 30 0l1 9c-6 4-26 4-32 0z" fill="#D9473D" ${ln(1.6)}/>${g(18, 32, 0, .7, honey(1))}<ellipse cx="-8" cy="42" rx="7" ry="4" fill="#F2B84B" ${ln(1.6)}/>` : '';
  s += `<circle cx="-17" cy="-16" r="7" fill="#F2B84B" ${ln(1.8)}/><circle cx="17" cy="-16" r="7" fill="#F2B84B" ${ln(1.8)}/><circle r="21" fill="#F2B84B" ${ln(2)}/><ellipse cx="0" cy="7" rx="9" ry="7" fill="#F9D58C"/>`;
  s += `<circle cx="-7" cy="-3" r="2" fill="${K}"/><circle cx="7" cy="-3" r="2" fill="${K}"/><ellipse cx="0" cy="4" rx="3.4" ry="2.4" fill="#5B3618"/><path d="M-3 9q3 2.5 6 0" fill="none" ${ln(1.3)}/>`;
  return s;
}
// ---------- 명탐정 코난 컨셉 등장인물 (사람, 2등신으로 직접 그림) — 2026.10.13 사용자 요청 '등장인물 그림이 없어' ----------
const SK = '#F9DDC6';
// 몸: 옷 색·팔 모양(down|up|fist|point|hold)·긴바지(long)·넥타이 등 장식(tie)
function human(o) {
  const coat = o.coat, pt = o.pants || '#5A6275', shoe = o.shoe || '#5B3A2E';
  let s = '';
  if (o.long) s += `<path d="M-12 36h24l-1 15h-9l-2-8-2 8h-9z" fill="${pt}" ${ln(1.8)}/>`;
  else s += `<rect x="-9" y="42" width="5" height="8" fill="${SK}" ${ln(1.5)}/><rect x="4" y="42" width="5" height="8" fill="${SK}" ${ln(1.5)}/><path d="M-13 36h26l-1 8H1l-1-3-1 3h-12z" fill="${pt}" ${ln(1.8)}/>`;
  s += `<ellipse cx="-7" cy="52" rx="6" ry="3.4" fill="${shoe}" ${ln(1.6)}/><ellipse cx="7" cy="52" rx="6" ry="3.4" fill="${shoe}" ${ln(1.6)}/>`;
  s += `<path d="M-12 18C-15 24-15 32-13 38h26c2-6 2-14-1-20z" fill="${coat}" ${ln(1.8)}/><path d="M-5 18l5 8 5-8z" fill="${o.shirt || '#fff'}" ${ln(1.3)}/>`;
  const arm = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${K}" stroke-width="9.5" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${o.sleeve || coat}" stroke-width="6.5" stroke-linecap="round"/><circle cx="${(x2 + (x2 - x1) * .12).toFixed(1)}" cy="${(y2 + (y2 - y1) * .12).toFixed(1)}" r="3.8" fill="${SK}" ${ln(1.6)}/>`;
  const L = o.armL || 'down', R = o.armR || 'down';
  s += L === 'up' ? arm(-11, 22, -21, 8) : L === 'fist' ? arm(-11, 23, -24, 22) : arm(-11, 22, -17, 33);
  s += R === 'point' ? arm(11, 22, 25, 15) + `<path d="M29 13.6l6-2.2" stroke="${K}" stroke-width="4.4" stroke-linecap="round"/><path d="M29 13.6l6-2.2" stroke="${SK}" stroke-width="2.2" stroke-linecap="round"/>`
    : R === 'up' ? arm(11, 22, 21, 8) : R === 'fist' ? arm(11, 23, 27, 20) : R === 'hold' ? arm(11, 23, 20, 30) : arm(11, 22, 17, 33);
  return s + (o.tie || '');
}
// 얼굴: 귀·얼굴·눈(보통|반쯤 감은 half|잠 sleep)·볼·입(smile|open|smirk|flat|o)
function hface(o = {}) {
  let s = `<ellipse cx="-20" cy="3" rx="3.8" ry="4.8" fill="${SK}" ${ln(1.6)}/><ellipse cx="20" cy="3" rx="3.8" ry="4.8" fill="${SK}" ${ln(1.6)}/><path d="M-20-4C-20-17-10-22 0-22S20-17 20-4 11 20 0 20-20 9-20-4z" fill="${SK}" ${ln(2)}/>`;
  const ec = o.eye || '#2A2F45';
  if (o.sleep) s += `<path d="M-12 4q4 3 8 0M4 4q4 3 8 0" fill="none" ${ln(1.8)}/>`;
  else if (o.half) s += [-8, 8].map(x => `<path d="M${x - 3.4} 3a3.4 3.6 0 0 0 6.8 0z" fill="${ec}"/><path d="M${x - 4.2} 3h8.4" ${ln(1.7)}/>`).join('');
  else s += [-8, 8].map(x => `<ellipse cx="${x}" cy="3" rx="3.3" ry="4.5" fill="${ec}"/><circle cx="${x + 1.1}" cy="1.4" r="1.3" fill="#fff"/>`).join('');
  s += `<g fill="#F4A9A0" opacity=".55"><ellipse cx="-13" cy="10" rx="3.4" ry="2.2"/><ellipse cx="13" cy="10" rx="3.4" ry="2.2"/></g>`;
  const m = o.mouth || 'smile';
  s += m === 'open' ? `<path d="M-3.5 11q3.5 6 7 0z" fill="#B5463F" ${ln(1.3)}/>` : m === 'smirk' ? `<path d="M-2 12.5q3.5 1.5 6.5-1.8" fill="none" ${ln(1.5)}/>` : m === 'flat' ? `<path d="M-2.5 12h5" ${ln(1.4)}/>` : m === 'o' ? `<ellipse cx="0" cy="12" rx="1.8" ry="2.2" fill="#B5463F" ${ln(1.1)}/>` : `<path d="M-3 11q3 3 6 0" fill="none" ${ln(1.5)}/>`;
  return s;
}
const thick = (d, c, w) => `<path d="${d}" fill="none" stroke="${K}" stroke-width="${w + 2.2}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
// 꼬마 명탐정 (코난 느낌): 삐친 머리카락·큰 동그란 안경·파란 재킷·빨간 나비넥타이·반바지
function conanBoy(o = {}) {
  const pose = o.pose || 'face';
  let s = '';
  if (pose === 'skate') s += g(0, 58, 0, .95, skate(1));
  if (pose !== 'face') s += human({ coat: '#3D63B0', shirt: '#fff', pants: '#5A6275', armR: pose === 'point' ? 'point' : pose === 'lens' ? 'hold' : pose === 'kick' ? 'up' : 'down', armL: pose === 'skate' ? 'up' : 'down', tie: g(0, 19.5, 0, .4, bowtie(1)) });
  if (pose === 'lens') s += g(25, 30, -20, .6, lens(1));
  if (pose === 'kick') s += g(22, 47, 0, .62, ball(1));
  s += hface({ eye: '#2A2F45', mouth: pose === 'point' ? 'open' : 'smile' });
  s += `<path d="M-21 4C-23-14-12-25 1-25S24-14 21 4L18-4 15-1 13-10 9-4 6-11 2-5-2-11-5-4-9-11-12-4-15-9-18-1z" fill="#3A2E2A" ${ln(1.8)}/>` + thick('M4-24C5-33 14-35 14-29', '#3A2E2A', 3);
  s += `<g fill="#fff" fill-opacity="${o.shine ? '.9' : '.22'}"><circle cx="-8" cy="3" r="7.6" stroke="${K}" stroke-width="2.4"/><circle cx="8" cy="3" r="7.6" stroke="${K}" stroke-width="2.4"/></g><path d="M-.6 2.5h1.2M-15.6 2L-20 1M15.6 2L20 1" ${ln(2.2)}/>`;
  if (o.shine) s += `<path d="M-12 1l5-5M4 1l5-5" stroke="#9EC5EA" stroke-width="1.8" stroke-linecap="round"/>`;
  return s;
}
// 가라테 누나 (란 느낌): 긴 머리·앞머리 뿔·도복·검은 띠
function ranGirl(o = {}) {
  let s = `<path d="M-21-2C-25 10-24 32-19 44h38c5-12 6-34 2-46C21-18 11-25 0-25S-21-18-21-2z" fill="#4B342A" ${ln(1.8)}/>`;
  s += human({ coat: '#FAFAF7', shirt: '#FAFAF7', pants: '#FAFAF7', long: true, shoe: SK, armL: 'fist', armR: o.punch ? 'fist' : 'down',
    tie: `<path d="M-7 18l7 10 7-10" fill="none" ${ln(1.3)}/><path d="M-13 33h26v3.6h-26z" fill="#2E2A2A"/><path d="M-1 36l-4 7M1 36l4 7" stroke="#2E2A2A" stroke-width="2.6" stroke-linecap="round"/>` });
  s += hface({ eye: '#5A3A2E', mouth: o.punch ? 'open' : 'smile' });
  s += `<path d="M-21 4C-23-14-12-24 0-24S23-14 21 4C19-4 15-11 8-13 5-7-2-7-6-12-12-9-17-3-21 4z" fill="#4B342A" ${ln(1.8)}/><path d="M-2-21C0-30 4-35 9-37 7-30 6-25 4-20z" fill="#4B342A" ${ln(1.8)}/>`;
  if (o.punch) s += `<path d="M34 15h7M34 20h9M34 25h7" stroke="#8796B5" stroke-width="1.8" stroke-linecap="round"/>`;
  return s;
}
// 괴도 신사 (키드 느낌): 흰 실크햇·외눈 안경·흰 정장·빨간 안감 망토·카드
function kidThief() {
  let s = `<path d="M-13 18C-30 28-33 44-27 56h54c6-12 3-28-14-38z" fill="#fff" ${ln(1.8)}/><path d="M13 18C27 27 32 42 27 56h-6c3-13-1-26-10-34z" fill="#C8403A"/>`;
  s += human({ coat: '#fff', shirt: '#3E5FA8', pants: '#fff', long: true, shoe: '#fff', armR: 'hold', tie: `<path d="M0 20l-2 3 2 7 2-7z" fill="#C8403A"/>` });
  s += g(25, 26, -20, .45, card(1));
  s += hface({ eye: '#3A3F66', mouth: 'smirk' });
  s += `<path d="M-21 4C-22-8-17-14-11-16L-13-8-8-11-9-2-14-6-17 2zM21 4C22-8 17-14 11-16L13-8 8-11 9-2 14-6 17 2z" fill="#3A2E2A" ${ln(1.4)}/>`;
  s += `<g transform="rotate(-8 0 -14)"><path d="M-14-15V-38h28v23" fill="#fff" ${ln(1.8)}/><rect x="-14" y="-21" width="28" height="5" fill="#3E5FA8" ${ln(1.2)}/><ellipse cx="0" cy="-14" rx="25" ry="5.5" fill="#fff" ${ln(1.8)}/></g>`;
  s += `<circle cx="-8" cy="3" r="6.8" fill="#fff" fill-opacity=".25" ${ln(1.6)}/><path d="M-14.5 6C-18 12-17 18-14 22" fill="none" stroke="#B9A76A" stroke-width="1.2"/><g fill="#7DBB6A"><circle cx="-15.5" cy="23" r="1.7"/><circle cx="-12.5" cy="23" r="1.7"/><circle cx="-14" cy="21.5" r="1.7"/><circle cx="-14" cy="24.5" r="1.7"/></g>`;
  return s;
}
// 발명가 박사 (아가사 느낌): 대머리·흰 옆머리·흰 콧수염·둥근 코·흰 가운·플라스크
function agasa() {
  let s = `<rect x="-11" y="43" width="8" height="7" fill="#5A6275" ${ln(1.4)}/><rect x="3" y="43" width="8" height="7" fill="#5A6275" ${ln(1.4)}/><ellipse cx="-7" cy="52" rx="6.5" ry="3.3" fill="#5B3A2E" ${ln(1.5)}/><ellipse cx="7" cy="52" rx="6.5" ry="3.3" fill="#5B3A2E" ${ln(1.5)}/>`;
  s += `<path d="M-15 19C-23 27-22 41-15 46h30c7-5 8-19 0-27z" fill="#fff" ${ln(1.8)}/><path d="M-6 19c-2 9-1 18 1 27h10c2-9 3-18 1-27z" fill="#8DAA6E" ${ln(1.4)}/><path d="M0 19l-2 3 2 6 2-6z" fill="#C8403A"/>`;
  const arm = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${K}" stroke-width="9.5" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#fff" stroke-width="6.5" stroke-linecap="round"/><circle cx="${x2}" cy="${y2 + 2}" r="3.8" fill="${SK}" ${ln(1.6)}/>`;
  s += arm(-14, 24, -19, 35) + arm(14, 24, 22, 30);
  s += `<g transform="translate(27 26)"><path d="M-2-8v5l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9v-5z" fill="#DDEFFB" ${ln(1.3)}/><path d="M-5.2 4h10.4l1.6 2.6a2 2 0 0 1-2 2.4H-5.6a2 2 0 0 1-2-2.4z" fill="#8FD18A"/><circle cx="3" cy="-12" r="1.6" fill="#BFE3F7"/><circle cx="-1" cy="-16" r="1.1" fill="#BFE3F7"/></g>`;
  s += `<ellipse cx="-20" cy="4" rx="3.8" ry="4.8" fill="${SK}" ${ln(1.6)}/><ellipse cx="20" cy="4" rx="3.8" ry="4.8" fill="${SK}" ${ln(1.6)}/><path d="M-21-3C-21-17-11-23 0-23S21-17 21-3 12 21 0 21-21 11-21-3z" fill="${SK}" ${ln(2)}/>`;
  s += `<path d="M-21 6c-6-3-6-13 0-15 0 4 2 6 4 7-3 2-4 5-4 8zM21 6c6-3 6-13 0-15 0 4-2 6-4 7 3 2 4 5 4 8z" fill="#F2F2F2" ${ln(1.4)}/><path d="M-8-17q6-4 13-2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>`;
  s += `<circle cx="-7" cy="1" r="1.9" fill="${K}"/><circle cx="7" cy="1" r="1.9" fill="${K}"/><path d="M-11-4h6M5-4h6" stroke="#D6D6D6" stroke-width="2.6" stroke-linecap="round"/>`;
  s += `<ellipse cx="0" cy="6" rx="4.6" ry="3.6" fill="#F4B9A2" ${ln(1.4)}/><path d="M0 9.5C-4 7.5-11 8.5-14 12.5-9 14.5-4 13.5 0 11.5 4 13.5 9 14.5 14 12.5 11 8.5 4 7.5 0 9.5z" fill="#F2F2F2" ${ln(1.4)}/>`;
  return s;
}
// 쿨한 과학자 소녀 (하이바라 느낌): 적갈색 단발·반쯤 감은 눈·흰 가운
function haibara() {
  let s = human({ coat: '#fff', shirt: '#8C3B3B', pants: '#5A4A6A', shoe: '#8C3B3B' });
  s += hface({ eye: '#3B4E5E', half: true, mouth: 'flat' });
  s += `<path d="M-23 12C-26-6-17-25 0-25S26-6 23 12l-6 1C18 3 16-5 11-9 3-5-7-3-15-9-17-3-17 5-17 13z" fill="#B4653B" ${ln(1.8)}/>`;
  return s;
}
// 잠자는 탐정 아저씨 (코고로 느낌): 콧수염·정장·넥타이·졸음
function kogoro() {
  let s = human({ coat: '#4E5A72', shirt: '#fff', pants: '#4E5A72', long: true, shoe: '#2E2A2A', tie: `<path d="M0 19l-2.4 3 2.4 9 2.4-9z" fill="#9B2D2D" ${ln(1)}/>` });
  s += hface({ sleep: true, mouth: 'o' });
  s += `<path d="M-21 2C-23-15-12-24 0-24S23-15 21 2L19-6 13-12 7-8 1-14-5-8-11-12-17-5z" fill="#2E2A2A" ${ln(1.8)}/><path d="M0 8.5C-2.5 7.5-6 8-8.5 10M0 8.5C2.5 7.5 6 8 8.5 10" fill="none" stroke="#2E2A2A" stroke-width="2.2" stroke-linecap="round"/>`;
  return s + zz;
}
// 소년 탐정단 (아유미·겐타 느낌 얼굴)
const ayumi = () => hface({ eye: '#5A3A2E', mouth: 'open' }) + `<path d="M-22 8C-24-10-13-24 0-24S24-10 22 8l-4-6C17-5 12-11 6-11 2-8-4-8-8-11-14-10-17-5-18 2z" fill="#7A4A32" ${ln(1.8)}/><path d="M-18-10C-11-18 11-18 18-10" fill="none" stroke="#F4A6C6" stroke-width="4" stroke-linecap="round"/>`;
const genta = () => `<ellipse cx="-22" cy="3" rx="4" ry="5" fill="${SK}" ${ln(1.6)}/><ellipse cx="22" cy="3" rx="4" ry="5" fill="${SK}" ${ln(1.6)}/><ellipse rx="23" ry="21" fill="${SK}" ${ln(2)}/><path d="M-21-4C-21-16-11-22 0-22S21-16 21-4C15-10 7-12 0-12S-15-10-21-4z" fill="#2E2A2A" ${ln(1.6)}/><path d="M-3-12l3-7 3 7z" fill="#2E2A2A" ${ln(1.2)}/><circle cx="-8" cy="1" r="2.2" fill="${K}"/><circle cx="8" cy="1" r="2.2" fill="${K}"/><path d="M-8 9q8 9 16 0z" fill="#B5463F" ${ln(1.4)}/><g fill="#F4A9A0" opacity=".55"><ellipse cx="-14" cy="8" rx="3.4" ry="2.2"/><ellipse cx="14" cy="8" rx="3.4" ry="2.2"/></g>`;

// 우리 식구 (다람쥐 — characters.js 그대로) 를 바탕 그림에 끼워 넣기
const fam = (who, prop, o, sz) => { if (!window.CHARS) return ''; const v = CHARS.svg(who, prop, Object.assign({ size: sz }, o)); return v.replace(/^<svg class="chr" width="[^"]*" height="[^"]*"/, `<svg x="${-sz / 2}" y="${-sz / 2}" width="${sz}" height="${sz}"`).replace(/ aria-hidden="true"/, ''); };

// ---------- 컨셉마다 그릴 것 (큰 그림 13개 + 작은 반짝이) ----------
const SLOTS = [[75, 78], [215, 62], [345, 96], [140, 200], [290, 205], [58, 318], [205, 335], [350, 330], [118, 455], [272, 462], [62, 572], [212, 590], [352, 566]];
const ART = {
  conan: () => ({ main: [g(0, 0, 0, 1.05, conanBoy({ pose: 'point' })), g(0, 0, 0, 1.05, kidThief()), g(0, 0, 0, 1.4, lens(1)), g(0, 0, 0, 1.05, ranGirl({ punch: true })), g(0, 0, 0, 1.05, conanBoy({ pose: 'lens', shine: true })),
      g(0, 0, 0, 1.05, agasa()), g(0, 0, 0, 1.5, bowtie(1)), g(0, 0, 0, 1.05, haibara()), g(0, 0, 0, 1.3, moon(1)) + g(16, 8, -10, .9, dove(1)), g(0, 0, 0, 1.05, kogoro()),
      g(-18, 0, 0, .8, ayumi()) + g(20, 4, 0, .82, genta()), fam('baby', 'lens', { outfit: 'conan', hat: 'none' }, 92), g(0, 0, 0, 1.05, conanBoy({ pose: 'kick' }))],
    small: [s => qmark(s, '#5B6E99'), s => shoe(s, '#8796B5'), s => star(6 * s, '#F2C230'), s => badge(s * .6)], op: .5 }),
  sanrio: () => ({ main: [g(0, 0, 0, 1.1, kitty({ body: true, wave: true })), g(0, 0, 0, 1.4, strawberry(1)), g(0, 0, 0, 1.05, purin({ body: true })), g(0, 0, 0, 1.4, candy(1, '#F4A6C6')), g(0, 0, 0, 1.05, cinna({ fly: true, body: true })), g(0, 0, 0, 1.1, melody({ body: true })),
      g(0, 0, 0, 1.6, cloud(1, '#fff', '#C9B6E4')), fam('baby', 'kittydoll', { hat: 'kittybow', outfit: 'kitty' }, 92), g(0, 0, 0, 1.15, kitty({ apple: true })), g(0, 0, 0, 1.3, pudding(1)), g(0, 0, 0, 1.05, cinna({ cup: true, body: true })), g(0, 0, 0, 1.5, heart(1.2, '#F4A6C6', 1.4)), g(0, 0, 0, 1.05, melody({}))],
    small: [s => heart(s * .6, '#F4A6C6'), s => star(6 * s, '#F6D46A'), s => sparkle(s, '#C9B6E4'), s => strawberry(s * .5)], op: .45 }),
  kitty: () => ({ main: [g(0, 0, 0, 1.15, kitty({ body: true, wave: true })), g(0, 0, 0, 1.5, apple(1)), g(0, 0, 0, 1.15, kitty({})), g(0, 0, 0, 1.6, bow(1.4, '#E0495E')), fam('baby', 'kittydoll', { hat: 'kittybow', outfit: 'kitty' }, 94), g(0, 0, 0, 1.1, kitty({ body: true, apple: true, wear: '#F4A6C6' })),
      g(0, 0, 0, 1.5, flower(1.3, '#fff', '#F2C230')), g(0, 0, 0, 1.1, kitty({ sleep: true })), g(0, 0, 0, 1.4, cup(1, '#fff')), fam('mom', 'heart', { hat: 'kittybow' }, 88), g(0, 0, 0, 1.1, kitty({ body: true, bow: '#F2C230', wear: '#E0495E' })), g(0, 0, 0, 1.5, heart(1.3, '#E0495E', 1.4)), g(0, 0, 0, 1.5, apple(1))],
    small: [s => bow(s * .5, '#E0495E'), s => heart(s * .6, '#F4A6C6'), s => flower(s * .5, '#fff'), s => star(6 * s, '#F2C230')], op: .45 }),
  purin: () => ({ main: [g(0, 0, 0, 1.15, purin({ body: true })), g(0, 0, 0, 1.6, pudding(1)), g(0, 0, 0, 1.15, purin({})), g(0, 0, 0, 1.6, spoon(1)), fam('baby', 'purindoll', { hat: 'purinhat', outfit: 'purin' }, 94), g(0, 0, 0, 1.1, purin({ body: true, pud: true })),
      g(0, 0, 0, 1.5, paw(1.6, '#D9A04A')), g(0, 0, 0, 1.1, purin({ sleep: true, body: true })), g(0, 0, 0, 1.5, pudding(1)), g(0, 0, 0, 1.4, cup(1, '#FFF4CF')), g(0, 0, 0, 1.15, purin({})), g(0, 0, 0, 1.6, star(12, '#F6D46A', 1.4)), g(0, 0, 0, 1.5, pudding(1))],
    small: [s => paw(s * .6, '#D9A04A'), s => star(6 * s, '#F6D46A'), s => heart(s * .5, '#E6A15A'), s => sparkle(s, '#C88A3A')], op: .45 }),
  cinna: () => ({ main: [g(0, 0, 0, 1.1, cinna({ fly: true, body: true })), g(0, 0, 0, 1.8, cloud(1, '#fff', '#A9CBEA')), g(0, 0, 0, 1.15, cinna({})), g(0, 0, 0, 1.5, roll(1)), fam('baby', 'teddy', { hat: 'none', outfit: 'pajama' }, 90), g(0, 0, 0, 1.1, cinna({ cup: true, body: true })),
      g(0, 0, 0, 1.6, cup(1, '#fff')), g(0, 0, 0, 1.1, cinna({ sleep: true })), g(0, 0, 0, 1.8, cloud(1, '#fff', '#A9CBEA')), g(0, 0, 0, 1.5, roll(1)), g(0, 0, 0, 1.1, cinna({ fly: true, body: true })), g(0, 0, 0, 1.6, star(12, '#F6D46A', 1.4)), g(0, 0, 0, 1.5, cloud(1, '#fff', '#A9CBEA'))],
    small: [s => cloud(s * .5, '#fff', '#A9CBEA'), s => star(6 * s, '#F6D46A'), s => sparkle(s, '#9CC4EC'), s => heart(s * .5, '#F6B4C6')], op: .5 }),
  disney: () => ({ main: [g(0, 0, 0, 1.1, mouse({ body: true, wave: true })), g(0, 0, 0, 1.25, castle(1)), g(0, 0, 0, 1.1, mouse({ bow: true })), g(0, 0, 0, 1.5, wand(1)), g(0, 0, 0, 1.1, duck({ body: true })), fam('baby', 'rattle', { hat: 'crown', outfit: 'tutu' }, 92),
      g(0, 0, 0, 1.1, bear({ body: true })), g(0, 0, 0, 1.5, tiara(1)), g(0, 0, 0, 1.4, balloons(1)), g(0, 0, 0, 1.4, slipper(1)), g(0, 0, 0, 1.1, mouse({ body: true, bow: true })), g(0, 0, 0, 1.5, shell(1)), g(0, 0, 0, 1.5, firework(1, '#F6D46A')) + g(18, 16, 0, .8, firework(1, '#F4A6C6'))],
    small: [s => star(6 * s, '#F6D46A'), s => sparkle(s, '#C9B6E4'), s => snow(s * .5, '#9EC5EA'), s => firework(s * .5, '#F4A6C6')], op: .42 })
};
// 탭 맨 위 띠·제목 밑줄 무늬 (작은 그림 반복)
const STRIP = { conan: [g(10, 8, 0, .45, bowtie(1)), g(32, 8, 0, .4, lens(1))], sanrio: [g(10, 8, 0, .5, heart(1, '#F4A6C6')), g(32, 8, 0, .55, star(10, '#F6D46A'))], kitty: [g(12, 8, 0, .5, bow(1, '#E0495E')), g(34, 8, 0, .45, apple(1))],
  purin: [g(12, 8, 0, .3, pudding(1)), g(34, 8, 0, .45, paw(1, '#D9A04A'))], cinna: [g(13, 8, 0, .45, cloud(1, '#fff', '#A9CBEA')), g(35, 8, 0, .55, star(9, '#F6D46A'))], disney: [g(11, 8, 0, .5, star(10, '#F6D46A')), g(33, 9, 0, .28, mouse({}))] };
const ULINE = { conan: [g(6, 5, 20, .32, shoe(1, '#8796B5')), g(28, 5, 20, .32, shoe(1, '#8796B5'))], sanrio: [g(6, 5, 0, .45, heart(1, '#F4A6C6')), g(28, 5, 0, .4, star(10, '#F6D46A'))], kitty: [g(7, 5, 0, .32, bow(1, '#E0495E')), g(29, 5, 0, .4, heart(1, '#F4A6C6'))],
  purin: [g(6, 5, 0, .4, paw(1, '#D9A04A')), g(28, 5, 0, .2, pudding(1))], cinna: [g(8, 5, 0, .3, cloud(1, '#fff', '#A9CBEA')), g(30, 5, 0, .4, star(10, '#9CC4EC'))], disney: [g(6, 5, 0, .4, star(10, '#F6D46A')), g(28, 5, 0, .4, sparkle(1, '#C9B6E4'))] };

const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const svgUrl = (w, h, body) => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}")`;
function tile(id) {
  const a = ART[id](), R = rnd(11 + id.length * 7), W = 410, H = 650;
  let out = '';
  for (let i = 0; i < 26; i++) { const x = 14 + R() * (W - 28), y = 14 + R() * (H - 28), f = a.small[i % a.small.length]; out += g(x.toFixed(0), y.toFixed(0), Math.round(R() * 60 - 30), 1, f(.7 + R() * .6)); }
  a.main.forEach((m, i) => { const [x, y] = SLOTS[i % SLOTS.length]; out += g(x + Math.round(R() * 16 - 8), y + Math.round(R() * 16 - 8), Math.round(R() * 24 - 12), .78, m); });
  return svgUrl(W, H, `<g opacity="${a.op}">${out}</g>`);
}
function css(id) {
  if (!ART[id]) return '';
  const T = `html[data-theme=${id}]`;
  return `${T} body{background:${tile(id)} 0 0/410px 650px,var(--paper)}
${T} #app::before{height:18px;background:${svgUrl(44, 18, `<g opacity=".8">${STRIP[id].join('')}</g>`)} 0 50%/44px 18px repeat-x,var(--card)}
${T} .vhead::after{opacity:.75;background:${svgUrl(44, 10, ULINE[id].join(''))} 0 0/44px 10px repeat-x}`;
}
let made = '';
function paint() {
  const id = document.documentElement.dataset.theme || '';
  if (made === id) return; made = id;
  let st = document.getElementById('themeart'); if (!st) { st = document.createElement('style'); st.id = 'themeart'; document.head.appendChild(st); }
  try { st.textContent = css(id); } catch (e) { st.textContent = ''; console.warn('테마 그림', e); }
  bake(id, st);
}
// 큰 바탕 SVG는 화면 움직일 때마다 다시 그려져 버벅임 → 한 번 PNG로 구워 바꿔 끼움
let baked = {};
function bake(id, st) {
  if (!ART[id] || !window.HTMLCanvasElement) return;
  const swap = u => { if (made === id) st.textContent = st.textContent.replace(/body\{background:url\("data:image\/svg[^"]*"\)/, `body{background:url("${u}")`); };
  if (baked[id]) return swap(baked[id]);
  const go = () => {
    const m = /body\{background:url\("(data:image\/svg[^"]*)"\)/.exec(st.textContent); if (!m) return;
    const img = new Image();
    img.onload = () => {
      try {
        const d = Math.min(2, window.devicePixelRatio || 1), c = document.createElement('canvas');
        c.width = 410 * d; c.height = 650 * d; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => { if (!b) return; baked[id] = URL.createObjectURL(b); swap(baked[id]); }, 'image/png');
      } catch (e) {}
    };
    img.src = m[1];
  };
  (window.requestIdleCallback || setTimeout)(go, { timeout: 800 });
}
function apply(id) {
  id = LIST.some(t => t[0] === id) ? id : 'det';
  try { localStorage.setItem('soeun-theme', JSON.stringify(id === 'det' ? '' : id)); } catch (e) {}
  if (id === 'det') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = id;
  const m = document.querySelector('meta[name=theme-color]'), t = LIST.find(x => x[0] === id); if (m && t) m.content = t[2];
  paint();
}
const current = () => document.documentElement.dataset.theme || 'det';
// 설정 화면 견본: 그 컨셉의 대표 그림
function icon(id) {
  const b = { det: () => fam('baby', 'lens', { hat: 'det', outfit: '' }, 64), conan: () => g(0, 5, 0, .7, conanBoy({})), sanrio: () => g(0, 2, 0, .62, melody({})) , kitty: () => g(0, 4, 0, .72, kitty({})), purin: () => g(0, 4, 0, .72, purin({})), cinna: () => g(0, 4, 0, .62, cinna({})), disney: () => g(0, 6, 0, .7, mouse({ bow: true })) }[id];
  return b ? `<svg viewBox="-32 -32 64 64" width="52" height="52" aria-hidden="true">${b()}</svg>` : '';
}
window.THEME = { list: LIST, apply, current, icon, paint };
paint();
})();
