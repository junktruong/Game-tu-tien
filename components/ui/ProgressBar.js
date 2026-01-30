export default function ProgressBar({ value, max }) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="progress">
      <div className="progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
