// 급식 수사 탭 (이유식·큐브·식단) — index.html에서 나눈 전역 스크립트 (순서: main-core → render → sick → album → meal → sheets → boot)
// ---------- 급식 수사 (이유식) ----------
const FOOD_URL='https://www.wjeducare.or.kr/board/list.asp?BoardID=0012';
const STAGES=[['초기',4,6,'하루 1회','곱게 간 미음 → 묽은 죽'],['중기',7,8,'하루 2회','혀로 으깨지는 죽 (두부 정도)'],['후기',9,11,'하루 3회','잇몸으로 으깨는 무른 밥 (바나나 정도)'],['완료기',12,99,'하루 3끼 + 간식','진밥, 부드러운 반찬']];
const FIRSTF=['쌀','찹쌀','소고기','애호박','브로콜리','감자','고구마','단호박','양배추','청경채','오트밀','닭고기','배','사과'];
const ALLERGY=['달걀','우유','밀','대두','땅콩','생선','새우','견과류'];
const EATS=['완식','잘먹음','절반','거부'],SLOTS=['아침','점심','저녁','간식'];
const REACTS=['입 주변 붉어짐','발진','두드러기','구토','설사','기침','보챔'];
const curMenuMonth=()=>S.menuMonth||today().slice(0,7);
const tested=()=>S.foods.filter(f=>f.result==='통과');
function stageOf(mo){return STAGES.find(([,a,b])=>mo>=a&&mo<=b)||null}
function shiftMonth(ym,n){const[y,m]=ym.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+n,1));return d.toISOString().slice(0,7)}
function renderFood(){
  const p=S.profile,[mo]=monthsDays(p.birth,today()),st=stageOf(mo),start6=addMonths(p.birth,6);
  const byDate=(a,b)=>a.date<b.date?1:a.date>b.date?-1:0;
  const meals=S.meals.slice().sort((a,b)=>byDate(a,b)||(SLOTS.indexOf(b.slot)-SLOTS.indexOf(a.slot)));
  const first=meals[meals.length-1];
  const head=first?`<div class="nextcard" style="margin-top:14px"><span><small>급식 수사 진행 중</small><span class="t">${st?st[0]+' 단계':'준비 단계'}</span><small>${st?st[3]+', '+st[4]:'월령에 맞춰 조절해요'}</small></span><span class="d">D+${daysBetween(first.date,today())+1}</span></div>`
    :`<div class="nextcard" style="margin-top:14px"><span><small>급식 수사 개시 예정</small><span class="t">만 6개월 · ${fmtK(start6,true)}</span><small>시작 시기는 소아과와 상의해 4~6개월 사이에 정해요</small></span><span class="d">${daysBetween(today(),start6)>0?'D-'+daysBetween(today(),start6):'개시 대기'}</span></div>`;
  const band=`<div class="stages">${STAGES.map(([k,a,b])=>`<div class="${st&&st[0]===k?'on':''}"><b>${k}</b>${b>50?a+'개월~':a+'~'+b+'개월'}</div>`).join('')}</div>`;
  // 용의자 심문
  const act=S.foods.filter(f=>!f.result).sort((a,b)=>a.start<b.start?-1:1);
  const sus=act.map(f=>{const d=Math.max(1,daysBetween(f.start,today())+1);
    return `<div class="sus">${d>=3?'<span class="stamp">판정 대기</span>':''}<button class="nm" data-act="editfood" data-id="${f.id}">${esc(f.name)}</button>
      <div class="dots">${[1,2,3].map(i=>`<i class="${i<=d?'on':''}"></i>`).join('')}</div>
      <small>${d<=3?`심문 ${d}일차 / 3일`:`심문 ${d}일째, 3일 관찰 끝`} · ${fmtK(f.start,true)} 시작${f.by?' · '+f.by+' 수사관':''}</small>
      <div class="cacts"><button class="addv" data-act="foodbad" data-id="${f.id}">혐의 있음</button><button class="solve" data-act="foodok" data-id="${f.id}">무혐의 (통과)</button></div></div>`}).join('');
  // 도감
  const ok=tested(),bad=S.foods.filter(f=>f.result==='혐의');
  const has=w=>S.foods.some(f=>f.name.includes(w));
  const dex=`${ok.length||bad.length?`<div class="chips">${ok.map(f=>`<button class="chip" data-act="editfood" data-id="${f.id}">${esc(f.name)}</button>`).join('')}${bad.map(f=>`<button class="chip bad" data-act="editfood" data-id="${f.id}">✕ ${esc(f.name)}</button>`).join('')}</div>`:'<p class="vempty">심문을 통과한 식재료가 여기에 모여요.</p>'}
    <h2 class="sh" style="margin-top:14px"><span>알레르기 주의 식재료, 아직 미확인</span></h2>
    <div class="chips">${ALLERGY.filter(w=>!has(w)).map(w=>`<button class="chip todo" data-act="addfood" data-v="${w}">${w}</button>`).join('')||'<p class="vempty">모두 확인했어요.</p>'}</div>`;
  // 급식 기록
  const shown=S.mealAll?meals:meals.slice(0,10);
  const ml=shown.map(m=>`<button class="vrow" data-act="editmeal" data-id="${m.id}"><span class="vd" style="min-width:52px">${fmtMD(m.date)}<br>${esc(m.slot)}</span><span class="vn"><span>${esc(m.menu)}</span><small>${[m.amount,m.photo?'사진':'',m.by?m.by+' 수사관':''].filter(Boolean).map(esc).join(' · ')}</small></span>${m.eat?`<span class="eat ${m.eat==='거부'||m.eat==='절반'?'lo':''}">${esc(m.eat)}</span>`:''}</button>`).join('');
  const todayN=S.meals.filter(m=>m.date===today()).length;
  // 냉동 큐브
  const cubes=S.cubes.slice().sort((a,b)=>((+b.count>0)-(+a.count>0))||(a.made<b.made?-1:1));
  const cb=cubes.map(c=>{const age=c.made?daysBetween(c.made,today()):0,n=+c.count||0;
    return `<div class="vrow"><button class="vn" data-act="editcube" data-id="${c.id}" style="background:none;border:0;padding:0;text-align:left;${n?'':'opacity:.5'}"><span>${esc(c.name)}</span><small class="${n&&age>7?'old':''}">${c.made?(age>7?'만든 지 '+age+'일, 먼저 사용':'만든 지 '+age+'일'):''}${n?'':' · 소진'}</small></button>
      <span class="cnt"><button data-act="cubestep" data-id="${c.id}" data-v="-1" aria-label="하나 사용">−</button><b>${n}</b><button data-act="cubestep" data-id="${c.id}" data-v="1" aria-label="하나 추가">+</button></span></div>`}).join('');
  // 센터 식단
  const ym=curMenuMonth(),[yy,mm]=ym.split('-').map(Number),mn=S.menus.filter(m=>m.month===ym);
  const menus=mn.length?`<div class="menus">${mn.map(m=>{const ph=safeImg(PHOTOS[m.id]);return `<button data-act="viewmenu" data-id="${m.id}">${ph?`<img src="${ph}" alt="${esc(m.title)}" loading="lazy" decoding="async">`:`<span class="noph">${m.photo?'불러오는 중':'사진 없음'}</span>`}${esc(m.title||'식단표')}</button>`}).join('')}</div>`:'<p class="vempty">센터 식단표(PDF·사진)나 표준레시피 엑셀을 올려두면 두 수사관이 같이 볼 수 있어요.</p>';
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>급식 수사대</h1><p>이유식 기록, 새 식재료 심문, 냉동 큐브 보관</p></header>${CHARS.guide('food')}
  ${head}${band}
  <p class="foot" style="margin-top:8px">돌 전에는 꿀, 간(소금·설탕), 음료로 주는 생우유는 피해요. 새 재료는 한 번에 하나씩, 오전에 먹여 반응을 봐요.</p>
  <section><h2 class="sh" style="align-items:baseline"><span style="font-family:var(--display);font-size:21px;color:var(--navy);letter-spacing:0">용의자 심문</span><span>새 식재료 3일 관찰</span></h2>
    ${sus||'<p class="vempty">심문 중인 식재료가 없어요.</p>'}
    ${act.length>1?'<p class="note warn" style="margin-top:10px">새 재료를 동시에 여러 개 테스트하면 반응이 생겼을 때 원인을 찾기 어려워요.</p>':''}
    <button class="solve" data-act="addfood" style="width:100%;margin-top:14px;min-height:50px">+ 새 용의자 심문</button></section>
  <section><h2 class="sh"><span>식재료 수배 전단</span><span>통과 ${ok.length} · 혐의 ${bad.length}</span></h2>${dex}</section>
  <section><h2 class="sh" style="border-bottom:2px solid var(--ink);padding-bottom:6px"><span>급식 기록</span><span>오늘 ${todayN}회</span></h2>
    ${ml||'<p class="vempty">먹은 메뉴와 양, 먹은 정도를 기록해 보세요.</p>'}
    ${meals.length>10?`<button class="addperiod" data-act="mealall">${S.mealAll?'최근 10건만 보기':'전체 '+meals.length+'건 보기'}</button>`:''}
    <button class="solve" data-act="addmeal" style="width:100%;margin-top:14px;min-height:50px">+ 급식 기록</button></section>
  <section><h2 class="sh" style="border-bottom:2px solid var(--ink);padding-bottom:6px"><span>증거물 보관소 (냉동 큐브)</span><span>오래된 순</span></h2>
    ${cb||'<p class="vempty">만들어 둔 큐브를 입고하면 남은 개수를 셀 수 있어요.</p>'}
    <button class="addperiod" data-act="addcube">+ 큐브 입고</button></section>
  <section><h2 class="sh"><span>센터 식단</span><span class="mnav"><button data-act="mmon" data-v="-1" aria-label="이전 달">◀</button><b>${yy}.${mm}</b><button data-act="mmon" data-v="1" aria-label="다음 달">▶</button></span></h2>
    ${menus}
    ${RECIPES.foodHtml(ym)}
    <div class="cacts" style="margin-top:12px"><a class="linkbtn" href="${FOOD_URL}" target="_blank" rel="noopener">게시판 열기</a><button class="solve" data-r="pick">+ 식단표 올리기</button></div></section>`;
}
function openFood(id,preset){
  const f=id?S.foods.find(x=>x.id===id):{name:preset||'',start:today(),result:'',reaction:'',memo:''};
  const done=new Set(S.foods.map(x=>x.name));
  openSheet(`<h3>${id?'용의자 수정':'새 용의자 심문'}</h3>
    <label class="field"><span>식재료</span><input id="fd-name" maxlength="20" value="${esc(f.name)}" placeholder="예: 소고기">${id?'':`<div class="quick">${FIRSTF.filter(x=>!done.has(x)).slice(0,10).map(x=>`<button data-act="fill" data-t="fd-name" data-v="${x}">${x}</button>`).join('')}</div>`}</label>
    <label class="field"><span>심문 시작일</span><input id="fd-start" type="date" value="${f.start}" min="${S.profile.birth}"></label>
    ${id?`<div class="field"><span>판정</span><div class="quick" id="fd-res">${[['','심문 중'],['통과','무혐의 (통과)'],['혐의','혐의 있음']].map(([v,l])=>`<button data-act="pick1" data-v="${v}" class="${f.result===v?'on':''}">${l}</button>`).join('')}</div></div>
    <label class="field"><span>반응 (있었다면)</span><input id="fd-react" maxlength="60" value="${esc(f.reaction)}" placeholder="예: 입 주변 붉어짐"></label>`:''}
    <label class="field"><span>메모 (선택)</span><textarea id="fd-memo" maxlength="200" placeholder="예: 쌀미음에 섞어서 20g">${esc(f.memo||'')}</textarea></label>
    <p class="err" id="fd-err"></p>
    <div class="actions">${id?`<button class="danger" data-act="delfood" data-id="${id}">삭제</button>`:''}<button class="secondary" data-act="close">취소</button><button class="primary" data-act="savefood" data-id="${id||''}">저장</button></div>`);
}
function openBad(id){const f=S.foods.find(x=>x.id===id);
  openSheet(`<h3>${esc(f.name)}, 혐의 있음</h3>
    <label class="field"><span>어떤 반응이 있었나요?</span><input id="fb-react" maxlength="60" value="${esc(f.reaction||'')}" placeholder="예: 입 주변 붉어짐"><div class="quick">${REACTS.map(r=>`<button data-act="addreact" data-v="${r}">${r}</button>`).join('')}</div></label>
    <label class="field" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="fb-log" checked style="width:20px;height:20px"><span style="margin:0">긴급 출동 탭에 증상 기록도 남기기</span></label>
    <p class="note warn">숨쉬기 힘들어하거나, 얼굴·입술이 붓거나, 온몸에 두드러기가 번지면 바로 119나 응급실로 가세요.</p>
    <p class="err" id="fb-err"></p>
    <div class="actions"><button class="secondary" data-act="close">취소</button><button class="primary" data-act="savebad" data-id="${id}">혐의 기록</button></div>`);
}
function openMeal(id,preset){   // preset {date, tm}: 하루 수사 탭의 🥣 이유식 단추에서
  const nowHM=(()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')})();
  const m=id?S.meals.find(x=>x.id===id):Object.assign({date:today(),tm:nowHM,slot:(()=>{const h=new Date().getHours();return h<11?'아침':h<15?'점심':h<20?'저녁':'간식'})(),menu:'',amount:'',eat:'',memo:''},preset||{});
  pending=undefined;
  const names=tested().map(f=>f.name).concat(S.cubes.filter(c=>+c.count>0).map(c=>c.name)).filter((x,i,a)=>a.indexOf(x)===i).slice(0,12);
  openSheet(`<h3>${id?'급식 기록 수정':'급식 기록'}</h3>
    <div class="wkf2"><label class="field"><span>날짜</span><input id="ml-date" type="date" value="${m.date}" min="${S.profile.birth}" max="${today()}"></label><label class="field"><span>먹인 시각</span><input id="ml-tm" type="time" value="${esc(m.tm||'')}"></label></div>
    <div class="field"><span>끼니</span><div class="quick" id="ml-slot">${SLOTS.map(x=>`<button data-act="pick1" data-v="${x}" class="${m.slot===x?'on':''}">${x}</button>`).join('')}</div></div>
    <label class="field"><span>메뉴</span><input id="ml-menu" maxlength="60" value="${esc(m.menu)}" placeholder="예: 소고기 애호박 죽">${names.length?`<div class="quick">${names.map(x=>`<button data-act="addmenu1" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:''}</label>
    <label class="field"><span>먹은 양 (선택)</span><input id="ml-amt" maxlength="20" value="${esc(m.amount)}" placeholder="예: 60g"></label>
    <div class="field"><span>먹은 정도</span><div class="quick" id="ml-eat">${EATS.map(x=>`<button data-act="pick1" data-v="${x}" class="${m.eat===x?'on':''}">${x}</button>`).join('')}</div></div>
    ${photoField(id?safeImg(PHOTOS[id]):'')}
    <label class="field"><span>메모 (선택)</span><textarea id="ml-memo" maxlength="200" placeholder="예: 처음엔 뱉다가 두 숟가락부터 잘 먹음">${esc(m.memo||'')}</textarea></label>
    <p class="err" id="ml-err"></p>
    <div class="actions">${id?`<button class="danger" data-act="delmeal" data-id="${id}">삭제</button>`:''}<button class="secondary" data-act="close">취소</button><button class="primary" data-act="savemeal" data-id="${id||''}">저장</button></div>`);
}
function openCube(id){
  const c=id?S.cubes.find(x=>x.id===id):{name:'',count:'',made:today(),memo:''};
  openSheet(`<h3>${id?'큐브 수정':'큐브 입고'}</h3>
    <label class="field"><span>큐브 이름</span><input id="cb-name" maxlength="20" value="${esc(c.name)}" placeholder="예: 소고기">${id?'':`<div class="quick">${tested().slice(0,8).map(f=>`<button data-act="fill" data-t="cb-name" data-v="${esc(f.name)}">${esc(f.name)}</button>`).join('')}</div>`}</label>
    <label class="field"><span>개수</span><input id="cb-count" type="number" inputmode="numeric" min="0" max="99" value="${esc(c.count)}" placeholder="예: 12"></label>
    <label class="field"><span>만든 날</span><input id="cb-made" type="date" value="${c.made}" max="${today()}"></label>
    <label class="field"><span>메모 (선택)</span><input id="cb-memo" maxlength="60" value="${esc(c.memo||'')}" placeholder="예: 1개 15g"></label>
    <p class="err" id="cb-err"></p>
    <div class="actions">${id?`<button class="danger" data-act="delcube" data-id="${id}">삭제</button>`:''}<button class="secondary" data-act="close">취소</button><button class="primary" data-act="savecube" data-id="${id||''}">저장</button></div>`);
}
function openMenu(id){
  const m=id?S.menus.find(x=>x.id===id):{month:curMenuMonth(),title:''};
  pending=undefined;
  openSheet(`<h3>${id?'식단표 수정':'식단표 올리기'}</h3>
    <label class="field"><span>월</span><input id="mn-month" type="month" value="${m.month}"></label>
    <label class="field"><span>제목</span><input id="mn-title" maxlength="30" value="${esc(m.title)}" placeholder="예: 중기 식단">${`<div class="quick">${['초기 식단','중기 식단','후기 식단','완료기 식단','표준레시피'].map(x=>`<button data-act="fill" data-t="mn-title" data-v="${x}">${x}</button>`).join('')}</div>`}</label>
    ${photoField(id?safeImg(PHOTOS[id]):'','식단표 사진 (게시판 첨부를 캡처해서 올려요)',true)}
    <p class="err" id="mn-err"></p>
    <div class="actions">${id?`<button class="danger" data-act="delmenu" data-id="${id}">삭제</button>`:''}<button class="secondary" data-act="close">취소</button><button class="primary" data-act="savemenu" data-id="${id||''}">저장</button></div>`);
}
function viewMenu(id){const m=S.menus.find(x=>x.id===id),ph=safeImg(PHOTOS[id]);
  openSheet(`<h3>${esc(m.title||'식단표')}</h3>${ph?`<img class="bigimg" src="${ph}" alt="${esc(m.title||'식단표')}">`:'<p class="vempty">사진을 불러오는 중이에요.</p>'}
    <p class="foot" style="margin-top:0">두 손가락으로 벌려서 크게 볼 수 있어요.</p>
    <div class="actions"><button class="secondary" data-act="editmenu" data-id="${id}">수정</button><button class="primary" data-act="close">닫기</button></div>`);
}

// 탭 맨 아래 '탐정 수첩' 한 줄 (날마다 바뀜)
const NOTES=['작은 단서도 놓치지 말 것. — 탐정 수칙 제1조','기록은 기억보다 힘이 세다.','진실은 언제나 하나, 귀여움은 언제나 무한.','오늘의 증거 사진 한 장이 10년 뒤의 보물.','수사관도 쉬어야 수사가 된다. 엄마·아빠도 꼭 쉬기!','괴도 깍정이는 기록이 없는 날을 노린다.','관찰하라, 그리고 사랑하라.','탐정의 무기는 돋보기, 수사관의 무기는 체력.','울음에도 이유가 있다. 배고픔·졸림·기저귀부터 수사.','첫 순간은 다시 오지 않는다. 최초 목격은 바로 기록!','증거는 사진으로, 감동은 메모로.','범인은 늘 가까이에… 대개 소파 밑에.','오늘 웃은 횟수: 셀 수 없음. 수사 종결.','탐정 사무소 영업시간: 24시간 (특히 새벽 3시).','단서 하나, 웃음 둘, 뽀뽀 셋.','불가능한 걸 지우고 남은 것이 진실. 대개는 졸린 거다.','오늘 못 한 기록은 내일의 단서로.','명탐정은 낮잠도 수사의 일부.'];
function noteFoot(){if(S.mode!=='ok'||!S.profile||!S.profile.birth)return '';const d=dayNo(today());return `<p class="notefoot"><span>🐾 ${esc(CV.nick())} 탐정 사무소 · 수사 ${d}일째</span><small>오늘의 수첩: “${NOTES[d%NOTES.length]}”</small></p>`}
// 설정(settings.js)에서 고른 것: 숨긴 탭, 첫 화면 카드 (이 폰에만)
function hiddenTabs(){try{const v=JSON.parse(localStorage.getItem('soeun-tabs-off')||'[]');return Array.isArray(v)?v.filter(k=>['day','town','album','vac','food','sick'].includes(k)):[]}catch(e){return[]}}
function homeOn(k){try{const v=JSON.parse(localStorage.getItem('soeun-home-off')||'[]');return !(Array.isArray(v)&&v.includes(k))}catch(e){return true}}
