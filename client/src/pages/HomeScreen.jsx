import { useMemo, useState } from 'react';
import Logo from '../components/Logo';
import InputScreen from './InputScreen';
import DashboardScreen from './DashboardScreen';
import './HomeScreen.css';

// Live preview: split a pasted syllabus into individual topic rows.
// Handles both newline-separated units and a single-paragraph syllabus
// where topics are separated by ". " followed by a capital letter.
const parseLiveTopics = (text, hasNewline) => {
  if (!text) return [];

  if (hasNewline || /\n/.test(text)) {
    return text
      .split('\n')
      .map((line) =>
        line
          .replace(/^\s*unit\s*\d+\s*[:.-]?\s*/i, '')
          .split(/[—–-]/)[0]
          .trim()
      )
      .filter((t) => t.length >= 3);
  }

  return text
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((seg) =>
      seg
        .replace(/^\s*unit\s*\d+\s*[:.-]?\s*/i, '')
        .split(/[—–-]/)[0]
        .trim()
    )
    .filter((t) => t.length >= 3);
};

const NavIcon = ({ children }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

// Sidebar sections shown while no plan exists yet. All of them lead back to
// the same "no plan yet" prompt in the main area — nothing to show until a
// plan is built.
const NO_PLAN_SECTIONS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
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
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
  { key: 'ai', label: 'AI Assistant', divider: true, icon: <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" /> },
  { key: 'settings', label: 'Settings', icon: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /> },
];

export default function HomeScreen() {
  const [phase, setPhase] = useState(() =>
    localStorage.getItem('studyloop:lastPlanId') ? 'active' : 'setup'
  );
  const [setupOpen, setSetupOpen] = useState(false);
  const [noPlanView, setNoPlanView] = useState('dashboard');
  const [syllabusText, setSyllabusText] = useState('');
  const [hasNewline, setHasNewline] = useState(true);
  const [examDate, setExamDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(2);

  const handleSyllabusChange = (text) => {
    setSyllabusText(text);
    setHasNewline(/\n/.test(text));
  };

  const topics = useMemo(
    () => parseLiveTopics(syllabusText, hasNewline || /\n/.test(syllabusText)),
    [syllabusText, hasNewline]
  );

  const handlePlanReady = () => setPhase('active');

  const startPlan = () => {
    setPhase('setup');
    setSetupOpen(false);
  };

  if (phase === 'active') {
    return <DashboardScreen onCreatePlan={startPlan} />;
  }

  if (!setupOpen) {
    const activeSection =
      NO_PLAN_SECTIONS.find((s) => s.key === noPlanView) || NO_PLAN_SECTIONS[0];

    return (
      <div className="dash home home--empty">
        <div className="app">
          <aside className="side">
            <div className="logo">
              <Logo />
            </div>
            {NO_PLAN_SECTIONS.map((item) =>
              item.divider ? (
                <span className="sdev" key="sdev-no-plan" role="separator" />
              ) : (
                <button
                  key={item.key}
                  type="button"
                  className={noPlanView === item.key ? 'nv on' : 'nv'}
                  onClick={() => setNoPlanView(item.key)}
                >
                  <NavIcon>{item.icon}</NavIcon>
                  {item.label}
                </button>
              )
            )}
            <footer className="side__foot">
              StudyLoop · built for your exam
            </footer>
          </aside>

          <main className="main">
            <div className="hd">
              <div>
                <p>No plan yet</p>
                <h1>{activeSection.label}</h1>
              </div>
            </div>

            <section className="c home__empty-card">
              <div className="logo">
                <Logo height={40} />
              </div>
              <h1>Ready to build your study plan?</h1>
              <p className="home__empty-text">
                Add topics for your next exam and StudyLoop will map them into
                a day-by-day schedule.
              </p>
              <button
                type="button"
                className="dash__cta"
                onClick={() => setSetupOpen(true)}
              >
                Add topics for your exam
              </button>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dash home">
      <div className="app">
        <aside className="side">
          <div className="logo">
            <Logo height={34} />
          </div>
          <div className="home-how">
            <b>How it works</b>
            <ol>
              <li>Paste your syllabus</li>
              <li>AI extracts the topics</li>
              <li>Get your day-by-day schedule</li>
            </ol>
          </div>
          <footer className="side__foot">
            StudyLoop · built for your exam
          </footer>
        </aside>

        <main className="main">
          <div className="hd">
            <div>
              <p>Setup</p>
              <h1>Build your study plan</h1>
            </div>
          </div>

          <div className="bento">
            <section
              className={`c hero ${topics.length > 0 ? '' : 'hero--compact'}`}
              aria-labelledby="home-hero-title"
            >
              <svg
                className="deco"
                viewBox="0 0 380 380"
                fill="none"
                stroke="#fff"
                strokeWidth="22"
                aria-hidden="true"
              >
                <circle cx="190" cy="190" r="170" />
                <circle cx="190" cy="190" r="110" />
                <circle cx="190" cy="190" r="50" />
              </svg>
              <div className="txt">
                <span className="tag">Live preview</span>
                <h2 id="home-hero-title">Topic detection</h2>
                <p>
                  {topics.length
                    ? `${topics.length} topic${topics.length === 1 ? '' : 's'} detected`
                    : 'Paste your syllabus to see the topics we\u2019ll map out for you.'}
                </p>
              </div>
              {topics.length > 0 && (
                <div className="hero__topics">
                  {topics.map((t, i) => (
                    <span className="hero__topic" key={`${t}-${i}`}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <InputScreen
              onSyllabusChange={handleSyllabusChange}
              onPlanReady={handlePlanReady}
              syllabusText={syllabusText}
              examDate={examDate}
              setExamDate={setExamDate}
              hoursPerDay={hoursPerDay}
              setHoursPerDay={setHoursPerDay}
            />
          </div>
        </main>
      </div>
    </div>
  );
}