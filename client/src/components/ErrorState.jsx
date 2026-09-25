import './state.css';

export default function ErrorState({ message, compact }) {
  return (
    <div className={`state state--error ${compact ? 'state--compact' : ''}`} role="alert">
      <p className="state__message">{message}</p>
    </div>
  );
}