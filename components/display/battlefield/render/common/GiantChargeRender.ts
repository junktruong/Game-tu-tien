import type { GameEvent } from "../../core/types";
import type { RenderContext, RenderHandler } from "../types";
import { SKILLS } from "../../config";

export class GiantChargeRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type === "GIANT_CHARGE_START") {
      const maxRings = 3;
      const countPerRing = Math.max(
        1,
        Math.ceil((SKILLS.GIANT.meta?.shots ?? 30) / maxRings),
      );
      if (ctx.fighters?.[event.attacker]?.setIdleHold) {
        ctx.fighters[event.attacker].setIdleHold("Levitate Entrance");
      }
      if (ctx.fighters?.[event.attacker]?.playLoopClip) {
        ctx.fighters[event.attacker].playLoopClip("Levitate Entrance");
      }
      if (typeof ctx.vfx.startGiantCharge === "function") {
        ctx.vfx.startGiantCharge(ctx.fighters[event.attacker], ctx.core.getColor(event.attacker), event.attacker, {
          ringEverySec: 1.0,
          maxRings,
          baseHeight: 8.2,
          heightStep: 4.2,
          baseRadius: 7.2,
          radiusStep: 4.0,
          spin: 3.4,
          countPerRing,
          tiltX: -0.18,
        });
      }
      return true;
    }

    if (event.type === "GIANT_CHARGE_STOP") {
      if (ctx.fighters?.[event.attacker]?.setIdleHold) {
        ctx.fighters[event.attacker].setIdleHold("Levitate Entrance", 0.6);
      }
      if (ctx.fighters?.[event.attacker]?.playLoopClip) {
        ctx.fighters[event.attacker].playLoopClip("Levitate Entrance");
      }
      if (ctx.vfx?.projectiles) {
        ctx.vfx.projectiles.push({
          __delayedStopGiant: true,
          __delay: 0.8,
          __ownerIndex: event.attacker,
        });
      } else if (typeof ctx.vfx.stopGiantCharge === "function") {
        ctx.vfx.stopGiantCharge(event.attacker);
      }
      return true;
    }

    return false;
  }
}
