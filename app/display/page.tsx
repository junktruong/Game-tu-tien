import Script from 'next/script';
import './display.css';

export const metadata = {
  title: 'Display - Tu Tiên Fight',
};

export default function Display() {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

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

      <Script
        id="socket-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.__SOCKET_URL = ${JSON.stringify(socketUrl)};`,
        }}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/Pass.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.socket.io/4.7.4/socket.io.min.js"
        strategy="beforeInteractive"
        crossOrigin="anonymous"
      />
      <Script type="module" src="/js/display/main.js" strategy="afterInteractive" />

    </>
  );
}
