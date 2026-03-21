/**
 * lecture-import.js - 강의 일괄 업로드 모듈 (간소화 버전)
 * 
 * 역할: 파일 업로드 + 기본 파싱 + 저장
 * 동선 검증은 schedule-validator.js에서 별도 처리
 * 
 * Excel 양식:
 * A: 룸명, B: 강의시간, C: 시작, D: 종료, E: 좌장/사회, F: 좌장명
 * G: 세션명, H: 제목, I: 병원명, J: 연자명, K: 제품명, L: 업체
 */

(function() {
    'use strict';

    // ============================================
    // 강의 업로드 모달
    // ============================================
    
    window.openLectureImportModal = function() {
        if (typeof checkEditPermission === 'function' && !checkEditPermission()) return;
        
        let modal = document.getElementById('lectureImportModal');
        if (!modal) {
            modal = createLectureImportModal();
            document.body.appendChild(modal);
        }
        
        modal.classList.add('active');
        document.getElementById('lectureImportPreview').innerHTML = '';
        document.getElementById('lectureImportFile').value = '';
        
        const dateInfo = document.getElementById('lectureImportDate');
        if (dateInfo) {
            dateInfo.textContent = AppState.currentDate || '날짜 미선택';
        }
    };
    
    function createLectureImportModal() {
        const modal = document.createElement('div');
        modal.id = 'lectureImportModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 85vh;">
                <div class="modal-header">
                    <h2>📥 강의 일괄 업로드</h2>
                    <button class="btn btn-secondary btn-small" onclick="closeLectureImportModal()">✕</button>
                </div>
                <div class="modal-body" style="overflow-y: auto; max-height: calc(85vh - 140px);">
                    <div class="import-info" style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <p><strong>📅 업로드 대상 날짜:</strong> <span id="lectureImportDate" style="color: #0369a1; font-weight: 600;"></span></p>
                        <p style="font-size: 0.85rem; color: #666; margin-top: 8px;">
                            💡 업로드 후 [🔍 동선검증] 버튼으로 전체 동선을 확인하세요.
                        </p>
                    </div>
                    
                    <div class="form-group">
                        <label>Excel 파일 선택</label>
                        <input type="file" id="lectureImportFile" accept=".xlsx,.xls,.csv" onchange="handleLectureFileUpload(event)">
                    </div>
                    
                    <details style="margin-bottom: 16px;">
                        <summary style="cursor: pointer; font-weight: 600; padding: 8px; background: #f8f9fa; border-radius: 4px;">📋 Excel 양식 안내</summary>
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 0 0 8px 8px; font-size: 0.85rem;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr><td style="padding: 4px; width: 60px;"><strong>A열</strong></td><td>룸명 (예: (토)1층 전시장A)</td></tr>
                                <tr><td style="padding: 4px;"><strong>B열</strong></td><td>강의시간 (분)</td></tr>
                                <tr><td style="padding: 4px;"><strong>C열</strong></td><td>시작시간</td></tr>
                                <tr><td style="padding: 4px;"><strong>D열</strong></td><td>종료시간</td></tr>
                                <tr><td style="padding: 4px;"><strong>E열</strong></td><td>좌장/사회</td></tr>
                                <tr><td style="padding: 4px;"><strong>F열</strong></td><td>좌장명</td></tr>
                                <tr><td style="padding: 4px;"><strong>G열</strong></td><td>세션명</td></tr>
                                <tr><td style="padding: 4px;"><strong>H열</strong></td><td>제목</td></tr>
                                <tr><td style="padding: 4px;"><strong>I열</strong></td><td>병원명</td></tr>
                                <tr><td style="padding: 4px;"><strong>J열</strong></td><td>연자명</td></tr>
                                <tr><td style="padding: 4px;"><strong>K열</strong></td><td>제품명</td></tr>
                                <tr><td style="padding: 4px;"><strong>L열</strong></td><td>업체</td></tr>
                            </table>
                        </div>
                    </details>
                    
                    <div id="lectureImportPreview"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="downloadLectureTemplate()">📄 템플릿</button>
                    <button class="btn btn-secondary" onclick="closeLectureImportModal()">취소</button>
                    <button class="btn btn-primary" id="lectureImportSaveBtn" disabled onclick="saveLectureImport()">저장</button>
                </div>
            </div>
        `;
        return modal;
    }
    
    window.closeLectureImportModal = function() {
        const modal = document.getElementById('lectureImportModal');
        if (modal) modal.classList.remove('active');
    };

    // ============================================
    // 파일 파싱
    // ============================================
    
    let parsedImportData = null;
    
    window.handleLectureFileUpload = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length < 2) {
                    Toast.warning('데이터가 없습니다.');
                    return;
                }
                
                const rows = jsonData.slice(1).filter(row => row && row.length > 0 && row[0]);
                
                if (rows.length === 0) {
                    Toast.warning('유효한 데이터가 없습니다.');
                    return;
                }
                
                parsedImportData = parseLectureData(rows);
                showLectureImportPreview(parsedImportData);
                
            } catch (error) {
                console.error('파일 파싱 오류:', error);
                Toast.error('파일을 읽을 수 없습니다: ' + error.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };
    
    function parseLectureData(rows) {
        const lectures = [];
        const sessions = {};
        const rooms = new Set();
        const speakers = new Map();
        const companies = new Set();
        
        rows.forEach((row, index) => {
            const roomName = String(row[0] || '').trim();
            const duration = parseInt(row[1]) || 20;
            const startTime = formatTime(row[2]);
            const endTime = formatTime(row[3]);
            const chairType = String(row[4] || '').trim();
            const chairName = String(row[5] || '').trim();
            const sessionName = String(row[6] || '').trim();
            const title = String(row[7] || '').trim();
            const affiliation = String(row[8] || '').trim();
            const speakerName = String(row[9] || '').trim();
            const productName = String(row[10] || '').trim();
            const companyName = String(row[11] || '').trim();
            
            if (!roomName || !startTime) return;
            
            rooms.add(roomName);
            
            const lectureId = Date.now() + index;
            const isLuncheon = companyName === '학회강의' || !companyName;
            
            const lecture = {
                id: lectureId,
                titleKo: title,
                titleEn: '',
                speakerKo: speakerName,
                speakerEn: '',
                affiliation: affiliation,
                affiliationEn: '',
                duration: duration,
                category: detectCategory(sessionName, title),
                companyName: isLuncheon ? '학회강의' : companyName,
                productName: productName,
                isLuncheon: isLuncheon,
                _room: roomName,
                _startTime: startTime,
                _endTime: endTime,
                _sessionName: sessionName,
                _chairName: chairName,
                _rowIndex: index + 2
            };
            
            lectures.push(lecture);
            
            // 세션 수집
            if (sessionName) {
                const sessionKey = `${roomName}|${sessionName}`;
                if (!sessions[sessionKey]) {
                    sessions[sessionKey] = {
                        id: `session_${Date.now()}_${Object.keys(sessions).length}`,
                        name: sessionName,
                        room: roomName,
                        moderator: chairName,
                        time: startTime,
                        endTime: endTime,
                        duration: 0,
                        lectures: []
                    };
                }
                sessions[sessionKey].lectures.push(lecture);
                if (endTime > sessions[sessionKey].endTime) {
                    sessions[sessionKey].endTime = endTime;
                }
                if (chairName) {
                    sessions[sessionKey].moderator = chairName;
                }
            }
            
            // 연자 수집
            if (speakerName && !speakers.has(speakerName)) {
                speakers.set(speakerName, {
                    name: speakerName,
                    affiliation: affiliation
                });
            }
            
            if (companyName && companyName !== '학회강의') {
                companies.add(companyName);
            }
        });
        
        // 세션 duration 계산
        Object.values(sessions).forEach(session => {
            session.duration = calculateDuration(session.time, session.endTime);
        });
        
        return {
            lectures,
            sessions: Object.values(sessions),
            rooms: Array.from(rooms),
            speakers: Array.from(speakers.values()),
            companies: Array.from(companies)
        };
    }
    
    function formatTime(value) {
        if (!value) return '';
        if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
            const [h, m] = value.split(':');
            return `${h.padStart(2, '0')}:${m}`;
        }
        if (typeof value === 'number') {
            const totalMinutes = Math.round(value * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        return String(value).trim();
    }
    
    function calculateDuration(startTime, endTime) {
        if (!startTime || !endTime) return 60;
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
    }
    
    function detectCategory(sessionName, title) {
        const text = `${sessionName} ${title}`.toLowerCase();
        const categories = {
            'Injectables': ['filler', 'botox', '필러', '보톡스'],
            'Bio-Stimulators': ['bio-stimulat', 'pdlla', 'plla', 'collagen', '부스터', 'ecm'],
            'Threads': ['thread', 'pdo', 'pcl', '쓰레드'],
            'Problem-solving': ['problem', 'complication', '문제', '실패'],
            'Facial contouring': ['contour', 'facial', 'volume', '윤곽']
        };
        for (const [cat, keywords] of Object.entries(categories)) {
            if (keywords.some(kw => text.includes(kw))) return cat;
        }
        return 'Others';
    }

    // ============================================
    // 미리보기
    // ============================================
    
    function showLectureImportPreview(data) {
        const preview = document.getElementById('lectureImportPreview');
        
        let html = `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;">
                <div style="background: #dbeafe; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #1e40af;">${data.lectures.length}</div>
                    <div style="font-size: 0.85rem; color: #3b82f6;">강의</div>
                </div>
                <div style="background: #fef3c7; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #92400e;">${data.sessions.length}</div>
                    <div style="font-size: 0.85rem; color: #f59e0b;">세션</div>
                </div>
                <div style="background: #d1fae5; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #065f46;">${data.rooms.length}</div>
                    <div style="font-size: 0.85rem; color: #10b981;">룸</div>
                </div>
                <div style="background: #ede9fe; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #5b21b6;">${data.speakers.length}</div>
                    <div style="font-size: 0.85rem; color: #8b5cf6;">연자</div>
                </div>
            </div>
        `;
        
        // 룸 목록
        html += `
            <div style="margin-bottom: 16px;">
                <strong>🚪 룸:</strong>
                <span style="color: #666; font-size: 0.9rem; margin-left: 8px;">
                    ${data.rooms.map(r => r.replace(/^\([토일]\)/, '')).join(', ')}
                </span>
            </div>
        `;
        
        // 강의 테이블 (간략)
        html += `
            <div style="max-height: 250px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                    <thead>
                        <tr style="background: #f1f5f9; position: sticky; top: 0;">
                            <th style="padding: 8px; text-align: left;">시간</th>
                            <th style="padding: 8px; text-align: left;">제목</th>
                            <th style="padding: 8px; text-align: left;">연자</th>
                            <th style="padding: 8px; text-align: left;">업체</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.lectures.slice(0, 30).forEach(lec => {
            html += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px 8px;">${lec._startTime}</td>
                    <td style="padding: 6px 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${lec.titleKo || '-'}</td>
                    <td style="padding: 6px 8px;">${lec.speakerKo || '-'}</td>
                    <td style="padding: 6px 8px;">${lec.isLuncheon ? '🎓' : lec.companyName}</td>
                </tr>
            `;
        });
        
        if (data.lectures.length > 30) {
            html += `<tr><td colspan="4" style="padding: 8px; text-align: center; color: #666;">... 외 ${data.lectures.length - 30}개</td></tr>`;
        }
        
        html += '</tbody></table></div>';
        
        // 안내 메시지
        html += `
            <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 0.85rem;">
                💡 저장 후 <strong>[🔍 동선검증]</strong> 버튼을 클릭하여 연자/좌장 동선을 확인하세요.
            </div>
        `;
        
        preview.innerHTML = html;
        document.getElementById('lectureImportSaveBtn').disabled = false;
    }

    // ============================================
    // 저장
    // ============================================
    
    window.saveLectureImport = async function() {
        if (!parsedImportData) {
            Toast.warning('업로드할 데이터가 없습니다.');
            return;
        }
        
        if (!AppState.currentDate) {
            Toast.warning('날짜를 먼저 선택해주세요.');
            return;
        }
        
        const confirmMsg = `${AppState.currentDate}에 ${parsedImportData.lectures.length}개 강의를 등록하시겠습니까?`;
        if (!confirm(confirmMsg)) return;
        
        try {
            Toast.info('저장 중...');
            
            // 1. 룸 설정
            await updateRoomSettings(parsedImportData.rooms);
            
            // 2. 강의 목록
            const lectures = parsedImportData.lectures.map(lec => ({
                id: lec.id,
                titleKo: lec.titleKo,
                titleEn: lec.titleEn,
                speakerKo: lec.speakerKo,
                speakerEn: lec.speakerEn,
                affiliation: lec.affiliation,
                duration: lec.duration,
                category: lec.category,
                companyName: lec.companyName,
                productName: lec.productName,
                isLuncheon: lec.isLuncheon
            }));
            
            // 3. 스케줄
            const schedule = {};
            parsedImportData.lectures.forEach(lec => {
                const key = `${lec._startTime}-${lec._room}`;
                schedule[key] = {
                    id: lec.id,
                    titleKo: lec.titleKo,
                    speakerKo: lec.speakerKo,
                    affiliation: lec.affiliation,
                    duration: lec.duration,
                    category: lec.category,
                    companyName: lec.companyName,
                    productName: lec.productName,
                    isLuncheon: lec.isLuncheon
                };
            });
            
            // 4. 세션
            const sessions = parsedImportData.sessions.map(s => ({
                id: s.id,
                name: s.name,
                room: s.room,
                time: s.time,
                duration: s.duration,
                moderator: s.moderator
            }));
            
            // 5. Firebase 저장
            if (typeof eventRef === 'function') {
                const dateDataRef = eventRef(`data/dataByDate/${AppState.currentDate}`);
                if (dateDataRef) {
                    await dateDataRef.set({
                        lectures: lectures,
                        schedule: schedule,
                        sessions: sessions
                    });
                }
            }
            
            // 6. 연자/업체 병합
            await mergeSpeakers(parsedImportData.speakers);
            await mergeCompanies(parsedImportData.companies);
            
            // 7. 로컬 상태
            AppState.lectures = lectures;
            AppState.schedule = schedule;
            AppState.sessions = sessions;
            AppState.rooms = parsedImportData.rooms;
            
            // 8. UI 업데이트
            if (typeof createRoomTabs === 'function') createRoomTabs();
            if (typeof createScheduleTable === 'function') createScheduleTable();
            if (typeof updateScheduleDisplay === 'function') updateScheduleDisplay();
            if (typeof updateLectureList === 'function') updateLectureList();
            
            Toast.success(`${lectures.length}개 강의 저장 완료! 🔍 동선검증을 확인하세요.`);
            closeLectureImportModal();
            
            // 동선검증 패널 자동 열기 (선택)
            // if (typeof openScheduleValidator === 'function') openScheduleValidator();
            
        } catch (error) {
            console.error('저장 실패:', error);
            Toast.error('저장 실패: ' + error.message);
        }
    };
    
    async function updateRoomSettings(rooms) {
        if (!AppState.currentDate || !rooms) return;
        if (!AppConfig.ROOMS_BY_DATE) AppConfig.ROOMS_BY_DATE = {};
        AppConfig.ROOMS_BY_DATE[AppState.currentDate] = rooms;
        
        if (typeof eventRef === 'function') {
            const ref = eventRef(`settings/roomsByDate/${AppState.currentDate}`);
            if (ref) await ref.set(rooms);
        }
    }
    
    async function mergeSpeakers(newSpeakers) {
        if (!newSpeakers || newSpeakers.length === 0) return;
        const map = new Map((AppState.speakers || []).map(s => [s.name, s]));
        newSpeakers.forEach(s => { if (!map.has(s.name)) map.set(s.name, s); });
        AppState.speakers = Array.from(map.values());
        
        if (typeof eventRef === 'function') {
            const ref = eventRef('data/speakers');
            if (ref) await ref.set(AppState.speakers);
        }
    }
    
    async function mergeCompanies(newCompanies) {
        if (!newCompanies || newCompanies.length === 0) return;
        const set = new Set((AppState.companies || []).map(c => typeof c === 'string' ? c : c.name));
        newCompanies.forEach(c => set.add(c));
        AppState.companies = Array.from(set).map(name => ({ name }));
        
        if (typeof eventRef === 'function') {
            const ref = eventRef('data/companies');
            if (ref) await ref.set(AppState.companies);
        }
    }

    // ============================================
    // 템플릿
    // ============================================
    
    window.downloadLectureTemplate = function() {
        const data = [
            ['룸명', '강의시간입력', '시작', '종료', '좌장/사회', '좌장명', '세션명', '제목', '병원명', '연자명', '제품명', '업체'],
            ['(토)1층 전시장A', 20, '15:00', '15:20', '좌장', '홍길동', 'Session 1', '강의 제목', '서울의원', '김철수', '', '학회강의'],
            ['(토)1층 전시장A', 20, '15:20', '15:40', '좌장', '홍길동', 'Session 1', '제품 강의', '연세의원', '이영희', '제품A', 'ABC제약']
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 35 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Lectures');
        XLSX.writeFile(wb, `lecture_template_${AppState.currentDate || 'sample'}.xlsx`);
        Toast.success('템플릿 다운로드 완료');
    };

})();

console.log('✅ lecture-import.js 로드 완료');
