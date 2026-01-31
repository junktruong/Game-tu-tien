// public/js/display/skills/WallSkill.js
import { BaseSkill } from "./BaseSkill";

export class WallSkill extends BaseSkill {
  cast(ctx: any, attacker: number){
    const { combat, hud, scheduler, fighters, vfx } = ctx;
    if (!this._prep(ctx, attacker)) return;

    const col = combat.getColor(attacker);
    const durSec = this.def.meta?.durSec ?? 1.2;

    combat.setLastSkill(attacker, "Thiên La Địa Võng");
    hud.setBanner(`🛡️ Player ${attacker+1}: Thiên La Địa Võng`);

    scheduler.schedule(this.def.anim?.charge ?? 0, ()=>{
      combat.players[attacker].effect.wallUntil = performance.now() + durSec * 1000;
      vfx.spawnShield(fighters[attacker], col, "WALL", attacker);
    });
  }
}
