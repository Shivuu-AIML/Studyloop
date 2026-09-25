const MS_DAY = 86400000;

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Coerce "YYYY-MM-DD" (or a Date/ISO value) into a LOCAL calendar-day Date at
// midnight. Avoids the UTC-shift where date-only strings render as the
// previous day in negative-offset timezones.
export const toLocalDay = (value) => {
  const str = String(value ?? '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : startOfDay(dt);
};

// Study days remaining are the days strictly BEFORE the exam day (exam day is
// never counted as a study day). daysToExam includes the exam day itself.
export const studyDaysLeft = (examValue, now = new Date()) => {
  const exam = toLocalDay(examValue);
  if (!exam) return { studyDays: null, daysToExam: null, sameDay: false, past: false };
  const today = startOfDay(now);
  const daysToExam = Math.max(0, Math.ceil((exam.getTime() - today.getTime()) / MS_DAY));
  const past = exam.getTime() < today.getTime();
  return {
    studyDays: past ? 0 : Math.max(0, daysToExam - 1),
    daysToExam: past ? 0 : daysToExam,
    sameDay: !past && daysToExam === 0,
    past,
  };
};

export const fmtDay = (value) => {
  const d = toLocalDay(value);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};