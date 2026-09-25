import { useRef, useState } from 'react';
import './InputScreen.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const HOUR_OPTIONS = [1, 2, 4, 8];

const toRow = (t, seed = 0) => ({
  key: `r-${seed}`,
  name: typeof t?.name === 'string' ? t.name.trim() : '',
  subject: typeof t?.subject === 'string' ? t.subject : 'General',
  estHours: Math.max(1, Math.min(6, Number(t?.estHours) || 2)),
  difficulty: Math.max(1, Math.min(5, Number(t?.difficulty) || 3)),
});

export default function InputScreen({
  syllabusText,
  onSyllabusChange,
  examDate,
  setExamDate,
  hoursPerDay,
  setHoursPerDay,
  onPlanReady,
}) {
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [stage, setStage] = useState('form');
  const [rows, setRows] = useState([]);
  const addCount = useRef(0);

  const todayISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  })();

  const validate = () => {
    const errs = {};
    if (!syllabusText.trim()) {
      errs.syllabusText = 'Paste your syllabus to get started';
    }
    if (!examDate) {
      errs.examDate = 'Set an exam date';
    } else if (examDate <= todayISO) {
      errs.examDate = 'Exam date must be in the future';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleExtract = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const extractRes = await fetch(`${API_URL}/api/plans/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabusText }),
      });
      if (!extractRes.ok) throw new Error('request failed');
      const { topics } = await extractRes.json();
      setRows((Array.isArray(topics) ? topics : []).map((t, i) => toRow(t, `e${i}`)));
      setStage('review');
    } catch {
      setApiError(
        "We couldn't analyse your syllabus. Your text is safe — check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBuild = async () => {
    if (rows.length === 0) {
      setApiError('Add at least one topic before building your plan.');
      return;
    }
    setApiError('');
    setBuilding(true);
    try {
      const createRes = await fetch(`${API_URL}/api/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syllabusText,
          topics: rows.map((r) => ({
            name: r.name,
            subject: r.subject,
            estHours: r.estHours,
            difficulty: r.difficulty,
          })),
          examDate,
          hoursPerDay,
          daysPerWeek: 7,
        }),
      });
      if (!createRes.ok) throw new Error('request failed');
      const { plan } = await createRes.json();

      localStorage.setItem('studyloop:lastPlanId', plan._id);
      localStorage.setItem(
        `studyloop:plan:${plan._id}`,
        JSON.stringify({
          examDate: plan.examDate,
          hoursPerDay: plan.hoursPerDay,
          daysPerWeek: plan.daysPerWeek,
        })
      );

      onPlanReady?.(plan, plan._id);
    } catch {
      setApiError(
        "We couldn't create your plan. Your syllabus is safe — try again."
      );
    } finally {
      setBuilding(false);
    }
  };

  const updateRow = (key, patch) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  const addRow = () => {
    addCount.current += 1;
    setRows((prev) => [...prev, toRow({ subject: 'General', estHours: 1 }, `a${addCount.current}`)]);
  };

  const openCalendar = (e) => {
    e.preventDefault();
    const input = document.getElementById('exam-date');
    if (!input) return;
    if (typeof input.showPicker === 'function') input.showPicker();
    else input.focus();
  };

  if (stage === 'review') {
    return (
      <section className="input-screen input-review">
        <div className="input-review__head">
          <h3>Review your topics</h3>
          <p>
            Edit, remove, or add topics before we build your schedule. Hours are
            your estimate — we'll never plan more than {hoursPerDay}h per day.
          </p>
        </div>
        <ul className="input-review__list">
          {rows.map((r) => (
            <li className="review-row" key={r.key}>
              <div className="review-row__main">
                <input
                  className="field__input"
                  value={r.name}
                  onChange={(e) => updateRow(r.key, { name: e.target.value })}
                  aria-label="Topic name"
                  placeholder="Topic name"
                />
              </div>
              <div className="review-row__sub">
                <input
                  className="field__input"
                  value={r.subject}
                  onChange={(e) => updateRow(r.key, { subject: e.target.value })}
                  aria-label="Subject"
                  placeholder="Subject"
                />
                <label className="review-row__num">
                  <span>Hours</span>
                  <input
                    className="field__input"
                    type="number"
                    min="1"
                    max="6"
                    value={r.estHours}
                    onChange={(e) =>
                      updateRow(r.key, {
                        estHours: Math.max(1, Math.min(6, Number(e.target.value) || 1)),
                      })
                    }
                    aria-label={`Hours for ${r.name}`}
                  />
                </label>
                <label className="review-row__num">
                  <span>Diff.</span>
                  <input
                    className="field__input"
                    type="number"
                    min="1"
                    max="5"
                    value={r.difficulty}
                    onChange={(e) =>
                      updateRow(r.key, {
                        difficulty: Math.max(1, Math.min(5, Number(e.target.value) || 3)),
                      })
                    }
                    aria-label={`Difficulty for ${r.name}`}
                  />
                </label>
                <button
                  type="button"
                  className="review-row__remove"
                  onClick={() => removeRow(r.key)}
                  aria-label={`Remove ${r.name}`}
                >
                  &times;
                </button>
              </div>
            </li>
          ))}
        </ul>

        <button type="button" className="btn-ghost review-add" onClick={addRow}>
          + Add topic
        </button>

        {apiError && (
          <div className="api-error" role="alert">
            <b>We couldn't create your plan.</b>
            <p>{apiError}</p>
            <button
              type="button"
              className="cta-btn"
              disabled={building}
              onClick={handleBuild}
            >
              {building ? 'Building…' : 'Try again'}
            </button>
          </div>
        )}

        <div className="review-actions">
          <button
            type="button"
            className="btn-ghost"
            disabled={building}
            onClick={() => setStage('form')}
          >
            Back to syllabus
          </button>
          <button
            type="button"
            className="cta-btn"
            disabled={building}
            onClick={handleBuild}
          >
            {building
              ? 'Building your study plan…'
              : `Build my plan — ${rows.length} ${rows.length === 1 ? 'topic' : 'topics'}`}
          </button>
        </div>
        {building && (
          <p className="gen-loading" role="status">
            <span className="gen-loading__dot" aria-hidden="true" />
            Building your personalized study plan…
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="input-screen input-screen__grid">
      <form className="input-screen__form" onSubmit={handleExtract} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="syllabus">
            Syllabus
          </label>
          <div className="field__textarea-wrap">
            <textarea
              id="syllabus"
              className={`field__textarea ${errors.syllabusText ? 'field__textarea--error' : ''}`}
              placeholder="Paste or type your syllabus here…"
              value={syllabusText}
              onChange={(e) => {
                onSyllabusChange(e.target.value);
                if (errors.syllabusText) setErrors((prev) => ({ ...prev, syllabusText: '' }));
              }}
              rows={6}
            />
          </div>
          <p className="field__hint">
            Each line becomes a topic. You can review and edit the list after
            detection.
          </p>
          {errors.syllabusText && (
            <p className="field__error">{errors.syllabusText}</p>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field__label" htmlFor="exam-date">
              Exam date
            </label>
            <div className="field__date">
              <input
                id="exam-date"
                type="date"
                min={todayISO}
                className={`field__input ${errors.examDate ? 'field__input--error' : ''}`}
                value={examDate}
                onChange={(e) => {
                  setExamDate(e.target.value);
                  if (errors.examDate) setErrors((prev) => ({ ...prev, examDate: '' }));
                }}
              />
              <button
                type="button"
                className="field__date-icon"
                onClick={openCalendar}
                aria-label="Open calendar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
              </button>
            </div>
            {errors.examDate && (
              <p className="field__error">{errors.examDate}</p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="hours">
              Hours per day
            </label>
            <div className="hours-grid" role="group" aria-label="Hours per day">
              {HOUR_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`hours-btn ${hoursPerDay === h ? 'hours-btn--on' : ''}`}
                  aria-pressed={hoursPerDay === h}
                  onClick={() => setHoursPerDay(h)}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>

        {apiError && (
          <div className="api-error" role="alert">
            <b>We couldn't analyse your syllabus.</b>
            <p>{apiError}</p>
            <button
              type="button"
              className="cta-btn"
              disabled={loading}
              onClick={handleExtract}
            >
              Try again
            </button>
          </div>
        )}

        <button
          type="submit"
          className="cta-btn"
          disabled={loading}
        >
          {loading ? 'Detecting topics…' : 'Detect topics'}
        </button>
        {loading && (
          <p className="gen-loading" role="status">
            <span className="gen-loading__dot" aria-hidden="true" />
            Detecting your topics…
          </p>
        )}
      </form>
    </section>
  );
}