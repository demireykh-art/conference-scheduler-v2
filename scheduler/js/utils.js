/**
 * utils.js - 유틸리티 함수 (상용화 버전)
 * 
 * ⚠️ 하드코딩 없음 - 모든 설정은 Firebase에서 동적 로드
 */

(function() {
    'use strict';

    // ============================================
    // 시간 관련 유틸리티
    // ============================================
    
    /**
     * 시간 문자열을 분 단위로 변환
     * @param {string} time - "HH:MM" 형식
     * @returns {number} 총 분
     */
    window.timeToMinutes = function(time) {
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };
    
    /**
     * 분 단위를 시간 문자열로 변환
     * @param {number} minutes - 총 분
     * @returns {string} "HH:MM" 형식
     */
    window.minutesToTime = function(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    
    /**
     * 시작 시간과 duration으로 종료 시간 계산
     * @param {string} startTime - "HH:MM"
     * @param {number} duration - 분 단위
     * @returns {string} 종료 시간 "HH:MM"
     */
    window.calculateEndTime = function(startTime, duration) {
        const startMinutes = timeToMinutes(startTime);
        return minutesToTime(startMinutes + duration);
    };
    
    /**
     * 두 시간대가 겹치는지 확인
     * @param {string} start1 - 첫 번째 시작
     * @param {number} duration1 - 첫 번째 duration
     * @param {string} start2 - 두 번째 시작
     * @param {number} duration2 - 두 번째 duration
     * @returns {boolean}
     */
    window.timesOverlap = function(start1, duration1, start2, duration2) {
        const s1 = timeToMinutes(start1);
        const e1 = s1 + duration1;
        const s2 = timeToMinutes(start2);
        const e2 = s2 + duration2;
        return s1 < e2 && s2 < e1;
    };

    // ============================================
    // 룸 관련 유틸리티
    // ============================================
    
    /**
     * 룸 이름 정규화 (비교용)
     * - 날짜 표시 제거: "(토)", "(일)"
     * - 층수 제거: "1층 ", "4층 "
     * - 공백 정리
     */
    window.normalizeRoomName = function(roomName) {
        if (!roomName) return '';
        return roomName
            .replace(/^\([토일월화수목금]\)/g, '')
            .replace(/^\d층\s*/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };
    
    /**
     * 의협제출용(KMA) 룸인지 확인
     * Firebase /settings/kmaRooms에서 설정
     */
    window.isStarredRoom = function(roomName) {
        if (!roomName) return false;
        const normalizedRoom = normalizeRoomName(roomName);
        const kmaRooms = AppState.kmaRooms?.[AppState.currentDate] || [];
        return kmaRooms.some(kma => normalizeRoomName(kma) === normalizedRoom);
    };
    
    /**
     * 룸 이름에서 표시용 짧은 이름 추출
     */
    window.getDisplayRoomName = function(roomName) {
        if (!roomName) return '';
        
        // 괄호 안 날짜 제거
        let name = roomName.replace(/^\([토일월화수목금]\)\s*/g, '');
        
        // 층수 부분은 유지하되 "전시장" 같은 긴 이름은 축약
        if (name.length > 20) {
            name = name.substring(0, 17) + '...';
        }
        
        return name;
    };

    // ============================================
    // 권한 관련 유틸리티
    // ============================================
    
    /**
     * 현재 사용자가 관리자인지 확인
     */
    window.isAdmin = function() {
        return AppState.currentUserRole === 'admin';
    };
    
    /**
     * 현재 사용자가 편집 권한이 있는지 확인
     */
    window.canEdit = function() {
        return ['admin', 'editor'].includes(AppState.currentUserRole);
    };
    
    /**
     * 편집 권한 확인 후 경고
     */
    window.checkEditPermission = function() {
        if (!canEdit()) {
            Toast.warning('편집 권한이 없습니다. 관리자에게 문의하세요.');
            return false;
        }
        return true;
    };

    // ============================================
    // ID 생성 유틸리티
    // ============================================
    
    /**
     * 고유 ID 생성
     */
    window.generateId = function() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    };
    
    /**
     * 강의 ID 생성
     */
    window.generateLectureId = function() {
        const existing = (AppState.lectures || []).map(l => l.id).filter(id => !isNaN(id));
        const maxId = existing.length > 0 ? Math.max(...existing) : 0;
        return maxId + 1;
    };

    // ============================================
    // 텍스트/문자열 유틸리티
    // ============================================
    
    /**
     * HTML 이스케이프
     */
    window.escapeHtml = function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    /**
     * 텍스트 하이라이트 (검색용)
     */
    window.highlightText = function(text, searchTerm) {
        if (!text || !searchTerm) return text || '';
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    };
    
    /**
     * 문자열 자르기 (말줄임)
     */
    window.truncateText = function(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength - 3) + '...';
    };

    // ============================================
    // 배열/객체 유틸리티
    // ============================================
    
    /**
     * 깊은 복사
     */
    window.deepClone = function(obj) {
        return JSON.parse(JSON.stringify(obj));
    };
    
    /**
     * 배열 중복 제거
     */
    window.uniqueArray = function(arr, key = null) {
        if (!key) {
            return [...new Set(arr)];
        }
        const seen = new Set();
        return arr.filter(item => {
            const value = item[key];
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
        });
    };

    // ============================================
    // 카테고리 유틸리티
    // ============================================
    
    /**
     * 카테고리 색상 가져오기
     */
    window.getCategoryColor = function(category) {
        if (!category) return '#757575';
        return AppConfig.categoryColors?.[category] || '#757575';
    };
    
    /**
     * Break 타입인지 확인
     */
    window.isBreakType = function(category) {
        const breakTypes = AppConfig.BREAK_TYPES || ['Coffee Break', 'Lunch', 'Opening/Closing', 'Panel Discussion'];
        return breakTypes.includes(category);
    };

    // ============================================
    // 스케줄 키 유틸리티
    // ============================================
    
    /**
     * 스케줄 키 생성
     * @param {string} time - "HH:MM"
     * @param {string} room - 룸 이름
     * @returns {string} "HH:MM-룸이름"
     */
    window.makeScheduleKey = function(time, room) {
        return `${time}-${room}`;
    };
    
    /**
     * 스케줄 키 파싱
     * @param {string} key - "HH:MM-룸이름"
     * @returns {object} { time, room }
     */
    window.parseScheduleKey = function(key) {
        if (!key) return { time: '', room: '' };
        const time = key.substring(0, 5);
        const room = key.substring(6);
        return { time, room };
    };

    // ============================================
    // 날짜 유틸리티
    // ============================================
    
    /**
     * 날짜 포맷팅
     * @param {string} dateStr - "YYYY-MM-DD"
     * @returns {string} 요일 포함 포맷
     */
    window.formatDate = function(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const day = days[date.getDay()];
        const month = date.getMonth() + 1;
        const dateNum = date.getDate();
        return `${month}/${dateNum} (${day})`;
    };
    
    /**
     * 현재 날짜 문자열 (YYYY-MM-DD)
     */
    window.getTodayString = function() {
        return new Date().toISOString().split('T')[0];
    };

    // ============================================
    // 연자 관련 유틸리티
    // ============================================
    
    /**
     * 연자 이름으로 연자 정보 찾기
     */
    window.findSpeakerByName = function(name) {
        if (!name) return null;
        const normalizedName = name.trim().toLowerCase();
        return (AppState.speakers || []).find(s => 
            s.name?.toLowerCase() === normalizedName ||
            s.nameEn?.toLowerCase() === normalizedName
        );
    };
    
    /**
     * 연자의 ASLS 회원 여부 확인
     */
    window.isSpeakerASLS = function(speakerName) {
        const speaker = findSpeakerByName(speakerName);
        return speaker?.isASLS === true;
    };

    // ============================================
    // 충돌 검사 유틸리티
    // ============================================
    
    /**
     * 연자 시간 충돌 검사
     * @param {string} speakerName - 연자 이름
     * @param {string} time - 시작 시간
     * @param {number} duration - 시간 (분)
     * @param {string} excludeKey - 제외할 스케줄 키
     * @returns {object|null} 충돌 정보 또는 null
     */
    window.checkSpeakerConflict = function(speakerName, time, duration, excludeKey = null) {
        if (!speakerName || !time) return null;
        
        const transferTime = AppConfig.SPEAKER_TRANSFER_TIME || 10;
        const startMin = timeToMinutes(time) - transferTime;
        const endMin = timeToMinutes(time) + duration + transferTime;
        
        for (const [key, lecture] of Object.entries(AppState.schedule || {})) {
            if (key === excludeKey) continue;
            
            // 연자 이름 비교
            const lectureSpeaker = lecture.speakerKo || lecture.speakerEn || '';
            if (lectureSpeaker.toLowerCase() !== speakerName.toLowerCase()) continue;
            
            // 시간 충돌 확인
            const lecTime = key.substring(0, 5);
            const lecStart = timeToMinutes(lecTime);
            const lecEnd = lecStart + (lecture.duration || 10);
            
            if (startMin < lecEnd && lecStart < endMin) {
                return {
                    conflictKey: key,
                    lecture: lecture,
                    message: `${speakerName}님이 ${lecTime}에 다른 강의가 있습니다.`
                };
            }
        }
        
        return null;
    };

    // ============================================
    // 로딩 상태 유틸리티
    // ============================================
    
    /**
     * 로딩 오버레이 표시
     */
    window.showLoading = function(message = '로딩 중...') {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="loading-message">${message}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('.loading-message').textContent = message;
            overlay.classList.remove('hidden');
        }
    };
    
    /**
     * 로딩 오버레이 숨기기
     */
    window.hideLoading = function() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    };

    // ============================================
    // 디바운스/쓰로틀
    // ============================================
    
    /**
     * 디바운스
     */
    window.debounce = function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };
    
    /**
     * 쓰로틀
     */
    window.throttle = function(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

})();

console.log('✅ utils.js 로드 완료');
