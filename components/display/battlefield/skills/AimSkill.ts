// public/js/display/skills/AimSkill.js
import { BaseSkill } from "./BaseSkill";

export class AimSkill extends BaseSkill {
  cast(ctx: any, attacker: number){
    const { combat, hud } = ctx;
    combat.setLastSkill(attacker, "AIM");
    hud.setBanner(`🎯 P${attacker+1}: AIM`, true);
  }
}
