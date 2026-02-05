import { SKILLS } from "../../config";
import type { GameEvent } from "../../core/types";
import type { RenderContext, RenderHandler } from "../types";

export class CastRender implements RenderHandler {
  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type !== "SKILL_CAST") return false;

    const def = SKILLS[event.skillId] ?? null;
    if (def?.anim) {
      ctx.fighters[event.attacker].playCast(def.anim);
      return false;
    }

    if (event.skillId === "ULT") {
      ctx.fighters[event.attacker].playCast({
        charge: 0.26,
        swing: 0.34,
        step: 0.65,
        lean: 0.1,
        slashFrom: 0.35,
        slashTo: 0.35,
      });
    }

    return false;
  }
}
