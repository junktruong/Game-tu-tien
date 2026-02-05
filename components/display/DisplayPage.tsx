'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { initDisplay } from './battlefield/main';

const swordSkins = [
  { id: 'azure', name: 'Lam Ngoc', url: '/img/swords/azure.svg', bloom: '#6fd7ff' },
  { id: 'ember', name: 'Xich Huyet', url: '/img/swords/ember.svg', bloom: '#ff6a1a' },
  { id: 'jade', name: 'Bich Lam', url: '/img/swords/jade.svg', bloom: '#46f2b4' },
  { id: 'dekiem', name: 'Đế Kiếm (tiên nghịch)', url: '/img/swords/dekiem.png', bloom: '#95adcfde' },
];

export default function DisplayPage() {
  const cleanupRef = useRef<null | (() => void)>(null);
  const [selectedSkin, setSelectedSkin] = useState(swordSkins[0]?.url || '');

  useEffect(() => {
    let isActive = true;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

    const boot = async () => {
      const THREE = await import('three');
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
      const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');
      const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');

      window.THREE = {
        ...THREE,
        EffectComposer,
        RenderPass,
        UnrealBloomPass,
      };

      if (!isActive) {
        return;
      }

      cleanupRef.current = initDisplay({ socketUrl, io });
    };

    boot();

    return () => {
      isActive = false;
      cleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('swordSkin') || '';
      const hasSaved = swordSkins.some((s) => s.url === saved);
      if (hasSaved) setSelectedSkin(saved);
    } catch (_) {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!selectedSkin) return;
    const skin = swordSkins.find((item) => item.url === selectedSkin) || swordSkins[0];
    const bloom = skin?.bloom;
    try {
      localStorage.setItem('swordSkin', selectedSkin);
      if (bloom) localStorage.setItem('swordBloom', bloom);
    } catch (_) {
      // ignore storage errors
    }
    window.__setSwordSkin?.(selectedSkin, bloom);
  }, [selectedSkin]);

  return (
    <>
      <div id="stage" />

      <div id="ui">
        <div className="top">
          <div className="hud">
            <div className="name" style={{ color: 'var(--c1)' }}>
              PLAYER 1
            </div>

            <div className="row">
              <div className="bar">
                <div id="hp1" className="fill hp1" />
              </div>
              <div id="hp1t" className="small">
                100
              </div>
            </div>

            <div className="row">
              <div className="bar" style={{ height: '10px' }}>
                <div id="qi1" className="fill qi1" />
              </div>
              <div id="qi1t" className="small">
                100
              </div>
            </div>

            <div className="ult">
              <div className="ultBadge" id="ult1">
                ULT 0%
              </div>
              <div className="ultBadge" id="state1">
                —
              </div>
            </div>

            <div id="combo1" className="combo">
              COMBO: 0
            </div>
            <div id="last1" className="tag">
              —
            </div>
          </div>

          <div className="hud" style={{ textAlign: 'right' }}>
            <div className="name" style={{ color: 'var(--c2)' }}>
              PLAYER 2
            </div>

            <div className="row">
              <div id="hp2t" className="small">
                100
              </div>
              <div className="bar">
                <div id="hp2" className="fill hp2" />
              </div>
            </div>

            <div className="row">
              <div id="qi2t" className="small">
                100
              </div>
              <div className="bar" style={{ height: '10px' }}>
                <div id="qi2" className="fill qi2" />
              </div>
            </div>

            <div className="ult">
              <div className="ultBadge" id="state2">
                —
              </div>
              <div className="ultBadge" id="ult2">
                ULT 0%
              </div>
            </div>

            <div id="combo2" className="combo">
              COMBO: 0
            </div>
            <div id="last2" className="tag">
              —
            </div>
          </div>
        </div>

        <div id="bottom">
          <div id="banner">TU TIÊN FIGHT</div>
        </div>
      </div>

      <div id="toast" />
      <div id="status">Connecting…</div>

      <div id="sword-picker">
        <div className="label">SWORD</div>
        <img src={selectedSkin} alt="sword" className="preview" />
        <select
          value={selectedSkin}
          onChange={(event) => setSelectedSkin(event.target.value)}
        >
          {swordSkins.map((skin) => (
            <option key={skin.id} value={skin.url}>
              {skin.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
