/* ============================================
 * V3 패치 3.2.0 - 룸별 시간대 설정
 * 
 * 적용 방법:
 * 1. patch-3.1.0.js 먼저 적용 필수!
 * 2. 이 파일을 patches/patch-3.2.0.js로 저장
 * 3. scheduler.html에 추가:
 *    <script src="patches/patch-3.1.0.js"></script>
 *    <script src="patches/patch-3.2.0.js"></script>
 * 4. GitHub 업로드
 * 
 * 변경사항:
 * - 룸별 시작/종료 시간 설정
 * - 룸마다 다른 시간대 표시
 * ============================================ */

if (typeof App !== 'undefined') {
    console.log('🔧 패치 3.2.0 적용 중...');
    
    // ===== 1. 설정에 룸별 시간대 추가 =====
    const originalRenderSettings = App.renderSettings;
    App.renderSettings = function() {
        const roomsList = document.getElementById('roomsList');
        const rooms = this.eventData.settings.rooms || [];
        
        if (rooms.length === 0) {
            roomsList.innerHTML = '<p class="empty-message">등록된 룸이 없습니다</p>';
        } else {
            roomsList.innerHTML = rooms.map((room, index) => {
                const roomSettings = this.eventData.settings.roomSettings || {};
                const settings = roomSettings[room] || {};
                
                return `
                    <div class="room-list-item" style="display: block; padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <span class="room-name" style="font-weight: 600; font-size: 16px;">${room}</span>
                            <div>
                                <button class="btn btn-small btn-secondary" data-action="editRoom" data-id="${index}">수정</button>
                                <button class="btn btn-small btn-danger" data-action="deleteRoom" data-id="${index}">삭제</button>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
                            <div>
                                <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px;">시작 시간</label>
                                <input type="time" 
                                       class="form-control" 
                                       style="padding: 8px; font-size: 14px;"
                                       value="${settings.startTime || '08:00'}"
                                       onchange="App.updateRoomTime('${room}', 'startTime', this.value)">
                            </div>
                            <div>
                                <label style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px;">종료 시간</label>
                                <input type="time" 
                                       class="form-control" 
                                       style="padding: 8px; font-size: 14px;"
                                       value="${settings.endTime || '18:00'}"
                                       onchange="App.updateRoomTime('${room}', 'endTime', this.value)">
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        document.getElementById('settingDefaultDuration').value = this.eventData.settings.defaultDuration || 20;
        document.getElementById('settingBufferTime').value = this.eventData.settings.bufferTime || 10;
    };
    
    // ===== 2. 룸별 시간 업데이트 함수 =====
    App.updateRoomTime = async function(room, field, value) {
        if (!this.eventData.settings.roomSettings) {
            this.eventData.settings.roomSettings = {};
        }
        
        if (!this.eventData.settings.roomSettings[room]) {
            this.eventData.settings.roomSettings[room] = {};
        }
        
        this.eventData.settings.roomSettings[room][field] = value;
        
        await this.saveData();
        Toast.success(`${room}의 ${field === 'startTime' ? '시작' : '종료'} 시간이 업데이트되었습니다`);
    };
    
    // ===== 3. 스케줄 렌더링 시 룸별 시간대 적용 =====
    const originalRenderSchedule = App.renderSchedule;
    App.renderSchedule = function() {
        const grid = document.getElementById('scheduleGrid');
        const rooms = this.eventData.settings.rooms || [];
        const times = this.eventData.settings.timeSlots || [];
        const roomSettings = this.eventData.settings.roomSettings || {};
        
        if (rooms.length === 0) {
            grid.innerHTML = '<div class="empty-message"><p>룸이 설정되지 않았습니다</p></div>';
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
        
        // 룸 헤더
        html += '<tr><th style="min-width: 100px;">Time</th>';
        rooms.forEach(room => {
            const settings = roomSettings[room] || {};
            const timeInfo = (settings.startTime && settings.endTime) 
                ? `<div style="font-size: 12px; font-weight: normal; opacity: 0.8; margin-top: 4px;">${settings.startTime} - ${settings.endTime}</div>`
                : '';
            html += `<th style="background: #dc2626; color: white; font-size: 18px; font-weight: bold; padding: 16px;">${room}${timeInfo}</th>`;
        });
        html += '</tr>';
        
        // 시간대별 렌더링
        times.forEach(time => {
            html += `<tr><td class="time-cell">${time}</td>`;
            
            rooms.forEach(room => {
                // 룸별 시간 체크
                const settings = roomSettings[room] || {};
                const isInRoomTime = this.isTimeInRange(time, settings.startTime, settings.endTime);
                
                if (!isInRoomTime && settings.startTime) {
                    // 룸 운영 시간 외
                    html += `<td style="background: #f3f4f6; cursor: not-allowed;"><div style="text-align: center; color: #d1d5db; padding: 20px;">-</div></td>`;
                    return;
                }
                
                const sessionKey = `${time}-${room}`;
                const session = sessionsByTimeAndRoom[sessionKey];
                
                // 세션 체크
                if (session) {
                    html += `<td style="background: #e0e7ff; text-align: center; padding: 12px; font-weight: 600; color: #4338ca; cursor: move;" draggable="true" data-draggable="true" data-session-key="${sessionKey}" ondblclick="App.editSessionByKey('${sessionKey}')">${session.name || 'Session'}</td>`;
                } else {
                    // Break 체크
                    const breakKey = `${time}-${room}`;
                    const breakItem = this.eventData.schedule[breakKey];
                    
                    if (breakItem && breakItem.type === 'break') {
                        const endTime = this.calculateEndTime(time, breakItem.duration || 30);
                        html += `<td style="background: #fef3c7; text-align: center; padding: 12px; font-weight: 600; color: #92400e; cursor: move;" draggable="true" data-draggable="true" data-key="${breakKey}" ondblclick="App.editBreakInSchedule('${breakKey}')">${breakItem.title || 'Break'}</td>`;
                    } else {
                        // 강의 또는 빈 칸
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
                }
            });
            
            html += '</tr>';
        });
        
        html += '</table>';
        grid.innerHTML = html;
    };
    
    // ===== 4. 시간 범위 체크 헬퍼 함수 =====
    App.isTimeInRange = function(time, startTime, endTime) {
        if (!startTime || !endTime) return true;  // 설정 없으면 항상 허용
        
        const [h, m] = time.split(':').map(Number);
        const timeMinutes = h * 60 + m;
        
        const [sh, sm] = startTime.split(':').map(Number);
        const startMinutes = sh * 60 + sm;
        
        const [eh, em] = endTime.split(':').map(Number);
        const endMinutes = eh * 60 + em;
        
        return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    };
    
    console.log('✅ 패치 3.2.0 적용 완료!');
    console.log('✅ 룸별 시작/종료 시간 설정 가능');
    console.log('✅ 룸별 운영 시간 외 영역 표시');
    Toast.success('패치 3.2.0 적용됨: 룸별 시간대');
}

/* ============================================
 * 사용 방법:
 * 
 * 1. 설정 탭으로 이동
 * 2. 각 룸의 시작/종료 시간 설정
 * 3. 스케줄 탭에서 확인
 *    → 룸 헤더에 시간 표시됨
 *    → 운영 시간 외는 회색으로 표시
 * 
 * 예:
 * Room A: 08:00 - 12:00
 * Room B: 13:00 - 18:00
 * → Room A는 오전만, Room B는 오후만 사용 가능
 * ============================================ */
