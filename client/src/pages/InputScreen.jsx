import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InputScreen.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

export default function InputScreen() {
  const navigate = useNavigate();

  const [syllabusText, setSyllabusText] = useState('');
  const [examDate, setExamDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const clamp = (n) => Math.max(1, Math.min(12, n));

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
      const res = await fetch(`${API_URL}/api/plans/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabusText }),
      });

      if (!res.ok) throw new Error('request failed');

      const { topics } = await res.json();
      console.log('Extracted topics:', topics);
      navigate('/review');
    } catch {
      setApiError(
        "Couldn't generate your plan. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="input-screen">
      <h1 className="input-screen__title">StudyLoop</h1>
      <p className="input-screen__subtitle">
        Paste your syllabus, set a date, and let&nbsp;AI&nbsp;plan&nbsp;your&nbsp;study&nbsp;time.
      </p>

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
                setSyllabusText(e.target.value);
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
    </main>
  );
}
