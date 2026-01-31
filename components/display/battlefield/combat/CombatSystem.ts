// public/js/display/combat/CombatSystem.js
import { clamp } from "../utils";
import { GAME } from "../config";

type PlayerState = {
  hp: number;
  qi: number;
  ult: number;
  cd: Record<string, number>;
  effect: {
    wallUntil: number;
    sphereUntil: number;
    parryUntil: number;
    lotusUntil: number;
  };
  combo: { count: number; lastAt: number };
  lastSkill: string;
  statusTag: string;
};

const makePlayer = (): PlayerState => {
  return {
    hp: GAME.hpMax,
    qi: GAME.qiMax,
    ult: 0,

    cd: {}, // skillId -> seconds
    effect: {
      wallUntil: 0,
      sphereUntil: 0,
      parryUntil: 0,
      lotusUntil: 0
    },

    combo: { count: 0, lastAt: 0 },
    lastSkill: "—",
    statusTag: "—"
  };
};

export class CombatSystem {
  hud: any;
  scheduler: any;
  fighters: any[];
  vfx: any;
  sceneManager: any;
  players: PlayerState[];
  hitstop: number;

  constructor({ hud, scheduler, fighters, vfx, sceneManager }: { hud: any; scheduler: any; fighters: any[]; vfx: any; sceneManager: any }){
    this.hud = hud;
    this.scheduler = scheduler;
    this.fighters = fighters;
    this.vfx = vfx;
    this.sceneManager = sceneManager;

    this.players = [makePlayer(), makePlayer()];
    this.hitstop = 0;
  }

  isAlive(i: number) { return this.players[i].hp > 0; }

  setCd(i: number, skillId: string, sec: number){ this.players[i].cd[skillId] = Math.max(0, sec || 0); }
  getCd(i: number, skillId: string){ return this.players[i].cd[skillId] || 0; }

  addUlt(i: number, amt: number){
    this.players[i].ult = clamp(this.players[i].ult + amt, 0, GAME.ultMax);
  }

  spendQi(i: number, cost: number){
    this.players[i].qi = clamp(this.players[i].qi - (cost||0), 0, GAME.qiMax);
  }

  canCast(i: number, { id, cost=0 }: { id: string; cost?: number }){
    if (!this.isAlive(0) || !this.isAlive(1)) return false;
    if (this.getCd(i, id) > 0) return false;
    if (this.players[i].qi < cost) return false;
    return true;
  }

  // giảm dmg theo phòng ngự
  _damageAfterDefense(attacker: number, defender: number, rawDmg: number){
    const now = performance.now();
    let dmg = rawDmg;

    const parryActive = this.players[defender].effect.parryUntil > now;
    if (parryActive){
      dmg *= 0.15;
      const reflect = rawDmg * 0.35;
      this.players[attacker].hp = clamp(this.players[attacker].hp - reflect, 0, GAME.hpMax);

      this.vfx.spawnBurstAt(this.fighters[attacker].getCorePos(9.2), this.getColor(defender), 1.0);
      this.players[defender].statusTag = "PARRY!";
      this.addUlt(defender, 10);
      this.sceneManager.shake(0.65);
      this.hitstop = Math.max(this.hitstop, GAME.hitstopLight);
      return dmg;
    }

    if (this.players[defender].effect.sphereUntil > now) dmg *= 0.10;
    else if (this.players[defender].effect.wallUntil > now) dmg *= 0.20;

    return dmg;
  }

  applyDamage(attacker: number, defender: number, rawDmg: number){
    const dmg = this._damageAfterDefense(attacker, defender, rawDmg);

    this.players[defender].hp = clamp(this.players[defender].hp - dmg, 0, GAME.hpMax);

    this.addUlt(attacker, clamp(dmg * 0.65, 1, 12));
    this.addUlt(defender, clamp(dmg * 0.25, 0.5, 6));

    if (this.players[defender].hp <= 0){
      this.hud.setBanner(`🏆 PLAYER ${attacker+1} THẮNG!`);
    }
  }

  hitReact(attacker: number, defender: number, heavy: boolean){
    const col = this.getColor(attacker);
    this.fighters[defender].setHitFlash(heavy ? 260 : 170);
    this.fighters[defender].playHit(heavy);

    const hitPos = this.fighters[defender].getCorePos(9.4);
    this.vfx.spawnBurstAt(hitPos, col, heavy ? 1.25 : 0.95);

    const away = (defender===0 ? -1 : 1);
    this.vfx.spawnSlash(hitPos.clone().add(new window.THREE.Vector3(away*0.8,0,0)), col, away*0.35);

    this.sceneManager.shake(heavy ? 1.0 : 0.55);
    this.hitstop = Math.max(this.hitstop, heavy ? GAME.hitstopHeavy : GAME.hitstopLight);
  }

  getColor(i: number){ return i===0 ? 0x00ffff : 0xff4fd8; }

  getHitPoint(defender: number){
    const now = performance.now();
    const host = this.fighters[defender];

    if (this.players[defender].effect.wallUntil > now){
      const p = host.getCorePos(7.6);
      p.x += (defender===0 ? 6 : -6);
      return p;
    }
    if (this.players[defender].effect.sphereUntil > now){
      const p = host.getCorePos(8.2);
      p.x += (defender===0 ? 3.2 : -3.2);
      return p;
    }
    return host.getCorePos(9.2);
  }

  setLastSkill(i: number, text: string){ this.players[i].lastSkill = text; }
  setStatusTag(i: number, text: string){ this.players[i].statusTag = text; }

  // tick
  update(dt: number){
    const now = performance.now();

    for(let i=0;i<2;i++){
      // cooldown
      for(const k in this.players[i].cd){
        this.players[i].cd[k] = Math.max(0, (this.players[i].cd[k] || 0) - dt);
      }

      // qi regen (lotus)
      const lotus = this.players[i].effect.lotusUntil > now;
      const regen = GAME.qiRegenPerSec * (lotus ? GAME.lotusRegenMul : 1);
      this.players[i].qi = clamp(this.players[i].qi + regen * dt, 0, GAME.qiMax);

      // status tag auto
      let tag = "—";
      if (this.players[i].effect.parryUntil > now) tag = "PARRY";
      else if (this.players[i].effect.sphereUntil > now) tag = "SPHERE";
      else if (this.players[i].effect.wallUntil > now) tag = "WALL";
      else if (this.players[i].effect.lotusUntil > now) tag = "LOTUS";
      else if (this.players[i].ult >= 100) tag = "ULT READY";
      this.players[i].statusTag = tag;

      // combo timeout
      if (this.players[i].combo.count > 0 && (now - this.players[i].combo.lastAt) > GAME.comboWindowMs){
        this.players[i].combo.count = 0;
      }
    }

    this.hud.update(GAME, this.players);
  }
}
