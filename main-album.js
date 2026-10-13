// 사건 앨범 탭 (앨범 칸 모음·도구 칸) — index.html에서 나눈 전역 스크립트 (순서: main-core → render → sick → album → meal → sheets → boot)
// ---------- 사건 앨범 ----------
// 미확인 사건 목록: 최초 목격 제목이 조금 달라도(예: '뒤집기 시도', '까르르 웃음') 그 사건을 목격한 걸로 봐요
const MILEK={'첫 사회적 미소':/사회적\s*미소|첫\s*미소|웃어\s*줬/,'소리 내어 웃기':/소리\s*(내어|내서|내며)?\s*웃|까르르|깔깔/,'목 가누기':/목\s*(을\s*)?가누/,'뒤집기':/뒤집/,'혼자 앉기':/혼자\s*앉|앉기|앉았/,'첫 이':/첫\s*이(\s|$)|이가?\s*(났|나왔|올라)|첫\s*치아/,'기기':/^기기|배밀이|기어(가|다)|네발\s*기기|기기\s*성공/,'잡고 서기':/잡고\s*(일어)?서/,'첫 걸음':/걸음|걸었|걷기|걸음마/,'첫 단어':/첫\s*(단어|말)|말(을)?\s*했/};
const mileSeen=(t,F)=>F.some(m=>m.title===t||(MILEK[t]&&MILEK[t].test(m.title||'')));
const MILES=[['첫 사회적 미소','1~2개월'],['소리 내어 웃기','3~4개월'],['목 가누기','3~4개월'],['뒤집기','4~6개월'],['혼자 앉기','6~8개월'],['첫 이','6~10개월'],['기기','7~10개월'],['잡고 서기','9~12개월'],['첫 걸음','12개월 전후'],['첫 단어','12개월 전후']];
const firsts=()=>S.moments.filter(m=>m.type!=='month'&&m.type!=='free'&&m.type!=='report'&&m.type!=='extra'&&m.type!=='fam').sort((a,b)=>a.date<b.date?1:-1);
const dayNo=d=>daysBetween(S.profile.birth,d)+1;
function polaroid(m,big,rot){const ph=safeImg(PHOTOS[m.id]);
  return `<button class="pola ${big?'big':''}" style="transform:rotate(${rot}deg)" ${ph?`data-view="${m.id}"`:`data-act="editmom" data-id="${m.id}"`}>${m.board?'<span class="onboard">보드</span>':''}${ph?`<img src="${ph}" alt="${esc(m.title)} 사진" loading="lazy" decoding="async">`:m.photo?'<span class="noph">사진 불러오는 중</span>':'<span class="noph">사진 없음</span>'}<span class="pt"><b>${esc(m.title)}</b><small>생후 ${dayNo(m.date)}일</small></span><small class="pw">${fmtK(m.date,true)}${m.by?`, ${m.by} 수사관 최초 목격`:''}</small>${ALBUM.exStrip(m)}</button>`}
// 접기: 앨범 칸·사진첩 달별로 접고 펴기 (이 폰에만 기억)
const FOLDK='soeun-fold';let FOLD={};try{FOLD=JSON.parse(localStorage.getItem(FOLDK)||'{}')||{}}catch(e){}
function isFold(k,def){return k in FOLD?FOLD[k]:!!def}
function setFold(k,v){FOLD[k]=v;try{localStorage.setItem(FOLDK,JSON.stringify(FOLD))}catch(e){}}
const fsec=k=>isFold(k)?' class="folded"':'';
function renderAlbum(){
  const p=S.profile,d=daysBetween(p.birth,today())+1,d100=addDays(p.birth,99);
  const F=firsts(),seen={has:t=>mileSeen(t,F)};
  const rots=[-2,2,-1.5,1.5,-1,1];
  const months=[];const [mo]=monthsDays(p.birth,today());for(let i=1;i<=Math.min(mo+1,24);i++)months.push(i);
  const mm=months.map(i=>{const m=S.moments.find(x=>x.type==='month'&&x.title===i+'개월'),ph=m&&safeImg(PHOTOS[m.id]);
    return `<button class="mcell" ${ph?`data-view="${m.id}"`:`data-act="${m?'editmom':'addmonth'}" data-id="${m?m.id:''}" data-v="${i}"`}>${m&&m.board?'<span class="onboard">보드</span>':''}${ph?`<img src="${ph}" alt="${i}개월 사진" loading="lazy" decoding="async">`:`<span class="mph">+ ${i}개월</span>`}<small>${m?i+'개월':fmtK(addMonths(p.birth,i),true)}</small></button>`}).join('');
  const av=S.albumView==='board'||S.albumView==='family'?S.albumView:'album';
  const aseg=`<div class="seg aview">${[['album','<i>📷</i>앨범'],['family','<i>👨‍👩‍👧</i>가족'],['board','<i>📌</i>수사 보드']].map(([k,l])=>`<button class="${av===k?'on':''}" data-act="aview" data-v="${k}">${l}</button>`).join('')}</div>`;
  if(av==='family')return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>가족 앨범</h1>${aseg}<p>엄마·아빠·소은이가 함께한 사진을 모아요.</p></header>${FAMILY.render()}
  <button class="fab" data-fa="up">+ 가족 사진</button>`;
  if(S.albumView==='board')return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>수사 보드</h1>${aseg}</header>${BOARD.render()}`;
  return `<header class="vhead"><span class="no">사건 파일 No.${fileNo()}</span><h1>사건 앨범</h1>${aseg}</header>${CHARS.guide('album')}${MEMO.onThisDay()}
  ${(()=>{const rp=ALBUM.reportDoc(),ph=(rp&&safeImg(PHOTOS[rp.id]))||safeImg(PHOTOS[(firsts().slice().reverse().find(m=>m.photo&&safeImg(PHOTOS[m.id]))||{}).id])||safeImg(PHOTOS.profile);
    return `<button class="nextcard rcard100" data-act="report" style="margin-top:14px">${ph?`<span class="r100ph"><img src="${ph}" alt=""><i>${d<100?'D-'+(100-d):'100일'}</i></span>`:''}<span><small>${d<100?fmtK(d100,true)+' 기밀 해제 예정':'기밀 해제 완료'}</small><span class="t">100일 사건 보고서</span><small>태어나서 100일까지 키·몸무게 변화, 최초 목격, 접종을 한 장에 정리해요 · ${d<100?'미리 보기':'보고서 보기'}</small></span>${ph?'':`<span class="d">${d<100?'D-'+(100-d):'100일'}</span>`}</button>`})()}
  <div style="display:flex;gap:8px;margin-top:8px"><button class="ghost rpick" data-al="report" style="flex:1">📷 ${ALBUM.reportDoc()?'보고서 사진 바꾸기':'보고서 사진 미리 올리기'}</button><button class="ghost rpick" data-book="open" style="flex:1">📖 성장 앨범 책 (PDF)</button></div>
  <div class="atools"><button data-st="open"><i>📸</i>기념 사진관</button><button data-mvset="open"><i>🎬</i>성장 영상</button><button data-pp="open"><i>📰</i>${esc(((p.name||'우리 아기').replace(/^[가-힣](?=[가-힣]{2}$)/,'')))}일보</button><button data-cp="openview"><i>🔒</i>봉인된 증거물</button><button data-xp="open"><i>🗺️</i>탐험 지도</button><button data-lk="open"><i>🔍</i>닮은꼴 판정단</button></div>
  ${ALBUM.sectionHtml()}
  <section${fsec('a-month')}><h2 class="sh" data-fold="a-month"><span>월별 증거 사진</span><span>매달 ${+p.birth.slice(8)}일</span></h2><div class="mgrid">${mm}</div><div class="mbtns"><button class="storybtn" data-story>▶ 성장 스토리 보기</button><button class="storybtn pose" data-pcopen="">📷 같은 포즈로 찍기</button></div></section>
  <section${fsec('a-first')}><h2 class="sh" data-fold="a-first" style="align-items:baseline"><span style="font-family:var(--display);font-size:21px;color:var(--navy);letter-spacing:0">최초 목격 기록</span><span>${F.length}건 확보</span></h2>
    ${F.length?`<div class="polas">${F.map((m,i)=>polaroid(m,i===0,rots[i%rots.length])).join('')}</div>`:'<p class="vempty">첫 미소, 첫 옹알이 같은 순간을 기록해 보세요.</p>'}
    <button class="solve" data-act="addmom" style="width:100%;margin-top:18px;min-height:50px">+ 최초 목격 기록</button></section>
  <section${fsec('a-miles')}><h2 class="sh" data-fold="a-miles" style="border-bottom:2px solid var(--ink);padding-bottom:6px"><span>미확인 사건, 목격하면 눌러서 기록</span></h2>
    ${MILES.filter(([t])=>!seen.has(t)).map(([t,a])=>`<button class="vrow" data-act="addmom" data-v="${t}"><span class="box" style="border-style:dashed;border-radius:50%"></span><span class="vn"><span>${t}</span></span><span class="vd">보통 ${a}</span></button>`).join('')}
    <p class="foot" style="margin-top:8px">시기는 아기마다 차이가 커요. 비교용이 아니라 기억용이에요.</p></section>
  <button class="fab" data-al="pick">+ 사진 올리기</button>`;
}
function addDays(s,n){return new Date(pd(s)+n*864e5).toISOString().slice(0,10)}
function openMoment(id,preset){
  const m=id?S.moments.find(x=>x.id===id):{type:preset&&preset.type||'first',title:preset&&preset.title||'',date:preset&&preset.date||today(),memo:''};
  pending=undefined;const month=m.type==='month';
  openSheet(`<h3>${month?esc(m.title)+' 증거 사진':id?'최초 목격 수정':'최초 목격 기록'}</h3>
    ${month?'':`<label class="field"><span>무엇을 목격했나요?</span><input id="m-title" maxlength="30" value="${esc(m.title)}" placeholder="예: 첫 뒤집기">${id?'':`<div class="quick">${MILES.slice(0,6).map(([t])=>`<button data-act="fill" data-t="m-title" data-v="${t}">${t}</button>`).join('')}</div>`}</label>`}
    <label class="field"><span>날짜</span><input id="m-date" type="date" value="${m.date}" min="${S.profile.birth}" max="${today()}"></label>
    ${photoField(id?safeImg(PHOTOS[id]):'',month?'':'대표 사진 (여러 장 고를 수 있어요)',false,!month)}${month?'':ALBUM.exField(id)}
    <label class="field"><span>메모 (선택)</span><textarea id="m-memo" maxlength="200" placeholder="예: 아빠가 노래 불러줄 때 처음 웃음">${esc(m.memo||'')}</textarea></label>
    <p class="err" id="m-err"></p>
    <div class="actions">${id?`<button class="danger" data-act="delmom" data-id="${id}">삭제</button>`:''}<button class="secondary" data-act="close">취소</button><button class="primary" data-act="savemom" data-id="${id||''}" data-type="${m.type}" data-title="${esc(m.title)}">저장</button></div>`);
}
function renderReport(){
  const p=S.profile,d100=addDays(p.birth,99),done=today()>=d100,upto=done?d100:today();
  const recs=sorted().filter(r=>r.date<=upto);
  const first=k=>recs.find(r=>r[k]!=null&&r[k]!==''),last=k=>recs.slice().reverse().find(r=>r[k]!=null&&r[k]!=='');
  const row=(k)=>{const a=first(k),b=last(k);if(!a)return '';return `<div class="rstat"><small>${KINDS[k].label}</small><span><span class="muted">${fmt(k,a[k])}${KINDS[k].unit}</span> → <b>${b&&b!==a?fmt(k,b[k])+KINDS[k].unit:'[기록 대기]'}</b></span></div>`};
  const F=firsts().filter(m=>m.date<=upto).slice().reverse();
  const vDone=S.vaccines.filter(v=>v.done&&v.done<=upto).length;
  const rp=ALBUM.reportDoc(),rph=rp&&safeImg(PHOTOS[rp.id]);
  const ph=rph||safeImg(PHOTOS[(F.slice().reverse().find(m=>m.photo)||{}).id])||safeImg(PHOTOS.profile);
  const events=F.map(m=>`<span>생후 ${dayNo(m.date)}일, ${esc(m.title)}${m.by?` (${m.by} 목격)`:''}</span>`).concat(S.periods.filter(pp=>pDone(pp)).map(pp=>{const last=vacsOf(pp.id).map(v=>v.done).sort().pop();return last<=upto?{d:last,t:`<span>생후 ${dayNo(last)}일, ${esc(pp.name)} 예방접종 해결</span>`}:null}).filter(Boolean).map(x=>x.t));
  return `<div class="report">
    <div class="rhead"><span class="no">사건 파일 No.${fileNo()}, ${done?'기밀 해제':'작성 중'}</span><h1>100일 사건 보고서</h1></div>
    <div class="rphoto" ${rph?`data-view="${rp.id}" role="button"`:''}>${ph?`<img src="${ph}" alt="">`:'<span class="noph">사진 없음</span>'}<span class="cap">${fmtDate(d100)}, 생후 100일</span><span class="stamp">${done?'100일 달성':'D-'+daysBetween(today(),d100)}</span></div>
    <button class="ghost rpick" data-al="report">📷 ${rp?'보고서 사진 바꾸기':done?'보고서 사진 고르기':'보고서 사진 미리 올리기'}</button>
    <p class="rtext">명탐정 ${esc(p.name)}${jo(p.name,'은','는')} ${fmtK(p.birth,true)} ${first('weight')?fmt('weight',first('weight').weight)+'kg로 ':''}탐정 사무소의 문을 열었다. 100일간 엄마, 아빠 수사관과 함께한 수사 결과 아래와 같은 성장이 확인되었다.</p>
    <div class="rstats">${row('weight')}${row('height')}${row('head')}</div>
    <div class="rnums"><div><b>${vDone}</b><small>해결한 접종</small></div><div><b>${F.length}</b><small>최초 목격</small></div><div><b>${recs.length}</b><small>증거 기록</small></div></div>
    ${events.length?`<div class="revents"><small class="no">주요 사건</small>${events.join('')}</div>`:''}
    <div class="rfoot"><span><small>함께한 수사관</small><b>엄마${p.mom?' '+esc(p.mom):''}, 아빠${p.dad?' '+esc(p.dad):''}</b></span></div>
    <p class="foot">화면을 캡처해서 가족에게 공유해 보세요.</p>
    <button class="secondary" data-act="closereport" style="width:100%;margin-top:6px">앨범으로 돌아가기</button>
  </div>`;
}

