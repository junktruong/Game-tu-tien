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
    const swordOptions = meta.sword;

    // NEW: GIANT chuyển sang "2 bông hoa kiếm" (charge ở control, cast ở display)
    const shots = 2;
    const dmgEach = meta.dmgEach ?? 7;

    combat.setLastSkill(attacker, "Liên Hoa Kiếm · Song Ấn");
    hud.setBanner(`🌸 P${attacker+1}: LIÊN HOA KIẾM · SONG ẤN`);

    scheduler.schedule(this.def.anim?.charge ?? 0, ()=>{
      if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

      // ưu tiên dùng VFX charge-fire (nếu có)
      if (typeof vfx.fireGiantFromStackedRings === "function"){
        const fired = vfx.fireGiantFromStackedRings({
          ownerIndex: attacker,
          getTargetPos: () => combat.getHitPoint(defender),
          speed: 160,
          arc: 0,           // bay thẳng cho sạch
          cadenceSec: 0.10, // đoạn đánh dài (tăng lên 0.12 nếu muốn dài hơn nữa)
          onHit: ()=>{
            if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;
            const heavy = (Math.random() < 0.12);
            combat.hitReact(attacker, defender, heavy);
            // dmgEach nên nhỏ vì bắn nhiều kiếm
            combat.applyDamage(attacker, defender, dmgEach);
          }
        });

        if (fired > 0) return;
      }


      // fallback: nếu chưa có fireGiantCharge thì bắn 2 kiếm thường
      const from = fighters[attacker].getMuzzlePos();
      const speed = meta.projectileSpeed ?? 120;
      for (let i=0;i<shots;i++){
        const to = combat.getHitPoint(defender).clone().add(new THREE.Vector3((i===0?-1:1)*0.5, 0.2, 0));
        vfx.spawnProjectileBezier(from, to, col, speed, {
          arc: 7.2,
          side: (i % 2 === 0 ? -1 : 1),
          sideScale: 2.6,
          swirlAmp: 0.7,
          swirlFreq: 10.5,
          sword: swordOptions,
          onHit: ()=>{
            if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;
            const heavy = (Math.random() < 0.12);
            combat.hitReact(attacker, defender, heavy);
            combat.applyDamage(attacker, defender, dmgEach);
          }
        });
      }
    });
  }
}
