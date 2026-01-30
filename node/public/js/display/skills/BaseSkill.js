// public/js/display/skills/BaseSkill.js
export class BaseSkill {
  constructor(def){
    this.def = def;
  }

  cast(ctx, attackerIndex){
    // override ở từng skill
  }

  /**
   * Prep chung:
   * - check canCast
   * - spend qi + set cd
   * - playCast anim (nếu có)
   */
  _prep(ctx, attackerIndex){
    const { combat, hud, fighters } = ctx;
    const def = this.def;

    if (!combat.canCast(attackerIndex, def)){
      hud.showToast(`P${attackerIndex+1} thiếu nội lực / đang hồi!`);
      return false;
    }

    combat.spendQi(attackerIndex, def.cost || 0);
    combat.setCd(attackerIndex, def.id, def.cd || 0);

    if (def.anim) fighters[attackerIndex].playCast(def.anim);
    return true;
  }
}
