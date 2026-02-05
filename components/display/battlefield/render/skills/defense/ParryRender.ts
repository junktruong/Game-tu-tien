import type { GameEvent } from "../../../core/types";
import type { RenderContext, RenderHandler } from "../../types";
import { parryOnHit } from "../../../vfx/skills/defense/parryVfx";

export class ParryRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type !== "SKILL_HIT" || event.skillId !== "PARRY") return false;
    parryOnHit(ctx, event);
    return true;
  }
}
