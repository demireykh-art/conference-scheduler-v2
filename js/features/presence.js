/**
 * Real-time Collaboration & Cell Locking System
 * 
 * Firebase Presence를 활용한 실시간 협업 기능
 * 편집 충돌 방지를 위한 Cell/Modal Locking
 */

const PresenceManager = {
  myConnectionId: null,
  myColor: null,
  heartbeatInterval: null,

  /**
   * 초기화
   */
  init(eventId, user) {
    if (!eventId || !user) {
      console.error('[Presence] 초기화 실패: eventId 또는 user 없음');
      return;
    }

    this.myColor = this.generateUserColor(user.uid);
    this.setupPresence(eventId, user);
    this.monitorOtherUsers(eventId);
    this.monitorLocks(eventId);
    this.startHeartbeat(eventId, user);

    console.log('[Presence] 초기화 완료');
  },

  /**
   * Presence 설정
   */
  setupPresence(eventId, user) {
    const presenceRef = FirebaseRefs.presence(eventId, user.uid);

    const presenceData = {
      name: user.displayName || user.email,
      email: user.email,
      photoURL: user.photoURL || '',
      color: this.myColor,
      connectedAt: firebase.database.ServerValue.TIMESTAMP,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    };

    // 접속 등록
    presenceRef.set(presenceData);

    // 연결 종료 시 자동 삭제
    presenceRef.onDisconnect().remove();

    // 내 모든 Lock도 연결 종료 시 해제
    const locksRef = FirebaseRefs.locks(eventId);
    locksRef.orderByChild('userId').equalTo(user.uid).once('value', snapshot => {
      snapshot.forEach(childSnapshot => {
        firebase.database()
          .ref(`/events/${eventId}/locks/${childSnapshot.key}`)
          .onDisconnect()
          .remove();
      });
    });
  },

  /**
   * 다른 사용자 모니터링
   */
  monitorOtherUsers(eventId) {
    const presenceRef = firebase.database().ref(`/events/${eventId}/presence`);

    presenceRef.on('value', snapshot => {
      const users = snapshot.val() || {};
      AppState.presence.users.clear();

      Object.entries(users).forEach(([userId, userData]) => {
        AppState.presence.users.set(userId, userData);
      });

      this.updatePresenceUI();
    });
  },

  /**
   * Lock 모니터링
   */
  monitorLocks(eventId) {
    const locksRef = FirebaseRefs.locks(eventId);

    locksRef.on('value', snapshot => {
      const locks = snapshot.val() || {};
      AppState.presence.locks.clear();

      Object.entries(locks).forEach(([lockId, lockData]) => {
        AppState.presence.locks.set(lockId, lockData);
      });

      this.updateLockedCellsUI();
    });
  },

  /**
   * Heartbeat (주기적 업데이트)
   */
  startHeartbeat(eventId, user) {
    // 30초마다 lastSeen 업데이트
    this.heartbeatInterval = setInterval(() => {
      const presenceRef = FirebaseRefs.presence(eventId, user.uid);
      presenceRef.child('lastSeen').set(firebase.database.ServerValue.TIMESTAMP);
    }, 30000);
  },

  /**
   * Presence UI 업데이트
   */
  updatePresenceUI() {
    const indicator = document.getElementById('presenceIndicator');
    const countEl = document.getElementById('presenceCount');

    if (!indicator || !countEl) return;

    const userCount = AppState.presence.users.size;

    if (userCount > 1) {
      indicator.style.display = 'flex';
      countEl.textContent = userCount;
      
      // 사용자 목록 툴팁
      const userNames = Array.from(AppState.presence.users.values())
        .map(u => u.name)
        .join(', ');
      indicator.title = `접속 중: ${userNames}`;
    } else {
      indicator.style.display = 'none';
    }
  },

  /**
   * Cell Lock 설정
   */
  async lockCell(time, room, type = 'schedule') {
    const lockKey = `${type}_${time}_${room}`;
    const user = firebase.auth().currentUser;

    if (!user || !AppState.currentEventId) return false;

    try {
      const lockRef = firebase.database()
        .ref(`/events/${AppState.currentEventId}/locks/${lockKey}`);

      // 기존 Lock 확인
      const snapshot = await lockRef.once('value');
      const existingLock = snapshot.val();

      if (existingLock && existingLock.userId !== user.uid) {
        // 다른 사용자가 Lock 중
        showToast(
          `${existingLock.userName}님이 편집 중입니다`,
          'warning'
        );
        return false;
      }

      // Lock 설정
      await lockRef.set({
        userId: user.uid,
        userName: user.displayName || user.email,
        userColor: this.myColor,
        timestamp: Date.now(),
        type,
        target: { time, room }
      });

      AppState.presence.myLocks.add(lockKey);

      // UI 업데이트
      this.highlightLockedCell(time, room, true);

      console.log('[Presence] Cell Lock 설정:', lockKey);
      return true;

    } catch (error) {
      console.error('[Presence] Cell Lock 오류:', error);
      return false;
    }
  },

  /**
   * Cell Lock 해제
   */
  async unlockCell(time, room, type = 'schedule') {
    const lockKey = `${type}_${time}_${room}`;

    if (!AppState.currentEventId) return;

    try {
      await firebase.database()
        .ref(`/events/${AppState.currentEventId}/locks/${lockKey}`)
        .remove();

      AppState.presence.myLocks.delete(lockKey);

      // UI 업데이트
      this.highlightLockedCell(time, room, false);

      console.log('[Presence] Cell Lock 해제:', lockKey);

    } catch (error) {
      console.error('[Presence] Cell Unlock 오류:', error);
    }
  },

  /**
   * 내 모든 Lock 해제
   */
  async unlockAll() {
    if (!AppState.currentEventId) return;

    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
      const locksRef = FirebaseRefs.locks(AppState.currentEventId);
      const snapshot = await locksRef
        .orderByChild('userId')
        .equalTo(user.uid)
        .once('value');

      const updates = {};
      snapshot.forEach(childSnapshot => {
        updates[childSnapshot.key] = null;
      });

      if (Object.keys(updates).length > 0) {
        await locksRef.update(updates);
        AppState.presence.myLocks.clear();
        console.log('[Presence] 모든 Lock 해제');
      }

    } catch (error) {
      console.error('[Presence] 전체 Unlock 오류:', error);
    }
  },

  /**
   * Locked Cells UI 업데이트
   */
  updateLockedCellsUI() {
    // 모든 Lock 표시 제거
    document.querySelectorAll('.locked-by-me, .locked-by-other').forEach(el => {
      el.classList.remove('locked-by-me', 'locked-by-other');
      el.removeAttribute('data-locked-by');
      el.removeAttribute('data-lock-color');
    });

    // 새 Lock 표시
    const user = firebase.auth().currentUser;
    if (!user) return;

    for (const [lockKey, lock] of AppState.presence.locks) {
      const isMyLock = lock.userId === user.uid;
      
      if (lock.type === 'schedule' && lock.target) {
        const { time, room } = lock.target;
        const cell = document.querySelector(
          `[data-time="${time}"][data-room="${room}"]`
        );

        if (cell) {
          if (isMyLock) {
            cell.classList.add('locked-by-me');
          } else {
            cell.classList.add('locked-by-other');
            cell.setAttribute('data-locked-by', lock.userName);
            cell.setAttribute('data-lock-color', lock.userColor);
            
            // 툴팁
            cell.title = `${lock.userName}님이 편집 중`;
          }
        }
      }
    }
  },

  /**
   * Cell 하이라이트
   */
  highlightLockedCell(time, room, isLocked) {
    const cell = document.querySelector(
      `[data-time="${time}"][data-room="${room}"]`
    );

    if (!cell) return;

    if (isLocked) {
      cell.classList.add('locked-by-me');
      cell.style.boxShadow = `0 0 0 2px ${this.myColor}`;
    } else {
      cell.classList.remove('locked-by-me');
      cell.style.boxShadow = '';
    }
  },

  /**
   * 사용자별 색상 생성
   */
  generateUserColor(userId) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788'
    ];

    // userId 기반 해시로 색상 선택
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  },

  /**
   * 정리
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.unlockAll();

    // 리스너 제거
    if (AppState.currentEventId) {
      firebase.database()
        .ref(`/events/${AppState.currentEventId}/presence`)
        .off();
      firebase.database()
        .ref(`/events/${AppState.currentEventId}/locks`)
        .off();
    }

    console.log('[Presence] 정리 완료');
  }
};

// 전역 접근
window.PresenceManager = PresenceManager;
