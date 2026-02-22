/**
 * Mobile Optimization Module
 * 
 * 모바일 디바이스를 위한 터치 인터랙션 및 뷰 최적화
 */

const MobileHandler = {
  isMobile: false,
  isTablet: false,
  isTimelineView: false,
  touchStartX: 0,
  touchStartY: 0,

  /**
   * 초기화
   */
  init() {
    this.detectDevice();
    
    if (this.isMobile || this.isTablet) {
      document.body.classList.add('mobile-mode');
      this.setupMobileInteractions();
      this.setupViewToggle();
      this.setupTouchGestures();
      
      console.log('[Mobile] 모바일 모드 활성화');
    }

    // 화면 회전 감지
    window.addEventListener('orientationchange', () => {
      this.handleOrientationChange();
    });

    // 리사이즈 감지
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 250);
    });
  },

  /**
   * 디바이스 감지
   */
  detectDevice() {
    const ua = navigator.userAgent;
    
    this.isMobile = /iPhone|iPod|Android.*Mobile/i.test(ua);
    this.isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
    
    // 화면 크기로도 판단
    if (window.innerWidth < 768) {
      this.isMobile = true;
    } else if (window.innerWidth < 1024) {
      this.isTablet = true;
    }

    AppState.ui.isMobileView = this.isMobile || this.isTablet;
  },

  /**
   * 모바일 인터랙션 설정
   */
  setupMobileInteractions() {
    // 드래그 비활성화
    this.disableDragAndDrop();

    // 클릭 기반 인터랙션으로 변경
    this.enableClickInteraction();

    // 롱프레스 메뉴
    this.setupLongPress();

    // 스와이프 네비게이션
    this.setupSwipeNavigation();
  },

  /**
   * 드래그앤드롭 비활성화
   */
  disableDragAndDrop() {
    document.addEventListener('DOMContentLoaded', () => {
      const cells = document.querySelectorAll('.schedule-cell, .lecture-item');
      cells.forEach(cell => {
        cell.removeAttribute('draggable');
        cell.classList.add('mobile-cell');
      });
    });
  },

  /**
   * 클릭 기반 인터랙션 활성화
   */
  enableClickInteraction() {
    // 이벤트 위임 사용
    document.addEventListener('click', (e) => {
      // 스케줄 셀 클릭
      const cell = e.target.closest('.schedule-cell');
      if (cell && !cell.classList.contains('locked-by-other')) {
        this.handleCellClick(cell);
        return;
      }

      // 강의 카드 클릭
      const lectureCard = e.target.closest('.lecture-card');
      if (lectureCard) {
        this.handleLectureClick(lectureCard);
        return;
      }
    });
  },

  /**
   * 셀 클릭 처리
   */
  handleCellClick(cell) {
    const time = cell.dataset.time;
    const room = cell.dataset.room;
    const lectureId = cell.dataset.lectureId;

    if (!time || !room) return;

    // Lock 확인
    if (cell.classList.contains('locked-by-other')) {
      const lockedBy = cell.getAttribute('data-locked-by');
      showToast(`${lockedBy}님이 편집 중입니다`, 'warning');
      return;
    }

    // Lock 설정
    PresenceManager.lockCell(time, room);

    if (lectureId) {
      // 기존 강의 편집
      this.showLectureEditBottomSheet(lectureId, time, room);
    } else {
      // 새 강의 배치
      this.showLecturePickerBottomSheet(time, room);
    }
  },

  /**
   * 강의 선택 Bottom Sheet 표시
   */
  showLecturePickerBottomSheet(time, room) {
    const lectures = Array.from(AppState.lectures.values())
      .filter(l => !this.isLectureScheduled(l.id));

    if (lectures.length === 0) {
      showToast('배치 가능한 강의가 없습니다', 'info');
      PresenceManager.unlockCell(time, room);
      return;
    }

    const html = `
      <div class="bottom-sheet" id="lecturePickerSheet">
        <div class="bottom-sheet-header">
          <h3>강의 선택</h3>
          <p class="subtitle">${time} · ${room}</p>
          <button class="bottom-sheet-close" onclick="MobileHandler.closeBottomSheet()">✕</button>
        </div>
        <div class="bottom-sheet-body">
          <div class="lecture-picker-list">
            ${lectures.map(lecture => this.createLecturePickerItem(lecture, time, room)).join('')}
          </div>
        </div>
      </div>
      <div class="bottom-sheet-overlay" onclick="MobileHandler.closeBottomSheet()"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    
    // 애니메이션
    setTimeout(() => {
      document.getElementById('lecturePickerSheet').classList.add('show');
      document.querySelector('.bottom-sheet-overlay').classList.add('show');
    }, 10);
  },

  /**
   * 강의 선택 아이템 생성
   */
  createLecturePickerItem(lecture, time, room) {
    const speaker = AppState.speakers.get(lecture.speakerId);
    const speakerName = speaker ? speaker.name : '연자 미정';

    return `
      <div class="lecture-picker-item" onclick="MobileHandler.placeLecture('${lecture.id}', '${time}', '${room}')">
        <div class="lecture-title">${lecture.title || '제목 없음'}</div>
        <div class="lecture-speaker">${speakerName}</div>
        <div class="lecture-duration">${lecture.duration || 15}분</div>
      </div>
    `;
  },

  /**
   * 강의 배치
   */
  async placeLecture(lectureId, time, room) {
    this.closeBottomSheet();

    try {
      // schedule.js의 함수 호출
      if (typeof placeLectureOnSchedule === 'function') {
        await placeLectureOnSchedule(lectureId, time, room);
        showToast('강의가 배치되었습니다', 'success');
      }
    } catch (error) {
      console.error('[Mobile] 강의 배치 오류:', error);
      showToast('강의 배치에 실패했습니다', 'error');
    } finally {
      PresenceManager.unlockCell(time, room);
    }
  },

  /**
   * Bottom Sheet 닫기
   */
  closeBottomSheet() {
    const sheet = document.querySelector('.bottom-sheet');
    const overlay = document.querySelector('.bottom-sheet-overlay');

    if (sheet) {
      sheet.classList.remove('show');
    }
    if (overlay) {
      overlay.classList.remove('show');
    }

    setTimeout(() => {
      if (sheet) sheet.remove();
      if (overlay) overlay.remove();
    }, 300);

    // 모든 Lock 해제
    PresenceManager.unlockAll();
  },

  /**
   * 롱프레스 메뉴 설정
   */
  setupLongPress() {
    let pressTimer;

    document.addEventListener('touchstart', (e) => {
      const target = e.target.closest('.schedule-cell, .lecture-card');
      if (!target) return;

      pressTimer = setTimeout(() => {
        this.showContextMenu(target, e.touches[0].pageX, e.touches[0].pageY);
      }, 500);
    });

    document.addEventListener('touchend', () => {
      clearTimeout(pressTimer);
    });

    document.addEventListener('touchmove', () => {
      clearTimeout(pressTimer);
    });
  },

  /**
   * 컨텍스트 메뉴 표시
   */
  showContextMenu(target, x, y) {
    // 진동 피드백
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const lectureId = target.dataset.lectureId;
    if (!lectureId) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    menu.innerHTML = `
      <div class="context-menu-item" onclick="editLecture('${lectureId}')">
        ✏️ 수정
      </div>
      <div class="context-menu-item" onclick="removeLectureFromSchedule('${lectureId}')">
        🗑️ 제거
      </div>
      <div class="context-menu-item" onclick="MobileHandler.closeContextMenu()">
        ✕ 취소
      </div>
    `;

    document.body.appendChild(menu);

    // 외부 클릭 시 닫기
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }, {once: true});
    }, 100);
  },

  /**
   * 컨텍스트 메뉴 닫기
   */
  closeContextMenu() {
    const menu = document.querySelector('.context-menu');
    if (menu) menu.remove();
  },

  /**
   * 뷰 전환 토글 설정
   */
  setupViewToggle() {
    const toggleBtn = document.getElementById('mobileViewToggle');
    if (!toggleBtn) return;

    toggleBtn.style.display = 'inline-block';
    toggleBtn.onclick = () => this.toggleTimelineView();
  },

  /**
   * 타임라인 뷰 전환
   */
  toggleTimelineView() {
    this.isTimelineView = !this.isTimelineView;
    
    document.body.classList.toggle('timeline-view', this.isTimelineView);
    
    const toggleBtn = document.getElementById('mobileViewToggle');
    if (toggleBtn) {
      toggleBtn.textContent = this.isTimelineView ? '📊' : '📱';
      toggleBtn.title = this.isTimelineView ? '그리드 뷰' : '타임라인 뷰';
    }

    // 스케줄 재렌더링
    if (typeof updateScheduleDisplay === 'function') {
      updateScheduleDisplay();
    }
  },

  /**
   * 스와이프 네비게이션 설정
   */
  setupSwipeNavigation() {
    let startX = 0;
    let startY = 0;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].pageX;
      startY = e.touches[0].pageY;
    });

    document.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].pageX;
      const endY = e.changedTouches[0].pageY;

      const diffX = endX - startX;
      const diffY = endY - startY;

      // 가로 스와이프가 세로보다 크면
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 100) {
        if (diffX > 0) {
          this.handleSwipeRight();
        } else {
          this.handleSwipeLeft();
        }
      }
    });
  },

  /**
   * 오른쪽 스와이프
   */
  handleSwipeRight() {
    // 이전 세션으로 이동
    console.log('[Mobile] Swipe Right');
  },

  /**
   * 왼쪽 스와이프
   */
  handleSwipeLeft() {
    // 다음 세션으로 이동
    console.log('[Mobile] Swipe Left');
  },

  /**
   * 화면 회전 처리
   */
  handleOrientationChange() {
    setTimeout(() => {
      this.detectDevice();
      
      if (typeof updateScheduleDisplay === 'function') {
        updateScheduleDisplay();
      }

      console.log('[Mobile] 화면 회전 감지:', window.orientation);
    }, 200);
  },

  /**
   * 리사이즈 처리
   */
  handleResize() {
    this.detectDevice();
    
    if (AppState.ui.isMobileView !== (this.isMobile || this.isTablet)) {
      // 모드 변경됨
      location.reload();
    }
  },

  /**
   * 강의가 스케줄에 있는지 확인
   */
  isLectureScheduled(lectureId) {
    for (const item of AppState.schedule.values()) {
      if (item.id === lectureId && item.type !== 'break') {
        return true;
      }
    }
    return false;
  },

  /**
   * 터치 피드백 (햅틱)
   */
  vibrate(pattern = 50) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }
};

// 전역 접근
window.MobileHandler = MobileHandler;

// 자동 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MobileHandler.init());
} else {
  MobileHandler.init();
}
