// 성장 수사 일지 — Firebase 연결 (로그인, 가족 공간, 기록 저장, 사진, 이사, 새 버전 안내)
import { FIREBASE_CONFIG } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, collection, getDoc, setDoc, deleteDoc, onSnapshot, writeBatch, serverTimestamp, Timestamp, increment, arrayUnion, runTransaction, deleteField } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, getBlob } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

const fb = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(fb);
const db = initializeFirestore(fb, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const storage = getStorage(fb);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// ---------- 표 구성 (기존 시트와 같은 칸) ----------
const TBL = {
  ep: ['title', 'start', 'end', 'memo'],
  log: ['ep', 'kind', 'at', 'value', 'dose', 'site', 'memo', 'by', 'until'],   // until: 증상 완료 시각 'YYYY-MM-DDTHH:MM' (2026.10.17 추가)
  visit: ['date', 'hospital', 'diag', 'rx', 'next', 'ask', 'by'],
  mom: ['type', 'title', 'date', 'memo', 'photo', 'by', 'of', 'who'],   // of: 최초 목격 추가 사진(type:'extra')이 붙은 기록 id, who: 가족 사진(type:'fam')에 나온 사람
  food: ['name', 'start', 'result', 'reaction', 'memo', 'by'],
  meal: ['date', 'slot', 'menu', 'amount', 'eat', 'memo', 'photo', 'by'],
  cube: ['name', 'count', 'made', 'memo'],
  menu: ['month', 'title', 'photo'],
  people: ['name', 'rel', 'photo', 'by'],   // 가족 앨범의 가족 (할머니·이모…)
  dev: ['at', 'by'],                        // 발달 체크 (문서 id = 항목 id, at = 확인한 날)
  guess: ['role', 'value', 'at', 'base', 'by'],  // 몸무게 예측 대결 (예측한 날 at, kg value, base = 그때 마지막 측정 기록 id)
  look: ['date', 'pick', 'parts', 'by'],          // 닮은꼴 판정단 (문서 id = 날짜_mom|dad, pick: mom·dad·both, parts: 닮은 곳 쉼표로)
  capsule: ['title', 'body', 'open', 'occ', 'sealed', 'photo', 'by'],   // 봉인된 증거물 (open: 열리는 날, occ: 첫 돌 같은 이름, sealed: 봉인한 날)
  doc: ['kind', 'date', 'title', 'link', 'amount', 'hosp', 'drug', 'claim', 'memo', 'photo', 'by', 'grp'],   // 서류함(보험 청구): '건' 머리 문서(grp '', 종류 쉼표·병원비 hosp·약값 drug·amount 합계)와 사진 문서(grp=머리 id, 사진 한 장), link='log:<id>'·'visit:<id>'·'vac:<id>'·'chk:<id>', claim: 미청구·청구함·지급완료 (2026.10.17 추가)
  walk: ['date', 'kind', 'title', 'place', 'geo', 'start', 'end', 'dist', 'path', 'pics', 'memo', 'who', 'wx', 'mood', 'by']   // 탐문 기록 (산책·나들이, path: 경로 글자, pics: 같이 올린 사진 id)
};
const OUT = { ep: 'eps', log: 'logs', visit: 'visits', mom: 'moments', food: 'foods', meal: 'meals', cube: 'cubes', menu: 'menus', people: 'people', dev: 'devs', guess: 'guesses', look: 'looks', capsule: 'capsules', walk: 'walks', doc: 'docs' };
const LIM = { body: 5000, path: 60000, pics: 4000 };       // 칸별 글자 수 (나머지는 300)
const OPT = { mom: ['geo', 'tm', 'fp'], meal: ['tm'] };   // meal tm: 먹인 시각 HH:MM (하루 수사 타임라인)   // 보낼 때만 쓰는 칸 (안 보내면 그대로 둬요 — 사진 위치·찍은 시각·보여 줄 곳은 고쳐 저장해도 안 지워지게)
const COLS = ['records', 'periods', 'vaccines', ...Object.keys(TBL)];
const SCHEDULE = [
  ['출생', 0, [['B형간염 1차', '']]],
  ['1개월', 1, [['B형간염 2차', ''], ['BCG (결핵)', '생후 4주 이내']]],
  ['2개월', 2, [['DTaP 1차', '디프테리아, 파상풍, 백일해'], ['폴리오 1차', ''], ['Hib 1차', 'b형 헤모필루스 인플루엔자'], ['폐렴구균 1차', ''], ['로타바이러스 1차', '백신 종류에 따라 2회 또는 3회']]],
  ['4개월', 4, [['DTaP 2차', ''], ['폴리오 2차', ''], ['Hib 2차', ''], ['폐렴구균 2차', ''], ['로타바이러스 2차', '']]],
  ['6개월', 6, [['DTaP 3차', ''], ['폴리오 3차', '6~18개월 사이'], ['Hib 3차', ''], ['폐렴구균 3차', ''], ['B형간염 3차', ''], ['로타바이러스 3차', '3회 백신을 맞는 경우만'], ['인플루엔자', '6개월부터 매년 가을, 첫해는 4주 간격 2회']]],
  ['12~15개월', 12, [['MMR 1차', '홍역, 유행성이하선염, 풍진'], ['수두', ''], ['Hib 4차', ''], ['폐렴구균 4차', ''], ['A형간염 1차', '12~23개월'], ['일본뇌염 1차', '12~23개월, 백신 종류에 따라 일정이 달라요']]],
  ['15~18개월', 15, [['DTaP 4차', '']]],
  ['18~24개월', 18, [['A형간염 2차', '1차 접종 6~12개월 뒤']]],
  ['24개월', 24, [['일본뇌염 추가접종', '1차 접종 약 1년 뒤, 백신 종류에 따라 달라요']]],
  ['만 4~6세', 48, [['DTaP 5차', ''], ['폴리오 4차', ''], ['MMR 2차', '']]],
  ['만 6세', 72, [['일본뇌염 추가접종', '불활성화 백신을 맞은 경우']]]
];

// ---------- 폰 안의 사본 (화면은 여기서 바로 그림) ----------
const M = { fid: '', uid: '', family: null, member: null, members: [], col: {}, hosp: new Map(), recipes: new Map(), checkups: new Map(), care: new Map(), game: null, gameSrv: false };
COLS.forEach(c => { M.col[c] = new Map(); });
let unsubs = [], lastJSON = '', pendingRemote = false, ready = false;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const newId = p => p + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
const role_ = r => (r === '엄마' || r === '아빠') ? r : '';
const myRole = () => (M.member && M.member.role) || '';
// 보기 전용 초대(할머니 등): 초대 코드가 V로 시작해 9로 끝나요. 이 폰과 members 문서에 viewer 표시
const VIEW_CODE = /^V[A-Z2-9]{4}9$/;
const isViewer = () => { if (M.member && M.member.viewer) return true; try { return localStorage.getItem('viewer-' + M.fid) === '1'; } catch (e) { return false; } };
const dateOk = d => d === '' || /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const txt = (v, n) => String(v == null ? '' : v).slice(0, n);
const numOrNull = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
const fref = () => doc(db, 'families', M.fid);
const GAME_KEYS = ['acorn', 'hats', 'hat', 'hatOf', 'room', 'slot', 'clothes', 'wear', 'stickers', 'roulette', 'pic', 'paid', 'props', 'propOf', 'pos', 'regrant', 'wanted', 'look', 'bpos', 'whome', 'paper', 'feed'];   // feed: 수유 알람 설정 {on, day, night, ns, ne, pre}   // whome: 탐문 기록 기본 출발지 {g:'위도,경도', n:이름}   // look: 캐릭터 컨셉 옷을 한 번 입힌 표시
const dref = (c, id) => doc(db, 'families', M.fid, c, String(id));
// 아직 서버에 안 닿은 내 놀이 저장 (2026.10.13): 트랜잭션(도토리 쓰기)은 폰 안 사본에 바로 안 들어가서, 그 사이 다른 데이터가 와서 화면을 다시 그리면 방금 산 물건·도토리가 옛 값으로 돌아갔다 서버 값이 오면 다시 나타났어요
// → 서버에서 같은 값이 확인될 때까지(최대 20초) 내 값을 위에 덮어 보여 줘요
const OV = { f: {}, a: null };
const jeq = (a, b) => JSON.stringify(a) === JSON.stringify(b), jcl = v => v === undefined ? v : JSON.parse(JSON.stringify(v));
function ovApply(g, clean) {
  const now = Date.now();
  const done = o => clean && o.ack && now - o.t > 3000;   // 서버가 받았다고 했고 3초 지났으면 이제 서버 값을 믿어요 (그 사이 다른 폰이 바꾼 것도 보이게)
  Object.keys(OV.f).forEach(k => { const o = OV.f[k]; if (now - o.t > 20000 || done(o) || (clean && jeq(g[k], o.v))) { delete OV.f[k]; return; } g[k] = jcl(o.v); });
  if (OV.a) { if (now - OV.a.t > 8000 || done(OV.a) || (clean && +g.acorn === OV.a.v)) OV.a = null; else g.acorn = OV.a.v; }
  return g;
}
const list = c => [...M.col[c].values()].sort((a, b) => ((a._o ?? 0) - (b._o ?? 0)) || String(a.id).localeCompare(String(b.id)));
const app = () => window.__app;

// 서버 응답이 늦어도(지하철 등) 화면은 바로 넘어가고, 저장은 뒤에서 마저 해요
async function commit(p) {
  let late = false;
  p.catch(e => { if (late && app()) app().toast('서버 저장에 실패했어요: ' + ((e && e.message) || '')); });
  await Promise.race([p, sleep(2500).then(() => { late = true; })]);
}
function localSet(c, id, data) { const cur = M.col[c].get(id) || { id }; M.col[c].set(id, Object.assign({}, cur, data, { id })); }
// 하루 수사 기록 한 줄 다듬기 (모든 칸을 늘 같이 보내서 merge 저장이어도 옛 값이 안 남게)
const CARE_K = ['formula', 'breast', 'pump', 'diaper', 'sleep', 'bath', 'memo', 'play'];
function careRow(it) {
  it = it || {}; const hm = v => /^\d{2}:\d{2}$/.test(v || '') ? v : '', num = (v, max, dp) => { const n = Number(v); return isFinite(n) && n > 0 ? Math.min(max, Math.round(n * (dp || 1)) / (dp || 1)) : 0; };
  const id = /^c[a-z0-9]{4,24}$/.test(it.id || '') ? it.id : newId('c').toLowerCase().replace(/[^a-z0-9]/g, '');
  return { id, k: CARE_K.includes(it.k) ? it.k : 'memo', t: hm(it.t) || '00:00', e: hm(it.e), ml: num(it.ml, 2000), l: num(it.l, 600, 10), r: num(it.r, 600, 10), dur: num(it.dur, 600),
    pee: it.pee ? 1 : 0, poo: it.poo ? 1 : 0, amt: txt(it.amt, 10), st: txt(it.st, 10), pa: txt(it.pa, 10), memo: txt(it.memo, 300), what: txt(it.what, 80), live: it.live ? 1 : 0, pz: it.pz ? 1 : 0, side: it.side === 'l' || it.side === 'r' ? it.side : '', seg: num(it.seg, 9e15),
    by: role_(it.by) || myRole(), at: num(it.at, 9e15) || Date.now() };
}

// ---------- 화면용 데이터 (예전 getData와 같은 모양) ----------
function build() {
  const f = M.family || {};
  const item = k => list(k).map(o => {
    const c = { id: o.id };
    TBL[k].forEach(key => { c[key] = key === 'photo' ? !!o.photoUrl : (o[key] == null ? '' : String(o[key])); });
    if (k === 'meal') c.tm = o.tm ? String(o.tm) : '';
    if (k === 'mom') { c.board = !!o.board; c.geo = o.geo ? String(o.geo) : ''; c.tm = o.tm ? String(o.tm) : ''; c.fp = o.fp ? String(o.fp) : ''; }   // fp: 사진에서 보여 줄 곳 "가로,세로"(0~1, focus.js)   // 수사 보드에 붙인 사진, 찍은 곳 "위도,경도"(빼기는 -), 찍은 시각 HH:MM(:SS)
    c.t = +o._o > 1e12 ? +o._o : 0;                 // 남긴 때 (이번 주 수배범 계산용, 예전에 옮겨 온 기록은 0)
    return c;
  });
  const d = {
    profile: { name: f.name || '', birth: f.birth || '', sex: f.sex === 'M' ? 'M' : 'F', photo: !!f.photoUrl, mom: f.mom || '', dad: f.dad || '', momPhoto: !!f.momPhotoUrl, dadPhoto: !!f.dadPhotoUrl },
    me: { role: myRole(), hasEmail: true, viewer: isViewer() },
    records: list('records').filter(r => r.date).map(r => ({ id: r.id, date: r.date, weight: numOrNull(r.weight), height: numOrNull(r.height), head: numOrNull(r.head), memo: r.memo || '', photo: !!r.photoUrl, by: r.by || '', t: +r._o > 1e12 ? +r._o : 0 })),
    periods: list('periods').map(p => ({ id: p.id, name: String(p.name || ''), month: p.month === '' || p.month == null ? '' : Number(p.month), confirmed: p.confirmed || '', hospital: p.hospital || '' })),
    vaccines: list('vaccines').map(v => ({ id: v.id, period: String(v.period || ''), name: String(v.name || ''), sub: v.sub || '', done: v.done || '', memo: v.memo || '', by: v.by || '' }))
  };
  Object.keys(TBL).forEach(k => { d[OUT[k]] = item(k); });
  d.recipes = [...M.recipes.values()].map(r => ({ month: r.id, title: r.title || '', file: r.file || '', stages: r.stages || [], by: r.by || '' }));
  d.checkups = [...M.checkups.values()].map(c => ({ id: c.id, done: c.done || '', hospital: c.hospital || '', memo: c.memo || '', by: c.by || '' }));
  // 하루 수사: 날짜 문서마다 items 맵 → 한 줄 목록 (날짜 date 붙여서)
  d.cares = []; M.care.forEach((items, date) => Object.values(items || {}).forEach(it => { if (it && it.id) d.cares.push(Object.assign({}, it, { date })); }));
  // 두 폰이 같이 쓰는 놀이 저장 (도토리·방·옷·모자·스티커·룰렛), srv: 서버에서 한 번이라도 받았는지 (처음 합치기는 그다음에)
  d.game = M.game ? Object.assign({}, GAME_KEYS.reduce((o, k) => { if (M.game[k] !== undefined) o[k] = M.game[k]; return o; }, {}), { srv: M.gameSrv }) : null;
  d.hospitals = [...M.hosp.values()].map(h => ({ hpid: h.id, star: !!h.star, memo: h.memo || '', lunch: h.lunch || '', reserve: h.reserve || '', moonlight: !!h.moonlight, updatedBy: h.updatedBy || '' }));
  return d;
}
function data() { const d = build(); lastJSON = JSON.stringify(d); return d; }

// 배우자가 기록하면 바로 반영 (입력 창이 열려 있으면 닫힌 뒤에)
let remoteTimer;
function onRemote() {
  if (!ready) return;
  clearTimeout(remoteTimer);
  remoteTimer = setTimeout(() => { pendingRemote = true; flushRemote(); }, 300);
}
function flushRemote() {
  const a = app();
  if (!pendingRemote || !a || a.isBusy() || a.sheetOpen()) return;
  pendingRemote = false;
  const d = build(), j = JSON.stringify(d);
  if (j === lastJSON) return;
  lastJSON = j; a.apply(d);
}
setInterval(flushRemote, 1500);

// ---------- 사진 (Firebase Storage) ----------
async function upload(key, dataUrl) {
  const m = /^data:(image\/(jpeg|png|webp));base64,/.exec(dataUrl || '');
  if (!m || dataUrl.length > 400000) throw new Error('사진 형식이 올바르지 않아요');
  const blob = await (await fetch(dataUrl)).blob();
  return uploadBlob(key, blob, m[1], m[2]);
}
async function uploadBlob(key, blob, type, ext) {
  const path = `families/${M.fid}/photos/${key}_${Date.now().toString(36)}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: type, cacheControl: 'public,max-age=31536000' });
  return { photoUrl: await getDownloadURL(r), photoPath: path };
}
// 사진관·영상·신문이 canvas에 그릴 사진을 로그인 경로로 받기 (브라우저 사본 문제로 일반 주소가 막힐 때 마지막 방법)
window.__photoBlob = async url => {
  const m = /\/o\/([^?]+)/.exec(String(url || '')); if (!m) throw new Error('사진 주소가 올바르지 않아요');
  const path = decodeURIComponent(m[1]); if (!path.startsWith(`families/${M.fid}/`)) throw new Error('우리 가족 사진이 아니에요');
  return getBlob(ref(storage, path));
};
function dropPhoto(path) { if (path) deleteObject(ref(storage, path)).catch(() => {}); }
// 사진 바꾸기: 새 사진을 먼저 올리고 옛 사진은 지움
async function photoFields(key, dataUrl, oldPath, prefix = 'photo') {
  const up = dataUrl ? await upload(key, dataUrl) : { photoUrl: '', photoPath: '' };
  dropPhoto(oldPath);
  return { [prefix + 'Url']: up.photoUrl, [prefix + 'Path']: up.photoPath };
}
function photoUrlOf(id) {
  const f = M.family || {};
  if (id === 'profile') return f.photoUrl || '';
  if (id === 'mom' || id === 'dad') return f[id + 'PhotoUrl'] || '';
  for (const c of ['records', 'mom', 'meal', 'menu', 'people', 'capsule', 'doc']) { const o = M.col[c].get(String(id)); if (o && o.photoUrl) return o.photoUrl; }
  return '';
}

// ---------- 예전 서버 함수와 같은 이름, 같은 결과 ----------
const H = {
  getData: () => data(),
  getPhotos: ids => { const out = {}; (ids || []).forEach(id => { const u = photoUrlOf(id); if (u) out[id] = u; }); return out; },
  getPhoto: id => photoUrlOf(id),

  async saveProfile(pr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pr.birth || '')) throw new Error('태어난 날 형식이 올바르지 않아요');
    const f = M.family || {};
    const upd = { name: txt(pr.name || '우리 아기', 20), birth: pr.birth };
    if ('mom' in pr) upd.mom = txt(pr.mom, 20);
    if ('dad' in pr) upd.dad = txt(pr.dad, 20);
    if ('sex' in pr) upd.sex = pr.sex === 'M' ? 'M' : 'F';
    if ('photo' in pr) Object.assign(upd, await photoFields('profile', pr.photo, f.photoPath));
    for (const k of ['mom', 'dad']) if ((k + 'Photo') in pr) Object.assign(upd, await photoFields(k, pr[k + 'Photo'], f[k + 'PhotoPath'], k + 'Photo'));
    M.family = Object.assign({}, f, upd);
    const jobs = [setDoc(fref(), upd, { merge: true })];
    if (role_(pr.role)) { M.member = Object.assign({}, M.member, { role: pr.role }); jobs.push(setDoc(doc(db, 'families', M.fid, 'members', M.uid), { role: pr.role }, { merge: true })); }
    await commit(Promise.all(jobs));
    return { data: data() };
  },

  async setMyRole(role) {
    if (role_(role)) {
      M.member = Object.assign({}, M.member, { role });
      await commit(setDoc(doc(db, 'families', M.fid, 'members', M.uid), { role }, { merge: true }));
    }
    return { data: data() };
  },

  async saveRecord(rec) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.date || '')) throw new Error('날짜 형식이 올바르지 않아요');
    const id = String(rec.id || newId('r')), ex = M.col.records.get(id);
    const v = x => (x == null || x === '') ? null : Number(x);
    const row = { date: rec.date, weight: v(rec.weight), height: v(rec.height), head: v(rec.head), memo: txt(rec.memo, 200), by: role_(rec.by) || myRole(), _o: ex ? (ex._o ?? 0) : Date.now() };
    if ('photo' in rec) Object.assign(row, await photoFields(id, rec.photo, ex && ex.photoPath));
    localSet('records', id, row);
    await commit(setDoc(dref('records', id), Object.assign({ updatedAt: serverTimestamp() }, row), { merge: true }));
    return { id, data: data() };
  },
  async deleteRecord(id) {
    id = String(id); const ex = M.col.records.get(id);
    M.col.records.delete(id); dropPhoto(ex && ex.photoPath);
    await commit(deleteDoc(dref('records', id)));
    return { data: data() };
  },

  async savePeriod(p) {
    if (!p.name) throw new Error('시기 이름이 없어요');
    if (!dateOk(p.confirmed || '')) throw new Error('날짜 형식이 올바르지 않아요');
    const id = String(p.id || newId('p')), ex = M.col.periods.get(id), b = writeBatch(db);
    const per = { name: txt(p.name, 20), month: p.month === '' || p.month == null ? '' : Number(p.month), confirmed: p.confirmed || '', hospital: txt(p.hospital, 40), _o: ex ? (ex._o ?? 0) : Date.now() };
    localSet('periods', id, per); b.set(dref('periods', id), per, { merge: true });
    const vs = (p.vaccines || []).filter(v => v && v.name), keep = vs.filter(v => v.id).map(v => String(v.id));
    list('vaccines').filter(o => o.period === id && !keep.includes(o.id)).forEach(o => { M.col.vaccines.delete(o.id); b.delete(dref('vaccines', o.id)); });
    vs.forEach((v, i) => {
      const old = v.id && M.col.vaccines.get(String(v.id));
      if (old) { const u = { name: txt(v.name, 40), sub: txt(v.sub, 60) }; localSet('vaccines', old.id, u); b.set(dref('vaccines', old.id), u, { merge: true }); }
      else { const nid = newId('v'), n = { period: id, name: txt(v.name, 40), sub: txt(v.sub, 60), done: '', memo: '', by: '', _o: Date.now() + i }; localSet('vaccines', nid, n); b.set(dref('vaccines', nid), n); }
    });
    await commit(b.commit());
    return { id, data: data() };
  },
  async deletePeriod(id) {
    id = String(id); const b = writeBatch(db);
    list('vaccines').filter(o => o.period === id).forEach(o => { M.col.vaccines.delete(o.id); b.delete(dref('vaccines', o.id)); });
    M.col.periods.delete(id); b.delete(dref('periods', id));
    await commit(b.commit());
    return { data: data() };
  },
  async saveVaccine(v) {
    if (!v.name) throw new Error('백신 이름이 없어요');
    if (!dateOk(v.done || '')) throw new Error('날짜 형식이 올바르지 않아요');
    const id = String(v.id || newId('v')), ex = M.col.vaccines.get(id);
    const row = { period: String(v.period || ''), name: txt(v.name, 40), sub: txt(v.sub, 60), done: v.done || '', memo: txt(v.memo, 100), by: v.done ? (role_(v.by) || myRole()) : '', _o: ex ? (ex._o ?? 0) : Date.now() };
    localSet('vaccines', id, row);
    await commit(setDoc(dref('vaccines', id), row, { merge: true }));
    return { id, data: data() };
  },
  async deleteVaccine(id) {
    id = String(id); M.col.vaccines.delete(id);
    await commit(deleteDoc(dref('vaccines', id)));
    return { data: data() };
  },
  async completePeriod(pid, date, ids, by) {
    if (!date || !dateOk(date)) throw new Error('날짜 형식이 올바르지 않아요');
    const b = writeBatch(db), who = role_(by) || myRole();
    (ids || []).map(String).forEach(id => { if (!M.col.vaccines.has(id)) return; const u = { done: date, by: who }; localSet('vaccines', id, u); b.set(dref('vaccines', id), u, { merge: true }); });
    await commit(b.commit());
    return { data: data() };
  },

  async saveItem(k, obj) {
    const keys = TBL[k]; if (!keys) throw new Error('알 수 없는 항목이에요');
    const id = String(obj.id || newId(k)), ex = M.col[k].get(id), row = { _o: ex ? (ex._o ?? 0) : Date.now() };
    keys.forEach(key => {
      if (key === 'photo') return;
      if (key === 'by') { row.by = role_(obj.by) || myRole(); return; }
      row[key] = txt(obj[key], LIM[key] || 300);
    });
    (OPT[k] || []).forEach(key => { if (key in obj) row[key] = txt(obj[key], 40); });
    if (keys.includes('photo') && 'photo' in obj) Object.assign(row, await photoFields(id, obj.photo, ex && ex.photoPath));
    localSet(k, id, row);
    await commit(setDoc(dref(k, id), row, { merge: true }));
    return { id, data: data() };
  },
  async deleteItem(k, id) {
    if (!TBL[k]) throw new Error('알 수 없는 항목이에요');
    id = String(id); const ex = M.col[k].get(id), b = writeBatch(db);
    M.col[k].delete(id); b.delete(dref(k, id)); dropPhoto(ex && ex.photoPath);
    if (k === 'ep') list('log').filter(o => o.ep === id).forEach(o => { M.col.log.delete(o.id); b.delete(dref('log', o.id)); });
    await commit(b.commit());
    return { data: data() };
  },

  // 앨범 사진을 수사 보드에 붙이기/떼기 (기존 앨범 문서에 board 칸만 더해요)
  async setBoard(id, on) {
    id = String(id); if (!M.col.mom.has(id)) throw new Error('없는 사진이에요');
    localSet('mom', id, { board: !!on });
    await commit(setDoc(dref('mom', id), { board: !!on }, { merge: true }));
    return { data: data() };
  },

  // 사진 찍은 곳 (탐험 지도에서 직접 꽂기): 앨범 문서에 geo 칸만 "위도,경도"로. 여러 장이면 id 목록, '-'는 "위치 빼기"(탐문 경로 자리도 안 씀)
  async setGeo(id, geo) {
    const ids = [...new Set((Array.isArray(id) ? id : [id]).map(String))].filter(x => M.col.mom.has(x)).slice(0, 450);
    if (!ids.length) throw new Error('없는 사진이에요');
    geo = String(geo || ''); if (geo && geo !== '-' && !/^-?\d{1,2}\.\d{1,6},-?\d{1,3}\.\d{1,6}$/.test(geo)) throw new Error('위치 형식이 올바르지 않아요');
    const b = writeBatch(db);
    ids.forEach(x => { localSet('mom', x, { geo }); b.set(dref('mom', x), { geo }, { merge: true }); });
    await commit(b.commit());
    return { data: data() };
  },

  // 사진에서 보여 줄 곳(얼굴): 앨범 문서에 fp 칸만 "0.52,0.31" (''면 저절로). 수사 보드·앨범 칸·사진관·신문·영상이 다 이 자리를 보여 줘요
  async setFocus(id, fp) {
    id = String(id); if (!M.col.mom.has(id)) throw new Error('없는 사진이에요');
    fp = String(fp || ''); if (fp && !/^(0(\.\d{1,3})?|1(\.0{1,3})?),(0(\.\d{1,3})?|1(\.0{1,3})?)$/.test(fp)) throw new Error('자리 형식이 올바르지 않아요');
    localSet('mom', id, { fp }); await commit(setDoc(dref('mom', id), { fp }, { merge: true }));
    return { data: data() };
  },

  // 놀이 저장 (families/{fid}/game/shared): 도토리는 늘고 준 만큼만(increment) 보내 두 폰이 동시에 모아도 안 사라져요
  // 도토리 장부(game/ledger, 2026.10.13): 도토리가 늘고 준 일을 한 줄씩 남겨요 (언제·얼마·왜·누가·그때 잔액). 실패해도 본 저장은 막지 않아요
  async ledgerAdd(e) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const row = { t: Date.now(), d: Math.round(+e.d || 0), why: txt(e.why || '', 60), by: myRole(), ok: e.ok === 0 ? 0 : 1 };
    if (e.bal != null && isFinite(+e.bal)) row.bal = Math.round(+e.bal);
    if (e.err) row.err = txt(e.err, 80);
    try { await setDoc(dref('game', 'ledger'), { items: { [id]: row }, updatedAt: serverTimestamp() }, { merge: true }); } catch (x) { console.warn('장부', x); }
    return { ok: true };
  },
  async ledgerGet() {
    const sn = await getDoc(dref('game', 'ledger')), it = (sn.exists() ? sn.data().items : null) || {};
    const L = Object.entries(it).map(([id, v]) => Object.assign({ id }, v)).sort((a, b) => (b.t || 0) - (a.t || 0));
    if (L.length > 400) { try { await setDoc(dref('game', 'ledger'), { items: Object.fromEntries(L.slice(300).map(x => [x.id, deleteField()])) }, { merge: true }); } catch (x) {} }
    return L.slice(0, 300);
  },
  async saveGame(obj, acornDelta, union, once, why, balLocal) {
    let bal = null;
    try {
      const r = await H.saveGame0(obj, acornDelta, union, once, v => { bal = v; });
      const d = obj && obj.acornSet != null ? null : Math.round(+acornDelta || 0);
      if (obj && obj.acornSet != null) await H.ledgerAdd({ d: 0, why: why || '도토리 직접 맞춤', bal: obj.acornSet });
      else if (d) await H.ledgerAdd({ d, why: why || (once ? '보상' : '도토리'), bal: bal != null ? bal : balLocal });
      return r;
    } catch (e) {
      const d = Math.round(+acornDelta || 0);
      if (d && !(e && e.code === 'already')) await H.ledgerAdd({ d, why: why || '도토리', ok: 0, err: (e && e.message) || '' });
      throw e;
    }
  },
  async saveGame0(obj, acornDelta, union, once, setBal) {
    const row = {};
    Object.keys(union || {}).forEach(k => { if (['hats', 'room', 'clothes', 'stickers', 'props'].includes(k) && Array.isArray(union[k]) && union[k].length) row[k] = arrayUnion(...union[k].map(String)); });
    GAME_KEYS.forEach(k => { if (k !== 'acorn' && obj && obj[k] !== undefined) row[k] = obj[k]; });
    if (obj && obj.acornSet != null) row.acorn = Math.max(0, Math.round(+obj.acornSet) || 0);
    else if (acornDelta) row.acorn = increment(Math.round(+acornDelta) || 0);
    if (JSON.stringify(obj || {}).length > 50000) throw new Error('놀이 저장이 너무 커요');
    // mergeFields: 보낸 칸만 통째로 바꿔요 (slot·wear 같은 묶음에서 뺀 자리도 다른 폰에 반영)
    const ref = dref('game', 'shared'), data = Object.assign({ updatedAt: serverTimestamp(), by: myRole() }, row);
    const keys = GAME_KEYS.filter(k => k !== 'acorn' && obj && obj[k] !== undefined), prev = {};
    if (M.game) { keys.forEach(k => { prev[k] = jcl(M.game[k]); }); prev.acorn = M.game.acorn; }
    const overlay = () => { if (!M.game || !keys.length) return; keys.forEach(k => { OV.f[k] = { v: jcl(obj[k]), t: Date.now() }; M.game[k] = jcl(obj[k]); }); };
    const rollback = () => { keys.forEach(k => { delete OV.f[k]; if (M.game) { if (prev[k] === undefined) delete M.game[k]; else M.game[k] = prev[k]; } }); OV.a = null; if (M.game && prev.acorn !== undefined) M.game.acorn = prev.acorn; onRemote(); };
    const withOv = async f => { overlay(); try { const r = await f(); keys.forEach(k => { if (OV.f[k]) OV.f[k].ack = true; }); return r; } catch (e) { rollback(); throw e; } };
    // 도토리를 쓸 때는 서버의 진짜 잔액을 다시 읽고 모자라면 안 사요 (다른 폰이 먼저 써서 화면 숫자가 옛날 것일 때 마이너스가 되지 않게)
    // 한 번만 주는 보상(once): 서버의 그 칸(예: regrant)을 다시 읽고 이미 받았으면 안 줘요 (두 폰이 동시에 받지 않게)
    // once가 { key, val }이면 그 칸에 val(예: 수배범 주 '2026-10-05')보다 같거나 늦은 값이 있을 때 이미 받은 걸로 (주마다 한 번)
    if (once) {
      const key = typeof once === 'string' ? once : String(once.key || ''), val = typeof once === 'string' ? null : String(once.val || '');
      if (!GAME_KEYS.includes(key) || key === 'acorn' || (val !== null && !val)) throw new Error('보상 칸이 올바르지 않아요');
      await withOv(() => runTransaction(db, async tx => {
        const cur = (await tx.get(ref)).data() || {};
        if (val === null ? cur[key] : (cur[key] && String(cur[key]) >= val)) throw Object.assign(new Error('이미 받은 보상이에요'), { code: 'already' });
        data[key] = val === null ? ((obj && obj[key]) || true) : val; data.acorn = (+cur.acorn || 0) + Math.round(+acornDelta || 0); if (setBal) setBal(data.acorn);
        tx.set(ref, data, { mergeFields: Object.keys(data) });
      }));
      if (M.game && data.acorn != null) { M.game.acorn = data.acorn; OV.a = { v: data.acorn, t: Date.now(), ack: true }; M.game[key] = data[key]; OV.f[key] = { v: data[key], t: Date.now(), ack: true }; onRemote(); }
      return { ok: true };
    }
    if (obj && obj.acornSet == null && acornDelta < 0) {
      await withOv(() => runTransaction(db, async tx => {
        const cur = +(((await tx.get(ref)).data() || {}).acorn) || 0, next = cur + Math.round(+acornDelta);
        if (next < 0) throw Object.assign(new Error(`도토리가 ${-next}개 모자라요 (다른 폰에서 먼저 썼어요)`), { code: 'acorn-short' });
        data.acorn = next; if (setBal) setBal(next); tx.set(ref, data, { mergeFields: Object.keys(data) });
      }));
      if (M.game && data.acorn != null) { M.game.acorn = data.acorn; OV.a = { v: data.acorn, t: Date.now(), ack: true }; onRemote(); }
      return { ok: true };
    }
    await withOv(() => commit(setDoc(ref, data, { mergeFields: Object.keys(data) })));
    return { ok: true };
  },

  // 도토리 보상(훈장·계급·출석)을 서버의 진짜 상태로 계산해 한 번에 (두 폰이 동시에 같은 보상을 받거나, 옛날 화면 숫자로 덮어써서 도토리가 늘었다 줄었다 하지 않게)
  // fn(서버 문서) → { set: {칸: 값}, add: 도토리 } | null (다시 시도될 수 있어 같은 입력엔 같은 결과)
  async gameTx(fn) {
    const ref = dref('game', 'shared'); let out = null, bal = null;
    await runTransaction(db, async tx => {
      const cur = (await tx.get(ref)).data() || {}; out = fn(cur) || null;
      if (!out || (!out.add && !Object.keys(out.set || {}).length)) return;
      const data = Object.assign({ updatedAt: serverTimestamp(), by: myRole() }, out.set || {});
      Object.keys(data).forEach(k => { if (k !== 'updatedAt' && k !== 'by' && !GAME_KEYS.includes(k)) delete data[k]; });
      data.acorn = Math.max(0, (+cur.acorn || 0) + Math.round(+out.add || 0)); bal = data.acorn;
      tx.set(ref, data, { mergeFields: Object.keys(data) });
    });
    if (out && M.game && bal != null) { M.game.acorn = bal; OV.a = { v: bal, t: Date.now(), ack: true }; Object.keys(out.set || {}).forEach(k => { if (GAME_KEYS.includes(k)) { M.game[k] = jcl(out.set[k]); OV.f[k] = { v: jcl(out.set[k]), t: Date.now(), ack: true }; } }); onRemote(); }
    if (out && out.add) await H.ledgerAdd({ d: out.add, why: out.why || '보상', bal });
    return out;
  },

  // 백업: 가족 공간의 기록 전체를 JSON 한 덩어리로 (사진은 주소만 — 사진 파일 자체는 Storage에 그대로) — 2026.10.13
  async backupData() {
    const ts = v => v && typeof v.toMillis === 'function' ? { __ts: v.toMillis() } : v;
    const deep = o => JSON.parse(JSON.stringify(o, (k, v) => ts(v)));
    const cols = {}; COLS.forEach(c => { cols[c] = [...M.col[c].values()].map(deep); });
    const care = {}; M.care.forEach((items, d) => { care[d] = deep(items); });
    return { app: 'soeun-diary', v: 1, at: new Date().toISOString(), family: deep(M.family || {}), cols, care,
      hospitals: [...M.hosp.values()].map(deep), recipes: [...M.recipes.values()].map(deep), checkups: [...M.checkups.values()].map(deep), game: deep(M.game || {}) };
  },
  // 되살리기: 백업 파일의 문서를 같은 id로 다시 넣어요 (merge — 지금 있는 기록은 지우지 않고, 없어진 것만 되살아나고 같은 기록은 백업 값으로). 도토리는 지금 값이 0일 때만 백업 값
  async restoreData(bk) {
    if (!bk || bk.app !== 'soeun-diary' || !bk.cols) throw new Error('수사 일지 백업 파일이 아니에요');
    const un = o => JSON.parse(JSON.stringify(o), (k, v) => v && typeof v === 'object' && Object.keys(v).length === 1 && typeof v.__ts === 'number' ? Timestamp.fromMillis(v.__ts) : v);
    const jobs = [];
    Object.entries(bk.cols).forEach(([c, L]) => { if (COLS.includes(c) && Array.isArray(L)) L.forEach(o => { if (o && o.id) { const d = un(o); delete d.id; jobs.push([dref(c, o.id), d]); } }); });
    Object.entries(bk.care || {}).forEach(([d, items]) => { if (/^\d{4}-\d{2}-\d{2}$/.test(d)) jobs.push([dref('care', d), { items: un(items) }]); });
    [['hospitals', bk.hospitals], ['recipes', bk.recipes], ['checkups', bk.checkups]].forEach(([c, L]) => (L || []).forEach(o => { if (o && o.id) { const d = un(o); delete d.id; jobs.push([dref(c, o.id), d]); } }));
    if (bk.family && Object.keys(bk.family).length) jobs.push([fref(), un(bk.family)]);
    if (bk.game && Object.keys(bk.game).length) { const g = un(bk.game); if ((+(M.game || {}).acorn || 0) > 0) delete g.acorn; jobs.push([dref('game', 'shared'), g]); }
    for (let i = 0; i < jobs.length; i += 400) { const b = writeBatch(db); jobs.slice(i, i + 400).forEach(([r, d]) => b.set(r, d, { merge: true })); await commit(b.commit()); }
    return { n: jobs.length, data: data() };
  },

  // 하루 수사 기록 (분유·모유수유·유축수유·기저귀·수면·목욕·메모): 날짜 문서의 items 맵에 기록 하나씩 (두 폰이 동시에 남겨도 안 겹쳐요, 오프라인에서도 저장)
  async careSave(date, it, oldDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('날짜 형식이 올바르지 않아요');
    const row = careRow(it), b = writeBatch(db);
    if (oldDate && oldDate !== date && /^\d{4}-\d{2}-\d{2}$/.test(oldDate)) {   // 다른 날로 옮기면 그 날 문서에서 빼요
      const o = Object.assign({}, M.care.get(oldDate) || {}); delete o[row.id]; M.care.set(oldDate, o);
      b.set(dref('care', oldDate), { items: { [row.id]: deleteField() } }, { merge: true });
    }
    M.care.set(date, Object.assign({}, M.care.get(date) || {}, { [row.id]: row }));
    b.set(dref('care', date), { items: { [row.id]: row }, updatedAt: serverTimestamp() }, { merge: true });
    await commit(b.commit());
    return { id: row.id, data: data() };
  },
  // 다른 앱 기록 한꺼번에 넣기 (하루 수사 '📥 붙여넣기'): [{date, it}] → 날짜 문서마다 merge, 450개씩 나눠서
  async careImport(list) {
    const rows = (list || []).filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.date || '')).map(x => ({ date: x.date, row: careRow(x.it) }));
    for (let i = 0; i < rows.length; i += 450) {
      const b = writeBatch(db), by = {};
      rows.slice(i, i + 450).forEach(({ date, row }) => { (by[date] = by[date] || {})[row.id] = row; M.care.set(date, Object.assign({}, M.care.get(date) || {}, { [row.id]: row })); });
      Object.keys(by).forEach(d => b.set(dref('care', d), { items: by[d], updatedAt: serverTimestamp() }, { merge: true }));
      await commit(b.commit());
    }
    return { n: rows.length, data: data() };
  },
  async careDelete(date, id) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('날짜 형식이 올바르지 않아요');
    id = String(id); const o = Object.assign({}, M.care.get(date) || {}); delete o[id]; M.care.set(date, o);
    await commit(setDoc(dref('care', date), { items: { [id]: deleteField() }, updatedAt: serverTimestamp() }, { merge: true }));
    return { data: data() };
  },

  // 영유아검진 받은 기록 (families/{fid}/checkups/{g1…g8, o1…o3}), 일정은 checkups.js가 태어난 날로 계산
  async saveCheckup(c) {
    const id = String((c && c.id) || '');
    if (!/^[go]\d$/.test(id)) throw new Error('검진 차수가 올바르지 않아요');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.done || '')) throw new Error('날짜 형식이 올바르지 않아요');
    const row = { done: c.done, hospital: txt(c.hospital, 40), memo: txt(c.memo, 200), by: myRole() };
    M.checkups.set(id, Object.assign({ id }, row));
    await commit(setDoc(dref('checkups', id), Object.assign({ updatedAt: serverTimestamp() }, row)));
    return { data: data() };
  },
  async deleteCheckup(id) {
    id = String(id); M.checkups.delete(id);
    await commit(deleteDoc(dref('checkups', id)));
    return { data: data() };
  },

  // 이유식 표준레시피 (families/{fid}/recipes/{YYYY-MM}), 엑셀을 앱에서 읽어 정리한 내용을 한 달에 한 문서로
  async saveRecipe(r) {
    const id = String((r && r.month) || '');
    if (!/^\d{4}-\d{2}$/.test(id)) throw new Error('레시피 월이 올바르지 않아요');
    if (!Array.isArray(r.stages) || !r.stages.length) throw new Error('레시피를 찾지 못했어요');
    const row = { title: txt(r.title, 60), file: txt(r.file, 120), stages: r.stages, by: myRole() };
    if (JSON.stringify(row).length > 900000) throw new Error('레시피 파일이 너무 커요');
    M.recipes.set(id, Object.assign({ id }, row));
    await commit(setDoc(dref('recipes', id), Object.assign({ updatedAt: serverTimestamp() }, row)));
    return { data: data() };
  },
  async deleteRecipe(month) {
    const id = String(month); M.recipes.delete(id);
    await commit(deleteDoc(dref('recipes', id)));
    return { data: data() };
  },

  // 관심 병원 (families/{fid}/hospitals/{hpid}), 보낸 칸만 바꿔요
  async saveHospital(h) {
    const id = String((h && h.hpid) || '');
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new Error('병원 번호가 올바르지 않아요');
    const row = {};
    ['star', 'moonlight'].forEach(k => { if (k in h) row[k] = !!h[k]; });
    ['memo', 'lunch', 'reserve'].forEach(k => { if (k in h) row[k] = txt(h[k], k === 'memo' ? 300 : 100); });
    row.updatedBy = myRole() || (auth.currentUser && auth.currentUser.displayName) || '';
    M.hosp.set(id, Object.assign({}, M.hosp.get(id) || {}, row, { id }));
    await commit(setDoc(dref('hospitals', id), Object.assign({ updatedAt: serverTimestamp() }, row), { merge: true }));
    return { data: data() };
  }
};

// ---------- 알림 (Firebase Cloud Messaging) ----------
// 열쇠(VAPID 공개키)는 push-key.js. 받은 토큰은 families/{fid}/push/{id} 에 두고, Actions(notify.yml)가 아침마다 보내요
const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(x => x.toString(16).padStart(2, '0')).join('');
async function messaging() {
  const m = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js');
  if (!(await m.isSupported())) throw new Error('이 브라우저는 알림을 지원하지 않아요 (크롬에서 홈 화면 앱으로 열어 주세요)');
  return m;
}
H.enablePush = async () => {
  if (!window.PUSH_VAPID) throw new Error('알림 열쇠가 아직 설정되지 않았어요');
  const m = await messaging();
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('알림이 허용되지 않았어요. 폰 설정 → 앱 → 크롬(또는 이 앱) → 알림에서 켜 주세요');
  const reg = await navigator.serviceWorker.ready;
  const token = await m.getToken(m.getMessaging(fb), { vapidKey: window.PUSH_VAPID, serviceWorkerRegistration: reg });
  if (!token) throw new Error('알림 토큰을 받지 못했어요');
  await savePush(token);
  return { ok: true };
};
async function savePush(token) {
  const id = (await sha(token)).slice(0, 40);
  await setDoc(doc(db, 'families', M.fid, 'push', id), { token, uid: M.uid, role: myRole(), viewer: isViewer(), at: serverTimestamp(), ua: navigator.userAgent.slice(0, 120) });
  try { localStorage.setItem('soeun-push', id); localStorage.setItem('soeun-push-at', new Date().toISOString().slice(0, 10)); } catch (e) {}
  return id;
}
// 알림을 켠 폰은 하루 한 번 조용히 토큰을 다시 받아 둬요 (Firebase 권장: 오래 안 받으면 끊길 수 있고, 바뀌었으면 바꿔 저장)
async function refreshPush() {
  let id = '', at = ''; try { id = localStorage.getItem('soeun-push') || ''; at = localStorage.getItem('soeun-push-at') || ''; } catch (e) {}
  if (!id || at === new Date().toISOString().slice(0, 10) || !window.PUSH_VAPID || !M.fid || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const m = await messaging(), reg = await navigator.serviceWorker.ready;
    const token = await m.getToken(m.getMessaging(fb), { vapidKey: window.PUSH_VAPID, serviceWorkerRegistration: reg }); if (!token) return;
    const nid = await savePush(token);
    if (nid !== id) { try { await deleteDoc(doc(db, 'families', M.fid, 'push', id)); } catch (e) {} }
  } catch (e) { console.warn('알림 토큰을 새로 받지 못했어요', e); }
}
H.disablePush = async () => {
  let id = ''; try { id = localStorage.getItem('soeun-push') || ''; localStorage.removeItem('soeun-push'); localStorage.removeItem('soeun-push-at'); } catch (e) {}
  if (id) { try { await deleteDoc(doc(db, 'families', M.fid, 'push', id)); } catch (e) {} }
  try { const m = await messaging(); await m.deleteToken(m.getMessaging(fb)); } catch (e) {}
  return { ok: true };
};

const API = {
  async call(fn, args) {
    if (!H[fn]) throw new Error('알 수 없는 기능: ' + fn);
    if (isViewer() && !['getData', 'getPhotos', 'getPhoto', 'enablePush', 'disablePush', 'backupData', 'ledgerGet'].includes(fn)) throw new Error('보기 전용 초대라 기록은 엄마·아빠 수사관만 남길 수 있어요');
    try { return await H[fn](...args); }
    catch (e) {
      const msg = e && e.code === 'permission-denied' ? '이 가족 공간에 쓸 권한이 없어요'
        : e && e.code === 'storage/retry-limit-exceeded' ? '인터넷 연결이 불안정해서 사진을 올리지 못했어요'
        : (e && e.message) || '알 수 없는 오류';
      throw new Error(msg);
    }
  }
};

// ---------- 가족 공간 연결 ----------
function stopAll() { unsubs.forEach(u => u()); unsubs = []; ready = false; }
function start(fid) {
  stopAll();
  M.fid = fid; M.family = null; M.member = null; COLS.forEach(c => M.col[c].clear()); M.hosp = new Map(); M.recipes = new Map(); M.checkups = new Map(); M.care = new Map(); M.game = null; M.gameSrv = false;
  const need = new Set(['family', 'member', ...COLS]);
  const first = key => { if (!need.has(key)) return; need.delete(key); if (!need.size) { ready = true; hideGate(); window.__resolveAPI(API); setTimeout(refreshPush, 8000); } };
  const fail = e => {
    console.error(e);
    if (e && e.code === 'permission-denied') { stopAll(); try { localStorage.removeItem('fam-' + M.uid); } catch (x) {} showGate('choose', '이 가족 공간에 들어갈 권한이 없어요. 초대 코드로 다시 들어와 주세요.'); }
  };
  unsubs.push(onSnapshot(fref(), s => { M.family = s.exists() ? s.data() : {}; first('family'); onRemote(); }, fail));
  unsubs.push(onSnapshot(doc(db, 'families', fid, 'members', M.uid), s => {
    if (!s.exists() && !s.metadata.fromCache) return fail({ code: 'permission-denied' });
    M.member = s.exists() ? s.data() : {}; first('member'); onRemote();
  }, fail));
  unsubs.push(onSnapshot(collection(db, 'families', fid, 'members'), s => { M.members = s.docs.map(d => d.data()); }, () => {}));
  COLS.forEach(c => unsubs.push(onSnapshot(collection(db, 'families', fid, c), s => {
    M.col[c] = new Map(s.docs.map(d => [d.id, Object.assign({ id: d.id }, d.data())]));
    first(c); onRemote();
  }, fail)));
  // 관심 병원: 보안 규칙이 아직 없어도 앱은 그대로 열리게 따로 받아요
  unsubs.push(onSnapshot(collection(db, 'families', fid, 'hospitals'), s => {
    M.hosp = new Map(s.docs.map(d => [d.id, Object.assign({}, d.data(), { id: d.id })]));
    onRemote();
  }, e => console.warn('관심 병원을 불러오지 못했어요 (Firestore 규칙 확인)', e)));
  unsubs.push(onSnapshot(collection(db, 'families', fid, 'recipes'), s => {
    M.recipes = new Map(s.docs.map(d => [d.id, Object.assign({}, d.data(), { id: d.id })]));
    onRemote();
  }, e => console.warn('레시피를 불러오지 못했어요', e)));
  unsubs.push(onSnapshot(doc(db, 'families', fid, 'game', 'shared'), { includeMetadataChanges: true }, s => {
    M.game = ovApply(s.exists() ? s.data() : {}, !s.metadata.fromCache && !s.metadata.hasPendingWrites); if (!s.metadata.fromCache) M.gameSrv = true;
    onRemote();
  }, e => console.warn('놀이 저장을 불러오지 못했어요', e)));
  // 하루 수사 (families/{fid}/care/{YYYY-MM-DD}: { items: { 기록id: {...} } }) — 하루에 문서 하나라 기록이 많아도 읽기가 적어요
  unsubs.push(onSnapshot(collection(db, 'families', fid, 'care'), s => {
    M.care = new Map(s.docs.map(d => [d.id, (d.data() || {}).items || {}]));
    onRemote();
  }, e => console.warn('하루 수사 기록을 불러오지 못했어요', e)));
  unsubs.push(onSnapshot(collection(db, 'families', fid, 'checkups'), s => {
    M.checkups = new Map(s.docs.map(d => [d.id, Object.assign({}, d.data(), { id: d.id })]));
    onRemote();
  }, e => console.warn('검진 기록을 불러오지 못했어요', e)));
}

async function enter(fid) {
  await setDoc(doc(db, 'users', M.uid), { fid }, { merge: true });
  try { localStorage.setItem('fam-' + M.uid, fid); } catch (e) {}
  start(fid);
}
const who = u => ({ name: u.displayName || '', email: u.email || '' });

async function createFamily() {
  const u = auth.currentUser, fid = doc(collection(db, 'families')).id;
  await setDoc(doc(db, 'families', fid), { name: '', birth: '', sex: 'F', owner: u.uid, createdAt: serverTimestamp() });
  await setDoc(doc(db, 'families', fid, 'members', u.uid), Object.assign({ role: '', joinedAt: serverTimestamp() }, who(u)));
  const b = writeBatch(db);
  SCHEDULE.forEach(([name, month, vs], i) => {
    b.set(doc(db, 'families', fid, 'periods', 'p' + i), { name, month, confirmed: '', hospital: '', _o: i });
    vs.forEach(([vn, sub], j) => b.set(doc(db, 'families', fid, 'vaccines', 'v' + i + '_' + j), { period: 'p' + i, name: vn, sub, done: '', memo: '', by: '', _o: i * 100 + j }));
  });
  await b.commit();
  await enter(fid);
}
async function joinFamily(code) {
  code = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) throw new Error('초대 코드 6자리를 입력해 주세요');
  const s = await getDoc(doc(db, 'invites', code));
  if (!s.exists()) throw new Error('없는 초대 코드예요. 다시 확인해 주세요');
  const inv = s.data();
  if (inv.exp && inv.exp.toMillis() < Date.now()) throw new Error('기간이 지난 초대 코드예요. 새 코드를 받아 주세요');
  const u = auth.currentUser;
  await setDoc(doc(db, 'families', inv.fid, 'members', u.uid), Object.assign({ role: '', code, joinedAt: serverTimestamp() }, who(u)));
  if (VIEW_CODE.test(code)) {
    try { localStorage.setItem('viewer-' + inv.fid, '1'); } catch (e) {}
    try { await setDoc(doc(db, 'families', inv.fid, 'members', u.uid), { viewer: true }, { merge: true }); } catch (e) { console.warn('보기 전용 표시를 저장하지 못했어요', e); }
  }
  await enter(inv.fid);
}
async function makeInvite(viewer) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), x => A[x % A.length]).join('');
  let code = viewer ? 'V' + rnd(4) + '9' : rnd(6);
  while (!viewer && VIEW_CODE.test(code)) code = rnd(6);
  await setDoc(doc(db, 'invites', code), { fid: M.fid, by: M.uid, exp: Timestamp.fromMillis(Date.now() + 7 * 864e5) });
  return code;
}

// ---------- 출입 화면 ----------
const css = document.createElement('style');
css.textContent = `
#gate{position:fixed;inset:0;z-index:40;background:var(--paper);display:none;align-items:center;justify-content:center;padding:calc(24px + env(safe-area-inset-top,0px)) 22px 24px;overflow-y:auto}
#gate.open{display:flex}
#gate .gcard{width:100%;max-width:400px;background:var(--card);border:2px solid var(--navy);border-radius:8px;padding:26px 22px}
#gate .gno{font-size:12px;color:var(--muted);letter-spacing:1px}
#gate h1{font-family:var(--display);font-weight:400;font-size:34px;color:var(--navy);margin:4px 0 6px;line-height:1.15}
#gate p{margin:0 0 16px;color:var(--muted);font-size:14px}
#gate .gbtn{width:100%;margin-top:10px}
#gate .gor{text-align:center;color:var(--muted);font-size:12px;margin:18px 0 6px;letter-spacing:2px}
#gate input{width:100%;box-sizing:border-box;font-family:var(--display);font-size:26px;letter-spacing:6px;text-align:center;text-transform:uppercase;padding:10px;border:2px solid var(--ink);background:#FFFDF7;border-radius:4px}
#updbar{position:fixed;left:12px;right:12px;top:calc(10px + env(safe-area-inset-top,0px));z-index:45;max-width:520px;margin:0 auto;background:var(--navy);color:var(--paper);border-radius:6px;padding:10px 12px;display:flex;align-items:center;gap:10px;box-shadow:0 6px 14px rgba(43,38,34,.3);font-size:14px}
#updbar span{flex:1}#updbar button{border:0;background:var(--red);color:#fff;border-radius:4px;padding:8px 12px;font-family:var(--display);font-size:15px}
.famcode{font-family:var(--display);font-size:44px;letter-spacing:8px;color:var(--red);text-align:center;border:3px double var(--red);border-radius:8px;padding:10px 0;margin:6px 0 12px}
.famprog{font-size:14px;color:var(--navy);min-height:1.4em}`;
document.head.appendChild(css);
const gate = document.createElement('div'); gate.id = 'gate'; document.body.appendChild(gate);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function showGate(mode, msg = '') {
  const head = `<span class="gno">수사 본부 출입 기록</span><h1>성장 수사 일지</h1>`;
  const body = mode === 'login'
    ? `<p>가족 수사관만 들어올 수 있어요. 구글 계정으로 출입해 주세요.</p>
       <p class="err">${esc(msg)}</p><button class="primary gbtn" data-g="login">구글 계정으로 출입</button>`
    : mode === 'choose'
    ? `<p>${esc((auth.currentUser && auth.currentUser.email) || '')} 수사관님, 어느 사건 파일로 갈까요?</p>
       <input id="g-code" maxlength="6" placeholder="초대코드" autocomplete="off" autocapitalize="characters">
       <button class="primary gbtn" data-g="join">초대 코드로 입장</button>
       <div class="gor">또는</div>
       <button class="secondary gbtn" data-g="create">새 가족 공간 만들기</button>
       <p class="err" id="g-err" style="margin-top:12px">${esc(msg)}</p>
       <button class="ghost gbtn" data-g="logout">다른 계정으로 출입</button>`
    : `<p>수사 본부에 연결하는 중…</p>`;
  gate.innerHTML = `<div class="gcard">${head}${body}</div>`;
  gate.classList.add('open');
}
function hideGate() { gate.classList.remove('open'); }

async function login() {
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) await signInWithRedirect(auth, provider);
    else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') showGate('login', '출입하지 못했어요: ' + (e.code || e.message));
  }
}
async function logout() {
  stopAll();
  try { Object.keys(localStorage).forEach(k => { if (k.startsWith('fam-') || k.startsWith('soeun-cache') || k === 'investigator') localStorage.removeItem(k); }); } catch (e) {}
  await signOut(auth); location.reload();
}

gate.addEventListener('click', async e => {
  const b = e.target.closest('[data-g]'); if (!b || b.disabled) return;
  const err = m => { const p = gate.querySelector('#g-err'); if (p) p.textContent = m; };
  b.disabled = true;
  try {
    if (b.dataset.g === 'login') await login();
    if (b.dataset.g === 'logout') await logout();
    if (b.dataset.g === 'create') { if (await ask('새 가족 공간을 만들까요?\n배우자는 만든 뒤에 초대 코드로 들어오면 돼요.')) { showGate('wait'); await createFamily(); } }
    if (b.dataset.g === 'join') { err(''); await joinFamily(gate.querySelector('#g-code').value); showGate('wait'); }
  } catch (x) { console.error(x); if (gate.querySelector('#g-err')) err(x.message || String(x)); else showGate('choose', x.message || String(x)); }
  finally { b.disabled = false; }
});

getRedirectResult(auth).catch(e => showGate('login', '출입하지 못했어요: ' + (e.code || e.message)));
onAuthStateChanged(auth, async u => {
  if (!u) { stopAll(); showGate('login'); return; }
  M.uid = u.uid;
  let fid = ''; try { fid = localStorage.getItem('fam-' + u.uid) || ''; } catch (e) {}
  if (fid) { start(fid); return; }                    // 이 폰에서 들어온 적 있으면 바로 시작
  showGate('wait');
  try {
    const s = await getDoc(doc(db, 'users', u.uid));
    fid = s.exists() ? s.data().fid : '';
    if (fid) { try { localStorage.setItem('fam-' + u.uid, fid); } catch (e) {} start(fid); }
    else showGate('choose');
  } catch (e) { console.error(e); showGate('choose'); }
});

// ---------- 대상 정보 안의 '가족 공간' ----------
window.FAM = {
  settingsHtml() {
    const ms = M.members.map(m => esc((m.name || m.email || '수사관') + (m.viewer ? '(보기 전용)' : m.role ? '(' + m.role + ')' : ''))).join(', ') || '나';
    return `<div class="field"><span>가족 공간</span>
      <p class="hint" style="margin:0 0 8px">함께하는 수사관: ${ms}</p>
      <div class="quick" style="flex-wrap:wrap">
        <button data-fam="invite">가족 초대 코드</button>
        <button data-fam="import">예전 기록 가져오기</button>
        <button data-fam="logout">로그아웃</button>
      </div></div>
      <div class="field"><span>🔔 아침 알림 (08:50)</span>
      <p class="hint" style="margin:0 0 8px">${isViewer() ? '100일·생일 같은 기념일을 알려 드려요.' : '예방접종 D-3·당일, 영유아검진 기간 시작, 이유식 3일 관찰 끝, 기념일을 이 폰으로 알려 줘요.'}</p>
      <div class="quick">${(() => { let on = ''; try { on = localStorage.getItem('soeun-push') || ''; } catch (e) {} return on ? '<span style="align-self:center;font-size:13px;color:#2E7D5B;font-weight:700">이 폰은 알림 받는 중</span><button data-fam="push-test">시험 알림</button><button data-fam="push-off">끄기</button>' : '<button data-fam="push-on">이 폰에서 알림 받기</button>'; })()}</div></div>`;
  }
};
const openSheet = h => app().openSheet(h);

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-fam]'); if (!b) return;
  const act = b.dataset.fam;
  if (act === 'logout') { if (await ask('이 폰에서 로그아웃할까요?')) await logout(); return; }
  if (act === 'invite') {
    if (isViewer()) { app().toast('보기 전용으로 들어와서 초대 코드는 엄마·아빠만 만들 수 있어요'); return; }
    // 지금은 엄마·아빠 둘만 써서 바로 함께 기록 코드를 만들어요 (보기 전용 초대는 아래 invite2 data-v="1"로 남겨 둠)
    if (!b.dataset.choose) { b.dataset.v = ''; return inviteCode(b, false); }
    openSheet(`<h3>누구를 초대할까요?</h3>
      <div class="rolepick"><button data-fam="invite2" data-v="">함께 기록<br><small style="font-family:var(--body);font-size:13px">엄마·아빠 수사관</small></button><button data-fam="invite2" data-v="1">보기 전용<br><small style="font-family:var(--body);font-size:13px">할머니·이모 등 가족</small></button></div>
      <p class="hint">보기 전용으로 들어온 가족은 사진·기록을 볼 수만 있고, 남기거나 고칠 수는 없어요.</p>
      <div class="actions"><button class="secondary" data-act="close">닫기</button></div>`);
    return;
  }
  if (act === 'invite2') return inviteCode(b, b.dataset.v === '1');
});
async function inviteCode(b, viewer) {
  {
    b.disabled = true;
    try {
      const code = await makeInvite(viewer), url = location.origin + location.pathname;
      openSheet(`<h3>${viewer ? '보기 전용 초대 코드' : '가족 초대 코드'}</h3>
        <div class="famcode">${code}</div>
        <p class="hint">7일 동안 쓸 수 있어요. 가족이 앱 주소로 들어와 구글 계정으로 출입한 뒤 이 코드를 넣으면 같은 기록을 ${viewer ? '볼 수 있어요 (기록은 못 남겨요)' : '함께 봐요'}.</p>
        <p class="hint" style="word-break:break-all">앱 주소: ${esc(url)}</p>
        <div class="actions"><button class="secondary" data-act="close">닫기</button><button class="primary" data-fam="share" data-code="${code}">보내기</button></div>`);
    } catch (x) { app().toast('코드를 만들지 못했어요: ' + (x.message || '')); }
    finally { b.disabled = false; }
  }
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-fam]'); if (!b) return;
  const act = b.dataset.fam;
  if (act === 'push-on' || act === 'push-off') {
    b.disabled = true;
    try { await H[act === 'push-on' ? 'enablePush' : 'disablePush'](); app().toast(act === 'push-on' ? '알림을 켰어요. 매일 아침 8시 50분에 챙길 일이 있으면 알려 줄게요' : '이 폰의 알림을 껐어요'); app().closeSheet(); }
    catch (x) { console.error(x); app().toast(x.message || '알림을 켜지 못했어요'); }
    finally { b.disabled = false; }
    return;
  }
  if (act === 'push-test') {
    try { const reg = await navigator.serviceWorker.ready; await reg.showNotification('🐿️ 소은 탐정 시험 알림', { body: '알림이 이렇게 와요. 챙길 일이 있는 날 아침에만 와요', icon: './icons/icon-192.png', badge: './icons/badge-96.png', tag: 'test' }); } catch (x) { app().toast('알림을 띄우지 못했어요: ' + (x.message || '')); }
    return;
  }
  if (act === 'share') {
    const url = location.origin + location.pathname, text = `${/^V[A-Z2-9]{4}9$/.test(b.dataset.code) ? '소은이 사진 구경하러 오세요! ' : ''}성장 수사 일지 초대 코드: ${b.dataset.code}\n${url}`;
    try { if (navigator.share) await navigator.share({ title: '성장 수사 일지 초대', text }); else { await navigator.clipboard.writeText(text); app().toast('복사했어요'); } } catch (x) {}
    return;
  }
  if (act === 'import') {
    openSheet(`<h3>예전 기록 가져오기</h3>
      <p class="hint">구글 시트 앱에서 만든 이사짐 파일(이사짐_1.zip, 이사짐_2.zip …)을 모두 골라 주세요. 여러 개면 한 번에 같이 고르면 돼요. PC에서 하는 걸 권해요.</p>
      <p class="hint" style="color:var(--red)">지금 이 가족 공간에 있는 기록은 지워지고 예전 기록으로 바뀌어요.</p>
      <label class="field"><span>이사짐 파일</span><input id="fam-zip" type="file" accept=".zip,application/zip" multiple></label>
      <p class="famprog" id="fam-prog"></p>
      <div class="actions"><button class="secondary" data-act="close">닫기</button></div>`);
  }
});
document.addEventListener('change', async e => {
  if (e.target.id !== 'fam-zip' || !e.target.files.length) return;
  const prog = m => { const p = document.getElementById('fam-prog'); if (p) p.textContent = m; };
  e.target.disabled = true;
  try { await importZips([...e.target.files], prog); }
  catch (x) { console.error(x); prog('가져오지 못했어요: ' + (x.message || x)); }
  finally { e.target.disabled = false; }
});

// ---------- 이사 (구글 시트 → Firebase) ----------
function loadJSZip() {
  if (window.JSZip) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = res; s.onerror = () => rej(new Error('압축 도구를 불러오지 못했어요')); document.head.appendChild(s); });
}
async function importZips(files, prog) {
  prog('짐 상자 여는 중…');
  await loadJSZip();
  let pack = null; const photos = {};
  for (const f of files) {
    const z = await window.JSZip.loadAsync(f);
    for (const name of Object.keys(z.files)) {
      const en = z.files[name]; if (en.dir) continue;
      const base = name.split('/').pop();
      if (base === 'data.json') pack = JSON.parse(await en.async('string'));
      else { const m = /^photo_(.+)\.(jpg|jpeg|png|webp)$/i.exec(base); if (m) photos[m[1]] = { en, ext: m[2].toLowerCase() }; }
    }
  }
  if (!pack || !pack.data) throw new Error('data.json이 든 첫 번째 파일(이사짐_1.zip)도 같이 골라 주세요');
  const D = pack.data, need = (pack.photoIds || []).length, ids = Object.keys(photos);
  const nRec = (D.records || []).length + Object.values(OUT).reduce((s, k) => s + (D[k] || []).length, 0);
  if (!await ask(`기록 ${nRec}건, 사진 ${ids.length}/${need}장을 가져올게요.\n지금 공간의 기록은 지우고 예전 기록으로 바꿔요. 계속할까요?`)) { prog(''); return; }

  // 1) 사진 올리기 (4장씩 동시에)
  const urls = {}; let done = 0;
  const mime = x => x === 'png' ? 'image/png' : x === 'webp' ? 'image/webp' : 'image/jpeg';
  const queue = ids.slice();
  await Promise.all([0, 1, 2, 3].map(async () => {
    while (queue.length) {
      const id = queue.shift(), p = photos[id];
      const blob = new Blob([await p.en.async('arraybuffer')], { type: mime(p.ext) });
      urls[id] = await uploadBlob(id, blob, mime(p.ext), p.ext === 'jpeg' ? 'jpg' : p.ext);
      prog(`사진 옮기는 중 ${++done}/${ids.length}`);
    }
  }));

  // 2) 기존 기록 지우고 새로 쓰기 (400개씩 묶어서)
  prog('기록 옮기는 중…');
  const ops = [], oldPaths = [];
  COLS.forEach(c => M.col[c].forEach(o => { ops.push(['del', c, o.id]); if (o.photoPath) oldPaths.push(o.photoPath); }));
  const ph = (id, has) => has && urls[id] ? urls[id] : { photoUrl: '', photoPath: '' };
  (D.records || []).forEach((r, i) => ops.push(['set', 'records', r.id, Object.assign({ date: r.date, weight: numOrNull(r.weight), height: numOrNull(r.height), head: numOrNull(r.head), memo: r.memo || '', by: role_(r.by), _o: i }, ph(r.id, r.photo))]));
  (D.periods || []).forEach((p, i) => ops.push(['set', 'periods', p.id, { name: String(p.name || ''), month: p.month === '' || p.month == null ? '' : Number(p.month), confirmed: p.confirmed || '', hospital: p.hospital || '', _o: i }]));
  (D.vaccines || []).forEach((v, i) => ops.push(['set', 'vaccines', v.id, { period: String(v.period), name: String(v.name || ''), sub: v.sub || '', done: v.done || '', memo: v.memo || '', by: role_(v.by), _o: i }]));
  Object.keys(TBL).forEach(k => (D[OUT[k]] || []).forEach((o, i) => {
    const row = { _o: i };
    TBL[k].forEach(key => { if (key !== 'photo') row[key] = key === 'by' ? role_(o.by) : String(o[key] == null ? '' : o[key]); });
    if (TBL[k].includes('photo')) Object.assign(row, ph(o.id, o.photo));
    ops.push(['set', k, o.id, row]);
  }));
  // 같은 id가 지우기·쓰기 둘 다 있으면 쓰기만 (한 묶음 안 충돌 방지)
  const setKeys = new Set(ops.filter(o => o[0] === 'set').map(o => o[1] + '/' + o[2]));
  const final = ops.filter(o => o[0] === 'set' || !setKeys.has(o[1] + '/' + o[2]));
  for (let i = 0; i < final.length; i += 400) {
    const b = writeBatch(db);
    final.slice(i, i + 400).forEach(([op, c, id, row]) => op === 'del' ? b.delete(dref(c, String(id))) : b.set(dref(c, String(id)), row));
    await b.commit();
    prog(`기록 옮기는 중 ${Math.min(i + 400, final.length)}/${final.length}`);
  }

  // 3) 대상 정보
  const p = D.profile || {}, f = M.family || {};
  [f.photoPath, f.momPhotoPath, f.dadPhotoPath].forEach(x => x && oldPaths.push(x));
  const up = { name: txt(p.name || '우리 아기', 20), birth: p.birth || '', mom: txt(p.mom, 20), dad: txt(p.dad, 20) };
  const pp = (id, has, pre) => { const u = ph(id, has); up[pre + 'Url'] = u.photoUrl; up[pre + 'Path'] = u.photoPath; };
  pp('profile', p.photo, 'photo'); pp('mom', p.momPhoto, 'momPhoto'); pp('dad', p.dadPhoto, 'dadPhoto');
  await setDoc(fref(), up, { merge: true });
  oldPaths.forEach(dropPhoto);

  prog(`다 옮겼어요! 기록 ${nRec}건, 사진 ${ids.length}장`);
  app().toast('예전 기록을 모두 가져왔어요');
  setTimeout(() => { app().closeSheet(); pendingRemote = true; flushRemote(); }, 1200);
}

// ---------- 새 버전 안내 ----------
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    const upd = () => reg.update().catch(() => {});
    // 새 버전 띠: 서비스 워커가 받아 둔 새 버전이 있으면 그걸로, 없으면(브라우저가 확인을 늦출 때) 통째로 다시 불러와요
    const bar = () => {
      if (document.getElementById('updbar') || !navigator.serviceWorker.controller) return;
      const el = document.createElement('div'); el.id = 'updbar';
      el.innerHTML = '<span>새 버전이 있어요</span><button>업데이트</button>';
      el.querySelector('button').onclick = async () => {
        el.querySelector('button').disabled = true;
        if (reg.waiting) { reg.waiting.postMessage('skip'); return; }
        try { await reg.unregister(); (await caches.keys()).filter(k => k.startsWith('shell-')).forEach(k => caches.delete(k)); } catch (e) {}
        location.reload();
      };
      document.body.appendChild(el);
    };
    const show = () => { if (reg.waiting) bar(); };
    show();
    reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed') show(); }); });
    // 서버의 sw.js 버전을 1분마다(앱을 보고 있을 때)·앱으로 돌아올 때 직접 확인 → 다르면 바로 새로 받고, 20초 안에 못 받으면 띠를 먼저 보여 줘요 (예전처럼 거의 실시간)
    const running = () => new Promise(res => { const c = navigator.serviceWorker.controller; if (!c) return res(''); const ch = new MessageChannel(), t = setTimeout(() => res(''), 800); ch.port1.onmessage = e => { clearTimeout(t); res(String(e.data || '')); }; c.postMessage('ver', [ch.port2]); });
    let polling = false;
    const poll = async () => {
      if (polling || document.visibilityState !== 'visible' || document.getElementById('updbar')) return; polling = true;
      try {
        const r = await fetch('sw.js?v=' + Date.now(), { cache: 'no-store' }), v = (/const VERSION = '([^']+)'/.exec(await r.text()) || [])[1], cur = await running();
        if (v && cur && v !== cur) { upd(); setTimeout(() => { if (!reg.waiting) bar(); else show(); }, 20000); }
      } catch (e) {}
      polling = false;
    };
    const clearNotes = () => { try { navigator.serviceWorker.getRegistration().then(r => r && r.getNotifications().then(L => L.forEach(n => n.close()))); } catch (e) {} };   // 앱을 열면(보면) 알림 칸에 남은 알림과 앱 아이콘 숫자를 치워요
    clearNotes(); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { upd(); poll(); clearNotes(); } });
    window.addEventListener('focus', () => { upd(); poll(); });
    setInterval(() => { upd(); poll(); }, 60 * 1000);
    setTimeout(poll, 4000);
  }).catch(e => console.warn('SW', e));
}
