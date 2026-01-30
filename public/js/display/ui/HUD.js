// public/js/display/ui/HUD.js
import { clamp } from "../utils.js";

export class HUD {
  constructor(room){
    this.room = room;

    this.statusEl = document.getElementById("status");
    this.bannerEl = document.getElementById("banner");
    this.toastEl  = document.getElementById("toast");

    this.hp1Fill = document.getElementById("hp1");
    this.hp2Fill = document.getElementById("hp2");
    this.qi1Fill = document.getElementById("qi1");
    this.qi2Fill = document.getElementById("qi2");

    this.hp1t = document.getElementById("hp1t");
    this.hp2t = document.getElementById("hp2t");
    this.qi1t = document.getElementById("qi1t");
    this.qi2t = document.getElementById("qi2t");

    this.ult1 = document.getElementById("ult1");
    this.ult2 = document.getElementById("ult2");
    this.state1 = document.getElementById("state1");
    this.state2 = document.getElementById("state2");
    this.combo1 = document.getElementById("combo1");
    this.combo2 = document.getElementById("combo2");
    this.last1 = document.getElementById("last1");
    this.last2 = document.getElementById("last2");

    this._bannerTimer = null;
    this._toastTimer = null;

    this.setBanner(`TU TIÊN FIGHT | ROOM ${(room||"demo").toUpperCase()}`, true);
  }

  setStatus(text){ this.statusEl.textContent = text; }

  showToast(text){
    this.toastEl.textContent = text;
    this.toastEl.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(()=> this.toastEl.classList.remove("show"), 650);
  }

  setBanner(text, sticky=false){
    this.bannerEl.textContent = text;
    clearTimeout(this._bannerTimer);
    if (!sticky){
      this._bannerTimer = setTimeout(()=>{
        this.bannerEl.textContent = `TU TIÊN FIGHT | ROOM ${(this.room||"demo").toUpperCase()}`;
      }, 1400);
    }
  }

  _setBar(fillEl, txtEl, value, max){
    const pct = clamp(value / max, 0, 1);
    fillEl.style.transform = `scaleX(${pct})`;
    txtEl.textContent = String(Math.round(value));
  }

  _setUlt(el, val){
    el.textContent = `ULT ${Math.round(val)}%`;
  }

  update(game, players){
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
