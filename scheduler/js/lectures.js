/**
 * lectures.js - 강의 목록 관리 모듈
 * 
 * 기능:
 * - 좌측 사이드바 강의 목록 표시
 * - 접기/펼치기 토글
 * - 드래그 앤 드롭
 * - 더블클릭 편집
 * - 검색 필터
 */

(function() {
    'use strict';

    // ============================================
    // 사이드바 토글
    // ============================================
    
    /**
     * 사이드바 토글
     */
    window.toggleSidebar = function() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            
            // 토글 버튼 아이콘 변경
            const toggleBtn = sidebar.querySelector('.sidebar-toggle');
            if (toggleBtn) {
                toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
            }
        }
    };
    
    // ============================================
    // 강의 목록 업데이트
    // ============================================
    
    /**
     * 강의 목록 업데이트
     */
    window.updateLectureList = function() {
        const container = document.getElementById('lectureList');
        if (!container) return;
        
        const lectures = AppState.lectures || [];
        const schedule = AppState.schedule || {};
        const searchTerm = document.getElementById('lectureSearch')?.value?.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        
        // 배치된 강의 ID 목록
        const placedIds = new Set(Object.values(schedule).map(l => l.id));
        
        // 필터링
        let filteredLectures = lectures.filter(lecture => {
            // 검색 필터
            if (searchTerm) {
                const searchFields = [
                    lecture.titleKo,
                    lecture.speakerKo,
                    lecture.affiliation,
                    lecture.companyName
                ].join(' ').toLowerCase();
                
                if (!searchFields.includes(searchTerm)) return false;
            }
            
            // 카테고리 필터
            if (categoryFilter && lecture.category !== categoryFilter) {
                return false;
            }
            
            return true;
        });
        
        // 정렬 (미배치 먼저)
        filteredLectures.sort((a, b) => {
            const aPlaced = placedIds.has(a.id);
            const bPlaced = placedIds.has(b.id);
            if (aPlaced !== bPlaced) return aPlaced ? 1 : -1;
            return (a.titleKo || '').localeCompare(b.titleKo || '');
        });
        
        if (filteredLectures.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px 20px; color: #64748b;">
                    <div style="font-size: 2rem; margin-bottom: 12px;">📭</div>
                    <div>강의가 없습니다.</div>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        filteredLectures.forEach(lecture => {
            const isPlaced = placedIds.has(lecture.id);
            const isLuncheon = lecture.isLuncheon || lecture.companyName === '학회강의';
            
            html += `
                <div class="lecture-item ${isLuncheon ? 'luncheon' : ''} ${isPlaced ? 'placed' : ''}"
                     draggable="${!isPlaced}"
                     ondragstart="${!isPlaced ? `handleDragStart(event, ${JSON.stringify(lecture).replace(/"/g, '&quot;')})` : ''}"
                     ondragend="handleDragEnd(event)"
                     ondblclick="openLectureItemEditModal(${lecture.id})"
                     title="${isPlaced ? '이미 배치됨 (더블클릭하여 수정)' : '드래그하여 시간표에 배치 (더블클릭하여 수정)'}">
                    <div class="lecture-item-title">${lecture.titleKo || '제목 없음'}</div>
                    <div class="lecture-item-speaker">${lecture.speakerKo || ''} ${lecture.affiliation ? `(${lecture.affiliation})` : ''}</div>
                    <div class="lecture-item-meta">
                        <span class="lecture-item-tag">⏱ ${lecture.duration || 20}분</span>
                        ${!isLuncheon ? `<span class="lecture-item-tag">🏢 ${lecture.companyName || ''}</span>` : '<span class="lecture-item-tag">🎓 학회강의</span>'}
                        ${isPlaced ? '<span class="lecture-item-tag" style="background: #10b981; color: white;">✓ 배치됨</span>' : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // 통계 업데이트
        updateLectureStats(lectures.length, placedIds.size);
    };
    
    /**
     * 강의 통계 업데이트
     */
    function updateLectureStats(total, placed) {
        const statsEl = document.getElementById('lectureStats');
        if (statsEl) {
            statsEl.innerHTML = `
                <span style="color: #64748b; font-size: 0.85rem;">
                    전체 ${total}개 / 배치 ${placed}개 / 미배치 ${total - placed}개
                </span>
            `;
        }
    }
    
    // ============================================
    // 강의 항목 편집 모달 (좌측 목록에서)
    // ============================================
    
    /**
     * 강의 항목 편집 모달 열기
     */
    window.openLectureItemEditModal = function(lectureId) {
        const lecture = (AppState.lectures || []).find(l => l.id === lectureId);
        if (!lecture) {
            Toast.warning('강의를 찾을 수 없습니다.');
            return;
        }
        
        // 스케줄에서 해당 강의 위치 찾기
        let scheduleKey = null;
        Object.entries(AppState.schedule || {}).forEach(([key, lec]) => {
            if (lec.id === lectureId) {
                scheduleKey = key;
            }
        });
        
        // 편집 모달 생성 또는 가져오기
        let modal = document.getElementById('lectureItemEditModal');
        if (!modal) {
            modal = createLectureItemEditModal();
            document.body.appendChild(modal);
        }
        
        // 현재 편집 중인 강의 ID 저장
        AppState.editingLectureId = lectureId;
        AppState.editingScheduleKey = scheduleKey;
        
        // 폼에 데이터 채우기
        fillLectureItemEditForm(lecture, scheduleKey);
        
        modal.classList.add('active');
    };
    
    /**
     * 강의 항목 편집 모달 생성
     */
    function createLectureItemEditModal() {
        const modal = document.createElement('div');
        modal.id = 'lectureItemEditModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>📝 강의 수정</h2>
                    <button class="btn btn-secondary btn-small" onclick="closeLectureItemEditModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div id="lectureItemScheduleInfo" style="background: #f0f9ff; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: none;">
                        <!-- 배치 정보 표시 -->
                    </div>
                    
                    <div class="form-group">
                        <label>제목</label>
                        <input type="text" id="itemEditTitle" class="form-control" placeholder="강의 제목">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>연자</label>
                            <input type="text" id="itemEditSpeaker" class="form-control" placeholder="연자명">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>소속</label>
                            <input type="text" id="itemEditAffiliation" class="form-control" placeholder="병원/소속">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>강의 시간 (분)</label>
                            <input type="number" id="itemEditDuration" class="form-control" value="20" min="5" step="5">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>카테고리</label>
                            <select id="itemEditCategory" class="form-control">
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
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>업체</label>
                            <input type="text" id="itemEditCompany" class="form-control" placeholder="업체명 또는 학회강의">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>제품</label>
                            <input type="text" id="itemEditProduct" class="form-control" placeholder="제품명">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger" onclick="deleteLectureItem()">🗑️ 삭제</button>
                    <button class="btn btn-secondary" onclick="closeLectureItemEditModal()">취소</button>
                    <button class="btn btn-primary" onclick="saveLectureItemEdit()">저장</button>
                </div>
            </div>
        `;
        return modal;
    }
    
    /**
     * 편집 폼 채우기
     */
    function fillLectureItemEditForm(lecture, scheduleKey) {
        document.getElementById('itemEditTitle').value = lecture.titleKo || '';
        document.getElementById('itemEditSpeaker').value = lecture.speakerKo || '';
        document.getElementById('itemEditAffiliation').value = lecture.affiliation || '';
        document.getElementById('itemEditDuration').value = lecture.duration || 20;
        document.getElementById('itemEditCategory').value = lecture.category || '';
        document.getElementById('itemEditCompany').value = lecture.companyName || '';
        document.getElementById('itemEditProduct').value = lecture.productName || '';
        
        // 배치 정보 표시
        const infoEl = document.getElementById('lectureItemScheduleInfo');
        if (scheduleKey) {
            const [time, ...roomParts] = scheduleKey.split('-');
            const room = roomParts.join('-');
            infoEl.innerHTML = `
                <strong>📍 배치 위치:</strong> ${time} - ${room}
                <button class="btn btn-small btn-secondary" style="margin-left: 12px;" onclick="removeLectureFromSchedule()">배치 해제</button>
            `;
            infoEl.style.display = 'block';
        } else {
            infoEl.style.display = 'none';
        }
    }
    
    /**
     * 모달 닫기
     */
    window.closeLectureItemEditModal = function() {
        const modal = document.getElementById('lectureItemEditModal');
        if (modal) modal.classList.remove('active');
        AppState.editingLectureId = null;
    };
    
    /**
     * 강의 수정 저장
     */
    window.saveLectureItemEdit = async function() {
        const lectureId = AppState.editingLectureId;
        if (!lectureId) return;
        
        const updatedData = {
            titleKo: document.getElementById('itemEditTitle').value,
            speakerKo: document.getElementById('itemEditSpeaker').value,
            affiliation: document.getElementById('itemEditAffiliation').value,
            duration: parseInt(document.getElementById('itemEditDuration').value) || 20,
            category: document.getElementById('itemEditCategory').value,
            companyName: document.getElementById('itemEditCompany').value,
            productName: document.getElementById('itemEditProduct').value,
            isLuncheon: document.getElementById('itemEditCompany').value === '학회강의' || !document.getElementById('itemEditCompany').value
        };
        
        // lectures 배열 업데이트
        const index = (AppState.lectures || []).findIndex(l => l.id === lectureId);
        if (index >= 0) {
            AppState.lectures[index] = { ...AppState.lectures[index], ...updatedData };
        }
        
        // schedule 업데이트 (배치되어 있으면)
        const scheduleKey = AppState.editingScheduleKey;
        if (scheduleKey && AppState.schedule[scheduleKey]) {
            AppState.schedule[scheduleKey] = { ...AppState.schedule[scheduleKey], ...updatedData };
        }
        
        // Firebase 저장
        await saveToFirebase();
        
        // UI 업데이트
        updateLectureList();
        if (typeof updateScheduleDisplay === 'function') updateScheduleDisplay();
        
        closeLectureItemEditModal();
        Toast.success('강의가 수정되었습니다.');
    };
    
    /**
     * 강의 삭제
     */
    window.deleteLectureItem = async function() {
        const lectureId = AppState.editingLectureId;
        if (!lectureId) return;
        
        if (!confirm('이 강의를 삭제하시겠습니까?\n(시간표에서도 제거됩니다)')) return;
        
        // lectures에서 삭제
        AppState.lectures = (AppState.lectures || []).filter(l => l.id !== lectureId);
        
        // schedule에서도 삭제
        const scheduleKey = AppState.editingScheduleKey;
        if (scheduleKey) {
            delete AppState.schedule[scheduleKey];
        }
        
        // Firebase 저장
        await saveToFirebase();
        
        // UI 업데이트
        updateLectureList();
        if (typeof updateScheduleDisplay === 'function') updateScheduleDisplay();
        
        closeLectureItemEditModal();
        Toast.success('강의가 삭제되었습니다.');
    };
    
    /**
     * 시간표에서 배치 해제
     */
    window.removeLectureFromSchedule = async function() {
        const scheduleKey = AppState.editingScheduleKey;
        if (!scheduleKey) return;
        
        if (!confirm('시간표에서 이 강의를 해제하시겠습니까?\n(강의 목록에는 유지됩니다)')) return;
        
        delete AppState.schedule[scheduleKey];
        
        // Firebase 저장
        await saveToFirebase();
        
        // UI 업데이트
        updateLectureList();
        if (typeof updateScheduleDisplay === 'function') updateScheduleDisplay();
        
        closeLectureItemEditModal();
        Toast.success('배치가 해제되었습니다.');
    };
    
    /**
     * Firebase 저장
     */
    async function saveToFirebase() {
        if (typeof eventRef !== 'function') return;
        
        try {
            const scheduleRef = eventRef(`data/dataByDate/${AppState.currentDate}/schedule`);
            if (scheduleRef) await scheduleRef.set(AppState.schedule || {});
            
            const lecturesRef = eventRef(`data/dataByDate/${AppState.currentDate}/lectures`);
            if (lecturesRef) await lecturesRef.set(AppState.lectures || []);
        } catch (error) {
            console.error('Firebase 저장 실패:', error);
            Toast.error('저장 실패: ' + error.message);
        }
    }
    
    // ============================================
    // 새 강의 추가 모달
    // ============================================
    
    /**
     * 새 강의 추가 모달 열기
     */
    window.openAddLectureModal = function() {
        if (typeof checkEditPermission === 'function' && !checkEditPermission()) return;
        
        let modal = document.getElementById('addLectureModal');
        if (!modal) {
            modal = createAddLectureModal();
            document.body.appendChild(modal);
        }
        
        // 폼 초기화
        document.getElementById('newLectureTitle').value = '';
        document.getElementById('newLectureSpeaker').value = '';
        document.getElementById('newLectureAffiliation').value = '';
        document.getElementById('newLectureDuration').value = 20;
        document.getElementById('newLectureCategory').value = '';
        document.getElementById('newLectureCompany').value = '';
        document.getElementById('newLectureProduct').value = '';
        
        modal.classList.add('active');
    };
    
    function createAddLectureModal() {
        const modal = document.createElement('div');
        modal.id = 'addLectureModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>➕ 새 강의 추가</h2>
                    <button class="btn btn-secondary btn-small" onclick="closeAddLectureModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>제목 *</label>
                        <input type="text" id="newLectureTitle" class="form-control" placeholder="강의 제목">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>연자</label>
                            <input type="text" id="newLectureSpeaker" class="form-control" placeholder="연자명">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>소속</label>
                            <input type="text" id="newLectureAffiliation" class="form-control" placeholder="병원/소속">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>강의 시간 (분)</label>
                            <input type="number" id="newLectureDuration" class="form-control" value="20" min="5" step="5">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>카테고리</label>
                            <select id="newLectureCategory" class="form-control">
                                <option value="">선택</option>
                                <option value="Injectables">Injectables</option>
                                <option value="Bio-Stimulators">Bio-Stimulators</option>
                                <option value="Threads">Threads</option>
                                <option value="Laser-EBDs">Laser & EBDs</option>
                                <option value="Problem-solving">Problem-solving</option>
                                <option value="Facial contouring">Facial contouring</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>업체</label>
                            <input type="text" id="newLectureCompany" class="form-control" placeholder="업체명 (비우면 학회강의)">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>제품</label>
                            <input type="text" id="newLectureProduct" class="form-control" placeholder="제품명">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeAddLectureModal()">취소</button>
                    <button class="btn btn-primary" onclick="saveNewLecture()">추가</button>
                </div>
            </div>
        `;
        return modal;
    }
    
    window.closeAddLectureModal = function() {
        const modal = document.getElementById('addLectureModal');
        if (modal) modal.classList.remove('active');
    };
    
    window.saveNewLecture = async function() {
        const title = document.getElementById('newLectureTitle').value.trim();
        if (!title) {
            Toast.warning('제목을 입력해주세요.');
            return;
        }
        
        const companyName = document.getElementById('newLectureCompany').value.trim();
        
        const newLecture = {
            id: Date.now(),
            titleKo: title,
            titleEn: '',
            speakerKo: document.getElementById('newLectureSpeaker').value.trim(),
            speakerEn: '',
            affiliation: document.getElementById('newLectureAffiliation').value.trim(),
            affiliationEn: '',
            duration: parseInt(document.getElementById('newLectureDuration').value) || 20,
            category: document.getElementById('newLectureCategory').value,
            companyName: companyName || '학회강의',
            productName: document.getElementById('newLectureProduct').value.trim(),
            isLuncheon: !companyName
        };
        
        // lectures 배열에 추가
        if (!AppState.lectures) AppState.lectures = [];
        AppState.lectures.push(newLecture);
        
        // Firebase 저장
        await saveToFirebase();
        
        // UI 업데이트
        updateLectureList();
        
        closeAddLectureModal();
        Toast.success('강의가 추가되었습니다. 시간표로 드래그하여 배치하세요.');
    };

})();

console.log('✅ lectures.js 로드 완료');
