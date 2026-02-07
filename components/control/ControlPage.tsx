'use client';

import { useEffect } from 'react';
import { initControl } from './controlClient';

export default function ControlPage() {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

  useEffect(() => {
    let cleanup: null | (() => void) = null;
    cleanup = initControl({ socketUrl });

    return () => {
      cleanup?.();
    };
  }, [socketUrl]);

  return (
    <>
      <div id="skill-name">—</div>

      <div id="loading">Nhấn “Bắt đầu Camera” để kích hoạt nhận diện tay.</div>
      <div id="startBtn">Bắt đầu Camera</div>

      <div id="controls">
        <div id="net">
          🔌 Net: <span id="netText">Chưa kết nối</span>
        </div>
        <label>
          Room <input id="roomInput" type="text" defaultValue="demo" />
        </label>
        <label>
          Player
          <select id="playerSelect" defaultValue="1">
            <option value="1">Player 1</option>
            <option value="2">Player 2</option>
          </select>
        </label>
        <button id="joinBtn" className="btn">
          Kết nối Room
        </button>
        <div className="hint">
          Test nhanh: <b>Q/W/E/R/T/Y/U/I</b>
        </div>
        <div id="poseControls" className="panel">
          <div className="panel-title">Arm Tracking</div>
          <div className="row">
            <button id="calibrateBtn" className="btn secondary">
              Calibrate
            </button>
            <label className="toggle">
              <input id="mirrorToggle" type="checkbox" defaultChecked />
              <span>Mirror</span>
            </label>
            <label className="toggle">
              <input id="debugToggle" type="checkbox" />
              <span>Debug</span>
            </label>
            <label className="toggle">
              <input id="armGestureToggle" type="checkbox" />
              <span>Arm Pose</span>
            </label>
          </div>
          <div className="hint">Calibrate khi tay ở pose chuẩn để giảm lệch.</div>
        </div>
        <div id="cameraControls" className="panel">
          <div className="panel-title">Camera</div>
          <label>
            Mode
            <select id="cameraMode" defaultValue="TPS_BACK">
              <option value="TPS_BACK">TPS_BACK</option>
              <option value="TPS_FRONT">TPS_FRONT</option>
              <option value="FPS">FPS</option>
              <option value="ORBIT">ORBIT</option>
              <option value="TOP">TOP</option>
              <option value="SIDE">SIDE</option>
              <option value="CINEMATIC_A">CINEMATIC_A</option>
              <option value="CINEMATIC_B">CINEMATIC_B</option>
            </select>
          </label>
          <label>
            Target
            <select id="cameraTarget" defaultValue="center">
              <option value="center">Center</option>
              <option value="p1">P1</option>
              <option value="p2">P2</option>
            </select>
          </label>
          <label>
            Yaw (deg) <span id="cameraYawValue">0</span>
            <input id="cameraYaw" type="range" min="-180" max="180" defaultValue="0" />
          </label>
          <label>
            Pitch (deg) <span id="cameraPitchValue">10</span>
            <input id="cameraPitch" type="range" min="-30" max="60" defaultValue="10" />
          </label>
          <label>
            Dist <span id="cameraDistValue">44</span>
            <input id="cameraDist" type="range" min="12" max="120" defaultValue="44" />
          </label>
          <label>
            FOV <span id="cameraFovValue">50</span>
            <input id="cameraFov" type="range" min="30" max="90" defaultValue="50" />
          </label>
        </div>
      </div>

      <div id="guide">
        <div id="guide-title">BÍ KÍP (CONTROL)</div>

        <div className="move">
          <span className="icon">✋</span>
          <div>
            <span className="name">Liên Hoa:</span>
            <span className="desc">Xòe tay</span>
          </div>
        </div>
        <div className="move">
          <span className="icon">👍</span>
          <div>
            <span className="name">Hộ Thân Cầu:</span>
            <span className="desc">Giơ ngón cái</span>
          </div>
        </div>

        <div className="move">
          <span className="icon">⚡</span>
          <div>
            <span className="name">Song Long Quá Hải:</span>
            <span className="desc">1 tay ✌️ + 1 tay 🤘 (ATTACK + WALL cùng lúc)</span>
          </div>
        </div>

        <div className="move">
          <span className="icon">🙌</span>
          <div>
            <span className="name">Tam Nhẫn Kiếm Chỉ:</span>
            <span className="desc">2 tay mở giơ cao, giữ 3 giây</span>
          </div>
        </div>
        <div className="move">
          <span className="icon">✌️</span>
          <div>
            <span className="name">Attack:</span>
            <span className="desc">2 ngón</span>
          </div>
        </div>
        <div className="move">
          <span className="icon">🤘</span>
          <div>
            <span className="name">Wall:</span>
            <span className="desc">Trỏ + Út</span>
          </div>
        </div>
        <div className="move">
          <span className="icon">👌</span>
          <div>
            <span className="name">Spin:</span>
            <span className="desc">Chạm cái + trỏ</span>
          </div>
        </div>
        <div className="move">
          <span className="icon">☝️</span>
          <div>
            <span className="name">AIM:</span>
            <span className="desc">1 ngón trỏ</span>
          </div>
        </div>
        <div className="move">
          <span className="icon">🖐️</span>
          <div>
            <span className="name">Việt Tự Kiếm Tiên:</span>
            <span className="desc">4 ngón (khép ngón cái)</span>
          </div>
        </div>

        <div className="hint">
          PC (Display) gánh combat/VFX, điện thoại chỉ gửi input.
        </div>
      </div>

      <video className="input_video" playsInline muted />
      <video id="cameraPreview" className="camera_preview" playsInline muted />
      <canvas id="poseDebug" className="pose_debug" width="640" height="480" />

      <style jsx global>{`
        :root {
          --ui: #00ffff;
          --panel: rgba(0, 0, 0, 0.78);
        }
        body {
          margin: 0;
          background: #05050a;
          color: #fff;
          font-family: system-ui, Segoe UI, Arial, sans-serif;
          overflow: hidden;
        }
        .input_video {
          position: fixed;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
          left: -10px;
          top: -10px;
        }
        .camera_preview {
          position: fixed;
          left: 16px;
          bottom: 16px;
          width: 240px;
          height: 180px;
          border-radius: 12px;
          border: 1px solid rgba(0, 255, 255, 0.35);
          background: rgba(0, 0, 0, 0.6);
          object-fit: cover;
          display: none;
          z-index: 10;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        }
        .camera_preview.mirror {
          transform: scaleX(-1);
        }
        .pose_debug {
          position: fixed;
          right: 18px;
          bottom: 18px;
          width: 320px;
          height: 240px;
          border: 1px solid rgba(0, 255, 255, 0.4);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.35);
          display: none;
          z-index: 6;
        }
        .panel {
          margin-top: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.45);
        }
        .panel-title {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.65);
          margin-bottom: 8px;
        }
        .panel .row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .btn.secondary {
          background: rgba(0, 255, 255, 0.12);
          border-color: rgba(0, 255, 255, 0.4);
        }
        #loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.85);
          border: 1px solid rgba(0, 255, 255, 0.55);
          border-radius: 12px;
          padding: 18px 20px;
          text-align: center;
          color: var(--ui);
          text-shadow: 0 0 12px rgba(0, 255, 255, 0.35);
          backdrop-filter: blur(6px);
          z-index: 5;
          max-width: 560px;
          line-height: 1.35;
        }
        #startBtn {
          position: absolute;
          top: calc(50% + 76px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 6;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.82);
          color: var(--ui);
          border: 1px solid rgba(0, 255, 255, 0.6);
          cursor: pointer;
          user-select: none;
          font-weight: 800;
          letter-spacing: 0.5px;
          box-shadow: 0 0 18px rgba(0, 255, 255, 0.12);
        }
        #startBtn:active {
          transform: translateX(-50%) scale(0.98);
        }
        #skill-name {
          position: absolute;
          left: 0;
          right: 0;
          top: 22px;
          text-align: center;
          font-size: 32px;
          font-weight: 900;
          letter-spacing: 5px;
          opacity: 0;
          transform: translateY(-10px) scale(0.98);
          transition: opacity 0.22s ease, transform 0.22s ease, filter 0.22s ease;
          filter: drop-shadow(0 0 18px rgba(255, 0, 222, 0.55));
          user-select: none;
          z-index: 2;
        }
        #skill-name.show {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: drop-shadow(0 0 28px rgba(0, 255, 255, 0.25));
        }
        #controls {
          position: absolute;
          top: 16px;
          right: 16px;
          background: var(--panel);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 10px 12px;
          backdrop-filter: blur(6px);
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 260px;
          z-index: 2;
        }
        #net {
          font-size: 12px;
          opacity: 0.9;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          line-height: 1.35;
        }
        label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.75);
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
        }
        select,
        input[type='text'] {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 8px 10px;
          border-radius: 10px;
          outline: none;
        }
        .btn {
          padding: 10px 10px;
          border-radius: 12px;
          border: 1px solid rgba(0, 255, 255, 0.35);
          background: rgba(0, 0, 0, 0.55);
          color: var(--ui);
          cursor: pointer;
          font-weight: 900;
          letter-spacing: 0.5px;
        }
        .btn:active {
          transform: scale(0.99);
        }
        #guide {
          position: absolute;
          left: 16px;
          bottom: 16px;
          width: 410px;
          background: linear-gradient(90deg, rgba(0, 0, 0, 0.86), rgba(0, 0, 0, 0.18));
          border-left: 4px solid rgba(0, 255, 255, 0.8);
          padding: 14px 16px;
          backdrop-filter: blur(6px);
          z-index: 2;
        }
        #guide-title {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 2px;
          margin-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.16);
          padding-bottom: 6px;
        }
        .move {
          margin-bottom: 8px;
          font-size: 13px;
          display: flex;
          gap: 10px;
        }
        .icon {
          width: 26px;
          font-size: 18px;
          line-height: 1.1;
        }
        .name {
          font-weight: 900;
          color: var(--ui);
          margin-right: 6px;
        }
        .desc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          font-style: italic;
        }
        .hint {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 8px;
        }
      `}</style>
    </>
  );
}
