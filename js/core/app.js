/**
 * Main Application Entry Point V2.0
 * 
 * Multi-Event Architecture 기반 앱 초기화
 */

/**
 * 앱 초기화
 */
async function initializeApp(eventId, user) {
  console.log('[App] 초기화 시작:', eventId);

  try {
    // 1. 상태 초기화
    AppState.switchEvent(eventId);
    AppState.user = user;

    // 2. 행사 정보 로드
    await loadEventInfo(eventId);

    // 3. 행사 데이터 로드
    await loadEventData(eventId);

    // 4. 중복 스케줄 클리닝
    cleanupDuplicateSchedules();

    // 5. 실시간 동기화 설정
    setupRealtimeSync(eventId);

    // 6. Presence 초기화
    if (typeof PresenceManager !== 'undefined') {
      PresenceManager.init(eventId, user);
    }

    // 7. 모바일 최적화
    if (typeof MobileHandler !== 'undefined') {
      MobileHandler.init();
    }

    // 8. UI 초기화
    initializeUI();

    // 9. 초기 뷰 렌더링
    updateScheduleDisplay();

    console.log('[App] 초기화 완료');
    console.log('[App] 통계:', AppState.getStatistics());

  } catch (error) {
    console.error('[App] 초기화 오류:', error);
    throw error;
  }
}

/**
 * 행사 정보 로드
 */
async function loadEventInfo(eventId) {
  const infoRef = FirebaseRefs.eventInfo(eventId);
  const snapshot = await infoRef.once('value');
  const info = snapshot.val();

  if (!info) {
    throw new Error('행사 정보를 찾을 수 없습니다');
  }

  AppState.eventInfo = info;

  // UI 업데이트
  document.getElementById('eventTitle').textContent = info.name;
  document.getElementById('eventMeta').textContent = 
    `${info.country} · ${TimeZoneManager.getTimezoneInfo(info.timezone).name}`;

  console.log('[App] 행사 정보 로드 완료:', info.name);
}

/**
 * 행사 데이터 로드
 */
async function loadEventData(eventId) {
  const dataRef = FirebaseRefs.eventData(eventId);
  const snapshot = await dataRef.once('value');
  const data = snapshot.val();

  if (!data) {
    console.warn('[App] 빈 데이터 - 초기 구조 생성');
    return;
  }

  // AppState에 로드
  AppState.fromFirebaseObject(data);

  console.log('[App] 데이터 로드 완료:', {
    speakers: AppState.speakers.size,
    lectures: AppState.lectures.size,
    schedule: AppState.schedule.size
  });
}

/**
 * 실시간 동기화 설정
 */
function setupRealtimeSync(eventId) {
  const dataRef = FirebaseRefs.eventData(eventId);

  // Firebase 실시간 리스너
  dataRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // 데이터 무결성 검증
    const validation = validateIncomingData(data);
    
    if (!validation.isValid) {
      console.error('[Sync] 유효하지 않은 데이터:', validation.errors);
      showToast('데이터 무결성 오류 감지', 'error');
      return;
    }

    // 로컬 상태 업데이트
    updateLocalState(data);

    // UI 갱신
    if (AppState.ui.currentView === 'schedule') {
      updateScheduleDisplay();
    }

    AppState.sync.lastSyncTime = Date.now();
    updateSyncStatus('저장됨', true);
  });

  console.log('[Sync] 실시간 동기화 설정 완료');
}

/**
 * 수신 데이터 검증
 */
function validateIncomingData(data) {
  const errors = [];

  // 연자 수 검증
  const speakerCount = data.speakers ? Object.keys(data.speakers).length : 0;
  if (speakerCount > 0 && speakerCount < AppState.speakers.size * 0.5) {
    errors.push(`연자 수 급감: ${AppState.speakers.size} → ${speakerCount}`);
  }

  // 강의 수 검증
  const lectureCount = data.lectures ? Object.keys(data.lectures).length : 0;
  if (lectureCount > 0 && lectureCount < AppState.lectures.size * 0.5) {
    errors.push(`강의 수 급감: ${AppState.lectures.size} → ${lectureCount}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 로컬 상태 업데이트 (병합)
 */
function updateLocalState(data) {
  // 스냅샷 생성 (복원용)
  AppState.createSnapshot();

  try {
    // 명확한 덮어쓰기 (Object.assign 대신)
    if (data.speakers) {
      AppState.speakers = new Map(Object.entries(data.speakers));
    }
    if (data.lectures) {
      AppState.lectures = new Map(Object.entries(data.lectures));
    }
    if (data.schedule) {
      // 중복 방지를 위해 deduplication 적용
      const tempSchedule = new Map(Object.entries(data.schedule));
      const originalSize = tempSchedule.size;
      
      // 임시로 schedule에 할당하여 deduplication 수행
      AppState.schedule = tempSchedule;
      const result = deduplicateSchedule();
      
      if (result.duplicatesFound > 0) {
        console.warn(`[Sync] 수신 데이터에서 ${result.duplicatesFound}개 중복 제거`);
        AppState.schedule = result.cleanedSchedule;
      }
    }
    if (data.sessions) {
      AppState.sessions = data.sessions;
    }
    if (data.chairs) {
      AppState.chairs = new Map(Object.entries(data.chairs));
    }
    if (data.sponsors) {
      AppState.sponsors = data.sponsors;
    }
    if (data.roomsConfig) {
      AppState.roomsConfig = data.roomsConfig;
    }

  } catch (error) {
    console.error('[Sync] 상태 업데이트 오류:', error);
    
    // 스냅샷에서 복원
    AppState.restoreFromSnapshot();
    showToast('데이터 동기화 오류 - 이전 상태로 복원', 'warning');
  }
}

/**
 * Firebase에 저장 및 동기화
 */
async function saveAndSync() {
  if (AppState.sync.isSyncing) {
    console.log('[Sync] 이미 동기화 진행 중');
    return;
  }

  AppState.sync.isSyncing = true;
  updateSyncStatus('저장 중...', false);

  try {
    // 데이터 검증
    const validation = AppState.validateData();
    if (!validation.isValid) {
      console.error('[Sync] 데이터 검증 실패:', validation.errors);
      throw new Error('데이터 무결성 오류: ' + validation.errors.join(', '));
    }

    // Firebase 객체로 변환
    const data = AppState.toFirebaseObject();

    // Firebase에 저장
    await FirebaseRefs.eventData(AppState.currentEventId).set(data);

    // 행사 정보의 lastModified 업데이트
    await FirebaseRefs.eventInfo(AppState.currentEventId)
      .child('lastModified')
      .set(Date.now());

    AppState.sync.isDirty = false;
    AppState.sync.lastSyncTime = Date.now();
    updateSyncStatus('저장됨', true);

    console.log('[Sync] 저장 완료');

  } catch (error) {
    console.error('[Sync] 저장 오류:', error);
    updateSyncStatus('저장 실패', false);
    showToast('저장에 실패했습니다: ' + error.message, 'error');
    throw error;

  } finally {
    AppState.sync.isSyncing = false;
  }
}

/**
 * 동기화 상태 UI 업데이트
 */
function updateSyncStatus(text, isSuccess) {
  const syncText = document.getElementById('syncText');
  const syncStatus = document.getElementById('syncStatus');

  if (syncText) {
    syncText.textContent = text;
  }

  if (syncStatus) {
    if (isSuccess) {
      syncStatus.classList.remove('syncing', 'error');
      syncStatus.classList.add('success');
    } else {
      syncStatus.classList.remove('success');
      syncStatus.classList.add('syncing');
    }
  }
}

/**
 * UI 초기화
 */
function initializeUI() {
  // 사용자 정보 표시
  const user = AppState.user;
  if (user) {
    document.getElementById('userAvatar').src = user.photoURL || 'https://via.placeholder.com/40';
    document.getElementById('userName').textContent = user.displayName || user.email;
    if (document.getElementById('userEmail')) {
      document.getElementById('userEmail').textContent = user.email;
    }
  }

  // 세션 선택 드롭다운 초기화
  updateSessionSelector();

  // 뷰 탭 이벤트
  setupViewTabs();

  console.log('[UI] 초기화 완료');
}

/**
 * 세션 선택 드롭다운 업데이트
 */
function updateSessionSelector() {
  const selector = document.getElementById('sessionSelector');
  if (!selector) return;

  selector.innerHTML = '<option value="">전체 보기</option>';
  
  AppState.sessions.forEach((session, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = session.name || `세션 ${index + 1}`;
    selector.appendChild(option);
  });
}

/**
 * 뷰 탭 설정
 */
function setupViewTabs() {
  const tabs = document.querySelectorAll('.btn-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const viewName = tab.dataset.view;
      if (viewName) {
        showView(viewName);
      }
    });
  });
}

/**
 * 뷰 전환
 */
function showView(viewName) {
  // 모든 탭 비활성화
  document.querySelectorAll('.btn-tab').forEach(btn => {
    btn.classList.remove('active');
  });

  // 모든 뷰 숨기기
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  // 선택된 탭/뷰 활성화
  const tab = document.querySelector(`[data-view="${viewName}"]`);
  const view = document.getElementById(`${viewName}View`);

  if (tab) tab.classList.add('active');
  if (view) view.classList.add('active');

  AppState.ui.currentView = viewName;

  // 뷰별 데이터 갱신
  switch(viewName) {
    case 'schedule':
      updateScheduleDisplay();
      break;
    case 'lectures':
      if (typeof updateLecturesList === 'function') {
        updateLecturesList();
      }
      break;
    case 'speakers':
      if (typeof updateSpeakersList === 'function') {
        updateSpeakersList();
      }
      break;
    case 'sessions':
      if (typeof updateSessionsList === 'function') {
        updateSessionsList();
      }
      break;
  }
}

/**
 * 윈도우 닫기 전 경고
 */
window.addEventListener('beforeunload', (e) => {
  if (AppState.sync.isDirty) {
    e.preventDefault();
    e.returnValue = '저장하지 않은 변경사항이 있습니다.';
    return e.returnValue;
  }
});

/**
 * 앱 종료 시 정리
 */
window.addEventListener('unload', () => {
  if (typeof PresenceManager !== 'undefined') {
    PresenceManager.cleanup();
  }
});

// 전역 함수 등록
window.initializeApp = initializeApp;
window.saveAndSync = saveAndSync;
window.showView = showView;
