import type { GameEvent } from "../../core/types";
import type { RenderContext, RenderHandler } from "../types";

export class StateDamageRender implements RenderHandler {
  lastHp: number[];
  lastHitAt: number[];

  constructor() {
    this.lastHp = [];
    this.lastHitAt = [];
  }

  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type !== "STATE") return false;
    const now = performance.now();

    for (let i = 0; i < event.state.players.length; i += 1) {
      const hp = event.state.players[i].hp;
      const prev = this.lastHp[i];
      this.lastHp[i] = hp;
      if (prev == null) {
        continue;
      }

      const dmg = prev - hp;
      if (dmg <= 0) continue;

      const fighter = ctx.fighters[i];
      if (fighter?.hitLockUntil && now < fighter.hitLockUntil) {
        continue;
      }

      if (now - (this.lastHitAt[i] || 0) < 80) {
        continue;
      }

      this.lastHitAt[i] = now;
      const heavy = dmg >= 8;
      fighter.setHitFlash(heavy ? 260 : 170);
      fighter.playHit(heavy);
    }

    return false;
  }
}
