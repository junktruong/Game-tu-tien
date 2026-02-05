import type { GameEvent } from "../../../core/types";
import type { RenderContext, RenderHandler } from "../../types";
import { lotusOnCast } from "../../../vfx/skills/attack/lotusVfx";

export class LotusRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type !== "SKILL_CAST" || event.skillId !== "LOTUS") return false;
    lotusOnCast(ctx, event);
    return true;
  }
}
