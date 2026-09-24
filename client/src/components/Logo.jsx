export default function Logo({ height = 30 }) {
  return (
    <span className="brand">
      <img src="/logo.png" alt="StudyLoop" style={{ height }} />
    </span>
  );
}