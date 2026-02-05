import type { GameEvent } from "../../../core/types";
import type { RenderContext, RenderHandler } from "../../types";
import { fanOnCast, fanOnHit } from "../../../vfx/skills/attack/fanVfx";

export class FanRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type === "SKILL_CAST" && event.skillId === "FAN") {
      fanOnCast(ctx, event);
      return true;
    }

    if (event.type === "SKILL_HIT" && event.skillId === "FAN") {
      fanOnHit(ctx, event);
      return true;
    }

    return false;
  }
}
