# 지인용: 내 Firebase로 쓰기 (앱 코드는 우리 주소 그대로, 저장은 전부 지인 Firebase)

앱 주소는 우리 것(`https://rew623.github.io/soeun-diary/`)을 그대로 쓰고, 로그인·기록·사진은 지인 본인의 Firebase 프로젝트에 저장돼요. 우리 쪽에서는 그 데이터를 볼 수 없어요.
앱 첫 화면(로그아웃 상태)의 **'지인용: 내 Firebase로 연결하기'**에 설정값을 붙여 넣으면 이 폰이 그 프로젝트로 연결돼요 (설정 화면 '☁️ 저장 위치'에서 확인·되돌리기). 연결 값은 폰마다 따로 저장돼요 (localStorage `soeun-fb-config`).
코드는 app.js 위쪽(`FB_OVR`) · 출입 화면(`showGate('fb')`, `saveFbConfig`) · settings.js(저장 위치 칸). config.js는 건드리지 않아요 (기본값 = 우리 가족).

미리 구경하고 싶으면 첫 화면의 **'로그인 없이 둘러보기 (예시 데이터)'**를 눌러요. 어디에도 연결·저장하지 않고 예시 아기 데이터로 앱을 열어 봐요 (위 띠의 '나가기'로 처음 화면).

## 지인이 할 일 (30~40분, 컴퓨터로)
1. **Firebase 프로젝트 만들기** — console.firebase.google.com → 프로젝트 추가 (애널리틱스는 꺼도 됨).
2. **구글 로그인 켜기** — 빌드 → Authentication → 시작하기 → Google 켜기. 설정 → 승인된 도메인에 **`rew623.github.io`** 추가 (빼면 로그인 창이 에러로 닫혀요).
3. **Firestore 만들기** — 위치 `asia-northeast3`(서울), 프로덕션 모드.
4. **Storage 만들기** — 위치 서울. Blaze(카드 등록)를 요구하면 따라요 (새 프로젝트 Storage는 Blaze 필요, 적게 쓰면 거의 무료). Google Cloud → 결제 → 예산 알림(월 1만 원 등) 걸어 두기.
5. **보안 규칙 넣기** (아래 두 개, 각각 '규칙' 탭에 붙여 넣고 게시).
6. **웹 앱 설정값 복사** — 프로젝트 설정 ⚙ → 일반 → 내 앱 → 웹 앱(`</>`) 추가 → 'SDK 설정 및 구성'의 `firebaseConfig` 글 통째로.
7. **(선택) 사진 CORS** — 기념 사진관·영상·신문처럼 사진을 합치는 기능용. Google Cloud Console → 그 프로젝트 → Cloud Shell(`>_`):
   ```
   echo '[{"origin":["https://rew623.github.io"],"method":["GET","HEAD"],"responseHeader":["Content-Type","Content-Length","Cache-Control"],"maxAgeSeconds":3600}]' > cors.json
   gsutil cors set cors.json gs://여기에버킷이름
   ```
   (버킷 이름 = firebaseConfig의 `storageBucket` 값)
8. **폰에서 열기** — 아이폰은 **먼저** 사파리로 앱 주소를 열어 '공유 → 홈 화면에 추가'를 하고, **홈 화면 아이콘으로 열어서** 연결해요 (아이폰은 사파리와 홈 화면 앱의 저장 공간이 따로라서, 사파리에서 연결하면 홈 화면 앱엔 안 들어가요). 첫 화면의 '지인용: 내 Firebase로 연결하기' → 6번 글 붙여 넣기 → '이 Firebase로 연결' → 구글 로그인 → '새 가족 공간 만들기' → 아기 정보 입력.
9. **배우자** — 같은 방법으로 앱을 열고 연결한 뒤, 설정의 초대 코드(7일 안에)로 입장.

## 보안 규칙 (우리 앱 코드의 가족 만들기·초대·저장 흐름을 보고 만든 초안 — 새 프로젝트에서 실제로 시험하지는 않았어요. 우리 콘솔의 원본 규칙과 비교하면 더 안전해요)
Firestore:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn() { return request.auth != null; }
    function isMember(fid) { return signedIn() && exists(/databases/$(db)/documents/families/$(fid)/members/$(request.auth.uid)); }
    match /users/{uid} { allow read, write: if signedIn() && request.auth.uid == uid; }
    match /invites/{code} { allow read, create, delete: if signedIn(); }
    match /families/{fid} {
      allow create: if signedIn();
      allow read, update, delete: if isMember(fid);
      match /members/{uid} {
        allow create: if signedIn() && request.auth.uid == uid;
        allow read, update, delete: if isMember(fid);
      }
      match /{doc=**} { allow read, write: if isMember(fid); }
    }
  }
}
```
Storage:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /families/{fid}/{all=**} {
      allow read, write: if request.auth != null
        && firestore.exists(/databases/(default)/documents/families/$(fid)/members/$(request.auth.uid));
    }
  }
}
```

## 안 되거나 다른 것
- 수유 알람 **푸시 알림**: 알림 서버(`functions/`)는 그 프로젝트에 따로 설치해야 해서 안 와요. 연결하면 알림 열쇠(push-key.js)도 쓰지 않아요 (앱이 열려 있을 때의 알람 소리는 됨).
- 병원·동네 정보(data/*.json)는 공개 자료라 그대로 보이지만 지금은 강원도만이에요. 카카오 지도는 우리 키·우리 주소라 그대로 돼요.
- 지인 데이터는 지인 프로젝트에만 있어요 — 설정의 백업 파일을 가끔 저장해 두기. Firebase를 지우면 같이 사라져요.
- 앱을 업데이트하면 지인 앱에도 자동 반영돼요. 저장 구조(Firestore)를 바꿀 때는 지인에게도 알릴 것.
