export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  onClick,
  disabled,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}
