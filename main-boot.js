// 시작: 보던 탭 기억·좌우 밀기·당겨서 새로고침 — index.html에서 나눈 전역 스크립트 (순서: main-core → render → sick → album → meal → sheets → boot)
// ---------- 새로고침해도 보던 탭 그대로 (이 창에서만 기억, 앱을 새로 열면 첫 화면) ----------
const STAY='soeun-stay';let stayY=null,stayT,stayT0=0;
function staySave(){if(S.mode!=='ok')return;try{sessionStorage.setItem(STAY,JSON.stringify({tab:S.tab,view:S.view,vacView:S.vacView,albumView:S.albumView,townView:S.townView,sickView:S.sickView||'',menuMonth:S.menuMonth,recAll:!!S.recAll,y:Math.round(window.scrollY)}))}catch(e){}}
function stayAfterRender(){
  if(S.mode!=='ok')return;
  // 내용이 늦게 채워지는 탭(동네 탐문 등)은 그 위치까지 실제로 내려갈 수 있을 때까지 다시 시도해요 (최대 5초)
  if(stayY!=null){const y=stayY;stayT0=stayT0||Date.now();if(Date.now()-stayT0>5000)stayY=null;else{stayY=null;requestAnimationFrame(()=>{window.scrollTo(0,y);if(Math.abs(window.scrollY-y)>8&&Date.now()-stayT0<5000)stayY=y})}}
  clearTimeout(stayT);stayT=setTimeout(staySave,300);   // 바로 읽으면 화면 전체 배치를 억지로 다시 계산해서 느려져요
}
try{const st=JSON.parse(sessionStorage.getItem(STAY)||'null');
  if(st&&['grow','day','town','album','vac','food','sick'].includes(st.tab)){S.tab=st.tab;S.view=['recipe','report','posts','medals','book'].includes(st.view)?st.view:'';S.sickView=st.view==='hosp'?'hosp':['hosp','ph'].includes(st.sickView)?st.sickView:'';S.vacView=['check','dev'].includes(st.vacView)?st.vacView:'vac';S.albumView=['board','family'].includes(st.albumView)?st.albumView:'album';S.townView=st.townView==='info'?'info':'';S.recAll=!!st.recAll;if(/^\d{4}-\d{2}$/.test(st.menuMonth||''))S.menuMonth=st.menuMonth;stayY=st.y||0}
}catch(e){}
window.addEventListener('scroll',()=>{clearTimeout(stayT);stayT=setTimeout(staySave,250)},{passive:true});
window.addEventListener('pagehide',staySave);
// 폰에 저장해 두는 사본(saveCache)은 2초 모아 쓰니까, 앱을 내리거나 닫을 땐 바로 써요
const flushCache=()=>{if(cacheD&&!DEMO){clearTimeout(cacheT);try{localStorage.setItem(CK,cacheJSON(cacheD))}catch(e){}}};
window.addEventListener('pagehide',flushCache);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushCache()});
window.addEventListener('touchstart',()=>{stayY=null},{passive:true,once:true});   // 손으로 움직이기 시작하면 위치 되돌리기는 그만
try{const q=new URLSearchParams(location.search).get('tab');if(['day','grow','town','album','vac','food','sick'].includes(q)){S.tab=q;S.view='';stayY=null;history.replaceState(history.state,'',location.pathname)}}catch(e){}   // 알림에서 연 탭 (수유 알람 → 하루 수사)
if(navigator.serviceWorker)navigator.serviceWorker.addEventListener('message',e=>{const t=e.data&&e.data.tab;if(['day','grow','town','album','vac','food','sick'].includes(t)){closeSheet();S.tab=t;S.view='';render();scrollTo(0,0)}});
loadCache();
refresh();
setInterval(()=>{if(S.tab==='sick'&&S.mode==='ok'&&!$sheet.classList.contains('open'))render()},60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!busy&&!$sheet.classList.contains('open'))refresh()});
// 좌우로 밀면 옆 탭으로 (손가락을 따라 화면이 움직이고, 충분히 밀면 부드럽게 넘어가요)
// 지도·수사 보드·입력칸·사진 고르기 중·하위 화면(병원 수사, 보고서 등)에서는 안 해요
(function(){
  const ALL=['grow','day','town','album','vac','food','sick'];   // 아래 메뉴 순서와 같게 (설정에서 숨긴 탭은 건너뛰어요)
  let ORDER=ALL;
  let sw=null;
  const W=()=>$app.clientWidth||innerWidth;
  const setX=(x,ms)=>{$app.style.transition=ms?`transform ${ms}ms cubic-bezier(.2,.8,.2,1),opacity ${ms}ms`:'none';$app.style.transform=x?`translate3d(${x}px,0,0)`:'';$app.style.opacity=x?String(Math.max(.75,1-Math.abs(x)/W()*0.35)):''};
  $app.addEventListener('touchstart',e=>{
    sw=null;
    if(e.touches.length!==1||S.mode!=='ok'||S.view||!S.profile||$sheet.classList.contains('open'))return;
    {const H=hiddenTabs();ORDER=ALL.filter(k=>k===S.tab||!H.includes(k))}
    if(e.target.closest('input,textarea,select,.hmap,.hmapwrap,#bwrap,.board,[data-noswipe]'))return;
    // 옆으로 스크롤되는 줄(동네 탐문 시간별 날씨 등)에서 밀면 그 줄을 넘기고, 탭은 안 바꿔요
    for(let el=e.target;el&&el!==$app;el=el.parentElement){if(el.scrollWidth>el.clientWidth+4){const ox=getComputedStyle(el).overflowX;if(ox==='auto'||ox==='scroll')return}}
    if(document.querySelector('.agrid.selmode'))return;
    const t=e.touches[0];sw={x:t.clientX,y:t.clientY,t:Date.now(),lock:0,dx:0};
  },{passive:true});
  $app.addEventListener('touchmove',e=>{
    if(!sw)return;const t=e.touches[0],dx=t.clientX-sw.x,dy=t.clientY-sw.y;
    if(!sw.lock){if(Math.abs(dx)<10&&Math.abs(dy)<10)return;sw.lock=Math.abs(dx)>Math.abs(dy)*1.4?1:-1}
    if(sw.lock<0){sw=null;return}
    e.preventDefault();
    const i=ORDER.indexOf(S.tab),edge=(dx>0&&i<=0)||(dx<0&&i>=ORDER.length-1);
    sw.dx=edge?dx*0.25:dx;setX(sw.dx,0);
  },{passive:false});
  const end=()=>{
    if(!sw||sw.lock!==1){sw=null;return}
    const dx=sw.dx,v=Math.abs(dx)/Math.max(1,Date.now()-sw.t),i=ORDER.indexOf(S.tab),j=i+(dx<0?1:-1);sw=null;
    if(j<0||j>=ORDER.length||!(Math.abs(dx)>W()*0.22||(v>0.45&&Math.abs(dx)>40))){setX(0,220);return}
    // 새 탭을 바로 그려서 미는 쪽 반대편에서 미끄러져 들어오게 (예전엔 끝까지 밀어낸 뒤 그려서 잠깐 빈 화면이 보였어요)
    const dir=dx<0?-1:1;if(ORDER[j]==='town')S.townView='';S.tab=ORDER[j];S.view='';render();window.scrollTo(0,0);
    setX(-dir*W()*0.28,0);requestAnimationFrame(()=>requestAnimationFrame(()=>setX(0,260)));
  };
  $app.addEventListener('touchend',end);$app.addEventListener('touchcancel',end);
})();
// ---------- 맨 위에서 아래로 당기면 새로고침 (사용자 요청: 앱을 껐다 켜지 않아도) ----------
// 놓으면 새 버전이 있는지 확인하고 앱을 다시 불러와요 → 배우자가 방금 올린 사진·기록도 서버에서 새로 받아요
(()=>{
  let p=null;const ptr=document.createElement('div');ptr.className='ptr';ptr.innerHTML='<i>🔍</i><span>당겨서 새로고침</span>';document.body.appendChild(ptr);
  const blocked=t=>$sheet.classList.contains('open')||document.documentElement.matches('.fpk-open,.pk-open')||document.querySelector('.askbox,.mapfull,.wko:not([hidden]),.pcam:not([hidden]),.mvo:not([hidden]),.hmapwrap.full')||t.closest('input,textarea,select,.hmap,.hmapwrap,#bwrap,.board,.bfull,[data-noswipe],.exmap,.wkmap');
  const show=(d,txt,on)=>{ptr.style.transform=`translate(-50%,${Math.round(d-60)}px)`;ptr.style.opacity=Math.min(1,d/50);ptr.querySelector('i').style.transform=`rotate(${Math.round(d*3)}deg)`;ptr.querySelector('span').textContent=txt;ptr.classList.toggle('on',!!on)};
  document.addEventListener('touchstart',e=>{p=null;if(e.touches.length!==1||window.scrollY>0||S.mode!=='ok'||blocked(e.target))return;p={x:e.touches[0].clientX,y:e.touches[0].clientY,d:0}},{passive:true});
  document.addEventListener('touchmove',e=>{if(!p)return;const t=e.touches[0],dx=t.clientX-p.x,dy=t.clientY-p.y;if(!p.lock){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;if(dy<=0||Math.abs(dx)>dy||window.scrollY>0){p=null;return}p.lock=1}
    p.d=Math.min(130,dy*.5);show(p.d,p.d>70?'놓으면 새로고침':'당겨서 새로고침',p.d>70)},{passive:true});
  const end=async()=>{if(!p)return;const d=p.d;p=null;
    if(d<=70){ptr.style.transition='transform .2s,opacity .2s';show(0,'');setTimeout(()=>ptr.style.transition='',220);return}
    show(70,'새로 불러오는 중…',true);ptr.classList.add('spin');
    try{const r=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(r){await Promise.race([r.update(),new Promise(s=>setTimeout(s,2500))]);if(r.waiting)r.waiting.postMessage('skip')}}catch(x){}
    try{staySave()}catch(x){}setTimeout(()=>location.reload(),150)};
  document.addEventListener('touchend',end);document.addEventListener('touchcancel',()=>{p=null;show(0,'')});
})();
