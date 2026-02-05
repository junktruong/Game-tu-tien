// public/js/display/skills/FanSkill.js
import { BaseSkill } from "./BaseSkill";

export class FanSkill extends BaseSkill {
  cast(ctx: any, attacker: number){
    const { combat, hud, scheduler, fighters, vfx } = ctx;
    const defender = (attacker === 0) ? 1 : 0;
    if (!this._prep(ctx, attacker)) return;

    const THREE = window.THREE;
    const col = combat.getColor(attacker);
    const meta = this.def.meta || {};

    const orbitSec = meta.orbitSec ?? 2.0;
    const orbitSwords = meta.orbitSwords ?? 1200;

    const shots = meta.shots ?? 1;
    const shotSpeed = meta.shotSpeed ?? 120;
    const shotArc = meta.shotArc ?? 3.8;
    const dmgEach = meta.dmgEach ?? 18;

    const spread = meta.spread ?? 3.0;
    const cadenceSec = meta.cadenceSec ?? 0.06;

    combat.setLastSkill(attacker, "Việt Tự Kiếm Tiên");
    hud.setBanner(`🌀 P${attacker+1}: VIỆT TỰ KIẾM TIÊN`);

    scheduler.schedule(this.def.anim?.charge ?? 0, ()=>{
      if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

      // Nếu có playVankiemUlt => dùng luôn (đẹp đúng kiểu “quay vòng trên đầu rồi bắn”)
      if (typeof vfx.playVankiemUlt === "function"){
        vfx.playVankiemUlt({
          fromFighter: fighters[attacker],
          getTargetPos: () => combat.getHitPoint(defender).clone().setY(7.0),
          colorHex: col,

          visualSwords: orbitSwords,
          hits: 1,
          orbitSec: orbitSec,
          launchSec: 0.35,
          spread: spread,
          arc: shotArc,
          singleLaunch: true,
          bigScale: 3.6,
          gatherRadiusStart: 14,
          gatherRadiusEnd: 6.5,

          onHit: ()=>{
            if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

            const heavy = (Math.random() < 0.18);
            combat.hitReact(attacker, defender, heavy);
            combat.applyDamage(attacker, defender, dmgEach);

            // thêm 1 slash phụ cho cảm giác "dày"
            const hp = combat.getHitPoint(defender);
            vfx.spawnSlash(hp.clone().add(new THREE.Vector3((defender===0?-1:1)*0.6, 0.0, 0)), col, Math.random()*0.8);
          }
        });

        return;
      }

      // ===== Fallback (nếu VFXManager chưa có playVankiemUlt) =====
      // Orbit giả bằng slash quanh đầu
      const head = fighters[attacker].getCorePos(11.0);
      const steps = Math.max(10, Math.floor(orbitSec / 0.08));

      for (let i = 0; i < steps; i++){
        scheduler.schedule(i * (orbitSec / steps), ()=>{
          if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

          const a = (i / steps) * Math.PI * 2 * 2.0 * (attacker===0?1:-1);
          const r = 8.5 - (i / steps) * 3.0;
          const p = head.clone().add(new THREE.Vector3(Math.cos(a)*r, Math.sin(a*0.7)*1.2, 0));
          vfx.spawnSlash(p, col, a);
          vfx.spawnBurstAt(p, col, 0.45);
        });
      }

      // Sau orbit thì bắn theo cadence
      scheduler.schedule(orbitSec, ()=>{
        for (let s = 0; s < shots; s++){
          scheduler.schedule(s * cadenceSec, ()=>{
            if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

            const from = fighters[attacker].getMuzzlePos();
            const to = combat.getHitPoint(defender).clone().add(new THREE.Vector3(
              (Math.random()-0.5)*spread,
              (Math.random()-0.5)*0.8,
              0
            ));

            vfx.spawnSlash(from.clone(), col, (attacker===0?0.45:-0.45));

            const bigSword = vfx.swordFactory?.createSwordProjectile?.(col);
            if (bigSword){
              bigSword.scale.setScalar(3.6);
              bigSword.position.copy(from);
              vfx.scene.add(bigSword);
              const dist = from.distanceTo(to);
              const travel = Math.max(0.12, dist / Math.max(1, shotSpeed));
              vfx.projectiles.push({
                mesh: bigSword,
                t: 0,
                travel,
                start: from.clone(),
                end: to.clone(),
                wobble: 0.2,
                arc: shotArc,
                onHit: ()=>{
                  if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

                  const heavy = true;
                  combat.hitReact(attacker, defender, heavy);
                  combat.applyDamage(attacker, defender, dmgEach);
                  vfx.spawnBurstAt(to.clone(), col, 1.2);
                }
              });
              return;
            }

            vfx.spawnProjectileToTarget(from, to, col, shotSpeed, 1.0, shotArc, ()=>{
              if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

              const heavy = (s === shots - 1);
              combat.hitReact(attacker, defender, heavy);
              combat.applyDamage(attacker, defender, dmgEach);
              vfx.spawnBurstAt(to.clone(), col, 0.9);
            });
          });
        }
      });
    });
  }
}
