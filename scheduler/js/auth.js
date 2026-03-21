/**
 * auth.js - Firebase 인증 및 사용자 관리
 */

let sessionTimeoutId = null;
let lastActivityTime = Date.now();

/**
 * Google 로그인
 */
window.signInWithGoogle = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            console.log('로그인 성공:', result.user.email);
            registerOrCheckUser(result.user);
        })
        .catch((error) => {
            console.error('로그인 에러:', error);
            Toast.error('로그인 실패: ' + error.message);
        });
};

/**
 * 로그아웃
 */
window.signOut = function() {
    firebase.auth().signOut().then(() => {
        console.log('로그아웃됨');
        AppState.currentUserRole = null;
    });
};

/**
 * 사용자 등록 또는 확인
 */
window.registerOrCheckUser = function(user) {
    const userRef = database.ref(`/users/${user.uid}`);

    userRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            userRef.update({
                lastLogin: firebase.database.ServerValue.TIMESTAMP,
                displayName: user.displayName,
                photoURL: user.photoURL
            });
        } else {
            const isSuperAdmin = user.email === AppConfig.SUPER_ADMIN_EMAIL;
            userRef.set({
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: isSuperAdmin ? 'admin' : 'pending',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });

            if (!isSuperAdmin) {
                console.log('새 사용자 - 승인 대기 중');
            }
        }
    });
};

/**
 * 세션 타임아웃 리셋
 */
window.resetSessionTimeout = function() {
    lastActivityTime = Date.now();

    if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
    }

    sessionTimeoutId = setTimeout(() => {
        if (AppState.currentUser) {
            Toast.warning('⏰ 보안을 위해 2시간 동안 활동이 없어 자동 로그아웃됩니다.');
            signOut();
        }
    }, AppConfig.SESSION_TIMEOUT);
};

/**
 * 사용자 활동 감지 설정
 */
window.setupActivityListeners = function() {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    activityEvents.forEach(event => {
        document.addEventListener(event, () => {
            if (Date.now() - lastActivityTime > 60000) {
                resetSessionTimeout();
            }
        }, { passive: true });
    });
};

/**
 * 인증 상태 리스너
 */
firebase.auth().onAuthStateChanged((user) => {
    AppState.currentUser = user;

    const loginOverlay = document.getElementById('loginOverlay');

    if (user) {
        if (loginOverlay) loginOverlay.classList.add('hidden');
        resetSessionTimeout();
        listenToUserRole(user);
        registerOnlinePresence(user);
        startRealtimeListeners();
        registerOrCheckUser(user);
        console.log('로그인됨:', user.email);
    } else {
        if (loginOverlay) loginOverlay.classList.remove('hidden');
        AppState.currentUserRole = null;
        updateAuthUI(null);

        if (sessionTimeoutId) {
            clearTimeout(sessionTimeoutId);
            sessionTimeoutId = null;
        }
    }
});

/**
 * 사용자 역할 실시간 리스너
 */
window.listenToUserRole = function(user) {
    database.ref(`/users/${user.uid}/role`).on('value', (snapshot) => {
        AppState.currentUserRole = snapshot.val();
        updateAuthUI(user);
        updatePendingBadge();
        console.log('사용자 역할:', AppState.currentUserRole);
    });
};

/**
 * 인증 UI 업데이트
 */
window.updateAuthUI = function(user) {
    try {
        const userInfo = document.getElementById('userInfo');
        if (!userInfo) return;

        const editOnlyBtns = document.querySelectorAll('.edit-only');

        if (user) {
            let roleText = '로딩...';
            let roleColor = '#999';
            let canEdit = false;

            switch (AppState.currentUserRole) {
                case 'admin':
                    roleText = '👑 관리자';
                    roleColor = '#f39c12';
                    canEdit = true;
                    break;
                case 'editor':
                    roleText = '✏️ 편집자';
                    roleColor = '#27ae60';
                    canEdit = true;
                    break;
                case 'pending':
                    roleText = '⏳ 승인대기';
                    roleColor = '#e74c3c';
                    canEdit = false;
                    break;
            }

            editOnlyBtns.forEach(btn => {
                btn.style.display = canEdit ? '' : 'none';
            });

            userInfo.innerHTML = `
                <img src="${user.photoURL || 'https://via.placeholder.com/28'}" alt=""
                     style="width:24px;height:24px;border-radius:50%;vertical-align:middle;">
                <span style="margin:0 6px;font-size:0.9rem;">${user.displayName || user.email}</span>
                <span style="color:${roleColor};font-size:0.75rem;">${roleText}</span>
            `;
        } else {
            userInfo.innerHTML = '';
            editOnlyBtns.forEach(btn => { btn.style.display = 'none'; });
        }
    } catch(e) {
        console.warn('updateAuthUI 오류 (무시):', e.message);
    }
};

/**
 * 편집 권한 확인
 */
window.canEdit = function() {
    if (!AppState.currentUser) return false;
    if (AppState.currentUserRole === 'pending') return false;
    if (!AppState.currentUserRole) return true;
    return AppState.currentUserRole === 'admin' || AppState.currentUserRole === 'editor';
};

/**
 * 편집 시도 시 권한 체크
 */
window.checkEditPermission = function() {
    if (!AppState.currentUser) {
        Toast.warning('로그인이 필요합니다.');
        return false;
    }
    if (AppState.currentUserRole === 'pending') {
        Toast.info('⏳ 승인 대기 중입니다.\n관리자의 승인 후 편집이 가능합니다.');
        return false;
    }
    return true;
};

/**
 * 관리자 권한 확인
 */
window.isAdmin = function() {
    return AppState.currentUserRole === 'admin';
};

/**
 * 대기 중인 사용자 수 배지 업데이트
 */
window.updatePendingBadge = function() {
    // pendingBadge 요소가 없는 UI에서는 조용히 종료
    const badge = document.getElementById('pendingBadge');
    if (!badge) return;

    if (!isAdmin()) {
        badge.style.display = 'none';
        return;
    }

    database.ref('/users').orderByChild('role').equalTo('pending').once('value', (snapshot) => {
        const count = snapshot.numChildren();
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
};

/**
 * 온라인 상태 등록
 */
window.registerOnlinePresence = function(user) {
    const userStatusRef = database.ref(`/presence/${user.uid}`);
    const connectedRef = database.ref('.info/connected');

    connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === false) {
            updateSyncStatus('offline');
            return;
        }

        userStatusRef.onDisconnect().remove().then(() => {
            userStatusRef.set({
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
            updateSyncStatus('synced');
        });
    });
};

/**
 * 온라인 사용자 리스너
 */
window.listenToOnlineUsers = function() {
    database.ref('/presence').on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const userList = Object.values(users);

        const avatarsDiv = document.getElementById('userAvatars');
        const countSpan = document.getElementById('onlineCount');

        // 요소가 없으면 조용히 종료
        if (avatarsDiv) {
            avatarsDiv.innerHTML = userList.slice(0, 5).map(u =>
                `<img class="user-avatar" src="${u.photoURL || 'https://via.placeholder.com/24'}" title="${u.displayName || u.email}">`
            ).join('');
        }
        if (countSpan) {
            countSpan.textContent = `${userList.length}명 접속`;
        }
    });
};

/**
 * 동기화 상태 업데이트
 */
window.updateSyncStatus = function(status, text) {
    const statusDiv = document.getElementById('syncStatus');
    const textSpan = document.getElementById('syncText');

    if (!statusDiv || !textSpan) {
        console.log('syncStatus 업데이트:', status, text);
        return;
    }

    statusDiv.className = 'sync-status ' + status;

    switch (status) {
        case 'synced':
            textSpan.textContent = text || '동기화됨';
            break;
        case 'syncing':
            textSpan.textContent = text || '저장 중...';
            break;
        case 'offline':
            textSpan.textContent = text || '오프라인';
            break;
        default:
            textSpan.textContent = text || status;
    }
};

// 초기화
setupActivityListeners();

console.log('✅ auth.js 로드 완료');
