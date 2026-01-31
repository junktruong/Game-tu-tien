// public/js/display/main.js
import { Scheduler } from "./utils.js";
import { HUD } from "./ui/HUD.js";
import { SceneManager } from "./scene/SceneManager.js";
import { StickFighter } from "./entities/StickFighter.js";
import { SwordFactory } from "./entities/SwordFactory.js";
import { VFXManager } from "./vfx/VFXManager.js";
import { CombatSystem } from "./combat/CombatSystem.js";
import { SkillRegistry } from "./skills/SkillRegistry.js";
import { FIGHTER_SKINS, PLAYER_LOADOUTS, SWORD_SKINS, SWORD_TYPES } from "./loadouts.js";

function getRoom(){
  const qs = new URLSearchParams(location.search);
  return (qs.get("room") || "demo").trim() || "demo";
}

const ROOM = getRoom();

// DOM + systems
const stage = document.getElementById("stage");
const hud = new HUD(ROOM);
const scheduler = new Scheduler();
const sceneManager = new SceneManager(stage);

// glow texture & factories
const swordFactoryTmp = new SwordFactory(null, { types: SWORD_TYPES, skins: SWORD_SKINS });
const glowTex = swordFactoryTmp.createGlowTexture();
const swordFactory = new SwordFactory(glowTex, { types: SWORD_TYPES, skins: SWORD_SKINS });

const resolveFighterTexture = (loadout) => {
  const skin = FIGHTER_SKINS[loadout?.skin] || FIGHTER_SKINS.default;
  return skin?.textureUrl || "/img/stick_fighter_sheet.png";
};

// fighters
const fighters = [
  new StickFighter(sceneManager.scene, {
    colorHex: 0x00ffff,
    x: -25,
    facing: 1,
    glowTex,
    textureUrl: resolveFighterTexture(PLAYER_LOADOUTS[0]),
    skinKey: PLAYER_LOADOUTS[0]?.skin,
  }),
  new StickFighter(sceneManager.scene, {
    colorHex: 0xff4fd8,
    x: 25,
    facing: -1,
    glowTex,
    textureUrl: resolveFighterTexture(PLAYER_LOADOUTS[1]),
    skinKey: PLAYER_LOADOUTS[1]?.skin,
  }),
];

// vfx + combat
const vfx = new VFXManager(sceneManager.scene, glowTex, swordFactory, PLAYER_LOADOUTS);
const combat = new CombatSystem({ hud, scheduler, fighters, vfx, sceneManager });
const registry = new SkillRegistry();

// socket
const socket = window.io();

socket.on("connect", ()=>{
  hud.setStatus(`✅ Connected | room=${ROOM}`);
  socket.emit("join", { room: ROOM, role: "display" });
  hud.setBanner(`TU TIÊN FIGHT | ROOM ${ROOM.toUpperCase()}`, true);
});

socket.on("roster", (r)=>{
  hud.setStatus(`room=${ROOM} | P1:${r.p1?'ON':'OFF'} P2:${r.p2?'ON':'OFF'} | Display:${r.displayCount}`);
});

socket.on("input", (msg)=>{
  const ctx = { combat, hud, scheduler, fighters, vfx, sceneManager };
  const g = String(msg?.gesture || "").toUpperCase();
  const attacker = (msg.player === 1) ? 0 : 1;

  // ===== GIANT charge (từ Control) =====
  if (g === "GIANT_CHARGE"){
    if (typeof vfx.startGiantCharge === "function"){
      vfx.startGiantCharge(
  fighters[attacker],
  combat.getColor(attacker),
  attacker,
  { count: 16, radius: 7.0, spin: 3.2, scale: 0.7 }
);

      hud.setBanner(`🌸 P${attacker+1}: GIANT CHARGE… (giữ 3s)`, true);
      combat.setLastSkill(attacker, "Giant Charge");
    }
    return;
  }
  if (g === "GIANT_CANCEL"){
    if (typeof vfx.stopGiantCharge === "function"){
      vfx.stopGiantCharge(attacker);
    }
    return;
  }

  registry.handleGesture(ctx, msg.player, msg.gesture);
});

socket.on("aim", (msg)=>{
  // hiện tại aim chỉ giữ để sau bạn làm “đòn theo hướng”
  // combat.players[idx].aim = msg.dir ...
});

socket.on("disconnect", ()=>{
  hud.setStatus("⚠️ Disconnected");
});

// loop
const clock = new window.THREE.Clock();

function loop(){
  const rawDt = clock.getDelta();
  const elapsed = clock.elapsedTime;

  // hitstop
  if (combat.hitstop > 0){
    combat.hitstop = Math.max(0, combat.hitstop - rawDt);
    const dt = rawDt * 0.25;

    scheduler.update(dt);
    combat.update(dt);
    for(const f of fighters) f.update(dt, elapsed);
    vfx.update(dt, elapsed, fighters);

    sceneManager.update(rawDt);
    sceneManager.render();
    requestAnimationFrame(loop);
    return;
  }

  const dt = rawDt;

  scheduler.update(dt);
  combat.update(dt);
  for(const f of fighters) f.update(dt, elapsed);
  vfx.update(dt, elapsed, fighters);

  sceneManager.update(dt);
  sceneManager.render();

  requestAnimationFrame(loop);
}

loop();

addEventListener("resize", ()=> sceneManager.resize());
