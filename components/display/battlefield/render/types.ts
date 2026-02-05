import type { GameEvent } from "../core/types";
import type { GameCore } from "../core/GameCore";
import type { Scheduler } from "../utils";

export type RenderContext = {
  core: GameCore;
  fighters: any[];
  vfx: any;
  scheduler: Scheduler;
};

export interface RenderHandler {
  handle(event: GameEvent, ctx: RenderContext): boolean;
}
