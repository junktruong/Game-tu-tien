'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { GameData, PlayerProfile } from '../../types/game';
import GoogleLoginGate from '../lobby/GoogleLoginGate';
import Button from '../ui/Button';
import Tag from '../ui/Tag';

import { StickFighter } from '@/components/display/battlefield/entities/StickFighter';

declare global {
  interface Window {
    THREE?: any;
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

  // ✅ refs cho canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const didInitRef = useRef(false);

  useEffect(() => {
    if (!session?.user) return;

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

  const textureUrl =
    activeSkin?.textureUrl ?? data.skins[0]?.textureUrl ?? '/img/stick_fighter_sheet.png';

  // =========================
  // ✅ INIT THREE PROFILE CANVAS
  // =========================
  useEffect(() => {
    if (didInitRef.current) {
      return;
    }
    if (!profile) {
      return;
    }
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) {
      return;
    }
    didInitRef.current = true;
    let raf = 0;
    let destroyed = false;

    const init = async () => {
      // 1) Load three và gán window.THREE (vì StickFighter đang dùng window.THREE)
      if (!window.THREE) {
        const THREE = await import('three');
        window.THREE = THREE;
      }
      const THREE = window.THREE;

      // 2) Renderer bám đúng canvas
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

      // 3) Scene + camera
      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.set(0, 10, 40);
      camera.lookAt(0, 10, 0);

      // 4) Light
      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const key = new THREE.DirectionalLight(0xffffff, 0.8);
      key.position.set(10, 30, 20);
      scene.add(key);

      // 5) Fighter
      const fighter = new StickFighter(scene, {
        colorHex: 0x00ffff,
        x: 0,
        facing: 1,
        textureUrl,
      });

      // 6) expose API đổi skin
      window.updateProfileSkin = (nextUrl: string) => {
        try {
          fighter.setTexture(nextUrl || '/img/stick_fighter_sheet.png');
        } catch (e) {
          console.error('updateProfileSkin failed:', e);
        }
      };

      if (window.__pendingProfileTextureUrl) {
        window.updateProfileSkin(window.__pendingProfileTextureUrl);
        window.__pendingProfileTextureUrl = undefined;
      }

      // 7) Resize theo div (FIX: fallback nếu size 0)
      const resize = () => {
        const rect = wrap.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width || 280));
        const h = Math.max(1, Math.floor(rect.height || 280));

        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };

      const ro = new ResizeObserver(() => resize());
      ro.observe(wrap);
      resize();

      // 8) Loop
      const clock = new THREE.Clock();
      const loop = () => {
        if (destroyed) return;

        const dt = clock.getDelta();
        const elapsed = clock.elapsedTime;

        fighter.update(dt, elapsed);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      loop();

      // cleanup
      return () => {
        destroyed = true;
        cancelAnimationFrame(raf);
        ro.disconnect();

        if (window.updateProfileSkin) delete window.updateProfileSkin;
        if (renderer) renderer.dispose();
      };
    };

    let cleanup: undefined | (() => void);

    init()
      .then((fn) => {
        cleanup = fn;
      })
      .catch((e) => {
        didInitRef.current = false;
        console.error('Profile canvas init failed:', e);
      });

    return () => {
      destroyed = true;
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]); // init sau khi profile đã sẵn sàng

  // ✅ mỗi khi activeSkin đổi -> gọi updateProfileSkin
  useEffect(() => {
    const url = textureUrl || '/img/stick_fighter_sheet.png';
    if (window.updateProfileSkin) window.updateProfileSkin(url);
    else window.__pendingProfileTextureUrl = url;
  }, [textureUrl]);

  const handleSkinChange = async (skinId: string) => {
    const nextSkin = data.skins.find((item) => item.id === skinId);
    if (!nextSkin || !profile) return;

    setProfile({ ...profile, skinId });
    setSkinStatus('Đang đổi skin...');
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skinId }),
    });

    const nextUrl = nextSkin.textureUrl || '/img/stick_fighter_sheet.png';
    if (window.updateProfileSkin) window.updateProfileSkin(nextUrl);
    else window.__pendingProfileTextureUrl = nextUrl;

    setSkinStatus(`✅ Đã đổi skin sang ${nextSkin.name}.`);
  };

  // =========================
  // UI states
  // =========================
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

  return (
    <main className="home-main">
      <div className="home-layout">
        <section className="home-hero">
          {/* ✅ CHỈ CÒN 1 CANVAS DUY NHẤT */}
          <div ref={wrapRef} className="profile-canvas" data-texture-url={textureUrl}>
            <canvas ref={canvasRef} id="profile-canvas" />
          </div>

          <div className="profile-details">
            <div>
              <h1>{profile.displayName || session.user.name}</h1>
              <p className="muted">{profile.tagline || 'Chưa có mô tả'}</p>
            </div>

            <div className="home-actions">
              <div>
                <h2>Chiến đấu</h2>
                <p className="muted">Chọn phòng sẵn có hoặc tự tạo phòng mới.</p>
              </div>
              <Button onClick={() => router.push('/')}>Vào chiến đấu</Button>
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
    </main>
  );
}
