// public/js/display/ui/HUD.js
import { clamp } from "../utils";

export class HUD {
  room: string;
  statusEl: HTMLElement;
  bannerEl: HTMLElement;
  toastEl: HTMLElement;
  hp1Fill: HTMLElement;
  hp2Fill: HTMLElement;
  qi1Fill: HTMLElement;
  qi2Fill: HTMLElement;
  hp1t: HTMLElement;
  hp2t: HTMLElement;
  qi1t: HTMLElement;
  qi2t: HTMLElement;
  ult1: HTMLElement;
  ult2: HTMLElement;
  state1: HTMLElement;
  state2: HTMLElement;
  combo1: HTMLElement;
  combo2: HTMLElement;
  last1: HTMLElement;
  last2: HTMLElement;
  _bannerTimer: ReturnType<typeof setTimeout> | null;
  _toastTimer: ReturnType<typeof setTimeout> | null;

  constructor(room: string){
    this.room = room;

    this.statusEl = document.getElementById("status") as HTMLElement;
    this.bannerEl = document.getElementById("banner") as HTMLElement;
    this.toastEl  = document.getElementById("toast") as HTMLElement;

    this.hp1Fill = document.getElementById("hp1") as HTMLElement;
    this.hp2Fill = document.getElementById("hp2") as HTMLElement;
    this.qi1Fill = document.getElementById("qi1") as HTMLElement;
    this.qi2Fill = document.getElementById("qi2") as HTMLElement;

    this.hp1t = document.getElementById("hp1t") as HTMLElement;
    this.hp2t = document.getElementById("hp2t") as HTMLElement;
    this.qi1t = document.getElementById("qi1t") as HTMLElement;
    this.qi2t = document.getElementById("qi2t") as HTMLElement;

    this.ult1 = document.getElementById("ult1") as HTMLElement;
    this.ult2 = document.getElementById("ult2") as HTMLElement;
    this.state1 = document.getElementById("state1") as HTMLElement;
    this.state2 = document.getElementById("state2") as HTMLElement;
    this.combo1 = document.getElementById("combo1") as HTMLElement;
    this.combo2 = document.getElementById("combo2") as HTMLElement;
    this.last1 = document.getElementById("last1") as HTMLElement;
    this.last2 = document.getElementById("last2") as HTMLElement;

    this._bannerTimer = null;
    this._toastTimer = null;

    this.setBanner(`TU TIÊN FIGHT | ROOM ${(room||"demo").toUpperCase()}`, true);
  }

  setStatus(text: string) {
    this.statusEl.textContent = text;
  }

  showToast(text: string) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.remove("show"), 650);
  }

  setBanner(text: string, sticky = false) {
    this.bannerEl.textContent = text;
    clearTimeout(this._bannerTimer);
    if (!sticky) {
      this._bannerTimer = setTimeout(() => {
        this.bannerEl.textContent = `TU TIÊN FIGHT | ROOM ${(this.room||"demo").toUpperCase()}`;
      }, 1400);
    }
  }

  _setBar(fillEl: HTMLElement, txtEl: HTMLElement, value: number, max: number) {
    const pct = clamp(value / max, 0, 1);
    fillEl.style.transform = `scaleX(${pct})`;
    txtEl.textContent = String(Math.round(value));
  }

  _setUlt(el: HTMLElement, val: number) {
    el.textContent = `ULT ${Math.round(val)}%`;
  }

  update(
    game: { hpMax: number; qiMax: number },
    players: Array<{ hp: number; qi: number; ult: number; statusTag: string; combo: { count: number }; lastSkill: string }>
  ) {
    // players: [p0, p1]
    const p0 = players[0], p1 = players[1];
    this._setBar(this.hp1Fill, this.hp1t, p0.hp, game.hpMax);
    this._setBar(this.hp2Fill, this.hp2t, p1.hp, game.hpMax);
    this._setBar(this.qi1Fill, this.qi1t, p0.qi, game.qiMax);
    this._setBar(this.qi2Fill, this.qi2t, p1.qi, game.qiMax);

    this._setUlt(this.ult1, p0.ult);
    this._setUlt(this.ult2, p1.ult);

    this.state1.textContent = p0.statusTag;
    this.state2.textContent = p1.statusTag;
    this.combo1.textContent = `COMBO: ${p0.combo.count}`;
    this.combo2.textContent = `COMBO: ${p1.combo.count}`;
    this.last1.textContent = p0.lastSkill;
    this.last2.textContent = p1.lastSkill;
  }
}
