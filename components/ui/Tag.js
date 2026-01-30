export default function Tag({ children, tone = 'cyan' }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
