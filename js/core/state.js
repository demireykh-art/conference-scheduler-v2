/**
 * Application State Management V2.0
 * 
 * Multi-Event Architecture 기반 상태 관리
 * 모든 데이터는 eventId를 통해 분리됩니다.
 */

const AppState = {
  // ==================== V2 신규 속성 ====================
  
  /**
   * 현재 선택된 행사 ID
   */
  currentEventId: null,

  /**
   * 현재 행사 정보
   */
  eventInfo: {
    name: '',
    country: '',
    timezone: 'Asia/Seoul',
    type: 'conference',
    description: '',
    createdAt: null,
    createdBy: null,
    owner: null,
    lastModified: null
  },

  /**
   * 실시간 협업 상태
   */
  presence: {
    // 현재 접속 중인 사용자들
    users: new Map(), // userId -> { name, email, connectedAt, color }
    
    // 편집 중인 셀/모달 Lock
    locks: new Map(), // lockId -> { userId, userName, timestamp, type, target }
    
    // 내 Lock
    myLocks: new Set()
  },

  // ==================== 기존 V1 속성 (유지) ====================

  /**
   * 연자 데이터
   * Map<speakerId, Speaker>
   */
  speakers: new Map(),

  /**
   * 강의 데이터
   * Map<lectureId, Lecture>
   */
  lectures: new Map(),

  /**
   * 스케줄 데이터
   * Map<scheduleKey, ScheduleItem>
   * scheduleKey format: "time-room" (예: "09:00-Room A")
   */
  schedule: new Map(),

  /**
   * 세션 정보
   * Array<Session>
   */
  sessions: [],

  /**
   * 좌장 데이터
   * Map<sessionId, Chair>
   */
  chairs: new Map(),

  /**
   * 스폰서 데이터
   * Array<Sponsor>
   */
  sponsors: [],

  /**
   * 룸 설정
   */
  roomsConfig: {
    rooms: [],           // 룸 목록
    timeSlots: [],       // 시간 슬롯
    sessionRooms: {},    // 세션별 룸 매핑
    roomColors: {},      // 룸별 색상
    kmaRooms: []         // KMA 제출 룸 목록
  },

  /**
   * 사용자 정보
   */
  user: null,

  /**
   * UI 상태
   */
  ui: {
    currentView: 'schedule',
    selectedSession: null,
    zoomLevel: 1.0,
    isMobileView: false,
    isTimelineView: false
  },

  /**
   * 데이터 동기화 상태
   */
  sync: {
    isDirty: false,           // 저장되지 않은 변경사항 여부
    lastSyncTime: null,       // 마지막 동기화 시간
    isSyncing: false,         // 동기화 진행 중
    isConnected: true,        // Firebase 연결 상태
    pendingChanges: []        // 대기 중인 변경사항
  },

  // ==================== 데이터 무결성 보호 ====================

  /**
   * 데이터 변경 전 스냅샷 (복원용)
   */
  snapshot: {
    speakers: null,
    lectures: null,
    schedule: null
  },

  /**
   * 스냅샷 생성
   */
  createSnapshot() {
    this.snapshot.speakers = new Map(this.speakers);
    this.snapshot.lectures = new Map(this.lectures);
    this.snapshot.schedule = new Map(this.schedule);
    
    console.log('[Snapshot] 데이터 스냅샷 생성');
  },

  /**
   * 스냅샷에서 복원
   */
  restoreFromSnapshot() {
    if (this.snapshot.speakers) {
      this.speakers = new Map(this.snapshot.speakers);
      this.lectures = new Map(this.snapshot.lectures);
      this.schedule = new Map(this.snapshot.schedule);
      
      console.log('[Snapshot] 데이터 복원 완료');
      return true;
    }
    return false;
  },

  /**
   * 데이터 검증
   */
  validateData() {
    const errors = [];

    // 연자 수 검증
    if (this.speakers.size < 10) {
      errors.push(`연자 수 이상: ${this.speakers.size}명 (최소 10명 필요)`);
    }

    // 강의 수 검증
    if (this.lectures.size < 10) {
      errors.push(`강의 수 이상: ${this.lectures.size}개 (최소 10개 필요)`);
    }

    // 스케줄 중복 검증
    const lectureIds = new Set();
    const duplicates = [];
    
    for (const [key, item] of this.schedule) {
      if (item.type !== 'break' && item.id) {
        if (lectureIds.has(item.id)) {
          duplicates.push(item.id);
        }
        lectureIds.add(item.id);
      }
    }

    if (duplicates.length > 0) {
      errors.push(`중복 강의 발견: ${duplicates.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // ==================== 데이터 변환 유틸리티 ====================

  /**
   * Map을 객체로 변환 (Firebase 저장용)
   */
  toFirebaseObject() {
    return {
      speakers: Object.fromEntries(this.speakers),
      lectures: Object.fromEntries(this.lectures),
      schedule: Object.fromEntries(this.schedule),
      sessions: this.sessions,
      chairs: Object.fromEntries(this.chairs),
      sponsors: this.sponsors,
      roomsConfig: this.roomsConfig
    };
  },

  /**
   * Firebase 객체를 Map으로 변환
   */
  fromFirebaseObject(data) {
    if (data.speakers) {
      this.speakers = new Map(Object.entries(data.speakers));
    }
    if (data.lectures) {
      this.lectures = new Map(Object.entries(data.lectures));
    }
    if (data.schedule) {
      this.schedule = new Map(Object.entries(data.schedule));
    }
    if (data.sessions) {
      this.sessions = data.sessions;
    }
    if (data.chairs) {
      this.chairs = new Map(Object.entries(data.chairs));
    }
    if (data.sponsors) {
      this.sponsors = data.sponsors;
    }
    if (data.roomsConfig) {
      this.roomsConfig = data.roomsConfig;
    }
  },

  // ==================== 초기화 및 리셋 ====================

  /**
   * 상태 초기화
   */
  reset() {
    this.speakers.clear();
    this.lectures.clear();
    this.schedule.clear();
    this.sessions = [];
    this.chairs.clear();
    this.sponsors = [];
    this.roomsConfig = {
      rooms: [],
      timeSlots: [],
      sessionRooms: {},
      roomColors: {},
      kmaRooms: []
    };
    this.sync.isDirty = false;
    this.sync.lastSyncTime = null;
    
    console.log('[AppState] 상태 초기화 완료');
  },

  /**
   * 행사 전환 시 상태 초기화
   */
  switchEvent(eventId) {
    this.reset();
    this.currentEventId = eventId;
    this.presence.users.clear();
    this.presence.locks.clear();
    this.presence.myLocks.clear();
    
    console.log(`[AppState] 행사 전환: ${eventId}`);
  },

  // ==================== 통계 및 분석 ====================

  /**
   * 데이터 통계
   */
  getStatistics() {
    return {
      speakers: this.speakers.size,
      lectures: this.lectures.size,
      scheduledLectures: Array.from(this.schedule.values())
        .filter(item => item.type !== 'break').length,
      sessions: this.sessions.length,
      rooms: this.roomsConfig.rooms.length,
      sponsors: this.sponsors.length
    };
  },

  /**
   * 연자별 강의 수 계산
   */
  getSpeakerLectureCount() {
    const counts = new Map();

    for (const lecture of this.lectures.values()) {
      const speakerId = lecture.speakerId;
      counts.set(speakerId, (counts.get(speakerId) || 0) + 1);
    }

    return counts;
  },

  /**
   * 룸별 강의 수 계산
   */
  getRoomLectureCount() {
    const counts = new Map();

    for (const [key, item] of this.schedule) {
      if (item.type !== 'break') {
        const room = key.split('-')[1];
        counts.set(room, (counts.get(room) || 0) + 1);
      }
    }

    return counts;
  },

  // ==================== 디버깅 ====================

  /**
   * 현재 상태 로깅
   */
  logState() {
    console.group('[AppState] 현재 상태');
    console.log('Event ID:', this.currentEventId);
    console.log('Event Info:', this.eventInfo);
    console.log('Statistics:', this.getStatistics());
    console.log('Speakers:', this.speakers.size);
    console.log('Lectures:', this.lectures.size);
    console.log('Schedule:', this.schedule.size);
    console.log('Presence:', {
      users: this.presence.users.size,
      locks: this.presence.locks.size
    });
    console.log('Sync:', this.sync);
    console.groupEnd();
  }
};

// 전역 접근
window.AppState = AppState;
