/**
 * Toast Notification System
 * 
 * V1의 alert() 호출을 대체하는 비침입적 알림 시스템
 */

const Toast = {
  container: null,
  queue: [],
  isShowing: false,

  /**
   * 초기화
   */
  init() {
    this.container = document.getElementById('toastContainer');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  /**
   * Toast 표시
   * @param {string} message - 메시지
   * @param {string} type - 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - 표시 시간 (ms)
   */
  show(message, type = 'info', duration = 3000) {
    if (!this.container) {
      this.init();
    }

    const toast = this.createToast(message, type);
    this.container.appendChild(toast);

    // 애니메이션 시작
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // 자동 제거
    setTimeout(() => {
      this.hide(toast);
    }, duration);

    return toast;
  },

  /**
   * Toast 엘리먼트 생성
   */
  createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = this.getIcon(type);
    
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${this.escapeHtml(message)}</div>
      <button class="toast-close" onclick="Toast.hide(this.parentElement)">✕</button>
    `;

    return toast;
  },

  /**
   * Toast 숨기기
   */
  hide(toast) {
    if (!toast || !toast.parentElement) return;

    toast.classList.remove('show');
    toast.classList.add('hide');

    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 300);
  },

  /**
   * 타입별 아이콘
   */
  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  },

  /**
   * HTML 이스케이프
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * 모든 Toast 제거
   */
  clearAll() {
    if (!this.container) return;
    
    const toasts = this.container.querySelectorAll('.toast');
    toasts.forEach(toast => this.hide(toast));
  },

  /**
   * 프로그레스 Toast (진행률 표시)
   */
  showProgress(message, progress = 0) {
    if (!this.container) {
      this.init();
    }

    const toastId = 'progress-toast-' + Date.now();
    const existing = document.getElementById(toastId);
    
    if (existing) {
      // 기존 Toast 업데이트
      const progressBar = existing.querySelector('.toast-progress-fill');
      const messageEl = existing.querySelector('.toast-message');
      
      if (progressBar) {
        progressBar.style.width = progress + '%';
      }
      if (messageEl) {
        messageEl.textContent = message;
      }
      
      return existing;
    }

    // 새 Toast 생성
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = 'toast toast-progress';
    
    toast.innerHTML = `
      <div class="toast-message">${this.escapeHtml(message)}</div>
      <div class="toast-progress-bar">
        <div class="toast-progress-fill" style="width: ${progress}%"></div>
      </div>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    return toast;
  },

  /**
   * 프로그레스 Toast 완료
   */
  completeProgress(toastId, successMessage = '완료!') {
    const toast = document.getElementById(toastId);
    if (!toast) return;

    const progressBar = toast.querySelector('.toast-progress-fill');
    if (progressBar) {
      progressBar.style.width = '100%';
    }

    setTimeout(() => {
      toast.classList.remove('toast-progress');
      toast.classList.add('toast-success');
      
      const messageEl = toast.querySelector('.toast-message');
      if (messageEl) {
        messageEl.textContent = successMessage;
      }

      setTimeout(() => {
        this.hide(toast);
      }, 2000);
    }, 500);
  },

  /**
   * 확인 Toast (사용자 입력 필요)
   */
  confirm(message, onConfirm, onCancel) {
    if (!this.container) {
      this.init();
    }

    const toast = document.createElement('div');
    toast.className = 'toast toast-confirm';
    
    toast.innerHTML = `
      <div class="toast-message">${this.escapeHtml(message)}</div>
      <div class="toast-actions">
        <button class="toast-btn toast-btn-confirm">확인</button>
        <button class="toast-btn toast-btn-cancel">취소</button>
      </div>
    `;

    this.container.appendChild(toast);

    const confirmBtn = toast.querySelector('.toast-btn-confirm');
    const cancelBtn = toast.querySelector('.toast-btn-cancel');

    confirmBtn.onclick = () => {
      this.hide(toast);
      if (onConfirm) onConfirm();
    };

    cancelBtn.onclick = () => {
      this.hide(toast);
      if (onCancel) onCancel();
    };

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    return toast;
  }
};

// 전역 함수로 등록 (기존 코드 호환성)
window.showToast = (message, type, duration) => {
  return Toast.show(message, type, duration);
};

window.Toast = Toast;

// DOM 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Toast.init());
} else {
  Toast.init();
}
