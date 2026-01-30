// public/js/display/skills/SkillRegistry.js
import { SKILLS } from "../config.js";

import { BasicAttackSkill } from "./BasicAttackSkill.js";
import { SpinSkill } from "./SpinSkill.js";
import { GiantSkill } from "./GiantSkill.js";
import { FanSkill } from "./FanSkill.js";
import { LotusSkill } from "./LotusSkill.js";

import { WallSkill } from "./WallSkill.js";
import { SphereSkill } from "./SphereSkill.js";
import { ShakaSkill } from "./ShakaSkill.js";

import { AimSkill } from "./AimSkill.js";

export class SkillRegistry {
  constructor(){
    this.byGesture = new Map();

    this.skills = [
      new BasicAttackSkill(SKILLS.BASIC_ATTACK),
      new SpinSkill(SKILLS.SPIN),
      new GiantSkill(SKILLS.GIANT),
      new FanSkill(SKILLS.FAN),
      new LotusSkill(SKILLS.LOTUS),

      new WallSkill(SKILLS.WALL),
      new SphereSkill(SKILLS.SPHERE),
      new ShakaSkill(SKILLS.SHAKA),

      new AimSkill(SKILLS.AIM),
    ];

    for (const s of this.skills){
      this.byGesture.set(String(s.def.gesture || "").toUpperCase(), s);
    }
  }

  handleGesture(ctx, playerNum, gesture){
    const attacker = (playerNum === 1) ? 0 : 1;
    const key = String(gesture || "").toUpperCase();
    const skill = this.byGesture.get(key);
    if (!skill) return;
    if (!ctx.combat.isAlive(0) || !ctx.combat.isAlive(1)) return;
    skill.cast(ctx, attacker);
  }
}
