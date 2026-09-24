import { useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import QuizModal from '../components/QuizModal';
import './PracticeScreen.css';

const clampDifficulty = (n) => Math.max(1, Math.min(5, Number(n) || 3));

export default function PracticeScreen({ days }) {
  const [mode, setMode] = useState('schedule'); // 'schedule' | 'custom'
  const [quizTask, setQuizTask] = useState(null);

  const [topicName, setTopicName] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [error, setError] = useState('');

  const topics = useMemo(() => {
    const seen = new Set();
    const out = [];
    (days || []).forEach((d) =>
      (d.tasks || []).forEach((t) => {
        const name = String(t.topicName || '').trim();
        if (!name || seen.has(name)) return;
        seen.add(name);
        out.push({ ...t, topicName: name, difficulty: clampDifficulty(t.difficulty) });
      })
    );
    return out;
  }, [days]);

  const openQuiz = (t) =>
    setQuizTask({
      topicName: t.topicName,
      subject: typeof t.subject === 'string' && t.subject.trim() ? t.subject.trim() : 'General',
      difficulty: t.difficulty,
    });

  const handleCustom = (e) => {
    e.preventDefault();
    const name = topicName.trim();
    if (!name) {
      setError('Enter a topic name to generate a quiz.');
      return;
    }
    setError('');
    setQuizTask({
      topicName: name,
      subject: subject.trim() ? subject.trim() : 'General',
      difficulty,
    });
  };

  return (
    <section className="ps" aria-label="Practice">
      <div className="hd">
        <div>
          <h1>Practice / Quiz</h1>
          <p>Test yourself — from your plan, or any topic you type in.</p>
        </div>
      </div>

      <div className="ps__tabs" role="tablist" aria-label="Practice mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'schedule'}
          className={`ps__tab ${mode === 'schedule' ? 'ps__tab--on' : ''}`}
          onClick={() => setMode('schedule')}
        >
          From my schedule
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'custom'}
          className={`ps__tab ${mode === 'custom' ? 'ps__tab--on' : ''}`}
          onClick={() => setMode('custom')}
        >
          Custom topic
        </button>
      </div>

      {mode === 'schedule' ? (
        <section className="c ps__panel">
          <h3>Quiz me from my schedule</h3>
          {topics.length === 0 ? (
            <EmptyState message="No topics in your plan yet — generate a study plan first." />
          ) : (
            <ul className="ps__list">
              {topics.map((t) => (
                <li className="ps__row" key={t.topicName}>
                  <button type="button" className="ps__pick" onClick={() => openQuiz(t)}>
                    <span className="ps__pick-txt">
                      <b>{t.topicName}</b>
                      <small>
                        {t.subject || 'General'} · difficulty {t.difficulty}
                      </small>
                    </span>
                    <span className="ps__pick-go">Quiz me</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="c ps__panel">
          <h3>Custom topic</h3>
          <form className="ps__form" onSubmit={handleCustom} noValidate>
            <label className="ps__field">
              <span className="ps__label">Topic name</span>
              <input
                type="text"
                className={`ps__input ${error ? 'ps__input--error' : ''}`}
                placeholder="e.g. Newton's Laws of Motion"
                value={topicName}
                onChange={(e) => {
                  setTopicName(e.target.value);
                  if (error) setError('');
                }}
              />
              {error && <p className="ps__error">{error}</p>}
            </label>

            <label className="ps__field">
              <span className="ps__label">
                Subject <small className="ps__opt">(optional)</small>
              </span>
              <input
                type="text"
                className="ps__input"
                placeholder="e.g. Physics — defaults to General"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>

            <div className="ps__field">
              <span className="ps__label">Difficulty</span>
              <div className="difficulty" role="group" aria-label="Difficulty">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`difficulty__btn ${difficulty === n ? 'difficulty__btn--on' : ''}`}
                    onClick={() => setDifficulty(n)}
                    aria-pressed={difficulty === n}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="cta-btn">
              Generate quiz
            </button>
          </form>
        </section>
      )}

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