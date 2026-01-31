'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { GameData, RoomProfile } from '../../types/game';
import GoogleLoginGate from './GoogleLoginGate';
import HomeClient from '../home/HomeClient';
import Script from 'next/script';
import '@/app/home/home.css';
import '@/components/display/battlefield/main';

export default function LobbyClient({ data }: { data: GameData }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [account, setAccount] = useState(data.account);
  const [activeCharacterId, setActiveCharacterId] = useState(
    data.characters[0]?.id,
  );
  const [activeSkinId, setActiveSkinId] = useState(data.skins[0]?.id);
  const [activeArenaId, setActiveArenaId] = useState(data.arenas[0]?.id);
  const [setupOpen, setSetupOpen] = useState(false);


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
    <main className="home-main">
      <HomeClient data={data} />
    
    </main>
  );
}
