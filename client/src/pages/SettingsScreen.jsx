import { useState } from 'react';
import EmptyState from '../components/EmptyState';
import './SettingsScreen.css';

const fmtDate = (d) =>
  d
    ? d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not set';

export default function SettingsScreen({ plan, days, hasPlan, onStartPlan }) {
  const [syllabusOpen, setSyllabusOpen] = useState(false);

  if (!hasPlan || !plan) {
    return (
      <div className="stg">
        <EmptyState message="No plan to manage yet — create one to tweak your settings." />
        <div className="stg__cta">
          <button type="button" className="dash__cta" onClick={onStartPlan}>
            Create your study plan
          </button>
        </div>
      </div>
    );
  }

  const allTasks = days.flatMap((d) => d.tasks);
  const derivedSubjects = new Set(allTasks.map((t) => t.subject || 'General'));
  const derivedTopics = new Set(allTasks.map((t) => t.topicName));

  const subjectCount = plan.subjectCount ?? derivedSubjects.size;
  const topicCount = plan.topicCount ?? derivedTopics.size;
  const syllabusText = plan.syllabusRaw || '';
  const exam = new Date(plan.examDate);

  return (
    <section className="stg" aria-label="Settings">
      <div className="hd">
        <div>
          <h1>Settings</h1>
          <p>Your study plan and preferences at a glance.</p>
        </div>
      </div>

      <section className="c stg__card">
        <h3>Plan summary</h3>
        <dl className="stg__rows">
          <div className="stg__row">
            <dt>Exam date</dt>
            <dd>{fmtDate(Number.isNaN(exam.getTime()) ? null : exam)}</dd>
          </div>
          <div className="stg__row">
            <dt>Hours per day</dt>
            <dd>{plan.hoursPerDay ?? '—'}h</dd>
          </div>
          <div className="stg__row">
            <dt>Days per week</dt>
            <dd>{plan.daysPerWeek ?? '—'}</dd>
          </div>
          <div className="stg__row">
            <dt>Total subjects</dt>
            <dd>{subjectCount || '—'}</dd>
          </div>
          <div className="stg__row">
            <dt>Total topics</dt>
            <dd>{topicCount || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="c stg__card">
        <h3>Study Preferences</h3>
        <dl className="stg__rows">
          <div className="stg__row">
            <dt>Daily study goal</dt>
            <dd>{plan.hoursPerDay ?? '—'}h / day</dd>
          </div>
          <div className="stg__row stg__row--stack">
            <dt>Auto-reschedule missed days</dt>
            <dd>
              <span className="stg__badge">Always on</span>
              <small className="stg__pref-note">
                StudyLoop automatically redistributes topics when you skip a
                day.
              </small>
            </dd>
          </div>
          <div className="stg__row">
            <dt>Theme</dt>
            <dd>
              <span className="stg__pill">Light</span>
            </dd>
          </div>
        </dl>
      </section>

      {syllabusText && (
        <section className="c stg__card">
          <h3>Original syllabus</h3>
          <button
            type="button"
            className="stg__toggle"
            aria-expanded={syllabusOpen}
            onClick={() => setSyllabusOpen((v) => !v)}
          >
            {syllabusOpen ? 'Hide syllabus' : 'Show syllabus'}
          </button>
          {syllabusOpen && <pre className="stg__syllabus">{syllabusText}</pre>}
        </section>
      )}

      <section className="c stg__card stg__card--danger">
        <h3>Start over</h3>
        <p className="stg__danger-text">
          Clear this plan and build a fresh one from a new syllabus.
        </p>
        <button type="button" className="stg__danger-btn" onClick={onStartPlan}>
          Start new plan
        </button>
      </section>
    </section>
  );
}