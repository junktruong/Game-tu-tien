// public/js/display/skills/GiantSkill.js
import { BaseSkill } from "./BaseSkill";

export class GiantSkill extends BaseSkill {
  cast(ctx: any, attacker: number){
    const { combat, hud, scheduler, fighters, vfx } = ctx;
    const defender = (attacker === 0) ? 1 : 0;
    if (!this._prep(ctx, attacker)) return;

    const THREE = window.THREE;
    const col = combat.getColor(attacker);
    const meta = this.def.meta || {};

    // NEW: GIANT -> Tam Nhẫn Kiếm Chỉ (mưa kiếm thấp)
    const shots = meta.shots ?? 12;
    const dmgEach = meta.dmgEach ?? 3;

    combat.setLastSkill(attacker, "Tam Nhẫn Kiếm Chỉ");
    hud.setBanner(`🌸 P${attacker+1}: TAM NHẪN KIẾM CHỈ`);

    scheduler.schedule(this.def.anim?.charge ?? 0, ()=>{
      if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

      // ưu tiên dùng VFX charge-fire (nếu có)
      // NEW: nếu đang charge ring -> bắn lần lượt từng kiếm trong vòng
      // NEW: bắn toàn bộ kiếm từ stacked rings
      if (typeof vfx.fireGiantFromStackedRings === "function"){
        const fired = vfx.fireGiantFromStackedRings({
          ownerIndex: attacker,
          getTargetPos: () => combat.getHitPoint(defender),
          speed: 200,
          arc: 2.2,
          cadenceSec: meta.cadenceSec ?? 0.06,
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
      const from = fighters[attacker].getCorePos(6.2);
      const speed = meta.projectileSpeed ?? 150;
      for (let i=0;i<shots;i++){
        const spread = (i - (shots - 1) / 2) * 0.28;
        const to = combat.getHitPoint(defender).clone().add(new THREE.Vector3(spread, 0.1 + Math.sin(i * 0.6) * 0.12, 0));
        const onHit = ()=>{
          if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;
          const heavy = (Math.random() < 0.12);
          combat.hitReact(attacker, defender, heavy);
          combat.applyDamage(attacker, defender, dmgEach);
        };
        vfx.spawnProjectileBezier(from, to, col, speed, {
          arc: 4.2,
          side: (i % 2 === 0 ? -1 : 1),   // xen kẽ trái phải
          sideScale: 1.8,
          swirlAmp: 0.45,
          swirlFreq: 8.0,
          onHit
        });
      }
    });
  }
}
