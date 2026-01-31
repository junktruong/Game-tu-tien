// public/js/display/skills/ShakaSkill.js
import { BaseSkill } from "./BaseSkill";
import { GAME } from "../config";
import { clamp } from "../utils";

export class ShakaSkill extends BaseSkill {
  cast(ctx: any, attacker: number){
    const { combat, hud, scheduler, fighters, vfx } = ctx;
    const defender = (attacker === 0) ? 1 : 0;

    const meta = this.def.meta || {};

    // ===== ULT nếu đủ =====
    if (combat.players[attacker].ult >= GAME.ultMax && combat.getCd(attacker, "ULT") <= 0){
      combat.players[attacker].ult = 0;
      combat.setCd(attacker, "ULT", meta.ultCd || 10.0);

      fighters[attacker].playCast({ charge:0.24, swing:0.30, step:0.65, lean:0.08, slashFrom:0.35, slashTo:0.35 });
      combat.setLastSkill(attacker, "Vạn Kiếm Quy Tông");
      hud.setBanner(`⚡ P${attacker+1}: VẠN KIẾM QUY TÔNG!!!`);

      scheduler.schedule(0.12, ()=>{
        const col = combat.getColor(attacker);
        const atk = fighters[attacker];
        const tgt = combat.getHitPoint(defender);

        // ma pháp trận dưới người + dưới mục tiêu
        if (typeof vfx.spawnMagicCircle === "function"){
          vfx.spawnMagicCircle(atk.getCorePos(0.6), col, 1.0, 0.95, 2.6);
          vfx.spawnMagicCircle(tgt.clone().setY(0.6), col, 1.15, 0.95, -2.2);
        }

        // tụ lực thêm
        vfx.spawnBurstAt(atk.getCorePos(11.0), col, 1.75);
        if (typeof vfx.spawnShockwave === "function"){
          vfx.spawnShockwave(atk.getCorePos(0.6), col, 2.0, 26, 0.42);
          vfx.spawnShockwave(tgt.clone().setY(0.6), col, 1.6, 24, 0.42);
        }

        // ULT swarm (instanced)
        const hits = meta.ultHits ?? GAME.ultHits;
        const hitDmg = meta.ultHitDmg ?? GAME.ultHitDmg;

        vfx.playVankiemUlt({
          fromFighter: atk,
          getTargetPos: () => combat.getHitPoint(defender),
          colorHex: col,
          visualSwords: meta.ultVisualSwords ?? 84,
          hits,
          orbitSec: meta.ultOrbitSec ?? 0.58,
          launchSec: meta.ultLaunchSec ?? 0.78,
          spread: meta.ultSpread ?? 3.4,
          arc: meta.ultArc ?? 10.5,
          onHit: ()=>{
            if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

            const heavy = (Math.random() < 0.28);
            combat.hitReact(attacker, defender, heavy);
            combat.applyDamage(attacker, defender, hitDmg);

            // thêm slash/impact cho “dày”
            const hp = combat.getHitPoint(defender);
            vfx.spawnSlash(hp.clone(), col, Math.random()*0.9);
            vfx.spawnBurstAt(hp.clone(), col, 0.95);
          }
        });

        // ===== thêm "mưa kiếm" visual-only từ trời xuống mục tiêu (đẹp hơn nhiều) =====
        const rain = 18;
        const height = 46;
        const spread = 14;
        for (let i=0;i<rain;i++){
          scheduler.schedule(0.18 + i*0.03, ()=>{
            if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

            const hp = combat.getHitPoint(defender);
            const end = hp.clone().add(new window.THREE.Vector3(
              (Math.random()-0.5)*spread,
              (Math.random()-0.5)*4.0,
              (Math.random()-0.5)*2.0
            ));
            const start = end.clone().add(new window.THREE.Vector3(
              (Math.random()-0.5)*1.0,
              height + Math.random()*10,
              (Math.random()-0.5)*1.0
            ));

            vfx.spawnProjectileToTarget(start, end, col, 120, 0.05, 0.0, ()=>{
              vfx.spawnBurstAt(end.clone(), col, 0.8);
              if (typeof vfx.spawnShockwave === "function"){
                vfx.spawnShockwave(end.clone().setY(0.6), col, 1.0, 16, 0.26);
              }
            });
          });
        }
      });

      return;
    }

    // ===== Heal thường =====
    if (!this._prep(ctx, attacker)) return;

    const heal = meta.heal ?? 12;
    const ultGain = meta.ultGain ?? 6;

    scheduler.schedule(this.def.anim?.charge ?? 0, ()=>{
      combat.players[attacker].hp = clamp(combat.players[attacker].hp + heal, 0, GAME.hpMax);
      combat.addUlt(attacker, ultGain);

      combat.setLastSkill(attacker, "Hồi Kiếm Thuật");
      hud.setBanner(`✨ P${attacker+1}: Hồi Kiếm Thuật`);
      vfx.spawnBurstAt(fighters[attacker].getCorePos(9.2), combat.getColor(attacker), 1.15);
    });
  }
}
