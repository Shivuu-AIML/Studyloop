import './StepIndicator.css';

const STEPS = ['Input', 'Review', 'Schedule'];

export default function StepIndicator({ currentStep }) {
  return (
    <nav className="step-indicator" aria-label="Progress">
      <ol className="step-indicator__list">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n === currentStep ? 'current' : n < currentStep ? 'done' : 'upcoming';
          return (
            <li
              key={label}
              className={`step-indicator__item step-indicator__item--${state}`}
              aria-current={n === currentStep ? 'step' : undefined}
            >
              {i > 0 && <span className="step-indicator__line" aria-hidden="true" />}
              <span className="step-indicator__dot" aria-hidden="true" />
              <span className="step-indicator__label">{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}