/* ============================================
 * V3 패치 3.1.0 - 세션 룸 선택 + 룸별 시간
 * 
 * 적용 방법:
 * 1. 이 파일을 patches/patch-3.1.0.js로 저장
 * 2. scheduler.html 맨 끝 </body> 바로 위에 추가:
 *    <script src="patches/patch-3.1.0.js"></script>
 * 3. GitHub 업로드
 * 4. Ctrl+F5 새로고침
 * 
 * 변경사항:
 * - 세션에 룸 선택 기능 추가
 * - Break에 룸 선택 기능 추가
 * - 룸별 시간대 설정 (추후 확장 준비)
 * ============================================ */

if (typeof App !== 'undefined') {
    console.log('🔧 패치 3.1.0 적용 중...');
    
    // ===== 1. 세션 모달에 룸 선택 추가 =====
    const originalOpenSessionModal = App.openSessionModal;
    App.openSessionModal = function() {
        this.editingId = null;
        document.getElementById('sessionModalTitle').textContent = '세션 추가';
        document.getElementById('sessionName').value = '';
        document.getElementById('sessionTime').value = '';
        
        // 좌장 선택
        const chairSelect = document.getElementById('sessionChair');
        chairSelect.innerHTML = '<option value="">선택 안 함</option>';
        Object.entries(this.eventData.speakers).forEach(([id, speaker]) => {
            chairSelect.innerHTML += `<option value="${id}">${speaker.name}</option>`;
        });
        
        // ✨ 룸 선택 추가
        let roomSelect = document.getElementById('sessionRoom');
        if (!roomSelect) {
            // 룸 선택 필드가 없으면 생성
            const chairGroup = document.querySelector('#sessionModal .modal-body .form-group:nth-child(2)');
            const roomGroup = document.createElement('div');
            roomGroup.className = 'form-group';
            roomGroup.innerHTML = `
                <label>룸 *</label>
                <select id="sessionRoom" class="form-control">
                    <option value="">룸 선택</option>
                </select>
            `;
            chairGroup.after(roomGroup);
            roomSelect = document.getElementById('sessionRoom');
        }
        
        // 룸 목록 채우기
        roomSelect.innerHTML = '<option value="">룸 선택</option>';
        (this.eventData.settings.rooms || []).forEach(room => {
            roomSelect.innerHTML += `<option value="${room}">${room}</option>`;
        });
        
        document.getElementById('sessionModal').classList.add('active');
    };
    
    // ===== 2. 세션 저장 시 룸 정보 포함 =====
    App.saveSession = async function() {
        const name = document.getElementById('sessionName').value.trim();
        const time = document.getElementById('sessionTime').value;
        const room = document.getElementById('sessionRoom').value;
        
        if (!name) {
            Toast.warning('세션명을 입력해주세요');
            return;
        }
        
        if (!time) {
            Toast.warning('시작 시간을 입력해주세요');
            return;
        }
        
        if (!room) {
            Toast.warning('룸을 선택해주세요');
            return;
        }
        
        const sessionData = {
            name,
            chairId: document.getElementById('sessionChair').value,
            startTime: time,
            room: room  // ✨ 룸 정보 추가!
        };
        
        const id = this.editingId || `session_${Date.now()}`;
        this.eventData.sessions[id] = sessionData;
        
        await this.saveData();
        this.closeSessionModal();
        Toast.success(this.editingId ? '세션이 수정되었습니다' : '세션이 추가되었습니다');
    };
    
    // ===== 3. 세션 렌더링 수정 =====
    App.renderSchedule = function() {
        const grid = document.getElementById('scheduleGrid');
        const rooms = this.eventData.settings.rooms || [];
        const times = this.eventData.settings.timeSlots || [];
        
        if (rooms.length === 0) {
            grid.innerHTML = '<div class="empty-message"><p>룸이 설정되지 않았습니다</p><p style="font-size: 14px; margin-top: 8px;">설정 탭에서 룸을 추가해주세요</p></div>';
            return;
        }
        
        // 세션을 시간+룸별로 인덱싱
        const sessionsByTimeAndRoom = {};
        Object.values(this.eventData.sessions).forEach(session => {
            if (session.startTime && session.room) {
                const key = `${session.startTime}-${session.room}`;
                sessionsByTimeAndRoom[key] = session;
            }
        });
        
        let html = '<table class="schedule-table">';
        
        // 룸 헤더 (빨간색)
        html += '<tr><th style="min-width: 100px;">Time</th>';
        rooms.forEach(room => {
            html += `<th style="background: #dc2626; color: white; font-size: 18px; font-weight: bold; padding: 16px;">${room}</th>`;
        });
        html += '</tr>';
        
        // 시간대별 렌더링
        times.forEach(time => {
            html += '<tr><td class="time-cell">${time}</td>';
            
            rooms.forEach(room => {
                const sessionKey = `${time}-${room}`;
                const session = sessionsByTimeAndRoom[sessionKey];
                
                // 1. 세션 헤더 체크 (룸별!)
                if (session) {
                    html += `<td style="background: #e0e7ff; text-align: center; padding: 12px; font-weight: 600; color: #4338ca; cursor: move;" draggable="true" data-draggable="true" data-session-key="${sessionKey}" ondblclick="App.editSessionByKey('${sessionKey}')">${session.name || 'Session'}</td>`;
                    return;
                }
                
                // 2. Break 체크
                const breakKey = `${time}-${room}`;
                const breakItem = this.eventData.schedule[breakKey];
                
                if (breakItem && breakItem.type === 'break') {
                    const endTime = this.calculateEndTime(time, breakItem.duration || 30);
                    html += `<td colspan="1" style="background: #fef3c7; text-align: center; padding: 12px; font-weight: 600; color: #92400e; cursor: move;" draggable="true" data-draggable="true" data-key="${breakKey}" ondblclick="App.editBreakInSchedule('${breakKey}')">${breakItem.title || 'Break'}</td>`;
                } else {
                    // 3. 강의 또는 빈 칸
                    const cellKey = `${time}-${room}`;
                    const cellItem = this.eventData.schedule[cellKey];
                    
                    if (cellItem && cellItem.type === 'lecture') {
                        const lecture = this.eventData.lectures[cellItem.lectureId];
                        const speaker = lecture ? this.eventData.speakers[lecture.speakerId] : null;
                        
                        html += `<td class="schedule-cell" style="background: white; padding: 12px;"><div class="lecture-content" draggable="true" data-draggable="true" data-key="${cellKey}" style="cursor: move;"><div style="font-weight: 500; margin-bottom: 8px; font-size: 14px; color: #111827;">${lecture?.title || ''}</div>`;
                        
                        if (speaker) {
                            html += `<div style="display: flex; align-items: center; gap: 8px;">`;
                            if (speaker.photo) {
                                html += `<img src="${speaker.photo}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb;">`;
                            } else {
                                html += `<div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${speaker.name.charAt(0)}</div>`;
                            }
                            html += `<div style="flex: 1;"><div style="font-size: 13px; color: #374151; font-weight: 500;">${speaker.name}</div>`;
                            if (speaker.affiliation) {
                                html += `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${speaker.affiliation}</div>`;
                            }
                            html += `</div></div>`;
                        }
                        html += `</div></td>`;
                    } else {
                        html += `<td class="schedule-cell empty" data-time="${time}" data-room="${room}" data-action="openSlot" style="cursor: pointer; background: white;"><div style="text-align: center; color: #9ca3af; padding: 20px; font-size: 20px;">+</div></td>`;
                    }
                }
            });
            
            html += '</tr>';
        });
        
        html += '</table>';
        grid.innerHTML = html;
    };
    
    // ===== 4. 세션 수정 (키 기반) =====
    App.editSessionByKey = function(sessionKey) {
        // sessionKey = "09:00-Room A" 형태
        const [time, room] = sessionKey.split('-').slice(0, 2);  // 시간과 룸 분리
        
        // 해당 세션 찾기
        const session = Object.entries(this.eventData.sessions).find(([id, s]) => 
            s.startTime === time && s.room === room
        );
        
        if (!session) return;
        
        const [sessionId, sessionData] = session;
        this.editingId = sessionId;
        
        document.getElementById('sessionModalTitle').textContent = '세션 수정';
        document.getElementById('sessionName').value = sessionData.name || '';
        document.getElementById('sessionTime').value = sessionData.startTime || '';
        
        // 룸 선택
        let roomSelect = document.getElementById('sessionRoom');
        if (roomSelect) {
            roomSelect.value = sessionData.room || '';
        }
        
        // 좌장 선택
        const chairSelect = document.getElementById('sessionChair');
        chairSelect.innerHTML = '<option value="">선택 안 함</option>';
        Object.entries(this.eventData.speakers).forEach(([sid, speaker]) => {
            const selected = sid === sessionData.chairId ? 'selected' : '';
            chairSelect.innerHTML += `<option value="${sid}" ${selected}>${speaker.name}</option>`;
        });
        
        document.getElementById('sessionModal').classList.add('active');
    };
    
    // ===== 5. Break 모달에 룸 선택 추가 =====
    const originalOpenBreakModal = App.openBreakModal;
    App.openBreakModal = function() {
        this.editingBreakKey = null;
        document.getElementById('breakTime').value = '';
        document.getElementById('breakDuration').value = '30';
        document.getElementById('breakTitle').value = 'Coffee Break';
        
        // ✨ 룸 선택 추가
        let breakRoomSelect = document.getElementById('breakRoom');
        if (!breakRoomSelect) {
            const titleGroup = document.querySelector('#breakModal .modal-body .form-group:last-child');
            const roomGroup = document.createElement('div');
            roomGroup.className = 'form-group';
            roomGroup.innerHTML = `
                <label>룸 *</label>
                <select id="breakRoom" class="form-control">
                    <option value="">룸 선택</option>
                </select>
            `;
            titleGroup.after(roomGroup);
            breakRoomSelect = document.getElementById('breakRoom');
        }
        
        // 룸 목록 채우기
        breakRoomSelect.innerHTML = '<option value="">룸 선택</option>';
        (this.eventData.settings.rooms || []).forEach(room => {
            breakRoomSelect.innerHTML += `<option value="${room}">${room}</option>`;
        });
        
        document.getElementById('breakModal').classList.add('active');
    };
    
    // ===== 6. Break 저장 시 룸 선택 =====
    App.saveBreak = async function() {
        const time = document.getElementById('breakTime').value;
        const duration = parseInt(document.getElementById('breakDuration').value);
        const title = document.getElementById('breakTitle').value.trim();
        const room = document.getElementById('breakRoom').value;
        
        if (!time || !duration || !title) {
            Toast.warning('모든 필드를 입력해주세요');
            return;
        }
        
        if (!room) {
            Toast.warning('룸을 선택해주세요');
            return;
        }
        
        this.saveToHistory();
        
        const key = this.editingBreakKey || `${time}-${room}`;
        
        if (this.editingBreakKey && this.editingBreakKey !== key) {
            delete this.eventData.schedule[this.editingBreakKey];
        }
        
        this.eventData.schedule[key] = {
            type: 'break',
            title,
            time,
            duration,
            room: room  // ✨ 룸 정보 추가!
        };
        
        await this.saveData();
        this.closeBreakModal();
        Toast.success(this.editingBreakKey ? 'Break가 수정되었습니다' : 'Break가 추가되었습니다');
    };
    
    console.log('✅ 패치 3.1.0 적용 완료!');
    console.log('✅ 세션: 룸별 배치 가능');
    console.log('✅ Break: 룸별 배치 가능');
    Toast.success('패치 3.1.0 적용됨: 룸별 세션/Break');
}

/* ============================================
 * 적용 후 테스트:
 * 
 * 1. 세션 추가
 *    → 룸 선택 드롭다운이 보이는지 확인
 *    → Room A, Room B 등 선택 가능
 * 
 * 2. 세션 배치
 *    → 선택한 룸에만 표시되는지 확인
 *    → 다른 룸은 비어있어야 함
 * 
 * 3. Break 추가
 *    → 룸 선택 가능
 *    → 특정 룸에만 Break 배치
 * ============================================ */
