# Conference Scheduler V2.0

글로벌 확장이 가능한 다중 행사 관리 시스템

## 🎯 주요 변경사항

### V1 → V2 업그레이드

#### 1. **Multi-Event Architecture (행사 중심 구조)**
- 하나의 시스템에서 여러 행사를 관리
- 행사별로 독립적인 데이터 분리
- 행사 로비를 통한 간편한 전환

#### 2. **실시간 협업 (Real-time Collaboration)**
- Firebase Presence 기반 동시 편집
- Cell Locking으로 편집 충돌 방지
- 실시간 사용자 활동 표시

#### 3. **모바일 최적화**
- 터치 기반 인터랙션
- 세로형 타임라인 뷰
- Bottom Sheet UI
- 반응형 디자인

#### 4. **글로벌 지원**
- 다국어 인터페이스 (한/영/일/태국어)
- TimeZone 관리
- 국가별 폰트 설정

#### 5. **중복 문제 해결**
- 강의 배치 전 중복 검사
- 렌더링 전 자동 중복 제거
- 앱 시작 시 클리닝

## 📁 프로젝트 구조

```
conference-scheduler-v2/
├── index.html              # 행사 로비 (진입점)
├── scheduler.html          # 스케줄러 메인
├── config/
│   ├── firebase-v2.js      # Firebase 설정
│   ├── timezones.js        # TimeZone 관리
│   └── i18n.js             # 다국어 설정
├── js/
│   ├── core/
│   │   ├── app.js          # 앱 초기화
│   │   ├── state.js        # 상태 관리
│   │   └── utils.js        # 유틸리티
│   ├── features/
│   │   ├── lobby.js        # 행사 로비
│   │   ├── presence.js     # 실시간 협업
│   │   ├── mobile.js       # 모바일 최적화
│   │   ├── schedule.js     # 스케줄 관리
│   │   └── ...
│   ├── ui/
│   │   ├── modals.js       # 모달 UI
│   │   └── toast.js        # 알림 시스템
│   └── tools/
│       └── migration.js    # V1→V2 마이그레이션
└── styles/
    ├── main.css            # 메인 스타일
    ├── lobby.css           # 로비 스타일
    └── mobile.css          # 모바일 스타일
```

## 🚀 설치 및 설정

### 1. Firebase 프로젝트 생성

**중요**: V2는 V1과 **완전히 분리된 새 Firebase 프로젝트**를 사용하세요.

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "새 프로젝트" 생성
3. Realtime Database 활성화
4. Authentication > Google 로그인 활성화

### 2. Firebase 설정

`config/firebase-v2.js` 파일을 열고 설정을 입력하세요:

```javascript
const firebaseConfigV2 = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Firebase Security Rules

Firebase Console > Realtime Database > 규칙에 다음을 설정:

```json
{
  "rules": {
    "events": {
      "$eventId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

### 4. GitHub Pages 배포

```bash
# 저장소 생성 및 푸시
git init
git add .
git commit -m "Initial V2.0"
git remote add origin https://github.com/YOUR_USERNAME/conference-scheduler-v2.git
git push -u origin main

# GitHub Pages 설정
# Settings > Pages > Source: main branch
```

접속 URL: `https://YOUR_USERNAME.github.io/conference-scheduler-v2/`

## 📊 V1 데이터 마이그레이션

### 방법 1: JSON 백업 파일 사용 (권장)

1. V1 스케줄러에서 "JSON 백업" 기능으로 데이터 내보내기
2. V2 행사 로비에서 새 행사 생성
3. 행사 설정 > "V1 데이터 가져오기"
4. JSON 파일 업로드

### 방법 2: Firebase 직접 연결

1. V2에서 새 행사 생성
2. "V1 데이터 가져오기" 선택
3. V1 Firebase Project ID와 API Key 입력
4. "가져오기 시작" 클릭

**주의**: 마이그레이션은 현재 행사의 모든 데이터를 덮어씁니다.

## 🎨 핵심 기능

### 1. 행사 로비
- 여러 행사를 한 곳에서 관리
- 행사별 권한 설정 (소유자/편집자/열람자)
- 최근 접속 기록

### 2. 실시간 협업
- 동시 접속 사용자 표시
- 편집 중인 셀 실시간 표시
- 충돌 방지 자동 Lock

### 3. 모바일 지원
- 터치 최적화 인터페이스
- 세로형 타임라인 뷰
- 롱프레스 컨텍스트 메뉴

### 4. 중복 방지
- 강의 배치 전 자동 검사
- 렌더링 전 중복 제거
- 앱 시작 시 자동 클리닝

## 🛠️ 개발 환경

### 로컬 개발 서버 실행

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

접속: `http://localhost:8000`

### 디버깅

브라우저 콘솔에서:

```javascript
// 현재 상태 확인
AppState.logState();

// 중복 검사
deduplicateSchedule();

// 강제 동기화
saveAndSync();
```

## 📝 주요 변경사항 (V1 대비)

### 데이터 구조
```
V1: /data/{speakers, lectures, schedule}
V2: /events/{eventId}/data/{speakers, lectures, schedule}
```

### 새로운 기능
- ✅ Multi-event support
- ✅ Real-time collaboration
- ✅ Cell locking
- ✅ Mobile optimization
- ✅ Timeline view
- ✅ TimeZone management
- ✅ Multilingual support
- ✅ Duplicate prevention

### 개선사항
- ✅ Toast 알림 (alert() 제거)
- ✅ 데이터 무결성 검증
- ✅ 중복 자동 제거
- ✅ 모바일 반응형
- ✅ 에러 핸들링 강화

## 🐛 트러블슈팅

### 문제: 로그인이 안 됨
- Firebase Authentication이 활성화되어 있는지 확인
- Google 로그인 방법이 활성화되어 있는지 확인
- 도메인이 승인된 도메인 목록에 있는지 확인

### 문제: 데이터가 저장 안 됨
- Firebase Realtime Database 규칙 확인
- 콘솔에서 에러 로그 확인
- 네트워크 연결 상태 확인

### 문제: 중복 강의가 나타남
- 앱 새로고침 (자동 클리닝 실행)
- 콘솔에서 `cleanupDuplicateSchedules()` 실행

## 📚 참고 자료

- [Firebase Documentation](https://firebase.google.com/docs)
- [GitHub Pages Guide](https://pages.github.com/)
- [MDN Web Docs](https://developer.mozilla.org/)

## 🤝 기여

버그 리포트나 기능 제안은 GitHub Issues를 통해 제출해주세요.

## 📄 라이선스

MIT License

## 👨‍💻 개발자

Hun - Conference Scheduler V2.0

---

**V1 사용자 공지**: V1 시스템은 계속 안정적으로 운영됩니다. V2는 완전히 분리된 새 시스템이므로 V1에 영향을 주지 않습니다.
