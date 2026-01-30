import Script from 'next/script';

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
      <Script src="/socket.io/socket.io.js" strategy="beforeInteractive" />
      <Script type="module" src="/js/display/main.js" strategy="afterInteractive" />

      <style jsx global>{`
        :root {
          --c1: #00ffff;
          --c2: #ff4fd8;
          --bg: #05050a;
          --panel: rgba(0, 0, 0, 0.56);
        }
        html,
        body {
          margin: 0;
          height: 100%;
          background: var(--bg);
          overflow: hidden;
          font-family: system-ui, Segoe UI, Arial, sans-serif;
        }
        #stage {
          position: absolute;
          inset: 0;
        }
        #ui {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 10;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
        }
        .top {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          align-items: start;
        }
        .hud {
          background: var(--panel);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 12px 14px;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 24px rgba(0, 0, 0, 0.35);
        }
        .name {
          font-weight: 900;
          letter-spacing: 1px;
          font-size: 14px;
          opacity: 0.95;
        }
        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 8px;
        }
        .bar {
          position: relative;
          height: 12px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          width: 100%;
        }
        .fill {
          position: absolute;
          inset: 0;
          transform-origin: left;
        }
        .hp1 {
          background: linear-gradient(90deg, rgba(0, 255, 255, 0.95), rgba(0, 255, 255, 0.15));
          filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.2));
        }
        .hp2 {
          background: linear-gradient(90deg, rgba(255, 79, 216, 0.95), rgba(255, 79, 216, 0.15));
          filter: drop-shadow(0 0 10px rgba(255, 79, 216, 0.2));
        }
        .qi1 {
          background: linear-gradient(90deg, rgba(0, 255, 255, 0.55), rgba(0, 255, 255, 0.08));
        }
        .qi2 {
          background: linear-gradient(90deg, rgba(255, 79, 216, 0.55), rgba(255, 79, 216, 0.08));
        }
        .ult {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 12px;
          opacity: 0.85;
        }
        .ultBadge {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          letter-spacing: 1px;
        }
        .small {
          font-size: 12px;
          opacity: 0.78;
        }
        .tag {
          font-size: 11px;
          opacity: 0.75;
          margin-top: 6px;
        }
        .combo {
          margin-top: 8px;
          font-size: 12px;
          letter-spacing: 1px;
          opacity: 0.85;
        }
        #bottom {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-bottom: 6px;
        }
        #banner {
          background: rgba(0, 0, 0, 0.52);
          border: 1px solid rgba(0, 255, 255, 0.22);
          border-radius: 999px;
          padding: 10px 14px;
          backdrop-filter: blur(10px);
          font-weight: 950;
          letter-spacing: 2px;
          color: #fff;
          text-shadow: 0 0 18px rgba(0, 255, 255, 0.2);
          max-width: 92vw;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        #status {
          position: absolute;
          right: 16px;
          bottom: 16px;
          background: rgba(0, 0, 0, 0.52);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 12px;
          opacity: 0.85;
          pointer-events: none;
          backdrop-filter: blur(10px);
        }
        #toast {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(10px);
          font-weight: 900;
          letter-spacing: 1px;
          opacity: 0;
          transition: opacity 0.18s ease, transform 0.18s ease;
          pointer-events: none;
          z-index: 20;
        }
        #toast.show {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1.03);
        }
      `}</style>
    </>
  );
}
