import { useCallback, useEffect, useState } from 'react';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import './QuizModal.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const QuizIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M9.4 9.3a2.7 2.7 0 1 1 3.4 2.6c-.7.3-1 .8-1 1.6" />
    <path d="M12 17h.01" />
  </svg>
);

export { QuizIcon };

export default function QuizModal({ topicName, subject, difficulty = 3, onClose }) {
  const [phase, setPhase] = useState('loading'); // loading | active | results
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState('');

  const fetchQuiz = useCallback(async () => {
    setPhase('loading');
    setError('');
    setQuestions([]);
    setAnswers([]);
    setCurrent(0);
    try {
      const res = await fetch(`${API_URL}/api/plans/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicName,
          subject,
          difficulty: typeof difficulty === 'number' ? difficulty : 3,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      if (!Array.isArray(data.questions) || data.questions.length === 0)
        throw new Error('empty');
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(null));
      setPhase('active');
    } catch {
      setError("Couldn't load your quiz. Check your connection and try again.");
    }
  }, [topicName, subject, difficulty]);

  useEffect(() => {
    const t = setTimeout(fetchQuiz, 0);
    return () => clearTimeout(t);
  }, [fetchQuiz]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const select = (idx) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = idx;
      return next;
    });
  };

  const next = () => {
    if (current < questions.length - 1) setCurrent(current + 1);
    else setPhase('results');
  };

  const score = questions.reduce(
    (s, q, i) => s + (answers[i] === q.correctIndex ? 1 : 0),
    0
  );

  const q = questions[current];
  const selected = answers[current];

  return (
    <div className="qz__overlay" onClick={onClose} role="presentation">
      <div
        className="qz__card"
        role="dialog"
        aria-modal="true"
        aria-label={`Quiz: ${topicName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="qz__head">
          <div className="qz__head-txt">
            <span className="qz__kicker">
              <QuizIcon className="qz__kicker-ic" />
              Quiz me
            </span>
            <h2 className="qz__title">{topicName}</h2>
            <p className="qz__meta">
              {subject || 'General'} · difficulty {typeof difficulty === 'number' ? difficulty : 3}
              /5
            </p>
          </div>
          <button
            type="button"
            className="qz__x"
            onClick={onClose}
            aria-label="Close quiz"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {phase === 'loading' &&
          (error ? (
            <div className="qz__err">
              <ErrorState message={error} />
              <button type="button" className="qz__retry" onClick={fetchQuiz}>
                Try again
              </button>
            </div>
          ) : (
            <LoadingState message="Generating your quiz…" />
          ))}

        {phase === 'active' && q && (
          <>
            <div className="qz__progress">
              <span className="qz__progress-label">
                Question {current + 1} of {questions.length}
              </span>
              <span
                className="qz__bar"
                role="progressbar"
                aria-valuenow={current + 1}
                aria-valuemin={1}
                aria-valuemax={questions.length}
              >
                <i
                  style={{
                    width: `${((current + 1) / questions.length) * 100}%`,
                  }}
                />
              </span>
            </div>

            <p className="qz__q">{q.question}</p>

            <div className="qz__opts">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`qz__opt${selected === idx ? ' qz__opt--sel' : ''}`}
                  aria-pressed={selected === idx}
                  onClick={() => select(idx)}
                >
                  <span className="qz__opt-ic">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="qz__opt-txt">{opt}</span>
                </button>
              ))}
            </div>

            <div className="qz__foot">
              <button
                type="button"
                className="qz__btn"
                disabled={selected === null || selected === undefined}
                onClick={next}
              >
                {current === questions.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </>
        )}

        {phase === 'results' && (
          <>
            <div className="qz__score-wrap">
              <span className="qz__score-num">
                {score} <small>of {questions.length}</small>
              </span>
              <span className="qz__score-label">
                {score === questions.length
                  ? 'Perfect score — nice work!'
                  : score >= Math.ceil(questions.length * 0.6)
                    ? 'Solid effort, keep going.'
                    : 'Worth another look at this topic.'}
              </span>
            </div>

            <ul className="qz__list">
              {questions.map((item, i) => {
                const right = answers[i] === item.correctIndex;
                const mine =
                  answers[i] === null || answers[i] === undefined
                    ? '—'
                    : item.options[answers[i]];
                return (
                  <li
                    className={`qz__item qz__item--${right ? 'right' : 'wrong'}`}
                    key={i}
                  >
                    <p className="qz__item-q">
                      <span className="qz__item-n">{i + 1}.</span>
                      {item.question}
                    </p>
                    <p className="qz__item-row">
                      <span className="qz__item-k">Your answer:</span>
                      <span className="qz__item-v">{mine}</span>
                    </p>
                    <p className="qz__item-row">
                      <span className="qz__item-k">Correct:</span>
                      <span className="qz__item-v qz__item-v--key">
                        {item.options[item.correctIndex]}
                      </span>
                    </p>
                    <p className="qz__expl">{item.explanation}</p>
                  </li>
                );
              })}
            </ul>

            <div className="qz__foot">
              <button type="button" className="qz__btn" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
