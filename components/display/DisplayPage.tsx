'use client';

import { useEffect, useRef } from 'react';
import { initDisplay } from './battlefield/main';

const SCRIPT_SOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/Pass.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js',
  'https://cdn.socket.io/4.7.4/socket.io.min.js',
];

const loadedScripts = new Map<string, Promise<void>>();

const loadScript = (src: string) => {
  const cached = loadedScripts.get(src);
  if (cached) {
    return cached;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });

  loadedScripts.set(src, promise);
  return promise;
};

export default function DisplayPage() {
  const cleanupRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    let isActive = true;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

    const boot = async () => {
      window.__SOCKET_URL = socketUrl;
      for (const src of SCRIPT_SOURCES) {
        await loadScript(src);
      }

      if (!isActive) {
        return;
      }

      cleanupRef.current = initDisplay({ socketUrl });
    };

    boot();

    return () => {
      isActive = false;
      cleanupRef.current?.();
    };
  }, []);

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
    </>
  );
}
