import Logo from './Logo';
import './AppShell.css';

export default function AppShell({ label, children }) {
  return (
    <div className="app-shell">
      <header className="app-shell__bar">
        <Logo />
        {label && <span className="app-shell__phase">{label}</span>}
      </header>
      <div className="app-shell__content">{children}</div>
    </div>
  );
}