// 뼈대: 성장 기준표(WHO)·상태 S·미리보기 MOCK/DB·화면 이동 기록(NAV)·폰 사본·수사관·예방접종 계산 — index.html에서 나눈 전역 스크립트 (순서: main-core → render → sick → album → meal → sheets → boot)
// WHO Child Growth Standards, girls 0–24 months: [L, M, S] per month
const WFA=[[0.3809,3.2322,0.14171],[0.1714,4.1873,0.13724],[0.0962,5.1282,0.13000],[0.0402,5.8458,0.12619],[-0.0050,6.4237,0.12402],[-0.0430,6.8985,0.12274],[-0.0756,7.2970,0.12204],[-0.1039,7.6422,0.12178],[-0.1288,7.9487,0.12181],[-0.1507,8.2254,0.12199],[-0.1700,8.4800,0.12223],[-0.1872,8.7192,0.12247],[-0.2024,8.9481,0.12268],[-0.2158,9.1699,0.12283],[-0.2278,9.3870,0.12294],[-0.2384,9.6008,0.12299],[-0.2478,9.8124,0.12303],[-0.2562,10.0226,0.12306],[-0.2637,10.2315,0.12309],[-0.2703,10.4393,0.12315],[-0.2762,10.6464,0.12323],[-0.2815,10.8534,0.12335],[-0.2862,11.0608,0.12350],[-0.2903,11.2688,0.12369],[-0.2941,11.4775,0.12390]];
const LFA=[[49.1477,.03790],[53.6872,.03640],[57.0673,.03568],[59.8029,.03520],[62.0899,.03486],[64.0301,.03463],[65.7311,.03448],[67.2873,.03441],[68.7498,.03440],[70.1435,.03444],[71.4818,.03452],[72.7710,.03464],[74.0150,.03479],[75.2176,.03496],[76.3817,.03514],[77.5099,.03534],[78.6055,.03555],[79.6710,.03576],[80.7079,.03598],[81.7182,.03620],[82.7036,.03643],[83.6654,.03666],[84.6040,.03688],[85.5202,.03711],[86.4153,.03734]].map(([M,S])=>[1,M,S]);
const HCA=[[33.8787,.03496],[36.5463,.03210],[38.2521,.03168],[39.5328,.03140],[40.5817,.03119],[41.4590,.03102],[42.1995,.03087],[42.8290,.03075],[43.3671,.03063],[43.8300,.03053],[44.2319,.03044],[44.5844,.03035],[44.8965,.03027],[45.1752,.03019],[45.4265,.03012],[45.6551,.03006],[45.8650,.03000],[46.0598,.02994],[46.2424,.02989],[46.4152,.02985],[46.5801,.02981],[46.7384,.02977],[46.8913,.02973],[47.0391,.02970],[47.1822,.02967]].map(([M,S])=>[1,M,S]);

// WHO Child Growth Standards, boys 0–24 months
const WFA_B=[[0.3487,3.3464,0.14602],[0.2297,4.4709,0.13395],[0.1970,5.5675,0.12385],[0.1738,6.3762,0.11727],[0.1553,7.0023,0.11316],[0.1395,7.5105,0.11080],[0.1257,7.9340,0.10958],[0.1134,8.2970,0.10902],[0.1021,8.6151,0.10882],[0.0917,8.9014,0.10881],[0.0820,9.1649,0.10891],[0.0730,9.4122,0.10906],[0.0644,9.6479,0.10925],[0.0563,9.8749,0.10949],[0.0487,10.0953,0.10976],[0.0413,10.3108,0.11007],[0.0343,10.5228,0.11041],[0.0275,10.7319,0.11079],[0.0211,10.9385,0.11119],[0.0148,11.1430,0.11164],[0.0087,11.3462,0.11211],[0.0029,11.5486,0.11261],[-0.0028,11.7504,0.11314],[-0.0083,11.9514,0.11369],[-0.0137,12.1515,0.11426]];
const LFA_B=[[49.8842,.03795],[54.7244,.03557],[58.4249,.03424],[61.4292,.03328],[63.8860,.03257],[65.9026,.03204],[67.6236,.03165],[69.1645,.03139],[70.5994,.03124],[71.9687,.03117],[73.2812,.03118],[74.5388,.03125],[75.7488,.03137],[76.9186,.03154],[78.0497,.03174],[79.1458,.03197],[80.2113,.03222],[81.2487,.03250],[82.2587,.03279],[83.2418,.03310],[84.1996,.03342],[85.1348,.03376],[86.0477,.03410],[86.9410,.03445],[87.8161,.03479]].map(([M,S])=>[1,M,S]);
const HCA_B=[[34.4618,.03686],[37.2759,.03133],[39.1285,.02997],[40.5135,.02918],[41.6317,.02868],[42.5576,.02837],[43.3306,.02817],[43.9803,.02804],[44.5300,.02796],[44.9998,.02792],[45.4051,.02790],[45.7573,.02789],[46.0661,.02789],[46.3395,.02791],[46.5844,.02792],[46.8060,.02795],[47.0088,.02797],[47.1962,.02800],[47.3711,.02803],[47.5357,.02806],[47.6919,.02810],[47.8408,.02813],[47.9833,.02817],[48.1201,.02821],[48.2515,.02825]].map(([M,S])=>[1,M,S]);
const isBoy=()=>!!(S&&S.profile&&S.profile.sex==='M');
const sexWord=()=>isBoy()?'남아':'여아';

const KINDS={
  weight:{label:'몸무게',unit:'kg',get t(){return isBoy()?WFA_B:WFA},dec:2},
  height:{label:'키',unit:'cm',get t(){return isBoy()?LFA_B:LFA},dec:1},
  head:{label:'머리둘레',unit:'cm',get t(){return isBoy()?HCA_B:HCA},dec:1}
};
const ORDER=['weight','height','head'];
const MONTH=30.4375;

function lmsAt(t,m){m=Math.max(0,Math.min(24,m));const i=Math.min(Math.floor(m),23),f=m-i,a=t[i],b=t[i+1];return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f]}
function valAt(k,m,z){const[L,M,S]=lmsAt(KINDS[k].t,m);return Math.abs(L)<1e-6?M*Math.exp(S*z):M*Math.pow(1+L*S*z,1/L)}
function zOf(k,m,x){const[L,M,S]=lmsAt(KINDS[k].t,m);return Math.abs(L)<1e-6?Math.log(x/M)/S:(Math.pow(x/M,L)-1)/(L*S)}
function cdf(z){const t=1/(1+0.2316419*Math.abs(z)),d=0.3989423*Math.exp(-z*z/2),p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-p:p}
function pct(k,m,x){return cdf(zOf(k,m,x))*100}
function pctText(p){if(p<1)return '1백분위 미만';if(p>99)return '99백분위 초과';return Math.round(p)+'백분위'}

// dates (all as YYYY-MM-DD, compared in UTC)
const pd=s=>{const[y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)};
const daysBetween=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
function today(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}
function monthsDays(birth,date){
  const[by,bm,bd]=birth.split('-').map(Number),[y,m,d]=date.split('-').map(Number);
  let mo=(y-by)*12+(m-bm);if(d<bd)mo--;if(mo<0)return[0,0];
  const anchor=Date.UTC(by,bm-1+mo,bd);return[mo,Math.round((pd(date)-anchor)/864e5)];
}
function fmtDate(s){const[y,m,d]=s.split('-').map(Number);return `${y}.${m}.${d}`}
const num=v=>v===''||v==null?null:(isFinite(+v)&&+v>0?+v:NaN);
const fmt=(k,v)=>String(+(+v).toFixed(KINDS[k].dec));
const safeImg=s=>typeof s==='string'&&(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)||/^https:\/\/firebasestorage\.googleapis\.com\/[^"'<>\s]+$/.test(s))?s:'';
let pending;
function readPhoto(file,big){const LIM=big?380000:180000;return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const img=new Image();img.onerror=rej;img.onload=()=>{const max=big?1600:900,sc=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext('2d').drawImage(img,0,0,c.width,c.height);let q=.82,d=c.toDataURL('image/jpeg',q);while(d.length>LIM&&q>.35){q-=.08;d=c.toDataURL('image/jpeg',q)}if(d.length>LIM){const c2=document.createElement('canvas');c2.width=c.width/2;c2.height=c.height/2;c2.getContext('2d').drawImage(c,0,0,c2.width,c2.height);d=c2.toDataURL('image/jpeg',.7)}res(d)};img.src=fr.result};fr.readAsDataURL(file)})}
let EXTRA_FILES=[],PGEO=null;   // PGEO: 편집창에서 고른 사진의 찍은 곳·시각 (탐험 지도)
function photoField(src,label,big,multi){EXTRA_FILES=[];return `<div class="field"><span>${label||'사진 (선택)'}</span><label class="pbox"><img id="pv" class="pv" alt="" ${src?`src="${src}"`:'hidden'}><span class="pbox-in">${I_CAM}<b>여기를 눌러 사진 고르기</b><small>찍은 날짜도 알아서 읽어요</small></span><span class="pbox-ch">사진 바꾸기</span><input type="file" accept="image/*,application/octet-stream" id="f-photo" ${big?'data-big="1"':''} ${multi?'multiple':''} hidden></label><button class="danger prm" data-act="rmphoto" ${src?'':'hidden'}>사진 빼기</button></div>`}
document.addEventListener('change',async e=>{if(e.target.id!=='f-photo'||!e.target.files[0])return;const f0=e.target.files[0];if(!/^image\//.test(f0.type)){toast('사진 파일만 고를 수 있어요');e.target.value='';return}EXTRA_FILES=[...e.target.files].slice(1).filter(f=>/^image\//.test(f.type));const exh=document.getElementById('exfield');if(exh){const o=exh.querySelector('.exnew');if(o)o.remove();if(EXTRA_FILES.length)exh.insertAdjacentHTML('beforeend',`<p class="hint exnew" style="margin:6px 0 0;color:var(--red)">+ ${EXTRA_FILES.length}장은 저장하면 '사진 더'에 붙어요</p>`)}const dEl=document.getElementById('m-date')||document.getElementById('af-date');try{const mt=await ALBUM.photoMeta(f0),tk=dEl?mt.date:'';PGEO=mt.geo?{geo:mt.geo,tm:mt.tm||''}:null;pending=await readPhoto(f0,e.target.dataset.big==='1');if(tk&&tk>=S.profile.birth&&tk<=today()&&dEl.value!==tk){dEl.value=tk;toast('사진 찍은 날짜('+fmtK(tk,true)+')로 맞췄어요')}const pv=document.getElementById('pv');pv.src=pending;pv.hidden=false;const rm=document.querySelector('[data-act=rmphoto]');if(rm)rm.hidden=false}catch(err){toast('사진을 읽지 못했어요. 다른 사진으로 해 주세요')}});
// 받침에 맞춰 조사 고르기: jo('소은','은','는') → '은' · joRo('경정') → '으로' (ㄹ 받침·받침 없음은 '로')
const jo=(w,a,b)=>{const t=String(w??''),c=t.charCodeAt(t.length-1);return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?a:b};
const joRo=w=>{const t=String(w??''),c=t.charCodeAt(t.length-1),j=(c-0xAC00)%28;return c>=0xAC00&&c<=0xD7A3&&j&&j!==8?'으로':'로'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));


// ---------- storage (Google Sheets via Apps Script) ----------
const S={me:{role:''},sickView:'',cares:[],looks:[],capsules:[],walks:[],townView:'',eps:[],logs:[],visits:[],moments:[],foods:[],meals:[],cubes:[],menus:[],menuMonth:'',mealAll:false,view:'',mode:'loading',err:'',profile:null,records:[],periods:[],vaccines:[],hosp:[],recipes:[],checkups:[],vacView:'vac',albumView:'album',tab:'grow',chart:'weight'};
const PHOTOS={};let busy=false;
// ---------- 화면 이동 기록 ----------
// 안쪽 화면(S.view)을 열면 그 전 화면(탭·안쪽 화면·스크롤 위치)을 기억하고, 돌아가기·뒤로가기(goBack)는 그 화면 그 위치로 돌아가요
// 새 화면을 만들 때: 열기는 S.view='이름' 그대로, 닫기·돌아가기 단추는 goBack(). S.view=''(탭 이동 등)이면 기록을 비워요
const NAV=[];let NAVcur=null,_view='';
Object.defineProperty(S,'view',{enumerable:true,configurable:true,get:()=>_view,set:v=>{v=v||'';if(v===_view)return;
  if(!v){NAV.length=0;_view='';return}
  const i=NAV.findIndex(e=>e.view===v&&e.tab===S.tab);   // '놀이터로'처럼 앞 화면으로 가는 단추는 돌아가기처럼
  if(i>=0){const e=NAV[i];NAV.length=i;_view=v;requestAnimationFrame(()=>window.scrollTo(0,e.y));return}
  if(NAVcur){NAV.push(Object.assign({},NAVcur,{y:Math.round(window.scrollY)}));if(NAV.length>30)NAV.shift()}
  _view=v}});
function goBack(){
  const e=NAV.pop();
  if(!e){if(_view==='play'||_view==='fun'){_view='medals';if(window.GAME&&GAME.hub)GAME.hub('play')}else{if(_view==='hosp')S.tab='sick';else if(_view==='recipe')S.tab='food';_view=''}render();window.scrollTo(0,0);return}
  S.tab=e.tab;S.albumView=e.albumView;S.vacView=e.vacView;S.townView=e.townView||'';S.sickView=e.sickView||'';_view=e.view;render();window.scrollTo(0,e.y);requestAnimationFrame(()=>window.scrollTo(0,e.y))}
const DEMO=false;
const DB={me:{role:'엄마'},profile:{name:'미리보기',birth:'2026-07-06',photo:false,mom:'',dad:'',momPhoto:false,dadPhoto:false},
  records:[{id:'d1',date:'2026-07-06',weight:3.26,height:51,head:null,memo:'태어난 날',photo:false},{id:'d2',date:'2026-09-24',weight:5.7,height:null,head:null,memo:'',photo:false}],
  periods:[{id:'p1',name:'출생',month:0,confirmed:'',hospital:''},{id:'p2',name:'2개월',month:2,confirmed:'',hospital:''},{id:'p3',name:'4개월',month:4,confirmed:'2026-11-10',hospital:'우리동네 소아청소년과'},{id:'p4',name:'6개월',month:6,confirmed:'',hospital:''}],
  foods:[{id:'f1',name:'쌀',start:'2026-09-20',result:'통과',reaction:'',memo:'',by:'엄마'},{id:'f2',name:'소고기',start:'2026-09-23',result:'',reaction:'',memo:'',by:'아빠'}],meals:[{id:'ml1',date:'2026-09-23',slot:'아침',menu:'소고기 쌀미음',amount:'40g',eat:'잘먹음',memo:'',photo:false,by:'아빠'}],cubes:[{id:'c1',name:'소고기',count:'5',made:'2026-09-20',memo:''}],menus:[],
  hospitals:[],recipes:[],checkups:[],people:[],devs:[],guesses:[],looks:[],capsules:[],walks:[],cares:[],eps:[],logs:[],visits:[],moments:[{id:'m1',type:'first',title:'첫 사회적 미소',date:'2026-09-02',memo:'',photo:false,by:'아빠'}],
  vaccines:[{id:'v1',period:'p1',name:'B형간염 1차',sub:'',done:'2026-07-06',memo:''},{id:'v2',period:'p2',name:'DTaP-IPV/Hib 1차',sub:'5가 혼합 백신',done:'2026-09-08',memo:''},{id:'v3',period:'p2',name:'폐렴구균 1차',sub:'',done:'2026-09-08',memo:''},{id:'v4',period:'p3',name:'DTaP-IPV/Hib 2차',sub:'',done:'',memo:''},{id:'v5',period:'p3',name:'폐렴구균 2차',sub:'',done:'',memo:''},{id:'v6',period:'p4',name:'DTaP-IPV/Hib 3차',sub:'',done:'',memo:''}]};
const ITBL={ep:'eps',log:'logs',visit:'visits',mom:'moments',food:'foods',meal:'meals',cube:'cubes',menu:'menus',people:'people',dev:'devs',guess:'guesses',look:'looks',capsule:'capsules',walk:'walks'};
let dseq=100;const nid=p=>p+(dseq++);
const MOCK={
  getData:()=>{const d=JSON.parse(JSON.stringify(DB));d.game=Object.assign({},d.game||{},{srv:true});return d},getPhoto:()=>'',getPhotos:()=>({}),
  saveProfile:p=>{DB.profile={name:p.name,birth:p.birth,photo:'photo' in p?!!p.photo:DB.profile.photo,mom:p.mom??DB.profile.mom,dad:p.dad??DB.profile.dad,momPhoto:'momPhoto' in p?!!p.momPhoto:DB.profile.momPhoto,dadPhoto:'dadPhoto' in p?!!p.dadPhoto:DB.profile.dadPhoto};if(p.role)DB.me.role=p.role;return{data:MOCK.getData()}},
  setMyRole:r=>{DB.me.role=r;return{data:MOCK.getData()}},
  saveRecord:r=>{const id=r.id||nid('d');const o={id,date:r.date,weight:r.weight??null,height:r.height??null,head:r.head??null,memo:r.memo||'',photo:!!r.photo,by:r.by||''};const i=DB.records.findIndex(x=>x.id===id);if(i>=0)DB.records[i]=o;else DB.records.push(o);return{id,data:MOCK.getData()}},
  deleteRecord:id=>{DB.records=DB.records.filter(x=>x.id!==id);return{data:MOCK.getData()}},
  savePeriod:p=>{const id=p.id||nid('p');const o={id,name:p.name,month:p.month,confirmed:p.confirmed||'',hospital:p.hospital||''};const i=DB.periods.findIndex(x=>x.id===id);if(i>=0)DB.periods[i]=o;else DB.periods.push(o);
    const keep=p.vaccines.filter(v=>v.id).map(v=>v.id);DB.vaccines=DB.vaccines.filter(v=>v.period!==id||keep.includes(v.id));
    p.vaccines.forEach(v=>{if(v.id){const x=DB.vaccines.find(y=>y.id===v.id);if(x){x.name=v.name;x.sub=v.sub||''}}else DB.vaccines.push({id:nid('v'),period:id,name:v.name,sub:v.sub||'',done:'',memo:''})});return{id,data:MOCK.getData()}},
  deletePeriod:id=>{DB.periods=DB.periods.filter(x=>x.id!==id);DB.vaccines=DB.vaccines.filter(v=>v.period!==id);return{data:MOCK.getData()}},
  saveVaccine:v=>{const id=v.id||nid('v');const o={id,period:v.period,name:v.name,sub:v.sub||'',done:v.done||'',memo:v.memo||'',by:v.done?(v.by||''):''};const i=DB.vaccines.findIndex(x=>x.id===id);if(i>=0)DB.vaccines[i]=o;else DB.vaccines.push(o);return{id,data:MOCK.getData()}},
  deleteVaccine:id=>{DB.vaccines=DB.vaccines.filter(x=>x.id!==id);return{data:MOCK.getData()}},
  saveItem:(k,o)=>{const T=ITBL[k];const id=o.id||nid(k);const x=Object.assign({},DB[T].find(y=>y.id===id)||{},o,{id});if(k==='mom'||k==='meal'||k==='menu'||k==='people'||k==='capsule')x.photo='photo' in o?!!o.photo:!!(DB[T].find(m=>m.id===id)||{}).photo;const i=DB[T].findIndex(y=>y.id===id);if(i>=0)DB[T][i]=x;else DB[T].push(x);return{id,data:MOCK.getData()}},
  deleteItem:(k,id)=>{const T=ITBL[k];DB[T]=DB[T].filter(y=>y.id!==id);if(k==='ep')DB.logs=DB.logs.filter(l=>l.ep!==id);return{data:MOCK.getData()}},
  setGeo:(id,geo)=>{[].concat(id).forEach(i=>{const m=DB.moments.find(x=>x.id===i);if(m)m.geo=geo});return{data:MOCK.getData()}},
  setFocus:(id,fp)=>{const m=DB.moments.find(x=>x.id===id);if(m)m.fp=fp;return{data:MOCK.getData()}},
  careSave:(date,it,old)=>{const id=it.id||('c'+Date.now().toString(36)+(dseq++));DB.cares=DB.cares.filter(x=>x.id!==id);DB.cares.push(Object.assign({k:'memo',t:'00:00',e:'',ml:0,l:0,r:0,dur:0,pee:0,poo:0,amt:'',st:'',memo:'',live:0,side:'',seg:0,by:DB.me.role,at:Date.now()},it,{id,date}));return{id,data:MOCK.getData()}},
  careImport:(L)=>{L.forEach(x=>MOCK.careSave(x.date,x.it,''));return{n:L.length,data:MOCK.getData()}},
  careDelete:(date,id)=>{DB.cares=DB.cares.filter(x=>x.id!==id);return{data:MOCK.getData()}},
  backupData:()=>({app:'soeun-diary',v:1,at:new Date().toISOString(),family:DB.profile,cols:{records:DB.records,mom:DB.moments||[],meal:DB.meals||[]},care:{},game:DB.game||{}}),
  restoreData:(bk)=>{if(!bk||bk.app!=='soeun-diary')throw new Error('수사 일지 백업 파일이 아니에요');return{n:Object.values(bk.cols||{}).reduce((a,l)=>a+(l||[]).length,0),data:MOCK.getData()}},
  gameTx:(fn)=>{const g=DB.game||(DB.game={}),out=fn(JSON.parse(JSON.stringify(g)))||null;if(out){Object.assign(g,out.set||{});g.acorn=Math.max(0,(g.acorn||0)+(out.add||0))}return out},
  ledgerGet:()=>(DB.ledger||[]).slice(),
  ledgerAdd:(e)=>{(DB.ledger=DB.ledger||[]).unshift(Object.assign({id:'l'+Date.now(),t:Date.now(),by:DB.me.role,ok:1},e));return{ok:true}},
  saveGame:(o,dl,un,once,why,bal)=>{if(dl&&!(o&&o.acornSet!=null))MOCK.ledgerAdd({d:dl,why:why||'도토리',bal});if(once){const g0=DB.game||(DB.game={}),k=typeof once==='string'?once:once.key,v=typeof once==='string'?null:once.val;if(v===null?g0[k]:(g0[k]&&String(g0[k])>=v))throw new Error('이미 받은 보상이에요');Object.keys(o||{}).forEach(x=>{if(x!=='acornSet'&&x!=='acorn')g0[x]=o[x]});g0[k]=v===null?((o||{})[k]||true):v;g0.acorn=(g0.acorn||0)+(dl||0);return{ok:true}}const g=DB.game||(DB.game={});Object.keys(un||{}).forEach(k=>{g[k]=[...new Set([...(g[k]||[]),...un[k]])]});Object.keys(o||{}).forEach(k=>{if(k!=='acornSet'&&k!=='acorn')g[k]=o[k]});if(o&&o.acornSet!=null)g.acorn=o.acornSet;else if(dl)g.acorn=(g.acorn||0)+dl;return{ok:true}},
  saveCheckup:c=>{DB.checkups=DB.checkups.filter(x=>x.id!==c.id).concat([Object.assign({},c,{by:DB.me.role})]);return{data:MOCK.getData()}},
  deleteCheckup:id=>{DB.checkups=DB.checkups.filter(x=>x.id!==id);return{data:MOCK.getData()}},
  saveRecipe:r=>{DB.recipes=DB.recipes.filter(x=>x.month!==r.month).concat([Object.assign({},r,{by:DB.me.role})]);return{data:MOCK.getData()}},
  deleteRecipe:m=>{DB.recipes=DB.recipes.filter(x=>x.month!==m);return{data:MOCK.getData()}},
  setBoard:(id,on)=>{const m=DB.moments.find(x=>x.id===id);if(m)m.board=!!on;return{data:MOCK.getData()}},
  saveHospital:h=>{const x=DB.hospitals.find(y=>y.hpid===h.hpid);if(x)Object.assign(x,h);else DB.hospitals.push(Object.assign({star:false,memo:'',lunch:'',reserve:'',moonlight:false},h));return{data:MOCK.getData()}},
  completePeriod:(pid,date,ids,by)=>{DB.vaccines.forEach(v=>{if(ids.includes(v.id)){v.done=date;v.by=by||''}});return{data:MOCK.getData()}}
};
const run=(fn,...a)=>window.APIReady.then(api=>api.call(fn,a));
const errMsg=e=>'저장하지 못했어요: '+((e&&e.message)||'알 수 없는 오류');
function setData(d){document.title=((d.profile&&d.profile.name)?d.profile.name+' ':'')+'성장 수사 일지';S.me=d.me||{role:''};S.eps=d.eps||[];S.logs=d.logs||[];S.visits=d.visits||[];S.moments=d.moments||[];S.foods=d.foods||[];S.meals=d.meals||[];S.cubes=d.cubes||[];S.menus=d.menus||[];S.people=d.people||[];S.devs=d.devs||[];S.guesses=d.guesses||[];S.looks=d.looks||[];S.capsules=d.capsules||[];S.walks=d.walks||[];S.cares=d.cares||[];S.profile=d.profile;S.records=d.records||[];S.periods=d.periods||[];S.vaccines=d.vaccines||[];S.hosp=d.hospitals||[];S.recipes=d.recipes||[];S.checkups=d.checkups||[];S.game=d.game||null;S.mode='ok'}
document.addEventListener('click',e=>{const h=e.target.closest('[data-fold]');if(!h||e.target.closest('button:not([data-fold]),a,[data-view]'))return;const k=h.dataset.fold,box=h.closest('section,.amon'),now=box?box.classList.contains('folded'):isFold(k);setFold(k,!now);if(box)box.classList.toggle('folded',!now);else render()});
let pumped=false;
function apply(d){setData(d);render.soft=true;try{render()}finally{render.soft=false};loadPhotos();askRole();saveCache(d);if(!pumped&&S.mode==='ok'){pumped=true;setTimeout(()=>{ALBUM.pump();ALBUM.shared()},1500)}}
async function refresh(){try{apply(await run('getData'))}catch(e){if(S.mode!=='ok'){S.mode='error';S.err=(e&&e.message)||'';render()}}}
// ---------- 폰에 저장해 두는 캐시 (열자마자 바로 보이게) ----------
const CK='soeun-cache-v1';let phTimer;
let cacheT,cacheD;function saveCache(d){if(DEMO)return;cacheD=d;clearTimeout(cacheT);cacheT=setTimeout(()=>{try{localStorage.setItem(CK,cacheJSON(cacheD))}catch(e){}},2000)}   // 바뀔 때마다 통째로 쓰지 않고 2초 모아서
const cacheJSON=d=>{const cut=addDays(today(),-60);return JSON.stringify(d,(k,v)=>k==='path'&&typeof v==='string'&&v.length>2000?undefined:k==='cares'&&Array.isArray(v)?v.filter(x=>x.date>=cut):v)};   // 하루 수사 기록은 최근 60일만 폰 사본에   // 긴 탐문 경로는 폰 사본에서 빼요 (서버에서 다시 받아요)
function savePhCache(){if(DEMO)return;try{const first=['profile','mom','dad'],keep={};let size=0;
  const keys=first.concat(Object.keys(PHOTOS).filter(k=>!first.includes(k)).reverse());
  for(const k of keys){const v=PHOTOS[k];if(!v)continue;if(size+v.length>2500000)continue;keep[k]=v;size+=v.length}
  localStorage.setItem(CK+'-ph',JSON.stringify(keep))}catch(e){}}
function cachePhSoon(){clearTimeout(phTimer);phTimer=setTimeout(savePhCache,3000)}
const LOADING=new Set(),STALE=new Set();
function loadCache(){if(DEMO)return;try{const ph=JSON.parse(localStorage.getItem(CK+'-ph')||'{}');Object.keys(ph).forEach(k=>{PHOTOS[k]=ph[k];STALE.add(k)});
  const d=JSON.parse(localStorage.getItem(CK)||'null');if(d&&d.profile){setData(d);render()}}catch(e){}}
// 사진은 여러 장을 묶어서 한 번에 불러오기 (저장해 둔 사진은 먼저 보여주고 뒤에서 최신으로 교체)
async function loadPhotos(){
  const want=[],add=id=>{if(id&&(!PHOTOS[id]||STALE.has(id))&&!LOADING.has(id)&&!want.includes(id))want.push(id)};
  const p=S.profile;if(p){if(p.photo)add('profile');if(p.momPhoto)add('mom');if(p.dadPhoto)add('dad')}
  const desc=(a,b)=>a.date<b.date?1:a.date>b.date?-1:0;
  S.records.slice().sort(desc).forEach(r=>{if(r.photo)add(r.id)});
  S.moments.forEach(m=>{if(m.photo)add(m.id)});
  (S.people||[]).forEach(x=>{if(x.photo)add(x.id)});
  (S.capsules||[]).forEach(c=>{if(c.photo&&c.open&&c.open<=today())add(c.id)});   // 봉인된 증거물 사진은 열린 뒤에만
  S.meals.slice().sort(desc).slice(0,20).forEach(m=>{if(m.photo)add(m.id)});
  S.menus.filter(m=>m.month===curMenuMonth()).forEach(m=>{if(m.photo)add(m.id)});
  if(!want.length)return;want.forEach(id=>LOADING.add(id));
  // 사진 주소는 Firebase 기록에 이미 있어서 한 번에 받아요. 예전엔 4장마다 화면을 다시 그려서, 사진이 많으면 열 때 몇 초씩 버벅였어요 → 다 받은 뒤 한 번만 그려요
  try{const got=await run('getPhotos',want)||{};let ch=false;want.forEach(id=>{if(got[id]&&PHOTOS[id]!==got[id]){PHOTOS[id]=got[id];ch=true}STALE.delete(id)});if(ch)render()}catch(e){}finally{want.forEach(id=>LOADING.delete(id))}
  cachePhSoon();
}
async function write(fn,...args){
  if(busy)return null;busy=true;toast('저장 중…');
  try{const res=await run(fn,...args);apply(res.data);return res}catch(e){toast(errMsg(e));return null}finally{busy=false}
}
async function saveProfile(p){const res=await write('saveProfile',p);if(!res)return false;[['photo','profile'],['momPhoto','mom'],['dadPhoto','dad']].forEach(([f,k])=>{if(f in p){if(p[f])PHOTOS[k]=p[f];else delete PHOTOS[k]}});render();return true}
async function saveRecord(r){const res=await write('saveRecord',r);if(!res)return false;if('photo' in r){if(r.photo)PHOTOS[res.id]=r.photo;else delete PHOTOS[res.id];render()}return true}
async function deleteRecord(id){const res=await write('deleteRecord',id);if(!res)return false;delete PHOTOS[id];return true}

// ---------- investigators ----------
function lsRole(){try{return localStorage.getItem('investigator')||''}catch(e){return ''}}
function myRole(){return S.me.role||lsRole()}
let roleAsked=false;
function askRole(){if(roleAsked||myRole()||(S.me&&S.me.viewer)||!S.profile||!S.profile.birth)return;roleAsked=true;openRole()}
const I_BADGE='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"></path><path d="M9 12l2 2 4-4"></path></svg>';
async function setRole(r){try{localStorage.setItem('investigator',r)}catch(e){}S.me.role=r;render();try{await run('setMyRole',r)}catch(e){}}
function openRole(){openSheet(`<h3>어느 수사관이신가요?</h3>
  <p class="hint" style="margin:-8px 0 12px">이 폰에서 남기는 기록에 수사관 이름이 붙어요. 나중에 탐정 정보에서 바꿀 수 있어요.</p>
  <div class="rolepick"><button data-act="role" data-v="엄마">${CHARS.svg('mom','heart',{size:84})}엄마</button><button data-act="role" data-v="아빠">${CHARS.svg('dad','lens',{size:84})}아빠</button></div>`)}

function openInv(role){
  const k=role==='엄마'?'mom':'dad',p=S.profile;pending=undefined;
  openSheet(`<h3>${role} 수사관 정보</h3>
    <label class="field"><span>이름 (선택)</span><input id="i-name" maxlength="20" value="${esc(p[k]||'')}" placeholder="예: ${role==='엄마'?'김OO':'유OO'}"></label>
    ${photoField(safeImg(PHOTOS[k]))}
    <label class="check"><input type="checkbox" id="i-me" ${myRole()===role?'checked':''}> 이 폰은 ${role} 수사관이 써요</label>
    <p class="err" id="i-err"></p>
    <div class="actions"><button class="secondary" data-act="close">취소</button><button class="primary" data-act="saveinv" data-v="${role}">저장</button></div>`);
}

// ---------- vaccine helpers ----------
const WD='일월화수목금토';
function addMonths(s,m){const[y,mo,d]=s.split('-').map(Number);return new Date(Date.UTC(y,mo-1+m,d)).toISOString().slice(0,10)}
function fmtK(s,noWd){const[y,m,d]=s.split('-').map(Number);const w=WD[new Date(Date.UTC(y,m-1,d)).getUTCDay()];return (y!==+today().slice(0,4)?y+'년 ':'')+m+'월 '+d+'일'+(noWd?'':'('+w+')')}
const fmtMD=s=>{const[,m,d]=s.split('-').map(Number);return m+'.'+d};
function ddayText(s){const n=daysBetween(today(),s);return n>0?'D-'+n:n===0?'오늘':(-n)+'일 지남'}
const vacsOf=pid=>S.vaccines.filter(v=>v.period===pid);
const recDate=p=>(p.month===''||p.month==null)?'':addMonths(S.profile.birth,+p.month);
const pDate=p=>p.confirmed||recDate(p)||today();
const pDone=p=>{const v=vacsOf(p.id);return v.length>0&&v.every(x=>x.done)};
const byDate=(a,b)=>pDate(a)<pDate(b)?-1:pDate(a)>pDate(b)?1:0;
function caseNo(p){const i=S.periods.slice().sort(byDate).findIndex(x=>x.id===p.id);return String(i+1).padStart(2,'0')}
function nextPeriod(){return S.periods.filter(p=>!pDone(p)&&vacsOf(p.id).length).sort(byDate)[0]||null}
const fileNo=()=>S.profile.birth.slice(5).replace('-','');
// 동네 탐문 탭 위 칸: 탐험 지도(첫 화면) | 날씨·동네 소식
function townSeg(v){return `<div class="seg tview">${[['','<i>🗺️</i>탐험 지도'],['info','<i>☀️</i>날씨·동네 소식']].map(([k,l])=>`<button class="${(v||'')===k?'on':''}" data-act="townv" data-v="${k}">${l}</button>`).join('')}</div>`}

