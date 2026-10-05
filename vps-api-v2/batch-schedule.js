// vps-api-v2/batch-schedule.js
// Single source of truth for batch class days and exam start times (IST)

const BATCH_SCHEDULE_MAP = {
  'RK4XX4cswYrHc2WjeSSh': {
    id: 'RK4XX4cswYrHc2WjeSSh',
    name: 'Sunday Morning',
    classDay: '0',
    dayName: 'রবিবার',
    examStartTime: '08:05', // 8:05 AM IST
  },
  '5NAXh0WJOM89VVBzAau0': {
    id: '5NAXh0WJOM89VVBzAau0',
    name: 'Sunday Bikal',
    classDay: '0',
    dayName: 'রবিবার',
    examStartTime: '14:05', // 2:05 PM IST
  },
  '8b0d0d6f-2f27-4ee3-aaf6-2180eedbdcb8': {
    id: '8b0d0d6f-2f27-4ee3-aaf6-2180eedbdcb8',
    name: 'Shonibar Sakal',
    classDay: '6',
    dayName: 'শনিবার',
    examStartTime: '09:05', // 9:05 AM IST
  },
  '91oo3knsCkLbyvZVniqF': {
    id: '91oo3knsCkLbyvZVniqF',
    name: 'Shonibar Bikal',
    classDay: '6',
    dayName: 'শনিবার',
    examStartTime: '14:05', // 2:05 PM IST
  },
};

function resolveBatchSlot(b) {
  if (!b) return { classDay: '', examStartTime: '' };
  const id = String(b.id || '').trim();
  const name = String(b.name || '').trim();

  // Explicit values on batch object take priority if both or either are provided
  let classDay = String(b.classDay !== undefined && b.classDay !== null ? b.classDay : '').trim();
  let time = String(b.examStartTime || '').trim();
  const hasValidTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  const hasValidDay = /^[0-6]$/.test(classDay);

  if (hasValidDay && hasValidTime) {
    return { classDay, examStartTime: time };
  }

  // Check ID mapping
  if (id && BATCH_SCHEDULE_MAP[id]) {
    return {
      classDay: hasValidDay ? classDay : BATCH_SCHEDULE_MAP[id].classDay,
      examStartTime: hasValidTime ? time : BATCH_SCHEDULE_MAP[id].examStartTime,
    };
  }

  // Name matching for the 4 primary batches
  if (/sunday\s*morning|রবিবার\s*সকাল/i.test(name)) {
    return { classDay: hasValidDay ? classDay : '0', examStartTime: hasValidTime ? time : '08:05' };
  }
  if (/sunday\s*bikal|রবিবার\s*বিকাল/i.test(name)) {
    return { classDay: hasValidDay ? classDay : '0', examStartTime: hasValidTime ? time : '14:05' };
  }
  if (/shonibar\s*sakal|শনিবার\s*সকাল/i.test(name)) {
    return { classDay: hasValidDay ? classDay : '6', examStartTime: hasValidTime ? time : '09:05' };
  }
  if (/shonibar\s*bikal|শনিবার\s*বিকাল/i.test(name)) {
    return { classDay: hasValidDay ? classDay : '6', examStartTime: hasValidTime ? time : '14:05' };
  }

  // Other batches: classDay from schedule/name, time empty
  if (!hasValidDay) {
    const sched = String(b.schedule || '');
    if (/sun|robi|রবি/i.test(sched)) classDay = '0';
    else if (/mon|som|সোম/i.test(sched)) classDay = '1';
    else if (/tue|mongol|মঙ্গল/i.test(sched)) classDay = '2';
    else if (/wed|budh|বুধ/i.test(sched)) classDay = '3';
    else if (/thu|brihaspati|বৃহস্পতি/i.test(sched)) classDay = '4';
    else if (/fri|shukro|শুক্র/i.test(sched)) classDay = '5';
    else if (/shoni|shani|sani|sat|শনি/i.test(sched)) classDay = '6';
    else if (/shoni|shani|sani|sat|শনি/i.test(name)) classDay = '6';
    else if (/sun|robi|rabi|রবি/i.test(name)) classDay = '0';
    else classDay = '';
  }

  return { classDay, examStartTime: hasValidTime ? time : '' };
}

module.exports = { BATCH_SCHEDULE_MAP, resolveBatchSlot };
