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

      fighters[attacker].playCast({ charge:0.26, swing:0.34, step:0.65, lean:0.10, slashFrom:0.35, slashTo:0.35 });
      combat.setLastSkill(attacker, "Hỏa Long Ấn");
      hud.setBanner(`🐉 P${attacker+1}: HỎA LONG ẤN!!!`);

      const chargeSec = 0.45;
      const sealDur = 0.7;
      const sealHeights = [11.5, 14.2, 16.6];

      const col = combat.getColor(attacker);
      const atk = fighters[attacker];

      if (typeof vfx.startGiantCharge === "function"){
        vfx.startGiantCharge(atk, col, attacker, {
          ringEverySec: 0.16,
          maxRings: 3,
          baseHeight: 10.0,
          heightStep: 2.4,
          baseRadius: 6.6,
          radiusStep: 2.2,
          spin: 3.6,
          countPerRing: 10
        });
      }

      for (let i=0;i<sealHeights.length;i++){
        if (typeof vfx.spawnMagicCircle === "function"){
          vfx.spawnMagicCircle(atk.getCorePos(sealHeights[i]), col, 0.35 + i * 0.05, sealDur, 2.4 + i * 0.7);
        }
      }

      scheduler.schedule(chargeSec, ()=>{
        if (typeof vfx.stopGiantCharge === "function"){
          vfx.stopGiantCharge(attacker);
        }

        const tgt = combat.getHitPoint(defender);

        // ấn chú dưới người + dưới mục tiêu
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

        const hits = meta.ultHits ?? GAME.ultHits;
        const hitDmg = meta.ultHitDmg ?? GAME.ultHitDmg;
        const totalDmg = hitDmg * hits;
        const pulses = Math.max(2, Math.min(4, hits));
        const dmgPerPulse = Math.ceil(totalDmg / pulses);

        if (typeof vfx.spawnFireDragon === "function"){
          vfx.spawnFireDragon({
            from: atk.getCorePos(12.2),
            to: tgt.clone().setY(6.0),
            colorHex: col,
            speed: meta.ultProjectileSpeed ?? 120,
            arc: 9.5,
            segments: 12,
            segmentGap: 0.07,
            swayAmp: 1.8,
            swayFreq: 7.2,
            onHit: ()=>{
              if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

              for (let i=0;i<pulses;i++){
                scheduler.schedule(i * 0.08, ()=>{
                  if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;
                  const heavy = (i === 0);
                  combat.hitReact(attacker, defender, heavy);
                  combat.applyDamage(attacker, defender, dmgPerPulse);

                  const hp = combat.getHitPoint(defender);
                  vfx.spawnSlash(hp.clone(), col, Math.random()*0.9);
                  vfx.spawnBurstAt(hp.clone(), col, 1.15);
                });
              }
            }
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
