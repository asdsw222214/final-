// Convert HH:mm to minutes from midnight
export const timeToMinutes = (timeStr) => {
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
};

// Check if two time intervals [s1, e1] and [s2, e2] overlap
export const checkTimeOverlap = (s1, e1, s2, e2) => {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return Math.max(start1, start2) < Math.min(end1, end2);
};

// Map day term to DayCode
const DAY_MAP = {
  '一': 'M', '二': 'T', '三': 'W', '四': 'TH', '五': 'F', '六': 'S', '日': 'SU',
  'mon': 'M', 'tue': 'T', 'wed': 'W', 'thu': 'TH', 'fri': 'F', 'sat': 'S', 'sun': 'SU',
  'm': 'M', 't': 'T', 'w': 'W', 'th': 'TH', 'f': 'F', 's': 'S', 'su': 'SU'
};

const DAY_REGEX_STR = '(?:星期|週)?([一二三四五六日])|\\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|M|T|W|TH|F|S|SU)\\b';

/**
 * Smartly parse a pasted text block to extract course schedule and populate busy slots.
 */
export const parsePastedSchedule = (text, periods) => {
  const busySlots = {};
  let parsedCount = 0;

  if (!text || text.trim() === '') {
    return { busySlots, parsedCount };
  }

  const lines = text.split('\n');

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine === '') return;

    // Try to guess a course name from the line
    let courseName = '忙碌課堂';
    const words = trimmedLine.split(/\s+/);
    const likelyTitle = words.find(w => 
      w.length >= 2 && 
      !/^\d+$/.test(w) && 
      !/^\d{1,2}:\d{2}/.test(w) && 
      !/^(週|星期)/.test(w) &&
      !/^(LEC|LAB)$/i.test(w)
    );
    if (likelyTitle) {
      courseName = likelyTitle.replace(/[()（）[\]#&]/g, '').substring(0, 15);
    }

    // 1. Look for Day Code
    const dayRegex = new RegExp(DAY_REGEX_STR, 'gi');
    let dayMatch;
    
    // Find all days mentioned on this line
    const detectedDays = [];
    while ((dayMatch = dayRegex.exec(trimmedLine)) !== null) {
      const matchText = (dayMatch[1] || dayMatch[2]).toLowerCase();
      const dayCode = DAY_MAP[matchText];
      if (dayCode) {
        detectedDays.push({ dayCode, index: dayMatch.index });
      }
    }

    if (detectedDays.length === 0) return;

    // 2. For each detected day on this line, look for the schedule following it or nearby
    detectedDays.forEach(({ dayCode }, dIdx) => {
      // Initialize day slots
      if (!busySlots[dayCode]) {
        busySlots[dayCode] = {};
      }

      // Look at the segment of text following this day, up to the next day or end of line
      const startIdx = trimmedLine.indexOf(dayMatch ? dayMatch[0] : ''); // approximate
      const nextDayIdx = dIdx < detectedDays.length - 1 ? detectedDays[dIdx + 1].index : trimmedLine.length;
      const segment = trimmedLine.substring(startIdx, nextDayIdx);

      // Search for time ranges like 10:10-12:00 or 1010-1200 or 10:10~12:00
      const timeRangeRegex = /(\d{1,2}):?(\d{2})\s*[-~–]\s*(\d{1,2}):?(\d{2})/g;
      let timeMatch = timeRangeRegex.exec(segment);
      let matchedByTime = false;

      if (timeMatch) {
        matchedByTime = true;
        const sh = timeMatch[1].padStart(2, '0');
        const sm = timeMatch[2];
        const eh = timeMatch[3].padStart(2, '0');
        const em = timeMatch[4];
        const startStr = `${sh}:${sm}`;
        const endStr = `${eh}:${em}`;

        // Find periods that overlap with this time range
        periods.forEach((period) => {
          if (checkTimeOverlap(startStr, endStr, period.startTime, period.endTime)) {
            busySlots[dayCode][period.id] = courseName;
            parsedCount++;
          }
        });
      }

      // If no time range matched, look for period codes
      if (!matchedByTime) {
        const periodIdsInSegment = [];
        periods.forEach(p => {
          const pRegex = new RegExp(`(?:\\b|\\s|第|節|[-~–,，、])${p.id}(?:\\b|\\s|第|節|[-~–,，、]|$)`, 'i');
          if (pRegex.test(segment)) {
            periodIdsInSegment.push(p.id);
          }
        });

        // Also check if there's a range like "1-4"
        const rangeMatch = /([0-9a-zA-Z])\s*[-~–]\s*([0-9a-zA-Z])/.exec(segment);
        if (rangeMatch) {
          const startP = rangeMatch[1].toUpperCase();
          const endP = rangeMatch[2].toUpperCase();
          const startIdx = periods.findIndex(p => p.id.toUpperCase() === startP);
          const endIdx = periods.findIndex(p => p.id.toUpperCase() === endP);
          if (startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx) {
            for (let i = startIdx; i <= endIdx; i++) {
              periodIdsInSegment.push(periods[i].id);
            }
          }
        }

        if (periodIdsInSegment.length > 0) {
          const uniquePeriods = Array.from(new Set(periodIdsInSegment));
          uniquePeriods.forEach((pId) => {
            busySlots[dayCode][pId] = courseName;
            parsedCount++;
          });
        }
      }
    });
  });

  return { busySlots, parsedCount };
};

/**
 * Generate default period configurations for common Taiwanese universities.
 */
export const getDefaultPeriods = () => {
  return [
    { id: '1', name: '第 1 節', startTime: '08:10', endTime: '09:00' },
    { id: '2', name: '第 2 節', startTime: '09:10', endTime: '10:00' },
    { id: '3', name: '第 3 節', startTime: '10:10', endTime: '11:00' },
    { id: '4', name: '第 4 節', startTime: '11:10', endTime: '12:00' },
    { id: '5', name: '第 5 節', startTime: '12:10', endTime: '13:00' },
    { id: '6', name: '第 6 節', startTime: '13:10', endTime: '14:00' },
    { id: '7', name: '第 7 節', startTime: '14:10', endTime: '15:00' },
    { id: '8', name: '第 8 節', startTime: '15:10', endTime: '16:00' },
    { id: '9', name: '第 9 節', startTime: '16:10', endTime: '17:00' },
    { id: '10', name: '第 10 節', startTime: '17:10', endTime: '18:00' },
    { id: '11', name: '第 11 節', startTime: '18:30', endTime: '19:20' },
    { id: '12', name: '第 12 節', startTime: '19:25', endTime: '20:15' },
    { id: '13', name: '第 13 節', startTime: '20:25', endTime: '21:15' },
    { id: '14', name: '第 14 節', startTime: '21:20', endTime: '22:10' }
  ];
};
