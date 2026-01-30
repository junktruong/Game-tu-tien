'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { GameData, RoomProfile } from '../../types/game';
import AccountPanel from './AccountPanel';
import CharacterPanel from './CharacterPanel';
import SkinPanel from './SkinPanel';
import ArenaPanel from './ArenaPanel';
import RoomPanel from './RoomPanel';
import GoogleLoginGate from './GoogleLoginGate';
import Button from '../ui/Button';
import Tag from '../ui/Tag';

export default function LobbyClient({ data }: { data: GameData }) {
  const { data: session, status } = useSession();
  const [account, setAccount] = useState(data.account);
  const [activeCharacterId, setActiveCharacterId] = useState(
    data.characters[0]?.id,
  );
  const [activeSkinId, setActiveSkinId] = useState(data.skins[0]?.id);
  const [activeArenaId, setActiveArenaId] = useState(data.arenas[0]?.id);
  const [rooms, setRooms] = useState(data.rooms);

  useEffect(() => {
    if (session?.user?.name) {
      setAccount((prev) => ({ ...prev, displayName: session.user.name ?? prev.displayName }));
    }
  }, [session]);

  const handleCreateRoom = async (room: RoomProfile) => {
    setRooms((prev) => [room, ...prev]);
    await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room),
    });
  };

  if (status === 'loading') {
    return (
      <main>
        <div className="wrap">
          <div className="card">Đang kiểm tra phiên đăng nhập...</div>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return <GoogleLoginGate />;
  }

  return (
    <main>
      <header className="header">
        <div className="brand">
          <h1>⚔️ Tu Tiên Fight - Next Arena</h1>
          <p>Lobby nâng cấp: tài khoản, nhân vật, skin và phòng công khai.</p>
        </div>
        <div className="inline">
          <Button variant="ghost">Thông báo chiến trường</Button>
          <Tag tone="cyan">v2 UI</Tag>
        </div>
      </header>

      <div className="wrap">
        <AccountPanel
          account={account}
          onChange={setAccount}
          googleProfile={{
            name: session.user.name ?? account.displayName,
            email: session.user.email ?? '',
            avatar: session.user.image ?? '',
          }}
        />
        <CharacterPanel
          characters={data.characters}
          activeId={activeCharacterId}
          onSelect={setActiveCharacterId}
        />
        <SkinPanel
          skins={data.skins}
          activeId={activeSkinId}
          onSelect={setActiveSkinId}
        />
        <ArenaPanel
          arenas={data.arenas}
          activeId={activeArenaId}
          onSelect={setActiveArenaId}
        />
        <RoomPanel rooms={rooms} arenas={data.arenas} onCreateRoom={handleCreateRoom} />
      </div>
    </main>
  );
}
