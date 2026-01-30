// public/js/display/skills/GiantSkill.js
import { BaseSkill } from "./BaseSkill.js";

export class GiantSkill extends BaseSkill {
  cast(ctx, attacker){
    const { combat, hud, scheduler, fighters, vfx } = ctx;
    const defender = (attacker === 0) ? 1 : 0;
    if (!this._prep(ctx, attacker)) return;

    const THREE = window.THREE;
    const col = combat.getColor(attacker);
    const meta = this.def.meta || {};

    const rainCount = meta.rainCount ?? 26;
    const hits = Math.min(meta.hits ?? 6, rainCount);
    const dmgEach = meta.dmgEach ?? 7;

    const height = meta.height ?? 38;
    const spreadX = meta.spreadX ?? 10.5;
    const spreadY = meta.spreadY ?? 6.0;
    const dropSpeed = meta.dropSpeed ?? 75;
    const warningSec = meta.warningSec ?? 0.22;
    const burstScale = meta.burstScale ?? 1.0;

    combat.setLastSkill(attacker, "Thiên Kiếm · Skyfall");
    hud.setBanner(`🌩️ P${attacker+1}: KIẾM RƠI TỪ TRỜI XUỐNG`);

    scheduler.schedule(this.def.anim?.charge ?? 0, ()=>{
      if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

      const target = combat.getHitPoint(defender);

      // warning zone
      vfx.spawnBurstAt(target.clone(), col, 0.85 * burstScale);
      if (typeof vfx.spawnShockwave === "function"){
        const g = target.clone(); g.y = 0.6;
        vfx.spawnShockwave(g, col, 1.6, 22, 0.32);
      }

      const hitSet = new Set();
      while (hitSet.size < hits){
        hitSet.add(Math.floor(Math.random() * rainCount));
      }

      for (let i = 0; i < rainCount; i++){
        const delay = warningSec + Math.random() * 0.26;

        scheduler.schedule(delay, ()=>{
          if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

          // điểm rơi quanh target
          const dx = (Math.random() - 0.5) * spreadX;
          const dy = (Math.random() - 0.5) * spreadY;

          const end = target.clone().add(new THREE.Vector3(dx, dy, 0));

          // FIX: spawn gần như thẳng đứng (x/z lệch rất nhỏ) -> nhìn đúng “rơi dọc”
          const start = end.clone().add(new THREE.Vector3(
            (Math.random()-0.5) * 1.2,         // nhỏ để không nghiêng nhiều
            height + Math.random() * 10,
            (Math.random()-0.5) * 0.8
          ));

          const willHit = hitSet.has(i);

          vfx.spawnProjectileToTarget(
            start,
            end,
            col,
            dropSpeed,
            0.08,
            0.0,
            willHit ? ()=>{
              if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

              vfx.spawnBurstAt(end.clone(), col, 1.05 * burstScale);
              if (typeof vfx.spawnShockwave === "function"){
                const g = end.clone(); g.y = 0.6;
                vfx.spawnShockwave(g, col, 1.2, 18, 0.28);
              }

              const heavy = (Math.random() < 0.22);
              combat.hitReact(attacker, defender, heavy);
              combat.applyDamage(attacker, defender, dmgEach);
            } : null
          );
        });
      }
    });
  }
}
