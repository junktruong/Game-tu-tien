import type { GameEvent } from "../../../core/types";
import type { RenderContext, RenderHandler } from "../../types";
import { shakaOnCast } from "../../../vfx/skills/ult/shakaVfx";

export class ShakaRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type !== "SKILL_CAST" || event.skillId !== "ULT") return false;
    shakaOnCast(ctx, event);
    return true;
  }
}
