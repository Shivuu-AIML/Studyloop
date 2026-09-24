import { useState } from 'react';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import QuizModal, { QuizIcon } from '../components/QuizModal';
import './ScheduleScreen.css';

const MS_DAY = 86400000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtH = (h) => `${Math.round(h * 2) / 2}h`;
const longDate = (d) =>
  `${d.getDate()} ${MONTHS[d.getMonth()]} ${WEEKDAYS[d.getDay()]}`;

const statusOf = (day, todayIdx) => {
  if (day.tasks.length === 0) return { key: 'skipped', label: 'Skipped' };
  if (day.tasks.every((t) => t.status === 'done'))
    return { key: 'done', label: 'Done' };
  if (day.dayIndex === todayIdx) return { key: 'today', label: 'Today' };
  if (day.dayIndex < todayIdx) return { key: 'overdue', label: 'Overdue' };
  return { key: 'upcoming', label: 'Upcoming' };
};

export default function ScheduleScreen({
  days,
  loading,
  fetchError,
  hasPlan,
  onStartPlan,
}) {
  const [quizTask, setQuizTask] = useState(null);
  if (!hasPlan) {
    return (
      <div className="sc">
        <EmptyState message="No study plan yet — create one to see your day-by-day schedule." />
        <div className="sc__cta">
          <button type="button" className="dash__cta" onClick={onStartPlan}>
            Create your study plan
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState message="Loading your schedule…" />;

  if (fetchError && days.length === 0) return <ErrorState message={fetchError} />;

  if (days.length === 0) {
    return (
      <div className="sc">
        <EmptyState message="Nothing scheduled yet — your plan will fill in as soon as it's generated." />
      </div>
    );
  }

  const todayIdx =
    days.length > 0
      ? Math.max(
          0,
          Math.round(
            (startOfDay(new Date()).getTime() -
              startOfDay(new Date(days[0].date)).getTime()) /
              MS_DAY
          )
        )
      : 0;

  return (
    <section className="sc" aria-label="Schedule">
      <div className="hd">
        <div>
          <h1>Schedule</h1>
          <p>Your day-by-day plan, each topic and subject.</p>
        </div>
      </div>

      <div className="sc__list">
        {days.map((d) => {
          const dt = new Date(d.date);
          const status = statusOf(d, todayIdx);
          return (
            <article className="c sc__day" key={d._id || d.dayIndex}>
              <header className="sc__day-head">
                <div className="dt">
                  <b>{dt.getDate()}</b>
                  <span>{WEEKDAYS[dt.getDay()]}</span>
                </div>
                <div className="sc__day-meta">
                  <b>{longDate(dt)}</b>
                  <span>
                    {d.tasks.length} {d.tasks.length === 1 ? 'task' : 'tasks'} ·{' '}
                    {d.tasks.reduce((s, t) => s + (t.estHours || 0), 0)}h
                  </span>
                </div>
                <span className={`sc__status sc__status--${status.key}`}>
                  {status.label}
                </span>
              </header>

              {d.tasks.length === 0 ? (
                <p className="sc__empty-day">
                  No topics for this day — skipped tasks were moved to later
                  days.
                </p>
              ) : (
                <ul className="sc__tasks">
                  {d.tasks.map((t, i) => (
                    <li
                      className={`tk sc__tk ${
                        t.status === 'done' ? 'sc__tk--done' : ''
                      }`}
                      key={t._id || i}
                    >
                      <span className="bx" aria-hidden="true">
                        <svg
                          viewBox="0 0 12 12"
                          fill="none"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 6.5l2.6 2.5L10 3.5" />
                        </svg>
                      </span>
                      <span className="tt">
                        {t.topicName}
                        <small>
                          {t.subject || 'General'}
                          {t.status === 'done' ? ' · completed' : ' · focus'}
                        </small>
                      </span>
                      <span className="hp">{fmtH(t.estHours)}</span>
                      <button
                        type="button"
                        className="quiz-btn"
                        onClick={() =>
                          setQuizTask({
                            topicName: t.topicName,
                            subject: t.subject,
                            difficulty: t.difficulty ?? 3,
                          })
                        }
                      >
                        <QuizIcon aria-hidden="true" />
                        Quiz me
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>

      {quizTask && (
        <QuizModal
          topicName={quizTask.topicName}
          subject={quizTask.subject}
          difficulty={quizTask.difficulty}
          onClose={() => setQuizTask(null)}
        />
      )}
    </section>
  );
}