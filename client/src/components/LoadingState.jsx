import './state.css';

export default function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="state state--loading" role="status">
      <span className="state__dot" aria-hidden="true" />
      <p className="state__message">{message}</p>
    </div>
  );
}