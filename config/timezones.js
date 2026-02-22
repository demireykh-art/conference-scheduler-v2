/**
 * TimeZone Management for Global Conference Scheduler
 * 
 * 각 행사별로 현지 시간대를 설정하고 시간 변환을 처리합니다.
 */

const TimeZoneManager = {
  // 지원되는 타임존 목록
  supportedTimezones: {
    'Asia/Seoul': { name: '한국 표준시', offset: '+09:00', country: 'KR' },
    'Asia/Tokyo': { name: '일본 표준시', offset: '+09:00', country: 'JP' },
    'Asia/Bangkok': { name: '인도차이나 시간', offset: '+07:00', country: 'TH' },
    'Asia/Jakarta': { name: '서부 인도네시아 시간', offset: '+07:00', country: 'ID' },
    'Asia/Singapore': { name: '싱가포르 표준시', offset: '+08:00', country: 'SG' },
    'Asia/Manila': { name: '필리핀 표준시', offset: '+08:00', country: 'PH' },
    'Asia/Ho_Chi_Minh': { name: '베트남 시간', offset: '+07:00', country: 'VN' },
    'Asia/Kuala_Lumpur': { name: '말레이시아 시간', offset: '+08:00', country: 'MY' },
    'America/New_York': { name: '동부 표준시', offset: '-05:00', country: 'US' },
    'America/Los_Angeles': { name: '태평양 표준시', offset: '-08:00', country: 'US' },
    'Europe/London': { name: '그리니치 표준시', offset: '+00:00', country: 'GB' },
    'Europe/Paris': { name: '중앙 유럽 시간', offset: '+01:00', country: 'FR' },
    'Australia/Sydney': { name: '호주 동부 표준시', offset: '+10:00', country: 'AU' }
  },

  /**
   * 행사의 타임존 가져오기
   */
  getEventTimezone(eventId) {
    if (AppState.currentEventId === eventId && AppState.eventInfo) {
      return AppState.eventInfo.timezone || 'Asia/Seoul';
    }
    return 'Asia/Seoul';
  },

  /**
   * 타임존 정보 가져오기
   */
  getTimezoneInfo(timezone) {
    return this.supportedTimezones[timezone] || this.supportedTimezones['Asia/Seoul'];
  },

  /**
   * 현재 시간을 행사 타임존으로 변환
   */
  getCurrentTimeInEventZone(eventId) {
    const timezone = this.getEventTimezone(eventId);
    return new Date().toLocaleString('ko-KR', { timeZone: timezone });
  },

  /**
   * UTC 시간을 행사 타임존으로 변환
   */
  convertToEventZone(utcDate, eventId) {
    const timezone = this.getEventTimezone(eventId);
    return new Date(utcDate).toLocaleString('ko-KR', { timeZone: timezone });
  },

  /**
   * 행사 타임존에서 UTC로 변환
   */
  convertToUTC(localDateStr, eventId) {
    // 간단한 변환 (실제로는 더 정교한 라이브러리 사용 권장)
    const timezone = this.getEventTimezone(eventId);
    const offset = this.getTimezoneInfo(timezone).offset;
    
    // offset 파싱 (예: '+09:00' -> 9)
    const [sign, hours] = [offset[0], parseInt(offset.slice(1, 3))];
    const offsetHours = sign === '+' ? hours : -hours;
    
    const localDate = new Date(localDateStr);
    const utcDate = new Date(localDate.getTime() - (offsetHours * 60 * 60 * 1000));
    
    return utcDate;
  },

  /**
   * 시간 형식 변환 (HH:MM)
   */
  formatTime(date, eventId) {
    const timezone = this.getEventTimezone(eventId);
    return new Date(date).toLocaleTimeString('ko-KR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  },

  /**
   * 날짜 형식 변환 (YYYY-MM-DD)
   */
  formatDate(date, eventId) {
    const timezone = this.getEventTimezone(eventId);
    const options = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    const parts = new Date(date).toLocaleDateString('ko-KR', options).split('.');
    return `${parts[0]}-${parts[1].trim().padStart(2, '0')}-${parts[2].trim().padStart(2, '0')}`;
  },

  /**
   * 시간 차이 계산 (분 단위)
   */
  getTimeDifferenceMinutes(time1, time2) {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    
    return Math.abs((h1 * 60 + m1) - (h2 * 60 + m2));
  },

  /**
   * 시간에 분 추가
   */
  addMinutes(timeStr, minutes) {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  },

  /**
   * 시간 범위 생성 (15분 간격)
   */
  generateTimeSlots(startTime = '08:00', endTime = '18:00', intervalMinutes = 15) {
    const slots = [];
    let current = startTime;
    
    while (this.compareTime(current, endTime) <= 0) {
      slots.push(current);
      current = this.addMinutes(current, intervalMinutes);
    }
    
    return slots;
  },

  /**
   * 시간 비교 (-1: time1 < time2, 0: 같음, 1: time1 > time2)
   */
  compareTime(time1, time2) {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    
    const total1 = h1 * 60 + m1;
    const total2 = h2 * 60 + m2;
    
    if (total1 < total2) return -1;
    if (total1 > total2) return 1;
    return 0;
  },

  /**
   * 시간이 범위 내에 있는지 확인
   */
  isTimeInRange(time, startTime, endTime) {
    return this.compareTime(time, startTime) >= 0 && 
           this.compareTime(time, endTime) <= 0;
  },

  /**
   * 타임존 선택 드롭다운 HTML 생성
   */
  generateTimezoneSelectOptions(selectedTimezone = null) {
    return Object.entries(this.supportedTimezones)
      .map(([tz, info]) => {
        const selected = tz === selectedTimezone ? 'selected' : '';
        return `<option value="${tz}" ${selected}>${info.name} (${info.offset})</option>`;
      })
      .join('');
  },

  /**
   * 타임존별 현재 시간 표시
   */
  displayWorldClocks() {
    const clocks = {};
    
    Object.entries(this.supportedTimezones).forEach(([tz, info]) => {
      const now = new Date().toLocaleString('ko-KR', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      clocks[tz] = {
        time: now,
        name: info.name,
        offset: info.offset
      };
    });
    
    return clocks;
  }
};

/**
 * 시간 관련 유틸리티 함수들
 */
const TimeUtils = {
  /**
   * HH:MM 형식 유효성 검사
   */
  isValidTimeFormat(timeStr) {
    const regex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(timeStr);
  },

  /**
   * 시간 문자열 정규화
   */
  normalizeTime(timeStr) {
    if (!timeStr) return '00:00';
    
    const parts = timeStr.split(':');
    if (parts.length !== 2) return '00:00';
    
    const hours = String(parseInt(parts[0]) || 0).padStart(2, '0');
    const minutes = String(parseInt(parts[1]) || 0).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  },

  /**
   * 지속시간 문자열 생성 (예: "1시간 30분")
   */
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes}분`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
      return `${hours}시간`;
    }
    
    return `${hours}시간 ${mins}분`;
  },

  /**
   * ISO 8601 형식으로 변환
   */
  toISOString(dateStr, timeStr, timezone) {
    const localDateTime = `${dateStr}T${timeStr}:00`;
    const utcDate = TimeZoneManager.convertToUTC(localDateTime, { timezone });
    return utcDate.toISOString();
  }
};

// 전역 접근을 위한 export
window.TimeZoneManager = TimeZoneManager;
window.TimeUtils = TimeUtils;
