// 긴급 출동 탭 (사건·체온·투약 기록, 병원 소탭 연결) — index.html에서 나눈 전역 스크립트 (순서: main-core → render → sick → album → meal → sheets → boot)
// ---------- 긴급 출동 ----------
const pad=n=>String(n).padStart(2,'0');
function nowLocal(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
const tsOf=s=>new Date(s.length===10?s+'T00:00':s).getTime();
function ago(at){const m=Math.max(0,Math.round((Date.now()-tsOf(at))/60000));if(m<1)return '방금';if(m<60)return m+'분 전';const h=Math.floor(m/60),mm=m%60;if(h<24)return h+'시간'+(mm?' '+mm+'분':'')+' 전';return Math.floor(h/24)+'일 전'}
function fmtAt(at){const[d,t]=at.split('T');return (d===today()?'':fmtMD(d)+' ')+(t||'')}
const canW=()=>!(S.me&&S.me.viewer);
let LSEL={on:false,set:new Set()};   // 수사 일지 '골라 지우기' 상태
function logRow(l){const sel=LSEL.on,on=LSEL.set.has(l.id);
  return `<button class="logrow${on?' sel':''}" data-act="${sel?'logsel':'editlog'}" data-id="${l.id}">${sel?`<span class="lck${on?' on':''}"><i>✓</i></span>`:''}<span class="lt">${fmtAt(l.at)}${untilLt(l)}</span><span class="tag" style="background:${KCOL[l.kind]}">${KIND[l.kind]}</span><span class="lm"><b>${logMain(l)}</b>${l.site||l.memo?`<small>${esc([l.site,l.memo].filter(Boolean).join(', '))}</small>`:''}</span><span class="lb">${l.by||''}</span></button>`}
// 월별로 묶어 접기 (이번 달만 펼침) — 계속 기록하면서 지난 달은 접어 두기 (사용자 요청 2026.10.17, 일별 → 월별)
function logList(L){if(!L.length)return '<div class="recs"><p class="vempty">위 버튼으로 첫 기록을 남겨요.</p></div>';
  const ms=[...new Set(L.map(l=>l.at.slice(0,7)))],cur=today().slice(0,7);
  return ms.map(m=>{const g=L.filter(l=>l.at.slice(0,7)===m),tm=g.filter(l=>l.kind==='temp').map(l=>+l.value).filter(x=>!isNaN(x));
    return `<div class="amon${isFold('sm-'+m,m!==cur)?' folded':''}"><h3 class="agh" data-fold="sm-${m}"><span>${+m.slice(0,4)}년 ${+m.slice(5)}월</span><small class="rcur">${g.length}건${tm.length?` · 최고 ${Math.max(...tm)}℃`:''}</small></h3><div class="recs">${g.map(logRow).join('')}</div></div>`}).join('')}
const activeEp=()=>S.eps.slice().sort((a,b)=>a.start<b.start?1:-1)[0]||null;   // 사건 종결 없음 — 가장 최근 사건에 계속 이어서 기록 (2026.10.17 사용자 요청)
const logsOf=id=>S.logs.filter(l=>l.ep===id).sort((a,b)=>a.at<b.at?1:-1);
const KIND={temp:'체온',med:'투약',sym:'증상'};
const KCOL={temp:'var(--red)',med:'var(--navy)',sym:'var(--muted)'};
const SITES=['귀','겨드랑이','이마','항문'],SYMS=['콧물','기침','구토','설사','발진','보챔','수유량 감소','처짐'];
const hasUntil=l=>l.kind==='sym'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(l.until||'');
function untilTxt(l){if(!hasUntil(l))return '';const m=Math.round((new Date(l.until)-new Date(l.at))/60000);if(!(m>0))return '';return ` <small>(${m>=60?Math.floor(m/60)+'시간'+(m%60?' '+m%60+'분':''):m+'분'})</small>`}   // 증상 걸린 시간 (2026.10.17)
function untilLt(l){if(!hasUntil(l))return '';const[d,t]=l.until.split('T');return `<br><small class="lu">→ ${d===l.at.slice(0,10)?'':fmtMD(d)+' '}${t.slice(0,5)}</small>`}   // 왼쪽 날짜 칸 아래에 끝난 때
function logMain(l){return l.kind==='temp'?`${l.value}℃`:l.kind==='med'?`${esc(l.value)}${l.dose?' '+esc(l.dose):''}`:esc(l.value)+untilTxt(l)}
// 해열제 성분 (열나요 앱 참고, 2026.11.03): 약 이름 글자로 성분을 알아봐요 — 새 칸 없이 '챔프(아세트아미노펜)'처럼 이름에 적어요
const ANTI={apap:{n:'아세트아미노펜',s:'아세트',min:4,max:5,c:'#d45a0c',b:['챔프(빨강)','세토펜','타이레놀','콜대원키즈펜']},
  ibu:{n:'이부프로펜',s:'이부',min:6,max:4,c:'#2a78d6',b:['부루펜','챔프이부펜(파랑)','콜대원키즈이부펜']},
  dex:{n:'덱시부프로펜',s:'덱시부',min:6,max:3,c:'#7b52d6',b:['맥시부펜','애니펜']}};
const antiOf=v=>{v=String(v||'');return /덱시|맥시부펜|애니펜/.test(v)?'dex':/이부|부루펜/.test(v)?'ibu':/아세트|타이레놀|세토펜|챔프|콜대원키즈펜/.test(v)?'apap':''};
function medHint(){
  const el=document.getElementById('l-medhint');if(!el)return;
  const v=(document.getElementById('l-val')||{}).value||'',k=antiOf(v);
  if(!k){el.innerHTML='해열제 이름(성분)을 고르면 복용 간격을 같이 확인해 줘요.';return}
  const A=ANTI[k],d=(document.getElementById('l-date')||{}).value||today(),tm=(document.getElementById('l-time')||{}).value||'00:00',at=tsOf(d+'T'+(tm||'00:00')),self=(document.querySelector('[data-act="savelog"]')||{dataset:{}}).dataset.id;
  const L=S.logs.filter(l=>l.kind==='med'&&antiOf(l.value)===k&&l.id!==self&&tsOf(l.at)<=at&&at-tsOf(l.at)<24*36e5).sort((a,b)=>a.at<b.at?1:-1),days=daysBetween(S.profile.birth,today())+1,out=[];
  if(k!=='apap'&&days<180)out.push(`<b style="color:var(--red)">🚫 생후 180일 미만은 ${A.n} 계열을 권장하지 않아요. 의사 처방이 있을 때만 쓰세요.</b>`);
  if(L.length){const gap=at-tsOf(L[0].at),h=Math.floor(gap/36e5),m=Math.round(gap%36e5/6e4),nx=new Date(tsOf(L[0].at)+A.min*36e5),nxt=pad(nx.getHours())+':'+pad(nx.getMinutes());
    out.push(gap<A.min*36e5?`<b style="color:var(--red)">⚠️ 직전 ${A.n}(${L[0].at.slice(11,16)})에서 ${h?h+'시간 ':''}${m}분밖에 안 지났어요. ${nxt} 이후에 먹일 수 있어요 (최소 ${A.min}시간 간격).</b>`:`✅ 직전 ${A.n}은 ${h}시간 ${m}분 전(${L[0].at.slice(11,16)})이에요. 간격은 괜찮아요 (최소 ${A.min}시간).`)}
  else out.push(`✅ 최근 24시간에 먹인 ${A.n} 기록이 없어요.`);
  out.push(`24시간 안에 ${A.n} ${L.length}회 먹였어요 (하루 보통 ${A.max}회까지).`);
  out.push('<small>일반 안내예요. 용량·간격은 처방이나 약 설명서가 먼저예요. 다른 성분과 번갈아 먹일 땐 의사·약사와 상의하세요.</small>');
  el.innerHTML=out.join('<br>');
}
document.addEventListener('input',e=>{if(e.target.closest&&e.target.closest('#sheet,.sheet,[role=dialog]')||document.getElementById('l-medhint'))setTimeout(medHint,0)});
document.addEventListener('click',e=>{if(document.getElementById('l-medhint')&&e.target.closest('[data-act="fill"],[data-act="pick1"]'))setTimeout(medHint,30)});
const rptCss=document.createElement('style');rptCss.textContent='.rptg{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rptc{background:var(--card2,#FFFDF7);border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;font-size:13px}.rptc b{font-family:var(--display);font-weight:400;font-size:17px;color:var(--navy)}.rptc p{margin:4px 0 0;line-height:1.5}.rptc u{text-decoration:none;font-family:var(--display);font-size:16px;color:var(--red)}';document.head.appendChild(rptCss);
function tempChart(logs){
  const ts=logs.filter(l=>l.kind==='temp'&&!isNaN(+l.value)).map(l=>({t:tsOf(l.at),v:+l.value})).sort((a,b)=>a.t-b.t);
  if(ts.length<2)return '<p class="vempty">체온을 두 번 이상 기록하면 그래프가 나와요.</p>';
  const meds=logs.filter(l=>l.kind==='med').map(l=>({t:tsOf(l.at),k:antiOf(l.value)}));
  const t0=ts[0].t,t1=Math.max(ts[ts.length-1].t,t0+3600e3),W=340,H=160,pl=32,pr=10,pt=18,pb=24;
  let lo=Math.min(36.5,...ts.map(x=>x.v))-0.2,hi=Math.max(39,...ts.map(x=>x.v))+0.2;
  const X=t=>pl+(t-t0)/(t1-t0)*(W-pl-pr),Y=v=>pt+(1-(v-lo)/(hi-lo))*(H-pt-pb);
  let g=`<rect x="${pl}" y="${pt}" width="${W-pl-pr}" height="${Math.max(0,Y(38)-pt)}" fill="#B3261E" fill-opacity=".07"/>`;
  for(let v=Math.ceil(lo);v<=hi;v++)g+=`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#B9A889" ${v===38?'stroke-dasharray="5 3"':''}/><text x="${pl-5}" y="${Y(v)+4}" text-anchor="end" font-size="10" fill="#6B5F52">${v}</text>`;
  meds.filter(m=>m.t>=t0&&m.t<=t1).forEach(m=>{const t=m.t,c=m.k?ANTI[m.k].c:'#1F2A44',lb=m.k?ANTI[m.k].s:'약',w=Math.max(24,lb.length*9+10);g+=`<line x1="${X(t)}" x2="${X(t)}" y1="${pt}" y2="${H-pb}" stroke="${c}" stroke-dasharray="2 3"/><rect x="${X(t)-w/2}" y="2" width="${w}" height="14" rx="7" fill="${c}"/><text x="${X(t)}" y="12.5" text-anchor="middle" font-size="9" fill="#fff">${lb}</text>`});
  g+=`<polyline points="${ts.map(x=>X(x.t).toFixed(1)+','+Y(x.v).toFixed(1)).join(' ')}" fill="none" stroke="#B3261E" stroke-width="2.4" stroke-linejoin="round"/>`;
  ts.forEach((x,i)=>{g+=`<circle cx="${X(x.t)}" cy="${Y(x.v)}" r="${i===ts.length-1?5:3.2}" fill="#B3261E" stroke="#F5EDDC" stroke-width="1.5"/>`});
  const lab=t=>{const d=new Date(t);return `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}시`};
  g+=`<text x="${pl}" y="${H-6}" font-size="10" fill="#6B5F52">${lab(t0)}</text><text x="${W-pr}" y="${H-6}" text-anchor="end" font-size="10" fill="#6B5F52">${lab(t1)}</text>`;
  return `<div class="chartbox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="체온 그래프">${g}</svg></div>`;
}
// 월간 건강 리포트 (열나요 '건강 분석 리포트' 참고, 이 앱 기록으로만 — 또래 비교는 없어요)
function sickReport(){
  const ym=m=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-m);return d.getFullYear()+'-'+pad(d.getMonth()+1)};
  const mk=y=>{const L=S.logs.filter(l=>l.at.slice(0,7)===y),T=L.filter(l=>l.kind==='temp'&&!isNaN(+l.value)),tv=T.map(l=>+l.value),fd=new Set(T.filter(l=>+l.value>=38).map(l=>l.at.slice(0,10))).size;
    const am={apap:0,ibu:0,dex:0};L.filter(l=>l.kind==='med').forEach(l=>{const k=antiOf(l.value);if(k)am[k]++});
    const sy={};L.filter(l=>l.kind==='sym').forEach(l=>String(l.value).split(/[,·/]\s*/).filter(Boolean).forEach(s=>{sy[s.trim()]=(sy[s.trim()]||0)+1}));
    const top=Object.entries(sy).sort((a,b)=>b[1]-a[1]).slice(0,3);
    return {y,n:L.length,fd,hi:tv.length?Math.max(...tv):null,lo:tv.length?Math.min(...tv):null,am,top,meds:L.filter(l=>l.kind==='med').length}};
  const A=mk(ym(0)),B=mk(ym(1));if(!A.n&&!B.n)return '';
  const col=r=>{const mo=+r.y.slice(5);return `<div class="rptc"><b>${mo}월</b>${r.n?`<p>열난 날 <u>${r.fd}일</u></p><p>최고 ${r.hi!=null?`<u>${r.hi}℃</u>`:'-'} · 최저 ${r.lo!=null?r.lo+'℃':'-'}</p><p>해열제 ${Object.entries(r.am).filter(([,v])=>v).map(([k,v])=>`<span style="color:${ANTI[k].c}">${ANTI[k].s} ${v}회</span>`).join(' · ')||'없음'}</p>${r.top.length?`<p>증상 ${r.top.map(([s,c])=>esc(s)+' '+c).join(' · ')}</p>`:''}`:'<p class="vempty" style="margin:4px 0">기록 없음</p>'}</div>`};
  const dd=A.fd-B.fd;
  return `<section><h2 class="sh"><span>월간 건강 리포트</span><span>${A.n?(dd>0?`지난달보다 열난 날 ${dd}일 많아요`:dd<0?`지난달보다 열난 날 ${-dd}일 적어요`:'열난 날 지난달과 같아요'):''}</span></h2><div class="rptg">${col(B)}${col(A)}</div></section>`;
}
// 긴급 출동 소탭: 기록 / 병원(안에 응급실·야간 진료 바로 보기) / 약국 — 병원·약국은 탭 안에서 바로 (hospitals.js HOSP.render(true))
const sickSeg=()=>{const v=S.sickView||'';return `<div class="seg sseg">${[['','🌡️','기록'],['hosp','🏥','병원'],['ph','💊','약국']].map(([k,i,l])=>`<button class="${v===k?'on':''}" data-act="sickv" data-v="${k}"><i>${i}</i>${l}</button>`).join('')}</div>`};
function renderSick(){
  if(S.sickView==='hosp'||S.sickView==='ph')return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>긴급 출동</h1>${sickSeg()}<p>${S.sickView==='ph'?'가까운 약국과 지금 영업 중인 곳을 찾아요.':'가까운 병원과 지금 진료 중인 곳을 찾아요. 밤·주말엔 🚑 응급실·야간 진료 단추를 눌러요.'} 관심 병원·약국(★)은 가족 모두에게 같이 보여요.</p></header>${HOSP.render(true)}`;
  const ep=activeEp(),days=daysBetween(S.profile.birth,today());
  const warn=days<91?'생후 3개월 미만은 38℃ 이상이면 해열제보다 먼저 소아과나 응급실에 연락하세요. 약 용량과 간격은 처방이나 약 설명서를 따라 주세요.'
    :'열이 사흘 넘게 가거나, 처지고 잘 먹지 못하면 진료를 받으세요. 약 용량과 간격은 처방이나 약 설명서를 따라 주세요.';
  let top;
  if(ep){const L=logsOf(ep.id),lt=L.find(l=>l.kind==='temp'),lm=L.find(l=>l.kind==='med');
    top=`<article class="case hot" style="border-color:var(--red)"><span class="stamp" style="font-size:16px;transform:rotate(-8deg)">수사 중</span>
      <span class="no">CASE ${esc(ep.title)}, ${fmtK(ep.start,true)}부터</span>
      <div class="sickgrid"><div><small>마지막 체온</small><b style="color:var(--red)">${lt?lt.value+'℃':'—'}</b><small>${lt?ago(lt.at)+(lt.by?', '+lt.by:''):'기록 없음'}</small></div>
      <div><small>마지막 투약</small><b style="color:var(--navy);font-size:24px">${lm?ago(lm.at):'—'}</b><small>${lm?esc(lm.value)+(lm.dose?' '+esc(lm.dose):'')+(lm.by?', '+lm.by:''):'기록 없음'}</small></div></div>
      <div class="sickbtns"><button data-act="log" data-v="temp">+ 체온</button><button data-act="log" data-v="med">+ 투약</button><button data-act="log" data-v="sym">+ 증상</button></div>
    </article>
    <p class="notice">${warn}</p>
    <section><h2 class="sh"><span>체온 추적</span><span>점선 38℃</span></h2>${tempChart(L)}</section>
    <section><h2 class="sh" style="align-items:center"><span>수사 일지</span><span>${L.length}건${L.length&&canW()?` <button class="ghost" data-act="logmode" style="margin-left:6px;min-height:32px;padding:0 12px">${LSEL.on?'고르기 끝':'✓ 골라 지우기'}</button>`:''}</span></h2>${logList(L)}</section>
    ${LSEL.on?`<div class="wksel logbar"><b>${LSEL.set.size}건 골랐어요</b><button data-act="logall">모두 고르기</button><button data-act="logdelsel" class="out"${LSEL.set.size?'':' disabled'}>지우기</button></div>`:''}`;
  }else{
    top=`<article class="case"><span class="no">현재 수사 중인 사건 없음</span><h3 style="margin:4px 0 6px">건강 이상 없음</h3>
      <p style="margin:0 0 10px;font-size:13px">열이 나거나 아프기 시작하면 기록을 남겨 주세요. 새 사건 파일이 자동으로 열려요.</p>
      <div class="sickbtns"><button data-act="log" data-v="temp">+ 체온</button><button data-act="log" data-v="med">+ 투약</button><button data-act="log" data-v="sym">+ 증상</button></div></article>
    <p class="notice">${warn}</p>`;
  }
  const vs=S.visits.slice().sort((a,b)=>a.date<b.date?1:-1);
  const visits=vs.length?vs.map(v=>`<button class="visit" data-act="editvisit" data-id="${v.id}"><b>${fmtK(v.date)}${v.hospital?' '+esc(v.hospital):''}</b>${v.diag?`<span><i>진단</i> ${esc(v.diag)}</span>`:''}${v.rx?`<span><i>처방</i> ${esc(v.rx)}</span>`:''}${v.next?`<span><i>다음 진료</i> ${fmtK(v.next)}</span>`:''}${v.ask?`<span class="ask"><i style="color:var(--red)">다음에 물어볼 것</i> ${esc(v.ask)}</span>`:''}</button>`).join(''):'<p class="vempty">아직 진료 기록이 없어요.</p>';
  const closed=S.eps.filter(e=>!ep||e.id!==ep.id).sort((a,b)=>a.start<b.start?1:-1);
  const closedHtml=closed.length?'<h2 class="subh">지난 사건</h2>'+closed.map(e=>{const L=logsOf(e.id),tm=L.filter(l=>l.kind==='temp').map(l=>+l.value).filter(x=>!isNaN(x)),mc=L.filter(l=>l.kind==='med').length;
    return `<button class="case solved closedep" data-act="viewep" data-id="${e.id}"><b>${esc(e.title)}</b><small>${fmtK(e.start,true)}${e.end?' ~ '+fmtK(e.end,true):''}${tm.length?`, 최고 ${Math.max(...tm)}℃`:''}, 투약 ${mc}회</small></button>`}).join(''):'';
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>긴급 출동</h1>${sickSeg()}<p>체온, 투약, 증상을 시간순으로 남겨 두면 교대할 때나 병원에서 바로 보여줄 수 있어요.</p></header>${CHARS.guide('sick')}
  ${top}
  ${sickReport()}
  ${window.CLAIM?CLAIM.entryHtml():''}
  <section><h2 class="sh" style="align-items:center"><span>진료 기록</span><button class="ghost" data-act="editvisit" data-id="">+ 진료 추가</button></h2>${visits}</section>
  ${closedHtml}`;
}
function openLog(kind,id){
  const l=id?S.logs.find(x=>x.id===id):null;kind=l?l.kind:kind;
  const ep=l?S.eps.find(e=>e.id===l.ep):activeEp();
  const lastT=S.logs.filter(x=>x.kind==='temp').sort((a,b)=>a.at<b.at?1:-1)[0];
  const at=l?l.at:nowLocal(),[d0,t0]=at.split('T');
  const lastMed=S.logs.filter(x=>x.kind==='med').sort((a,b)=>a.at<b.at?1:-1)[0];   // 새 투약 기록은 지난 투약(약 이름·용량)과 같게 미리 채워요
  const medH=[...new Set(S.logs.filter(x=>x.kind==='med').sort((a,b)=>a.at<b.at?1:-1).map(x=>x.value))].slice(0,5);
  const meds=medH.concat(['해열제','감기약','콧물약','비타민D','유산균'].filter(m=>!medH.includes(m))).slice(0,8);   // 쓴 약 + 흔한 예시
  const epH=[...new Set(S.eps.map(e=>e.title).filter(Boolean))].slice(-4).reverse(),epNames=epH.concat(['감기','해열','비타민','건강 관리','장염','예방접종 후'].filter(m=>!epH.includes(m))).slice(0,8);   // 사건 이름 예시
  let body='';
  if(kind==='temp'){const v=l?l.value:(lastT?lastT.value:'37.0');
    body=`<div class="stepper"><button data-act="tstep" data-v="-0.1" aria-label="0.1도 내리기">−</button><div><input id="l-val" inputmode="decimal" value="${esc(v)}" aria-label="체온"><small>℃</small></div><button data-act="tstep" data-v="0.1" aria-label="0.1도 올리기">+</button></div>
      ${(()=>{const vv=(S.vaccines||[]).filter(v=>v.done&&(v.done===today()||v.done===addDays(today(),-1)));return vv.length?`<p class="notice" style="margin:0 0 8px">💉 어제·오늘 접종: ${vv.map(v=>esc(v.name)).join(', ')} — 접종 뒤 미열이 날 수 있어요. 열 패턴을 볼 때 참고하세요.</p>`:''})()}<div class="field"><span>측정 부위</span><div class="quick" id="l-site">${SITES.map(s=>`<button data-act="pick1" class="${(l?l.site:'귀')===s?'on':''}">${s}</button>`).join('')}</div></div>`}
  else if(kind==='med')body=`<div class="field"><span>해열제 성분 <small>(눌러서 고르고, 아래 제품도 골라요)</small></span>${Object.values(ANTI).map(a=>`<div class="quick"><button data-act="fill" data-t="l-val" data-v="${a.n}" style="font-weight:700">${a.n}</button>${a.b.map(b=>`<button data-act="fill" data-t="l-val" data-v="${esc(b.replace(/\(.*\)/,m=>/이부|아세트/.test(m)?m:'')+'('+a.n+')')}">${esc(b)}</button>`).join('')}</div>`).join('')}</div>
      <label class="field"><span>약 이름</span><input id="l-val" maxlength="40" value="${esc(l?l.value:(lastMed?lastMed.value:''))}" placeholder="예: 챔프(아세트아미노펜)">${meds.length?`<div class="quick">${meds.map(m=>`<button data-act="fill" data-t="l-val" data-v="${esc(m)}">${esc(m)}</button>`).join('')}</div>`:''}</label>
      <label class="field"><span>용량 (처방, 설명서대로)</span><input id="l-dose" maxlength="20" value="${esc(l?l.dose:(lastMed?lastMed.dose||'':''))}" placeholder="예: 2.5ml"></label><p class="notice" id="l-medhint" style="margin:0 0 8px"></p>`;
  else body=`<label class="field"><span>증상</span><input id="l-val" maxlength="60" value="${esc(l?l.value:'')}" placeholder="예: 콧물"><div class="quick">${SYMS.map(s=>`<button data-act="addsym" data-v="${s}">${s}</button>`).join('')}</div></label>`;
  openSheet(`<h3>${KIND[kind]} ${l?'수정':'기록'}</h3>
    ${!ep?`<label class="field"><span>사건 이름 (새 사건 파일이 열려요)</span><input id="l-ep" maxlength="20" value="${esc(kind==='temp'?'발열':(kind==='med'&&lastMed&&(S.eps.find(e=>e.id===lastMed.ep)||{}).title)||'건강 관리')}" placeholder="예: 감기, 해열, 비타민, 건강 관리"><div class="quick">${epNames.map(m=>`<button data-act="fill" data-t="l-ep" data-v="${esc(m)}">${esc(m)}</button>`).join('')}</div></label>`:`<label class="field"><span>사건 이름 <small>(바꾸면 이 사건 전체 이름이 바뀌어요)</small></span><input id="l-ep" maxlength="20" value="${esc(ep.title)}" placeholder="예: 감기, 해열, 비타민, 건강 관리"><div class="quick">${epNames.map(m=>`<button data-act="fill" data-t="l-ep" data-v="${esc(m)}">${esc(m)}</button>`).join('')}</div></label>`}
    ${body}
    ${kind==='sym'?`<div class="dytpr"><label class="field"><span>시작 날짜</span><input id="l-date" type="date" value="${d0}"></label><label class="field"><span>완료 날짜 <small>(선택)</small></span><input id="l-until-d" type="date" value="${l&&l.until?l.until.slice(0,10):d0}"></label></div>
    <div class="dytpr"><div class="field"><span>시작 시각</span>${window.DAY&&DAY.tpick?DAY.tpick('l-time',t0||''):`<input id="l-time" type="time" value="${t0||''}">`}</div><div class="field"><span>완료 시각 <small>(선택)</small></span>${window.DAY&&DAY.tpick?DAY.tpick('l-until',l&&l.until?l.until.slice(11,16):'',true):''}</div></div>
    <div class="dytpr"><span></span><div class="dytpq" style="margin-top:0"><button type="button" class="ghost" data-dy="now" data-act="untilnow" data-t="l-until">지금 나았어요</button><button type="button" class="ghost" data-dy="tpx" data-t="l-until">비우기</button></div></div>`
    :`<label class="field"><span>날짜</span><input id="l-date" type="date" value="${d0}"></label>
    <div class="dytpr one"><div class="field"><span>시각</span>${window.DAY&&DAY.tpick?DAY.tpick('l-time',t0||''):`<input id="l-time" type="time" value="${t0||''}">`}</div></div>`}
    <label class="field"><span>메모 (선택)</span><input id="l-memo" maxlength="100" value="${esc(l?l.memo:'')}" placeholder="예: 보채고 수유량 줄어듦"></label>
    ${window.CLAIM?CLAIM.field(l?'log:'+l.id:'',kind==='med'?'약봉지':kind==='sym'?'증상사진':'기타',d0):''}
    <p class="err" id="l-err"></p>
    <div class="actions">${l?`<button class="danger" data-act="dellog" data-id="${l.id}">삭제</button>`:''}<button class="secondary" data-act="close">취소</button><button class="primary" data-act="savelog" data-k="${kind}" data-id="${l?l.id:''}" data-ep="${ep?ep.id:''}">저장</button></div>`);
  medHint();
}
function openVisit(id){
  const v=id?S.visits.find(x=>x.id===id):{date:today(),hospital:(S.visits.slice(-1)[0]||{}).hospital||'',diag:'',rx:'',next:'',ask:''};
  openSheet(`<h3>진료 ${id?'수정':'기록'}</h3>
    <div class="row3" style="grid-template-columns:1fr 1fr"><label class="field"><span>진료일</span><input id="c-date" type="date" value="${v.date}"></label><label class="field"><span>다음 진료 (선택)</span><input id="c-next" type="date" value="${v.next||''}"></label></div>
    <label class="field"><span>병원</span><input id="c-hos" maxlength="40" value="${esc(v.hospital)}" placeholder="예: 우리동네 소아청소년과"></label>
    <label class="field"><span>진단</span><input id="c-diag" maxlength="60" value="${esc(v.diag)}" placeholder="예: 감기"></label>
    <label class="field"><span>처방</span><input id="c-rx" maxlength="100" value="${esc(v.rx)}" placeholder="예: 해열제 시럽, 콧물약 3일분"></label>
    <label class="field"><span>다음에 물어볼 것</span><textarea id="c-ask" maxlength="200" placeholder="예: 콧물 흡입기 써도 되는지">${esc(v.ask)}</textarea></label>
    ${window.CLAIM?CLAIM.field(id?'visit:'+id:'','처방전',v.date):''}
    <p class="err" id="c-err"></p>
    <div class="actions">${id?`<button class="danger" data-act="delvisit" data-id="${id}">삭제</button>`:''}<button class="secondary" data-act="close">취소</button><button class="primary" data-act="savevisit" data-id="${id||''}">저장</button></div>`);
}
function viewEp(id){
  const e=S.eps.find(x=>x.id===id),L=logsOf(id);
  openSheet(`<h3>${esc(e.title)}, ${fmtK(e.start,true)} ~ ${fmtK(e.end,true)}</h3>
    ${tempChart(L)}
    <div class="recs" style="margin-top:10px">${L.map(l=>`<div class="logrow"><span class="lt">${fmtAt(l.at)}</span><span class="tag" style="background:${KCOL[l.kind]}">${KIND[l.kind]}</span><span class="lm"><b>${logMain(l)}</b>${l.memo?`<small>${esc(l.memo)}</small>`:''}</span><span class="lb">${l.by||''}</span></div>`).join('')||'<p class="vempty">기록이 없어요.</p>'}</div>
    <div class="actions" style="margin-top:14px"><button class="danger" data-act="delep" data-id="${id}">사건 삭제</button><button class="secondary" data-act="reopenep" data-id="${id}">다시 열기</button><button class="primary" data-act="close">닫기</button></div>`);
}

