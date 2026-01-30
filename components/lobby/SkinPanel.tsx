import type { SkinProfile } from '../../types/game';
import Card from '../ui/Card';
import SectionHeader from '../ui/SectionHeader';
import Button from '../ui/Button';
import Tag from '../ui/Tag';

type SkinPanelProps = {
  skins: SkinProfile[];
  activeId?: string;
  onSelect: (id: string) => void;
};

export default function SkinPanel({ skins, activeId, onSelect }: SkinPanelProps) {
  return (
    <Card>
      <SectionHeader
        title="Skin & Hiệu ứng"
        subtitle="Chọn màu kiếm, trail và hiệu ứng vfx cho nhân vật."
      />
      <div className="grid">
        <div className="stack">
          {skins.map((skin) => (
            <button
              key={skin.id}
              type="button"
              className={`list-item ${skin.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(skin.id)}
            >
              <div className="inline">
                <span className="swatch" style={{ background: skin.tone }} />
                <div>
                  <strong>{skin.name}</strong>
                  <p>{skin.effect}</p>
                </div>
              </div>
              <Tag tone="violet">Custom</Tag>
            </button>
          ))}
        </div>
        <div className="stack">
          <div className="details">
            <h3>Gợi ý nâng cấp</h3>
            <ul>
              <li>Thêm shader kiếm + tia năng lượng theo skin.</li>
              <li>Đồng bộ âm thanh, rung tay theo skin.</li>
              <li>Cho phép lưu preset theo nhân vật.</li>
            </ul>
          </div>
          <Button variant="ghost">Tạo skin mới</Button>
        </div>
      </div>
    </Card>
  );
}
