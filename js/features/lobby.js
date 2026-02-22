/**
 * Event Lobby Management
 * 
 * 사용자의 행사 목록을 관리하고 행사 간 전환을 처리합니다.
 */

const EventLobby = {
  currentUser: null,

  /**
   * 사용자의 행사 목록 로드
   */
  async loadUserEvents() {
    if (!firebase.auth().currentUser) {
      console.error('[Lobby] 로그인되지 않음');
      return [];
    }

    this.currentUser = firebase.auth().currentUser;

    try {
      const eventsRef = FirebaseRefs.userEvents(this.currentUser.uid);
      const snapshot = await eventsRef.once('value');
      const eventsData = snapshot.val() || {};

      const events = Object.entries(eventsData).map(([id, data]) => ({
        id,
        ...data,
        lastAccessed: data.lastAccessed || data.createdAt || Date.now()
      }));

      // 최근 접속 순으로 정렬
      events.sort((a, b) => b.lastAccessed - a.lastAccessed);

      this.renderEventsList(events);

      return events;
    } catch (error) {
      console.error('[Lobby] 행사 목록 로드 오류:', error);
      showToast('행사 목록을 불러오는데 실패했습니다', 'error');
      return [];
    }
  },

  /**
   * 행사 목록 렌더링
   */
  renderEventsList(events) {
    const container = document.getElementById('eventsContainer');
    const emptyState = document.getElementById('emptyState');

    if (!container) return;

    if (events.length === 0) {
      container.innerHTML = '';
      if (emptyState) {
        emptyState.style.display = 'flex';
      }
      return;
    }

    if (emptyState) {
      emptyState.style.display = 'none';
    }

    container.innerHTML = events.map(event => this.createEventCard(event)).join('');
  },

  /**
   * 행사 카드 HTML 생성
   */
  createEventCard(event) {
    const countryFlag = this.getCountryFlag(event.country);
    const roleColor = this.getRoleColor(event.role);
    const lastAccessed = new Date(event.lastAccessed).toLocaleDateString('ko-KR');
    const timezoneInfo = TimeZoneManager.getTimezoneInfo(event.timezone);

    return `
      <div class="event-card" onclick="EventLobby.switchToEvent('${event.id}')">
        <div class="event-card-header">
          <h3 class="event-card-title">${this.escapeHtml(event.name)}</h3>
          <span class="event-role" style="background: ${roleColor}">
            ${this.getRoleLabel(event.role)}
          </span>
        </div>
        
        <div class="event-card-meta">
          <div class="event-meta-item">
            <span class="meta-icon">${countryFlag}</span>
            <span>${event.country}</span>
          </div>
          <div class="event-meta-item">
            <span class="meta-icon">🕐</span>
            <span>${timezoneInfo.name}</span>
          </div>
          <div class="event-meta-item">
            <span class="meta-icon">📅</span>
            <span>${event.type}</span>
          </div>
        </div>

        ${event.description ? `
          <div class="event-card-description">
            ${this.escapeHtml(event.description)}
          </div>
        ` : ''}

        <div class="event-card-footer">
          <span class="event-last-accessed">최근 접속: ${lastAccessed}</span>
          <div class="event-card-actions" onclick="event.stopPropagation()">
            <button class="btn-icon" onclick="EventLobby.showEventSettings('${event.id}')" title="설정">
              ⚙️
            </button>
            <button class="btn-icon" onclick="EventLobby.duplicateEvent('${event.id}')" title="복제">
              📋
            </button>
            ${event.role === 'owner' ? `
              <button class="btn-icon" onclick="EventLobby.deleteEvent('${event.id}')" title="삭제">
                🗑️
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 새 행사 생성
   */
  async createNewEvent(eventData) {
    if (!this.currentUser) {
      showToast('로그인이 필요합니다', 'error');
      return null;
    }

    const { name, country, timezone, type, description } = eventData;

    try {
      // 고유 ID 생성
      const eventId = this.generateEventId();

      const eventInfo = {
        name,
        country,
        timezone,
        type: type || 'conference',
        description: description || '',
        createdAt: Date.now(),
        createdBy: this.currentUser.uid,
        owner: this.currentUser.email,
        lastModified: Date.now(),
        lastAccessed: Date.now()
      };

      // Firebase에 행사 데이터 구조 생성
      const updates = {};
      
      // 행사 기본 정보
      updates[`/events/${eventId}/info`] = eventInfo;
      
      // 행사 데이터 초기화
      updates[`/events/${eventId}/data`] = {
        speakers: {},
        lectures: {},
        schedule: {},
        sessions: [],
        chairs: {},
        sponsors: [],
        roomsConfig: {
          rooms: [],
          timeSlots: [],
          sessionRooms: {},
          roomColors: {},
          kmaRooms: []
        }
      };

      // 사용자의 행사 목록에 추가
      updates[`/users/${this.currentUser.uid}/events/${eventId}`] = {
        ...eventInfo,
        role: 'owner'
      };

      await firebase.database().ref().update(updates);

      console.log('[Lobby] 행사 생성 완료:', eventId);
      return eventId;

    } catch (error) {
      console.error('[Lobby] 행사 생성 오류:', error);
      throw error;
    }
  },

  /**
   * 행사로 전환 (스케줄러 페이지 이동)
   */
  async switchToEvent(eventId) {
    try {
      // 최근 접속 시간 업데이트
      await firebase.database()
        .ref(`/users/${this.currentUser.uid}/events/${eventId}/lastAccessed`)
        .set(Date.now());

      // 스케줄러 페이지로 이동
      window.location.href = `scheduler.html?eventId=${eventId}`;

    } catch (error) {
      console.error('[Lobby] 행사 전환 오류:', error);
      showToast('행사를 열 수 없습니다', 'error');
    }
  },

  /**
   * 행사 설정 모달
   */
  async showEventSettings(eventId) {
    // TODO: 행사 설정 모달 구현
    showToast('행사 설정 기능은 준비 중입니다', 'info');
  },

  /**
   * 행사 복제
   */
  async duplicateEvent(eventId) {
    if (!confirm('이 행사를 복제하시겠습니까?')) {
      return;
    }

    try {
      showToast('행사 복제 중...', 'info');

      // 원본 행사 데이터 로드
      const originalRef = firebase.database().ref(`/events/${eventId}`);
      const snapshot = await originalRef.once('value');
      const originalData = snapshot.val();

      if (!originalData) {
        throw new Error('원본 행사를 찾을 수 없습니다');
      }

      // 새 행사 생성
      const newEventId = this.generateEventId();
      const newEventInfo = {
        ...originalData.info,
        name: originalData.info.name + ' (복사본)',
        createdAt: Date.now(),
        createdBy: this.currentUser.uid,
        owner: this.currentUser.email,
        lastModified: Date.now(),
        lastAccessed: Date.now()
      };

      const updates = {};
      updates[`/events/${newEventId}/info`] = newEventInfo;
      updates[`/events/${newEventId}/data`] = originalData.data;
      updates[`/users/${this.currentUser.uid}/events/${newEventId}`] = {
        ...newEventInfo,
        role: 'owner'
      };

      await firebase.database().ref().update(updates);

      showToast('행사가 복제되었습니다!', 'success');
      
      // 목록 새로고침
      await this.loadUserEvents();

    } catch (error) {
      console.error('[Lobby] 행사 복제 오류:', error);
      showToast('행사 복제에 실패했습니다', 'error');
    }
  },

  /**
   * 행사 삭제
   */
  async deleteEvent(eventId) {
    const confirmed = confirm(
      '정말로 이 행사를 삭제하시겠습니까?\n\n' +
      '⚠️ 모든 데이터(연자, 강의, 스케줄 등)가 영구적으로 삭제됩니다.\n' +
      '이 작업은 되돌릴 수 없습니다.'
    );

    if (!confirmed) return;

    const doubleCheck = prompt('삭제하려면 "삭제" 를 입력하세요:');
    if (doubleCheck !== '삭제') {
      showToast('삭제가 취소되었습니다', 'info');
      return;
    }

    try {
      showToast('행사 삭제 중...', 'info');

      const updates = {};
      updates[`/events/${eventId}`] = null;
      updates[`/users/${this.currentUser.uid}/events/${eventId}`] = null;

      await firebase.database().ref().update(updates);

      showToast('행사가 삭제되었습니다', 'success');
      
      // 목록 새로고침
      await this.loadUserEvents();

    } catch (error) {
      console.error('[Lobby] 행사 삭제 오류:', error);
      showToast('행사 삭제에 실패했습니다', 'error');
    }
  },

  /**
   * 고유 이벤트 ID 생성
   */
  generateEventId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `event_${timestamp}_${random}`;
  },

  /**
   * 국가 플래그 이모지
   */
  getCountryFlag(countryCode) {
    const flags = {
      KR: '🇰🇷', JP: '🇯🇵', TH: '🇹🇭', ID: '🇮🇩',
      VN: '🇻🇳', SG: '🇸🇬', MY: '🇲🇾', PH: '🇵🇭',
      US: '🇺🇸', GB: '🇬🇧', FR: '🇫🇷', DE: '🇩🇪',
      AU: '🇦🇺'
    };
    return flags[countryCode] || '🌍';
  },

  /**
   * 역할 레이블
   */
  getRoleLabel(role) {
    const labels = {
      owner: '소유자',
      editor: '편집자',
      viewer: '열람자'
    };
    return labels[role] || role;
  },

  /**
   * 역할별 색상
   */
  getRoleColor(role) {
    const colors = {
      owner: '#4CAF50',
      editor: '#2196F3',
      viewer: '#9E9E9E'
    };
    return colors[role] || colors.viewer;
  },

  /**
   * HTML 이스케이프
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// 전역 접근
window.EventLobby = EventLobby;
