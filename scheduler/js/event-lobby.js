/**
 * event-lobby.js - 멀티 행사 관리 (상용화 버전)
 * 
 * 기능:
 * - 행사 목록 표시
 * - 새 행사 생성
 * - 행사 삭제
 * - 행사 스위칭
 * - 행사 설정 관리
 */

// ============================================
// 행사 로비 UI
// ============================================

/**
 * 행사 로비 오버레이 표시
 */
window.showEventLobby = function() {
    const overlay = document.getElementById('eventLobbyOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        loadEventList();
    }
};

/**
 * 행사 로비 숨기기
 */
window.hideEventLobby = function() {
    const overlay = document.getElementById('eventLobbyOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
};

/**
 * 행사 목록 로드
 */
window.loadEventList = async function() {
    const listContainer = document.getElementById('eventList');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<div class="loading-spinner">행사 목록 로딩 중...</div>';
    
    try {
        const snapshot = await eventListRef().once('value');
        const events = snapshot.val() || {};
        
        if (Object.keys(events).length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <p>등록된 행사가 없습니다.</p>
                    <p>새 행사를 생성해주세요.</p>
                </div>
            `;
            return;
        }
        
        // 행사 목록 렌더링
        let html = '';
        Object.entries(events).forEach(([eventId, event]) => {
            const isCurrentEvent = AppConfig.currentEventId === eventId;
            const dateRange = formatEventDateRange(event.dates);
            const memberCount = Object.keys(event.members || {}).length;
            
            html += `
                <div class="event-card ${isCurrentEvent ? 'current' : ''}" data-event-id="${eventId}">
                    <div class="event-card-header">
                        <h3 class="event-name">${event.name || '이름 없는 행사'}</h3>
                        ${isCurrentEvent ? '<span class="current-badge">현재</span>' : ''}
                    </div>
                    <div class="event-card-body">
                        <p class="event-dates">📅 ${dateRange}</p>
                        <p class="event-rooms">🚪 ${(event.roomsByDate?.[Object.keys(event.roomsByDate || {})[0]] || []).length}개 룸</p>
                        <p class="event-members">👥 ${memberCount}명 참여</p>
                    </div>
                    <div class="event-card-actions">
                        ${isCurrentEvent ? `
                            <button class="btn btn-secondary" onclick="openEventSettings('${eventId}')">⚙️ 설정</button>
                        ` : `
                            <button class="btn btn-primary" onclick="selectEvent('${eventId}')">선택</button>
                            <button class="btn btn-secondary" onclick="openEventSettings('${eventId}')">⚙️</button>
                        `}
                        <button class="btn btn-danger btn-small" onclick="confirmDeleteEvent('${eventId}', '${event.name}')">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
        
    } catch (error) {
        console.error('행사 목록 로드 실패:', error);
        listContainer.innerHTML = `
            <div class="error-state">
                <p>❌ 행사 목록을 불러올 수 없습니다.</p>
                <p class="error-message">${error.message}</p>
            </div>
        `;
    }
};

/**
 * 행사 날짜 범위 포맷
 */
function formatEventDateRange(dates) {
    if (!dates || dates.length === 0) return '날짜 미정';
    if (dates.length === 1) return dates[0].label || dates[0].date;
    
    const first = dates[0];
    const last = dates[dates.length - 1];
    return `${first.label || first.date} ~ ${last.label || last.date}`;
}

// ============================================
// 행사 생성
// ============================================

/**
 * 새 행사 생성 모달 열기
 */
window.openCreateEventModal = function() {
    document.getElementById('createEventModal').classList.add('active');
    
    // 기본값 설정
    document.getElementById('newEventName').value = '';
    document.getElementById('newEventDates').innerHTML = '';
    addEventDateRow(); // 첫 번째 날짜 행 추가
};

/**
 * 새 행사 생성 모달 닫기
 */
window.closeCreateEventModal = function() {
    document.getElementById('createEventModal').classList.remove('active');
};

/**
 * 날짜 입력 행 추가
 */
window.addEventDateRow = function() {
    const container = document.getElementById('newEventDates');
    const index = container.children.length;
    
    const row = document.createElement('div');
    row.className = 'date-row';
    row.innerHTML = `
        <input type="date" class="event-date-input" placeholder="날짜 선택">
        <input type="text" class="event-date-label" placeholder="표시명 (예: Day 1 - 토요일)">
        <input type="text" class="event-date-startTime" placeholder="시작시간" value="08:30">
        <input type="text" class="event-date-endTime" placeholder="종료시간" value="18:00">
        <button type="button" class="btn btn-small btn-danger" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(row);
};

/**
 * 새 행사 저장
 */
window.saveNewEvent = async function() {
    const name = document.getElementById('newEventName').value.trim();
    if (!name) {
        Toast.warning('행사 이름을 입력해주세요.');
        return;
    }
    
    // 날짜 수집
    const dateRows = document.querySelectorAll('#newEventDates .date-row');
    const dates = [];
    const roomsByDate = {};
    const timeSettings = {};
    
    dateRows.forEach((row, index) => {
        const dateInput = row.querySelector('.event-date-input').value;
        const label = row.querySelector('.event-date-label').value || `Day ${index + 1}`;
        const startTime = row.querySelector('.event-date-startTime').value || '08:30';
        const endTime = row.querySelector('.event-date-endTime').value || '18:00';
        
        if (dateInput) {
            dates.push({
                date: dateInput,
                label: label,
                day: `day${index + 1}`
            });
            
            // 기본 룸 설정 (빈 배열)
            roomsByDate[dateInput] = [];
            
            // 시간 설정
            timeSettings[dateInput] = { startTime, endTime };
        }
    });
    
    if (dates.length === 0) {
        Toast.warning('최소 1개의 날짜를 입력해주세요.');
        return;
    }
    
    // 행사 ID 생성
    const eventId = 'event_' + Date.now();
    
    // 행사 데이터 구성
    const eventData = {
        name: name,
        dates: dates,
        roomsByDate: roomsByDate,
        timeSettings: timeSettings,
        categoryGroups: AppConfig.DEFAULT_CATEGORY_GROUPS,
        categoryColors: AppConfig.DEFAULT_CATEGORY_COLORS,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        createdBy: AppState.currentUser?.email || 'unknown',
        members: {
            [AppState.currentUser?.uid]: 'admin'
        }
    };
    
    try {
        // Firebase에 저장
        await eventListRef().child(eventId).set(eventData);
        
        // 빈 데이터 구조도 생성
        const emptyDataByDate = {};
        dates.forEach(d => {
            emptyDataByDate[d.date] = { lectures: [], schedule: {}, sessions: [] };
        });
        
        await database.ref(`/events/${eventId}`).set({
            data: {
                dataByDate: emptyDataByDate,
                speakers: [],
                companies: [],
                categories: Object.keys(AppConfig.DEFAULT_CATEGORY_COLORS)
            },
            settings: {
                dates: dates,
                roomsByDate: roomsByDate,
                timeSettings: timeSettings,
                categoryGroups: AppConfig.DEFAULT_CATEGORY_GROUPS,
                categoryColors: AppConfig.DEFAULT_CATEGORY_COLORS
            }
        });
        
        Toast.success(`'${name}' 행사가 생성되었습니다.`);
        closeCreateEventModal();
        
        // 생성된 행사 바로 선택
        await selectEvent(eventId);
        
    } catch (error) {
        console.error('행사 생성 실패:', error);
        Toast.error('행사 생성에 실패했습니다: ' + error.message);
    }
};

// ============================================
// 행사 선택 및 로드
// ============================================

/**
 * 행사 선택
 */
window.selectEvent = async function(eventId) {
    if (!eventId) return;
    
    try {
        Toast.info('행사 데이터 로딩 중...');
        
        // 행사 기본 정보 로드
        const eventInfoSnapshot = await eventListRef().child(eventId).once('value');
        const eventInfo = eventInfoSnapshot.val();
        
        if (!eventInfo) {
            Toast.error('행사를 찾을 수 없습니다.');
            return;
        }
        
        // 행사 상세 데이터 로드
        const eventDataSnapshot = await database.ref(`/events/${eventId}`).once('value');
        const eventFullData = eventDataSnapshot.val() || {};
        
        // AppConfig 업데이트
        AppConfig.currentEventId = eventId;
        AppConfig.currentEventName = eventInfo.name;
        
        // 설정 데이터 로드
        const settings = eventFullData.settings || eventInfo;
        initializeEventData(settings);
        
        // 마스터 데이터 로드
        const data = eventFullData.data || {};
        AppState.dataByDate = data.dataByDate || {};
        AppState.speakers = data.speakers || [];
        AppState.companies = data.companies || [];
        
        // 현재 날짜 데이터 로드
        if (AppState.currentDate) {
            loadDateData(AppState.currentDate);
        }
        
        // UI 업데이트
        hideEventLobby();
        updateEventHeader();
        
        if (typeof createScheduleTable === 'function') createScheduleTable();
        if (typeof updateScheduleDisplay === 'function') updateScheduleDisplay();
        if (typeof updateLectureList === 'function') updateLectureList();
        if (typeof updateDateButtons === 'function') updateDateButtons();
        
        // 실시간 리스너 시작
        if (typeof startRealtimeListeners === 'function') startRealtimeListeners();
        
        // 로컬 스토리지에 마지막 선택 행사 저장
        localStorage.setItem('lastSelectedEventId', eventId);
        
        Toast.success(`'${eventInfo.name}' 행사를 불러왔습니다.`);
        
    } catch (error) {
        console.error('행사 선택 실패:', error);
        Toast.error('행사를 불러오는데 실패했습니다: ' + error.message);
    }
};

/**
 * 행사 헤더 업데이트
 */
window.updateEventHeader = function() {
    const eventNameEl = document.getElementById('currentEventName');
    if (eventNameEl) {
        eventNameEl.textContent = AppConfig.currentEventName || '행사 미선택';
    }
    
    // 행사 변경 버튼 표시
    const switchBtn = document.getElementById('switchEventBtn');
    if (switchBtn) {
        switchBtn.style.display = AppConfig.currentEventId ? 'inline-flex' : 'none';
    }
};

// ============================================
// 행사 삭제
// ============================================

/**
 * 행사 삭제 확인
 */
window.confirmDeleteEvent = function(eventId, eventName) {
    if (!isAdmin()) {
        Toast.warning('관리자만 행사를 삭제할 수 있습니다.');
        return;
    }
    
    const confirmMsg = `정말로 '${eventName}' 행사를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.\n모든 강의, 세션, 연자 데이터가 삭제됩니다.`;
    
    if (confirm(confirmMsg)) {
        const doubleConfirm = prompt(`삭제를 확인하려면 행사 이름 '${eventName}'을 입력하세요:`);
        if (doubleConfirm === eventName) {
            deleteEvent(eventId);
        } else {
            Toast.info('삭제가 취소되었습니다.');
        }
    }
};

/**
 * 행사 삭제 실행
 */
window.deleteEvent = async function(eventId) {
    try {
        // 행사 목록에서 삭제
        await eventListRef().child(eventId).remove();
        
        // 행사 데이터 삭제
        await database.ref(`/events/${eventId}`).remove();
        
        Toast.success('행사가 삭제되었습니다.');
        
        // 현재 선택된 행사였다면 로비로 이동
        if (AppConfig.currentEventId === eventId) {
            AppConfig.currentEventId = null;
            AppConfig.currentEventName = null;
            AppState.isEventLoaded = false;
            showEventLobby();
        } else {
            loadEventList();
        }
        
    } catch (error) {
        console.error('행사 삭제 실패:', error);
        Toast.error('행사 삭제에 실패했습니다: ' + error.message);
    }
};

// ============================================
// 행사 설정
// ============================================

/**
 * 행사 설정 모달 열기
 */
window.openEventSettings = function(eventId) {
    // TODO: 행사 설정 모달 구현
    // - 행사명 수정
    // - 날짜 추가/삭제
    // - 룸 관리
    // - 시간 설정
    // - 멤버 관리
    Toast.info('행사 설정 기능은 준비 중입니다.');
};

// ============================================
// 자동 행사 선택 (앱 시작 시)
// ============================================

/**
 * 마지막 선택 행사 자동 로드
 */
window.autoSelectLastEvent = async function() {
    const lastEventId = localStorage.getItem('lastSelectedEventId');
    
    if (lastEventId) {
        // 해당 행사가 여전히 존재하는지 확인
        const snapshot = await eventListRef().child(lastEventId).once('value');
        if (snapshot.exists()) {
            await selectEvent(lastEventId);
            return true;
        }
    }
    
    // 마지막 행사가 없거나 삭제된 경우 로비 표시
    showEventLobby();
    return false;
};

console.log('✅ event-lobby.js 로드 완료');
