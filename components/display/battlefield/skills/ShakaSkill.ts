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
      combat.setLastSkill(attacker, "Song Long Quá Hải");
      hud.setBanner(`🐉 P${attacker+1}: SONG LONG QUÁ HẢI!!!`);

      const chargeSec1 = meta.ultChargeSec1 ?? 2.0;
      const chargeSec2 = meta.ultChargeSec2 ?? 2.0;
      const sealDur = chargeSec1 + chargeSec2 + 0.6;

      const col = combat.getColor(attacker);
      const atk = fighters[attacker];

      if (typeof vfx.spawnMagicCircle === "function"){
        vfx.spawnMagicCircle(atk.getCorePos(0.6), col, 1.15, sealDur, 2.6);
        vfx.spawnMagicCircle(atk.getCorePos(11.2), col, 0.45, sealDur, 3.2);
      }

      const hits = meta.ultHits ?? GAME.ultHits;
      const hitDmg = meta.ultHitDmg ?? GAME.ultHitDmg;
      const swayAmp = meta.ultDragonSwayAmp ?? 2.2;
      const swayFreq = meta.ultDragonSwayFreq ?? 8.0;
      const segments = meta.ultDragonSegments ?? 16;
      const segmentGap = meta.ultDragonSegmentGap ?? 0.055;
      const pierceAt = meta.ultDragonPierceAt ?? 0.78;
      const pierceTighten = meta.ultDragonPierceTighten ?? 0.35;
      const pierceStretch = meta.ultDragonPierceStretch ?? 0.55;
      const pierceSquash = meta.ultDragonPierceSquash ?? 0.28;
      const firstHits = Math.max(1, Math.floor(hits / 2));
      const secondHits = Math.max(1, hits - firstHits);

      const summonDragon = (idx: number, pulseCount: number)=>{
        const tgt = combat.getHitPoint(defender);
        vfx.spawnBurstAt(atk.getCorePos(10.8), col, 1.75);
        if (typeof vfx.spawnShockwave === "function"){
          vfx.spawnShockwave(atk.getCorePos(0.6), col, 2.0, 26, 0.42);
          vfx.spawnShockwave(tgt.clone().setY(0.6), col, 1.6, 24, 0.42);
        }

        if (typeof vfx.spawnFireDragon === "function"){
          vfx.spawnFireDragon({
            from: atk.getCorePos(11.6),
            to: tgt.clone().setY(6.0),
            colorHex: col,
            speed: meta.ultDragonSpeed ?? 120,
            arc: (meta.ultDragonArc ?? 9.5) + idx * 0.6,
            segments,
            segmentGap,
            swayAmp,
            swayFreq,
            pierceAt,
            pierceTighten,
            pierceStretch,
            pierceSquash,
            onHit: ()=>{
              if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;

              for (let i=0;i<pulseCount;i++){
                scheduler.schedule(i * 0.08, ()=>{
                  if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;
                  const heavy = (i === 0);
                  combat.hitReact(attacker, defender, heavy);
                  combat.applyDamage(attacker, defender, hitDmg);

                  const hp = combat.getHitPoint(defender);
                  vfx.spawnSlash(hp.clone(), col, Math.random()*0.9);
                  vfx.spawnBurstAt(hp.clone(), col, 1.15);
                });
              }
            }
          });
        }
      };

      scheduler.schedule(chargeSec1, ()=>{
        if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;
        summonDragon(0, firstHits);
      });

      scheduler.schedule(chargeSec1 + chargeSec2, ()=>{
        if (!combat.isAlive(attacker) || !combat.isAlive(defender)) return;
        summonDragon(1, secondHits);
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
