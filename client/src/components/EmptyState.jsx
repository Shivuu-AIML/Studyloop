import './state.css';

export default function EmptyState({ message }) {
  return (
    <div className="state state--empty">
      <span className="state__dot" aria-hidden="true" />
      <p className="state__message">{message}</p>
    </div>
  );
}