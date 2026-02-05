import type { GameEvent } from "../../../core/types";
import type { RenderContext, RenderHandler } from "../../types";
import { giantOnCast } from "../../../vfx/skills/attack/giantVfx";

export class GiantRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type !== "SKILL_CAST" || event.skillId !== "GIANT") return false;

    giantOnCast(ctx, event);
    return true;
  }
}
