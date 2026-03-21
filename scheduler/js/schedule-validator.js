/**
 * schedule-validator.js - 동선 검증 전용 모듈
 * 
 * 기능:
 * - 전체 날짜 통합 동선 검증
 * - 언제든 실행 가능 (별도 버튼)
 * - 문제 항목 클릭 → 해당 강의로 이동/편집
 * - 사이드 패널로 결과 상시 표시
 * 
 * 검증 규칙:
 * 1. 층간 이동 (1층↔4층): 최소 20분 공백 필요
 * 2. 동일층 이동: 최소 10분 공백 필요
 * 3. 좌장 고정: 세션 종료까지 이동 불가
 * 4. 피로도: 1인 일일 7회 초과 시 경고
 */

(function() {
    'use strict';

    // ============================================
    // 설정 상수
    // ============================================
    
    const CONFIG = {
        FLOOR_TRANSFER_TIME: 20,    // 층간 이동 최소 시간 (분)
        ROOM_TRANSFER_TIME: 10,     // 동일층 이동 최소 시간 (분)
        MAX_DAILY_LECTURES: 7,      // 일일 최대 강연 수
        WARNING_BUFFER: 5           // 위험 경고 버퍼 (분)
    };

    // 검증 결과 저장
    let lastValidationResults = null;

    // ============================================
    // 검증 패널 UI
    // ============================================
    
    /**
     * 동선 검증 실행 및 패널 표시
     */
    window.openScheduleValidator = function() {
        // 패널 생성 또는 가져오기
        let panel = document.getElementById('validatorPanel');
        if (!panel) {
            panel = createValidatorPanel();
            document.body.appendChild(panel);
        }
        
        panel.classList.add('active');
        
        // 검증 실행
        runFullValidation();
    };
    
    /**
     * 검증 패널 닫기
     */
    window.closeScheduleValidator = function() {
        const panel = document.getElementById('validatorPanel');
        if (panel) {
            panel.classList.remove('active');
        }
    };
    
    /**
     * 검증 패널 토글
     */
    window.toggleScheduleValidator = function() {
        const panel = document.getElementById('validatorPanel');
        if (panel && panel.classList.contains('active')) {
            closeScheduleValidator();
        } else {
            openScheduleValidator();
        }
    };
    
    /**
     * 검증 패널 생성
     */
    function createValidatorPanel() {
        const panel = document.createElement('div');
        panel.id = 'validatorPanel';
        panel.className = 'validator-panel';
        panel.innerHTML = `
            <div class="validator-header">
                <h3>🔍 동선 검증</h3>
                <div class="validator-actions">
                    <button class="btn btn-small btn-secondary" onclick="runFullValidation()" title="다시 검증">🔄</button>
                    <button class="btn btn-small btn-secondary" onclick="exportValidationReport()" title="리포트 다운로드">📥</button>
                    <button class="btn btn-small btn-secondary" onclick="closeScheduleValidator()">✕</button>
                </div>
            </div>
            <div class="validator-summary" id="validatorSummary">
                <!-- 요약 영역 -->
            </div>
            <div class="validator-content" id="validatorContent">
                <!-- 검증 결과 -->
            </div>
        `;
        
        // 스타일 추가
        addValidatorStyles();
        
        return panel;
    }
    
    /**
     * 검증 패널 스타일
     */
    function addValidatorStyles() {
        if (document.getElementById('validatorStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'validatorStyles';
        style.textContent = `
            .validator-panel {
                position: fixed;
                right: -420px;
                top: 0;
                width: 420px;
                height: 100vh;
                background: white;
                box-shadow: -4px 0 20px rgba(0,0,0,0.15);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                transition: right 0.3s ease;
            }
            .validator-panel.active {
                right: 0;
            }
            .validator-header {
                padding: 16px 20px;
                background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .validator-header h3 {
                margin: 0;
                font-size: 1.1rem;
            }
            .validator-actions {
                display: flex;
                gap: 8px;
            }
            .validator-actions .btn {
                background: rgba(255,255,255,0.2);
                color: white;
                border: none;
                padding: 6px 10px;
            }
            .validator-actions .btn:hover {
                background: rgba(255,255,255,0.3);
            }
            .validator-summary {
                padding: 16px 20px;
                background: #f8f9fa;
                border-bottom: 1px solid #e2e8f0;
            }
            .validator-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px 20px;
            }
            
            /* 요약 통계 */
            .summary-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin-bottom: 12px;
            }
            .stat-box {
                text-align: center;
                padding: 12px;
                border-radius: 8px;
            }
            .stat-box.error { background: #fef2f2; }
            .stat-box.warning { background: #fffbeb; }
            .stat-box.success { background: #f0fdf4; }
            .stat-number {
                font-size: 1.5rem;
                font-weight: 700;
            }
            .stat-box.error .stat-number { color: #dc2626; }
            .stat-box.warning .stat-number { color: #d97706; }
            .stat-box.success .stat-number { color: #16a34a; }
            .stat-label {
                font-size: 0.8rem;
                color: #666;
            }
            
            /* 날짜 탭 */
            .date-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
                flex-wrap: wrap;
            }
            .date-tab {
                padding: 6px 12px;
                border: none;
                background: #e2e8f0;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: all 0.2s;
            }
            .date-tab:hover { background: #cbd5e1; }
            .date-tab.active { background: #3b82f6; color: white; }
            .date-tab.has-error { border: 2px solid #dc2626; }
            .date-tab.has-warning { border: 2px solid #f59e0b; }
            
            /* 이슈 카드 */
            .issue-section {
                margin-bottom: 20px;
            }
            .issue-section-title {
                font-weight: 600;
                font-size: 0.9rem;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .issue-card {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s;
                border-left: 4px solid transparent;
            }
            .issue-card:hover {
                background: #e2e8f0;
                transform: translateX(4px);
            }
            .issue-card.error { border-left-color: #dc2626; background: #fef2f2; }
            .issue-card.warning { border-left-color: #f59e0b; background: #fffbeb; }
            .issue-card.fatigue { border-left-color: #7c3aed; background: #f5f3ff; }
            
            .issue-person {
                font-weight: 600;
                font-size: 0.95rem;
                margin-bottom: 4px;
            }
            .issue-type {
                font-size: 0.8rem;
                color: #666;
                margin-bottom: 6px;
            }
            .issue-details {
                font-size: 0.8rem;
                color: #374151;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .issue-event {
                background: white;
                padding: 4px 8px;
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
            }
            .issue-gap {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-weight: 600;
                font-size: 0.75rem;
            }
            .issue-gap.insufficient { background: #fecaca; color: #dc2626; }
            .issue-gap.tight { background: #fef3c7; color: #d97706; }
            
            .issue-action {
                margin-top: 8px;
                font-size: 0.75rem;
                color: #3b82f6;
            }
            
            /* 검증 완료 상태 */
            .all-clear {
                text-align: center;
                padding: 40px 20px;
            }
            .all-clear-icon {
                font-size: 3rem;
                margin-bottom: 12px;
            }
            .all-clear-text {
                color: #16a34a;
                font-weight: 600;
            }
            
            /* 로딩 */
            .validator-loading {
                text-align: center;
                padding: 40px;
                color: #666;
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================
    // 검증 로직
    // ============================================
    
    /**
     * 전체 검증 실행
     */
    window.runFullValidation = async function() {
        const summaryEl = document.getElementById('validatorSummary');
        const contentEl = document.getElementById('validatorContent');
        
        if (!summaryEl || !contentEl) return;
        
        // 로딩 표시
        contentEl.innerHTML = '<div class="validator-loading">🔄 검증 중...</div>';
        
        // 데이터 수집
        const allDatesData = await collectAllDatesData();
        
        if (!allDatesData || Object.keys(allDatesData).length === 0) {
            contentEl.innerHTML = '<div class="validator-loading">📭 검증할 데이터가 없습니다.</div>';
            summaryEl.innerHTML = '';
            return;
        }
        
        // 날짜별 검증
        const results = {};
        let totalErrors = 0;
        let totalWarnings = 0;
        
        for (const [date, data] of Object.entries(allDatesData)) {
            results[date] = validateDateSchedule(data, date);
            totalErrors += results[date].errors.length + results[date].chairLocks.length;
            totalWarnings += results[date].warnings.length + results[date].fatigue.length;
        }
        
        lastValidationResults = results;
        
        // 요약 표시
        renderValidationSummary(summaryEl, totalErrors, totalWarnings, Object.keys(results).length);
        
        // 결과 표시
        renderValidationResults(contentEl, results);
    };
    
    /**
     * 모든 날짜 데이터 수집
     */
    async function collectAllDatesData() {
        const allData = {};
        const dates = AppConfig.CONFERENCE_DATES || AppState.eventDates || [];
        
        for (const dateInfo of dates) {
            const date = dateInfo.date || dateInfo;
            
            // 현재 날짜면 AppState에서
            if (date === AppState.currentDate) {
                allData[date] = {
                    lectures: AppState.lectures || [],
                    schedule: AppState.schedule || {},
                    sessions: AppState.sessions || [],
                    rooms: AppState.rooms || []
                };
            } else {
                // 다른 날짜면 Firebase에서 로드
                try {
                    if (typeof eventRef === 'function') {
                        const dataRef = eventRef(`data/dataByDate/${date}`);
                        if (dataRef) {
                            const snapshot = await dataRef.once('value');
                            const data = snapshot.val() || {};
                            allData[date] = {
                                lectures: data.lectures || [],
                                schedule: data.schedule || {},
                                sessions: data.sessions || [],
                                rooms: AppConfig.ROOMS_BY_DATE?.[date] || []
                            };
                        }
                    }
                } catch (e) {
                    console.error(`날짜 ${date} 데이터 로드 실패:`, e);
                }
            }
        }
        
        return allData;
    }
    
    /**
     * 단일 날짜 검증
     */
    function validateDateSchedule(data, date) {
        const results = {
            date: date,
            errors: [],
            warnings: [],
            fatigue: [],
            chairLocks: []
        };
        
        // 스케줄에서 강의 정보 추출
        const lectures = [];
        Object.entries(data.schedule || {}).forEach(([key, lecture]) => {
            const [time, ...roomParts] = key.split('-');
            const room = roomParts.join('-');
            
            lectures.push({
                ...lecture,
                _startTime: time,
                _endTime: calculateEndTime(time, lecture.duration || 20),
                _room: room,
                _floor: extractFloor(room)
            });
        });
        
        // 세션에서 좌장 정보 추출
        const sessions = (data.sessions || []).map(session => ({
            ...session,
            floor: extractFloor(session.room),
            endTime: calculateEndTime(session.time, session.duration || 60)
        }));
        
        // 1. 연자별 검증
        const speakerSchedules = groupByPerson(lectures, 'speakerKo');
        
        speakerSchedules.forEach((events, personName) => {
            if (!personName) return;
            
            events.sort((a, b) => timeToMinutes(a._startTime) - timeToMinutes(b._startTime));
            
            // 이동 시간 검증
            for (let i = 0; i < events.length - 1; i++) {
                const current = events[i];
                const next = events[i + 1];
                
                const validation = validateTransition(current, next, personName, '연자');
                if (validation) {
                    if (validation.type === 'error') {
                        results.errors.push(validation);
                    } else {
                        results.warnings.push(validation);
                    }
                }
            }
            
            // 피로도 검증
            if (events.length > CONFIG.MAX_DAILY_LECTURES) {
                results.fatigue.push({
                    person: personName,
                    role: '연자',
                    count: events.length,
                    limit: CONFIG.MAX_DAILY_LECTURES,
                    events: events
                });
            }
        });
        
        // 2. 좌장별 검증
        const chairSchedules = groupChairSessions(sessions);
        
        chairSchedules.forEach((chairSessions, chairName) => {
            if (!chairName) return;
            
            chairSessions.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
            
            for (let i = 0; i < chairSessions.length - 1; i++) {
                const current = chairSessions[i];
                const next = chairSessions[i + 1];
                
                const currentEnd = timeToMinutes(current.endTime);
                const nextStart = timeToMinutes(next.time);
                const gap = nextStart - currentEnd;
                
                if (gap < 0) {
                    results.errors.push({
                        type: 'error',
                        person: chairName,
                        role: '좌장',
                        issue: '세션 시간 중복',
                        event1: { time: `${current.time}-${current.endTime}`, room: current.room, name: current.name },
                        event2: { time: `${next.time}-${next.endTime}`, room: next.room, name: next.name },
                        gap: gap,
                        required: 0
                    });
                } else if (current.floor !== next.floor) {
                    if (gap < CONFIG.FLOOR_TRANSFER_TIME) {
                        results.errors.push({
                            type: 'error',
                            person: chairName,
                            role: '좌장',
                            issue: `층간 이동 시간 부족 (${current.floor}층→${next.floor}층)`,
                            event1: { time: `${current.time}-${current.endTime}`, room: current.room, name: current.name },
                            event2: { time: `${next.time}-${next.endTime}`, room: next.room, name: next.name },
                            gap: gap,
                            required: CONFIG.FLOOR_TRANSFER_TIME
                        });
                    } else if (gap < CONFIG.FLOOR_TRANSFER_TIME + CONFIG.WARNING_BUFFER) {
                        results.warnings.push({
                            type: 'warning',
                            person: chairName,
                            role: '좌장',
                            issue: `층간 이동 촉박 (${current.floor}층→${next.floor}층)`,
                            event1: { time: `${current.time}-${current.endTime}`, room: current.room, name: current.name },
                            event2: { time: `${next.time}-${next.endTime}`, room: next.room, name: next.name },
                            gap: gap,
                            required: CONFIG.FLOOR_TRANSFER_TIME
                        });
                    }
                } else if (current.room !== next.room && gap < CONFIG.ROOM_TRANSFER_TIME) {
                    results.warnings.push({
                        type: 'warning',
                        person: chairName,
                        role: '좌장',
                        issue: '동일층 이동 시간 부족',
                        event1: { time: `${current.time}-${current.endTime}`, room: current.room, name: current.name },
                        event2: { time: `${next.time}-${next.endTime}`, room: next.room, name: next.name },
                        gap: gap,
                        required: CONFIG.ROOM_TRANSFER_TIME
                    });
                }
            }
        });
        
        // 3. 좌장이면서 연자인 경우 (세션 고정 위반)
        validateChairSpeakerLocks(lectures, sessions, results);
        
        return results;
    }
    
    /**
     * 연자별 그룹화
     */
    function groupByPerson(lectures, field) {
        const groups = new Map();
        
        lectures.forEach(lecture => {
            const name = lecture[field];
            if (!name) return;
            
            if (!groups.has(name)) {
                groups.set(name, []);
            }
            groups.get(name).push(lecture);
        });
        
        return groups;
    }
    
    /**
     * 좌장별 세션 그룹화
     */
    function groupChairSessions(sessions) {
        const groups = new Map();
        
        sessions.forEach(session => {
            const name = session.moderator;
            if (!name) return;
            
            if (!groups.has(name)) {
                groups.set(name, []);
            }
            groups.get(name).push(session);
        });
        
        return groups;
    }
    
    /**
     * 이동 시간 검증
     */
    function validateTransition(current, next, personName, role) {
        const currentEnd = timeToMinutes(current._endTime);
        const nextStart = timeToMinutes(next._startTime);
        const gap = nextStart - currentEnd;
        
        // 시간 겹침
        if (gap < 0) {
            return {
                type: 'error',
                person: personName,
                role: role,
                issue: '시간 중복',
                event1: { time: `${current._startTime}-${current._endTime}`, room: current._room, title: current.titleKo },
                event2: { time: `${next._startTime}-${next._endTime}`, room: next._room, title: next.titleKo },
                gap: gap,
                required: 0,
                lectureId1: current.id,
                lectureId2: next.id
            };
        }
        
        // 같은 룸이면 스킵
        if (current._room === next._room) return null;
        
        const currentFloor = current._floor;
        const nextFloor = next._floor;
        
        // 층간 이동
        if (currentFloor !== nextFloor) {
            if (gap < CONFIG.FLOOR_TRANSFER_TIME) {
                return {
                    type: 'error',
                    person: personName,
                    role: role,
                    issue: `층간 이동 시간 부족 (${currentFloor}층→${nextFloor}층)`,
                    event1: { time: `${current._startTime}-${current._endTime}`, room: current._room, title: current.titleKo },
                    event2: { time: `${next._startTime}-${next._endTime}`, room: next._room, title: next.titleKo },
                    gap: gap,
                    required: CONFIG.FLOOR_TRANSFER_TIME,
                    lectureId1: current.id,
                    lectureId2: next.id
                };
            } else if (gap < CONFIG.FLOOR_TRANSFER_TIME + CONFIG.WARNING_BUFFER) {
                return {
                    type: 'warning',
                    person: personName,
                    role: role,
                    issue: `층간 이동 촉박 (${currentFloor}층→${nextFloor}층)`,
                    event1: { time: `${current._startTime}-${current._endTime}`, room: current._room, title: current.titleKo },
                    event2: { time: `${next._startTime}-${next._endTime}`, room: next._room, title: next.titleKo },
                    gap: gap,
                    required: CONFIG.FLOOR_TRANSFER_TIME,
                    lectureId1: current.id,
                    lectureId2: next.id
                };
            }
        }
        // 동일층 다른 룸
        else if (gap < CONFIG.ROOM_TRANSFER_TIME) {
            return {
                type: 'warning',
                person: personName,
                role: role,
                issue: '동일층 이동 시간 부족',
                event1: { time: `${current._startTime}-${current._endTime}`, room: current._room, title: current.titleKo },
                event2: { time: `${next._startTime}-${next._endTime}`, room: next._room, title: next.titleKo },
                gap: gap,
                required: CONFIG.ROOM_TRANSFER_TIME,
                lectureId1: current.id,
                lectureId2: next.id
            };
        }
        
        return null;
    }
    
    /**
     * 좌장+연자 세션 고정 위반 검증
     */
    function validateChairSpeakerLocks(lectures, sessions, results) {
        const chairSessionMap = new Map();
        
        sessions.forEach(session => {
            if (!session.moderator) return;
            
            if (!chairSessionMap.has(session.moderator)) {
                chairSessionMap.set(session.moderator, []);
            }
            chairSessionMap.get(session.moderator).push(session);
        });
        
        lectures.forEach(lecture => {
            const speaker = lecture.speakerKo;
            if (!speaker || !chairSessionMap.has(speaker)) return;
            
            const chairSessions = chairSessionMap.get(speaker);
            const lectureStart = timeToMinutes(lecture._startTime);
            const lectureEnd = timeToMinutes(lecture._endTime);
            
            chairSessions.forEach(session => {
                // 같은 룸이면 OK
                if (lecture._room === session.room) return;
                
                const sessionStart = timeToMinutes(session.time);
                const sessionEnd = timeToMinutes(session.endTime);
                
                // 시간 겹침 확인
                if (lectureStart < sessionEnd && lectureEnd > sessionStart) {
                    results.chairLocks.push({
                        person: speaker,
                        issue: '좌장 세션 중 다른 장소 강의',
                        chairSession: {
                            time: `${session.time}-${session.endTime}`,
                            room: session.room,
                            name: session.name
                        },
                        conflictLecture: {
                            time: `${lecture._startTime}-${lecture._endTime}`,
                            room: lecture._room,
                            title: lecture.titleKo
                        },
                        lectureId: lecture.id
                    });
                }
            });
        });
    }

    // ============================================
    // 유틸리티
    // ============================================
    
    function timeToMinutes(time) {
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    }
    
    function calculateEndTime(startTime, duration) {
        if (!startTime) return '';
        const startMin = timeToMinutes(startTime);
        const endMin = startMin + (duration || 20);
        const h = Math.floor(endMin / 60);
        const m = endMin % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    
    function extractFloor(roomName) {
        if (!roomName) return 1;
        const match = roomName.match(/(\d+)층/);
        return match ? parseInt(match[1]) : 1;
    }
    
    function formatDateLabel(date) {
        const dateInfo = (AppConfig.CONFERENCE_DATES || []).find(d => d.date === date);
        return dateInfo?.label || date;
    }

    // ============================================
    // 렌더링
    // ============================================
    
    /**
     * 요약 렌더링
     */
    function renderValidationSummary(container, totalErrors, totalWarnings, dateCount) {
        const isAllClear = totalErrors === 0 && totalWarnings === 0;
        
        container.innerHTML = `
            <div class="summary-stats">
                <div class="stat-box ${totalErrors > 0 ? 'error' : 'success'}">
                    <div class="stat-number">${totalErrors}</div>
                    <div class="stat-label">에러</div>
                </div>
                <div class="stat-box ${totalWarnings > 0 ? 'warning' : 'success'}">
                    <div class="stat-number">${totalWarnings}</div>
                    <div class="stat-label">경고</div>
                </div>
                <div class="stat-box success">
                    <div class="stat-number">${dateCount}</div>
                    <div class="stat-label">검증 날짜</div>
                </div>
            </div>
            ${isAllClear ? '<div style="text-align: center; color: #16a34a; font-weight: 600;">✅ 모든 동선 검증 통과!</div>' : ''}
        `;
    }
    
    /**
     * 결과 렌더링
     */
    function renderValidationResults(container, results) {
        const dates = Object.keys(results);
        
        if (dates.length === 0) {
            container.innerHTML = '<div class="validator-loading">검증할 데이터가 없습니다.</div>';
            return;
        }
        
        // 모든 날짜에 이슈가 없으면
        const hasAnyIssue = dates.some(date => {
            const r = results[date];
            return r.errors.length > 0 || r.warnings.length > 0 || r.fatigue.length > 0 || r.chairLocks.length > 0;
        });
        
        if (!hasAnyIssue) {
            container.innerHTML = `
                <div class="all-clear">
                    <div class="all-clear-icon">🎉</div>
                    <div class="all-clear-text">모든 동선이 정상입니다!</div>
                    <p style="color: #666; margin-top: 8px;">충돌이나 경고 없이 스케줄이 구성되었습니다.</p>
                </div>
            `;
            return;
        }
        
        // 날짜 탭
        let html = '<div class="date-tabs">';
        dates.forEach((date, index) => {
            const r = results[date];
            const hasError = r.errors.length > 0 || r.chairLocks.length > 0;
            const hasWarning = r.warnings.length > 0 || r.fatigue.length > 0;
            
            html += `
                <button class="date-tab ${index === 0 ? 'active' : ''} ${hasError ? 'has-error' : hasWarning ? 'has-warning' : ''}"
                        onclick="showDateValidation('${date}')" data-date="${date}">
                    ${formatDateLabel(date)}
                    ${hasError ? '❌' : hasWarning ? '⚠️' : '✅'}
                </button>
            `;
        });
        html += '</div>';
        
        // 날짜별 결과 컨테이너
        dates.forEach((date, index) => {
            html += `<div class="date-result" id="dateResult_${date}" style="${index > 0 ? 'display: none;' : ''}">`;
            html += renderDateIssues(results[date]);
            html += '</div>';
        });
        
        container.innerHTML = html;
    }
    
    /**
     * 날짜별 이슈 렌더링
     */
    function renderDateIssues(result) {
        let html = '';
        
        // 에러
        if (result.errors.length > 0) {
            html += `
                <div class="issue-section">
                    <div class="issue-section-title">
                        <span style="color: #dc2626;">❌ 동선 충돌 (${result.errors.length}건)</span>
                    </div>
            `;
            result.errors.forEach(err => {
                html += renderIssueCard(err, 'error', result.date);
            });
            html += '</div>';
        }
        
        // 좌장 고정 위반
        if (result.chairLocks.length > 0) {
            html += `
                <div class="issue-section">
                    <div class="issue-section-title">
                        <span style="color: #dc2626;">🔒 좌장 고정 위반 (${result.chairLocks.length}건)</span>
                    </div>
            `;
            result.chairLocks.forEach(lock => {
                html += renderChairLockCard(lock, result.date);
            });
            html += '</div>';
        }
        
        // 경고
        if (result.warnings.length > 0) {
            html += `
                <div class="issue-section">
                    <div class="issue-section-title">
                        <span style="color: #d97706;">⚠️ 이동 시간 촉박 (${result.warnings.length}건)</span>
                    </div>
            `;
            result.warnings.forEach(warn => {
                html += renderIssueCard(warn, 'warning', result.date);
            });
            html += '</div>';
        }
        
        // 피로도
        if (result.fatigue.length > 0) {
            html += `
                <div class="issue-section">
                    <div class="issue-section-title">
                        <span style="color: #7c3aed;">😰 피로도 경고 (${result.fatigue.length}건)</span>
                    </div>
            `;
            result.fatigue.forEach(f => {
                html += renderFatigueCard(f, result.date);
            });
            html += '</div>';
        }
        
        if (html === '') {
            html = `
                <div class="all-clear" style="padding: 20px;">
                    <div style="color: #16a34a;">✅ 이 날짜는 동선 문제가 없습니다.</div>
                </div>
            `;
        }
        
        return html;
    }
    
    /**
     * 이슈 카드 렌더링
     */
    function renderIssueCard(issue, type, date) {
        const gapClass = issue.gap < 0 ? 'insufficient' : issue.gap < issue.required ? 'insufficient' : 'tight';
        
        return `
            <div class="issue-card ${type}" onclick="navigateToLecture('${date}', ${issue.lectureId2 || issue.lectureId1 || 0})">
                <div class="issue-person">${issue.person} <span style="font-weight: normal; color: #666;">(${issue.role})</span></div>
                <div class="issue-type">${issue.issue}</div>
                <div class="issue-details">
                    <div class="issue-event">
                        <span>① ${issue.event1.time}</span>
                        <span style="color: #666; font-size: 0.75rem;">${truncateRoom(issue.event1.room)}</span>
                    </div>
                    <div class="issue-event">
                        <span>② ${issue.event2.time}</span>
                        <span style="color: #666; font-size: 0.75rem;">${truncateRoom(issue.event2.room)}</span>
                    </div>
                </div>
                <div style="margin-top: 8px;">
                    <span class="issue-gap ${gapClass}">간격: ${issue.gap}분</span>
                    <span style="font-size: 0.75rem; color: #666; margin-left: 8px;">필요: ${issue.required}분</span>
                </div>
                <div class="issue-action">클릭하여 수정 →</div>
            </div>
        `;
    }
    
    /**
     * 좌장 고정 카드 렌더링
     */
    function renderChairLockCard(lock, date) {
        return `
            <div class="issue-card error" onclick="navigateToLecture('${date}', ${lock.lectureId || 0})">
                <div class="issue-person">${lock.person} <span style="font-weight: normal; color: #666;">(좌장+연자)</span></div>
                <div class="issue-type">${lock.issue}</div>
                <div class="issue-details">
                    <div class="issue-event">
                        <span>좌장 세션: ${lock.chairSession.time}</span>
                        <span style="color: #666; font-size: 0.75rem;">${truncateRoom(lock.chairSession.room)}</span>
                    </div>
                    <div class="issue-event" style="background: #fef2f2;">
                        <span>❌ 강의: ${lock.conflictLecture.time}</span>
                        <span style="color: #666; font-size: 0.75rem;">${truncateRoom(lock.conflictLecture.room)}</span>
                    </div>
                </div>
                <div class="issue-action">클릭하여 수정 →</div>
            </div>
        `;
    }
    
    /**
     * 피로도 카드 렌더링
     */
    function renderFatigueCard(fatigue, date) {
        return `
            <div class="issue-card fatigue">
                <div class="issue-person">${fatigue.person} <span style="font-weight: normal; color: #666;">(${fatigue.role})</span></div>
                <div class="issue-type">일일 강연 ${fatigue.count}회 (제한: ${fatigue.limit}회)</div>
                <div style="margin-top: 8px; font-size: 0.8rem; color: #7c3aed;">
                    ${fatigue.count - fatigue.limit}회 초과
                </div>
            </div>
        `;
    }
    
    /**
     * 룸명 축약
     */
    function truncateRoom(room) {
        if (!room) return '';
        // (토)1층 제거
        let name = room.replace(/^\([토일]\)\d층\s*/, '');
        if (name.length > 20) {
            name = name.substring(0, 17) + '...';
        }
        return name;
    }
    
    /**
     * 날짜별 결과 표시 전환
     */
    window.showDateValidation = function(date) {
        // 탭 활성화
        document.querySelectorAll('.date-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.date === date);
        });
        
        // 결과 표시
        document.querySelectorAll('.date-result').forEach(div => {
            div.style.display = div.id === `dateResult_${date}` ? 'block' : 'none';
        });
    };
    
    /**
     * 강의로 이동 (편집 모달 열기)
     */
    window.navigateToLecture = function(date, lectureId) {
        if (!lectureId) {
            Toast.warning('해당 강의를 찾을 수 없습니다.');
            return;
        }
        
        // 날짜 전환 필요시
        if (date !== AppState.currentDate) {
            if (typeof switchDate === 'function') {
                switchDate(date);
            }
            // 날짜 전환 후 약간의 딜레이
            setTimeout(() => {
                openLectureEditor(lectureId);
            }, 500);
        } else {
            openLectureEditor(lectureId);
        }
    };
    
    /**
     * 강의 편집 모달 열기
     */
    function openLectureEditor(lectureId) {
        // 기존 모달 함수 사용
        if (typeof openEditModal === 'function') {
            openEditModal(lectureId);
        } else {
            Toast.info(`강의 ID: ${lectureId} - 편집 모달을 열 수 없습니다.`);
        }
        
        // 검증 패널은 열어둠 (비교하면서 수정 가능)
    }

    // ============================================
    // 리포트 내보내기
    // ============================================
    
    /**
     * 검증 리포트 Excel 다운로드
     */
    window.exportValidationReport = function() {
        if (!lastValidationResults) {
            Toast.warning('먼저 검증을 실행해주세요.');
            return;
        }
        
        const reportData = [];
        
        // 헤더
        reportData.push(['날짜', '유형', '이름', '역할', '문제', '이벤트1', '이벤트2', '간격(분)', '필요(분)']);
        
        Object.entries(lastValidationResults).forEach(([date, result]) => {
            // 에러
            result.errors.forEach(err => {
                reportData.push([
                    date,
                    '에러',
                    err.person,
                    err.role,
                    err.issue,
                    `${err.event1.time} ${err.event1.room}`,
                    `${err.event2.time} ${err.event2.room}`,
                    err.gap,
                    err.required
                ]);
            });
            
            // 좌장 고정
            result.chairLocks.forEach(lock => {
                reportData.push([
                    date,
                    '에러',
                    lock.person,
                    '좌장+연자',
                    lock.issue,
                    `좌장: ${lock.chairSession.time} ${lock.chairSession.room}`,
                    `강의: ${lock.conflictLecture.time} ${lock.conflictLecture.room}`,
                    '-',
                    '-'
                ]);
            });
            
            // 경고
            result.warnings.forEach(warn => {
                reportData.push([
                    date,
                    '경고',
                    warn.person,
                    warn.role,
                    warn.issue,
                    `${warn.event1.time} ${warn.event1.room}`,
                    `${warn.event2.time} ${warn.event2.room}`,
                    warn.gap,
                    warn.required
                ]);
            });
            
            // 피로도
            result.fatigue.forEach(f => {
                reportData.push([
                    date,
                    '경고',
                    f.person,
                    f.role,
                    `피로도 초과 (${f.count}회/${f.limit}회)`,
                    '-',
                    '-',
                    '-',
                    '-'
                ]);
            });
        });
        
        if (reportData.length === 1) {
            Toast.info('모든 동선이 정상입니다. 리포트할 내용이 없습니다.');
            return;
        }
        
        const ws = XLSX.utils.aoa_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Validation Report');
        
        XLSX.writeFile(wb, `동선검증_리포트_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        Toast.success('리포트 다운로드 완료');
    };

})();

console.log('✅ schedule-validator.js 로드 완료');
