const MS_PER_DAY = 24 * 60 * 60 * 1000;

function buildSchedule(topics, startDate, examDate, hoursPerDay) {
  if (hoursPerDay <= 0) return [];

  const work = topics
    .map((t) => ({
      topicId: t.topicId || t._id || t.id,
      topicName: t.name,
      subject: t.subject,
      estHours: t.estHours,
      difficulty: t.difficulty,
    }))
    .sort((a, b) => b.difficulty - a.difficulty);

  const startMs = new Date(startDate).getTime();
  const endMs = new Date(examDate).getTime();

  const schedule = [];
  let dayIndex = 0;
  let topicIndex = 0;

  while (topicIndex < work.length) {
    const dateMs = startMs + dayIndex * MS_PER_DAY;
    if (dateMs > endMs) break;

    const tasks = [];
    let usedHours = 0;

    while (topicIndex < work.length && usedHours < hoursPerDay) {
      const topic = work[topicIndex];
      const capacity = hoursPerDay - usedHours;
      const hours = Math.min(topic.estHours, capacity);
      tasks.push({
        topicId: topic.topicId,
        topicName: topic.topicName,
        subject: topic.subject,
        estHours: hours,
        status: 'pending',
      });
      usedHours += hours;
      topic.estHours -= hours;
      if (topic.estHours <= 0) topicIndex++;
    }

    schedule.push({
      date: new Date(dateMs).toISOString(),
      dayIndex,
      tasks,
    });
    dayIndex++;
  }

  return schedule;
}

function usedHoursOn(day) {
  return day.tasks
    .filter((t) => t.status !== 'skipped')
    .reduce((sum, t) => sum + (t.estHours || 0), 0);
}

function reshuffle(allDays, fromDayIndex, hoursPerDay, examDate) {
  const sorted = [...allDays].sort((a, b) => a.dayIndex - b.dayIndex);
  const skippedDay = sorted.find((d) => d.dayIndex === fromDayIndex);
  if (!skippedDay) return sorted;

  const pending = skippedDay.tasks
    .filter((t) => t.status === 'pending')
    .map((t) => ({ ...t, status: 'pending' }));
  skippedDay.tasks = skippedDay.tasks.filter((t) => t.status !== 'pending');

  if (pending.length === 0) return sorted;

  const futureDays = sorted
    .filter((d) => d.dayIndex > fromDayIndex)
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const queue = pending.map((t) => ({ ref: t, remaining: t.estHours }));
  let qi = 0;
  let stalled = false;

  while (qi < queue.length && !stalled) {
    stalled = true;
    for (const day of futureDays) {
      if (qi >= queue.length) break;
      const capacity = Math.max(0, hoursPerDay - usedHoursOn(day));
      if (capacity > 0) {
        const item = queue[qi];
        const hours = Math.min(item.remaining, capacity);
        day.tasks.push({ ...item.ref, estHours: hours, status: 'pending' });
        item.remaining -= hours;
        if (item.remaining <= 0) qi++;
        stalled = false;
      }
    }
  }

  if (qi < queue.length) {
    const endMs = examDate
      ? new Date(examDate).getTime() + MS_PER_DAY - 1
      : Infinity;
    let lastDay = sorted[sorted.length - 1];

    while (qi < queue.length) {
      const nextMs = new Date(lastDay.date).getTime() + MS_PER_DAY;
      if (nextMs > endMs) {
        lastDay.tasks.push(
          ...queue
            .slice(qi)
            .map((item) => ({ ...item.ref, estHours: item.remaining }))
        );
        break;
      }

      const day = {
        date: new Date(nextMs).toISOString(),
        dayIndex: lastDay.dayIndex + 1,
        tasks: [],
      };
      sorted.push(day);
      lastDay = day;

      let capacity = hoursPerDay;
      while (capacity > 0 && qi < queue.length) {
        const item = queue[qi];
        const hours = Math.min(item.remaining, capacity);
        day.tasks.push({ ...item.ref, estHours: hours, status: 'pending' });
        item.remaining -= hours;
        capacity -= hours;
        if (item.remaining <= 0) qi++;
      }
    }
  }

  return sorted;
}

module.exports = { buildSchedule, reshuffle };