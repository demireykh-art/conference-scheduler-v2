/**
 * Schedule Management V2.0
 * 
 * 중복 강의 문제 완벽 해결을 위한 강화된 스케줄 관리
 * - 강의 배치 전 중복 검사
 * - 렌더링 전 중복 제거
 * - 앱 시작 시 자동 클리닝
 */

/**
 * 중복 검사 - 이미 스케줄에 배치되어 있는지 확인
 * @param {string} lectureId - 강의 ID
 * @param {string} excludeKey - 제외할 스케줄 키 (이동 시 사용)
 * @returns {Object} { exists: boolean, location: string|null }
 */
function isAlreadyScheduled(lectureId, excludeKey = null) {
  for (const [key, item] of AppState.schedule) {
    // Break 항목은 중복 허용
    if (item.type === 'break') continue;

    // 동일한 lectureId 발견
    if (item.id === lectureId && key !== excludeKey) {
      return {
        exists: true,
        location: key,
        time: key.split('-')[0],
        room: key.split('-').slice(1).join('-')
      };
    }
  }

  return { exists: false, location: null };
}

/**
 * 강의를 스케줄에 배치 (중복 방지 로직 포함)
 * @param {string} lectureId - 강의 ID
 * @param {string} time - 시간 (HH:MM)
 * @param {string} room - 룸 이름
 * @returns {Promise<boolean>} 성공 여부
 */
async function placeLectureOnSchedule(lectureId, time, room) {
  if (!lectureId || !time || !room) {
    console.error('[Schedule] 잘못된 파라미터:', { lectureId, time, room });
    return false;
  }

  const lecture = AppState.lectures.get(lectureId);
  if (!lecture) {
    console.error('[Schedule] 강의를 찾을 수 없음:', lectureId);
    showToast('강의를 찾을 수 없습니다', 'error');
    return false;
  }

  try {
    // 1. 중복 검사
    const check = isAlreadyScheduled(lectureId);
    
    if (check.exists) {
      console.log(`[Schedule] 중복 강의 발견: ${lectureId} at ${check.location}`);
      
      // 기존 위치에서 제거
      AppState.schedule.delete(check.location);
      
      console.log(`[Schedule] 기존 위치에서 제거 완료: ${check.location}`);
    }

    // 2. 새 위치에 배치 (Atomic Operation)
    const key = `${time}-${room}`;
    
    AppState.schedule.set(key, {
      id: lectureId,
      time,
      room,
      type: 'lecture',
      placedAt: Date.now()
    });

    console.log(`[Schedule] 강의 배치 완료: ${key}`);

    // 3. Firebase 동기화
    await saveAndSync();

    // 4. UI 업데이트
    updateScheduleDisplay();

    return true;

  } catch (error) {
    console.error('[Schedule] 강의 배치 오류:', error);
    showToast('강의 배치 중 오류가 발생했습니다', 'error');
    return false;
  }
}

/**
 * 스케줄에서 강의 제거
 * @param {string} lectureId - 강의 ID
 * @returns {Promise<boolean>}
 */
async function removeLectureFromSchedule(lectureId) {
  const check = isAlreadyScheduled(lectureId);
  
  if (!check.exists) {
    console.log('[Schedule] 제거할 강의가 스케줄에 없음:', lectureId);
    return false;
  }

  try {
    AppState.schedule.delete(check.location);
    console.log(`[Schedule] 강의 제거: ${check.location}`);

    await saveAndSync();
    updateScheduleDisplay();

    showToast('강의가 제거되었습니다', 'success');
    return true;

  } catch (error) {
    console.error('[Schedule] 강의 제거 오류:', error);
    showToast('강의 제거에 실패했습니다', 'error');
    return false;
  }
}

/**
 * 중복 제거 후 스케줄 렌더링
 */
function updateScheduleDisplay() {
  // 1. 중복 제거 (같은 id를 가진 항목 중 가장 최근 것만 유지)
  const deduplicatedSchedule = deduplicateSchedule();

  // 중복이 발견되었다면 상태 업데이트
  if (deduplicatedSchedule.duplicatesFound > 0) {
    AppState.schedule = deduplicatedSchedule.cleanedSchedule;
    console.warn(`[Schedule] ${deduplicatedSchedule.duplicatesFound}개 중복 항목 제거됨`);
    
    // Firebase 동기화 (비동기, 블로킹 없음)
    saveAndSync().catch(err => {
      console.error('[Schedule] 중복 제거 후 동기화 오류:', err);
    });
  }

  // 2. 렌더링 진행
  renderScheduleGrid();
}

/**
 * 스케줄 중복 제거
 * @returns {Object} { cleanedSchedule: Map, duplicatesFound: number, duplicates: Array }
 */
function deduplicateSchedule() {
  const cleanedSchedule = new Map();
  const seenIds = new Map(); // lectureId -> scheduleKey 매핑
  const duplicates = [];
  let duplicatesFound = 0;

  for (const [key, item] of AppState.schedule) {
    // Break는 중복 허용
    if (item.type === 'break') {
      cleanedSchedule.set(key, item);
      continue;
    }

    const lectureId = item.id;

    if (seenIds.has(lectureId)) {
      // 중복 발견
      const oldKey = seenIds.get(lectureId);
      const oldItem = cleanedSchedule.get(oldKey);

      duplicatesFound++;
      duplicates.push({
        lectureId,
        locations: [oldKey, key],
        kept: null,
        removed: null
      });

      // 더 최근에 배치된 항목 유지 (placedAt 비교)
      const oldTime = oldItem.placedAt || 0;
      const newTime = item.placedAt || 0;

      if (newTime > oldTime) {
        // 새 항목 유지, 이전 항목 제거
        cleanedSchedule.delete(oldKey);
        cleanedSchedule.set(key, item);
        seenIds.set(lectureId, key);
        
        duplicates[duplicates.length - 1].kept = key;
        duplicates[duplicates.length - 1].removed = oldKey;
      } else {
        // 이전 항목 유지, 새 항목 무시
        duplicates[duplicates.length - 1].kept = oldKey;
        duplicates[duplicates.length - 1].removed = key;
      }

      console.warn(`[중복 감지] ${lectureId}: ${oldKey} vs ${key}`);

    } else {
      // 첫 번째 등장
      cleanedSchedule.set(key, item);
      seenIds.set(lectureId, key);
    }
  }

  if (duplicatesFound > 0) {
    console.log('[중복 제거 완료]', {
      original: AppState.schedule.size,
      cleaned: cleanedSchedule.size,
      removed: duplicatesFound,
      details: duplicates
    });
  }

  return {
    cleanedSchedule,
    duplicatesFound,
    duplicates
  };
}

/**
 * 앱 시작 시 자동 클리닝
 */
function cleanupDuplicateSchedules() {
  console.log('[초기 클리닝] 중복 스케줄 검사 시작...');

  const result = deduplicateSchedule();

  if (result.duplicatesFound > 0) {
    AppState.schedule = result.cleanedSchedule;
    
    console.log(`[초기 클리닝] ${result.duplicatesFound}개 중복 항목 제거 완료`);
    
    // 즉시 Firebase 저장
    saveAndSync()
      .then(() => {
        showToast(`중복 강의 ${result.duplicatesFound}개를 자동으로 정리했습니다`, 'info');
      })
      .catch(err => {
        console.error('[초기 클리닝] 저장 오류:', err);
      });
  } else {
    console.log('[초기 클리닝] 중복 항목 없음');
  }
}

/**
 * 스케줄 그리드 렌더링
 */
function renderScheduleGrid() {
  const container = document.getElementById('scheduleGrid');
  if (!container) {
    console.warn('[Schedule] scheduleGrid 컨테이너를 찾을 수 없음');
    return;
  }

  // 모바일 타임라인 뷰 확인
  const isTimelineView = document.body.classList.contains('timeline-view');

  if (isTimelineView) {
    renderTimelineView(container);
  } else {
    renderGridView(container);
  }
}

/**
 * 그리드 뷰 렌더링 (기본)
 */
function renderGridView(container) {
  const rooms = AppState.roomsConfig.rooms || [];
  const timeSlots = AppState.roomsConfig.timeSlots || generateDefaultTimeSlots();

  if (rooms.length === 0) {
    container.innerHTML = '<div class="empty-state">룸을 설정해주세요</div>';
    return;
  }

  let html = '<table class="schedule-table">';
  
  // 헤더
  html += '<thead><tr><th class="time-header">시간</th>';
  rooms.forEach(room => {
    html += `<th class="room-header">${escapeHtml(room)}</th>`;
  });
  html += '</tr></thead>';

  // 바디
  html += '<tbody>';
  timeSlots.forEach(time => {
    html += '<tr>';
    html += `<td class="time-cell">${time}</td>`;
    
    rooms.forEach(room => {
      const key = `${time}-${room}`;
      const item = AppState.schedule.get(key);
      
      html += renderScheduleCell(time, room, item);
    });
    
    html += '</tr>';
  });
  html += '</tbody>';

  html += '</table>';
  
  container.innerHTML = html;

  // 이벤트 리스너 추가
  attachScheduleCellListeners();
}

/**
 * 타임라인 뷰 렌더링 (모바일)
 */
function renderTimelineView(container) {
  const timeSlots = AppState.roomsConfig.timeSlots || generateDefaultTimeSlots();
  
  let html = '<div class="timeline-container">';
  
  timeSlots.forEach(time => {
    html += `<div class="timeline-slot">`;
    html += `<div class="timeline-time">${time}</div>`;
    html += `<div class="timeline-content">`;
    
    // 해당 시간의 모든 룸 표시
    const rooms = AppState.roomsConfig.rooms || [];
    rooms.forEach(room => {
      const key = `${time}-${room}`;
      const item = AppState.schedule.get(key);
      
      if (item && item.type !== 'break') {
        html += renderTimelineItem(time, room, item);
      }
    });
    
    html += `</div></div>`;
  });
  
  html += '</div>';
  
  container.innerHTML = html;
}

/**
 * 스케줄 셀 렌더링
 */
function renderScheduleCell(time, room, item) {
  const cellClass = item ? 'schedule-cell filled' : 'schedule-cell empty';
  const dataAttrs = `data-time="${time}" data-room="${room}"`;
  
  if (!item) {
    return `<td class="${cellClass}" ${dataAttrs}></td>`;
  }

  if (item.type === 'break') {
    return `
      <td class="${cellClass} break-cell" ${dataAttrs}>
        <div class="break-label">${item.label || 'Break'}</div>
      </td>
    `;
  }

  const lecture = AppState.lectures.get(item.id);
  if (!lecture) {
    return `<td class="${cellClass} error-cell" ${dataAttrs}>
      <div class="error-label">강의 없음</div>
    </td>`;
  }

  const speaker = AppState.speakers.get(lecture.speakerId);
  const speakerName = speaker ? speaker.name : '연자 미정';

  return `
    <td class="${cellClass}" ${dataAttrs} data-lecture-id="${item.id}">
      <div class="lecture-card">
        <div class="lecture-title">${escapeHtml(lecture.title || '제목 없음')}</div>
        <div class="lecture-speaker">${escapeHtml(speakerName)}</div>
        <div class="lecture-time">${lecture.duration || 15}분</div>
      </div>
    </td>
  `;
}

/**
 * 타임라인 아이템 렌더링
 */
function renderTimelineItem(time, room, item) {
  const lecture = AppState.lectures.get(item.id);
  if (!lecture) return '';

  const speaker = AppState.speakers.get(lecture.speakerId);
  const speakerName = speaker ? speaker.name : '연자 미정';

  return `
    <div class="timeline-item" data-time="${time}" data-room="${room}" data-lecture-id="${item.id}">
      <div class="timeline-room">${escapeHtml(room)}</div>
      <div class="timeline-lecture-title">${escapeHtml(lecture.title || '제목 없음')}</div>
      <div class="timeline-lecture-speaker">${escapeHtml(speakerName)}</div>
    </div>
  `;
}

/**
 * 스케줄 셀 이벤트 리스너
 */
function attachScheduleCellListeners() {
  const cells = document.querySelectorAll('.schedule-cell');
  
  cells.forEach(cell => {
    cell.addEventListener('click', handleScheduleCellClick);
  });
}

/**
 * 스케줄 셀 클릭 핸들러
 */
function handleScheduleCellClick(e) {
  const cell = e.currentTarget;
  const time = cell.dataset.time;
  const room = cell.dataset.room;
  const lectureId = cell.dataset.lectureId;

  // Lock 확인
  if (cell.classList.contains('locked-by-other')) {
    const lockedBy = cell.getAttribute('data-locked-by');
    showToast(`${lockedBy}님이 편집 중입니다`, 'warning');
    return;
  }

  // Lock 설정
  if (typeof PresenceManager !== 'undefined') {
    PresenceManager.lockCell(time, room);
  }

  if (lectureId) {
    // 기존 강의 편집/제거
    showLectureContextMenu(lectureId, time, room);
  } else {
    // 새 강의 배치
    if (typeof MobileHandler !== 'undefined' && MobileHandler.isMobile) {
      MobileHandler.showLecturePickerBottomSheet(time, room);
    } else {
      showLecturePickerModal(time, room);
    }
  }
}

/**
 * 기본 시간 슬롯 생성
 */
function generateDefaultTimeSlots() {
  return TimeZoneManager.generateTimeSlots('08:00', '18:00', 15);
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 전역 함수 등록
window.isAlreadyScheduled = isAlreadyScheduled;
window.placeLectureOnSchedule = placeLectureOnSchedule;
window.removeLectureFromSchedule = removeLectureFromSchedule;
window.updateScheduleDisplay = updateScheduleDisplay;
window.cleanupDuplicateSchedules = cleanupDuplicateSchedules;
window.deduplicateSchedule = deduplicateSchedule;
