# Conference Scheduler V2 - 설정 가이드

## 📋 개요

Conference Scheduler V2는 학술대회 스케줄 관리를 위한 상용화 버전입니다.

### 주요 특징
- ✅ **하드코딩 완전 제거**: 모든 설정은 Firebase에서 동적 로드
- ✅ **멀티 행사 지원**: 여러 행사를 독립적으로 관리
- ✅ **데이터 업로드**: Excel 파일로 연자/업체 데이터 일괄 업로드
- ✅ **룸별 탭 UI**: PDF 아젠다 형태의 룸별 시간표
- ✅ **실시간 협업**: 여러 사용자가 동시에 작업 가능

---

## 🚀 배포 방법

### 1. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com)에서 프로젝트 생성
2. **Authentication** 활성화
   - Sign-in method → Google 사용 설정
3. **Realtime Database** 생성
   - 위치: asia-southeast1 (싱가포르) 권장
   - 규칙: 아래 `firebase-rules.json` 참조
4. **프로젝트 설정** → **일반** → **내 앱** → **웹 앱 추가**
   - Firebase SDK 구성 복사

### 2. config.js 수정

`/js/config.js` 파일에서 Firebase 설정을 업데이트:

```javascript
firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
}
```

### 3. GitHub Pages 배포

```bash
# 저장소 생성 후
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# GitHub 저장소 설정 → Pages → Branch: main → /scheduler 폴더
```

### 4. Firebase Database Rules 적용

Firebase Console → Realtime Database → 규칙에서 `firebase-rules.json` 내용 붙여넣기

---

## 📁 데이터 구조

### Firebase 구조

```
/
├── eventList/                    # 행사 목록
│   └── {eventId}/
│       ├── name                  # 행사명
│       ├── dates[]               # 날짜 목록
│       ├── roomsByDate{}         # 날짜별 룸
│       ├── timeSettings{}        # 날짜별 시간 설정
│       ├── createdAt
│       ├── createdBy
│       └── members/              # 멤버 권한
│           └── {uid}: "admin" | "editor" | "pending"
│
├── events/                       # 행사 상세 데이터
│   └── {eventId}/
│       ├── data/
│       │   ├── speakers[]        # 연자 목록
│       │   ├── companies[]       # 업체 목록
│       │   └── dataByDate/
│       │       └── {date}/
│       │           ├── lectures[]
│       │           ├── schedule{}
│       │           └── sessions[]
│       │
│       └── settings/
│           ├── dates[]
│           ├── roomsByDate{}
│           ├── timeSettings{}
│           ├── categoryGroups[]
│           ├── categoryColors{}
│           └── kmaRooms{}
│
└── users/                        # 사용자 정보
    └── {uid}/
        ├── email
        ├── displayName
        └── lastLogin
```

---

## 📋 데이터 업로드 형식

### 연자 데이터 (Excel)

| 컬럼명 | 설명 | 필수 |
|--------|------|------|
| name | 이름 (한글) | ✅ |
| nameEn | 영문 이름 | |
| affiliation | 소속 (한글) | |
| affiliationEn | 영문 소속 | |
| isASLS | ASLS 회원 여부 (Y/N) | |
| expertiseTags | 전문 분야 (쉼표 구분) | |

### 업체 데이터 (Excel)

| 컬럼명 | 설명 | 필수 |
|--------|------|------|
| name | 업체명 | ✅ |
| nameEn | 영문명 | |
| contact | 담당자 | |
| email | 이메일 | |
| phone | 연락처 | |
| boothType | 부스 형태 | |
| boothCount | 부스 수 | |

---

## 🔧 사용자 권한

| 권한 | 설명 |
|------|------|
| admin | 모든 기능 (행사 삭제, 멤버 관리 포함) |
| editor | 강의/세션 편집, 데이터 업로드 |
| pending | 읽기 전용 (승인 대기) |

### 첫 사용자
- 첫 번째 로그인 사용자가 자동으로 admin 권한 획득
- 이후 사용자는 pending 상태로 시작

---

## 🎨 UI 기능

### 룸 탭
- **[전체]**: 기존 V1처럼 모든 룸이 가로로 배열
- **[룸별 탭]**: 해당 룸만 세로형 타임라인으로 표시

### 단축키
- **Ctrl+Z**: Undo (최대 10회)

### 드래그 앤 드롭
- 강의 목록 → 시간표: 배치
- 시간표 내: 이동
- 우클릭: 컨텍스트 메뉴 (배치 해제, 복제, 편집)

---

## 🔒 보안 설정

### Firebase Rules 핵심 포인트

1. **인증 필수**: 모든 읽기/쓰기에 로그인 필요
2. **역할 기반 접근**: admin/editor만 쓰기 가능
3. **멤버십 확인**: 행사에 참여한 사용자만 해당 행사 데이터 접근

---

## 🐛 문제 해결

### "Permission denied" 오류
- Firebase Console에서 Database Rules 확인
- 사용자가 해당 행사의 멤버인지 확인
- 브라우저 캐시/쿠키 삭제 후 재로그인

### 실시간 동기화 안 됨
- 네트워크 연결 확인
- Firebase 프로젝트 할당량 확인
- 브라우저 콘솔에서 오류 메시지 확인

### 데이터 업로드 실패
- Excel 파일 형식 확인 (.xlsx, .xls, .csv)
- 필수 컬럼(name) 존재 여부 확인
- 특수문자 인코딩 문제 확인

---

## 📞 지원

문제가 있으면 GitHub Issues를 통해 문의해 주세요.
