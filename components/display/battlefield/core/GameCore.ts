import { GAME, SKILLS } from "../config";
import { clamp, Scheduler } from "../utils";
import type { GameEvent, GameState, PlayerState } from "./types";

type SkillDef = Omit<typeof SKILLS[keyof typeof SKILLS], "meta"> & {
  meta: Record<string, number>;
};

type CoreOptions = {
  onEvent?: (event: GameEvent) => void;
};

const makePlayer = (): PlayerState => {
  return {
    hp: GAME.hpMax,
    qi: GAME.qiMax,
    ult: 0,
    cd: {},
    effect: {
      wallUntil: 0,
      sphereUntil: 0,
      parryUntil: 0,
      lotusUntil: 0,
    },
    combo: { count: 0, lastAt: 0 },
    lastSkill: "—",
    statusTag: "—",
  };
};

export class GameCore {
  state: GameState;
  scheduler: Scheduler;
  onEvent?: (event: GameEvent) => void;
  vfxColorOverride: Array<number | null>;

  constructor({ onEvent }: CoreOptions = {}) {
    this.onEvent = onEvent;
    this.scheduler = new Scheduler();
    this.vfxColorOverride = [null, null];
    this.state = {
      players: [makePlayer(), makePlayer()],
      timeMs: 0,
      hitstop: 0,
    };
  }

  emit(event: GameEvent) {
    if (this.onEvent) {
      this.onEvent(event);
    }
  }

  getState() {
    return this.state;
  }

  getColor(i: number) {
    const override = this.vfxColorOverride?.[i];
    if (typeof override === "number") return override;
    return i === 0 ? 0x00ffff : 0xff4fd8;
  }

  setVfxColor(i: number, colorHex: number | null) {
    if (!this.vfxColorOverride) this.vfxColorOverride = [null, null];
    this.vfxColorOverride[i] = typeof colorHex === "number" ? colorHex : null;
  }

  isAlive(i: number) {
    return this.state.players[i].hp > 0;
  }

  setCd(i: number, skillId: string, sec: number) {
    this.state.players[i].cd[skillId] = Math.max(0, sec || 0);
  }

  getCd(i: number, skillId: string) {
    return this.state.players[i].cd[skillId] || 0;
  }

  addUlt(i: number, amt: number) {
    this.state.players[i].ult = clamp(this.state.players[i].ult + amt, 0, GAME.ultMax);
  }

  spendQi(i: number, cost: number) {
    this.state.players[i].qi = clamp(this.state.players[i].qi - (cost || 0), 0, GAME.qiMax);
  }

  canCast(i: number, { id, cost = 0 }: { id: string; cost?: number }) {
    if (!this.isAlive(0) || !this.isAlive(1)) return false;
    if (this.getCd(i, id) > 0) return false;
    if (this.state.players[i].qi < cost) return false;
    return true;
  }

  setLastSkill(i: number, text: string) {
    this.state.players[i].lastSkill = text;
  }

  setStatusTag(i: number, text: string) {
    this.state.players[i].statusTag = text;
  }

  handleGiantCharge(attacker: number, active: boolean) {
    if (active) {
      this.emit({ type: "GIANT_CHARGE_START", attacker });
    } else {
      this.emit({ type: "GIANT_CHARGE_STOP", attacker });
    }
  }

  handleGesture(playerNum: number, gesture: string) {
    const attacker = playerNum === 1 ? 0 : 1;
    const key = String(gesture || "").toUpperCase();

    if (key === "GIANT_CHARGE") {
      this.handleGiantCharge(attacker, true);
      return;
    }
    if (key === "GIANT_CANCEL") {
      this.handleGiantCharge(attacker, false);
      return;
    }

    const skill = this.findSkillByGesture(key);
    if (!skill) return;
    this.castSkill(attacker, skill);
  }

  findSkillByGesture(gesture: string): SkillDef | null {
    for (const key of Object.keys(SKILLS)) {
      const def = SKILLS[key as keyof typeof SKILLS];
      if (String(def.gesture || "").toUpperCase() === gesture) {
        return def as SkillDef;
      }
    }
    return null;
  }

  prepSkill(attacker: number, def: SkillDef) {
    if (!this.canCast(attacker, def)) {
      this.emit({ type: "TOAST", text: `P${attacker + 1} thiếu nội lực / đang hồi!` });
      return false;
    }

    this.spendQi(attacker, def.cost || 0);
    this.setCd(attacker, def.id, def.cd || 0);
    return true;
  }

  applyDamage(
    attacker: number,
    defender: number,
    rawDmg: number,
    heavy: boolean,
    hitstopScale = 1,
  ) {
    const now = this.state.timeMs;
    let dmg = rawDmg;

    const parryActive = this.state.players[defender].effect.parryUntil > now;
    if (parryActive) {
      dmg *= 0.15;
      const reflect = rawDmg * 0.35;
      this.state.players[attacker].hp = clamp(this.state.players[attacker].hp - reflect, 0, GAME.hpMax);

      this.setStatusTag(defender, "PARRY!");
      this.addUlt(defender, 10);
      this.emit({ type: "SHAKE", amount: 0.65 });
      this.emit({ type: "SKILL_HIT", skillId: "PARRY", attacker: defender, defender: attacker, heavy: false, info: { reflect } });
      this.state.hitstop = Math.max(
        this.state.hitstop,
        GAME.hitstopLight * hitstopScale,
      );

      this.state.players[defender].hp = clamp(this.state.players[defender].hp - dmg, 0, GAME.hpMax);
      return;
    }

    if (this.state.players[defender].effect.sphereUntil > now) dmg *= 0.1;
    else if (this.state.players[defender].effect.wallUntil > now) dmg *= 0.2;

    this.state.players[defender].hp = clamp(this.state.players[defender].hp - dmg, 0, GAME.hpMax);

    this.addUlt(attacker, clamp(dmg * 0.65, 1, 12));
    this.addUlt(defender, clamp(dmg * 0.25, 0.5, 6));

    this.state.hitstop = Math.max(
      this.state.hitstop,
      (heavy ? GAME.hitstopHeavy : GAME.hitstopLight) * hitstopScale,
    );

    if (this.state.players[defender].hp <= 0) {
      this.emit({ type: "BANNER", text: `🏆 PLAYER ${attacker + 1} THẮNG!` });
    }
  }

  castSkill(attacker: number, def: SkillDef) {
    const defender = attacker === 0 ? 1 : 0;

    switch (def.id) {
      case "BASIC_ATTACK": {
        const now = this.state.timeMs;
        const combo = this.state.players[attacker].combo;
        if (now - combo.lastAt > GAME.comboWindowMs) combo.count = 0;
        combo.count = clamp(combo.count + 1, 1, GAME.comboMax);
        combo.lastAt = now;

        if (!this.prepSkill(attacker, def)) return;

        if (combo.count === 1) {
          this.setLastSkill(attacker, "Phá Thiên Kích · Nhất Thức");
          this.emit({ type: "BANNER", text: `⚔️ P${attacker + 1}: Nhất Thức` });

          this.scheduler.schedule(def.anim?.charge ?? 0, () => {
            if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
            this.emit({ type: "SKILL_CAST", skillId: def.id, attacker, defender, info: { combo: 1 } });
            this.emit({ type: "SKILL_HIT", skillId: def.id, attacker, defender, heavy: false, info: { combo: 1 } });
            this.applyDamage(attacker, defender, def.meta.combo1Dmg, false);
          });
          return;
        }

        if (combo.count === 2) {
          this.setLastSkill(attacker, "Phá Thiên Kích · Liên Trảm");
          this.emit({ type: "BANNER", text: `⚔️ P${attacker + 1}: Liên Trảm` });

          this.scheduler.schedule(def.anim?.charge ?? 0, () => {
            if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
            const hits = def.meta.combo2Hits;
            for (let k = 0; k < hits; k += 1) {
              this.scheduler.schedule(0.08 + k * 0.09, () => {
                if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
                this.emit({ type: "SKILL_HIT", skillId: def.id, attacker, defender, heavy: false, index: k, count: hits, info: { combo: 2 } });
                this.applyDamage(attacker, defender, def.meta.combo2DmgEach, false);
              });
            }
          });
          return;
        }

        this.setLastSkill(attacker, "Phá Thiên Kích · Phá Thiên");
        this.emit({ type: "BANNER", text: `🔥 P${attacker + 1}: PHÁ THIÊN!` });

        this.scheduler.schedule(def.anim?.charge ?? 0, () => {
          if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
          const count = def.meta.combo3Projectiles;
          const dmgEach = def.meta.combo3TotalDmg / count;
          for (let k = 0; k < count; k += 1) {
            this.scheduler.schedule(0.02 + k * 0.04, () => {
              if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
              const heavy = k === Math.floor(count / 2);
              this.emit({ type: "SKILL_HIT", skillId: def.id, attacker, defender, heavy, index: k, count, info: { combo: 3 } });
              this.applyDamage(attacker, defender, dmgEach, heavy);
            });
          }
        });
        combo.count = 0;
        return;
      }

      case "SPIN": {
        if (!this.prepSkill(attacker, def)) return;
        this.setLastSkill(attacker, "Kiếm Vũ · Vòng Xoáy");
        this.emit({ type: "BANNER", text: `🌪️ P${attacker + 1}: KIẾM VŨ VÒNG XOÁY` });

        const durationSec = def.meta.durationSec ?? 0.85;
        const ticks = def.meta.ticks ?? 4;
        const tickDmg = def.meta.tickDmg ?? 6;

        this.scheduler.schedule(def.anim?.charge ?? 0, () => {
          if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
          this.emit({ type: "SKILL_CAST", skillId: def.id, attacker, defender });

          for (let ti = 0; ti < ticks; ti += 1) {
            this.scheduler.schedule(ti * (durationSec / ticks), () => {
              if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
              const heavy = ti === ticks - 1;
              this.emit({ type: "SKILL_HIT", skillId: def.id, attacker, defender, heavy, index: ti, count: ticks });
              this.applyDamage(attacker, defender, tickDmg, heavy);
            });
          }
        });
        return;
      }

      case "GIANT": {
        if (!this.prepSkill(attacker, def)) return;
        this.setLastSkill(attacker, "Tam Nhẫn Kiếm Chỉ");
        this.emit({ type: "BANNER", text: `🌸 P${attacker + 1}: TAM NHẪN KIẾM CHỈ` });

        const shots = def.meta.shots ?? 12;
        const cadenceSec = def.meta.cadenceSec ?? 0.12;
        const dmgEach = def.meta.dmgEach ?? 3;
        const hitDelay = def.meta.hitDelaySec ?? Math.max(0.24, cadenceSec * 3.2);
        const ringStride = Math.max(1, Math.round(shots / 3));

        this.scheduler.schedule(def.anim?.charge ?? 0, () => {
          if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
          this.emit({ type: "SKILL_CAST", skillId: def.id, attacker, defender });

          for (let i = 0; i < shots; i += 1) {
            this.scheduler.schedule(i * cadenceSec + hitDelay, () => {
              if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
              const heavy = i === shots - 1 || (i + 1) % ringStride === 0;
              this.emit({ type: "SKILL_HIT", skillId: def.id, attacker, defender, heavy, index: i, count: shots });
              this.applyDamage(attacker, defender, dmgEach, heavy, heavy ? 0.55 : 0.32);
            });
          }
        });
        return;
      }

      case "FAN": {
        if (!this.prepSkill(attacker, def)) return;
        this.setLastSkill(attacker, "Việt Tự Kiếm Tiên");
        this.emit({ type: "BANNER", text: `🌀 P${attacker + 1}: VIỆT TỰ KIẾM TIÊN` });

        const shots = def.meta.shots ?? 1;
        const cadenceSec = def.meta.cadenceSec ?? 0.06;
        const dmgEach = def.meta.dmgEach ?? 18;
        const orbitSec = def.meta.orbitSec ?? 2.0;
        const hitDelaySec = def.meta.hitDelaySec ?? 0;

        this.scheduler.schedule(def.anim?.charge ?? 0, () => {
          if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
          this.emit({ type: "SKILL_CAST", skillId: def.id, attacker, defender });

          this.scheduler.schedule(orbitSec + hitDelaySec, () => {
            for (let s = 0; s < shots; s += 1) {
              this.scheduler.schedule(s * cadenceSec, () => {
                if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
                const heavy = s === shots - 1;
                this.emit({ type: "SKILL_HIT", skillId: def.id, attacker, defender, heavy, index: s, count: shots });
                this.applyDamage(attacker, defender, dmgEach, heavy);
              });
            }
          });
        });
        return;
      }

      case "LOTUS": {
        if (!this.prepSkill(attacker, def)) return;
        const buffMs = def.meta?.buffMs ?? 1500;

        this.scheduler.schedule(def.anim?.charge ?? 0, () => {
          this.state.players[attacker].effect.lotusUntil = this.state.timeMs + buffMs;
          this.setLastSkill(attacker, "Liên Hoa Trận");
          this.emit({ type: "BANNER", text: `🌸 Player ${attacker + 1}: Liên Hoa Trận` });
          this.emit({ type: "SKILL_CAST", skillId: def.id, attacker, defender });
        });
        return;
      }

      case "WALL": {
        if (!this.prepSkill(attacker, def)) return;
        const durSec = def.meta?.durSec ?? 1.2;

        this.setLastSkill(attacker, "Thiên La Địa Võng");
        this.emit({ type: "BANNER", text: `🛡️ Player ${attacker + 1}: Thiên La Địa Võng` });

        this.scheduler.schedule(def.anim?.charge ?? 0, () => {
          this.state.players[attacker].effect.wallUntil = this.state.timeMs + durSec * 1000;
          this.emit({ type: "SKILL_CAST", skillId: def.id, attacker, defender });
        });
        return;
      }

      case "SPHERE": {
        if (!this.prepSkill(attacker, def)) return;
        const durSec = def.meta?.durSec ?? 1.5;
        const parrySec = def.meta?.parrySec ?? 0.25;

        this.setLastSkill(attacker, "Hộ Thân Kiếm Cầu");
        this.emit({ type: "BANNER", text: `🔮 Player ${attacker + 1}: Hộ Thân Kiếm Cầu` });

        this.scheduler.schedule(def.anim?.charge ?? 0, () => {
          this.state.players[attacker].effect.sphereUntil = this.state.timeMs + durSec * 1000;
          this.state.players[attacker].effect.parryUntil = this.state.timeMs + parrySec * 1000;
          this.emit({ type: "SKILL_CAST", skillId: def.id, attacker, defender });
        });
        return;
      }

      case "SHAKA": {
        const meta = def.meta || {};
        const ultReady = this.state.players[attacker].ult >= GAME.ultMax && this.getCd(attacker, "ULT") <= 0;

        if (ultReady) {
          this.state.players[attacker].ult = 0;
          this.setCd(attacker, "ULT", meta.ultCd || 10.0);
          this.setLastSkill(attacker, "Song Long Quá Hải");
          this.emit({ type: "BANNER", text: `🐉 P${attacker + 1}: SONG LONG QUÁ HẢI!!!` });
          this.emit({ type: "SKILL_CAST", skillId: "ULT", attacker, defender });

          const hits = meta.ultHits ?? GAME.ultHits;
          const hitDmg = meta.ultHitDmg ?? GAME.ultHitDmg;
          const chargeSec1 = meta.ultChargeSec1 ?? 2.0;
          const chargeSec2 = meta.ultChargeSec2 ?? 2.0;
          const firstHits = Math.max(1, Math.floor(hits / 2));
          const secondHits = Math.max(1, hits - firstHits);

          this.scheduler.schedule(chargeSec1, () => {
            if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
            this.emit({ type: "BANNER", text: `🐉 P${attacker + 1}: LONG 1 XUẤT TRẬN` });
            for (let i = 0; i < firstHits; i += 1) {
              this.scheduler.schedule(i * 0.08, () => {
                if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
                const heavy = i === 0;
                this.emit({ type: "SKILL_HIT", skillId: "ULT", attacker, defender, heavy, index: i, count: hits });
                this.applyDamage(attacker, defender, hitDmg, heavy);
              });
            }
          });

          this.scheduler.schedule(chargeSec1 + chargeSec2, () => {
            if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
            const defend = this.state.players[attacker].hp < this.state.players[defender].hp;
            this.emit({
              type: "BANNER",
              text: `🐉 P${attacker + 1}: LONG 2 ${defend ? "PHÒNG NGỰ" : "TẤN CÔNG"}`,
            });
            for (let i = 0; i < secondHits; i += 1) {
              this.scheduler.schedule(i * 0.08, () => {
                if (!this.isAlive(attacker) || !this.isAlive(defender)) return;
                const heavy = i === 0;
                this.emit({ type: "SKILL_HIT", skillId: "ULT", attacker, defender, heavy, index: firstHits + i, count: hits });
                this.applyDamage(attacker, defender, hitDmg, heavy);
              });
            }
          });
          return;
        }

        if (!this.prepSkill(attacker, def)) return;
        const heal = meta.heal ?? 12;
        const ultGain = meta.ultGain ?? 6;

        this.scheduler.schedule(def.anim?.charge ?? 0, () => {
          this.state.players[attacker].hp = clamp(
            this.state.players[attacker].hp + heal,
            0,
            GAME.hpMax,
          );
          this.addUlt(attacker, ultGain);
          this.setLastSkill(attacker, "Hồi Kiếm Thuật");
          this.emit({ type: "BANNER", text: `✨ P${attacker + 1}: Hồi Kiếm Thuật` });
          this.emit({ type: "SKILL_CAST", skillId: def.id, attacker, defender });
        });
        return;
      }

      case "AIM": {
        this.setLastSkill(attacker, "AIM");
        this.emit({ type: "BANNER", text: `🎯 P${attacker + 1}: AIM`, sticky: true });
        this.emit({ type: "SKILL_CAST", skillId: def.id, attacker, defender });
        return;
      }

      default:
        return;
    }
  }

  update(dt: number, rawDt: number) {
    this.state.timeMs += dt * 1000;

    if (this.state.hitstop > 0) {
      this.state.hitstop = Math.max(0, this.state.hitstop - rawDt);
    }

    const now = this.state.timeMs;

    for (let i = 0; i < 2; i += 1) {
      for (const k in this.state.players[i].cd) {
        this.state.players[i].cd[k] = Math.max(0, (this.state.players[i].cd[k] || 0) - dt);
      }

      const lotus = this.state.players[i].effect.lotusUntil > now;
      const regen = GAME.qiRegenPerSec * (lotus ? GAME.lotusRegenMul : 1);
      this.state.players[i].qi = clamp(this.state.players[i].qi + regen * dt, 0, GAME.qiMax);

      let tag = "—";
      if (this.state.players[i].effect.parryUntil > now) tag = "PARRY";
      else if (this.state.players[i].effect.sphereUntil > now) tag = "SPHERE";
      else if (this.state.players[i].effect.wallUntil > now) tag = "WALL";
      else if (this.state.players[i].effect.lotusUntil > now) tag = "LOTUS";
      else if (this.state.players[i].ult >= 100) tag = "ULT READY";
      this.state.players[i].statusTag = tag;

      if (this.state.players[i].combo.count > 0 && now - this.state.players[i].combo.lastAt > GAME.comboWindowMs) {
        this.state.players[i].combo.count = 0;
      }
    }

    this.scheduler.update(dt);
    this.emit({ type: "STATE", state: this.state });
  }
}
