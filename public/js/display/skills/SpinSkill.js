// public/js/display/skills/SpinSkill.js
import { BaseSkill } from "./BaseSkill.js";

export class SpinSkill extends BaseSkill {
  cast(ctx, attacker){
    const { combat, hud, scheduler, fighters, vfx } = ctx;
    const defender = (attacker === 0) ? 1 : 0;
    if (!this._prep(ctx, attacker)) return;

    const THREE = window.THREE;
    const col = combat.getColor(attacker);
    const meta = this.def.meta || {};

    const durationSec = meta.durationSec ?? 0.85;
    const ticks = meta.ticks ?? 4;
    const tickDmg = meta.tickDmg ?? 6;

    const swordPerTick = meta.swordPerTick ?? 14;
    const visualCount = Math.max(30, Math.floor(swordPerTick * 3)); // dày hơn, mượt hơn
    const radius = meta.radius ?? 5.6;
    const spinSpeed = meta.spinSpeed ?? 10.5;
    const arc = meta.arc ?? 1.0;
    const wobble = meta.wobble ?? 0.9;

    combat.setLastSkill(attacker, "Kiếm Vũ · Vòng Xoáy");
    hud.setBanner(`🌪️ P${attacker+1}: KIẾM VŨ VÒNG XOÁY`);

    scheduler.schedule(this.def.anim?.charge ?? 0, ()=>{
      if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

      const startPos = fighters[attacker].getMuzzlePos();
      const endPos = combat.getHitPoint(defender);

      // mở skill: tụ lực + shockwave
      vfx.spawnBurstAt(fighters[attacker].getCorePos(9.6), col, 1.10);
      if (typeof vfx.spawnShockwave === "function"){
        const g = fighters[attacker].getCorePos(0.6);
        g.y = 0.6;
        vfx.spawnShockwave(g, col, 1.6, 20, 0.32);
      }

      // VORTEX mượt (instanced) chạy liên tục
      if (typeof vfx.playVortexSwords === "function"){
        vfx.playVortexSwords({
          startPos,
          endPos,
          colorHex: col,
          durationSec,
          count: visualCount,
          radius,
          spinSpeed: (attacker===0 ? 1 : -1) * spinSpeed,
          arc,
          wobble
        });
      }

      // Damage tick theo nhịp (kèm impact)
      for (let ti = 0; ti < ticks; ti++){
        scheduler.schedule(ti * (durationSec / ticks), ()=>{
          if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

          // tính “tâm vortex” theo tiến trình
          const p = (ti + 1) / ticks;
          const c = new THREE.Vector3().lerpVectors(startPos, endPos, p);

          vfx.spawnSlash(c.clone(), col, (attacker === 0 ? 0.35 : -0.35));
          if (typeof vfx.spawnShockwave === "function"){
            const gg = c.clone(); gg.y = 0.6;
            vfx.spawnShockwave(gg, col, 1.2, 16, 0.26);
          }

          const heavy = (ti === ticks - 1);
          combat.hitReact(attacker, defender, heavy);
          combat.applyDamage(attacker, defender, tickDmg);
        });
      }
    });
  }
}
