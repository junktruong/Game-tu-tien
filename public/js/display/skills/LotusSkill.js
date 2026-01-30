// public/js/display/skills/LotusSkill.js
import { BaseSkill } from "./BaseSkill.js";

export class LotusSkill extends BaseSkill {
  cast(ctx, attacker){
    const { combat, hud, scheduler, fighters, vfx } = ctx;

    // lotus cost/cd = 0 vẫn dùng _prep được (không tốn gì)
    if (!this._prep(ctx, attacker)) return;

    const col = combat.getColor(attacker);
    const buffMs = this.def.meta?.buffMs ?? 1500;

    scheduler.schedule(this.def.anim?.charge ?? 0, ()=>{
      combat.players[attacker].effect.lotusUntil = performance.now() + buffMs;
      combat.setLastSkill(attacker, "Liên Hoa Trận");
      hud.setBanner(`🌸 Player ${attacker+1}: Liên Hoa Trận`);
      vfx.spawnBurstAt(fighters[attacker].getCorePos(8.4), col, 1.05);
    });
  }
}
