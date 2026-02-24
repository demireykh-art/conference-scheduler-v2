/* ============================================
 * V3 긴급 패치 3.2.1 - 룸별 시간 UI 수정
 * 
 * 문제: 룸별 시간 설정 UI가 표시 안 됨
 * 해결: renderSettings 함수 완전 교체
 * 
 * 적용 방법:
 * 1. patch-3.1.0.js와 patch-3.2.0.js 먼저 적용 필수
 * 2. 이 파일을 patches/patch-3.2.1.js로 저장
 * 3. scheduler.html에 추가:
 *    <script src="patches/patch-3.2.1.js"></script>
 * 4. GitHub 업로드 → Ctrl+F5
 * ============================================ */

if (typeof App !== 'undefined') {
    console.log('🔧 긴급 패치 3.2.1 적용 중...');
    
    // renderSettings 함수 완전 교체
    App.renderSettings = function() {
        const roomsList = document.getElementById('roomsList');
        const rooms = this.eventData.settings.rooms || [];
        
        if (rooms.length === 0) {
            roomsList.innerHTML = '<p class="empty-message">등록된 룸이 없습니다</p>';
        } else {
            // 룸별 시간 설정 초기화
            if (!this.eventData.settings.roomSettings) {
                this.eventData.settings.roomSettings = {};
            }
            
            roomsList.innerHTML = rooms.map((room, index) => {
                const roomSettings = this.eventData.settings.roomSettings[room] || {};
                const startTime = roomSettings.startTime || '08:00';
                const endTime = roomSettings.endTime || '18:00';
                
                return `
                    <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
                        <!-- 룸 이름 & 버튼 -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <span style="font-weight: 600; font-size: 18px; color: #111827;">${room}</span>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-small btn-secondary" data-action="editRoom" data-id="${index}">수정</button>
                                <button class="btn btn-small btn-danger" data-action="deleteRoom" data-id="${index}">삭제</button>
                            </div>
                        </div>
                        
                        <!-- 룸별 시간 설정 -->
                        <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
                            <div style="font-weight: 600; color: #374151; margin-bottom: 12px; font-size: 14px;">
                                ⏰ 룸 운영 시간
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 6px; font-weight: 500;">
                                        시작 시간
                                    </label>
                                    <input type="time" 
                                           class="form-control" 
                                           style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;"
                                           value="${startTime}"
                                           onchange="App.updateRoomTime('${room}', 'startTime', this.value)">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 6px; font-weight: 500;">
                                        종료 시간
                                    </label>
                                    <input type="time" 
                                           class="form-control" 
                                           style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;"
                                           value="${endTime}"
                                           onchange="App.updateRoomTime('${room}', 'endTime', this.value)">
                                </div>
                            </div>
                            <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
                                💡 이 룸은 ${startTime} - ${endTime} 시간대만 사용됩니다
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // 기본 설정
        document.getElementById('settingDefaultDuration').value = this.eventData.settings.defaultDuration || 20;
        document.getElementById('settingBufferTime').value = this.eventData.settings.bufferTime || 10;
        
        console.log('✅ 룸별 시간 UI 렌더링 완료');
    };
    
    // updateRoomTime 함수 확인 (없으면 생성)
    if (!App.updateRoomTime) {
        App.updateRoomTime = async function(room, field, value) {
            console.log(`🔧 ${room}의 ${field}을 ${value}로 변경`);
            
            if (!this.eventData.settings.roomSettings) {
                this.eventData.settings.roomSettings = {};
            }
            
            if (!this.eventData.settings.roomSettings[room]) {
                this.eventData.settings.roomSettings[room] = {};
            }
            
            this.eventData.settings.roomSettings[room][field] = value;
            
            await this.saveData();
            
            const fieldName = field === 'startTime' ? '시작' : '종료';
            Toast.success(`${room}의 ${fieldName} 시간: ${value}`);
            
            // 스케줄 다시 렌더링
            this.renderSchedule();
        };
    }
    
    // isTimeInRange 함수 확인 (없으면 생성)
    if (!App.isTimeInRange) {
        App.isTimeInRange = function(time, startTime, endTime) {
            if (!startTime || !endTime) return true;
            
            const [h, m] = time.split(':').map(Number);
            const timeMinutes = h * 60 + m;
            
            const [sh, sm] = startTime.split(':').map(Number);
            const startMinutes = sh * 60 + sm;
            
            const [eh, em] = endTime.split(':').map(Number);
            const endMinutes = eh * 60 + em;
            
            return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
        };
    }
    
    console.log('✅ 긴급 패치 3.2.1 적용 완료!');
    Toast.success('패치 3.2.1: 룸별 시간 UI 수정됨');
    
    // 설정 탭이 열려있으면 즉시 다시 렌더링
    const settingsTab = document.getElementById('settings-tab');
    if (settingsTab && settingsTab.classList.contains('active')) {
        App.renderSettings();
        console.log('✅ 설정 화면 즉시 업데이트됨');
    }
}

/* ============================================
 * 적용 후 확인:
 * 
 * 1. 설정 탭으로 이동
 * 2. 각 룸 카드 확인:
 *    - 룸 이름
 *    - "⏰ 룸 운영 시간" 섹션
 *    - 시작 시간 입력란
 *    - 종료 시간 입력란
 *    - "💡 이 룸은 XX:XX - XX:XX 시간대만 사용됩니다"
 * 
 * 3. 시간 변경 테스트:
 *    - roomA 시작: 09:00으로 변경
 *    - Toast: "roomA의 시작 시간: 09:00"
 *    - 스케줄 자동 업데이트
 * ============================================ */
