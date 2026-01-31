// public/js/display/skills/SkillRegistry.js
import { SKILLS } from "../config";

import { BasicAttackSkill } from "./BasicAttackSkill";
import { SpinSkill } from "./SpinSkill";
import { GiantSkill } from "./GiantSkill";
import { FanSkill } from "./FanSkill";
import { LotusSkill } from "./LotusSkill";

import { WallSkill } from "./WallSkill";
import { SphereSkill } from "./SphereSkill";
import { ShakaSkill } from "./ShakaSkill";

import { AimSkill } from "./AimSkill";

export class SkillRegistry {
  byGesture: Map<string, any>;
  skills: any[];

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

  handleGesture(ctx: any, playerNum: number, gesture: string){
    const attacker = (playerNum === 1) ? 0 : 1;
    const key = String(gesture || "").toUpperCase();
    const skill = this.byGesture.get(key);
    if (!skill) return;
    if (!ctx.combat.isAlive(0) || !ctx.combat.isAlive(1)) return;
    skill.cast(ctx, attacker);
  }
}
