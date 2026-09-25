import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Logo from '../components/Logo';
import QuizModal, { QuizIcon } from '../components/QuizModal';
import ScheduleScreen from './ScheduleScreen';
import ProgressScreen from './ProgressScreen';
import PracticeScreen from './PracticeScreen';
import MyPlanScreen from './MyPlanScreen';
import SettingsScreen from './SettingsScreen';
import './DashboardScreen.css';

const API_URL = import.meta.env.VITE_API_URL || '';
const MS_DAY = 86400000;
const RING_C = 389.6;
const SIDE_RING_C = 150.8;
const FOCUS_SECS = 1500;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayHrs = (d) => d.tasks.reduce((s, t) => s + (t.estHours || 0), 0);
const fmtH = (h) => `${Math.round(h * 2) / 2}h`;
const fmtMon = (d) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

function useFocusTimer() {
  const leftRef = useRef(FOCUS_SECS);
  const [left, setLeft] = useState(FOCUS_SECS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      leftRef.current -= 1;
      if (leftRef.current <= 0) {
        leftRef.current = FOCUS_SECS;
        setRunning(false);
      }
      setLeft(leftRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const label =
    !running && left === FOCUS_SECS
      ? 'Start focus session'
      : running
        ? 'Pause'
        : 'Resume session';

  const mm = Math.floor(left / 60);
  const ss = left % 60;
  const time = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

  return { label, time, toggle: () => setRunning((r) => !r) };
}

const NavIcon = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    view: 'dashboard',
    icon: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="2" />
        <rect x="14" y="3" width="7" height="5" rx="2" />
        <rect x="14" y="12" width="7" height="9" rx="2" />
        <rect x="3" y="16" width="7" height="5" rx="2" />
      </>
    ),
  },
  {
    key: 'plan',
    label: 'My Plan',
    view: 'plan',
    icon: (
      <>
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v5h5" />
        <path d="M9.5 13.5l1.8 1.8 3.2-3.6" />
      </>
    ),
  },
  {
    key: 'schedule',
    label: 'Schedule',
    view: 'schedule',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
  },
  {
    key: 'tasks',
    label: 'Tasks',
    view: 'dashboard',
    icon: (
      <>
        <path d="M4 5h12M4 12h12M4 19h12" />
        <path d="M18 4.5l1.7 1.7L23 3.5M18 11.5l1.7 1.7L23 10.5M18 18.5l1.7 1.7L23 17.5" />
      </>
    ),
  },
  {
    key: 'progress',
    label: 'Progress',
    view: 'progress',
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
  { divider: true, section: 'Tools' },
  {
    key: 'ai',
    label: 'AI Study Assistant',
    view: 'ai',
    icon: (
      <>
        <path d="M12 3l1.7 4.6L18 9.4l-4.3 1.8L12 16l-1.7-4.8L6 9.4l4.3-1.8L12 3Z" />
        <path d="M18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3Z" />
      </>
    ),
  },
  {
    key: 'practice',
    label: 'Practice / Quiz',
    view: 'practice',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.6a2.6 2.6 0 1 1 3.6 2.4c-.9.4-1.6 1-1.6 2M12 16.8h.01" />
      </>
    ),
  },
  { divider: true, section: 'Utilities' },
  {
    key: 'settings',
    label: 'Settings',
    view: 'settings',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </>
    ),
  },
  {
    key: 'help',
    label: 'Help',
    view: null,
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v4M12 7.5h.01" />
      </>
    ),
  },
];

function HelpModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="qz__overlay" onClick={onClose} role="presentation">
      <div
        className="qz__card"
        role="dialog"
        aria-modal="true"
        aria-label="Help"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="qz__head">
          <div className="qz__head-txt">
            <div className="qz__kicker">
              <svg
                className="qz__kicker-ic"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v4M12 7.5h.01" />
              </svg>
              Guide
            </div>
            <h2 className="qz__title">How StudyLoop works</h2>
          </div>
          <button type="button" className="qz__x" onClick={onClose} aria-label="Close help">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <ol className="help__steps">
          <li>
            <b>1</b>
            <span>
              <strong>Paste your syllabus</strong> — StudyLoop breaks it into a day-by-day
              study plan.
            </span>
          </li>
          <li>
            <b>2</b>
            <span>
              <strong>Review your plan</strong> — see daily topics, hours, and your full
              schedule.
            </span>
          </li>
          <li>
            <b>3</b>
            <span>
              <strong>Track progress</strong> — tick topics done, skip days, and watch your
              completion grow.
            </span>
          </li>
          <li>
            <b>4</b>
            <span>
              <strong>Quiz yourself</strong> — test any topic on demand to lock it in.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}

function AddTopicModal({ onClose, onCreatePlan }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState(2);
  const [difficulty, setDifficulty] = useState(3);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter a topic name to continue.');
      return;
    }
    setError('');
    setBlocked(true);
  };

  const startNewPlan = () => {
    onCreatePlan?.();
    onClose();
  };

  return (
    <div className="qz__overlay" onClick={onClose} role="presentation">
      <div
        className="qz__card"
        role="dialog"
        aria-modal="true"
        aria-label="Add topics"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="qz__head">
          <div className="qz__head-txt">
            <div className="qz__kicker">
              <svg
                className="qz__kicker-ic"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add topics
            </div>
            <h2 className="qz__title">Add to your existing plan</h2>
          </div>
          <button type="button" className="qz__x" onClick={onClose} aria-label="Close add topic">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {blocked ? (
          <div className="at__blocked">
            <p>
              <b>&ldquo;{name.trim()}&rdquo;</b> wasn&rsquo;t added — adding topics to an
              existing plan isn&rsquo;t supported yet.
            </p>
            <p>Start a new plan and include this topic there.</p>
            <button type="button" className="at__btn at__btn--primary" onClick={startNewPlan}>
              Start a new plan
            </button>
          </div>
        ) : (
          <form className="at__form" onSubmit={handleSubmit} noValidate>
            <label className="at__field">
              <span className="at__label">Topic name</span>
              <input
                type="text"
                className={`at__input ${error ? 'at__input--error' : ''}`}
                placeholder="e.g. Optics"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
              />
              {error && <p className="at__error">{error}</p>}
            </label>

            <label className="at__field">
              <span className="at__label">
                Subject <small className="at__opt">(optional)</small>
              </span>
              <input
                type="text"
                className="at__input"
                placeholder="e.g. Physics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>

            <div className="at__row">
              <label className="at__field">
                <span className="at__label">Hours</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="at__input at__input--num"
                  value={hours}
                  onChange={(e) =>
                    setHours(Math.max(1, Math.min(12, Number(e.target.value) || 1)))
                  }
                />
              </label>

              <div className="at__field">
                <span className="at__label">Difficulty</span>
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
            </div>

            <div className="at__form-actions">
              <button type="button" className="at__btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="at__btn at__btn--primary">
                Add topic
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function DashboardScreen({ onCreatePlan = () => {} }) {
  const { id: routeId } = useParams();
  const location = useLocation();
  const storedId = localStorage.getItem('studyloop:lastPlanId') || '';
  const id = routeId || storedId;

  const [view, setView] = useState('dashboard');
  const [activeNav, setActiveNav] = useState('dashboard');
  const [quizTask, setQuizTask] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [addTopicOpen, setAddTopicOpen] = useState(false);
  const [days, setDays] = useState([]);
  const plan = (() => {
    if (location.state?.plan) return location.state.plan;
    try {
      return (
        JSON.parse(
          localStorage.getItem(`studyloop:plan:${id}`) || 'null'
        ) || null
      );
    } catch {
      return null;
    }
  })();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const timer = useFocusTimer();

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    const load = async () => {
      setLoading(true);
      setFetchError('');
      try {
        const res = await fetch(`${API_URL}/api/plans/${id}/schedule`);
        if (!res.ok) throw new Error('request failed');
        const data = await res.json();
        if (alive) setDays(Array.isArray(data) ? data : []);
      } catch {
        if (alive)
          setFetchError(
            "Couldn't load your schedule. Check your connection and try again."
          );
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const patchDay = async (dayIndex, status) => {
    try {
      const res = await fetch(`${API_URL}/api/plans/${id}/day/${dayIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('request failed');
      const { schedule } = await res.json();
      setDays(Array.isArray(schedule) ? schedule : []);
      setFetchError('');
    } catch {
      setFetchError("Couldn't save that. Check your connection and try again.");
    }
  };

  const todayIdx = days.length
    ? Math.max(
        0,
        Math.round(
          (startOfDay(new Date()).getTime() -
            startOfDay(new Date(days[0].date)).getTime()) /
            MS_DAY
        )
      )
    : 0;
  const today = days.find((d) => d.dayIndex === todayIdx) || null;
  const comingUp = days.filter((d) => d.dayIndex > todayIdx).slice(0, 3);

  const allTasks = days.flatMap((d) => d.tasks);
  const doneCount = allTasks.filter((t) => t.status === 'done').length;
  const totalCount = allTasks.length;
  const coveredPct = pct(doneCount, totalCount);

  const reshuffled =
    days.some((d) => d.tasks.length === 0) ||
    (plan?.hoursPerDay
      ? days.some((d) => dayHrs(d) > plan.hoursPerDay + 0.01)
      : false);

  const todayHours = today ? dayHrs(today) : 0;
  const todayDoneW = today
    ? today.tasks
        .filter((t) => t.status === 'done')
        .reduce((s, t) => s + (t.estHours || 0), 0)
    : 0;
  const todayPct = pct(todayDoneW, todayHours);
  const todayDoneCount = today
    ? today.tasks.filter((t) => t.status === 'done').length
    : 0;
  const todayTopic = today?.tasks.length
    ? today.tasks.reduce((a, b) => (b.estHours > a.estHours ? b : a))
    : null;
  const todayTopicsLen = today?.tasks.length ?? 0;
  const todayStarted = today?.tasks.some((t) => t.status === 'pending') ?? false;

  const scrollToTasks = () => {
    setTimeout(() => {
      const el = document.querySelector('.dash .c.tasks');
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1400);
    }, 60);
  };

  const go = (item) => {
    if (!item.key) return;
    if (item.key === 'help') {
      setHelpOpen(true);
      return;
    }
    setActiveNav(item.key);
    switch (item.key) {
      case 'tasks':
        setView('dashboard');
        scrollToTasks();
        break;
      default:
        if (item.view) setView(item.view);
    }
  };

  const removePlan = () => {
    localStorage.removeItem('studyloop:lastPlanId');
    localStorage.removeItem(`studyloop:plan:${id}`);
    onCreatePlan();
  };

  const exam =
    plan?.examDate && !Number.isNaN(new Date(plan.examDate).getTime())
      ? new Date(plan.examDate)
      : null;
  const daysLeft = exam
    ? Math.max(
        0,
        Math.ceil(
          (startOfDay(exam).getTime() - startOfDay(new Date()).getTime()) /
            MS_DAY
        )
      )
    : null;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const subjectGroups = useMemo(() => {
    const bySubject = {};
    days.forEach((d) =>
      d.tasks.forEach((t) => {
        const key = t.subject || 'General';
        const g = (bySubject[key] ||= {
          done: 0,
          total: 0,
          doneH: 0,
          planned: 0,
        });
        g.total += 1;
        g.planned += t.estHours || 0;
        if (t.status === 'done') {
          g.done += 1;
          g.doneH += t.estHours || 0;
        }
      })
    );
    return Object.entries(bySubject).map(([subject, g]) => ({
      subject,
      done: g.done,
      total: g.total,
      doneH: g.doneH,
      planned: g.planned,
      pct: g.planned ? Math.round((g.doneH / g.planned) * 100) : 0,
    }));
  }, [days]);

  if (!id) {
    return (
      <div className="dash">
        <EmptyState message="No study plan yet — tell us your syllabus and we'll map it out." />
        <div className="dash__empty">
          <button type="button" className="dash__cta" onClick={onCreatePlan}>
            Create your study plan
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState message="Loading your schedule…" />;

  if (fetchError && days.length === 0) {
    return (
      <div className="dash">
        <ErrorState message={fetchError} />
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="dash">
        <EmptyState message="No schedule found for this plan yet." />
        <div className="dash__empty">
          <button type="button" className="dash__cta" onClick={onCreatePlan}>
            Build a new study plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash">
      <div className="app">
        <aside className="side">
          <div className="logo">
            <Logo />
          </div>

          {NAV_ITEMS.map((item, i) =>
            item.divider ? (
              item.section ? (
                <span className="nav-gap" key={`sdev-${i}`} role="presentation">
                  {item.section}
                </span>
              ) : (
                <span className="sdev" key={`sdev-${i}`} role="separator" />
              )
            ) : (
              <button
                key={item.key}
                className={activeNav === item.key ? 'nv on' : 'nv'}
                type="button"
                onClick={() => go(item)}
              >
                <NavIcon>{item.icon}</NavIcon>
                {item.label}
              </button>
            )
          )}

          <div className="side__stats">
            <div className="side__ring">
              <svg viewBox="0 0 56 56" aria-hidden="true">
                <circle cx="28" cy="28" r="24" fill="none" stroke="var(--track)" strokeWidth="5" />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="var(--blue)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={SIDE_RING_C}
                  strokeDashoffset={SIDE_RING_C * (1 - coveredPct / 100)}
                />
              </svg>
              <b>{coveredPct}%</b>
            </div>
            <div className="side__stats-txt">
              <b>Plan complete</b>
              <span>
                {doneCount} of {totalCount} {totalCount === 1 ? 'topic' : 'topics'}
              </span>
            </div>
          </div>

          <div className="tip">
            <b>Missed a day?</b>
            Skip it. StudyLoop spreads the topics over the days you have left.
          </div>

          <footer className="side__foot">StudyLoop · built for your exam</footer>
        </aside>

        <main className="main">
          {view === 'dashboard' ? (
            <>
              <div className="hd">
                <div>
                  <h1>{greeting}</h1>
                  <p>Here's your study loop for today.</p>
                </div>
                <div className="hd-actions">
                  {daysLeft !== null && (
                    <div className="chip">
                      <i aria-hidden="true" />
                      Exam in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                    </div>
                  )}
                  <button
                    type="button"
                    className="add-topic"
                    onClick={() => setAddTopicOpen(true)}
                  >
                    + Add topics
                  </button>
                </div>
              </div>

              {fetchError && <ErrorState compact message={fetchError} />}

              <div className="bento">
            <section className={`hero ${reshuffled ? '' : 'hero--full'}`}>
              <svg className="deco" viewBox="0 0 380 380" fill="none" stroke="#fff" strokeWidth="22" aria-hidden="true">
                <circle cx="190" cy="190" r="170" />
                <circle cx="190" cy="190" r="110" />
                <circle cx="190" cy="190" r="50" />
              </svg>
              <div className="txt">
                <span className="tag">Today's focus</span>
                <h2>{todayTopic ? todayTopic.topicName : 'All caught up'}</h2>
                <p>
                  {todayTopicsLen > 0
                    ? `${todayTopicsLen} ${todayTopicsLen === 1 ? 'topic' : 'topics'}, ${fmtH(todayHours)} planned today.`
                    : 'Nothing scheduled for today — skip or enjoy the rest.'}
                </p>
                <button className="go" type="button" onClick={timer.toggle}>
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    {timer.running ? (
                      <>
                        <rect x="6" y="4" width="4" height="16" rx="1.5" />
                        <rect x="14" y="4" width="4" height="16" rx="1.5" />
                      </>
                    ) : (
                      <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" />
                    )}
                  </svg>
                  <span>{timer.label}</span>
                  <span className="timer">{timer.time}</span>
                </button>
              </div>
              <div className="ringw">
                <svg viewBox="0 0 150 150">
                  <circle cx="75" cy="75" r="62" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="14" />
                  <circle
                    cx="75"
                    cy="75"
                    r="62"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={RING_C}
                    strokeDashoffset={RING_C * (1 - todayPct / 100)}
                  />
                </svg>
                <div className="n">
                  <b>{todayPct}%</b>
                  <span>done today</span>
                </div>
              </div>
            </section>

            {reshuffled && (
              <section className="c alert">
                <div className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 12a8 8 0 1 1-2.3-5.7" />
                    <path d="M20 4v5h-5" />
                  </svg>
                </div>
                <div>
                  <h3>Plan reshuffled</h3>
                  <p>A skipped day was detected and its topics were moved to later days.</p>
                </div>
              </section>
            )}

            <section className="c st">
              <div className="top">
                Topics covered
                <span className="ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
              </div>
              <div className="v">
                {doneCount} <small>of {totalCount}</small>
              </div>
              <div className="trend">{coveredPct}% of your plan</div>
            </section>

            <section className="c st">
              <div className="top">
                Days left
                <span className="ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="3" />
                    <path d="M8 3v4M16 3v4M3 10h18" />
                  </svg>
                </span>
              </div>
              <div className="v">
                {daysLeft === null ? '–' : daysLeft}{' '}
                <small>{daysLeft === null ? 'unavailable' : daysLeft === 1 ? 'day' : 'days'}</small>
              </div>
              <div className="trend" style={{ color: 'var(--mute)' }}>
                {exam ? `${fmtMon(exam)} · exam` : 'Exam date not set'}
              </div>
            </section>

            <section className="c tasks">
              <h3>
                Today's tasks{' '}
                <small>
                  {todayDoneCount} of {todayTopicsLen} done
                </small>
              </h3>
              {today && today.tasks.length > 0 ? (
                <>
                  {today.tasks.map((t, i) => (
                    <div className="tkrow" key={t._id || i}>
                      <button
                        className="tk"
                        type="button"
                        role="checkbox"
                        aria-checked={t.status === 'done'}
                        onClick={() => {
                          if (t.status !== 'done') patchDay(today.dayIndex, 'done');
                        }}
                      >
                        <span className="bx">
                          <svg viewBox="0 0 12 12" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M2 6.5l2.6 2.5L10 3.5" />
                          </svg>
                        </span>
                        <span className="tt">
                          {t.topicName}
                          <small>
                            {t.status === 'done' ? 'completed' : `focus ${fmtH(t.estHours)}`}
                          </small>
                        </span>
                        <span className="hp">{fmtH(t.estHours)}</span>
                      </button>
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
                    </div>
                  ))}
                  {todayStarted && (
                    <button
                      className="skip"
                      type="button"
                      onClick={() => patchDay(today.dayIndex, 'skipped')}
                    >
                      Skip today &amp; reshuffle
                    </button>
                  )}
                </>
              ) : (
                <EmptyState message="No tasks scheduled for today. Skip a previous day to reshuffle tasks here." />
              )}
            </section>

            <section className="c up">
              <h3>
                Coming up <small>Next days</small>
              </h3>
              {comingUp.length > 0 ? (
                comingUp.map((d) => {
                  const dt = new Date(d.date);
                  const first = d.tasks[0];
                  const extra = d.tasks.length - 1;
                  return (
                    <div className="uc" key={d._id || d.dayIndex}>
                      <div className="dt">
                        <b>{dt.getDate()}</b>
                        <span>{WEEKDAYS[dt.getDay()]}</span>
                      </div>
                      <div className="m">
                        <b>{first ? first.topicName : 'No topics'}</b>
                        <span>
                          {d.tasks.length} {d.tasks.length === 1 ? 'topic' : 'topics'} ·{' '}
                          {fmtH(dayHrs(d))}
                          {extra > 0 ? ` · +${extra} more` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState message="Nothing left on the schedule — you're basically ready for your exam." />
              )}
            </section>
              </div>
            </>
          ) : view === 'schedule' ? (
            <ScheduleScreen
              days={days}
              loading={loading}
              fetchError={fetchError}
              hasPlan={Boolean(id)}
              onStartPlan={onCreatePlan}
            />
          ) : view === 'progress' ? (
            <ProgressScreen
              days={days}
              loading={loading}
              fetchError={fetchError}
              subjectGroups={subjectGroups}
              hasPlan={Boolean(id)}
              onStartPlan={onCreatePlan}
            />
          ) : view === 'practice' ? (
            <PracticeScreen days={days} />
          ) : view === 'ai' ? (
            <div className="bento">
              <section className="c ai">
                <EmptyState message="AI Study Assistant — coming soon." />
              </section>
            </div>
          ) : view === 'plan' ? (
            <MyPlanScreen
              plan={plan}
              days={days}
              hasPlan={Boolean(id)}
              onStartPlan={onCreatePlan}
              onRemovePlan={removePlan}
            />
          ) : (
            <SettingsScreen
              plan={plan}
              days={days}
              hasPlan={Boolean(id)}
              onStartPlan={onCreatePlan}
            />
          )}
        </main>
      </div>

      <nav className="bnav" aria-label="Sections">
        {NAV_ITEMS.filter((i) =>
          ['dashboard', 'plan', 'schedule', 'progress'].includes(i.key)
        ).map((item) => (
          <button
            key={item.key}
            className={activeNav === item.key ? 'on' : ''}
            type="button"
            aria-label={item.label}
            onClick={() => {
              setActiveNav(item.key);
              setView(item.view);
            }}
          >
            <NavIcon>{item.icon}</NavIcon>
          </button>
        ))}
      </nav>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      {addTopicOpen && (
        <AddTopicModal onClose={() => setAddTopicOpen(false)} onCreatePlan={onCreatePlan} />
      )}

      {quizTask && (
        <QuizModal
          topicName={quizTask.topicName}
          subject={quizTask.subject}
          difficulty={quizTask.difficulty}
          onClose={() => setQuizTask(null)}
        />
      )}
    </div>
  );
}