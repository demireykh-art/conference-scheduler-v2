/**
 * schedule.js - 시간표 렌더링 및 드래그앤드롭 (상용화 버전)
 * 
 * 기능:
 * - 룸별 탭 UI ([Room A] [Room B] ... [전체])
 * - 단일 룸 보기: 세로형 타임라인
 * - 전체 보기: 가로 배열 (기존 V1)
 * - 드래그앤드롭 스케줄링
 */

(function() {
    'use strict';

    // ============================================
    // 시간표 초기화
    // ============================================
    
    /**
     * 시간표 시스템 초기화
     */
    window.initSchedule = function() {
        // 탭 생성
        createRoomTabs();
        
        // 기본 뷰 설정 (전체 보기)
        AppState.currentRoomTab = 'all';
        
        // 시간표 생성
        createScheduleTable();
        
        // 이벤트 리스너 등록
        setupScheduleEventListeners();
        
        console.log('✅ schedule.js 초기화 완료');
    };

    // ============================================
    // 룸 탭 UI
    // ============================================
    
    /**
     * 룸 탭 생성
     */
    window.createRoomTabs = function() {
        const tabContainer = document.getElementById('roomTabsContainer');
        if (!tabContainer) return;
        
        const rooms = AppState.rooms || [];
        const currentTab = AppState.currentRoomTab || 'all';
        
        let html = '<div class="room-tabs">';
        
        // 전체 탭
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
                        data-room="${escapeHtml(room)}" 
                        onclick="switchRoomTab('${escapeHtml(room).replace(/'/g, "\\'")}')">
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
        
        // 괄호 안 날짜 제거
        let name = roomName.replace(/^\([토일월화수목금]\)\s*/g, '');
        
        // 층수 제거 (선택적)
        // name = name.replace(/^\d층\s*/g, '');
        
        // 너무 길면 자르기
        if (name.length > 15) {
            name = name.substring(0, 12) + '...';
        }
        
        return name;
    }
    
    /**
     * 룸 탭 전환
     */
    window.switchRoomTab = function(roomName) {
        AppState.currentRoomTab = roomName;
        
        // 탭 버튼 상태 업데이트
        document.querySelectorAll('.room-tab').forEach(btn => {
            const btnRoom = btn.dataset.room;
            btn.classList.toggle('active', btnRoom === roomName);
        });
        
        // 시간표 뷰 전환
        createScheduleTable();
        updateScheduleDisplay();
        
        console.log(`📌 룸 탭 전환: ${roomName}`);
    };

    // ============================================
    // 시간표 테이블 생성
    // ============================================
    
    /**
     * 시간표 테이블 생성 (메인)
     */
    window.createScheduleTable = function() {
        const container = document.getElementById('scheduleGrid');
        if (!container) return;
        
        const currentTab = AppState.currentRoomTab || 'all';
        
        if (currentTab === 'all') {
            createAllRoomsTable(container);
        } else {
            createSingleRoomTable(container, currentTab);
        }
    };
    
    /**
     * 전체 보기 테이블 (기존 V1 형태)
     */
    function createAllRoomsTable(container) {
        const rooms = AppState.rooms || [];
        const timeSlots = AppState.timeSlots || [];
        
        if (rooms.length === 0 || timeSlots.length === 0) {
            container.innerHTML = `
                <div class="empty-schedule">
                    <p>📅 날짜를 선택하고 룸을 설정해주세요.</p>
                </div>
            `;
            return;
        }
        
        container.className = 'schedule-grid all-rooms-view';
        
        let html = '<table class="schedule-table">';
        
        // 헤더
        html += '<thead><tr><th class="time-col">시간</th>';
        rooms.forEach(room => {
            const displayName = getShortRoomName(room);
            const isKMA = isStarredRoom(room);
            html += `<th class="room-col ${isKMA ? 'kma-room' : ''}">${isKMA ? '🏥 ' : ''}${displayName}</th>`;
        });
        html += '</tr></thead>';
        
        // 바디
        html += '<tbody>';
        timeSlots.forEach(time => {
            html += `<tr data-time="${time}">`;
            html += `<td class="time-cell">${time}</td>`;
            
            rooms.forEach(room => {
                const key = makeScheduleKey(time, room);
                html += `
                    <td class="schedule-cell" 
                        data-key="${key}" 
                        data-time="${time}" 
                        data-room="${escapeHtml(room)}"
                        ondragover="handleDragOver(event)"
                        ondrop="handleDrop(event, '${escapeHtml(key).replace(/'/g, "\\'")}')">
                    </td>
                `;
            });
            
            html += '</tr>';
        });
        html += '</tbody></table>';
        
        container.innerHTML = html;
    }
    
    /**
     * 단일 룸 보기 (세로 타임라인)
     */
    function createSingleRoomTable(container, roomName) {
        const timeSlots = AppState.timeSlots || [];
        const sessions = getRoomSessions(roomName);
        
        container.className = 'schedule-grid single-room-view';
        
        let html = `
            <div class="single-room-container">
                <div class="room-header-banner">
                    <h2>${roomName}</h2>
                    ${isStarredRoom(roomName) ? '<span class="kma-badge">🏥 의협제출용</span>' : ''}
                </div>
                <div class="timeline-wrapper">
        `;
        
        // 시간별 셀 생성
        timeSlots.forEach(time => {
            const key = makeScheduleKey(time, roomName);
            
            // 이 시간대에 시작하는 세션 확인
            const session = sessions.find(s => s.time === time);
            
            if (session) {
                html += renderSessionHeader(session);
            }
            
            html += `
                <div class="timeline-row" data-time="${time}">
                    <div class="timeline-time-label">${time}</div>
                    <div class="timeline-cell" 
                         data-key="${key}"
                         data-time="${time}"
                         data-room="${escapeHtml(roomName)}"
                         ondragover="handleDragOver(event)"
                         ondrop="handleDrop(event, '${escapeHtml(key).replace(/'/g, "\\'")}')">
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    }
    
    /**
     * 특정 룸의 세션 가져오기
     */
    function getRoomSessions(roomName) {
        const normalizedRoom = normalizeRoomName(roomName);
        return (AppState.sessions || [])
            .filter(session => normalizeRoomName(session.room) === normalizedRoom)
            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    }
    
    /**
     * 세션 헤더 렌더링 (단일 룸 뷰용)
     */
    function renderSessionHeader(session) {
        const endTime = calculateEndTime(session.time, session.duration || 60);
        
        return `
            <div class="session-banner" data-session-id="${session.id}" onclick="openEditSessionModal('${session.id}')">
                <div class="session-name">${session.name || 'Untitled Session'}</div>
                <div class="session-time-range">${session.time} - ${endTime}</div>
                ${session.moderator ? `<div class="session-moderator">🎤 좌장: ${session.moderator}</div>` : ''}
            </div>
        `;
    }

    // ============================================
    // 스케줄 디스플레이 업데이트
    // ============================================
    
    /**
     * 스케줄 디스플레이 전체 업데이트
     */
    window.updateScheduleDisplay = function() {
        const schedule = AppState.schedule || {};
        
        // 모든 셀 초기화
        document.querySelectorAll('.schedule-cell, .timeline-cell').forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('has-lecture', 'has-session', 'is-spanning');
            cell.style.removeProperty('--span-count');
        });
        
        // 세션 표시
        displaySessions();
        
        // 강의 표시
        Object.entries(schedule).forEach(([key, lecture]) => {
            displayLectureInCell(key, lecture);
        });
    };
    
    /**
     * 세션 표시
     */
    function displaySessions() {
        const sessions = AppState.sessions || [];
        const currentTab = AppState.currentRoomTab || 'all';
        
        sessions.forEach(session => {
            if (currentTab !== 'all' && normalizeRoomName(session.room) !== normalizeRoomName(currentTab)) {
                return;
            }
            
            const startKey = makeScheduleKey(session.time, session.room);
            const cell = document.querySelector(`[data-key="${CSS.escape(startKey)}"]`);
            
            if (cell) {
                // 세션 시작 셀에 세션 이름 표시 (전체 뷰에서만)
                if (currentTab === 'all') {
                    const sessionEl = document.createElement('div');
                    sessionEl.className = 'session-indicator';
                    sessionEl.innerHTML = `<span class="session-name-small">${session.name || ''}</span>`;
                    sessionEl.onclick = (e) => {
                        e.stopPropagation();
                        if (typeof openEditSessionModal === 'function') {
                            openEditSessionModal(session.id);
                        }
                    };
                    cell.appendChild(sessionEl);
                }
                cell.classList.add('has-session');
            }
        });
    }
    
    /**
     * 셀에 강의 표시
     */
    function displayLectureInCell(key, lecture) {
        const cell = document.querySelector(`[data-key="${CSS.escape(key)}"]`);
        if (!cell) return;
        
        const { time, room } = parseScheduleKey(key);
        const duration = lecture.duration || 10;
        const categoryColor = getCategoryColor(lecture.category);
        const spanCount = Math.ceil(duration / (AppConfig.TIME_UNIT || 5));
        
        // Break 타입인지 확인
        const isBreak = lecture.isBreak || isBreakType(lecture.category);
        const isLuncheon = lecture.isLuncheon || lecture.companyName === '학회강의';
        
        // 강의 카드 생성
        const lectureCard = document.createElement('div');
        lectureCard.className = `lecture-card ${isBreak ? 'break-card' : ''} ${isLuncheon ? 'luncheon-card' : ''}`;
        lectureCard.dataset.id = lecture.id;
        lectureCard.dataset.key = key;
        lectureCard.draggable = true;
        lectureCard.style.setProperty('--category-color', categoryColor);
        lectureCard.style.setProperty('--span-height', `${spanCount * 100}%`);
        
        // 내용
        const title = lecture.titleKo || lecture.titleEn || (isBreak ? lecture.category : '제목 없음');
        const speaker = lecture.speakerKo || lecture.speakerEn || '';
        const endTime = calculateEndTime(time, duration);
        
        lectureCard.innerHTML = `
            <div class="lecture-time">${time}-${endTime} (${duration}분)</div>
            <div class="lecture-title">${isLuncheon ? '🎓 ' : ''}${truncateText(title, 40)}</div>
            ${speaker ? `<div class="lecture-speaker">${speaker}</div>` : ''}
            ${lecture.affiliation ? `<div class="lecture-affiliation">${truncateText(lecture.affiliation, 25)}</div>` : ''}
            ${lecture.companyName && !isLuncheon ? `<div class="lecture-company">🏢 ${lecture.companyName}</div>` : ''}
            <div class="lecture-category" style="background: ${categoryColor}">${lecture.category || ''}</div>
        `;
        
        // 이벤트
        lectureCard.onclick = () => {
            if (typeof openEditModal === 'function' && !isBreak) {
                openEditModal(lecture.id);
            }
        };
        
        lectureCard.ondragstart = (e) => handleLectureDragStart(e, key, lecture);
        lectureCard.ondragend = handleLectureDragEnd;
        
        // 셀에 추가
        cell.innerHTML = '';
        cell.appendChild(lectureCard);
        cell.classList.add('has-lecture');
        cell.classList.add('is-spanning');
        cell.style.setProperty('--span-count', spanCount);
        
        // 아래 셀들 숨기기 처리 (전체 뷰에서만)
        if (AppState.currentRoomTab === 'all' && spanCount > 1) {
            markSpannedCells(time, room, spanCount);
        }
    }
    
    /**
     * 강의가 차지하는 아래 셀들 마킹
     */
    function markSpannedCells(startTime, room, spanCount) {
        const timeSlots = AppState.timeSlots || [];
        const startIndex = timeSlots.indexOf(startTime);
        
        for (let i = 1; i < spanCount; i++) {
            const nextTime = timeSlots[startIndex + i];
            if (!nextTime) break;
            
            const nextKey = makeScheduleKey(nextTime, room);
            const nextCell = document.querySelector(`[data-key="${CSS.escape(nextKey)}"]`);
            if (nextCell) {
                nextCell.classList.add('spanned-by-above');
            }
        }
    }

    // ============================================
    // 드래그 앤 드롭
    // ============================================
    
    /**
     * 강의 드래그 시작
     */
    function handleLectureDragStart(e, key, lecture) {
        AppState.draggedScheduleKey = key;
        AppState.draggedLecture = lecture;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', key);
    }
    
    /**
     * 강의 드래그 종료
     */
    function handleLectureDragEnd(e) {
        e.target.classList.remove('dragging');
        AppState.draggedScheduleKey = null;
        AppState.draggedLecture = null;
        
        // 드롭 가능 표시 제거
        document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    }
    
    /**
     * 드래그 오버 핸들러
     */
    window.handleDragOver = function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drop-target');
    };
    
    /**
     * 드롭 핸들러
     */
    window.handleDrop = function(e, targetKey) {
        e.preventDefault();
        e.currentTarget.classList.remove('drop-target');
        
        // 권한 확인
        if (!checkEditPermission()) return;
        
        const sourceKey = AppState.draggedScheduleKey;
        const { time: targetTime, room: targetRoom } = parseScheduleKey(targetKey);
        
        // 강의 목록에서 드롭된 경우
        if (AppState.draggedLecture && !sourceKey) {
            const lecture = AppState.draggedLecture;
            placeLectureInSchedule(lecture, targetTime, targetRoom);
            return;
        }
        
        // 스케줄 내 이동
        if (sourceKey && sourceKey !== targetKey) {
            moveLectureInSchedule(sourceKey, targetKey);
        }
    };
    
    /**
     * 강의를 스케줄에 배치
     */
    function placeLectureInSchedule(lecture, time, room) {
        // 이미 배치된 강의인지 확인
        const existingKey = findLectureInSchedule(lecture.id);
        if (existingKey) {
            Toast.warning('이미 배치된 강의입니다. 이동하려면 시간표에서 드래그하세요.');
            return;
        }
        
        // 연자 충돌 검사
        const speaker = lecture.speakerKo || lecture.speakerEn;
        if (speaker) {
            const conflict = checkSpeakerConflict(speaker, time, lecture.duration || 10);
            if (conflict) {
                if (!confirm(`${conflict.message}\n그래도 배치하시겠습니까?`)) {
                    return;
                }
            }
        }
        
        // Undo 저장
        saveStateForUndo();
        
        // 배치
        const key = makeScheduleKey(time, room);
        AppState.schedule[key] = { ...lecture };
        
        // 저장 및 UI 업데이트
        if (typeof saveAndSync === 'function') saveAndSync();
        updateScheduleDisplay();
        if (typeof updateLectureList === 'function') updateLectureList();
        
        Toast.success(`'${truncateText(lecture.titleKo || lecture.titleEn, 20)}' 배치 완료`);
    }
    
    /**
     * 스케줄 내 강의 이동
     */
    function moveLectureInSchedule(sourceKey, targetKey) {
        const lecture = AppState.schedule[sourceKey];
        if (!lecture) return;
        
        // 목표 셀이 이미 차있는지 확인
        if (AppState.schedule[targetKey]) {
            Toast.warning('해당 시간대에 이미 강의가 있습니다.');
            return;
        }
        
        const { time: targetTime, room: targetRoom } = parseScheduleKey(targetKey);
        
        // 연자 충돌 검사 (자기 자신 제외)
        const speaker = lecture.speakerKo || lecture.speakerEn;
        if (speaker) {
            const conflict = checkSpeakerConflict(speaker, targetTime, lecture.duration || 10, sourceKey);
            if (conflict) {
                if (!confirm(`${conflict.message}\n그래도 이동하시겠습니까?`)) {
                    return;
                }
            }
        }
        
        // Undo 저장
        saveStateForUndo();
        
        // 이동
        delete AppState.schedule[sourceKey];
        AppState.schedule[targetKey] = lecture;
        
        // 저장 및 UI 업데이트
        if (typeof saveAndSync === 'function') saveAndSync();
        updateScheduleDisplay();
        
        Toast.success('강의 이동 완료');
    }
    
    /**
     * 강의가 스케줄에 배치되어 있는지 찾기
     */
    function findLectureInSchedule(lectureId) {
        for (const [key, lecture] of Object.entries(AppState.schedule || {})) {
            if (lecture.id === lectureId) {
                return key;
            }
        }
        return null;
    }

    // ============================================
    // 이벤트 리스너 설정
    // ============================================
    
    function setupScheduleEventListeners() {
        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z: Undo
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                if (typeof performUndo === 'function') {
                    performUndo();
                }
            }
        });
        
        // 셀 컨텍스트 메뉴 (우클릭)
        document.addEventListener('contextmenu', (e) => {
            const cell = e.target.closest('.schedule-cell, .timeline-cell');
            if (cell && cell.classList.contains('has-lecture')) {
                e.preventDefault();
                showCellContextMenu(e, cell);
            }
        });
    }
    
    /**
     * 셀 컨텍스트 메뉴
     */
    function showCellContextMenu(e, cell) {
        const key = cell.dataset.key;
        const lecture = AppState.schedule[key];
        if (!lecture) return;
        
        // 기존 메뉴 제거
        const existing = document.getElementById('cellContextMenu');
        if (existing) existing.remove();
        
        const menu = document.createElement('div');
        menu.id = 'cellContextMenu';
        menu.className = 'context-menu';
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
        
        menu.innerHTML = `
            <div class="menu-item" onclick="removeLectureFromSchedule('${key}')">🗑️ 배치 해제</div>
            <div class="menu-item" onclick="duplicateLecture(${lecture.id})">📋 복제</div>
            <div class="menu-item" onclick="openEditModal(${lecture.id})">✏️ 편집</div>
        `;
        
        document.body.appendChild(menu);
        
        // 외부 클릭 시 닫기
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 10);
    }
    
    /**
     * 스케줄에서 강의 제거
     */
    window.removeLectureFromSchedule = function(key) {
        if (!checkEditPermission()) return;
        
        const lecture = AppState.schedule[key];
        if (!lecture) return;
        
        saveStateForUndo();
        delete AppState.schedule[key];
        
        if (typeof saveAndSync === 'function') saveAndSync();
        updateScheduleDisplay();
        if (typeof updateLectureList === 'function') updateLectureList();
        
        Toast.success('배치 해제 완료');
    };

    // ============================================
    // 날짜 버튼 업데이트
    // ============================================
    
    /**
     * 날짜 선택 버튼 업데이트
     */
    window.updateDateButtons = function() {
        const container = document.getElementById('dateButtonsContainer');
        if (!container) return;
        
        const dates = AppConfig.CONFERENCE_DATES || [];
        const currentDate = AppState.currentDate;
        
        let html = '';
        dates.forEach(dateInfo => {
            const isActive = dateInfo.date === currentDate;
            html += `
                <button class="date-btn ${isActive ? 'active' : ''}" 
                        onclick="switchDate('${dateInfo.date}')">
                    ${dateInfo.label || formatDate(dateInfo.date)}
                </button>
            `;
        });
        
        container.innerHTML = html;
    };

})();

console.log('✅ schedule.js 로드 완료');
