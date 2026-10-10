// 발달 체크 — 예방접종 탭의 [예방접종 | 영유아검진 | 발달 체크] (S.vacView='dev')
// 월령별로 흔히 보이는 모습을 체크해 두면 영유아검진 문진표 쓸 때 도움이 돼요
// 항목은 미국 CDC "Learn the Signs. Act Early." 발달 이정표를 참고해 쉬운 말로 정리했어요
// 저장: families/{fid}/dev/{항목 id} = { at: 확인한 날, by }
(function () {
const G = [
  [2, '2개월 무렵', ['말을 걸거나 안아 주면 진정해요', '얼굴을 쳐다봐요', '말하거나 웃어 주면 따라 웃어요', '울음 말고 "아~", "우~" 소리를 내요', '큰 소리에 놀라거나 반응해요', '움직이는 사람을 눈으로 따라가요', '엎드리면 고개를 잠깐 들어요', '양팔·양다리를 잘 움직여요']],
  [4, '4개월 무렵', ['먼저 웃어서 관심을 끌어요', '소리 내어 까르르 웃어요', '말을 걸면 소리로 대답하듯 해요', '소리 나는 쪽으로 고개를 돌려요', '자기 손을 신기하게 쳐다봐요', '안겨 있을 때 고개를 흔들림 없이 가눠요', '엎드려서 팔로 상체를 받쳐요', '장난감을 쥐고 흔들어요', '손을 입으로 가져가요']],
  [6, '6개월 무렵', ['아는 사람을 알아봐요', '거울 속 자기를 보고 좋아해요', '번갈아 가며 옹알이로 "대화"해요', '입술을 부르르 떨며 침을 튀겨요', '원하는 걸 잡으려고 손을 뻗어요', '엎드린 상태에서 바로 누운 자세로 뒤집어요', '엎드려서 팔을 쭉 펴고 몸을 밀어 올려요', '앉을 때 손을 짚고 버텨요']],
  [9, '9개월 무렵', ['낯선 사람을 보면 낯을 가려요', '기쁨·슬픔·놀람 같은 표정이 다양해요', '이름을 부르면 쳐다봐요', '"까꿍"에 반응해요', '"마마", "바바" 같은 소리를 내요', '떨어뜨린 물건을 찾아요', '두 물건을 서로 부딪쳐 봐요', '도움 없이 혼자 앉아요', '물건을 한 손에서 다른 손으로 옮겨요']],
  [12, '12개월 무렵', ['짝짜꿍 같은 놀이를 함께해요', '손을 흔들어 "빠이빠이"를 해요', '엄마·아빠를 부르는 말을 해요', '"안 돼" 하면 잠깐 멈춰요', '숨긴 물건을 찾아내요', '가구를 잡고 일어서요', '가구를 잡고 옆으로 걸어요', '엄지와 검지로 작은 것을 집어요']],
  [15, '15개월 무렵', ['다른 아이를 따라 해요', '좋아하는 물건을 보여 줘요', '원하는 걸 손가락으로 가리켜요', '"엄마·아빠" 말고 한두 단어를 더 말해요', '이름을 말하면 그 물건을 쳐다봐요', '혼자 몇 걸음 걸어요', '손으로 음식을 집어 먹어요']],
  [18, '18개월 무렵', ['놀다가 엄마·아빠가 있는지 돌아봐요', '재미있는 걸 가리켜 보여 줘요', '세 단어 이상 말해요', '"이리 줘" 같은 간단한 말을 따라 해요', '숟가락을 쓰려고 해요', '잡지 않고 혼자 걸어요', '뚜껑 없는 컵으로 마셔요 (조금 흘려도 괜찮아요)']],
  [24, '24개월 무렵', ['다른 사람이 울면 쳐다보거나 걱정하는 듯해요', '책에서 물건을 가리키며 이름을 말해요', '"물 줘"처럼 두 단어를 붙여 말해요', '신체 부위를 두 곳 이상 가리켜요', '숟가락으로 혼자 먹어요', '공을 발로 차요', '뛰어요', '계단을 몇 칸 걸어 올라가요']]
];
const ITEMS = G.flatMap(([m, , L]) => L.map((t, k) => ({ id: `d${m}_${k}`, m, t })));
const recOf = id => (S.devs || []).find(x => x.id === id);
function curGroup() { const [mo] = monthsDays(S.profile.birth, today()); let g = G[0][0]; for (const [m] of G) if (mo >= m - 1) g = m; return g; }

function render_() {
  const cur = curGroup(), done = ITEMS.filter(x => recOf(x.id)).length;
  return `<p class="hint" style="margin:12px 2px 4px">지금 볼 시기는 <b style="color:var(--red)">${cur}개월 무렵</b>이에요. 보인 모습을 누르면 날짜와 함께 체크돼요. 전체 ${done}/${ITEMS.length}</p>
    ${G.map(([m, nm, L]) => {
      const ids = L.map((t, k) => `d${m}_${k}`), n = ids.filter(i => recOf(i)).length, key = 'dev-' + m;
      const fold = isFold(key, m !== cur);
      return `<section class="devg${m === cur ? ' cur' : ''}${fold ? ' folded' : ''}"><h2 class="sh" data-fold="${key}"><span>${nm}</span><span>${n === L.length ? '✅ ' : ''}${n}/${L.length}</span></h2>
        ${L.map((t, k) => { const id = `d${m}_${k}`, r = recOf(id); return `<button class="vrow devi${r ? ' on' : ''}" data-dev="${id}"><span class="box">${r ? CHECK : ''}</span><span class="vn"><span>${esc(t)}</span>${r ? `<small>${fmtK(r.at, true)} 확인${r.by ? ' · ' + esc(r.by) + ' 수사관' : ''}</small>` : ''}</span></button>`; }).join('')}</section>`;
    }).join('')}
    <p class="foot">아기마다 발달 속도는 많이 달라요. 몇 개 늦어도 대부분 괜찮지만, 걱정되면 영유아검진 때나 소아과에서 상담해 보세요. 항목은 미국 CDC 발달 이정표를 참고했어요.</p>`;
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-dev]'); if (!b) return;
  const id = b.dataset.dev, r = recOf(id);
  if (r) { if (await write('deleteItem', 'dev', id)) toast('체크를 풀었어요'); return; }
  const it = ITEMS.find(x => x.id === id);
  if (await write('saveItem', 'dev', { id, at: today(), by: myRole() })) toast(`✔ ${it ? it.t : '체크했어요'}`);
});

const css = document.createElement('style');
css.textContent = `
.devg.cur{border-color:var(--red)!important}
.devi.on .vn>span{color:var(--muted)}
.devi .box{border-radius:8px}`;
document.head.appendChild(css);

window.DEV = { render: render_ };
})();
