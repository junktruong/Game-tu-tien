import type { GameEvent } from "../../../core/types";
import type { RenderContext, RenderHandler } from "../../types";
import { basicAttackOnHit } from "../../../vfx/skills/normal/basicAttackVfx";

export class BasicAttackRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type !== "SKILL_HIT") return false;
    if (event.skillId !== "BASIC_ATTACK") return false;
    return basicAttackOnHit(ctx, event);
  }
}
