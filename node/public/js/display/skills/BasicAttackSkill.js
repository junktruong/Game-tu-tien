// public/js/display/skills/BasicAttackSkill.js
import { BaseSkill } from "./BaseSkill.js";
import { GAME } from "../config.js";
import { clamp } from "../utils.js";

export class BasicAttackSkill extends BaseSkill {
  cast(ctx, attacker){
    const { combat, hud, scheduler, fighters, vfx } = ctx;
    const defender = (attacker === 0) ? 1 : 0;

    // combo logic
    const now = performance.now();
    const c = combat.players[attacker].combo;
    if (now - c.lastAt > GAME.comboWindowMs) c.count = 0;
    c.count = clamp(c.count + 1, 1, GAME.comboMax);
    c.lastAt = now;

    if (!this._prep(ctx, attacker)) return;

    const col = combat.getColor(attacker);
    const meta = this.def.meta;
    const swordOptions = meta?.sword;

    scheduler.schedule(this.def.anim?.charge ?? 0, ()=>{
      const THREE = window.THREE;

      const from = fighters[attacker].getMuzzlePos();
      const to = combat.getHitPoint(defender);

      const away = attacker === 0 ? 1 : -1;
      vfx.spawnSlash(from.clone().add(new THREE.Vector3(away * 1.1, 0, 0)), col, away * 0.5);

      // COMBO 1
      if (c.count === 1){
        combat.setLastSkill(attacker, "Phá Thiên Kích · Nhất Thức");
        hud.setBanner(`⚔️ P${attacker+1}: Nhất Thức`);

        vfx.spawnProjectileToTarget(from, to, col, meta.projectileSpeed, 0.9, 0.8, ()=>{
          if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;
          combat.hitReact(attacker, defender, false);
          combat.applyDamage(attacker, defender, meta.combo1Dmg);
        }, swordOptions);
        return;
      }

      // COMBO 2
      if (c.count === 2){
        combat.setLastSkill(attacker, "Phá Thiên Kích · Liên Trảm");
        hud.setBanner(`⚔️ P${attacker+1}: Liên Trảm`);

        for(let k=0;k<meta.combo2Hits;k++){
          scheduler.schedule(0.08 + k*0.09, ()=>{
            if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

            const f = fighters[attacker].getMuzzlePos().clone()
              .add(new THREE.Vector3(away * (0.2 + 0.15*k), 0.12*k, 0));
            const t = combat.getHitPoint(defender).clone()
              .add(new THREE.Vector3(0, 0.10*k, 0));

            vfx.spawnSlash(f.clone(), col, away * (0.55 + 0.15*k));
            vfx.spawnProjectileToTarget(f, t, col, 64, 1.0, 0.65, ()=>{
              if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;
              combat.hitReact(attacker, defender, false);
              combat.applyDamage(attacker, defender, meta.combo2DmgEach);
            }, swordOptions);
          });
        }
        return;
      }

      // COMBO 3 (finisher)
      combat.setLastSkill(attacker, "Phá Thiên Kích · Phá Thiên");
      hud.setBanner(`🔥 P${attacker+1}: PHÁ THIÊN!`);
      vfx.spawnBurstAt(fighters[attacker].getCorePos(9.4), col, 1.2);

      const count = meta.combo3Projectiles;
      const dmgEach = meta.combo3TotalDmg / count;

      for(let k=0;k<count;k++){
        scheduler.schedule(0.02 + k*0.04, ()=>{
          if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

          const spread = (k - (count-1)/2) * 0.20;
          const f = fighters[attacker].getMuzzlePos().clone()
            .add(new THREE.Vector3(away*(0.2 + 0.12*k), spread*0.25, 0));
          const t = combat.getHitPoint(defender).clone()
            .add(new THREE.Vector3(0, spread*0.10, 0));

          vfx.spawnProjectileToTarget(f, t, col, 70, 1.1, 1.0, ()=>{
            if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;
            const heavy = (k === Math.floor(count/2));
            combat.hitReact(attacker, defender, heavy);
            combat.applyDamage(attacker, defender, dmgEach);
          }, swordOptions);
        });
      }

      c.count = 0;
    });
  }
}
