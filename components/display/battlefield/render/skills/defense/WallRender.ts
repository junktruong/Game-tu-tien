import type { GameEvent } from "../../../core/types";
import type { RenderContext, RenderHandler } from "../../types";
import { wallOnCast } from "../../../vfx/skills/defense/wallVfx";

export class WallRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type !== "SKILL_CAST" || event.skillId !== "WALL") return false;
    wallOnCast(ctx, event);
    return true;
  }
}
