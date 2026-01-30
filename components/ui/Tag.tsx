type TagProps = {
  children: string;
  tone?: 'cyan' | 'violet' | 'emerald' | 'amber';
};

export default function Tag({ children, tone = 'cyan' }: TagProps) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
