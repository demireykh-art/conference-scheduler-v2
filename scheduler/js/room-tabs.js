/**
 * room-tabs.js - 룸별 탭 UI 시스템 (상용화 버전)
 * 
 * 기능:
 * - 룸별 탭 렌더링 [Room A] [Room B] ... [전체]
 * - 탭 클릭 시 해당 룸만 표시
 * - "전체" 탭은 기존 V1 형태 (모든 룸 가로 배열)
 * - 단일 룸 뷰는 세로형 타임라인
 */

(function() {
    'use strict';

    // ============================================
    // 탭 UI 렌더링
    // ============================================
    
    /**
     * 룸 탭 바 생성
     */
    window.createRoomTabs = function() {
        const tabContainer = document.getElementById('roomTabsContainer');
        if (!tabContainer) return;
        
        const rooms = AppState.rooms || [];
        const currentTab = AppState.currentRoomTab || 'all';
        
        let html = '<div class="room-tabs">';
        
        // 전체 탭 (항상 첫 번째)
        html += `
            <button class="room-tab ${currentTab === 'all' ? 'active' : ''}" 
                    data-room="all" 
                    onclick="switchRoomTab('all')">
                📋 전체
            </button>
        `;
        
        // 각 룸별 탭
        rooms.forEach((room, index) => {
            const displayName = getShortRoomName(room);
            const isActive = currentTab === room;
            const isKMA = isStarredRoom(room);
            
            html += `
                <button class="room-tab ${isActive ? 'active' : ''}" 
                        data-room="${room}" 
                        onclick="switchRoomTab('${escapeHtml(room)}')">
                    ${isKMA ? '🏥 ' : ''}${displayName}
                </button>
            `;
        });
        
        html += '</div>';
        
        tabContainer.innerHTML = html;
    };
    
    /**
     * 룸 이름 축약
     */
    function getShortRoomName(roomName) {
        if (!roomName) return '';
        
        // 괄호 안의 날짜 표시 제거 (예: "(토)" "(일)")
        let name = roomName.replace(/^\([토일]\)/g, '').trim();
        
        // 층수 제거 (예: "1층 " "4층 ")
        name = name.replace(/^\d층\s*/g, '');
        
        // 너무 길면 자르기
        if (name.length > 15) {
            name = name.substring(0, 12) + '...';
        }
        
        return name;
    }
    
    /**
     * HTML 이스케이프
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ============================================
    // 탭 전환
    // ============================================
    
    /**
     * 룸 탭 전환
     */
    window.switchRoomTab = function(roomName) {
        AppState.currentRoomTab = roomName;
        
        // 탭 버튼 상태 업데이트
        document.querySelectorAll('.room-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.room === roomName);
        });
        
        // 시간표 뷰 전환
        if (roomName === 'all') {
            showAllRoomsView();
        } else {
            showSingleRoomView(roomName);
        }
        
        console.log(`📌 룸 탭 전환: ${roomName}`);
    };
    
    // ============================================
    // 전체 보기 (기존 V1 형태)
    // ============================================
    
    /**
     * 전체 룸 보기 - 가로 배열 (기존 V1)
     */
    window.showAllRoomsView = function() {
        const scheduleContainer = document.getElementById('scheduleGrid');
        if (!scheduleContainer) return;
        
        scheduleContainer.className = 'schedule-grid all-rooms-view';
        
        // 기존 createScheduleTable 함수 호출
        if (typeof createScheduleTable === 'function') {
            createScheduleTable();
        }
        if (typeof updateScheduleDisplay === 'function') {
            updateScheduleDisplay();
        }
    };
    
    // ============================================
    // 단일 룸 보기 (새로운 세로형)
    // ============================================
    
    /**
     * 단일 룸 보기 - 세로 타임라인
     */
    window.showSingleRoomView = function(roomName) {
        const scheduleContainer = document.getElementById('scheduleGrid');
        if (!scheduleContainer) return;
        
        scheduleContainer.className = 'schedule-grid single-room-view';
        
        // 해당 룸의 스케줄만 필터링
        const roomSchedule = getRoomSchedule(roomName);
        const roomSessions = getRoomSessions(roomName);
        
        // 세로형 타임라인 생성
        renderSingleRoomTimeline(scheduleContainer, roomName, roomSchedule, roomSessions);
    };
    
    /**
     * 특정 룸의 스케줄 가져오기
     */
    function getRoomSchedule(roomName) {
        const schedule = {};
        const normalizedRoom = normalizeRoomName(roomName);
        
        Object.entries(AppState.schedule || {}).forEach(([key, lecture]) => {
            const [time, room] = [key.substring(0, 5), key.substring(6)];
            if (normalizeRoomName(room) === normalizedRoom) {
                schedule[key] = lecture;
            }
        });
        
        return schedule;
    }
    
    /**
     * 특정 룸의 세션 가져오기
     */
    function getRoomSessions(roomName) {
        const normalizedRoom = normalizeRoomName(roomName);
        return (AppState.sessions || []).filter(
            session => normalizeRoomName(session.room) === normalizedRoom
        );
    }
    
    /**
     * 세로형 타임라인 렌더링
     */
    function renderSingleRoomTimeline(container, roomName, schedule, sessions) {
        const timeSlots = AppState.timeSlots || [];
        
        // 세션을 시간순으로 정렬
        const sortedSessions = [...sessions].sort((a, b) => {
            return timeToMinutes(a.time) - timeToMinutes(b.time);
        });
        
        // 스케줄 항목을 시간순으로 정렬
        const sortedSchedule = Object.entries(schedule).sort((a, b) => {
            return timeToMinutes(a[0].substring(0, 5)) - timeToMinutes(b[0].substring(0, 5));
        });
        
        let html = `
            <div class="single-room-container">
                <div class="room-header">
                    <h2>${roomName}</h2>
                    ${isStarredRoom(roomName) ? '<span class="kma-badge">🏥 의협제출용</span>' : ''}
                </div>
                <div class="timeline-container">
        `;
        
        // 현재 세션 추적
        let currentSessionIndex = 0;
        let currentSession = sortedSessions[currentSessionIndex];
        let isInSession = false;
        
        timeSlots.forEach((time, index) => {
            const timeMin = timeToMinutes(time);
            
            // 새 세션 시작 확인
            if (currentSession && !isInSession) {
                const sessionStartMin = timeToMinutes(currentSession.time);
                if (timeMin >= sessionStartMin) {
                    isInSession = true;
                    html += renderSessionHeader(currentSession);
                }
            }
            
            // 현재 세션 종료 확인
            if (currentSession && isInSession) {
                const sessionEndMin = timeToMinutes(currentSession.time) + (currentSession.duration || 60);
                if (timeMin >= sessionEndMin) {
                    html += '</div>'; // 세션 닫기
                    currentSessionIndex++;
                    currentSession = sortedSessions[currentSessionIndex];
                    isInSession = false;
                    
                    // 다음 세션 시작 확인
                    if (currentSession) {
                        const nextSessionStartMin = timeToMinutes(currentSession.time);
                        if (timeMin >= nextSessionStartMin) {
                            isInSession = true;
                            html += renderSessionHeader(currentSession);
                        }
                    }
                }
            }
            
            // 해당 시간대의 강의 찾기
            const lectureKey = `${time}-${roomName}`;
            const lecture = schedule[lectureKey];
            
            if (lecture) {
                html += renderTimelineLecture(time, lecture, lectureKey);
            }
        });
        
        // 마지막 세션 닫기
        if (isInSession) {
            html += '</div>';
        }
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // 드래그 앤 드롭 이벤트 재설정
        setupSingleRoomDragDrop(container);
    }
    
    /**
     * 세션 헤더 렌더링
     */
    function renderSessionHeader(session) {
        const moderator = session.moderator || '';
        const categoryTags = getSessionCategoryTags ? getSessionCategoryTags(session.time, session.room, session.duration) : [];
        
        return `
            <div class="timeline-session" data-session-id="${session.id}">
                <div class="session-header" onclick="openEditSessionModal('${session.id}')">
                    <div class="session-name">${session.name || 'Untitled Session'}</div>
                    <div class="session-meta">
                        <span class="session-time">${session.time} - ${calculateEndTime(session.time, session.duration || 60)}</span>
                        ${moderator ? `<span class="session-moderator">🎤 ${moderator}</span>` : ''}
                    </div>
                    ${categoryTags.length > 0 ? `
                        <div class="session-tags">
                            ${categoryTags.map(tag => `<span class="category-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="session-content">
        `;
    }
    
    /**
     * 타임라인 강의 렌더링
     */
    function renderTimelineLecture(time, lecture, lectureKey) {
        const categoryColor = AppConfig.categoryColors?.[lecture.category] || '#757575';
        const duration = lecture.duration || 10;
        const endTime = calculateEndTime(time, duration);
        const isLuncheon = lecture.isLuncheon || lecture.companyName === '학회강의';
        
        return `
            <div class="timeline-item" 
                 data-key="${lectureKey}"
                 data-id="${lecture.id}"
                 draggable="true"
                 style="--category-color: ${categoryColor}">
                <div class="timeline-time">
                    <span class="start-time">${time}</span>
                    <span class="end-time">${endTime}</span>
                    <span class="duration">${duration}분</span>
                </div>
                <div class="timeline-content" onclick="openEditModal(${lecture.id})">
                    <div class="timeline-title">
                        ${isLuncheon ? '🎓 ' : ''}
                        ${lecture.titleKo || lecture.titleEn || '제목 없음'}
                    </div>
                    ${lecture.titleEn && lecture.titleKo ? `
                        <div class="timeline-title-en">${lecture.titleEn}</div>
                    ` : ''}
                    <div class="timeline-speaker">
                        ${lecture.speakerKo || lecture.speakerEn || '연자 미정'}
                        ${lecture.affiliation ? `<span class="speaker-affiliation">${lecture.affiliation}</span>` : ''}
                    </div>
                    ${lecture.companyName && lecture.companyName !== '학회강의' ? `
                        <div class="timeline-sponsor">🏢 ${lecture.companyName}</div>
                    ` : ''}
                </div>
                <div class="timeline-category" style="background-color: ${categoryColor}">
                    ${lecture.category || ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 단일 룸 뷰 드래그앤드롭 설정
     */
    function setupSingleRoomDragDrop(container) {
        // 드래그 시작
        container.querySelectorAll('.timeline-item[draggable="true"]').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const key = item.dataset.key;
                if (key && AppState.schedule[key]) {
                    AppState.draggedScheduleKey = key;
                    item.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                }
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                AppState.draggedScheduleKey = null;
            });
        });
    }
    
    // ============================================
    // 탭 초기화
    // ============================================
    
    /**
     * 룸 탭 시스템 초기화
     */
    window.initRoomTabs = function() {
        // 기본값은 전체 보기
        AppState.currentRoomTab = 'all';
        
        // 탭 생성
        createRoomTabs();
        
        // 룸 변경 시 탭 재생성
        // (날짜 변경 시 자동으로 호출됨)
    };
    
    /**
     * 탭 상태 저장/복원
     */
    window.saveRoomTabState = function() {
        localStorage.setItem('lastRoomTab', AppState.currentRoomTab);
    };
    
    window.restoreRoomTabState = function() {
        const lastTab = localStorage.getItem('lastRoomTab');
        if (lastTab && (lastTab === 'all' || AppState.rooms.includes(lastTab))) {
            AppState.currentRoomTab = lastTab;
        }
    };

})();

console.log('✅ room-tabs.js 로드 완료');
