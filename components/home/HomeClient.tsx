'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { GameData, PlayerProfile } from '../../types/game';
import GoogleLoginGate from '../lobby/GoogleLoginGate';
import Button from '../ui/Button';
import Tag from '../ui/Tag';

declare global {
  interface Window {
    updateProfileSkin?: (textureUrl: string) => void;
    __pendingProfileTextureUrl?: string;
  }
}

type HomeClientProps = {
  data: GameData;
};

export default function HomeClient({ data }: HomeClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [skinStatus, setSkinStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    const loadProfile = async () => {
      setLoadingProfile(true);
      const response = await fetch('/api/profile');
      const payload = (await response.json()) as { profile: PlayerProfile | null };
      setProfile(payload.profile);
      setLoadingProfile(false);
    };

    loadProfile();
  }, [session]);

  const activeCharacter = useMemo(
    () => data.characters.find((item) => item.id === profile?.characterId),
    [data.characters, profile?.characterId],
  );
  const activeSkin = useMemo(
    () => data.skins.find((item) => item.id === profile?.skinId),
    [data.skins, profile?.skinId],
  );
  const activeArena = useMemo(
    () => data.arenas.find((item) => item.id === profile?.arenaId),
    [data.arenas, profile?.arenaId],
  );

  useEffect(() => {
    if (!activeSkin) {
      return;
    }
    const textureUrl = activeSkin.textureUrl || '/img/stick_fighter_sheet.png';
    if (window.updateProfileSkin) {
      window.updateProfileSkin(textureUrl);
    } else {
      window.__pendingProfileTextureUrl = textureUrl;
    }
  }, [activeSkin]);

  const handleSkinChange = async (skinId: string) => {
    const nextSkin = data.skins.find((item) => item.id === skinId);
    if (!nextSkin || !profile) {
      return;
    }

    setProfile({ ...profile, skinId });
    setSkinStatus('Đang đổi skin...');
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skinId }),
    });
    const textureUrl = nextSkin.textureUrl || '/img/stick_fighter_sheet.png';
    if (window.updateProfileSkin) {
      window.updateProfileSkin(textureUrl);
    } else {
      window.__pendingProfileTextureUrl = textureUrl;
    }
    setSkinStatus(`✅ Đã đổi skin sang ${nextSkin.name}.`);
  };

  if (status === 'loading') {
    return (
      <div className="home-card">
        <p>Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  }

  if (!session?.user) {
    return <GoogleLoginGate />;
  }

  if (loadingProfile) {
    return (
      <div className="home-card">
        <p>Đang tải hồ sơ chiến đấu...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="home-card">
        <h2>Chưa có hồ sơ khởi tạo</h2>
        <p>Hãy hoàn tất popup khởi tạo để lưu tài khoản và skin trước.</p>
        <Button onClick={() => router.push('/')}>Quay lại trang khởi tạo</Button>
      </div>
    );
  }

  const textureUrl =
    activeSkin?.textureUrl ?? data.skins[0]?.textureUrl ?? '/img/stick_fighter_sheet.png';

  return (
    <div className="home-layout">
      <section className="home-hero">
        <div className="profile-canvas" data-texture-url={textureUrl}>
          <canvas id="profile-canvas" />
        </div>
        <div className="profile-details">
          <div>
            <h1>{profile.displayName || session.user.name}</h1>
            <p className="muted">{profile.tagline || 'Chưa có mô tả'}</p>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <span>Nhân vật</span>
              <strong>{activeCharacter?.name ?? '—'}</strong>
            </div>
            <div className="stat-card">
              <span>Vai trò</span>
              <strong>{activeCharacter?.role ?? '—'}</strong>
            </div>
            <div className="stat-card">
              <span>Cấp</span>
              <strong>{activeCharacter ? `Lv.${activeCharacter.level}` : '—'}</strong>
            </div>
            <div className="stat-card">
              <span>Đấu trường</span>
              <strong>{activeArena?.name ?? '—'}</strong>
            </div>
          </div>
          <div className="skill-tags">
            {activeCharacter?.skills.map((skill) => (
              <Tag key={skill} tone="emerald">
                {skill}
              </Tag>
            ))}
          </div>
        </div>
      </section>

      <section className="skin-section">
        <div className="section-title">
          <div>
            <h2>Đổi skin</h2>
            <p>Skin tuân theo quy tắc: mỗi skin sẽ nối tới một sprite sheet riêng.</p>
          </div>
          {skinStatus && <span className="hint-text">{skinStatus}</span>}
        </div>
        <div className="skin-grid">
          {data.skins.map((skin) => (
            <button
              key={skin.id}
              type="button"
              className={`skin-card ${skin.id === profile.skinId ? 'active' : ''}`}
              onClick={() => handleSkinChange(skin.id)}
            >
              <div className="inline">
                <span className="swatch" style={{ background: skin.tone }} />
                <div>
                  <strong>{skin.name}</strong>
                  <p className="muted">{skin.effect}</p>
                </div>
              </div>
              <span className="muted">
                {(skin.textureUrl || '/img/stick_fighter_sheet.png').replace('/img/', '')}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
