// public/js/display/skills/AimSkill.js
import { BaseSkill } from "./BaseSkill.js";

export class AimSkill extends BaseSkill {
  cast(ctx, attacker){
    const { combat, hud } = ctx;
    combat.setLastSkill(attacker, "AIM");
    hud.setBanner(`🎯 P${attacker+1}: AIM`, true);
  }
}
