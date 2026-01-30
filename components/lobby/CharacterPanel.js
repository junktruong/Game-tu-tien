import Card from '../ui/Card';
import SectionHeader from '../ui/SectionHeader';
import Button from '../ui/Button';
import Tag from '../ui/Tag';

export default function CharacterPanel({ characters, activeId, onSelect }) {
  const active = characters.find((item) => item.id === activeId) || characters[0];

  return (
    <Card>
      <SectionHeader
        title="Nhân vật"
        subtitle="Mỗi nhân vật có bộ chiêu riêng. Hiện dùng nhân vật mặc định để đồng bộ combat."
      />
      <div className="grid">
        <div className="stack">
          {characters.map((character) => (
            <button
              key={character.id}
              type="button"
              className={`list-item ${character.id === active?.id ? 'active' : ''}`}
              onClick={() => onSelect(character.id)}
            >
              <div>
                <strong>{character.name}</strong>
                <p>{character.role}</p>
              </div>
              <Tag tone="cyan">Lv.{character.level}</Tag>
            </button>
          ))}
          <Button variant="ghost">Thêm nhân vật mới</Button>
        </div>
        {active && (
          <div className="stack">
            <div className="details">
              <h3>{active.name}</h3>
              <p>{active.description}</p>
              <div className="chips">
                {active.skills.map((skill) => (
                  <Tag key={skill} tone="emerald">
                    {skill}
                  </Tag>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
