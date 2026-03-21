/**
 * app.js - 앱 초기화 및 Firebase 동기화 (상용화 버전)
 * 
 * ⚠️ 하드코딩 완전 제거
 * - 연자, 회사, 날짜, 룸, 시간 설정 모두 Firebase에서 동적 로드
 * - 멀티 행사 지원 (Event Lobby)
 */

(function() {
    'use strict';

    // ============================================
    // 앱 초기화
    // ============================================
    
    /**
     * 앱 시작점
     */
    window.initApp = async function() {
        console.log('🚀 Conference Scheduler V2 시작...');
        
        try {
            showLoading('앱 초기화 중...');
            
            // 1. 인증 상태 확인
            await checkAuthState();
            
            // 2. 로그인되어 있으면 행사 자동 선택 시도
            if (AppState.currentUser) {
                const autoSelected = await autoSelectLastEvent();
                
                if (!autoSelected) {
                    // 행사가 없으면 Event Lobby 표시
                    showEventLobby();
                }
            }
            
            hideLoading();
            AppState.isInitialized = true;
            console.log('✅ 앱 초기화 완료');
            
        } catch (error) {
            console.error('❌ 앱 초기화 실패:', error);
            hideLoading();
            Toast.error('앱 초기화에 실패했습니다: ' + error.message);
        }
    };
    
    /**
     * 인증 상태 확인
     */
    async function checkAuthState() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    AppState.currentUser = user;
                    console.log('👤 로그인됨:', user.email);
                    
                    // 사용자 역할 로드
                    await loadUserRole(user.uid);
                    
                    // UI 업데이트
                    updateAuthUI();
                    
                } else {
                    AppState.currentUser = null;
                    AppState.currentUserRole = null;
                    console.log('👤 로그인 필요');
                    
                    // 로그인 UI 표시
                    showLoginUI();
                }
                resolve();
            });
        });
    }
    
    /**
     * 사용자 역할 로드
     */
    async function loadUserRole(uid) {
        if (!AppConfig.currentEventId) {
            // 행사가 선택되지 않은 경우 기본 admin (첫 사용자)
            AppState.currentUserRole = 'admin';
            return;
        }
        
        try {
            const memberRef = database.ref(`/eventList/${AppConfig.currentEventId}/members/${uid}`);
            const snapshot = await memberRef.once('value');
            AppState.currentUserRole = snapshot.val() || 'pending';
            
            console.log('👤 역할:', AppState.currentUserRole);
        } catch (error) {
            console.error('역할 로드 실패:', error);
            AppState.currentUserRole = 'pending';
        }
    }
    
    /**
     * 로그인 UI 표시
     */
    function showLoginUI() {
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) {
            loginOverlay.classList.remove('hidden');
        }
    }
    
    /**
     * 인증 UI 업데이트
     */
    function updateAuthUI() {
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) {
            loginOverlay.classList.add('hidden');
        }
        
        // 사용자 정보 표시
        const userInfo = document.getElementById('userInfo');
        if (userInfo && AppState.currentUser) {
            userInfo.textContent = AppState.currentUser.email;
        }
        
        // 역할에 따른 UI 제어
        updateUIByRole();
    }
    
    /**
     * 역할에 따른 UI 제어
     */
    function updateUIByRole() {
        const isEditable = canEdit();
        
        // 편집 불가능한 요소들 비활성화
        document.querySelectorAll('.edit-only').forEach(el => {
            el.style.display = isEditable ? '' : 'none';
        });
        
        // 관리자 전용 요소
        const isAdminUser = isAdmin();
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdminUser ? '' : 'none';
        });
    }

    // ============================================
    // 행사 데이터 로드 후 초기화
    // ============================================
    
    /**
     * 행사 선택 후 전체 데이터 초기화
     */
    window.initializeAfterEventLoad = async function() {
        if (!AppConfig.currentEventId) {
            console.warn('⚠️ 행사가 선택되지 않았습니다.');
            return;
        }
        
        showLoading('행사 데이터 로딩 중...');
        
        try {
            // 설정 데이터 로드
            await loadEventSettings();
            
            // 마스터 데이터 로드
            await loadMasterData();
            
            // 현재 날짜 데이터 로드
            await loadCurrentDateData();
            
            // UI 초기화
            initializeUI();
            
            // 실시간 리스너 시작
            startRealtimeListeners();
            
            hideLoading();
            
        } catch (error) {
            console.error('❌ 행사 데이터 로드 실패:', error);
            hideLoading();
            Toast.error('데이터 로드 실패: ' + error.message);
        }
    };
    
    /**
     * 행사 설정 로드
     */
    async function loadEventSettings() {
        const settingsRef = eventRef('settings');
        if (!settingsRef) return;
        
        const snapshot = await settingsRef.once('value');
        const settings = snapshot.val() || {};
        
        // 날짜 설정
        AppState.eventDates = settings.dates || [];
        AppConfig.CONFERENCE_DATES = AppState.eventDates;
        
        // 룸 설정
        AppConfig.ROOMS_BY_DATE = settings.roomsByDate || {};
        
        // 시간 설정
        AppState.timeSettingsByDate = settings.timeSettings || {};
        AppConfig.DEFAULT_TIME_SETTINGS = AppState.timeSettingsByDate;
        
        // 카테고리 설정
        AppConfig.categoryGroups = settings.categoryGroups || AppConfig.DEFAULT_CATEGORY_GROUPS;
        AppConfig.categoryColors = settings.categoryColors || AppConfig.DEFAULT_CATEGORY_COLORS;
        AppState.categories = Object.keys(AppConfig.categoryColors);
        
        // KMA 룸 설정
        AppState.kmaRooms = settings.kmaRooms || {};
        
        // 첫 번째 날짜 선택
        if (AppState.eventDates.length > 0 && !AppState.currentDate) {
            AppState.currentDate = AppState.eventDates[0].date;
        }
        
        // 현재 날짜의 룸 설정
        if (AppState.currentDate) {
            AppState.rooms = AppConfig.ROOMS_BY_DATE[AppState.currentDate] || [];
        }
        
        console.log('✅ 행사 설정 로드 완료');
    }
    
    /**
     * 마스터 데이터 로드 (연자, 회사)
     */
    async function loadMasterData() {
        const dataRef = eventRef('data');
        if (!dataRef) return;
        
        // 연자 로드
        const speakersSnapshot = await dataRef.child('speakers').once('value');
        AppState.speakers = speakersSnapshot.val() || [];
        console.log(`📋 연자 ${AppState.speakers.length}명 로드`);
        
        // 회사 로드
        const companiesSnapshot = await dataRef.child('companies').once('value');
        AppState.companies = companiesSnapshot.val() || [];
        console.log(`🏢 업체 ${AppState.companies.length}개 로드`);
    }
    
    /**
     * 현재 날짜 데이터 로드
     */
    async function loadCurrentDateData() {
        if (!AppState.currentDate) return;
        
        const dateDataRef = eventRef(`data/dataByDate/${AppState.currentDate}`);
        if (!dateDataRef) return;
        
        const snapshot = await dateDataRef.once('value');
        const dateData = snapshot.val() || {};
        
        // 날짜별 데이터 저장
        AppState.dataByDate[AppState.currentDate] = {
            lectures: dateData.lectures || [],
            schedule: dateData.schedule || {},
            sessions: dateData.sessions || []
        };
        
        // 현재 작업 데이터 설정
        loadDateData(AppState.currentDate);
        
        // 시간 슬롯 생성
        generateTimeSlots();
        
        console.log(`📅 ${AppState.currentDate} 데이터 로드: 강의 ${AppState.lectures.length}개`);
    }
    
    /**
     * UI 초기화
     */
    function initializeUI() {
        // 날짜 버튼
        if (typeof updateDateButtons === 'function') {
            updateDateButtons();
        }
        
        // 룸 탭
        if (typeof createRoomTabs === 'function') {
            createRoomTabs();
        }
        
        // 시간표
        if (typeof createScheduleTable === 'function') {
            createScheduleTable();
        }
        
        // 스케줄 디스플레이
        if (typeof updateScheduleDisplay === 'function') {
            updateScheduleDisplay();
        }
        
        // 강의 목록
        if (typeof updateLectureList === 'function') {
            updateLectureList();
        }
        
        // 행사 헤더
        if (typeof updateEventHeader === 'function') {
            updateEventHeader();
        }
        
        // 역할별 UI
        updateUIByRole();
    }

    // ============================================
    // 실시간 리스너
    // ============================================
    
    let listeners = {};
    
    /**
     * 실시간 리스너 시작
     */
    window.startRealtimeListeners = function() {
        if (!AppConfig.currentEventId || !AppState.currentDate) return;
        
        // 기존 리스너 해제
        stopRealtimeListeners();
        
        const dateDataPath = eventPath(`data/dataByDate/${AppState.currentDate}`);
        if (!dateDataPath) return;
        
        // 강의 리스너
        listeners.lectures = database.ref(`${dateDataPath}/lectures`);
        listeners.lectures.on('value', (snapshot) => {
            const lectures = snapshot.val() || [];
            if (JSON.stringify(lectures) !== JSON.stringify(AppState.lectures)) {
                AppState.lectures = lectures;
                if (typeof updateLectureList === 'function') updateLectureList();
                console.log('🔄 강의 데이터 동기화');
            }
        });
        
        // 스케줄 리스너
        listeners.schedule = database.ref(`${dateDataPath}/schedule`);
        listeners.schedule.on('value', (snapshot) => {
            const schedule = snapshot.val() || {};
            if (JSON.stringify(schedule) !== JSON.stringify(AppState.schedule)) {
                AppState.schedule = schedule;
                if (typeof updateScheduleDisplay === 'function') updateScheduleDisplay();
                if (typeof updateLectureList === 'function') updateLectureList();
                console.log('🔄 스케줄 데이터 동기화');
            }
        });
        
        // 세션 리스너
        listeners.sessions = database.ref(`${dateDataPath}/sessions`);
        listeners.sessions.on('value', (snapshot) => {
            const sessions = snapshot.val() || [];
            if (JSON.stringify(sessions) !== JSON.stringify(AppState.sessions)) {
                AppState.sessions = sessions;
                if (typeof updateScheduleDisplay === 'function') updateScheduleDisplay();
                console.log('🔄 세션 데이터 동기화');
            }
        });
        
        // 연자 리스너
        listeners.speakers = eventRef('data/speakers');
        if (listeners.speakers) {
            listeners.speakers.on('value', (snapshot) => {
                const speakers = snapshot.val() || [];
                AppState.speakers = speakers;
                console.log('🔄 연자 데이터 동기화');
            });
        }
        
        // 룸 설정 리스너
        listeners.rooms = eventRef('settings/roomsByDate');
        if (listeners.rooms) {
            listeners.rooms.on('value', (snapshot) => {
                AppConfig.ROOMS_BY_DATE = snapshot.val() || {};
                AppState.rooms = AppConfig.ROOMS_BY_DATE[AppState.currentDate] || [];
                if (typeof createRoomTabs === 'function') createRoomTabs();
                if (typeof createScheduleTable === 'function') createScheduleTable();
                console.log('🔄 룸 설정 동기화');
            });
        }
        
        console.log('✅ 실시간 리스너 시작');
    };
    
    /**
     * 실시간 리스너 해제
     */
    window.stopRealtimeListeners = function() {
        Object.values(listeners).forEach(ref => {
            if (ref && ref.off) {
                ref.off();
            }
        });
        listeners = {};
    };

    // ============================================
    // 데이터 저장
    // ============================================
    
    /**
     * 현재 데이터 Firebase에 저장
     */
    window.saveAndSync = async function() {
        if (!AppConfig.currentEventId || !AppState.currentDate) {
            console.warn('⚠️ 저장할 수 없음: 행사 또는 날짜 미선택');
            return;
        }
        
        try {
            const dateDataRef = eventRef(`data/dataByDate/${AppState.currentDate}`);
            if (!dateDataRef) return;
            
            await dateDataRef.set({
                lectures: AppState.lectures || [],
                schedule: AppState.schedule || {},
                sessions: AppState.sessions || []
            });
            
            // 로컬 캐시도 업데이트
            saveCurrentDateData();
            
            console.log('💾 데이터 저장 완료');
            
        } catch (error) {
            console.error('❌ 저장 실패:', error);
            Toast.error('저장 실패: ' + error.message);
        }
    };
    
    /**
     * 연자 데이터 저장
     */
    window.saveSpeakers = async function() {
        if (!AppConfig.currentEventId) return;
        
        try {
            const speakersRef = eventRef('data/speakers');
            if (speakersRef) {
                await speakersRef.set(AppState.speakers || []);
                console.log('💾 연자 저장 완료');
            }
        } catch (error) {
            console.error('연자 저장 실패:', error);
        }
    };
    
    /**
     * 회사 데이터 저장
     */
    window.saveCompanies = async function() {
        if (!AppConfig.currentEventId) return;
        
        try {
            const companiesRef = eventRef('data/companies');
            if (companiesRef) {
                await companiesRef.set(AppState.companies || []);
                console.log('💾 업체 저장 완료');
            }
        } catch (error) {
            console.error('업체 저장 실패:', error);
        }
    };

    // ============================================
    // 날짜 전환
    // ============================================
    
    /**
     * 날짜 전환 (오버라이드)
     */
    const originalSwitchDate = window.switchDate;
    window.switchDate = async function(newDate) {
        if (!newDate || newDate === AppState.currentDate) return;
        
        showLoading('날짜 전환 중...');
        
        // 현재 데이터 저장
        await saveAndSync();
        
        // 리스너 해제
        stopRealtimeListeners();
        
        // 새 날짜 설정
        AppState.currentDate = newDate;
        AppState.rooms = AppConfig.ROOMS_BY_DATE[newDate] || [];
        
        // 새 날짜 데이터 로드
        await loadCurrentDateData();
        
        // UI 업데이트
        if (typeof createRoomTabs === 'function') createRoomTabs();
        if (typeof createScheduleTable === 'function') createScheduleTable();
        if (typeof updateScheduleDisplay === 'function') updateScheduleDisplay();
        if (typeof updateLectureList === 'function') updateLectureList();
        if (typeof updateDateButtons === 'function') updateDateButtons();
        
        // 리스너 재시작
        startRealtimeListeners();
        
        hideLoading();
        console.log(`📅 날짜 전환: ${newDate}`);
    };

    // ============================================
    // 자동 백업
    // ============================================
    
    let backupInterval = null;
    
    /**
     * 자동 백업 시작 (5분마다)
     */
    window.startAutoBackup = function() {
        if (backupInterval) clearInterval(backupInterval);
        
        backupInterval = setInterval(async () => {
            if (AppConfig.currentEventId && AppState.currentDate && canEdit()) {
                try {
                    const backupRef = eventRef(`backups/${AppState.currentDate}/${Date.now()}`);
                    if (backupRef) {
                        await backupRef.set({
                            lectures: AppState.lectures,
                            schedule: AppState.schedule,
                            sessions: AppState.sessions,
                            timestamp: firebase.database.ServerValue.TIMESTAMP,
                            user: AppState.currentUser?.email
                        });
                        console.log('📦 자동 백업 완료');
                    }
                } catch (error) {
                    console.error('자동 백업 실패:', error);
                }
            }
        }, 5 * 60 * 1000); // 5분
    };

    // ============================================
    // 페이지 로드 시 실행
    // ============================================
    
    document.addEventListener('DOMContentLoaded', () => {
        initApp();
        startAutoBackup();
    });
    
    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
        stopRealtimeListeners();
        if (backupInterval) clearInterval(backupInterval);
    });

})();

console.log('✅ app.js 로드 완료');
