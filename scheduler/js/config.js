/**
 * config.js - 설정 모듈
 * 
 * 기능:
 * - 시간표 시작/종료 시간 설정
 * - 시간 간격 설정
 * - 설정 모달 UI
 */

(function() {
    'use strict';

// ============================================
// Firebase 초기화 — 반드시 다른 모듈보다 먼저 실행
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyDw-hivDT9T-Iq3s3kiuTRqaumicSoWdcU",
    authDomain: "scheduler2-99724.firebaseapp.com",
    databaseURL: "https://scheduler2-99724-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "scheduler2-99724",
    storageBucket: "scheduler2-99724.firebasestorage.app",
    messagingSenderId: "1023522399376",
    appId: "1:1023522399376:web:201a526635a7058917e415"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
window.auth     = firebase.auth();
window.database = firebase.database();
console.log('🔥 Firebase 초기화 완료');

    // ============================================
    // 기본 설정
    // ============================================
    
    window.AppConfig = window.AppConfig || {
        TIME_SETTINGS: {
            start: '08:30',
            end: '18:00',
            interval: 5
        },
        ROOMS_BY_DATE: {}
    };
    
    // ============================================
    // 시간 설정 모달
    // ============================================
    
    /**
     * 시간 설정 모달 열기
     */
    window.openTimeSettingsModal = function() {
        if (typeof checkEditPermission === 'function' && !checkEditPermission()) return;
        
        let modal = document.getElementById('timeSettingsModal');
        if (!modal) {
            modal = createTimeSettingsModal();
            document.body.appendChild(modal);
        }
        
        // 현재 설정 값 채우기
        const settings = AppConfig.TIME_SETTINGS || {};
        document.getElementById('settingStartTime').value = settings.start || '08:30';
        document.getElementById('settingEndTime').value = settings.end || '18:00';
        document.getElementById('settingInterval').value = settings.interval || 5;
        
        modal.classList.add('active');
    };
    
    /**
     * 시간 설정 모달 생성
     */
    function createTimeSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'timeSettingsModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>⏰ 시간표 설정</h2>
                    <button class="btn btn-secondary btn-small" onclick="closeTimeSettingsModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>시작 시간</label>
                        <input type="time" id="settingStartTime" class="form-control" value="08:30">
                        <small style="color: #64748b; font-size: 0.8rem;">시간표의 첫 번째 시간</small>
                    </div>
                    
                    <div class="form-group">
                        <label>종료 시간</label>
                        <input type="time" id="settingEndTime" class="form-control" value="18:00">
                        <small style="color: #64748b; font-size: 0.8rem;">시간표의 마지막 시간</small>
                    </div>
                    
                    <div class="form-group">
                        <label>시간 간격 (분)</label>
                        <select id="settingInterval" class="form-control">
                            <option value="5">5분</option>
                            <option value="10">10분</option>
                            <option value="15">15분</option>
                            <option value="30">30분</option>
                        </select>
                        <small style="color: #64748b; font-size: 0.8rem;">각 행의 시간 간격</small>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 16px;">
                        <strong>💡 참고:</strong><br>
                        <span style="font-size: 0.85rem;">
                            이 설정은 현재 행사의 모든 날짜에 적용됩니다.
                        </span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeTimeSettingsModal()">취소</button>
                    <button class="btn btn-primary" onclick="saveTimeSettings()">저장</button>
                </div>
            </div>
        `;
        return modal;
    }
    
    /**
     * 모달 닫기
     */
    window.closeTimeSettingsModal = function() {
        const modal = document.getElementById('timeSettingsModal');
        if (modal) modal.classList.remove('active');
    };
    
    /**
     * 시간 설정 저장
     */
    window.saveTimeSettings = async function() {
        const startTime = document.getElementById('settingStartTime').value;
        const endTime = document.getElementById('settingEndTime').value;
        const interval = parseInt(document.getElementById('settingInterval').value);
        
        // 유효성 검사
        if (startTime >= endTime) {
            Toast.warning('종료 시간은 시작 시간보다 늦어야 합니다.');
            return;
        }
        
        // 설정 업데이트
        AppConfig.TIME_SETTINGS = {
            start: startTime,
            end: endTime,
            interval: interval
        };
        
        // Firebase 저장
        if (typeof eventRef === 'function') {
            try {
                const ref = eventRef('settings/timeSettings');
                if (ref) await ref.set(AppConfig.TIME_SETTINGS);
            } catch (error) {
                console.error('시간 설정 저장 실패:', error);
            }
        }
        
        // 시간표 다시 생성
        if (typeof createScheduleTable === 'function') {
            createScheduleTable();
        }
        
        closeTimeSettingsModal();
        Toast.success('시간 설정이 저장되었습니다.');
    };
    
    /**
     * Firebase에서 시간 설정 로드
     */
    window.loadTimeSettings = async function() {
        if (typeof eventRef !== 'function') return;
        
        try {
            const ref = eventRef('settings/timeSettings');
            if (ref) {
                const snapshot = await ref.once('value');
                const settings = snapshot.val();
                if (settings) {
                    AppConfig.TIME_SETTINGS = {
                        start: settings.start || '08:30',
                        end: settings.end || '18:00',
                        interval: settings.interval || 5
                    };
                    console.log('시간 설정 로드:', AppConfig.TIME_SETTINGS);
                }
            }
        } catch (error) {
            console.error('시간 설정 로드 실패:', error);
        }
    };

})();

console.log('✅ config.js 로드 완료');
