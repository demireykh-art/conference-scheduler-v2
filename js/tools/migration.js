/**
 * V1 to V2 Migration Tool
 * 
 * 기존 V1 스케줄러 데이터를 V2로 안전하게 마이그레이션
 */

const MigrationTool = {
  /**
   * V1 Firebase에서 데이터 마이그레이션
   */
  async migrateFromV1Firebase(projectId, apiKey) {
    console.log('[Migration] V1 Firebase 마이그레이션 시작');

    try {
      // V1 Firebase 설정
      const v1Config = {
        apiKey: apiKey,
        authDomain: `${projectId}.firebaseapp.com`,
        databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`,
        projectId: projectId
      };

      // V1 Firebase 앱 초기화
      const v1App = firebase.initializeApp(v1Config, 'v1-migration-temp');
      const v1Db = v1App.database();

      // 데이터 가져오기
      const v1Data = await v1Db.ref('/data').once('value');
      const data = v1Data.val();

      if (!data) {
        throw new Error('V1 데이터를 찾을 수 없습니다');
      }

      console.log('[Migration] V1 데이터 수집 완료', {
        speakers: Object.keys(data.speakers || {}).length,
        lectures: Object.keys(data.lectures || {}).length,
        schedule: Object.keys(data.schedule || {}).length
      });

      // V2로 복사
      await this.importToV2(data);

      // V1 앱 정리
      await v1App.delete();

      console.log('[Migration] 마이그레이션 완료');
      return true;

    } catch (error) {
      console.error('[Migration] 오류:', error);
      throw error;
    }
  },

  /**
   * JSON 파일에서 마이그레이션
   */
  async migrateFromJSON(file) {
    console.log('[Migration] JSON 파일 마이그레이션 시작');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          console.log('[Migration] JSON 파싱 완료');

          await this.importToV2(data);

          console.log('[Migration] 마이그레이션 완료');
          resolve(true);

        } catch (error) {
          console.error('[Migration] JSON 처리 오류:', error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error('[Migration] 파일 읽기 오류:', error);
        reject(error);
      };

      reader.readAsText(file);
    });
  },

  /**
   * V2로 데이터 import
   */
  async importToV2(data) {
    const eventId = AppState.currentEventId;

    if (!eventId) {
      throw new Error('현재 행사 ID가 없습니다');
    }

    // 데이터 변환 및 정제
    const cleanedData = this.cleanData(data);

    // Firebase에 저장
    const updates = {};
    updates[`/events/${eventId}/data/speakers`] = cleanedData.speakers || {};
    updates[`/events/${eventId}/data/lectures`] = cleanedData.lectures || {};
    updates[`/events/${eventId}/data/schedule`] = cleanedData.schedule || {};
    updates[`/events/${eventId}/data/sessions`] = cleanedData.sessions || [];
    updates[`/events/${eventId}/data/chairs`] = cleanedData.chairs || {};
    updates[`/events/${eventId}/data/sponsors`] = cleanedData.sponsors || [];
    updates[`/events/${eventId}/data/roomsConfig`] = cleanedData.roomsConfig || {};

    await firebase.database().ref().update(updates);

    // 로컬 상태 업데이트
    AppState.fromFirebaseObject(cleanedData);

    // 중복 제거
    cleanupDuplicateSchedules();

    console.log('[Migration] V2 데이터 import 완료');
  },

  /**
   * 데이터 정제
   */
  cleanData(data) {
    const cleaned = {
      speakers: {},
      lectures: {},
      schedule: {},
      sessions: [],
      chairs: {},
      sponsors: [],
      roomsConfig: {}
    };

    // Speakers 정제
    if (data.speakers) {
      Object.entries(data.speakers).forEach(([id, speaker]) => {
        if (speaker && typeof speaker === 'object') {
          cleaned.speakers[id] = {
            id: id,
            name: speaker.name || '',
            nameEn: speaker.nameEn || speaker.name_en || '',
            affiliation: speaker.affiliation || '',
            country: speaker.country || 'KR',
            email: speaker.email || '',
            phone: speaker.phone || ''
          };
        }
      });
    }

    // Lectures 정제
    if (data.lectures) {
      Object.entries(data.lectures).forEach(([id, lecture]) => {
        if (lecture && typeof lecture === 'object') {
          cleaned.lectures[id] = {
            id: id,
            title: lecture.title || '',
            speakerId: lecture.speakerId || lecture.speaker_id || '',
            duration: lecture.duration || 15,
            type: lecture.type || 'lecture',
            session: lecture.session || ''
          };
        }
      });
    }

    // Schedule 정제 (중복 제거)
    if (data.schedule) {
      const seenLectures = new Set();
      
      Object.entries(data.schedule).forEach(([key, item]) => {
        if (item && typeof item === 'object') {
          // Break는 항상 포함
          if (item.type === 'break') {
            cleaned.schedule[key] = item;
            return;
          }

          // 일반 강의는 중복 체크
          if (item.id && !seenLectures.has(item.id)) {
            seenLectures.add(item.id);
            cleaned.schedule[key] = {
              id: item.id,
              time: item.time || key.split('-')[0],
              room: item.room || key.split('-').slice(1).join('-'),
              type: item.type || 'lecture',
              placedAt: Date.now()
            };
          }
        }
      });
    }

    // Sessions 정제
    if (Array.isArray(data.sessions)) {
      cleaned.sessions = data.sessions.filter(s => s && typeof s === 'object');
    }

    // Chairs 정제
    if (data.chairs) {
      Object.entries(data.chairs).forEach(([id, chair]) => {
        if (chair && typeof chair === 'object') {
          cleaned.chairs[id] = chair;
        }
      });
    }

    // Sponsors 정제
    if (Array.isArray(data.sponsors)) {
      cleaned.sponsors = data.sponsors.filter(s => s && typeof s === 'object');
    }

    // RoomsConfig 정제
    if (data.roomsConfig) {
      cleaned.roomsConfig = {
        rooms: Array.isArray(data.roomsConfig.rooms) ? data.roomsConfig.rooms : [],
        timeSlots: Array.isArray(data.roomsConfig.timeSlots) ? data.roomsConfig.timeSlots : [],
        sessionRooms: data.roomsConfig.sessionRooms || {},
        roomColors: data.roomsConfig.roomColors || {},
        kmaRooms: Array.isArray(data.roomsConfig.kmaRooms) ? data.roomsConfig.kmaRooms : []
      };
    }

    return cleaned;
  },

  /**
   * 마이그레이션 진행률 표시
   */
  updateProgress(percent, message) {
    const progressBar = document.getElementById('migrationProgressBar');
    const statusText = document.getElementById('migrationStatus');

    if (progressBar) {
      progressBar.style.width = percent + '%';
    }

    if (statusText) {
      statusText.textContent = message;
    }
  }
};

// 전역 접근
window.MigrationTool = MigrationTool;
