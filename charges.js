// 수사 혐의 — 성장 수사 첫 화면과 수사 보드에 붙는 장난스러운 공소장
// 실제 기록(몸무게, 체온, 급식, 사진, 최초 목격…)을 근거로 혐의를 만들고, 월령별 단골 혐의를 섞어요
// 날짜로 고르기 때문에 같은 날엔 두 폰에 같은 혐의가 떠요. "다른 혐의"는 이 폰에서만 바꿔 봐요
(function () {
let shift = 0;
const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

// 월령별 단골 혐의 [혐의, 근거]
const BY_AGE = [
  [0, [['새벽 정기 기상', '매일 새벽 두세 번 수사관 호출, 상습범'], ['딸꾹질 상습범', '수유 후 딸꾹질로 현장 교란'], ['트림 묵비권 행사', '등을 두드려도 끝까지 버팀'], ['조건부 수면', '안아야만 자고, 내려놓으면 즉시 깸'], ['배냇짓 무단 미소', '자면서 웃어 수사관 심쿵 유발']]],
  [3, [['손가락 무단 시식', '주먹째로 입에 넣는 장면 다수 포착'], ['침 무단 방류', '턱받이 교체 횟수 급증'], ['옹알이 위증', '"엄마"인지 "음마"인지 진술 번복'], ['뒤집기 후 구조 요청', '뒤집고 나서 못 돌아와 SOS']]],
  [6, [['이유식 숟가락 탈취', '수사관 손에서 숟가락 강제 압수'], ['바닥 물건 시식', '눈에 띄는 건 일단 입으로 감식'], ['기어서 현장 이탈', '잠깐 한눈판 사이 도주'], ['머리카락 잡아당기기', '피해자: 엄마·아빠 수사관']]],
  [12, [['서랍 무단 수색', '열 수 있는 건 다 열어 봄'], ['리모컨 은닉', '행방 묘연, 수사 난항'], ['"아니야" 남발', '모든 질문에 일단 부인'], ['첫 걸음 후 도주', '걷자마자 뛰기 시작']]]
];
const ALWAYS = ['귀여움 과다 소지', '현장에 있던 수사관 전원 심쿵, 가중처벌 대상'];
const VERDICTS = ['판결: 사랑 종신형', '판결: 뽀뽀 100회형', '판결: 무죄 (너무 귀여움)', '판결: 기소 유예 (낮잠 조건)', '판결: 꼭 안아주기형', '판결: 웃음 사회봉사 명령'];

// 기록을 근거로 한 혐의 (해당 기록이 있을 때만)
function fromRecords() {
  const out = [], t = today();
  const ws = S.records.filter(r => r.weight != null && r.weight !== '').sort((a, b) => a.date < b.date ? -1 : 1);
  if (ws.length >= 2) {
    const a = ws[ws.length - 2], b = ws[ws.length - 1], g = Math.round((b.weight - a.weight) * 1000), d = Math.max(1, daysBetween(a.date, b.date));
    if (g > 0) out.push(['몸무게 무단 증량', `지난 측정보다 +${g}g, 하루 ${Math.round(g / d)}g씩 몰래 꿀꺽`]);
  }
  const hs = S.records.filter(r => r.height != null && r.height !== '').sort((a, b) => a.date < b.date ? -1 : 1);
  if (hs.length) out.push(['키 몰래 늘이기', `${fmt('height', hs[hs.length - 1].height)}cm까지 자란 사실 확인됨`]);
  const temps = S.logs.filter(l => l.kind === 'temp').length;
  if (temps >= 2) out.push(['부모 심장 철렁 유발', `체온 ${temps}번 측정당함, 수사관 밤샘 근무`]);
  const shots = S.vaccines.filter(v => v.done).length;
  if (shots) out.push(['주사 맞고도 씩씩한 척', `예방접종 ${shots}건 해결, 울음은 증거 불충분`]);
  const no = S.meals.filter(m => m.eat === '거부').sort((a, b) => a.date < b.date ? 1 : -1)[0];
  if (no) out.push(['이유식 묵비권 행사', `${fmtK(no.date, true)} ${no.menu || '급식'} 앞에서 입 꾹 닫음`]);
  const clean = S.meals.filter(m => m.eat === '완식').length;
  if (clean >= 2) out.push(['그릇 싹싹 비우기', `완식 ${clean}회, 증거 인멸 수준`]);
  const photos = S.moments.filter(m => m.photo).length + S.records.filter(r => r.photo).length;
  if (photos >= 5) out.push(['카메라 독점', `사진 ${photos}장, 수사관 폰 용량 압박`]);
  const first = S.moments.filter(m => m.type === 'first').sort((a, b) => a.date < b.date ? 1 : -1)[0];
  if (first) out.push([`${first.title} 기습 공개`, `생후 ${dayNo(first.date)}일${first.by ? `, ${first.by} 수사관이 최초 목격` : ''}`]);
  const d = dayNo(t);
  if (d >= 100) out.push(['100일 무사 통과', `수사 ${d}일째, 수사관들 체력은 증거 불충분`]);
  return out;
}
function pick() {
  const [mo] = monthsDays(S.profile.birth, today());
  const age = BY_AGE.filter(([m]) => mo >= m).pop()[1];
  const pool = fromRecords().concat(age);
  const seed = hash(today() + (S.profile.name || '')) + shift * 7919;
  // 기록 근거 혐의를 앞에, 단골 혐의를 섞어서 두 개, 마지막은 늘 귀여움
  const chosen = [], used = new Set();
  for (let i = 0; chosen.length < 2 && i < pool.length * 3; i++) {
    const k = (seed + i * 2654435761) % pool.length;
    if (!used.has(k)) { used.add(k); chosen.push(pool[k]); }
  }
  chosen.push(ALWAYS);
  return { list: chosen, verdict: VERDICTS[(seed >> 3) % VERDICTS.length] };
}

function html() {
  const p = S.profile, { list, verdict } = pick();
  return `<section class="charge" aria-label="수사 혐의">
    <div class="chg-head"><span>혐의 사실 · 피의자 ${esc(p.name || '우리 아기')}</span><button class="ghost" data-chg="next">다른 혐의 ↻</button></div>
    <ol>${list.map(([t, why], i) => `<li><b>제${i + 1}항</b><span><strong>${esc(t)} 혐의</strong><small>${esc(why)}</small></span></li>`).join('')}</ol>
    <span class="chg-stamp">${esc(verdict)}</span>
  </section>`;
}
function boardCard() {
  const { list, verdict } = pick();
  return { id: 'charge', go: 'grow', cls: 'kraft', html: `<b class="bt">혐의 사실</b>${list.map(([t]) => `<p class="bl">${esc(t)}</p>`).join('')}<small style="color:var(--red)">${esc(verdict)}</small>` };
}

document.addEventListener('click', e => {
  if (!e.target.closest('[data-chg=next]')) return;
  shift++; render();
  const el = document.querySelector('.charge'); if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
});

const css = document.createElement('style');
css.textContent = `
.charge{position:relative;margin-top:18px;background:#FFFDF7;border:1px solid var(--line);border-left:4px solid var(--red);padding:12px 14px 14px;box-shadow:0 3px 8px rgba(43,38,34,.12)}
.chg-head{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;color:var(--muted);letter-spacing:1px;margin-bottom:6px}
.chg-head .ghost{min-height:32px;padding:2px 10px;font-size:12px;letter-spacing:0}
.charge ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.charge li{display:flex;gap:10px;align-items:baseline;border-bottom:1px dashed var(--line);padding-bottom:7px}
.charge li:last-child{border-bottom:0;padding-bottom:0}
.charge li b{flex-shrink:0;font-size:12px;color:var(--red);font-weight:700}
.charge li span{display:flex;flex-direction:column;min-width:0}
.charge li strong{font-family:var(--display);font-weight:400;font-size:17px;color:var(--navy);line-height:1.3;word-break:keep-all}
.charge li small{font-size:12px;color:var(--muted)}
.chg-stamp{position:absolute;right:12px;bottom:10px;border:3px double var(--red);color:var(--red);font-family:var(--display);font-size:14px;padding:2px 8px;border-radius:6px;transform:rotate(-8deg);background:rgba(255,253,247,.85);pointer-events:none}
.charge ol{padding-bottom:40px}
.charge.bump{animation:chgbump .35s ease-out}
@keyframes chgbump{0%{transform:rotate(-1.2deg) scale(.98)}60%{transform:rotate(.6deg)}100%{transform:none}}
@media (prefers-reduced-motion:reduce){.charge.bump{animation:none}}`;
document.head.appendChild(css);

window.CHARGES = { html, boardCard };
})();
