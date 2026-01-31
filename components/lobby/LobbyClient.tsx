'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { GameData, RoomProfile } from '../../types/game';
import AccountPanel from './AccountPanel';
import CharacterPanel from './CharacterPanel';
import SkinPanel from './SkinPanel';
import ArenaPanel from './ArenaPanel';
import RoomPanel from './RoomPanel';
import GoogleLoginGate from './GoogleLoginGate';
import Button from '../ui/Button';
import Tag from '../ui/Tag';
import SetupWizard from './SetupWizard';

export default function LobbyClient({ data }: { data: GameData }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [account, setAccount] = useState(data.account);
  const [activeCharacterId, setActiveCharacterId] = useState(
    data.characters[0]?.id,
  );
  const [activeSkinId, setActiveSkinId] = useState(data.skins[0]?.id);
  const [activeArenaId, setActiveArenaId] = useState(data.arenas[0]?.id);
  const [rooms, setRooms] = useState(data.rooms);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStatus, setSetupStatus] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setAccount((prev) => ({ ...prev, displayName: session.user.name ?? prev.displayName }));
    }
  }, [session]);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        const payload = (await response.json()) as {
          profile: {
            displayName: string;
            tagline: string;
            characterId: string;
            skinId: string;
            arenaId: string;
          } | null;
        };

        if (payload.profile) {
          setAccount({
            displayName: payload.profile.displayName,
            tagline: payload.profile.tagline,
          });
          setActiveCharacterId(payload.profile.characterId);
          setActiveSkinId(payload.profile.skinId);
          setActiveArenaId(payload.profile.arenaId);
          setSetupOpen(false);
        } else {
          setSetupOpen(true);
        }
      } catch (error) {
        setSetupOpen(true);
      }
    };

    fetchProfile();
  }, [session]);

  const handleSetupComplete = async (payload: {
    displayName: string;
    tagline: string;
    characterId: string;
    skinId: string;
    arenaId: string;
  }) => {
    setSetupStatus('Đang lưu hồ sơ khởi tạo...');
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: payload.displayName,
          tagline: payload.tagline,
        }),
      });
      setSetupStatus('✅ Đã lưu hồ sơ. Đang chuyển trang chủ...');
      setAccount({
        displayName: payload.displayName,
        tagline: payload.tagline,
      });
      setActiveCharacterId(payload.characterId);
      setActiveSkinId(payload.skinId);
      setActiveArenaId(payload.arenaId);
      setSetupOpen(false);
      router.push('/home');
    } catch (error) {
      setSetupStatus('❌ Không lưu được hồ sơ, hãy thử lại.');
    }
  };

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
      {setupOpen && (
        <SetupWizard
          account={account}
          characters={data.characters}
          skins={data.skins}
          arenas={data.arenas}
          initialCharacterId={activeCharacterId}
          initialSkinId={activeSkinId}
          initialArenaId={activeArenaId}
          onComplete={handleSetupComplete}
        />
      )}
      {setupStatus && <div className="toast-status">{setupStatus}</div>}
    </main>
  );
}
