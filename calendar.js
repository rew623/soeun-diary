// 사건 앨범 > 앨범: '날짜별 달력' — 생후 N개월을 한 달로 보고, 칸마다 생후 일수(태어난 날 = 1일), 사진이 있는 날은 동그란 사진.
// 사진 있는 날을 누르면 아래 현장 사진첩의 그 날짜로 이동 (사용자 요청 2026.10.28)
(() => {
const WK = '일월화수목금토';
const CAL = { m: -1 };   // 보는 달 (생후 N개월), -1이면 이번 달
const ymd = ms => new Date(ms).toISOString().slice(0, 10);
const anchor = (birth, i) => { const [y, m, d] = birth.split('-').map(Number); return Date.UTC(y, m - 1 + i, d); };   // monthsDays와 같은 기준
const curMonth = () => { const p = S.profile; return p && p.birth ? monthsDays(p.birth, today())[0] : 0; };
const mon = () => { const c = curMonth(); return CAL.m < 0 || CAL.m > c ? c : CAL.m; };

function html() {
  const p = S.profile; if (!p || !p.birth || !window.ALBUM || !ALBUM.photoDays) return '';
  const cur = curMonth(), i = mon(), A0 = anchor(p.birth, i), A1 = anchor(p.birth, i + 1), t = today();
  const days = []; for (let ms = A0; ms < A1; ms += 864e5) days.push(ymd(ms));
  const PD = ALBUM.photoDays(), lead = new Date(A0).getUTCDay();   // 첫 칸이 무슨 요일인지 (일요일 시작)
  const cell = d => {
    const n = daysBetween(p.birth, d) + 1, items = PD.get(d), fut = d > t, ph = items && safeImg(PHOTOS[items[0].id]);
    if (items) return `<button class="cald has${d === t ? ' today' : ''}" data-cal="go" data-day="${d}" aria-label="${n}일째 사진 ${items.length}장 보기">${ph ? `<img src="${ph}" alt="" loading="lazy" decoding="async">` : ''}<b>${n}</b>${items.length > 1 ? `<i>${items.length}</i>` : ''}</button>`;
    return `<span class="cald${fut ? ' fut' : ''}${d === t ? ' today' : ''}"><b>${n}</b></span>`;
  };
  const fmt = d => { const [, m, dd] = d.split('-').map(Number); return `${m}.${dd}`; };
  const total = days.filter(d => PD.has(d)).length;
  return `<section${isFold('a-cal') ? ' class="folded"' : ''} class="calsec"><h2 class="sh" data-fold="a-cal" style="align-items:baseline"><span style="font-family:var(--display);font-size:21px;color:var(--navy);letter-spacing:0">날짜별 달력</span><span>사진 있는 날 ${total}일</span></h2>
    <div class="calnav"><button data-cal="prev" aria-label="이전 달"${i <= 0 ? ' disabled' : ''}>‹</button><b>생후 ${i}개월 <small>${fmt(days[0])} ~ ${fmt(days[days.length - 1])}</small></b><button data-cal="next" aria-label="다음 달"${i >= cur ? ' disabled' : ''}>›</button></div>
    <div class="calwk">${[...WK].map((w, k) => `<span${k === 0 ? ' class="sun"' : ''}>${w}</span>`).join('')}</div>
    <div class="calgrid">${'<span class="cald pad"></span>'.repeat(lead)}${days.map(cell).join('')}</div>
    <p class="foot" style="margin:8px 0 0">숫자는 생후 일수예요 (태어난 날이 1일). 사진 있는 날을 누르면 아래 현장 사진첩의 그 날로 가요.</p></section>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-cal]'); if (!b || b.disabled) return;
  const a = b.dataset.cal;
  if (a === 'prev') { CAL.m = Math.max(0, mon() - 1); render(); return; }
  if (a === 'next') { CAL.m = Math.min(curMonth(), mon() + 1); render(); return; }
  if (a === 'go') {
    const d = b.dataset.day; if (!ALBUM.reveal(d)) return;
    render();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.querySelector(`.agd[data-day="${d}"]`); if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      el.classList.add('calflash'); setTimeout(() => el.classList.remove('calflash'), 2200);
    }));
  }
});

const css = document.createElement('style');
css.textContent = `
.calnav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 10px}
.calnav b{font-family:var(--display);font-weight:400;font-size:19px;color:var(--navy);text-align:center}.calnav small{display:block;font-family:var(--body);font-size:11.5px;color:var(--muted)}
.calnav button{width:38px;height:38px;border-radius:50%;border:1.5px solid var(--line);background:#FFFDF7;color:var(--navy);font-size:20px;line-height:1;padding:0}.calnav button:disabled{opacity:.35}
.calwk{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:11.5px;color:var(--muted);margin-bottom:4px}.calwk .sun{color:var(--red)}
.calgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px 4px}
.cald{position:relative;display:grid;place-items:center;aspect-ratio:1;border-radius:50%;padding:0;border:0;background:none;font-family:var(--display);font-size:14px;color:var(--navy);overflow:visible}
.cald.pad{visibility:hidden}.cald.fut{opacity:.35}
.cald b{font-weight:400;position:relative;z-index:1}
.cald.today{box-shadow:0 0 0 2px var(--red);border-radius:50%}.cald.today b{color:var(--red)}
.cald.has{overflow:hidden;background:var(--card2);box-shadow:0 2px 5px rgba(43,38,34,.22);cursor:pointer}
.cald.has.today{box-shadow:0 0 0 2.5px var(--red),0 2px 5px rgba(43,38,34,.22)}
.cald.has img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%}
.cald.has b{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7),0 0 6px rgba(0,0,0,.45);font-size:15px}.cald.has.today b{color:#fff}
.cald.has i{position:absolute;right:1px;bottom:1px;z-index:2;min-width:15px;height:15px;border-radius:99px;background:var(--red);color:#fff;font-style:normal;font-family:var(--body);font-size:9.5px;line-height:15px;text-align:center;padding:0 3px}
.cald.has:active{transform:scale(.94)}
.agd.calflash{animation:calflash 2.2s ease-out;border-radius:8px}@keyframes calflash{0%,45%{background:#FFE7A8}100%{background:transparent}}
`;
document.head.appendChild(css);
window.CAL = { html };
})();
