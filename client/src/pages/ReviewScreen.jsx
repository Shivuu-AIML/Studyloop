import { useState } from 'react';
import ErrorState from '../components/ErrorState';
import './ReviewScreen.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

const clamp = (n) => Math.max(1, Math.min(12, Number(n) || 1));

const clampDifficulty = (n) => Math.max(1, Math.min(5, Number(n) || 3));

const nextKey = () => crypto.randomUUID();

const toTopicRow = (t) => ({
  key: nextKey(),
  name: typeof t.name === 'string' ? t.name : '',
  estHours: typeof t.estHours === 'number' ? clamp(t.estHours) : 2,
  difficulty: typeof t.difficulty === 'number' ? clampDifficulty(t.difficulty) : 3,
});

export default function ReviewScreen({ plan, onBack }) {
  const [topics, setTopics] = useState(() =>
    (Array.isArray(plan?.topics) ? plan.topics : []).map(toTopicRow)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateTopic = (key, patch) =>
    setTopics((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  const removeTopic = (key) => setTopics((prev) => prev.filter((t) => t.key !== key));

  const addTopic = () =>
    setTopics((prev) => [
      ...prev,
      { key: nextKey(), name: '', estHours: 2, difficulty: 3 },
    ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleaned = topics
      .filter((t) => t.name.trim())
      .map((t) => ({
        name: t.name.trim(),
        estHours: clamp(t.estHours),
        difficulty: clampDifficulty(t.difficulty),
      }));

    if (cleaned.length === 0) {
      setError('Add at least one topic with a name before generating your schedule.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syllabusText: plan?.syllabusRaw || '',
          topics: cleaned,
          examDate: plan?.examDate,
          hoursPerDay: plan?.hoursPerDay,
          daysPerWeek: 7,
        }),
      });

      if (!res.ok) throw new Error('request failed');

      const { plan: nextPlan } = await res.json();
      localStorage.setItem('studyloop:lastPlanId', nextPlan._id);
      localStorage.setItem(
        `studyloop:plan:${nextPlan._id}`,
        JSON.stringify({
          examDate: nextPlan.examDate,
          hoursPerDay: nextPlan.hoursPerDay,
          daysPerWeek: nextPlan.daysPerWeek,
        })
      );
      onBack?.();
    } catch {
      setError(
        "Couldn't generate your schedule. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="review-screen">
      <h1 className="review-screen__title">Review your topics</h1>
      <p className="review-screen__subtitle">
        Fine-tune what&nbsp;AI&nbsp;extracted before generating your schedule.
      </p>

      <form className="review-screen__form" onSubmit={handleSubmit} noValidate>
        <ul className="topic-list">
          {topics.map((t) => (
            <li className="topic-row" key={t.key}>
              <div className="topic-row__name-wrap">
                <input
                  type="text"
                  className="topic-row__name"
                  placeholder="Topic name"
                  value={t.name}
                  onChange={(e) => updateTopic(t.key, { name: e.target.value })}
                />
              </div>

              <div className="topic-row__controls">
                <div
                  className="difficulty"
                  role="group"
                  aria-label={`Difficulty for ${t.name || 'topic'}`}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`difficulty__btn ${t.difficulty === n ? 'difficulty__btn--on' : ''}`}
                      onClick={() => updateTopic(t.key, { difficulty: n })}
                      aria-pressed={t.difficulty === n}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="topic-row__hours">
                  <label className="topic-row__hours-label" htmlFor={`hours-${t.key}`}>
                    hrs
                  </label>
                  <input
                    id={`hours-${t.key}`}
                    type="number"
                    min={1}
                    max={12}
                    className="topic-row__hours-input"
                    value={t.estHours}
                    onChange={(e) =>
                      updateTopic(t.key, { estHours: clamp(e.target.value) })
                    }
                  />
                </div>

                <button
                  type="button"
                  className="topic-row__remove"
                  onClick={() => removeTopic(t.key)}
                  aria-label={`Remove ${t.name || 'topic'}`}
                >
                  &times;
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="review-screen__actions">
          <button type="button" className="add-btn" onClick={addTopic}>
            + Add topic
          </button>

          {error && <ErrorState compact message={error} />}

          <button type="submit" className="cta-btn" disabled={loading}>
            {loading ? 'Generating schedule…' : 'Generate my schedule'}
          </button>
        </div>
      </form>
    </main>
  );
}