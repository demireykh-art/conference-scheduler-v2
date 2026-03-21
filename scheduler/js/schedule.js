/**
 * schedule.js - 시간표 관리 모듈
 * 
 * 기능:
 * - 시간표 테이블 생성 (rowspan 지원)
 * - 헤더/시간열 고정 (sticky)
 * - 드래그 앤 드롭
 * - 더블클릭 편집
 */

(function() {
    'use strict';

    // ============================================
    // 시간표 테이블 생성
    // ============================================
    
    /**
     * 시간표 테이블 생성 (메인 함수)
     */
    window.createScheduleTable = function() {
        const container = document.getElementById('scheduleTable');
        if (!container) return;
        
        const rooms = AppState.rooms || [];
        const timeSettings = AppConfig.TIME_SETTINGS || { start: '08:30', end: '18:00', interval: 5 };
        
        if (rooms.length === 0) {
            container.innerHTML = '<div class="empty-state">룸이 설정되지 않았습니다.</div>';
            return;
        }
        
        const timeSlots = generateTimeSlots(timeSettings.start, timeSettings.end, timeSettings.interval);
        
        // 현재 탭 확인
        const currentTab = AppState.currentRoomTab || 'all';
        
        let html = '';
        
        if (currentTab === 'all') {
            // 전체 뷰 - 모든 룸 가로 배열
            html = createAllRoomsTable(rooms, timeSlots);
        } else {
            // 단일 룸 뷰
            html = createSingleRoomTable(currentTab, timeSlots);
        }
        
        container.innerHTML = html;
        
        // 스케줄 데이터 표시
        updateScheduleDisplay();
    };
    
    /**
     * 전체 룸 테이블 생성
     */
    function createAllRoomsTable(rooms, timeSlots) {
        let html = `
            <div class="schedule-wrapper">
                <table class="schedule-table" id="scheduleGrid">
                    <thead>
                        <tr>
                            <th class="time-header sticky-col sticky-header">시간</th>
                            ${rooms.map(room => `
                                <th class="room-header sticky-header" title="${room}">
                                    ${formatRoomName(room)}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        timeSlots.forEach(time => {
            html += `
                <tr data-time="${time}">
                    <td class="time-cell sticky-col">${time}</td>
                    ${rooms.map(room => `
                        <td class="schedule-cell" 
                            data-time="${time}" 
                            data-room="${room}"
                            ondragover="handleDragOver(event)"
                            ondragleave="handleDragLeave(event)"
                            ondrop="handleDrop(event, '${time}', '${room.replace(/'/g, "\\'")}')">
                        </td>
                    `).join('')}
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        return html;
    }
    
    /**
     * 단일 룸 테이블 생성 (세로형)
     */
    function createSingleRoomTable(roomName, timeSlots) {
        let html = `
            <div class="schedule-wrapper single-room">
                <h3 class="room-title">${roomName}</h3>
                <table class="schedule-table single" id="scheduleGrid">
                    <thead>
                        <tr>
                            <th class="time-header sticky-col sticky-header">시간</th>
                            <th class="room-header sticky-header">강의</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        timeSlots.forEach(time => {
            html += `
                <tr data-time="${time}">
                    <td class="time-cell sticky-col">${time}</td>
                    <td class="schedule-cell" 
                        data-time="${time}" 
                        data-room="${roomName}"
                        ondragover="handleDragOver(event)"
                        ondragleave="handleDragLeave(event)"
                        ondrop="handleDrop(event, '${time}', '${roomName.replace(/'/g, "\\'")}')">
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        return html;
    }
    
    /**
     * 시간 슬롯 생성
     */
    function generateTimeSlots(start, end, interval) {
        const slots = [];
        let [startH, startM] = start.split(':').map(Number);
        let [endH, endM] = end.split(':').map(Number);
        
        let current = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        
        while (current <= endMinutes) {
            const h = Math.floor(current / 60);
            const m = current % 60;
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            current += interval;
        }
        
        return slots;
    }
    
    /**
     * 룸 이름 포맷팅 (축약)
     */
    function formatRoomName(room) {
        // (토)1층 제거하고 축약
        let name = room.replace(/^\([토일]\)\d층\s*/, '');
        if (name.length > 15) {
            name = name.substring(0, 12) + '...';
        }
        return name;
    }

    // ============================================
    // 스케줄 표시 (rowspan 지원)
    // ============================================
    
    /**
     * 스케줄 데이터 표시
     */
    window.updateScheduleDisplay = function() {
        const schedule = AppState.schedule || {};
        const interval = AppConfig.TIME_SETTINGS?.interval || 5;
        
        // 모든 셀 초기화
        document.querySelectorAll('.schedule-cell').forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('has-lecture', 'spanned');
            cell.style.display = '';
            cell.removeAttribute('rowspan');
        });
        
        // 각 스케줄 항목 표시
        Object.entries(schedule).forEach(([key, lecture]) => {
            const [time, ...roomParts] = key.split('-');
            const room = roomParts.join('-');
            
            const cell = document.querySelector(`.schedule-cell[data-time="${time}"][data-room="${room}"]`);
            if (!cell) return;
            
            const duration = lecture.duration || 20;
            const rowspan = Math.ceil(duration / interval);
            
            // rowspan 설정
            if (rowspan > 1) {
                cell.setAttribute('rowspan', rowspan);
                
                // 병합될 셀들 숨기기
                hideSpannedCells(time, room, rowspan, interval);
            }
            
            cell.classList.add('has-lecture');
            cell.innerHTML = createLectureCard(lecture, time, room);
        });
    };
    
    /**
     * rowspan으로 병합될 셀 숨기기
     */
    function hideSpannedCells(startTime, room, rowspan, interval) {
        const [h, m] = startTime.split(':').map(Number);
        let currentMinutes = h * 60 + m;
        
        for (let i = 1; i < rowspan; i++) {
            currentMinutes += interval;
            const nextH = Math.floor(currentMinutes / 60);
            const nextM = currentMinutes % 60;
            const nextTime = `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;
            
            const cell = document.querySelector(`.schedule-cell[data-time="${nextTime}"][data-room="${room}"]`);
            if (cell) {
                cell.style.display = 'none';
                cell.classList.add('spanned');
            }
        }
    }
    
    /**
     * 강의 카드 HTML 생성
     */
    function createLectureCard(lecture, time, room) {
        const endTime = calculateEndTime(time, lecture.duration || 20);
        const categoryClass = getCategoryClass(lecture.category);
        const isLuncheon = lecture.isLuncheon || lecture.companyName === '학회강의';
        
        return `
            <div class="lecture-card ${categoryClass} ${isLuncheon ? 'luncheon' : 'sponsored'}"
                 draggable="true"
                 ondragstart="handleScheduleDragStart(event, '${time}', '${room.replace(/'/g, "\\'")}')"
                 ondragend="handleDragEnd(event)"
                 ondblclick="openLectureEditModal('${time}', '${room.replace(/'/g, "\\'")}')"
                 title="더블클릭하여 수정">
                <div class="lecture-time">${time}-${endTime} (${lecture.duration || 20}분)</div>
                <div class="lecture-title">${lecture.titleKo || '제목 없음'}</div>
                <div class="lecture-speaker">${lecture.speakerKo || ''}</div>
                <div class="lecture-affiliation">${lecture.affiliation || ''}</div>
                ${!isLuncheon ? `<div class="lecture-company">🏢 ${lecture.companyName || ''}</div>` : ''}
                <div class="lecture-category">${lecture.category || ''}</div>
            </div>
        `;
    }
    
    /**
     * 종료 시간 계산
     */
    function calculateEndTime(startTime, duration) {
        const [h, m] = startTime.split(':').map(Number);
        const totalMinutes = h * 60 + m + duration;
        const endH = Math.floor(totalMinutes / 60);
        const endM = totalMinutes % 60;
        return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }
    
    /**
     * 카테고리 클래스
     */
    function getCategoryClass(category) {
        if (!category) return '';
        return 'category-' + category.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    // ============================================
    // 드래그 앤 드롭
    // ============================================
    
    window.handleDragStart = function(e, lecture) {
        AppState.draggedLecture = lecture;
        AppState.draggedScheduleKey = null;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(lecture));
    };
    
    window.handleScheduleDragStart = function(e, time, room) {
        const key = `${time}-${room}`;
        AppState.draggedScheduleKey = key;
        AppState.draggedLecture = AppState.schedule[key];
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    };
    
    window.handleDragEnd = function(e) {
        e.target.classList.remove('dragging');
        AppState.draggedLecture = null;
        AppState.draggedScheduleKey = null;
        document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    };
    
    window.handleDragOver = function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drop-target');
    };
    
    window.handleDragLeave = function(e) {
        e.currentTarget.classList.remove('drop-target');
    };
    
    window.handleDrop = async function(e, time, room) {
        e.preventDefault();
        e.currentTarget.classList.remove('drop-target');
        
        const lecture = AppState.draggedLecture;
        if (!lecture) return;
        
        const newKey = `${time}-${room}`;
        
        // 이미 강의가 있는지 확인
        if (AppState.schedule[newKey] && AppState.draggedScheduleKey !== newKey) {
            Toast.warning('이미 강의가 배치되어 있습니다.');
            return;
        }
        
        // 기존 위치에서 제거
        if (AppState.draggedScheduleKey) {
            delete AppState.schedule[AppState.draggedScheduleKey];
        }
        
        // 새 위치에 배치
        AppState.schedule[newKey] = { ...lecture };
        
        // Firebase 저장
        await saveScheduleToFirebase();
        
        // UI 업데이트
        updateScheduleDisplay();
        
        Toast.success('강의가 이동되었습니다.');
    };

    // ============================================
    // 강의 편집 모달
    // ============================================
    
    /**
     * 강의 편집 모달 열기 (시간표에서 더블클릭)
     */
    window.openLectureEditModal = function(time, room) {
        const key = `${time}-${room}`;
        const lecture = AppState.schedule[key];
        
        if (!lecture) {
            Toast.warning('강의 정보를 찾을 수 없습니다.');
            return;
        }
        
        // 편집 모달 생성 또는 가져오기
        let modal = document.getElementById('lectureEditModal');
        if (!modal) {
            modal = createLectureEditModal();
            document.body.appendChild(modal);
        }
        
        // 현재 편집 중인 키 저장
        AppState.editingScheduleKey = key;
        
        // 폼에 데이터 채우기
        fillEditForm(lecture, time, room);
        
        modal.classList.add('active');
    };
    
    /**
     * 강의 편집 모달 생성
     */
    function createLectureEditModal() {
        const modal = document.createElement('div');
        modal.id = 'lectureEditModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>📝 강의 수정</h2>
                    <button class="btn btn-secondary btn-small" onclick="closeLectureEditModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>시작 시간</label>
                            <input type="time" id="editLectureTime" class="form-control">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>강의 시간 (분)</label>
                            <input type="number" id="editLectureDuration" class="form-control" value="20" min="5" step="5">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>룸</label>
                        <select id="editLectureRoom" class="form-control">
                            <!-- 동적으로 채워짐 -->
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>제목</label>
                        <input type="text" id="editLectureTitle" class="form-control" placeholder="강의 제목">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>연자</label>
                            <input type="text" id="editLectureSpeaker" class="form-control" placeholder="연자명">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>소속</label>
                            <input type="text" id="editLectureAffiliation" class="form-control" placeholder="병원/소속">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>업체</label>
                            <input type="text" id="editLectureCompany" class="form-control" placeholder="업체명 또는 학회강의">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>제품</label>
                            <input type="text" id="editLectureProduct" class="form-control" placeholder="제품명">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>카테고리</label>
                        <select id="editLectureCategory" class="form-control">
                            <option value="">선택</option>
                            <option value="Injectables">Injectables</option>
                            <option value="Bio-Stimulators">Bio-Stimulators</option>
                            <option value="Threads">Threads</option>
                            <option value="Laser-EBDs">Laser & EBDs</option>
                            <option value="Problem-solving">Problem-solving</option>
                            <option value="Facial contouring">Facial contouring</option>
                            <option value="Panel Discussion">Panel Discussion</option>
                            <option value="Coffee Break">Coffee Break</option>
                            <option value="Lunch">Lunch</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger" onclick="deleteLectureFromSchedule()">🗑️ 삭제</button>
                    <button class="btn btn-secondary" onclick="closeLectureEditModal()">취소</button>
                    <button class="btn btn-primary" onclick="saveLectureEdit()">저장</button>
                </div>
            </div>
        `;
        
        // 스타일 추가
        addEditModalStyles();
        
        return modal;
    }
    
    /**
     * 편집 폼 채우기
     */
    function fillEditForm(lecture, time, room) {
        document.getElementById('editLectureTime').value = time;
        document.getElementById('editLectureDuration').value = lecture.duration || 20;
        document.getElementById('editLectureTitle').value = lecture.titleKo || '';
        document.getElementById('editLectureSpeaker').value = lecture.speakerKo || '';
        document.getElementById('editLectureAffiliation').value = lecture.affiliation || '';
        document.getElementById('editLectureCompany').value = lecture.companyName || '';
        document.getElementById('editLectureProduct').value = lecture.productName || '';
        document.getElementById('editLectureCategory').value = lecture.category || '';
        
        // 룸 선택 옵션 채우기
        const roomSelect = document.getElementById('editLectureRoom');
        roomSelect.innerHTML = (AppState.rooms || []).map(r => 
            `<option value="${r}" ${r === room ? 'selected' : ''}>${formatRoomName(r)}</option>`
        ).join('');
    }
    
    /**
     * 편집 모달 닫기
     */
    window.closeLectureEditModal = function() {
        const modal = document.getElementById('lectureEditModal');
        if (modal) modal.classList.remove('active');
        AppState.editingScheduleKey = null;
    };
    
    /**
     * 강의 수정 저장
     */
    window.saveLectureEdit = async function() {
        const oldKey = AppState.editingScheduleKey;
        if (!oldKey) return;
        
        const newTime = document.getElementById('editLectureTime').value;
        const newRoom = document.getElementById('editLectureRoom').value;
        const newKey = `${newTime}-${newRoom}`;
        
        // 같은 위치가 아니고, 새 위치에 이미 강의가 있으면
        if (oldKey !== newKey && AppState.schedule[newKey]) {
            Toast.warning('해당 시간/룸에 이미 강의가 있습니다.');
            return;
        }
        
        const updatedLecture = {
            ...AppState.schedule[oldKey],
            titleKo: document.getElementById('editLectureTitle').value,
            speakerKo: document.getElementById('editLectureSpeaker').value,
            affiliation: document.getElementById('editLectureAffiliation').value,
            companyName: document.getElementById('editLectureCompany').value,
            productName: document.getElementById('editLectureProduct').value,
            category: document.getElementById('editLectureCategory').value,
            duration: parseInt(document.getElementById('editLectureDuration').value) || 20,
            isLuncheon: document.getElementById('editLectureCompany').value === '학회강의' || !document.getElementById('editLectureCompany').value
        };
        
        // 위치가 변경되었으면 기존 키 삭제
        if (oldKey !== newKey) {
            delete AppState.schedule[oldKey];
        }
        
        // 새 위치에 저장
        AppState.schedule[newKey] = updatedLecture;
        
        // lectures 배열도 업데이트
        updateLecturesArray(updatedLecture);
        
        // Firebase 저장
        await saveScheduleToFirebase();
        
        // UI 업데이트
        updateScheduleDisplay();
        if (typeof updateLectureList === 'function') updateLectureList();
        
        closeLectureEditModal();
        Toast.success('강의가 수정되었습니다.');
    };
    
    /**
     * 강의 삭제
     */
    window.deleteLectureFromSchedule = async function() {
        const key = AppState.editingScheduleKey;
        if (!key) return;
        
        if (!confirm('이 강의를 삭제하시겠습니까?')) return;
        
        const lecture = AppState.schedule[key];
        
        // 스케줄에서 삭제
        delete AppState.schedule[key];
        
        // lectures 배열에서도 삭제
        if (lecture && lecture.id) {
            AppState.lectures = (AppState.lectures || []).filter(l => l.id !== lecture.id);
        }
        
        // Firebase 저장
        await saveScheduleToFirebase();
        
        // UI 업데이트
        updateScheduleDisplay();
        if (typeof updateLectureList === 'function') updateLectureList();
        
        closeLectureEditModal();
        Toast.success('강의가 삭제되었습니다.');
    };
    
    /**
     * lectures 배열 업데이트
     */
    function updateLecturesArray(updatedLecture) {
        if (!updatedLecture.id) return;
        
        const index = (AppState.lectures || []).findIndex(l => l.id === updatedLecture.id);
        if (index >= 0) {
            AppState.lectures[index] = { ...AppState.lectures[index], ...updatedLecture };
        }
    }
    
    /**
     * Firebase에 스케줄 저장
     */
    async function saveScheduleToFirebase() {
        if (typeof eventRef !== 'function') return;
        
        try {
            const scheduleRef = eventRef(`data/dataByDate/${AppState.currentDate}/schedule`);
            if (scheduleRef) {
                await scheduleRef.set(AppState.schedule);
            }
            
            const lecturesRef = eventRef(`data/dataByDate/${AppState.currentDate}/lectures`);
            if (lecturesRef) {
                await lecturesRef.set(AppState.lectures);
            }
        } catch (error) {
            console.error('Firebase 저장 실패:', error);
            Toast.error('저장 실패: ' + error.message);
        }
    }
    
    /**
     * 편집 모달 스타일
     */
    function addEditModalStyles() {
        if (document.getElementById('editModalStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'editModalStyles';
        style.textContent = `
            .form-row {
                display: flex;
                gap: 16px;
            }
            .form-row .form-group {
                margin-bottom: 16px;
            }
        `;
        document.head.appendChild(style);
    }

})();

console.log('✅ schedule.js 로드 완료');
