import type { GameEvent } from "../../../core/types";
import type { RenderContext, RenderHandler } from "../../types";
import { spinOnCast, spinOnHit } from "../../../vfx/skills/attack/spinVfx";

export class SpinRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type === "SKILL_CAST" && event.skillId === "SPIN") {
      spinOnCast(ctx, event);
      return true;
    }

    if (event.type === "SKILL_HIT" && event.skillId === "SPIN") {
      spinOnHit(ctx, event);
      return true;
    }

    return false;
  }
}
