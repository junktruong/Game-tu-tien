"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { initDisplay } from "./battlefield/main";
import { initControl } from "../control/controlClient";
import { CONTROL_SKILL_OPTIONS } from "../control/skillCatalog";

const swordSkins = [
  {
    id: "dekiem",
    name: "Đế Kiếm (tiên nghịch)",
    url: "/img/swords/dekiem.png",
    bloom: "#95adcfde",
  },
  {
    id: "loihoa",
    name: "Lôi Hoả Kiếm (X)",
    url: "/img/swords/loihoa.png",
    bloom: "#ee3333",
  },
  {
    id: "longkiem",
    name: "Long Kiếm (X)",
    url: "/img/swords/longkiem.png",
    bloom: "#ffe343",
  },
  {
    id: "tuhackiem",
    name: "Tử Hắc Kiếm (X)",
    url: "/img/swords/tuhackiem.png",
    bloom: "#b801d0",
  },
  {
    id: "bacdaukiem",
    name: "Bắc Đẩu Kiếm (X)",
    url: "/img/swords/bacdaukiem.png",
    bloom: "#86dbff",
  },
  {
    id: "xich",
    name: "Xích Kiếm (X)",
    url: "/img/swords/xich.png",
    bloom: "#ff1212",
  },
  {
    id: "bichhai",
    name: "Bích Hải Kiếm (X)",
    url: "/img/swords/bichhai.png",
    bloom: "#60ff63",
  },
  {
    id: "banghoa",
    name: "Băng Hoả Kiếm (X)",
    url: "/img/swords/banghoa.png",
    bloom: "#35f1c8",
  },
];

export default function DisplayPage() {
  const cleanupRef = useRef<null | (() => void)>(null);
  const controlCleanupRef = useRef<null | (() => void)>(null);
  const [selectedSkin, setSelectedSkin] = useState(swordSkins[0]?.url || "");

  useEffect(() => {
    let isActive = true;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";

    const boot = async () => {
      const THREE = await import("three");
      const { EffectComposer } =
        await import("three/examples/jsm/postprocessing/EffectComposer.js");
      const { RenderPass } =
        await import("three/examples/jsm/postprocessing/RenderPass.js");
      const { UnrealBloomPass } =
        await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");

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
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";

    controlCleanupRef.current = initControl({ socketUrl });

    return () => {
      controlCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("swordSkin") || "";
      const hasSaved = swordSkins.some((s) => s.url === saved);
      if (hasSaved) setSelectedSkin(saved);
    } catch (_) {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!selectedSkin) return;
    const skin =
      swordSkins.find((item) => item.url === selectedSkin) || swordSkins[0];
    const bloom = skin?.bloom;
    try {
      localStorage.setItem("swordSkin", selectedSkin);
      if (bloom) localStorage.setItem("swordBloom", bloom);
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
            <div className="name" style={{ color: "var(--c1)" }}>
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
              <div className="bar" style={{ height: "6px" }}>
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

          <div className="hud" style={{ textAlign: "right" }}>
            <div className="name" style={{ color: "var(--c2)" }}>
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
              <div className="bar" style={{ height: "6px" }}>
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

      <div id="control-panel">
        <div className="control-header">
          <div className="control-title">CONTROL</div>
          <button id="toggleControls" className="btn small">
            Thu gọn
          </button>
        </div>

        <div className="control-body">
          <div id="skill-name">—</div>
          <div id="loading">
            Nhấn “Bắt đầu Camera” để kích hoạt nhận diện tay.
          </div>
          <button id="startBtn" className="btn">
            Bắt đầu Camera
          </button>

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
              <div className="hint">
                Calibrate khi tay ở pose chuẩn để giảm lệch.
              </div>
            </div>

            <div id="gestureTemplateControls" className="panel">
              <div className="panel-title">Gesture Templates</div>
              <label>
                Chọn chiêu
                <select
                  id="gestureSelect"
                  defaultValue={CONTROL_SKILL_OPTIONS[0]?.gesture || ""}
                >
                  {CONTROL_SKILL_OPTIONS.map((skill) => (
                    <option key={skill.skillId} value={skill.gesture}>
                      {skill.label} ({skill.gesture})
                    </option>
                  ))}
                </select>
              </label>
              <div className="row">
                <button id="startGestureRecordBtn" className="btn secondary">
                  Start Record
                </button>
                <button id="clearGesturesBtn" className="btn secondary">
                  Clear
                </button>
              </div>
              <div id="gestureStoreText" className="hint" />
              <div id="gestureMatchText" className="hint" />
            </div>

            <div id="swordSetting" className="panel sword-setting">
              <div className="panel-title">Kiếm</div>
              <div className="sword-row">
                <img src={selectedSkin} alt="sword" className="sword-preview" />
                <label className="sword-select">
                  Chọn kiếm
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
                </label>
              </div>
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
                <input
                  id="cameraYaw"
                  type="range"
                  min="-180"
                  max="180"
                  defaultValue="0"
                />
              </label>
              <label>
                Pitch (deg) <span id="cameraPitchValue">10</span>
                <input
                  id="cameraPitch"
                  type="range"
                  min="-30"
                  max="60"
                  defaultValue="10"
                />
              </label>
              <label>
                Dist <span id="cameraDistValue">44</span>
                <input
                  id="cameraDist"
                  type="range"
                  min="12"
                  max="120"
                  defaultValue="44"
                />
              </label>
              <label>
                FOV <span id="cameraFovValue">50</span>
                <input
                  id="cameraFov"
                  type="range"
                  min="30"
                  max="90"
                  defaultValue="50"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <video className="input_video" playsInline muted />
      <video id="cameraPreview" className="camera_preview" playsInline muted />
      <canvas id="handOverlay" className="hand_overlay" width="640" height="480" />
      <canvas id="poseDebug" className="pose_debug" width="640" height="480" />
      <div id="recordCountdown" className="record_countdown" />
    </>
  );
}
