import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import './ProgressScreen.css';

const MS_DAY = 86400000;
const RING_R = 170;
const RING_C = 2 * Math.PI * RING_R;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtH = (h) => `${Math.round(h * 2) / 2}h`;
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const dayHrs = (d) => d.tasks.reduce((s, t) => s + (t.estHours || 0), 0);

export default function ProgressScreen({
  days,
  loading,
  fetchError,
  subjectGroups,
  hasPlan,
  onStartPlan,
}) {
  if (!hasPlan) {
    return (
      <div className="pg">
        <EmptyState message="No study plan yet — create one to track your progress." />
        <div className="pg__cta">
          <button type="button" className="dash__cta" onClick={onStartPlan}>
            Create your study plan
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState message="Loading your progress…" />;

  if (fetchError && days.length === 0) return <ErrorState message={fetchError} />;

  if (days.length === 0) {
    return (
      <div className="pg">
        <EmptyState message="No data yet — your progress will appear once the plan is generated." />
      </div>
    );
  }

  const allTasks = days.flatMap((d) => d.tasks);
  const doneCount = allTasks.filter((t) => t.status === 'done').length;
  const totalCount = allTasks.length;
  const coveredPct = pct(doneCount, totalCount);

  const plannedHours = allTasks.reduce((s, t) => s + (t.estHours || 0), 0);
  const doneHours = allTasks
    .filter((t) => t.status === 'done')
    .reduce((s, t) => s + (t.estHours || 0), 0);
  const hoursPct = pct(doneHours, plannedHours);

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

  const maxDayHours = Math.max(1, ...days.map(dayHrs));

  return (
    <section className="pg" aria-label="Progress">
      <div className="hd">
        <div>
          <h1>Progress</h1>
          <p>How your plan is shaping up.</p>
        </div>
      </div>

      <div className="pg__grid">
        <section className="c pg__overview">
          <div className="pg__ring">
            <svg viewBox="0 0 380 380" aria-hidden="true">
              <circle cx="190" cy="190" r={RING_R} fill="none" strokeWidth="26" />
              <circle
                cx="190"
                cy="190"
                r={RING_R}
                fill="none"
                strokeWidth="26"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - coveredPct / 100)}
              />
            </svg>
            <div className="pg__ring-txt">
              <b>{coveredPct}%</b>
              <span>completed</span>
            </div>
          </div>
          <div className="pg__overview-stats">
            <div className="pg__stat">
              <b>
                {doneCount} <small>of {totalCount}</small>
              </b>
              <span>topics done</span>
            </div>
            <div className="pg__stat">
              <b>
                {fmtH(doneHours)} <small>of {fmtH(plannedHours)}</small>
              </b>
              <span>hours done · {hoursPct}%</span>
            </div>
          </div>
        </section>

        <section className="c pg__subjects">
          <h3>
            Subjects <small>{subjectGroups.length} in your plan</small>
          </h3>
          {subjectGroups.length > 0 ? (
            <ul className="pg__subjects-list">
              {subjectGroups.map((g) => (
                <li className="pg__subject" key={g.subject}>
                  <div className="pg__subject-top">
                    <b>{g.subject}</b>
                    <span>
                      {g.doneH > 0
                        ? `${fmtH(g.doneH)} / ${fmtH(g.planned)} done`
                        : `${fmtH(g.planned)} planned`}
                    </span>
                  </div>
                  <span className="pg__subject-bar" aria-hidden="true">
                    <i style={{ width: `${g.pct}%` }} />
                  </span>
                  <span className="pg__subject-meta">
                    {g.done}/{g.total} topics · {g.pct}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="Subjects will show here once the schedule is built." />
          )}
        </section>

        <section className="c pg__days">
          <h3>
            Planned hours per day{' '}
            <small>up to {fmtH(maxDayHours)}</small>
          </h3>
          <div className="pg__chart" aria-label="Planned hours per day">
            {days.map((d) => {
              const hours = dayHrs(d);
              const isEmpty = d.tasks.length === 0;
              const isDone =
                d.tasks.length > 0 && d.tasks.every((t) => t.status === 'done');
              const isToday = d.dayIndex === todayIdx;
              return (
                <div className="pg__col" key={d._id || d.dayIndex}>
                  <div className="pg__col-bar">
                    <span
                      className={`pg__bar ${
                        isEmpty
                          ? 'pg__bar--empty'
                          : isDone
                            ? 'pg__bar--done'
                            : isToday
                              ? 'pg__bar--today'
                              : ''
                      }`}
                      style={{
                        height: `${isEmpty ? 4 : Math.max(6, (hours / maxDayHours) * 100)}%`,
                      }}
                      title={
                        isEmpty
                          ? `Day ${d.dayIndex + 1}: skipped`
                          : `Day ${d.dayIndex + 1}: ${fmtH(hours)}`
                      }
                    />
                  </div>
                  <span className="pg__col-label">
                    {isToday ? 'Today' : `D${d.dayIndex + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="pg__legend" aria-hidden="true">
            <span>
              <i className="pg__legend-bar pg__legend-bar--done" /> done
            </span>
            <span>
              <i className="pg__legend-bar pg__legend-bar--today" /> today
            </span>
            <span>
              <i className="pg__legend-bar pg__legend-bar--empty" /> skipped
            </span>
          </div>
        </section>
      </div>
    </section>
  );
}