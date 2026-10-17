// 화면 그리기: render()·성장 수사·예방접종 탭·그래프·탭 바 — index.html에서 나눈 전역 스크립트 (순서: main-core → render → sick → album → meal → sheets → boot)
// ---------- rendering ----------
const $app=document.getElementById('app'),$tab=document.getElementById('tabbar');
function sorted(){return S.records.slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0)}
function latest(k){const r=sorted().filter(r=>r[k]!=null&&r[k]!=='');return r[r.length-1]||null}
const CLIP='<svg class="clip" width="22" height="46" viewBox="0 0 22 46" fill="none" stroke="#7D8594" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 30V9a5 5 0 0 1 10 0v26a8 8 0 0 1-16 0V12"></path></svg>';
const CHECK='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B3261E" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>';
const I_LENS='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6"></circle><path d="M15 15l6 6"></path><path d="M7.5 11.5l2-2 1.5 1.5 2-2.5"></path></svg>';
const I_SIREN='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18v-5a6 6 0 0 1 12 0v5"></path><path d="M4 18h16v3H4z"></path><path d="M12 3V1"></path><path d="M4.5 6.5 3 5"></path><path d="M19.5 6.5 21 5"></path></svg>';
const I_SPOON='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="8" cy="7" rx="3.5" ry="5"></ellipse><path d="M8 12v10"></path><path d="M15 2v7a2 2 0 0 0 4 0V2"></path><path d="M17 2v20"></path></svg>';
const I_CAM='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h4l2-3h4l2 3h4v13H4z"></path><circle cx="12" cy="13" r="4"></circle></svg>';
const I_PIN='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"></path><circle cx="12" cy="11" r="2.2"></circle><path d="M4 21h16"></path></svg>';
const I_FILE='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h7l2 2h9v11H3z"></path><path d="M8 14l2.5 2.5L16 11"></path></svg>';
const I_BOTTLE='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 4.5C10.5 3 11.1 2 12 2s1.5 1 1.5 2.5"></path><path d="M8.5 4.5h7V7h-7z"></path><path d="M9 7 8 9.5V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9.5L15 7"></path><path d="M8 13h3M8 16.5h3"></path></svg>';

function render(){
  if(S.mode!=='ok')$app.__h='';
  if(S.mode==='loading'){$app.innerHTML=`<div class="loading"><div class="lchase" aria-hidden="true"><span class="lth">${CHARS.svg('thief','acorn',{size:78})}</span><span class="lbb">${CHARS.svg('baby','lens',{size:88})}</span><i class="lpaws"></i></div>사건 파일을 여는 중…<br><small>괴도 깍정이의 발자국을 쫓는 중</small></div>`;$tab.innerHTML='';$tab.__h='';return}
  if(S.mode==='error'){$app.innerHTML=`<div class="loading">시트를 불러오지 못했어요.<br><small>${esc(S.err)}</small><br><br><button class="secondary" data-act="retry">다시 시도</button></div>`;$tab.innerHTML='';$tab.__h='';return}
  if(!S.profile||!S.profile.birth){$app.__h='';renderOnboarding();$tab.innerHTML='';$tab.__h='';return}
  const HID=hiddenTabs(),POP=S.tab!==render.lastTab;render.lastTab=S.tab;   // 설정에서 숨긴 탭 (지금 보고 있는 탭은 잠깐 보여요) · 탭을 바꾼 때만 아이콘 톡
  const TH=[['grow','성장 수사',I_LENS],['day','하루 수사',I_BOTTLE],['town','동네 탐문',I_PIN],['album','사건 앨범',I_CAM],['vac','예방접종',I_FILE],['food','급식 수사',I_SPOON],['sick','긴급 출동',I_SIREN]].filter(([k])=>k===S.tab||!HID.includes(k)).map(([k,l,i])=>`<button class="${S.tab===k?'on':''}" data-act="tab" data-v="${k}" aria-current="${S.tab===k?'page':'false'}">${i}<span>${l}</span></button>`).join('');
  if($tab.__h!==TH){$tab.innerHTML=TH;$tab.__h=TH;$tab.classList.toggle('t7',TH.split('data-act="tab"').length>7)}   // 그대로면 다시 안 그려요 (톡 애니메이션이 끊기지 않게)
  if(POP){const b=$tab.querySelector('button.on');if(b){b.classList.add('pop');setTimeout(()=>b.classList.remove('pop'),700)}}   // 탭이 바뀌면 단추도 새로 그려져서 바로 붙여요
  const body=S.view==='report'?renderReport():S.view==='town'?TOWN.render():S.view==='posts'?POSTS.render():S.view==='medals'?GAME.medals():S.view==='book'?BOOK.render():S.view==='fun'?FUN.render():S.view==='play'?GAME.play():S.view==='studio'?STUDIO.render():S.view==='movie'?MOVIE.render():S.view==='wanted'?WANTED.render():S.view==='look'?LOOK.render():S.view==='capsule'?CAPSULE.render():S.view==='paper'?PAPER.render():S.view==='explore'?EXPLORE.render():S.view==='walk'?WALK.render():S.view==='hosp'?HOSP.render():S.view==='settings'?SETTINGS.render():S.view==='claims'?CLAIM.render():S.view==='recipe'?RECIPES.render():S.tab==='vac'?renderVac():S.tab==='sick'?renderSick():S.tab==='album'?renderAlbum():S.tab==='town'?(S.townView==='info'?TOWN.render():EXPLORE.render('tab')):S.tab==='food'?renderFood():S.tab==='day'?DAY.render():renderGrow();
  document.body.classList.toggle('viewer',!!(S.me&&S.me.viewer));
  const html=(DEMO?'<p class="banner">미리보기 화면이에요. 예시 데이터이고 저장되지 않아요.</p>':'')+(S.me&&S.me.viewer&&!S.view?'<p class="banner vban">👀 보기 전용으로 보고 있어요. 기록은 엄마·아빠 수사관이 남겨요.</p>':'')+body+(S.view?'':noteFoot());
  // 다른 폰에서 온 데이터로 다시 그릴 때(render.soft) 지금 화면 글이 그대로면 DOM을 건드리지 않아요 — 지도·사진·스크롤이 다시 그려지지 않게 (2026.10.13)
  if(render.soft&&$app.__h===html){GAME.check();WANTED.check();FUN.check();DAY.afterRender();return}
  $app.innerHTML=html;$app.__h=html;
  if(S.view==='hosp'||HOSP.on())HOSP.mount();
  if(S.view==='studio')STUDIO.mount();
  if(S.view==='paper')PAPER.mount();
  if(S.view==='explore'||(S.tab==='town'&&!S.view&&S.townView!=='info'))EXPLORE.mount();
  if(S.view==='walk')WALK.mount();
  if(S.tab==='album'&&!S.view&&S.albumView==='board')BOARD.mount();
  cachePhSoon();stayAfterRender();ALBUM.afterRender();POSTS.sync();GAME.check();WANTED.check();FUN.check();FUN.afterRender();WALK.afterRender();DAY.afterRender();if(window.FOCUS)FOCUS.apply($app);
  NAVcur={tab:S.tab,view:_view,albumView:S.albumView,vacView:S.vacView,townView:S.townView,sickView:S.sickView||''};
}

const REC_SHOW=5;   // 수사 기록은 최근 몇 건만 펼쳐 두고 나머지는 접어요
function renderGrow(){
  const p=S.profile,t=today(),d=Math.max(0,daysBetween(p.birth,t))+1,[mo,rd]=monthsDays(p.birth,t);
  let ms='';
  if(d<100)ms=`100일까지 ${100-d}일`;else if(d===100)ms='오늘 100일';
  else{const fb=`${+p.birth.slice(0,4)+1}${p.birth.slice(4)}`,left=daysBetween(t,fb);if(left>0)ms=`첫 돌까지 ${left}일`;else if(left===0)ms='오늘 첫 돌'}
  const [by,bm,bd]=p.birth.split('-').map(Number);
  const photo=safeImg(PHOTOS.profile);
  const pol=photo?`<button class="polaroid" data-view="profile" aria-label="사진 크게 보기"><img src="${photo}" alt="${esc(p.name)} 사진"><span class="cap">${fmtDate(t)}</span>${CLIP}</button>`
                 :`<button class="polaroid empty" data-act="settings">${CHARS.svg('baby','camera',{size:96})}<span>사진 증거<br>추가하기</span></button>`;
  const np=nextPeriod();
  let next='';
  if(np){const vs=vacsOf(np.id).filter(v=>!v.done),dt=pDate(np),late=daysBetween(t,dt)<0;
    next=`<button class="nextcard" data-act="tab" data-v="vac"><span><small>다음 출동${np.confirmed?', 병원 예약 확정':', 권장일 기준'}</small><span class="t">${esc(np.name)} 접종, ${fmtK(dt)}</span><small>${esc(vs[0].name)}${vs.length>1?` 외 ${vs.length-1}건`:''}</small></span><span class="d">${ddayText(dt)}</span></button>`}

  const stats=ORDER.map(k=>{
    const r=latest(k);let v='미확보',pc='기록 없음',cls='',dt='';
    if(r){const m=daysBetween(p.birth,r.date)/MONTH,pp=pct(k,m,+r[k]);v=fmt(k,r[k])+KINDS[k].unit;pc=pctText(pp);if(pp<3||pp>97)cls='warn';const[,mm,dd]=r.date.split('-').map(Number);dt=`${mm}월 ${dd}일 측정`}
    return `<button class="stat ${S.chart===k?'on':''}" data-act="chart" data-v="${k}"><div class="l">${KINDS[k].label}</div><div class="v${k==='weight'?' vw':''}">${v}</div><div class="p ${cls}">${pc}</div>${dt?`<div class="dt">${dt}</div>`:''}</button>`;
  }).join('');

  const k=S.chart,lr=latest(k);let note='';
  if(lr){const m=daysBetween(p.birth,lr.date)/MONTH,pp=pct(k,m,+lr[k]),med=valAt(k,m,0),diff=+lr[k]-med;
    const dtxt=k==='weight'?`${Math.abs(Math.round(diff*1000))}g`:`${Math.abs(diff).toFixed(1)}cm`;
    const more=k==='weight'?(diff>=0?'많아요':'적어요'):(diff>=0?'커요':'작아요');
    note=(pp<3||pp>97)?`<p class="note warn">${KINDS[k].label}가 정상 범위(3~97백분위) 밖에 있어요. 다음 영유아 검진 때 소아과 선생님과 상의해 보세요.</p>`
      :`<p class="note">마지막 기록 기준, 같은 날 태어난 ${sexWord()} 평균보다 ${dtxt} ${more}.</p>`}

  const list=sorted().reverse();
  const rows=list.length?list.map((r,idx)=>{
    const dd=daysBetween(p.birth,r.date);
    const vals=ORDER.filter(k=>r[k]!=null&&r[k]!=='').map(k=>`<span>${k!=='weight'?`<small>${KINDS[k].label}</small>`:''}${fmt(k,r[k])}${KINDS[k].unit}</span>`).join('');
    let delta='';
    if(r.weight!=null&&r.weight!==''){const prev=list.slice(idx+1).find(x=>x.weight!=null&&x.weight!=='');
      if(prev){const g=Math.round((r.weight-prev.weight)*1000),gap=daysBetween(prev.date,r.date);
        delta=`<div class="rec-delta">지난 기록보다 <b>${g>=0?'+':''}${g}g</b>${gap>0?`, 하루 평균 ${Math.round(g/gap)}g`:''}</div>`}}
    return `<li class="rec" data-act="editrec" data-id="${esc(r.id)}" tabindex="0"><div class="rec-date"><b>${fmtDate(r.date)}</b><span>수사 ${dd+1}일째${r.by?`, ${r.by} 수사관`:''}</span></div><div class="rec-vals">${vals}</div>${delta}${r.memo?`<div class="rec-memo">${esc(r.memo)}</div>`:''}${safeImg(PHOTOS[r.id])?`<img class="rec-thumb" src="${safeImg(PHOTOS[r.id])}" alt="증거 사진 크게 보기" data-view="${esc(r.id)}">`:''}</li>`;
  }).slice(0,S.recAll?undefined:REC_SHOW).join(''):'<li class="emptylist">아래 버튼으로 첫 증거를 기록해 보세요.</li>';

  return `
  <div class="filebar"><span>사건 파일 No.${fileNo()}</span><span class="fbr"><button class="ghost" data-act="settings">탐정 정보</button><button class="ghost stgear" data-stg="open" aria-label="설정">⚙️</button></span></div>
  <div class="squad"><span class="lab">명탐정을 돕는 수사관</span><div class="badges">${['엄마','아빠'].map(r=>{const k=r==='엄마'?'mom':'dad',nm=p[k],ph=safeImg(PHOTOS[k]);return `<button class="idb ${myRole()===r?'me':''}" data-act="idcard" data-v="${r}">${ph?`<img class="ph" src="${ph}" alt="${r} 수사관 사진">`:`<span class="ph chrph">${CHARS.svg(k,'',{face:1,size:52})}</span>`}<span class="tx"><b>${r} 수사관</b>${GAME.rankHtml(r)}<span>${nm?esc(nm):'사진, 이름 추가'}</span>${myRole()===r?'<em style="align-self:flex-start;margin-top:2px">나</em>':''}</span></button>`}).join('')}</div></div>
  <div class="suspect">${pol}
    <div class="info"><span class="lab">🕵️ 유능한 명탐정</span><b class="nm">${esc(p.name||'우리 아기')}</b><span>${by}년 ${bm}월 ${bd}일생</span><span>${mo}개월 ${rd}일째</span>${ms?`<span class="stamp">${ms}</span>`:''}</div>
  </div>
  <div class="dday" aria-label="생후 ${d}일"><span>수사</span><b>${d}</b><span>일째</span></div>
  ${(()=>{const oc=CV.occasion();if(!oc.label)return '';const today_=!oc.soon,dd=daysBetween(today(),oc.date);
    return `<div class="anniv"><span class="anb">${today_?'🎉':'⏳'}</span><span class="ant"><b>${today_?`오늘은 ${esc(CV.nick())} ${oc.label}!`:`${oc.label}까지 ${dd}일!`}</b><small>${today_?'기념 사진·영상을 만들어 가족에게 보내요':'미리 기념 사진·영상을 준비해 둘까요?'}</small></span>
      <span class="anbt"><button data-st="open">📸 기념 사진</button><button data-mvset="open" data-v="${/일$/.test(oc.label)&&oc.label==='100일'?'d100':'story'}">🎬 기념 영상</button></span></div>`})()}
  ${homeOn('capsule')?CAPSULE.banner():''}${homeOn('paper')?PAPER.banner():''}
  ${CHARS.guide('grow')}${homeOn('game')?GAME.card():''}${homeOn('thief')?WANTED.card():''}
  ${next}${CHECKUPS.nextCard()}
  ${homeOn('charges')?CHARGES.html():''}
  ${homeOn('look')?LOOK.card():''}
  <section><h2 class="sh">증거 기록</h2><div class="stats">${stats}</div></section>
  ${homeOn('guess')?GAME.guessHtml():''}
  <section>
    <h2 class="sh"><span>성장 그래프</span><span>WHO ${sexWord()} 기준</span></h2>
    <div class="seg">${ORDER.map(x=>`<button class="${S.chart===x?'on':''}" data-act="chart" data-v="${x}">${KINDS[x].label}</button>`).join('')}</div>
    ${chart(k)}
    <div class="legend"><span><i style="background:var(--band2)"></i>15~85백분위</span><span><i style="background:var(--band1)"></i>3~97백분위</span><span><i style="background:var(--navy);height:3px"></i>평균</span><span><i style="background:var(--red);border-radius:50%;width:10px"></i>${esc(p.name||'우리 아기')}</span></div>
    ${note}
  </section>
  <section>
    <h2 class="sh" id="rec-head"><span>수사 기록</span><span>${list.length}건</span></h2>
    <ul class="recs">${rows}</ul>
    ${list.length>REC_SHOW?`<button class="addperiod" data-act="recall">${S.recAll?'최근 '+REC_SHOW+'건만 보기 ▴':'전체 '+list.length+'건 보기 ▾'}</button>`:''}
    <p class="foot">수사 일수는 태어난 날을 1일로 세요. 백분위는 한국 소아청소년 성장도표(3세 미만 WHO 기준)를 따르고, 참고용이에요.</p>
  </section>
  <button class="fab" data-act="addrec">+ 새 증거 기록</button>`;
}

function caseHtml(p,hot,solved){
  const vs=vacsOf(p.id),dt=pDate(p),rd=recDate(p),n=daysBetween(today(),dt);
  let dline;
  if(solved){const last=vs.map(v=>v.done).sort().pop();dline=`<div class="dline"><small>${last?fmtK(last)+' 해결':''}${p.hospital?', '+esc(p.hospital):''}</small><button class="ghost" data-act="editp" data-id="${p.id}">편집</button></div>`}
  else if(p.confirmed)dline=`<div class="dline"><div><b>${fmtK(p.confirmed)}</b><span class="badge">예약 확정</span><small>${rd?'권장 '+fmtK(rd,true):''}${rd&&p.hospital?', ':''}${esc(p.hospital||'')}</small></div><button class="ghost" data-act="editp" data-id="${p.id}">편집</button></div>`;
  else dline=`<div class="dline"><span class="recd">${rd?fmtK(rd)+'경 (권장)':'날짜 미정'}</span><button class="ghost" data-act="editp" data-id="${p.id}">예약일 입력</button></div>`;
  const rows=vs.length?vs.map(v=>`<button class="vrow" data-act="editv" data-id="${v.id}"><span class="box">${v.done?CHECK:''}</span><span class="vn"><span>${esc(v.name)}</span>${v.sub?`<small>${esc(v.sub)}</small>`:''}</span>${v.done?`<span class="vd">${fmtMD(v.done)}${v.by?', '+v.by:''}</span>`:''}</button>`).join('')
    :'<p class="vempty">이 시기에 등록된 백신이 없어요.</p>';
  const dd=solved?'':`<span class="dd ${hot||n<=31?'':'far'}">${ddayText(dt)}</span>`;
  return `<article class="case ${hot?'hot':''} ${solved?'solved':''}">
    ${solved?'<span class="stamp">해결</span>':''}
    <span class="no">CASE ${caseNo(p)}</span>
    <div class="top"><h3>${esc(p.name)}</h3>${dd}</div>
    ${dline}${rows}
    <div class="cacts"><button class="addv" data-act="addv" data-id="${p.id}">+ 백신 추가</button>${!solved&&vs.some(v=>!v.done)?`<button class="solve" data-act="solve" data-id="${p.id}">사건 해결 처리</button>`:''}</div>
  </article>`;
}
function renderVac(){
  const up=S.periods.filter(p=>!pDone(p)).sort(byDate),sol=S.periods.filter(pDone).sort((a,b)=>-byDate(a,b));
  const doneN=S.vaccines.filter(v=>v.done).length,left=S.vaccines.length-doneN;
  const vv=S.vacView==='check'||S.vacView==='dev'?S.vacView:'vac';
  const vseg=`<div class="seg">${[['vac','<i>💉</i>예방접종'],['check','<i>🩺</i>영유아검진'],['dev','<i>🧸</i>발달 체크']].map(([k,l])=>`<button class="${vv===k?'on':''}" data-ck="view" data-v="${k}">${l}</button>`).join('')}</div>`;
  if(vv==='dev')return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>발달 체크</h1>${vseg}<p>월령별로 흔히 보이는 모습이에요. 영유아검진 문진표 쓸 때 도움이 돼요.</p></header>${DEV.render()}`;
  if(S.vacView==='check')return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>영유아검진 출동 기록부</h1>${vseg}<p>검진 기간은 태어난 날로 계산했어요. 받으면 "검진 받았어요"로 해결 처리해 주세요.</p></header>${CHECKUPS.render()}`;
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>예방접종 출동 기록부</h1>${vseg}
    <p>해결 ${doneN}건, 남은 접종 ${left}건. 권장일은 표준 일정으로 계산했어요. 병원 예약을 하면 날짜를 바꿔 두세요.</p></header>${CHARS.guide('vac')}
  ${up.map((p,i)=>caseHtml(p,i===0,false)).join('')}
  <button class="addperiod" data-act="newp">+ 접종 시기 추가</button>
  ${sol.length?'<h2 class="subh">해결된 사건</h2>'+sol.map(p=>caseHtml(p,false,true)).join(''):''}
  <p class="foot">표준 일정은 질병관리청 국가예방접종 일정을 바탕으로 넣었어요. 병원 안내나 예방접종도우미 기록과 다르면 편집해서 맞춰 주세요.</p>
  ${TOWN.disHtml()}`;
}

function chart(k){
  const p=S.profile,t=today();
  const pts=S.records.filter(r=>r[k]!=null).map(r=>({m:daysBetween(p.birth,r.date)/MONTH,v:+r[k]})).filter(q=>q.m>=0&&q.m<=24).sort((a,b)=>a.m-b.m);
  const nowM=Math.min(24,daysBetween(p.birth,t)/MONTH);
  const maxM=Math.max(nowM,...pts.map(q=>q.m),0);
  const x1=Math.min(24,Math.max(4,Math.ceil(maxM+1.5)));
  const W=360,H=240,pl=36,pr=26,pt=12,pb=30,iw=W-pl-pr,ih=H-pt-pb;
  let lo=valAt(k,0,-2.1),hi=valAt(k,x1,2.1);
  pts.forEach(q=>{lo=Math.min(lo,q.v);hi=Math.max(hi,q.v)});
  const span=hi-lo,cand=[.5,1,2,5,10];const step=cand.find(s=>span/s<=6)||10;
  lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;
  const X=m=>pl+m/x1*iw,Y=v=>pt+(1-(v-lo)/(hi-lo))*ih;
  const N=60,ms=[...Array(N+1)].map((_,i)=>i/N*x1);
  const curve=z=>ms.map(m=>[X(m),Y(valAt(k,m,z))]);
  const poly=(a,b)=>a.concat(b.slice().reverse()).map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ');
  const line=a=>a.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join('');
  const zs={3:-1.881,15:-1.036,50:0,85:1.036,97:1.881};
  const c={};for(const key in zs)c[key]=curve(zs[key]);
  let g='';
  for(let v=lo;v<=hi+1e-9;v+=step){g+=`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${pl-6}" y="${Y(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${+v.toFixed(1)}</text>`}
  const xs=x1<=8?1:x1<=14?2:3;
  for(let m=0;m<=x1;m+=xs){g+=`<text x="${X(m)}" y="${H-10}" text-anchor="middle" font-size="10" fill="var(--muted)">${m}</text>`}
  g+=`<text x="${W-pr}" y="${H-10}" text-anchor="end" font-size="10" fill="var(--muted)" dx="22">개월</text>`;
  g+=`<text x="${pl-6}" y="${pt-2}" text-anchor="end" font-size="10" fill="var(--muted)">${KINDS[k].unit}</text>`;
  let bands=`<polygon points="${poly(c[3],c[97])}" fill="var(--band1)"/><polygon points="${poly(c[15],c[85])}" fill="var(--band2)"/><path d="${line(c[50])}" fill="none" stroke="var(--median)" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  for(const key of [3,50,97]){const e=c[key][N];bands+=`<text x="${e[0]+4}" y="${e[1]+3.5}" font-size="9.5" fill="var(--muted)">${key}</text>`}
  const today_=`<line x1="${X(nowM)}" x2="${X(nowM)}" y1="${pt}" y2="${pt+ih}" stroke="var(--rose)" stroke-opacity=".35" stroke-dasharray="2 3"/><text x="${X(nowM)}" y="${pt+ih-4}" text-anchor="middle" font-size="9.5" fill="var(--rose)" dx="${X(nowM)>W-pr-20?-14:0}">오늘</text>`;
  let baby='';
  if(pts.length){
    baby+=`<path d="${line(pts.map(q=>[X(q.m),Y(q.v)]))}" fill="none" stroke="var(--rose)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((q,i)=>{const last=i===pts.length-1;baby+=last?`<circle cx="${X(q.m)}" cy="${Y(q.v)}" r="9" fill="var(--rose)" fill-opacity=".18"/><circle cx="${X(q.m)}" cy="${Y(q.v)}" r="5" fill="var(--rose)" stroke="var(--surface)" stroke-width="2"/>`:`<circle cx="${X(q.m)}" cy="${Y(q.v)}" r="3.4" fill="var(--rose)" stroke="var(--surface)" stroke-width="1.5"/>`});
  }
  return `<div class="chartbox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${KINDS[k].label} 성장 곡선">${bands}${g}${today_}${baby}</svg>${pts.length?'':`<div class="empty">아직 ${KINDS[k].label} 기록이 없어요</div>`}</div>`;
}


function renderOnboarding(){
  $app.innerHTML=`<div class="onb">
    <div style="display:flex;gap:4px;align-items:flex-end;margin-bottom:6px">${CHARS.svg('mom','heart',{size:86})}${CHARS.svg('baby','lens',{size:110})}${CHARS.svg('dad','note',{size:86})}</div>
    <p class="big">성장 수사 일지</p>
    <p>명탐정의 이름과 태어난 날을 알려 주세요. 생후 일수, 성장곡선, 예방접종 일정을 자동으로 계산해요.</p>
    <label class="field"><span>이름 (애칭도 좋아요)</span><input id="ob-name" maxlength="20" placeholder="우리 아기"></label>
    <label class="field"><span>태어난 날</span><input id="ob-birth" type="date" max="${today()}"></label>
    <div class="field"><span>성별 (성장곡선 기준)</span><div class="quick" id="ob-sex">${[['F','여아'],['M','남아']].map(([v,l])=>`<button data-act="picksex" data-v="${v}" class="${'F'===v?'on':''}">${l}</button>`).join('')}</div></div>
    <p class="err" id="ob-err"></p>
    <div class="actions"><button class="primary" data-act="start">수사 시작</button></div>
  </div>`;
}

