/**
 * Firebase V2.0 Configuration
 * 
 * 주의: 이 파일의 설정은 V1과 완전히 분리된 새 Firebase 프로젝트를 사용합니다.
 * V1 시스템의 안정성을 위해 별도의 프로젝트를 생성하세요.
 */

// V2 Firebase Configuration
const firebaseConfigV2 = {
  apiKey: "AIzaSyDw-hivDT9T-Iq3s3kiuTRqaumicSoWdcU",
  authDomain: "scheduler2-99724.firebaseapp.com",
  databaseURL: "https://scheduler2-99724-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "scheduler2-99724",
  storageBucket: "scheduler2-99724.firebasestorage.app",
  messagingSenderId: "1023522399376",
  appId: "1:1023522399376:web:201a526635a7058917e415"
};

/**
 * Firebase 초기화
 */
function initializeFirebase() {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfigV2);
    console.log('[Firebase] V2 초기화 완료');
  }
  
  // Realtime Database 설정
  const db = firebase.database();
  
  // 오프라인 지속성 활성화
  db.goOnline();
  
  // 연결 상태 모니터링
  const connectedRef = db.ref('.info/connected');
  connectedRef.on('value', (snap) => {
    if (snap.val() === true) {
      console.log('[Firebase] 연결됨');
      updateConnectionStatus(true);
    } else {
      console.log('[Firebase] 연결 끊김');
      updateConnectionStatus(false);
    }
  });
}

/**
 * 연결 상태 UI 업데이트
 */
function updateConnectionStatus(isConnected) {
  const syncStatus = document.getElementById('syncStatus');
  if (!syncStatus) return;
  
  if (isConnected) {
    syncStatus.classList.remove('offline');
    syncStatus.classList.add('online');
  } else {
    syncStatus.classList.remove('online');
    syncStatus.classList.add('offline');
    document.getElementById('syncText').textContent = '오프라인';
  }
}

/**
 * Firebase Database 참조 헬퍼
 */
const FirebaseRefs = {
  // 이벤트 기본 정보
  eventInfo(eventId) {
    return firebase.database().ref(`/events/${eventId}/info`);
  },
  
  // 이벤트 데이터
  eventData(eventId) {
    return firebase.database().ref(`/events/${eventId}/data`);
  },
  
  // 연자 데이터
  speakers(eventId) {
    return firebase.database().ref(`/events/${eventId}/data/speakers`);
  },
  
  // 강의 데이터
  lectures(eventId) {
    return firebase.database().ref(`/events/${eventId}/data/lectures`);
  },
  
  // 스케줄 데이터
  schedule(eventId) {
    return firebase.database().ref(`/events/${eventId}/data/schedule`);
  },
  
  // 세션 데이터
  sessions(eventId) {
    return firebase.database().ref(`/events/${eventId}/data/sessions`);
  },
  
  // 좌장 데이터
  chairs(eventId) {
    return firebase.database().ref(`/events/${eventId}/data/chairs`);
  },
  
  // 룸 설정
  roomsConfig(eventId) {
    return firebase.database().ref(`/events/${eventId}/data/roomsConfig`);
  },
  
  // 실시간 협업 - Presence
  presence(eventId, userId) {
    return firebase.database().ref(`/events/${eventId}/presence/${userId}`);
  },
  
  // 실시간 협업 - Locks
  locks(eventId) {
    return firebase.database().ref(`/events/${eventId}/locks`);
  },
  
  // 사용자의 이벤트 목록
  userEvents(userId) {
    return firebase.database().ref(`/users/${userId}/events`);
  },
  
  // 전체 이벤트 리스트 (관리자용)
  allEvents() {
    return firebase.database().ref('/events');
  }
};

/**
 * 환경별 설정
 */
const Environment = {
  isDevelopment: window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1',
  
  isProduction: window.location.hostname.includes('github.io'),
  
  // 로깅 레벨
  logLevel: window.location.hostname === 'localhost' ? 'debug' : 'error'
};

/**
 * 디버그 로거
 */
function debugLog(message, data = null) {
  if (Environment.logLevel === 'debug') {
    console.log(`[Debug] ${message}`, data || '');
  }
}

/**
 * 에러 로거
 */
function errorLog(message, error = null) {
  console.error(`[Error] ${message}`, error || '');
  
  // 프로덕션 환경에서는 에러 추적 서비스로 전송 가능
  if (Environment.isProduction && error) {
    // Sentry, LogRocket 등 연동 가능
  }
}