import './state.css';

export default function ErrorState({ message }) {
  return (
    <div className="state state--error" role="alert">
      <p className="state__message">{message}</p>
    </div>
  );
}