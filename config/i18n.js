/**
 * Internationalization (i18n) Configuration
 * 
 * 글로벌 확장을 위한 다국어 지원
 * 지원 언어: 한국어, 영어, 일본어, 태국어
 */

const i18n = {
  // 현재 언어
  currentLocale: 'ko',

  // 지원 언어 목록
  supportedLocales: {
    ko: { name: '한국어', flag: '🇰🇷', direction: 'ltr' },
    en: { name: 'English', flag: '🇺🇸', direction: 'ltr' },
    ja: { name: '日本語', flag: '🇯🇵', direction: 'ltr' },
    th: { name: 'ไทย', flag: '🇹🇭', direction: 'ltr' }
  },

  // 번역 데이터
  translations: {
    ko: {
      // 공통
      common: {
        save: '저장',
        cancel: '취소',
        delete: '삭제',
        edit: '수정',
        add: '추가',
        search: '검색',
        export: '내보내기',
        import: '가져오기',
        loading: '로딩 중...',
        success: '성공',
        error: '오류',
        warning: '경고',
        confirm: '확인',
        yes: '예',
        no: '아니오'
      },

      // 행사 로비
      lobby: {
        title: '행사 로비',
        myEvents: '내 행사 목록',
        createEvent: '새 행사 만들기',
        noEvents: '생성된 행사가 없습니다',
        eventName: '행사명',
        country: '국가/지역',
        timezone: '시간대',
        eventType: '행사 유형',
        description: '설명'
      },

      // 스케줄러
      scheduler: {
        schedule: '스케줄',
        lectures: '강의 목록',
        speakers: '연자 관리',
        sessions: '세션 관리',
        addSession: '세션 추가',
        configureRooms: '룸 설정',
        conflictCheck: '충돌 검사',
        viewAll: '전체 보기'
      },

      // 강의
      lecture: {
        title: '강의 제목',
        speaker: '연자',
        duration: '진행 시간',
        type: '유형',
        addLecture: '강의 추가',
        editLecture: '강의 수정',
        deleteLecture: '강의 삭제'
      },

      // 연자
      speaker: {
        name: '이름',
        nameEn: '영문 이름',
        affiliation: '소속',
        country: '국가',
        email: '이메일',
        phone: '전화번호',
        addSpeaker: '연자 추가',
        editSpeaker: '연자 수정'
      },

      // 메시지
      messages: {
        saveSuccess: '저장되었습니다',
        saveError: '저장 중 오류가 발생했습니다',
        deleteConfirm: '정말 삭제하시겠습니까?',
        unsavedChanges: '저장하지 않은 변경사항이 있습니다',
        loginRequired: '로그인이 필요합니다',
        accessDenied: '접근 권한이 없습니다'
      }
    },

    en: {
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        export: 'Export',
        import: 'Import',
        loading: 'Loading...',
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        confirm: 'Confirm',
        yes: 'Yes',
        no: 'No'
      },

      lobby: {
        title: 'Event Lobby',
        myEvents: 'My Events',
        createEvent: 'Create New Event',
        noEvents: 'No events created',
        eventName: 'Event Name',
        country: 'Country/Region',
        timezone: 'Time Zone',
        eventType: 'Event Type',
        description: 'Description'
      },

      scheduler: {
        schedule: 'Schedule',
        lectures: 'Lectures',
        speakers: 'Speakers',
        sessions: 'Sessions',
        addSession: 'Add Session',
        configureRooms: 'Configure Rooms',
        conflictCheck: 'Check Conflicts',
        viewAll: 'View All'
      },

      lecture: {
        title: 'Lecture Title',
        speaker: 'Speaker',
        duration: 'Duration',
        type: 'Type',
        addLecture: 'Add Lecture',
        editLecture: 'Edit Lecture',
        deleteLecture: 'Delete Lecture'
      },

      speaker: {
        name: 'Name',
        nameEn: 'English Name',
        affiliation: 'Affiliation',
        country: 'Country',
        email: 'Email',
        phone: 'Phone',
        addSpeaker: 'Add Speaker',
        editSpeaker: 'Edit Speaker'
      },

      messages: {
        saveSuccess: 'Saved successfully',
        saveError: 'Error occurred while saving',
        deleteConfirm: 'Are you sure you want to delete?',
        unsavedChanges: 'You have unsaved changes',
        loginRequired: 'Login required',
        accessDenied: 'Access denied'
      }
    },

    ja: {
      common: {
        save: '保存',
        cancel: 'キャンセル',
        delete: '削除',
        edit: '編集',
        add: '追加',
        search: '検索',
        export: 'エクスポート',
        import: 'インポート',
        loading: '読み込み中...',
        success: '成功',
        error: 'エラー',
        warning: '警告',
        confirm: '確認',
        yes: 'はい',
        no: 'いいえ'
      },

      lobby: {
        title: 'イベントロビー',
        myEvents: 'マイイベント',
        createEvent: '新しいイベントを作成',
        noEvents: 'イベントが作成されていません',
        eventName: 'イベント名',
        country: '国/地域',
        timezone: 'タイムゾーン',
        eventType: 'イベントタイプ',
        description: '説明'
      },

      scheduler: {
        schedule: 'スケジュール',
        lectures: '講演リスト',
        speakers: '講演者管理',
        sessions: 'セッション管理',
        addSession: 'セッション追加',
        configureRooms: '会場設定',
        conflictCheck: '競合チェック',
        viewAll: 'すべて表示'
      },

      lecture: {
        title: '講演タイトル',
        speaker: '講演者',
        duration: '所要時間',
        type: 'タイプ',
        addLecture: '講演追加',
        editLecture: '講演編集',
        deleteLecture: '講演削除'
      },

      speaker: {
        name: '氏名',
        nameEn: '英語名',
        affiliation: '所属',
        country: '国',
        email: 'メール',
        phone: '電話番号',
        addSpeaker: '講演者追加',
        editSpeaker: '講演者編集'
      },

      messages: {
        saveSuccess: '保存されました',
        saveError: '保存中にエラーが発生しました',
        deleteConfirm: '本当に削除しますか？',
        unsavedChanges: '保存されていない変更があります',
        loginRequired: 'ログインが必要です',
        accessDenied: 'アクセスが拒否されました'
      }
    },

    th: {
      common: {
        save: 'บันทึก',
        cancel: 'ยกเลิก',
        delete: 'ลบ',
        edit: 'แก้ไข',
        add: 'เพิ่ม',
        search: 'ค้นหา',
        export: 'ส่งออก',
        import: 'นำเข้า',
        loading: 'กำลังโหลด...',
        success: 'สำเร็จ',
        error: 'ข้อผิดพลาด',
        warning: 'คำเตือน',
        confirm: 'ยืนยัน',
        yes: 'ใช่',
        no: 'ไม่ใช่'
      },

      lobby: {
        title: 'ล็อบบี้งาน',
        myEvents: 'งานของฉัน',
        createEvent: 'สร้างงานใหม่',
        noEvents: 'ยังไม่มีงานที่สร้าง',
        eventName: 'ชื่องาน',
        country: 'ประเทศ/ภูมิภาค',
        timezone: 'เขตเวลา',
        eventType: 'ประเภทงาน',
        description: 'คำอธิบาย'
      },

      scheduler: {
        schedule: 'ตารางเวลา',
        lectures: 'รายการบรรยาย',
        speakers: 'จัดการวิทยากร',
        sessions: 'จัดการเซสชัน',
        addSession: 'เพิ่มเซสชัน',
        configureRooms: 'ตั้งค่าห้อง',
        conflictCheck: 'ตรวจสอบความขัดแย้ง',
        viewAll: 'ดูทั้งหมด'
      },

      lecture: {
        title: 'หัวข้อบรรยาย',
        speaker: 'วิทยากร',
        duration: 'ระยะเวลา',
        type: 'ประเภท',
        addLecture: 'เพิ่มบรรยาย',
        editLecture: 'แก้ไขบรรยาย',
        deleteLecture: 'ลบบรรยาย'
      },

      speaker: {
        name: 'ชื่อ',
        nameEn: 'ชื่อภาษาอังกฤษ',
        affiliation: 'สังกัด',
        country: 'ประเทศ',
        email: 'อีเมล',
        phone: 'โทรศัพท์',
        addSpeaker: 'เพิ่มวิทยากร',
        editSpeaker: 'แก้ไขวิทยากร'
      },

      messages: {
        saveSuccess: 'บันทึกสำเร็จ',
        saveError: 'เกิดข้อผิดพลาดในการบันทึก',
        deleteConfirm: 'คุณแน่ใจหรือไม่ว่าต้องการลบ?',
        unsavedChanges: 'คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
        loginRequired: 'ต้องเข้าสู่ระบบ',
        accessDenied: 'ไม่อนุญาตให้เข้าถึง'
      }
    }
  },

  /**
   * 언어 설정
   */
  setLocale(locale) {
    if (this.supportedLocales[locale]) {
      this.currentLocale = locale;
      localStorage.setItem('preferredLocale', locale);
      this.updatePageDirection();
      return true;
    }
    return false;
  },

  /**
   * 번역 가져오기
   */
  t(key, locale = null) {
    const lang = locale || this.currentLocale;
    const keys = key.split('.');
    
    let value = this.translations[lang];
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        break;
      }
    }

    return value || key;
  },

  /**
   * 페이지 방향 업데이트 (RTL/LTR)
   */
  updatePageDirection() {
    const direction = this.supportedLocales[this.currentLocale].direction;
    document.documentElement.setAttribute('dir', direction);
  },

  /**
   * 국가별 폰트 설정
   */
  getFontFamily(locale = null) {
    const lang = locale || this.currentLocale;
    
    const fontMap = {
      ko: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
      en: "'Roboto', 'Arial', sans-serif",
      ja: "'Noto Sans JP', 'Yu Gothic', sans-serif",
      th: "'Noto Sans Thai', 'Leelawadee', sans-serif"
    };

    return fontMap[lang] || fontMap.en;
  },

  /**
   * PDF 출력용 폰트 URL
   */
  getPDFFont(locale = null) {
    const lang = locale || this.currentLocale;
    
    const fontUrls = {
      ko: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap',
      en: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap',
      ja: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap',
      th: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700&display=swap'
    };

    return fontUrls[lang] || fontUrls.en;
  },

  /**
   * 언어 감지 (국가 코드 기반)
   */
  detectLocaleFromCountry(countryCode) {
    const localeMap = {
      KR: 'ko',
      JP: 'ja',
      TH: 'th',
      US: 'en',
      GB: 'en',
      SG: 'en',
      MY: 'en',
      PH: 'en',
      ID: 'en',
      VN: 'en'
    };

    return localeMap[countryCode] || 'en';
  },

  /**
   * 초기화
   */
  init() {
    // 저장된 언어 설정 로드
    const savedLocale = localStorage.getItem('preferredLocale');
    if (savedLocale && this.supportedLocales[savedLocale]) {
      this.setLocale(savedLocale);
    } else {
      // 브라우저 언어 감지
      const browserLang = navigator.language.split('-')[0];
      if (this.supportedLocales[browserLang]) {
        this.setLocale(browserLang);
      }
    }

    this.updatePageDirection();
  }
};

// 초기화
i18n.init();

// 전역 접근
window.i18n = i18n;
