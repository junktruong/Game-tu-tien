import type { GameEvent } from "../../core/types";
import type { RenderContext, RenderHandler } from "../types";

export class GiantChargeRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type === "GIANT_CHARGE_START") {
      if (typeof ctx.vfx.startGiantCharge === "function") {
        ctx.vfx.startGiantCharge(ctx.fighters[event.attacker], ctx.core.getColor(event.attacker), event.attacker, {
          ringEverySec: 0.7,
          maxRings: 3,
          baseHeight: 8.2,
          heightStep: 4.2,
          baseRadius: 7.2,
          radiusStep: 4.0,
          spin: 3.4,
          countPerRing: 10,
          tiltX: -0.18,
        });
      }
      return true;
    }

    if (event.type === "GIANT_CHARGE_STOP") {
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
