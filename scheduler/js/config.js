/**
 * config.js - Firebase 및 앱 설정 (상용화 버전)
 * 
 * ⚠️ 중요: 모든 행사 관련 데이터는 Firebase에서 동적 로드
 * - 날짜, 룸, 시간, 카테고리, 연자, 회사 등 하드코딩 없음
 * - 초기 설정값만 정의 (Firebase에 데이터 없을 때 사용)
 */

window.AppConfig = {
    // ============================================
    // Firebase 설정 (V2 프로젝트)
    // ============================================
    firebase: {
        apiKey: "AIzaSyAayyRc9s9vnwd_KhaB8bDmaEfisKzxTyc",
        authDomain: "conference-scheduler2.firebaseapp.com",
        databaseURL: "https://conference-scheduler2-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "conference-scheduler2",
        storageBucket: "conference-scheduler2.firebasestorage.app",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    },

    // ============================================
    // 앱 설정 (고정값)
    // ============================================
    
    // 최초 관리자 이메일 (첫 사용자가 자동으로 admin)
    SUPER_ADMIN_EMAIL: null, // Firebase에서 설정 또는 첫 로그인 사용자
    
    // 세션 타임아웃 (2시간)
    SESSION_TIMEOUT: 2 * 60 * 60 * 1000,

    // 시간 설정
    TIME_UNIT: 5, // 5분 단위
    SPEAKER_TRANSFER_TIME: 10, // 연자 이동시간 (분)
    ROOM_TRANSFER_TIME: 10, // 룸 이동 시간 (분)

    // Undo 최대 횟수
    MAX_UNDO: 10,

    // ============================================
    // 동적 로드 데이터 (Firebase에서 로드, 기본값은 빈 배열/객체)
    // ============================================
    
    // 행사 날짜 목록 - Firebase /events/{eventId}/settings/dates에서 로드
    CONFERENCE_DATES: [],
    
    // 날짜별 룸 설정 - Firebase /events/{eventId}/settings/roomsByDate에서 로드
    ROOMS_BY_DATE: {},
    
    // 날짜별 시간 설정 - Firebase /events/{eventId}/settings/timeSettings에서 로드
    DEFAULT_TIME_SETTINGS: {},

    // ============================================
    // 카테고리 설정 (기본 템플릿 - 행사 생성 시 복사됨)
    // ============================================
    DEFAULT_CATEGORY_GROUPS: [
        ['Coffee Break', 'Opening/Closing', 'Luncheon'],
        ['Injectables', 'Laser & EBDs', 'Bio-Stimulators'],
        ['Aesthetic Devices', 'Lifting Devices', 'Body Contouring'],
        ['Regeneratives', 'Threads', 'Dermatology'],
        ['Hair', 'Stem Cell & Functional', 'Anatomy'],
        ['Diagnostic Devices', 'Sedation & Analgesia Devices', 'Medical Supplies'],
        ['International Faculty & Global Trends', 'ASLS', 'Management & Marketing'],
        ['AI & CRM', 'Digital Solutions', 'Cosmeceuticals'],
        ['Consumables', 'Safety Equipment', 'Others'],
        ['Other Solutions']
    ],

    DEFAULT_CATEGORY_COLORS: {
        'Coffee Break': '#795548',
        'Lunch': '#5D4037',
        'Opening/Closing': '#37474F',
        'Panel Discussion': '#424242',
        'Luncheon': '#FF8F00',
        'Injectables': '#E65100',
        'Laser & EBDs': '#1565C0',
        'Bio-Stimulators': '#EF6C00',
        'Aesthetic Devices': '#1976D2',
        'Lifting Devices': '#7B1FA2',
        'Body Contouring': '#00897B',
        'Regeneratives': '#F57C00',
        'Threads': '#6A1B9A',
        'Dermatology': '#C2185B',
        'Hair': '#00796B',
        'Stem Cell & Functional': '#D81B60',
        'Anatomy': '#AD1457',
        'Diagnostic Devices': '#0277BD',
        'Sedation & Analgesia Devices': '#558B2F',
        'Medical Supplies': '#9E9D24',
        'International Faculty & Global Trends': '#5E35B1',
        'ASLS': '#8E24AA',
        'Management & Marketing': '#455A64',
        'AI & CRM': '#546E7A',
        'Digital Solutions': '#607D8B',
        'Cosmeceuticals': '#F9A825',
        'Consumables': '#FBC02D',
        'Safety Equipment': '#AFB42B',
        'Others': '#757575',
        'Other Solutions': '#9E9E9E'
    },

    // 현재 행사에서 사용하는 카테고리 (Firebase에서 로드)
    categoryGroups: [],
    categoryColors: {},

    // Break 타입 정의 (중복 배치 가능)
    BREAK_TYPES: ['Coffee Break', 'Lunch', 'Opening/Closing', 'Panel Discussion'],

    // ============================================
    // 앱 버전 정보
    // ============================================
    VERSION: '2.0.0',
    BUILD_DATE: '2026-02-24',
    
    // ============================================
    // 멀티 행사 관련
    // ============================================
    currentEventId: null,  // 현재 선택된 행사 ID
    currentEventName: null // 현재 선택된 행사 이름
};

// ============================================
// Firebase 초기화
// ============================================
firebase.initializeApp(window.AppConfig.firebase);
window.auth = firebase.auth();
window.database = firebase.database();

// ============================================
// Firebase 경로 헬퍼 함수
// ============================================

/**
 * 현재 행사의 Firebase 경로 반환
 * @param {string} subPath - 하위 경로 (예: 'data/speakers')
 * @returns {string} 전체 경로
 */
window.eventPath = function(subPath) {
    const eventId = AppConfig.currentEventId;
    if (!eventId) {
        console.error('❌ 행사가 선택되지 않았습니다.');
        return null;
    }
    return `/events/${eventId}/${subPath}`;
};

/**
 * 현재 행사의 Firebase Reference 반환
 * @param {string} subPath - 하위 경로
 * @returns {firebase.database.Reference}
 */
window.eventRef = function(subPath) {
    const path = eventPath(subPath);
    return path ? database.ref(path) : null;
};

/**
 * 행사 목록 경로
 */
window.eventListRef = function() {
    return database.ref('/eventList');
};

console.log('✅ config.js 로드 완료 (V2 상용화 버전)');
