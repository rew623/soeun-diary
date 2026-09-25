// 성장 수사 일지 — Firebase 연결 (로그인, 가족 공간, 기록 저장, 사진, 이사, 새 버전 안내)
import { FIREBASE_CONFIG } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, collection, getDoc, setDoc, deleteDoc, onSnapshot, writeBatch, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

const fb = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(fb);
const db = initializeFirestore(fb, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const storage = getStorage(fb);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// ---------- 표 구성 (기존 시트와 같은 칸) ----------
const TBL = {
  ep: ['title', 'start', 'end', 'memo'],
  log: ['ep', 'kind', 'at', 'value', 'dose', 'site', 'memo', 'by'],
  visit: ['date', 'hospital', 'diag', 'rx', 'next', 'ask', 'by'],
  mom: ['type', 'title', 'date', 'memo', 'photo', 'by'],
  food: ['name', 'start', 'result', 'reaction', 'memo', 'by'],
  meal: ['date', 'slot', 'menu', 'amount', 'eat', 'memo', 'photo', 'by'],
  cube: ['name', 'count', 'made', 'memo'],
  menu: ['month', 'title', 'photo']
};
const OUT = { ep: 'eps', log: 'logs', visit: 'visits', mom: 'moments', food: 'foods', meal: 'meals', cube: 'cubes', menu: 'menus' };
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
const M = { fid: '', uid: '', family: null, member: null, members: [], col: {}, hosp: new Map(), recipes: new Map(), checkups: new Map() };
COLS.forEach(c => { M.col[c] = new Map(); });
let unsubs = [], lastJSON = '', pendingRemote = false, ready = false;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const newId = p => p + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
const role_ = r => (r === '엄마' || r === '아빠') ? r : '';
const myRole = () => (M.member && M.member.role) || '';
const dateOk = d => d === '' || /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const txt = (v, n) => String(v == null ? '' : v).slice(0, n);
const numOrNull = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
const fref = () => doc(db, 'families', M.fid);
const dref = (c, id) => doc(db, 'families', M.fid, c, String(id));
const list = c => [...M.col[c].values()].sort((a, b) => ((a._o ?? 0) - (b._o ?? 0)) || String(a.id).localeCompare(String(b.id)));
const app = () => window.__app;

// 서버 응답이 늦어도(지하철 등) 화면은 바로 넘어가고, 저장은 뒤에서 마저 해요
async function commit(p) {
  let late = false;
  p.catch(e => { if (late && app()) app().toast('서버 저장에 실패했어요: ' + ((e && e.message) || '')); });
  await Promise.race([p, sleep(2500).then(() => { late = true; })]);
}
function localSet(c, id, data) { const cur = M.col[c].get(id) || { id }; M.col[c].set(id, Object.assign({}, cur, data, { id })); }

// ---------- 화면용 데이터 (예전 getData와 같은 모양) ----------
function build() {
  const f = M.family || {};
  const item = k => list(k).map(o => {
    const c = { id: o.id };
    TBL[k].forEach(key => { c[key] = key === 'photo' ? !!o.photoUrl : (o[key] == null ? '' : String(o[key])); });
    if (k === 'mom') c.board = !!o.board;          // 수사 보드에 붙인 사진
    return c;
  });
  const d = {
    profile: { name: f.name || '', birth: f.birth || '', sex: f.sex === 'M' ? 'M' : 'F', photo: !!f.photoUrl, mom: f.mom || '', dad: f.dad || '', momPhoto: !!f.momPhotoUrl, dadPhoto: !!f.dadPhotoUrl },
    me: { role: myRole(), hasEmail: true },
    records: list('records').filter(r => r.date).map(r => ({ id: r.id, date: r.date, weight: numOrNull(r.weight), height: numOrNull(r.height), head: numOrNull(r.head), memo: r.memo || '', photo: !!r.photoUrl, by: r.by || '' })),
    periods: list('periods').map(p => ({ id: p.id, name: String(p.name || ''), month: p.month === '' || p.month == null ? '' : Number(p.month), confirmed: p.confirmed || '', hospital: p.hospital || '' })),
    vaccines: list('vaccines').map(v => ({ id: v.id, period: String(v.period || ''), name: String(v.name || ''), sub: v.sub || '', done: v.done || '', memo: v.memo || '', by: v.by || '' }))
  };
  Object.keys(TBL).forEach(k => { d[OUT[k]] = item(k); });
  d.recipes = [...M.recipes.values()].map(r => ({ month: r.id, title: r.title || '', file: r.file || '', stages: r.stages || [], by: r.by || '' }));
  d.checkups = [...M.checkups.values()].map(c => ({ id: c.id, done: c.done || '', hospital: c.hospital || '', memo: c.memo || '', by: c.by || '' }));
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
  for (const c of ['records', 'mom', 'meal', 'menu']) { const o = M.col[c].get(String(id)); if (o && o.photoUrl) return o.photoUrl; }
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
      row[key] = txt(obj[key], 300);
    });
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

const API = {
  async call(fn, args) {
    if (!H[fn]) throw new Error('알 수 없는 기능: ' + fn);
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
  M.fid = fid; M.family = null; M.member = null; COLS.forEach(c => M.col[c].clear()); M.hosp = new Map(); M.recipes = new Map(); M.checkups = new Map();
  const need = new Set(['family', 'member', ...COLS]);
  const first = key => { if (!need.has(key)) return; need.delete(key); if (!need.size) { ready = true; hideGate(); window.__resolveAPI(API); } };
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
  await enter(inv.fid);
}
async function makeInvite() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), x => A[x % A.length]).join('');
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
    if (b.dataset.g === 'create') { if (confirm('새 가족 공간을 만들까요?\n배우자는 만든 뒤에 초대 코드로 들어오면 돼요.')) { showGate('wait'); await createFamily(); } }
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
    const ms = M.members.map(m => esc((m.name || m.email || '수사관') + (m.role ? '(' + m.role + ')' : ''))).join(', ') || '나';
    return `<div class="field"><span>가족 공간</span>
      <p class="hint" style="margin:0 0 8px">함께하는 수사관: ${ms}</p>
      <div class="quick" style="flex-wrap:wrap">
        <button data-fam="invite">가족 초대 코드</button>
        <button data-fam="import">예전 기록 가져오기</button>
        <button data-fam="logout">로그아웃</button>
      </div></div>`;
  }
};
const openSheet = h => app().openSheet(h);

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-fam]'); if (!b) return;
  const act = b.dataset.fam;
  if (act === 'logout') { if (confirm('이 폰에서 로그아웃할까요?')) await logout(); return; }
  if (act === 'invite') {
    b.disabled = true;
    try {
      const code = await makeInvite(), url = location.origin + location.pathname;
      openSheet(`<h3>가족 초대 코드</h3>
        <div class="famcode">${code}</div>
        <p class="hint">7일 동안 쓸 수 있어요. 가족이 앱 주소로 들어와 구글 계정으로 출입한 뒤 이 코드를 넣으면 같은 기록을 함께 봐요.</p>
        <p class="hint" style="word-break:break-all">앱 주소: ${esc(url)}</p>
        <div class="actions"><button class="secondary" data-act="close">닫기</button><button class="primary" data-fam="share" data-code="${code}">보내기</button></div>`);
    } catch (x) { app().toast('코드를 만들지 못했어요: ' + (x.message || '')); }
    finally { b.disabled = false; }
    return;
  }
  if (act === 'share') {
    const url = location.origin + location.pathname, text = `성장 수사 일지 초대 코드: ${b.dataset.code}\n${url}`;
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
  if (!confirm(`기록 ${nRec}건, 사진 ${ids.length}/${need}장을 가져올게요.\n지금 공간의 기록은 지우고 예전 기록으로 바꿔요. 계속할까요?`)) { prog(''); return; }

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
    const show = () => {
      if (!reg.waiting || !navigator.serviceWorker.controller || document.getElementById('updbar')) return;
      const bar = document.createElement('div'); bar.id = 'updbar';
      bar.innerHTML = '<span>새 버전이 있어요</span><button>업데이트</button>';
      bar.querySelector('button').onclick = () => { bar.querySelector('button').disabled = true; reg.waiting && reg.waiting.postMessage('skip'); };
      document.body.appendChild(bar);
    };
    show();
    reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed') show(); }); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(e => console.warn('SW', e));
}
