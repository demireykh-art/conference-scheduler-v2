# Conference Scheduler V2.0

> 글로벌 다중 행사 관리 플랫폼 | Global Multi-Event Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20DB-orange)](https://firebase.google.com/)
[![GitHub Pages](https://img.shields.io/badge/Deployed%20on-GitHub%20Pages-green)](https://demireykh-art.github.io/conference-scheduler-v2/)

**Live Demo:** [https://demireykh-art.github.io/conference-scheduler-v2/](https://demireykh-art.github.io/conference-scheduler-v2/)

---

## 📋 목차

- [소개](#소개)
- [주요 기능](#주요-기능)
- [시작하기](#시작하기)
- [사용 방법](#사용-방법)
- [기술 스택](#기술-스택)
- [데이터 구조](#데이터-구조)
- [스크린샷](#스크린샷)
- [로드맵](#로드맵)
- [기여하기](#기여하기)
- [라이선스](#라이선스)

---

## 🎯 소개

**Conference Scheduler V2.0**은 국제 학술대회 및 컨퍼런스를 위한 전문적인 일정 관리 시스템입니다.

### 왜 V2.0인가?

- ✅ **다중 행사 지원**: 하나의 플랫폼에서 여러 행사 관리
- ✅ **실시간 협업**: Firebase 기반 실시간 동기화
- ✅ **글로벌 확장**: 다국어 및 타임존 지원 준비
- ✅ **하드코딩 제거**: 모든 설정을 UI에서 관리
- ✅ **전문적인 출력**: Excel 스타일 시간표 내보내기

### 주요 사용처

- 🏥 의학 학술대회 (ASLS, IMCAS 등)
- 🎓 국제 컨퍼런스
- 📊 기업 세미나 및 워크샵
- 🌐 글로벌 심포지엄

---

## ✨ 주요 기능

### 📅 Excel 스타일 스케줄 관리

엑셀과 동일한 6개 컬럼 구조:
- **Time**: 시간
- **Title**: 강의 제목
- **Speaker**: 연자
- **Moderator**: 좌장
- **Product**: 제품/기기명
- **Sponsor**: 스폰서 회사

**지원 기능:**
- 드래그앤드롭으로 강의 배치
- 더블클릭으로 제거
- 세션 헤더 (색상 구분)
- Break 항목 (Coffee Break, Luncheon 등)
- 실시간 중복 감지

### 👥 연자 관리

**사진 업로드 시스템:**
- 📷 400x400px 권장 크기
- 🔍 확대/축소 (Zoom +/-)
- 📐 이미지 크롭 및 편집
- 💾 Base64로 Firebase 저장

**연자 정보:**
- 이름, 소속, 이메일, 전화번호
- 사진 미리보기
- 사진 없을 시 이니셜 표시

### 📚 강의 관리

**기본 정보:**
- 강의 제목
- 연자 선택 (또는 즉시 추가)
- 발표 시간 (분)

**스폰서십 정보:**
- 🏢 스폰서 회사명
- 📦 제품/기기명
- ⚠️ 비스폰 강의 표시

**편의 기능:**
- 강의 추가 중 "➕ 새 연자" 버튼으로 즉시 연자 추가
- 연자 추가 후 자동 선택
- 실시간 검색

### 🎯 세션 관리

**세션 구성:**
- 세션명 (Session #1, Session #2...)
- 좌장(Moderator) 배정
- 세션 색상 선택

**색상 옵션:**
- 🔵 파란색 (일반 세션)
- 🟡 노란색 (Break)
- 🟣 보라색, 🟢 초록색
- 🩷 분홍색 (Luncheon)

### ⚙️ 설정 (하드코딩 완전 제거)

**룸 관리:**
- 룸 추가/수정/삭제
- 룸 이름 변경
- 룸 순서 조정

**시간 설정:**
- 시작 시간 설정
- 종료 시간 설정
- 시간 간격 (10/15/20/30/60분)
- ⚡ 자동 생성 버튼

**기본 설정:**
- 기본 발표 시간 (분)

### 📤 내보내기

**Excel 내보내기:**
- 📊 룸별 별도 시트 생성
- 6개 컬럼 완벽 재현
- Time, Title, Speaker, Moderator, Product, Sponsor
- 엑셀에서 즉시 편집 가능

**JSON 백업:**
- 💾 전체 데이터 백업
- 다른 행사로 데이터 이전
- 버전 관리

### 🔄 실시간 동기화

- Firebase Realtime Database 기반
- 여러 사용자 동시 작업 가능
- 자동 저장
- 변경사항 즉시 반영

---

## 🚀 시작하기

### 1. 웹사이트 접속

```
https://demireykh-art.github.io/conference-scheduler-v2/
```

### 2. Google 로그인

- "Google로 로그인" 버튼 클릭
- Google 계정 선택
- 권한 승인

### 3. 새 행사 만들기

```
행사명: 2026 ASLS Spring Conference
국가/지역: 대한민국
시간대: Asia/Seoul (KST, UTC+9)
행사 유형: 학술대회 (Conference)
```

### 4. 스케줄러 진입

- "생성하기" 클릭
- 자동으로 스케줄러 화면으로 이동
- 준비 완료! 🎉

---

## 📖 사용 방법

### 연자 추가 (사진 포함)

1. **👥 연자** 탭 클릭
2. **➕ 연자 추가** 버튼
3. 사진 영역 클릭 → 파일 선택
4. 🔍+ / 🔍- 버튼으로 크기 조정
5. 이름, 소속, 연락처 입력
6. **저장** 클릭

### 강의 추가

1. **📚 강의** 탭 클릭
2. **➕ 강의 추가** 버튼
3. 강의 제목 입력
4. 연자 선택 (또는 **➕ 새 연자** 클릭)
5. 발표 시간 입력 (기본: 20분)
6. 스폰서 회사/제품명 입력 (선택)
7. 비스폰 강의인 경우 체크
8. **저장** 클릭

### 세션 추가

1. **🎯 세션** 탭 클릭
2. **➕ 세션 추가** 버튼
3. 세션명 입력 (예: Session #1)
4. 좌장 선택 (연자 목록에서)
5. 색상 선택
6. **저장** 클릭
7. 시작 시간 입력 (예: 09:00)

### Break 추가

1. **📅 스케줄** 탭에서
2. **☕ Break 추가** 버튼
3. 시간 입력 (예: 11:00)
4. 제목 입력 (예: Coffee Break & Clean up the Room)

### 강의 배치

**방법 1: 클릭 방식**
- 빈 칸(+) 클릭
- 강의 선택 모달에서 강의 선택

**방법 2: 드래그앤드롭** (향후 추가 예정)
- 강의 목록에서 드래그
- 스케줄 그리드에 드롭

**제거:**
- 배치된 강의를 더블클릭

### 시간 슬롯 설정

1. **⚙️ 설정** 탭 클릭
2. **시간 설정** 섹션
3. 시작 시간: `08:50`
4. 종료 시간: `18:00`
5. 간격: `20분`
6. **⚡ 시간 슬롯 자동 생성** 클릭

### Excel 내보내기

1. **📤 내보내기** 탭 클릭
2. **📊 Excel로 내보내기** 클릭
3. 파일 다운로드 완료
4. Excel에서 열어 확인

결과:
- 각 룸별 별도 시트
- Time, Title, Speaker, Moderator, Product, Sponsor 컬럼
- 엑셀에서 즉시 편집 가능

---

## 🛠️ 기술 스택

### Frontend
- **HTML5**: 시맨틱 마크업
- **CSS3**: 반응형 디자인, Flexbox, Grid
- **JavaScript (ES6+)**: 순수 JavaScript (프레임워크 없음)

### Backend & Database
- **Firebase Realtime Database**: 실시간 데이터 동기화
- **Firebase Authentication**: Google OAuth 2.0

### Hosting
- **GitHub Pages**: 정적 사이트 호스팅
- **Custom Domain 지원**: 가능

### Libraries
- **SheetJS (XLSX)**: Excel 파일 생성
- **jsPDF**: PDF 내보내기 (향후)

### Development Tools
- **Git**: 버전 관리
- **GitHub**: 코드 저장소
- **VS Code**: 개발 환경

---

## 📊 데이터 구조

### Firebase Realtime Database 구조

```javascript
/events
  /{eventId}
    /info
      - name: "2026 ASLS Spring Conference"
      - country: "KR"
      - timezone: "Asia/Seoul"
      - createdAt: 1234567890
      - createdBy: "user-uid"
      
    /data
      /speakers
        /{speakerId}
          - name: "홍길동"
          - affiliation: "서울대학교"
          - email: "hong@example.com"
          - phone: "010-1234-5678"
          - photo: "data:image/jpeg;base64,..."
      
      /lectures
        /{lectureId}
          - title: "Beyond Surgery..."
          - speakerId: "speaker_123"
          - duration: 20
          - sponsorCompany: "JSDR"
          - productName: "Juvegen"
          - isNonSponsored: false
      
      /sessions
        /{sessionId}
          - name: "Session #1"
          - chairId: "speaker_456"
          - color: "#dbeafe"
      
      /schedule
        /{time}-{room}
          - type: "lecture" | "session" | "break"
          - lectureId: "lecture_789"
          - sessionId: "session_012"
          - chairId: "speaker_456"
      
      /roomsConfig
        - rooms: ["Room A", "Room B"]
        - times: ["08:50", "09:00", "09:20", ...]
        - columns: ["Time", "Title", "Speaker", ...]
      
      /settings
        - defaultDuration: 20
        - timeInterval: 20

/users
  /{userId}
    /events
      /{eventId}
        - name: "2026 ASLS"
        - role: "owner"
        - lastAccessed: 1234567890
```

### 데이터 특징

- **행사별 독립성**: 각 행사는 완전히 분리된 데이터
- **실시간 동기화**: 모든 변경사항 즉시 반영
- **사용자 권한**: owner/editor/viewer (향후 확장)
- **확장성**: 무제한 행사/연자/강의 지원

---

## 📸 스크린샷

### 로비 (Event Lobby)
```
┌─────────────────────────────────┐
│  📅 Conference Scheduler V2.0   │
│  Global Multi-Event Platform    │
├─────────────────────────────────┤
│  내 행사 목록                    │
│  [➕ 새 행사 만들기]             │
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │ ASLS Tokyo              │    │
│  │ JP · Asia/Tokyo         │    │
│  │ 2026. 2. 22.            │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### 스케줄러 (Schedule View)
```
┌───────────────────────────────────────────────────┐
│ Time  │ Title              │ Speaker │ Moderator │
├───────┼────────────────────┼─────────┼───────────┤
│ 09:00 │ Beyond Surgery...  │ 홍길동   │           │
│ 09:20 │ Peptidomimetics!  │ 윤정현   │           │
│ 09:40 │ 제목미제출         │ 김학수   │ Dr. Basic │
└───────────────────────────────────────────────────┘
```

### 연자 카드 (Speaker Card)
```
┌─────────────────────────────┐
│  [📷]  홍길동                │
│        📍 서울대학교          │
│        📧 hong@example.com   │
│        [수정] [삭제]         │
└─────────────────────────────┘
```

---

## 🗺️ 로드맵

### ✅ Phase 1: 핵심 기능 (완료)
- [x] 다중 행사 관리
- [x] 연자 관리 (사진 포함)
- [x] 강의 관리
- [x] Excel 스타일 스케줄
- [x] 세션 관리
- [x] 설정 UI
- [x] Excel 내보내기

### 🔄 Phase 2: 고급 기능 (진행 중)
- [ ] 드래그앤드롭 강화
- [ ] PDF 내보내기 (한글 폰트)
- [ ] 강의 이동/복사
- [ ] 세션별 색상 자동 적용
- [ ] 좌장 충돌 감지

### 🔮 Phase 3: 협업 기능
- [ ] 다중 사용자 편집
- [ ] 실시간 커서 표시
- [ ] 변경 내역 추적
- [ ] 댓글/메모 기능
- [ ] 권한 관리 (owner/editor/viewer)

### 🌍 Phase 4: 글로벌 확장
- [ ] 다국어 지원 (EN/KR/JP/TH)
- [ ] 타임존 자동 변환
- [ ] 지역별 시간 형식
- [ ] 통화 단위 지원

### 📱 Phase 5: 모바일 최적화
- [ ] 터치 친화적 UI
- [ ] 스와이프 제스처
- [ ] Bottom Sheet
- [ ] 모바일 타임라인 뷰
- [ ] PWA (Progressive Web App)

---

## 🤝 기여하기

### 버그 제보

버그를 발견하셨나요? [Issues](https://github.com/demireykh-art/conference-scheduler-v2/issues)에서 제보해주세요.

**템플릿:**
```markdown
**버그 설명**
어떤 버그인가요?

**재현 방법**
1. 로그인
2. 행사 생성
3. ...

**예상 동작**
어떻게 작동해야 하나요?

**실제 동작**
어떻게 작동하나요?

**스크린샷**
가능하면 스크린샷을 첨부해주세요.

**환경**
- OS: [예: Windows 11]
- Browser: [예: Chrome 120]
```

### 기능 제안

새로운 기능 아이디어가 있으신가요? [Issues](https://github.com/demireykh-art/conference-scheduler-v2/issues)에서 제안해주세요.

### Pull Request

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 👏 감사의 말

### 사용된 오픈소스

- [Firebase](https://firebase.google.com/) - Google의 모바일/웹 플랫폼
- [SheetJS](https://sheetjs.com/) - JavaScript 스프레드시트 라이브러리
- [jsPDF](https://github.com/parallax/jsPDF) - JavaScript PDF 생성 라이브러리

### 영감을 준 프로젝트

- IMCAS (International Master Course on Aging Science)
- ASLS (Korean Aesthetic Surgery Society)

---

## 📞 문의

프로젝트 관련 문의사항이 있으신가요?

- **GitHub Issues**: [여기](https://github.com/demireykh-art/conference-scheduler-v2/issues)
- **Email**: demire.ykh@gmail.com

---

## 🌟 Star History

프로젝트가 마음에 드셨다면 ⭐️ Star를 눌러주세요!

---

<div align="center">

**Made with ❤️ for the global conference community**

[🏠 Homepage](https://demireykh-art.github.io/conference-scheduler-v2/) · 
[📖 Documentation](https://github.com/demireykh-art/conference-scheduler-v2/wiki) · 
[🐛 Report Bug](https://github.com/demireykh-art/conference-scheduler-v2/issues) · 
[✨ Request Feature](https://github.com/demireykh-art/conference-scheduler-v2/issues)

</div>
