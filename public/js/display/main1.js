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

const normalizeLoadout = (loadout = {}) => ({
  skin: FIGHTER_SKINS[loadout.skin] ? loadout.skin : "default",
  swordType: SWORD_TYPES[loadout.swordType] ? loadout.swordType : "katana",
  swordSkin: SWORD_SKINS[loadout.swordSkin] ? loadout.swordSkin : "default",
});

const playerLoadouts = PLAYER_LOADOUTS.map((loadout) => normalizeLoadout(loadout));

// fighters
const fighters = [
  new StickFighter(sceneManager.scene, {
    colorHex: 0x00ffff,
    x: -12,
    facing: 1,
    glowTex,
    textureUrl: resolveFighterTexture(playerLoadouts[0]),
    skinKey: playerLoadouts[0]?.skin,
  }),
  new StickFighter(sceneManager.scene, {
    colorHex: 0xff4fd8,
    x: 12,
    facing: -1,
    glowTex,
    textureUrl: resolveFighterTexture(playerLoadouts[1]),
    skinKey: playerLoadouts[1]?.skin,
  }),
];

// vfx + combat
const vfx = new VFXManager(sceneManager.scene, glowTex, swordFactory, playerLoadouts);
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

socket.on("loadout", (payload)=>{
  const player = payload?.player === 2 ? 1 : 0;
  const next = normalizeLoadout(payload?.loadout || {});
  playerLoadouts[player] = next;
  vfx.loadouts = playerLoadouts;
  fighters[player].setTextureUrl(resolveFighterTexture(next), next.skin);
});

socket.on("input", (msg)=>{
  registry.handleGesture({ combat, hud, scheduler, fighters, vfx, sceneManager }, msg.player, msg.gesture);
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
