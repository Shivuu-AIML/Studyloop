const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/* Guard rail: a day's planned hours must never exceed the user's daily
 * study limit, even as a last resort. Work that cannot fit before the exam
 * is reported as `unplaced` instead of silently overloading a day. */
function buildSchedule(topics, startDate, examDate, hoursPerDay) {
  const limit = Math.max(1, Number(hoursPerDay) || 1);
  const work = (Array.isArray(topics) ? topics : [])
    .map((t) => ({
      topicId: t.topicId || t._id || t.id || null,
      topicName: typeof t.name === 'string' ? t.name : 'Untitled topic',
      subject: t.subject && String(t.subject).trim() ? String(t.subject).trim() : 'General',
      estHours: Math.max(0.5, Number(t.estHours) || 1),
      difficulty: Math.max(1, Math.min(5, Number(t.difficulty) || 3)),
    }))
    // Prioritize high-value (hard) work first when the syllabus is too big.
    // Nothing gets dropped *mid-day*; instead whole topics fall off the end.
    .sort((a, b) => b.difficulty - a.difficulty || b.estHours - a.estHours);

  if (work.length === 0) return { schedule: [], unplaced: 0 };

  const startMs = startOfDay(new Date(startDate)).getTime();
  // Exam day is never a study day — schedule strictly before it.
  const endMs = startOfDay(new Date(examDate)).getTime();
  const studyDays = Math.max(0, Math.floor((endMs - startMs) / MS_PER_DAY));

  const totalHours = work.reduce((s, t) => s + t.estHours, 0);
  // Reserve an hour for a short recap revision session when there's room.
  const revise = studyDays >= 4 && totalHours <= studyDays * limit - 1;

  const schedule = [];
  let dayIndex = 0;
  let topicIndex = 0;

  while (topicIndex < work.length) {
    const dayMs = startMs + dayIndex * MS_PER_DAY;
    if (dayMs >= endMs) break;

    const day = { date: new Date(dayMs).toISOString(), dayIndex, tasks: [] };
    let used = 0;

    while (topicIndex < work.length && used < limit) {
      const topic = work[topicIndex];
      const hours = Math.round(Math.min(topic.estHours, limit - used) * 2) / 2;
      day.tasks.push({
        topicId: topic.topicId,
        topicName: topic.topicName,
        subject: topic.subject,
        estHours: hours,
        status: 'pending',
      });
      used += hours;
      topic.estHours -= hours;
      if (topic.estHours <= 0) topicIndex++;
    }

    schedule.push(day);
    dayIndex++;
  }

  let unplaced = 0;
  for (; topicIndex < work.length; topicIndex++) unplaced += work[topicIndex].estHours;

  if (revise && schedule.length > 0) {
    const last = schedule[schedule.length - 1];
    const used = last.tasks.reduce((s, t) => s + t.estHours, 0);
    const spare = Math.round((limit - used) * 2) / 2;
    if (spare >= 1) {
      last.tasks.push({
        topicId: null,
        topicName: 'Revision — recap covered topics',
        subject: 'Review',
        estHours: spare,
        status: 'pending',
      });
    } else {
      const lastTask = last.tasks[last.tasks.length - 1];
      if (lastTask && lastTask.estHours >= 1) {
        lastTask.estHours -= 1;
        last.tasks.push({
          topicId: null,
          topicName: 'Revision — recap covered topics',
          subject: 'Review',
          estHours: 1,
          status: 'pending',
        });
      }
    }
  }

  return { schedule, unplaced: Math.round(unplaced * 2) / 2 };
}

function usedHoursOn(day) {
  return day.tasks
    .filter((t) => t.status !== 'skipped')
    .reduce((sum, t) => sum + Number(t.estHours || 0), 0);
}

/* Redistribute a skipped day's pending work across remaining days. Every
 * target day is capped at hoursPerDay; leftover work that cannot fit before
 * the exam is returned as `unplaced` rather than piling onto one day. */
function reshuffle(allDays, fromDayIndex, hoursPerDay, examDate) {
  const limit = Math.max(1, Number(hoursPerDay) || 1);
  const sorted = [...allDays].sort((a, b) => a.dayIndex - b.dayIndex);
  const skippedDay = sorted.find((d) => d.dayIndex === fromDayIndex);
  if (!skippedDay) return { days: sorted, unplaced: 0 };

  const pending = skippedDay.tasks
    .filter((t) => t.status === 'pending')
    .map((t) => ({ ...t, status: 'pending' }));
  skippedDay.tasks = skippedDay.tasks.filter((t) => t.status !== 'pending');

  if (pending.length === 0) return { days: sorted, unplaced: 0 };

  const endMs = examDate ? startOfDay(new Date(examDate)).getTime() : Infinity;
  const futureDays = sorted
    .filter((d) => d.dayIndex > fromDayIndex)
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const queue = pending.map((t) => ({
    ref: t,
    remaining: Math.max(0, Number(t.estHours || 0)),
  }));
  let qi = 0;

  const fit = (day) => {
    while (qi < queue.length) {
      const capacity = Math.max(0, limit - usedHoursOn(day));
      if (capacity <= 0) break;
      const item = queue[qi];
      const hours = Math.round(Math.min(item.remaining, capacity) * 2) / 2;
      day.tasks.push({ ...item.ref, estHours: hours, status: 'pending' });
      item.remaining -= hours;
      if (item.remaining <= 0) qi++;
    }
  };

  for (const day of futureDays) {
    if (qi >= queue.length) break;
    fit(day);
  }

  let lastDay = futureDays[futureDays.length - 1] || skippedDay;
  while (qi < queue.length) {
    const nextMs = new Date(lastDay.date).getTime() + MS_PER_DAY;
    if (nextMs >= endMs) break;
    const day = {
      date: new Date(nextMs).toISOString(),
      dayIndex: lastDay.dayIndex + 1,
      tasks: [],
    };
    sorted.push(day);
    lastDay = day;
    fit(day);
  }

  let unplaced = 0;
  for (; qi < queue.length; qi++) unplaced += queue[qi].remaining;

  return { days: sorted, unplaced: Math.round(unplaced * 2) / 2 };
}

module.exports = { buildSchedule, reshuffle };