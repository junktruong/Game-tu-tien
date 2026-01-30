import Card from '../ui/Card';
import SectionHeader from '../ui/SectionHeader';
import Tag from '../ui/Tag';

export default function ArenaPanel({ arenas, activeId, onSelect }) {
  return (
    <Card>
      <SectionHeader
        title="Khung cảnh đấu trường"
        subtitle="Đổi background theo phòng để tăng cảm giác chiến đấu."
      />
      <div className="stack">
        {arenas.map((arena) => (
          <button
            key={arena.id}
            type="button"
            className={`list-item ${arena.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(arena.id)}
          >
            <div>
              <strong>{arena.name}</strong>
              <p>{arena.description}</p>
            </div>
            <Tag tone="amber">Scene</Tag>
          </button>
        ))}
      </div>
    </Card>
  );
}
