import { useMemo, useState } from 'react';
import Card from '../ui/Card';
import SectionHeader from '../ui/SectionHeader';
import Field from '../ui/Field';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import Tag from '../ui/Tag';

export default function RoomPanel({ rooms, arenas, onCreateRoom }) {
  const [roomId, setRoomId] = useState('');
  const [roomTitle, setRoomTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [arenaId, setArenaId] = useState(arenas[0]?.id || '');

  const arenaMap = useMemo(() => {
    return Object.fromEntries(arenas.map((arena) => [arena.id, arena]));
  }, [arenas]);

  const handleCreate = () => {
    const id = (roomId || roomTitle).trim().toLowerCase().replace(/\s+/g, '-');
    if (!id) return;
    onCreateRoom({
      id,
      title: roomTitle || `Phòng ${id}`,
      arenaId,
      mode: '1v1',
      occupancy: 1,
      capacity: 2,
      isPublic,
    });
    setRoomId('');
    setRoomTitle('');
  };

  return (
    <Card>
      <SectionHeader
        title="Phòng đấu công khai"
        subtitle="Tạo phòng hoặc tham gia nhanh. Dữ liệu phòng sẽ đồng bộ với server socket."
      />
      <div className="grid">
        <div className="stack">
          {rooms.map((room) => {
            const arena = arenaMap[room.arenaId];
            return (
              <div key={room.id} className="room-item">
                <div>
                  <div className="inline">
                    <strong>{room.title}</strong>
                    {room.isPublic ? (
                      <Tag tone="cyan">Public</Tag>
                    ) : (
                      <Tag tone="violet">Private</Tag>
                    )}
                  </div>
                  <p>
                    {room.mode} · {arena?.name || '—'}
                  </p>
                  <ProgressBar value={room.occupancy} max={room.capacity} />
                </div>
                <div className="room-actions">
                  <a href={`/display?room=${room.id}`} className="link">Display</a>
                  <a href={`/control?room=${room.id}&player=1`} className="link">P1</a>
                  <a href={`/control?room=${room.id}&player=2`} className="link">P2</a>
                </div>
              </div>
            );
          })}
        </div>
        <div className="stack">
          <div className="details">
            <h3>Mở phòng mới</h3>
            <div className="stack">
              <Field label="Room ID">
                <input
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                  placeholder="vd: sky-01"
                />
              </Field>
              <Field label="Tên phòng">
                <input
                  value={roomTitle}
                  onChange={(event) => setRoomTitle(event.target.value)}
                  placeholder="Tu Tiên Arena"
                />
              </Field>
              <Field label="Khung cảnh">
                <select
                  value={arenaId}
                  onChange={(event) => setArenaId(event.target.value)}
                >
                  {arenas.map((arena) => (
                    <option key={arena.id} value={arena.id}>
                      {arena.name}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(event) => setIsPublic(event.target.checked)}
                />
                <span>Công khai</span>
              </label>
              <Button onClick={handleCreate}>Mở phòng</Button>
            </div>
          </div>
          <div className="details">
            <h3>Join nhanh</h3>
            <p>
              Dùng link trực tiếp để mở display hoặc control, phù hợp chơi LAN hoặc
              chia sẻ qua QR.
            </p>
            <div className="inline">
              <a className="link" href="/display?room=demo">
                Mở Display demo
              </a>
              <a className="link" href="/control?room=demo&player=1">
                Mở P1 demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
