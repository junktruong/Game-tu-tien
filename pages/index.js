import { useState } from 'react';
import AccountPanel from '../components/lobby/AccountPanel';
import CharacterPanel from '../components/lobby/CharacterPanel';
import SkinPanel from '../components/lobby/SkinPanel';
import ArenaPanel from '../components/lobby/ArenaPanel';
import RoomPanel from '../components/lobby/RoomPanel';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import {
  defaultAccount,
  characters as initialCharacters,
  skins as initialSkins,
  arenas as initialArenas,
  roomsSeed,
} from '../data/gameData';

export default function HomePage() {
  const [account, setAccount] = useState(defaultAccount);
  const [activeCharacterId, setActiveCharacterId] = useState(
    initialCharacters[0]?.id,
  );
  const [activeSkinId, setActiveSkinId] = useState(initialSkins[0]?.id);
  const [activeArenaId, setActiveArenaId] = useState(initialArenas[0]?.id);
  const [rooms, setRooms] = useState(roomsSeed);

  const handleCreateRoom = (room) => {
    setRooms((prev) => [room, ...prev]);
  };

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
        <AccountPanel account={account} onChange={setAccount} />
        <CharacterPanel
          characters={initialCharacters}
          activeId={activeCharacterId}
          onSelect={setActiveCharacterId}
        />
        <SkinPanel
          skins={initialSkins}
          activeId={activeSkinId}
          onSelect={setActiveSkinId}
        />
        <ArenaPanel
          arenas={initialArenas}
          activeId={activeArenaId}
          onSelect={setActiveArenaId}
        />
        <RoomPanel
          rooms={rooms}
          arenas={initialArenas}
          onCreateRoom={handleCreateRoom}
        />
      </div>
    </main>
  );
}
