import { useState } from 'react';
import './InputScreen.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const clamp = (n) => Math.max(1, Math.min(12, n));

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

  const increment = () => setHoursPerDay((h) => clamp(h + 1));
  const decrement = () => setHoursPerDay((h) => clamp(h - 1));

  const validate = () => {
    const errs = {};
    if (!syllabusText.trim()) {
      errs.syllabusText = 'Paste your syllabus to get started';
    }
    if (!examDate) {
      errs.examDate = 'Set an exam date';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(examDate) <= today) {
        errs.examDate = 'Exam date must be in the future';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      const createRes = await fetch(`${API_URL}/api/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syllabusText,
          topics,
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
        "Couldn't generate your plan. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="input-screen input-screen__grid">
      <form className="input-screen__form" onSubmit={handleSubmit} noValidate>
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
              rows={10}
            />
          </div>
          {errors.syllabusText && (
            <p className="field__error">{errors.syllabusText}</p>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field__label" htmlFor="exam-date">
              Exam date
            </label>
            <input
              id="exam-date"
              type="date"
              className={`field__input ${errors.examDate ? 'field__input--error' : ''}`}
              value={examDate}
              onChange={(e) => {
                setExamDate(e.target.value);
                if (errors.examDate) setErrors((prev) => ({ ...prev, examDate: '' }));
              }}
            />
            {errors.examDate && (
              <p className="field__error">{errors.examDate}</p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="hours">
              Hours per day
            </label>
            <div className="stepper">
              <button
                type="button"
                className="stepper__btn"
                onClick={decrement}
                aria-label="Decrease hours"
              >
                &minus;
              </button>
              <span className="stepper__value">{hoursPerDay}</span>
              <button
                type="button"
                className="stepper__btn"
                onClick={increment}
                aria-label="Increase hours"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {apiError && <p className="field__error field__error--api">{apiError}</p>}

        <button
          type="submit"
          className="cta-btn"
          disabled={loading}
        >
          {loading ? 'Generating…' : 'Generate study plan'}
        </button>
      </form>
    </section>
  );
}