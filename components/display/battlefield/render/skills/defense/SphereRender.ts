import type { GameEvent } from "../../../core/types";
import type { RenderContext, RenderHandler } from "../../types";
import { sphereOnCast } from "../../../vfx/skills/defense/sphereVfx";

export class SphereRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type !== "SKILL_CAST" || event.skillId !== "SPHERE") return false;
    sphereOnCast(ctx, event);
    return true;
  }
}
