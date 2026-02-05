// public/js/display/main.js
import { HUD } from "./ui/HUD";
import { SceneManager } from "./scene/SceneManager";
import { StickFighter } from "./entities/StickFighter";
import { SwordFactory } from "./entities/SwordFactory";
import { VFXManager } from "./vfx/VFXManager";
import { GameCore } from "./core/GameCore";
import { GAME } from "./config";
import type { GameEvent } from "./core/types";
import { Scheduler } from "./utils";
import { RenderRegistry } from "./render/RenderRegistry";

type DisplayInitOptions = {
  socketUrl?: string;
  io: (url?: string) => any;
};

const getRoom = () => {
  const qs = new URLSearchParams(location.search);
  return (qs.get("room") || "demo").trim() || "demo";
};

const getArena = () => {
  const qs = new URLSearchParams(location.search);
  return (qs.get("arena") || qs.get("arenaId") || "sky-temple").trim() || "sky-temple";
};

export const initDisplay = ({ socketUrl, io }: DisplayInitOptions) => {
  const ROOM = getRoom();
  const ARENA = getArena();

  // DOM + systems
  const stage = document.getElementById("stage");
  if (!stage) {
    return () => {};
  }
  stage.textContent = "";

  const hud = new HUD(ROOM);
  const sceneManager = new SceneManager(stage, { arenaId: ARENA });

  // glow texture & factories
  const swordFactoryTmp = new SwordFactory(null);
  const glowTex = swordFactoryTmp.createGlowTexture();
  const swordFactory = new SwordFactory(glowTex);
  const defaultSwordSkin = "/img/swords/azure.svg";
  const defaultSwordBloom = 0x6fd7ff;

  // fighters
  const fighters = [
    new StickFighter(sceneManager.scene, { colorHex: 0x00ffff, x: -25, facing: 1, glowTex }),
    new StickFighter(sceneManager.scene, { colorHex: 0xff4fd8, x: 25, facing: -1, glowTex }),
  ];

  // vfx + combat
  const vfx = new VFXManager(sceneManager.scene, glowTex, swordFactory);
  const renderScheduler = new Scheduler();
  const renderRegistry = new RenderRegistry();
  const core = new GameCore({
    onEvent: (event: GameEvent) => handleCoreEvent(event),
  });

  const parseBloom = (value: any) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.trim().replace(/^#/, "").replace(/^0x/i, "");
      const parsed = parseInt(cleaned, 16);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const applySwordSkin = (url: string, bloom?: string | number | null) => {
    const skin = (url || "").trim() || defaultSwordSkin;
    swordFactory.setSwordTexture(skin);
    const bloomHex = parseBloom(bloom) ?? defaultSwordBloom;
    core.setVfxColor(0, bloomHex);
    core.setVfxColor(1, bloomHex);
  };

  try {
    const savedSkin = localStorage.getItem("swordSkin") || "";
    const savedBloom = localStorage.getItem("swordBloom") || "";
    applySwordSkin(savedSkin, savedBloom);
    window.__setSwordSkin = (url: string, bloom?: string | number) => {
      applySwordSkin(url, bloom);
      localStorage.setItem("swordSkin", (url || "").trim() || defaultSwordSkin);
      if (bloom != null) {
        localStorage.setItem("swordBloom", String(bloom));
      }
    };
  } catch (_) {
    applySwordSkin(defaultSwordSkin, defaultSwordBloom);
  }

  // socket
  const socket = io(socketUrl || undefined);

  socket.on("connect", () => {
    hud.setStatus(`✅ Connected | room=${ROOM}`);
    socket.emit("join", { room: ROOM, role: "display" });
    hud.setBanner(`TU TIÊN FIGHT | ROOM ${ROOM.toUpperCase()}`, true);
  });

  socket.on("roster", (r: { p1: boolean; p2: boolean; displayCount: number }) => {
    hud.setStatus(
      `room=${ROOM} | P1:${r.p1 ? "ON" : "OFF"} P2:${r.p2 ? "ON" : "OFF"} | Display:${r.displayCount}`
    );
  });

  socket.on("input", (msg: { player: number; gesture: string }) => {
    core.handleGesture(msg.player, msg.gesture);
  });

  socket.on("aim", () => {
    // hiện tại aim chỉ giữ để sau bạn làm “đòn theo hướng”
    // combat.players[idx].aim = msg.dir ...
  });

  socket.on("disconnect", () => {
    hud.setStatus("⚠️ Disconnected");
  });

  // loop
  const clock = new window.THREE.Clock();
  let rafId = 0;
  let running = true;

  const loop = () => {
    if (!running) {
      return;
    }
    const rawDt = clock.getDelta();
    const elapsed = clock.elapsedTime;

    // hitstop
    const dt = core.getState().hitstop > 0 ? rawDt * 0.25 : rawDt;

    core.update(dt, rawDt);
    renderScheduler.update(dt);
    for (const f of fighters) f.update(dt, elapsed);
    vfx.update(dt, elapsed, fighters);

    sceneManager.update(dt);
    sceneManager.render();

    rafId = requestAnimationFrame(loop);
  };

  loop();

  const handleResize = () => sceneManager.resize();
  addEventListener("resize", handleResize);

  return () => {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    removeEventListener("resize", handleResize);
    socket.disconnect();
  };

  function handleCoreEvent(event: GameEvent) {
    switch (event.type) {
      case "STATE":
        hud.update(GAME, event.state.players);
        break;
      case "BANNER":
        hud.setBanner(event.text, event.sticky);
        return;
      case "TOAST":
        hud.showToast(event.text);
        return;
      case "SHAKE":
        sceneManager.shake(event.amount);
        return;
      case "GIANT_CHARGE_START":
        hud.setBanner(`🌸 P${event.attacker + 1}: TAM NHẪN KIẾM CHỈ… (giữ 3s)`, true);
        break;
      default:
        break;
    }

    renderRegistry.handle(event, {
      core,
      fighters,
      vfx,
      scheduler: renderScheduler,
    });
  }
};
