// 편집창(sheet)들과 클릭 처리(switch data-act) — index.html에서 나눈 전역 스크립트 (순서: main-core → render → sick → album → meal → sheets → boot)
// ---------- sheets ----------
const $sheet=document.getElementById('sheet'),$scrim=document.getElementById('scrim');
// 같은 창을 다시 그릴 때(제목이 같으면)는 '적던 중' 표시를 그대로 둬요
const sheetTitle=()=>{const h=$sheet.querySelector('h3');return h?h.textContent.trim():''};
function openSheet(html){const w=myRole()==='아빠'?'dad':myRole()==='엄마'?'mom':'baby',was=$sheet.classList.contains('open')?sheetTitle():'';$sheet.innerHTML=html.replace('<h3>',`<h3><span class="shc">${CHARS.svg(w,'',{face:1,size:40})}</span>`);if(window.FOCUS)FOCUS.apply($sheet);if(!was||was!==sheetTitle())delete $sheet.dataset.dirty;$sheet.style.transform='';$scrim.style.opacity='';$scrim.classList.add('open');$sheet.classList.add('open');$sheet.scrollTop=0;document.documentElement.classList.add('shopen')}
function closeSheet(){document.documentElement.classList.remove('shopen');$sheet.classList.remove('open','nudge');$scrim.classList.remove('open');$sheet.style.transform='';$scrim.style.opacity='';delete $sheet.dataset.dirty}
// 적던 창은 바깥 누르기·뒤로가기·끌어내리기로 바로 닫지 않고 한 번 더 확인 (2.5초 안에 한 번 더 하면 닫혀요). 닫기·취소 단추는 바로 닫혀요
let sheetWarn=0;
function sheetDirty(){if($sheet.classList.contains('open'))$sheet.dataset.dirty='1'}
function softClose(){
  if(!$sheet.classList.contains('open'))return true;
  if($sheet.dataset.dirty==='1'&&Date.now()-sheetWarn>2500){sheetWarn=Date.now();toast('한 번 더 하면 닫혀요 · 적던 내용은 사라져요');$sheet.style.transform='';$scrim.style.opacity='';$sheet.classList.remove('nudge');void $sheet.offsetWidth;$sheet.classList.add('nudge');return false}
  sheetWarn=0;closeSheet();return true
}
['input','change'].forEach(ev=>$sheet.addEventListener(ev,e=>{if(e.target.matches&&e.target.matches('input,textarea,select'))sheetDirty()},true));
$sheet.addEventListener('click',e=>{if(e.target.closest('.chip'))sheetDirty()},true);
$scrim.addEventListener('click',softClose);
// 창 맨 위(손잡이)나, 맨 위까지 올린 상태에서 아래로 끌면 닫혀요 (지도·입력칸 위에서는 안 함)
(()=>{let d=null;
  $sheet.addEventListener('touchstart',e=>{d=null;if(e.touches.length!==1||!$sheet.classList.contains('open')||e.target.closest('input,textarea,select,[contenteditable],[data-noswipe],.expickmap'))return;const t=e.touches[0],r=$sheet.getBoundingClientRect();d={x:t.clientX,y:t.clientY,t:Date.now(),hd:t.clientY-r.top<48,top:$sheet.scrollTop<=0,on:false,dy:0}},{passive:true});
  $sheet.addEventListener('touchmove',e=>{if(!d)return;const t=e.touches[0],dy=t.clientY-d.y,dx=t.clientX-d.x;
    if(!d.on){if(Math.abs(dx)>Math.abs(dy)+4){d=null;return}if(dy>10&&(d.hd||(d.top&&$sheet.scrollTop<=0))){d.on=true;d.y=t.clientY;d.t=Date.now();$sheet.style.transition='none'}else{if(dy<-10||(dy>10&&$sheet.scrollTop>0))d=null;return}}
    e.preventDefault();d.dy=Math.max(0,t.clientY-d.y);$sheet.style.transform=`translateY(${d.dy}px)`;$scrim.style.opacity=String(Math.max(.25,1-d.dy/500))},{passive:false});
  const end=()=>{if(!d||!d.on){d=null;return}const v=d.dy/Math.max(1,Date.now()-d.t),far=d.dy>Math.min(150,$sheet.offsetHeight*.28)||(v>.55&&d.dy>40);$sheet.style.transition='';d=null;
    if(far){if(!softClose())return}else{$sheet.style.transform='';$scrim.style.opacity=''}};
  $sheet.addEventListener('touchend',end);$sheet.addEventListener('touchcancel',()=>{if(d&&d.on){$sheet.style.transition='';$sheet.style.transform='';$scrim.style.opacity=''}d=null});
})();
document.addEventListener('keydown',e=>{if(e.key==='Escape')softClose();if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('rec'))openRecord(e.target.dataset.id)});

function openRecord(id){
  const r=id?S.records.find(x=>x.id===id):null,p=S.profile;pending=undefined;
  const vv=k=>r&&r[k]!=null?r[k]:'';
  openSheet(`<h3>${r?'증거 수정':'새 증거 기록'}</h3>
    <label class="field"><span>측정한 날</span><input id="f-date" type="date" value="${r?r.date:today()}" min="${p.birth}" max="${today()}"></label>
    <div class="row3">
      <label class="field"><span>몸무게</span><div class="unitwrap"><input id="f-weight" inputmode="decimal" placeholder="5.7" value="${vv('weight')}"><em>kg</em></div></label>
      <label class="field"><span>키</span><div class="unitwrap"><input id="f-height" inputmode="decimal" placeholder="60" value="${vv('height')}"><em>cm</em></div></label>
      <label class="field"><span>머리둘레</span><div class="unitwrap"><input id="f-head" inputmode="decimal" placeholder="39" value="${vv('head')}"><em>cm</em></div></label>
    </div>
    ${photoField(r?safeImg(PHOTOS[r.id]):'')}
    <label class="field"><span>메모 (선택)</span><textarea id="f-memo" maxlength="200" placeholder="예: 영유아 검진 날 소아과에서 측정">${esc(r?r.memo||'':'')}</textarea></label>
    <p class="err" id="f-err"></p>
    <div class="actions">${r?`<button class="danger" data-act="delrec" data-id="${esc(r.id)}">삭제</button>`:''}<button class="secondary" data-act="close">취소</button><button class="primary" data-act="saverec" data-id="${r?esc(r.id):''}">저장</button></div>`);
}
function openSettings(){
  const p=S.profile||{};pending=undefined;
  openSheet(`<h3>명탐정 정보</h3>
    <label class="field"><span>이름</span><input id="s-name" maxlength="20" value="${esc(p.name||'')}" placeholder="우리 아기"></label>
    <label class="field"><span>태어난 날</span><input id="s-birth" type="date" value="${p.birth||''}" max="${today()}"></label>
    ${photoField(safeImg(PHOTOS.profile))}
    <div class="row3" style="grid-template-columns:1fr 1fr">
      <label class="field"><span>엄마 수사관 이름 (선택)</span><input id="s-mom" maxlength="20" value="${esc(p.mom||'')}" placeholder="예: 김OO"></label>
      <label class="field"><span>아빠 수사관 이름 (선택)</span><input id="s-dad" maxlength="20" value="${esc(p.dad||'')}" placeholder="예: 유OO"></label>
    </div>
    <div class="field"><span>이 폰의 수사관</span><div class="quick" id="s-role">${['엄마','아빠'].map(r=>`<button data-act="pickrole" data-v="${r}" class="${myRole()===r?'on':''}">${r}</button>`).join('')}</div></div>
    <div class="field"><span>성별 (성장곡선 기준)</span><div class="quick" id="s-sex">${[['F','여아'],['M','남아']].map(([v,l])=>`<button data-act="picksex" data-v="${v}" class="${(p.sex||'F')===v?'on':''}">${l}</button>`).join('')}</div></div>
    ${window.FAM?FAM.settingsHtml():''}
    <button class="ghost" data-stg="open" style="width:100%;margin-bottom:8px">⚙️ 앱 설정 (탭 숨기기·버전·저장 공간)</button>
    <p class="err" id="s-err"></p>
    <div class="actions"><button class="secondary" data-act="close">취소</button><button class="primary" data-act="saveprof">저장</button></div>`);
}

let PT=null; // period being edited
function openPeriod(id){
  const p=id?S.periods.find(x=>x.id===id):null,rd=p?recDate(p):'';
  PT={id:p?p.id:'',month:p?p.month:'',vaccines:p?vacsOf(p.id).map(v=>({id:v.id,name:v.name,sub:v.sub||''})):[]};
  const conf=p?!!p.confirmed:true;
  openSheet(`<h3>${p?esc(p.name)+' 접종 편집':'접종 시기 추가'}</h3>
    <label class="field"><span>시기 이름</span><input id="p-name" maxlength="20" value="${esc(p?p.name:'')}" placeholder="예: 수막구균 선택접종"></label>
    ${rd?`<label class="check"><input type="checkbox" id="p-conf" ${conf?'checked':''}> 병원 예약 확정 (권장일 ${fmtK(rd)} 대신 이 날짜 사용)</label>`:'<input type="checkbox" id="p-conf" checked hidden>'}
    <label class="field"><span>${rd?'예약한 날':'접종 날짜'}</span><input id="p-date" type="date" value="${p&&p.confirmed?p.confirmed:(rd||today())}"></label>
    <label class="field"><span>병원 (선택)</span><input id="p-hos" maxlength="40" value="${esc(p?p.hospital||'':'')}" placeholder="예: 우리동네 소아청소년과"></label>
    <div class="field"><span>이 시기에 맞을 백신</span><div class="vlist" id="p-vlist"></div>
      <div class="addrow"><input id="p-add" maxlength="40" placeholder="백신 이름, 예: 수막구균 1차"><button data-act="p-add">추가</button></div></div>
    ${window.CLAIM?CLAIM.field(p?'per:'+p.id:'','접종확인',p&&p.confirmed?p.confirmed:(rd||today())):''}
    <p class="err" id="p-err"></p>
    <div class="actions">${p?`<button class="danger" data-act="delp" data-id="${p.id}">시기 삭제</button>`:''}<button class="secondary" data-act="close">취소</button><button class="primary" data-act="savep">저장</button></div>`);
  drawPT();
}
function drawPT(){
  const el=document.getElementById('p-vlist');if(!el)return;
  el.innerHTML=PT.vaccines.length?PT.vaccines.map((v,i)=>`<div class="it"><span>${esc(v.name)}${v.sub?`<small>${esc(v.sub)}</small>`:''}</span><button class="xbtn" data-act="p-rm" data-i="${i}" aria-label="${esc(v.name)} 빼기">×</button></div>`).join('')
    :'<p class="vempty">아직 없어요. 아래에서 추가해 주세요.</p>';
}
function openVaccine(id,pid){
  const v=id?S.vaccines.find(x=>x.id===id):{id:'',period:pid,name:'',sub:'',done:'',memo:''};
  const p=S.periods.find(x=>x.id===v.period);
  openSheet(`<h3>${id?'접종 기록':'백신 추가'}${p?`, ${esc(p.name)}`:''}</h3>
    <label class="field"><span>백신 이름</span><input id="v-name" maxlength="40" value="${esc(v.name)}" placeholder="예: DTaP-IPV/Hib 2차"></label>
    <label class="field"><span>설명 (선택)</span><input id="v-sub" maxlength="60" value="${esc(v.sub||'')}" placeholder="예: 5가 혼합 백신"></label>
    <label class="field"><span>접종한 날 (아직이면 비워 두세요)</span><input id="v-done" type="date" value="${v.done||''}">
      <div class="quick"><button data-act="v-q" data-v="${today()}">오늘</button>${p&&p.confirmed?`<button data-act="v-q" data-v="${p.confirmed}">예약일</button>`:''}<button data-act="v-q" data-v="">아직 안 맞음</button></div></label>
    <label class="field"><span>메모 (선택)</span><input id="v-memo" maxlength="100" value="${esc(v.memo||'')}" placeholder="예: 접종 후 미열, 하루 만에 괜찮아짐"></label>
    ${window.CLAIM?CLAIM.field(id?'vac:'+id:'','접종확인',v.done||today()):''}
    <p class="err" id="v-err"></p>
    <div class="actions">${id?`<button class="danger" data-act="delv" data-id="${id}">삭제</button>`:''}<button class="secondary" data-act="close">취소</button><button class="primary" data-act="savev" data-id="${id}" data-p="${v.period}">저장</button></div>`);
}
function openSolve(pid){
  const p=S.periods.find(x=>x.id===pid),vs=vacsOf(pid).filter(v=>!v.done);
  const def=p.confirmed&&p.confirmed<=today()?p.confirmed:today();
  openSheet(`<h3>${esc(p.name)} 사건 해결 처리</h3>
    <p class="hint" style="margin:-8px 0 12px">같은 날 맞은 백신만 체크해 두세요.</p>
    <div class="solvelist field">${vs.map(v=>`<label><input type="checkbox" value="${v.id}" checked> ${esc(v.name)}</label>`).join('')}</div>
    <label class="field"><span>접종한 날</span><input id="sv-date" type="date" value="${def}"></label>
    <p class="err" id="sv-err"></p>
    <div class="actions"><button class="secondary" data-act="close">취소</button><button class="primary" data-act="savesolve" data-id="${pid}">해결로 저장</button></div>`);
}

const $toast=document.getElementById('toast');let tt;
// 앱 모양 확인창 (폰 기본 confirm은 시스템 글꼴이라 앱과 어울리지 않아요): if(!await ask('지울까요?',{ok:'지우기',danger:true}))return
function ask(msg,o={}){return new Promise(res=>{const w=myRole()==='아빠'?'dad':myRole()==='엄마'?'mom':'baby',el=document.createElement('div');el.className='askbox';
  el.innerHTML=`<div class="askc" role="alertdialog" aria-modal="true"><span class="askf">${window.CHARS?CHARS.svg(w,'',{face:1,size:48}):''}</span><p>${esc(msg).replace(/\n/g,'<br>')}</p><div class="aska"><button class="secondary" data-ask="0">${esc(o.no||'취소')}</button><button class="primary${o.danger?' askd':''}" data-ask="1">${esc(o.ok||'확인')}</button></div></div>`;
  const done=v=>{el.remove();window.__askClose=null;res(v)};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-ask]');if(b)done(b.dataset.ask==='1');else if(e.target===el)done(false)});
  window.__askClose=()=>{done(false);return true};document.body.appendChild(el);el.querySelector('[data-ask="1"]').focus()})}
function toast(m){$toast.textContent=m;$toast.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>$toast.classList.remove('show'),2200)}

document.addEventListener('click',async e=>{
  const a=e.target.closest('[data-act]');if(!a)return;
  const act=a.dataset.act,val=id=>{const el=document.getElementById(id);return el?el.value.trim():''},err=(id,m)=>{document.getElementById(id).textContent=m};
  switch(act){
  case 'tab':if(a.dataset.v==='town'&&S.tab!=='town')S.townView='';S.tab=a.dataset.v;S.view='';render();window.scrollTo(0,0);break;   // 동네 탐문은 들어올 때마다 탐험 지도부터
  case 'townv':S.townView=a.dataset.v||'';render();window.scrollTo(0,0);break;
  case 'sickv':S.sickView=a.dataset.v||'';render();window.scrollTo(0,0);break;
  case 'recall':S.recAll=!S.recAll;render();if(!S.recAll){const h=document.getElementById('rec-head');if(h)h.scrollIntoView({block:'start'})}break;
  case 'aview':S.albumView=a.dataset.v;render();window.scrollTo(0,0);break;
  case 'report':S.view='report';render();window.scrollTo(0,0);break;
  case 'closereport':case 'back':goBack();break;   // data-act="back": 어느 화면에서나 쓰는 돌아가기 (열기 전 화면·위치로)
  case 'log':openLog(a.dataset.v,null);break;
  case 'editlog':openLog(null,a.dataset.id);break;
  case 'tstep':{const el=document.getElementById('l-val');const v=Math.round(((parseFloat(el.value)||37)+ +a.dataset.v)*10)/10;el.value=v.toFixed(1);break}
  case 'pick1':a.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===a));break;
  case 'fill':document.getElementById(a.dataset.t).value=a.dataset.v;break;
  case 'addsym':{const el=document.getElementById('l-val');el.value=el.value?el.value+', '+a.dataset.v:a.dataset.v;break}
  case 'savelog':{const k=a.dataset.k,v=val('l-val'),d=val('l-date'),t=val('l-time');
    if(!v)return err('l-err',k==='temp'?'체온을 입력해 주세요':k==='med'?'약 이름을 입력해 주세요':'증상을 입력해 주세요');
    if(k==='temp'){const n=parseFloat(v);if(isNaN(n)||n<34||n>43)return err('l-err','체온은 34~43℃ 사이 숫자로 입력해 주세요')}
    if(!d||!t)return err('l-err','날짜와 시각을 입력해 주세요');
    let ep=a.dataset.ep;
    if(ep){const e0=S.eps.find(x=>x.id===ep),nt=val('l-ep');if(e0&&nt&&nt!==e0.title&&!await write('saveItem','ep',Object.assign({},e0,{title:nt})))return}   // 사건 이름을 바꿨으면 사건도 같이
    if(!ep){const r0=await write('saveItem','ep',{title:val('l-ep')||'건강 관리',start:d,end:'',memo:''});if(!r0)return;ep=r0.id}
    const site=$sheet.querySelector('#l-site .on');
    let until='';if(k==='sym'){const ut=val('l-until');if(/^\d\d:\d\d$/.test(ut)){let ud=d;if(ut<t){const n=new Date(d+'T00:00:00');n.setDate(n.getDate()+1);ud=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}until=ud+'T'+ut}}   // 완료 시각이 시작보다 이르면 다음 날
    const o={id:a.dataset.id,ep,kind:k,at:d+'T'+t,value:k==='temp'?parseFloat(v).toFixed(1):v,dose:val('l-dose'),site:site?site.textContent:'',memo:val('l-memo'),by:myRole(),until};
    const rl=await write('saveItem','log',o);
    if(rl){closeSheet();toast(KIND[k]+' 기록을 남겼어요');if(window.CLAIM)await CLAIM.flush('log:'+(o.id||rl.id))}break}
  case 'logmode':{LSEL.on=!LSEL.on;LSEL.set.clear();render();break}
  case 'logsel':{const id=a.dataset.id;LSEL.set.has(id)?LSEL.set.delete(id):LSEL.set.add(id);render();break}
  case 'logall':{const ep=activeEp(),L=ep?logsOf(ep.id):[];if(L.every(l=>LSEL.set.has(l.id)))LSEL.set.clear();else L.forEach(l=>LSEL.set.add(l.id));render();break}
  case 'logdelsel':{const ids=[...LSEL.set];if(!ids.length)break;if(!await ask(`고른 기록 ${ids.length}건을 지울까요?`,{ok:'지우기',danger:true}))break;
    let n=0;for(const id of ids){toast(`지우는 중 ${n+1}/${ids.length}`);if(await write('deleteItem','log',id))n++;else break}
    LSEL.set.clear();LSEL.on=false;render();if(n)toast(`${n}건을 지웠어요`);break}
  case 'closeep':{const e=S.eps.find(x=>x.id===a.dataset.id);if(a.dataset.confirm!=='1'){a.dataset.confirm='1';a.textContent='한 번 더 누르면 사건 종결';return}
    if(await write('saveItem','ep',Object.assign({},e,{end:today()})))toast('사건 종결! 잘 이겨냈어요');break}
  case 'viewep':viewEp(a.dataset.id);break;
  case 'reopenep':{const e=S.eps.find(x=>x.id===a.dataset.id);if(await write('saveItem','ep',Object.assign({},e,{end:''}))){closeSheet();toast('사건을 다시 열었어요')}break}
  case 'editvisit':openVisit(a.dataset.id);break;
  case 'savevisit':{const d=val('c-date');if(!d)return err('c-err','진료일을 입력해 주세요');
    const rv=await write('saveItem','visit',{id:a.dataset.id,date:d,next:val('c-next'),hospital:val('c-hos'),diag:val('c-diag'),rx:val('c-rx'),ask:val('c-ask'),by:myRole()});
    if(rv){closeSheet();toast('진료 기록을 저장했어요');if(window.CLAIM)await CLAIM.flush('visit:'+(a.dataset.id||rv.id))}break}
  case 'addmom':openMoment(null,{type:'first',title:a.dataset.v||''});break;
  case 'addmonth':openMoment(null,{type:'month',title:a.dataset.v+'개월',date:(()=>{const d=addMonths(S.profile.birth,+a.dataset.v);return d>today()?today():d})()});break;
  case 'editmom':openMoment(a.dataset.id);break;
  case 'savemom':{const title=a.dataset.type==='month'?a.dataset.title:val('m-title'),d=val('m-date');
    if(!title)return err('m-err','무엇을 목격했는지 적어 주세요');if(!d)return err('m-err','날짜를 입력해 주세요');
    if(a.dataset.type==='month'&&!a.dataset.id&&!pending)return err('m-err','사진을 골라 주세요');
    const o={id:a.dataset.id,type:a.dataset.type,title,date:d,memo:val('m-memo'),by:myRole()};if(pending!==undefined)o.photo=pending;if(pending&&PGEO)Object.assign(o,PGEO);
    const res=await write('saveItem','mom',o);if(res){if(pending)PHOTOS[res.id]=pending;else if(pending===null)delete PHOTOS[res.id];if(EXTRA_FILES.length&&a.dataset.type!=='month'){ALBUM.queue(EXTRA_FILES,{type:'extra',of:res.id,fb:d});EXTRA_FILES=[]}render();closeSheet();toast(a.dataset.type==='month'?'증거 사진을 보관했어요':'최초 목격을 기록했어요')}break}
  case 'addfood':openFood(null,a.dataset.v||'');break;
  case 'editfood':openFood(a.dataset.id);break;
  case 'savefood':{const name=val('fd-name'),start=val('fd-start');if(!name)return err('fd-err','식재료 이름을 입력해 주세요');if(!start)return err('fd-err','시작일을 입력해 주세요');
    const f=a.dataset.id?S.foods.find(x=>x.id===a.dataset.id):{};const r=$sheet.querySelector('#fd-res .on');
    const o={id:a.dataset.id,name,start,result:r?r.dataset.v:(f.result||''),reaction:a.dataset.id?val('fd-react'):'',memo:val('fd-memo'),by:f.by||myRole()};
    if(await write('saveItem','food',o)){closeSheet();toast(a.dataset.id?'수정했어요':name+' 심문을 시작했어요')}break}
  case 'foodok':{const f=S.foods.find(x=>x.id===a.dataset.id);if(await write('saveItem','food',Object.assign({},f,{result:'통과'})))toast(f.name+' 무혐의! 수배 전단에 올렸어요');break}
  case 'foodbad':openBad(a.dataset.id);break;
  case 'addreact':{const el=document.getElementById('fb-react');el.value=el.value?el.value+', '+a.dataset.v:a.dataset.v;break}
  case 'savebad':{const f=S.foods.find(x=>x.id===a.dataset.id),r=val('fb-react'),lg=document.getElementById('fb-log').checked;
    if(!r)return err('fb-err','어떤 반응이었는지 적어 주세요');
    if(!await write('saveItem','food',Object.assign({},f,{result:'혐의',reaction:r})))return;
    closeSheet();toast(f.name+' 혐의 기록 완료');
    if(lg){S.tab='sick';S.view='';render();window.scrollTo(0,0);openLog('sym',null);setTimeout(()=>{const el=document.getElementById('l-val');if(el)el.value=r;const ep=document.getElementById('l-ep');if(ep)ep.value=f.name+' 반응'},0)}break}
  case 'addmeal':openMeal(null);break;
  case 'editmeal':openMeal(a.dataset.id);break;
  case 'addmenu1':{const el=document.getElementById('ml-menu');el.value=el.value?el.value+' '+a.dataset.v:a.dataset.v;break}
  case 'mealall':S.mealAll=!S.mealAll;render();break;
  case 'savemeal':{const d=val('ml-date'),menu=val('ml-menu');if(!d)return err('ml-err','날짜를 입력해 주세요');if(!menu)return err('ml-err','메뉴를 입력해 주세요');
    const sl=$sheet.querySelector('#ml-slot .on'),ea=$sheet.querySelector('#ml-eat .on');
    const o={id:a.dataset.id,date:d,tm:/^\d\d:\d\d$/.test(val('ml-tm'))?val('ml-tm'):'',slot:sl?sl.dataset.v:'',menu,amount:val('ml-amt'),eat:ea?ea.dataset.v:'',memo:val('ml-memo'),by:myRole()};if(pending!==undefined)o.photo=pending;
    const res=await write('saveItem','meal',o);if(res){if(pending)PHOTOS[res.id]=pending;else if(pending===null)delete PHOTOS[res.id];render();closeSheet();toast('급식 기록을 남겼어요')}break}
  case 'addcube':openCube(null);break;
  case 'editcube':openCube(a.dataset.id);break;
  case 'savecube':{const name=val('cb-name'),n=parseInt(val('cb-count'),10);if(!name)return err('cb-err','큐브 이름을 입력해 주세요');if(isNaN(n)||n<0||n>99)return err('cb-err','개수는 0~99 사이 숫자로 입력해 주세요');
    if(await write('saveItem','cube',{id:a.dataset.id,name,count:String(n),made:val('cb-made'),memo:val('cb-memo')})){closeSheet();toast('보관소에 입고했어요')}break}
  case 'cubestep':{const c=S.cubes.find(x=>x.id===a.dataset.id),n=Math.max(0,Math.min(99,(+c.count||0)+ +a.dataset.v));if(n===+c.count)return;
    if(await write('saveItem','cube',Object.assign({},c,{count:String(n)})))toast(c.name+' 큐브 '+n+'개 남음');break}
  case 'mmon':S.menuMonth=shiftMonth(curMenuMonth(),+a.dataset.v);render();loadPhotos();break;
  case 'addmenu':openMenu(null);break;
  case 'editmenu':openMenu(a.dataset.id);break;
  case 'viewmenu':if(!VIEWER.open(a.dataset.id))viewMenu(a.dataset.id);break;
  case 'savemenu':{const mo=val('mn-month');if(!/^\d{4}-\d{2}$/.test(mo))return err('mn-err','월을 골라 주세요');
    if(!a.dataset.id&&!pending)return err('mn-err','식단표 사진을 골라 주세요');
    const o={id:a.dataset.id,month:mo,title:val('mn-title')};if(pending!==undefined)o.photo=pending;
    const res=await write('saveItem','menu',o);if(res){if(pending)PHOTOS[res.id]=pending;else if(pending===null)delete PHOTOS[res.id];S.menuMonth=mo;render();closeSheet();toast('식단표를 보관했어요')}break}
  case 'chart':S.chart=a.dataset.v;render();break;
  case 'retry':S.mode='loading';render();refresh();break;
  case 'close':closeSheet();break;
  case 'settings':openSettings();break;
  case 'addrec':openRecord(null);break;
  case 'editrec':openRecord(a.dataset.id);break;
  case 'rmphoto':{pending=null;const pv=document.getElementById('pv');pv.hidden=true;pv.removeAttribute('src');a.hidden=true;break}
  case 'start':{const b=val('ob-birth');if(!b)return err('ob-err','태어난 날을 입력해 주세요');const sx=document.querySelector('#ob-sex .on');await saveProfile({name:val('ob-name')||'우리 아기',birth:b,sex:sx?sx.dataset.v:'F'});break}
  case 'saveprof':{const b=val('s-birth');if(!b)return err('s-err','태어난 날을 입력해 주세요');
    const np={name:val('s-name')||'우리 아기',birth:b,mom:val('s-mom'),dad:val('s-dad')};const sx=$sheet.querySelector('#s-sex .on');if(sx)np.sex=sx.dataset.v;if(pending!==undefined)np.photo=pending;const rb=$sheet.querySelector('#s-role .on');if(rb){np.role=rb.dataset.v;try{localStorage.setItem('investigator',rb.dataset.v)}catch(e){}S.me.role=rb.dataset.v}
    if(await saveProfile(np)){closeSheet();toast('명탐정 정보를 저장했어요')}break}
  case 'saverec':{const date=val('f-date'),w=num(val('f-weight')),h=num(val('f-height')),hc=num(val('f-head'));
    if(!date)return err('f-err','측정한 날을 입력해 주세요');
    if(date<S.profile.birth)return err('f-err','태어난 날 이후 날짜를 골라 주세요');
    if([w,h,hc].some(x=>Number.isNaN(x)))return err('f-err','숫자만 입력해 주세요 (예: 5.7)');
    if(w==null&&h==null&&hc==null)return err('f-err','몸무게, 키, 머리둘레 중 하나 이상 입력해 주세요');
    if(w!=null&&(w<1||w>25))return err('f-err','몸무게는 kg 단위로 입력해 주세요 (예: 5.7)');
    if(h!=null&&(h<35||h>110))return err('f-err','키는 cm 단위로 입력해 주세요 (예: 60.5)');
    if(hc!=null&&(hc<25||hc>55))return err('f-err','머리둘레는 cm 단위로 입력해 주세요 (예: 39)');
    const r={date,memo:val('f-memo')};if(w!=null)r.weight=w;if(h!=null)r.height=h;if(hc!=null)r.head=hc;if(a.dataset.id)r.id=a.dataset.id;if(pending!==undefined)r.photo=pending;r.by=myRole();
    if(await saveRecord(r)){closeSheet();toast('증거를 기록했어요')}break}
  case 'delrec':case 'delp':case 'delv':case 'dellog':case 'delvisit':case 'delep':case 'delmom':case 'delfood':case 'delmeal':case 'delcube':case 'delmenu':{
    if(a.dataset.confirm!=='1'){a.dataset.confirm='1';a.textContent='한 번 더 누르면 삭제';return}
    const IT={dellog:'log',delvisit:'visit',delep:'ep',delmom:'mom',delfood:'food',delmeal:'meal',delcube:'cube',delmenu:'menu'}[act];
    const fn={delrec:'deleteRecord',delp:'deletePeriod',delv:'deleteVaccine'}[act];
    const ok=act==='delrec'?await deleteRecord(a.dataset.id):IT?!!(await write('deleteItem',IT,a.dataset.id)):!!(await write(fn,a.dataset.id));
    if(ok){closeSheet();toast('삭제했어요');if(act==='delmom')ALBUM.dropExtras(a.dataset.id)}break}
  case 'role':closeSheet();await setRole(a.dataset.v);toast(a.dataset.v+' 수사관으로 등록했어요');break;
  case 'inv':openInv(a.dataset.v);break;
  case 'idcard':GAME.idCard(a.dataset.v);break;
  case 'saveinv':{const role=a.dataset.v,k=role==='엄마'?'mom':'dad',p=S.profile;
    const np={name:p.name,birth:p.birth,mom:p.mom||'',dad:p.dad||''};np[k]=val('i-name');if(pending!==undefined)np[k+'Photo']=pending;
    if(document.getElementById('i-me').checked){np.role=role;try{localStorage.setItem('investigator',role)}catch(e){}S.me.role=role}
    if(await saveProfile(np)){closeSheet();toast(role+' 수사관 정보를 저장했어요')}break}
  case 'picksex':a.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===a));break;
  case 'pickrole':$sheet.querySelectorAll('#s-role button').forEach(b=>b.classList.toggle('on',b===a));break;
  case 'newp':openPeriod(null);break;
  case 'editp':openPeriod(a.dataset.id);break;
  case 'p-add':{const n=val('p-add');if(!n)return;PT.vaccines.push({name:n,sub:''});document.getElementById('p-add').value='';drawPT();break}
  case 'p-rm':PT.vaccines.splice(+a.dataset.i,1);drawPT();break;
  case 'savep':{const name=val('p-name'),date=val('p-date'),conf=document.getElementById('p-conf').checked;
    if(!name)return err('p-err','시기 이름을 입력해 주세요');
    if(conf&&!date)return err('p-err','날짜를 입력해 주세요');
    const extra=val('p-add');if(extra)PT.vaccines.push({name:extra,sub:''});
    let month=PT.month;if(month===''||month==null){month=''}
    const res=await write('savePeriod',{id:PT.id,name,month,confirmed:conf?date:'',hospital:val('p-hos'),vaccines:PT.vaccines});
    if(res){closeSheet();toast('접종 일정을 저장했어요');if(window.CLAIM)await CLAIM.flush('per:'+(PT.id||res.id))}break}
  case 'addv':openVaccine(null,a.dataset.id);break;
  case 'editv':openVaccine(a.dataset.id);break;
  case 'v-q':document.getElementById('v-done').value=a.dataset.v;break;
  case 'savev':{const name=val('v-name');if(!name)return err('v-err','백신 이름을 입력해 주세요');
    const res=await write('saveVaccine',{id:a.dataset.id,period:a.dataset.p,name,sub:val('v-sub'),done:val('v-done'),memo:val('v-memo'),by:myRole()});
    if(res){closeSheet();toast('접종 기록을 저장했어요');if(window.CLAIM)await CLAIM.flush('vac:'+(a.dataset.id||res.id))}break}
  case 'solve':openSolve(a.dataset.id);break;
  case 'savesolve':{const date=val('sv-date'),ids=[...$sheet.querySelectorAll('.solvelist input:checked')].map(x=>x.value);
    if(!date)return err('sv-err','접종한 날을 입력해 주세요');if(!ids.length)return err('sv-err','맞은 백신을 하나 이상 체크해 주세요');
    const res=await write('completePeriod',a.dataset.id,date,ids,myRole());if(res){closeSheet();toast('사건 해결! 접종 기록을 저장했어요')}break}
  }
});

window.__app={apply,toast,isBusy:()=>busy,sheetOpen:()=>$sheet.classList.contains('open'),closeSheet,softClose,sheetDirty,openSheet,refresh,CK};
