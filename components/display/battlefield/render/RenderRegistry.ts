import type { GameEvent } from "../core/types";
import type { RenderContext, RenderHandler } from "./types";

import { CastRender } from "./common/CastRender";
import { HitRender } from "./common/HitRender";
import { GiantChargeRender } from "./common/GiantChargeRender";
import { StateDamageRender } from "./common/StateDamageRender";

import { BasicAttackRender } from "./skills/normal/BasicAttackRender";
import { SpinRender } from "./skills/attack/SpinRender";
import { FanRender } from "./skills/attack/FanRender";
import { GiantRender } from "./skills/attack/GiantRender";
import { LotusRender } from "./skills/attack/LotusRender";
import { WallRender } from "./skills/defense/WallRender";
import { SphereRender } from "./skills/defense/SphereRender";
import { ShakaRender } from "./skills/ult/ShakaRender";
import { ParryRender } from "./skills/defense/ParryRender";

export class RenderRegistry {
  handlers: RenderHandler[];

  constructor() {
    this.handlers = [
      new StateDamageRender(),
      new GiantChargeRender(),
      new CastRender(),
      new BasicAttackRender(),
      new SpinRender(),
      new FanRender(),
      new GiantRender(),
      new LotusRender(),
      new WallRender(),
      new SphereRender(),
      new ShakaRender(),
      new ParryRender(),
      new HitRender(),
    ];
  }

  handle(event: GameEvent, ctx: RenderContext) {
    if (event.type === "SKILL_HIT") {
      for (const handler of this.handlers) {
        handler.handle(event, ctx);
      }
      return;
    }

    for (const handler of this.handlers) {
      if (handler.handle(event, ctx)) {
        return;
      }
    }
  }
}
