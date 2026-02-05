export type EffectState = {
  wallUntil: number;
  sphereUntil: number;
  parryUntil: number;
  lotusUntil: number;
};

export type ComboState = {
  count: number;
  lastAt: number;
};

export type PlayerState = {
  hp: number;
  qi: number;
  ult: number;
  cd: Record<string, number>;
  effect: EffectState;
  combo: ComboState;
  lastSkill: string;
  statusTag: string;
};

export type GameState = {
  players: PlayerState[];
  timeMs: number;
  hitstop: number;
};

export type SkillCastEvent = {
  type: "SKILL_CAST";
  skillId: string;
  attacker: number;
  defender: number;
  info?: Record<string, unknown>;
};

export type SkillHitEvent = {
  type: "SKILL_HIT";
  skillId: string;
  attacker: number;
  defender: number;
  heavy: boolean;
  index?: number;
  count?: number;
  info?: Record<string, unknown>;
};

export type GameEvent =
  | { type: "STATE"; state: GameState }
  | { type: "BANNER"; text: string; sticky?: boolean }
  | { type: "TOAST"; text: string }
  | { type: "SHAKE"; amount: number }
  | { type: "GIANT_CHARGE_START"; attacker: number }
  | { type: "GIANT_CHARGE_STOP"; attacker: number }
  | SkillCastEvent
  | SkillHitEvent;
