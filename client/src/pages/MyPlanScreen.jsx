import EmptyState from '../components/EmptyState';
import './MyPlanScreen.css';

export default function MyPlanScreen({
  plan,
  days,
  hasPlan,
  onStartPlan,
  onRemovePlan,
}) {
  if (!hasPlan || !plan) {
    return (
      <div className="mpl">
        <EmptyState message="No plan yet — create one to see your topics." />
        <div className="mpl__cta">
          <button type="button" className="dash__cta" onClick={onStartPlan}>
            Create your study plan
          </button>
        </div>
      </div>
    );
  }

  const allTasks = days.flatMap((d) => d.tasks);
  const totalHours = allTasks.reduce((s, t) => s + (t.estHours || 0), 0);

  const bySubject = allTasks.reduce((acc, t) => {
    const key = t.subject || 'General';
    acc[key] = acc[key] || [];
    acc[key].push(t);
    return acc;
  }, {});

  const subjects = Object.entries(bySubject)
    .map(([name, tasks]) => ({
      name,
      tasks,
      hours: tasks.reduce((s, t) => s + (t.estHours || 0), 0),
      count: tasks.length,
    }))
    .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));

  const handleRemove = () => {
    const ok = window.confirm(
      'Remove this plan? All topics, progress, and schedule data for this plan will be cleared.'
    );
    if (ok) onRemovePlan();
  };

  return (
    <section className="mpl" aria-label="My Plan">
      <div className="hd">
        <div>
          <h1>My Plan</h1>
          <p>The full breakdown of every subject and topic in your plan.</p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <EmptyState message="No topics found in your current plan." />
      ) : (
        <>
          <section className="c mpl__stats">
            <div className="mpl__stat">
              <b>{subjects.length}</b>
              <span>Subjects</span>
            </div>
            <div className="mpl__stat">
              <b>{allTasks.length}</b>
              <span>Topics</span>
            </div>
            <div className="mpl__stat">
              <b>{totalHours}h</b>
              <span>Total hours</span>
            </div>
          </section>

          <div className="mpl__groups">
            {subjects.map((s) => (
              <section className="c mpl__group" key={s.name}>
                <h3>
                  {s.name}
                  <small>
                    {s.count} {s.count === 1 ? 'topic' : 'topics'} · {s.hours}h
                  </small>
                </h3>
                <ul className="mpl__list">
                  {s.tasks.map((t, i) => (
                    <li className="mpl__item" key={t._id || `${s.name}-${i}`}>
                      <span className="mpl__topic">{t.topicName}</span>
                      <div className="mpl__tags">
                        {t.subject && (
                          <span className="mpl__tag">{t.subject}</span>
                        )}
                        <span className="mpl__tag">{t.estHours || 0}h</span>
                        {t.difficulty != null && (
                          <span className="mpl__tag">
                            Difficulty {t.difficulty}/5
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <section className="c mpl__actions-card">
            <h3>Plan actions</h3>
            <div className="mpl__actions">
              <button
                type="button"
                className="mpl__btn mpl__btn--primary"
                onClick={onStartPlan}
              >
                + Add new plan
              </button>
              <button
                type="button"
                className="mpl__btn mpl__btn--danger"
                onClick={handleRemove}
              >
                Remove this plan
              </button>
            </div>
          </section>
        </>
      )}
    </section>
  );
}