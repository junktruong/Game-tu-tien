// public/js/display/config.js

export const SKILL_CATEGORY = Object.freeze({
  NORMAL: "normal",   // đánh thường
  ATTACK: "attack",   // tấn công
  DEFENSE: "defense", // phòng ngự
});

export const GAME = Object.freeze({
  hpMax: 3000,
  qiMax: 100,
  ultMax: 100,

  qiRegenPerSec: 10,
  lotusRegenMul: 2.2,

  comboWindowMs: 900,
  comboMax: 3,

  wallDurSec: 1.2,
  sphereDurSec: 1.5,
  parryWindowSec: 0.25,

  ultHits: 10,
  ultHitDmg: 7,

  hitstopLight: 0.03,
  hitstopHeavy: 0.08,
});

/**
 * Skill defs:
 * - gesture: tên gesture từ control (giữ nguyên để khỏi sửa control)
 * - anim: config vận chiêu (StickFighter.playCast)
 * - meta: tuỳ chiêu (bạn tweak hiệu ứng ở đây)
 */
export const SKILLS = Object.freeze({
  // ======================
  // NORMAL (đánh thường)
  // ======================
  BASIC_ATTACK: {
    id: "BASIC_ATTACK",
    gesture: "ATTACK",
    category: SKILL_CATEGORY.NORMAL,
    cost: 8,
    cd: 0.15,
    anim: { charge: 0.07, swing: 0.17, step: 1.05, lean: 0.12, slashFrom: 0.55, slashTo: -1.05 },
    meta: {
      combo1Dmg: 10,

      combo2Hits: 3,
      combo2DmgEach: 6,

      combo3Projectiles: 5,
      combo3TotalDmg: 18,

      projectileSpeed: 58,
      sword: { type: "classic", skin: "arcane", style: "factory" },
    }
  },

  AIM: {
    id: "AIM",
    gesture: "POINT",
    category: SKILL_CATEGORY.NORMAL,
    cost: 0,
    cd: 0,
    anim: null,
    meta: {}
  },

  // ======================
  // ATTACK (tấn công)
  // ======================

  /**
   * SPIN -> KIẾM VŨ VÒNG XOÁY QUAY TỚI
   * Ý tưởng meta:
   * - duration: thời gian vortex tiến tới
   * - ticks: số lần gây sát thương (mỗi tick có thể spawn 1 cụm kiếm/1 shockwave)
   * - swordPerTick: số kiếm bay xoáy trong mỗi tick (visual)
   * - travelSpeed: tốc độ “khối vortex” tiến đến mục tiêu
   * - radius: bán kính vòng xoáy
   * - spinSpeed: tốc độ xoay
   * - tickDmg: dmg mỗi tick
   */
  SPIN: {
    id: "SPIN",
    gesture: "SPIN",
    category: SKILL_CATEGORY.ATTACK,
    cost: 24,
    cd: 2.4,
    anim: { charge: 0.16, swing: 0.26, step: 0.85, lean: 0.10, slashFrom: 0.85, slashTo: -1.25 },
    meta: {
      durationSec: 0.85,
      ticks: 4,
      tickDmg: 6,

      swordPerTick: 14,   // visual density
      travelSpeed: 24,    // vortex movement speed
      radius: 5.6,        // vortex radius
      spinSpeed: 10.5,    // angular speed
      arc: 1.0,           // nhẹ nhàng nhấp nhô
      wobble: 0.9,
      sword: { type: "spear", skin: "jade", style: "energy" }
    }
  },

  /**
   * GIANT -> KIẾM RƠI TỪ TRÊN TRỜI XUỐNG (SWORD RAIN / SKYFALL)
   * Ý tưởng meta:
   * - rainCount: số kiếm rơi (visual)
   * - hits: số hit thực sự (gây dmg)
   * - dmgEach: dmg mỗi hit
   * - height: độ cao spawn
   * - spreadX/spreadY: độ loe quanh điểm mục tiêu
   * - dropSpeed: tốc độ rơi
   * - warningSec: thời gian "đánh dấu" trước khi rơi (để đẹp + tránh unfair)
   */
  GIANT: {
    id: "GIANT",
    gesture: "GIANT",
    category: SKILL_CATEGORY.ATTACK,
    cost: 30,
    cd: 3.0,
    anim: { charge: 0.22, swing: 0.28, step: 0.85, lean: 0.14, slashFrom: 0.95, slashTo: -1.25 },
    meta: {
      rainCount: 26,      // tổng số kiếm rơi (visual)
      hits: 6,            // số kiếm tính sát thương
      dmgEach: 7,         // dmg mỗi hit (tổng ~42)

      height: 38,         // spawn trên cao
      spreadX: 10.5,      // loe ngang
      spreadY: 6.0,       // loe dọc (y offset)
      dropSpeed: 75,      // tốc độ rơi
      warningSec: 0.22,   // delay báo hiệu
      burstScale: 1.0,
      sword: { type: "great", skin: "obsidian", style: "factory" }
    }
  },

  /**
   * FAN -> KIẾM QUAY VÒNG TRÊN ĐẦU RỒI BẮN VÀO NGƯỜI (ORBIT -> SHOOT)
   * Ý tưởng meta:
   * - orbitSec: thời gian quay vòng trên đầu
   * - orbitSwords: số kiếm quay vòng (visual)
   * - orbitRadius: bán kính quay
   * - orbitSpin: tốc độ xoay
   * - shots: số kiếm bắn ra (hit thật)
   * - shotSpeed: tốc độ bắn
   * - shotArc: độ cong
   * - dmgEach: dmg mỗi kiếm bắn
   */
  FAN: {
    id: "FAN",
    gesture: "FAN",
    category: SKILL_CATEGORY.ATTACK,
    cost: 26,
    cd: 2.6,
    anim: { charge: 0.18, swing: 0.26, step: 0.60, lean: 0.10, slashFrom: 0.75, slashTo: -1.15 },
    meta: {
      orbitSec: 0.55,
      orbitSwords: 18,
      orbitRadius: 7.5,
      orbitSpin: 12.0,

      shots: 7,
      shotSpeed: 96,
      shotArc: 3.2,
      dmgEach: 5,

      spread: 2.2,        // độ lệch target mỗi shot
      cadenceSec: 0.08,   // nhịp bắn
      sword: { type: "katana", skin: "crimson", style: "factory" }
    }
  },

  /**
   * LOTUS -> buff hồi nội lực nhanh
   */
  LOTUS: {
    id: "LOTUS",
    gesture: "LOTUS",
    category: SKILL_CATEGORY.ATTACK,
    cost: 0,
    cd: 0.0,
    anim: { charge: 0.12, swing: 0.20, step: 0.0, lean: 0.0, slashFrom: 0.10, slashTo: 0.10 },
    meta: { buffMs: 1500 }
  },

  // ======================
  // DEFENSE (phòng ngự)
  // ======================
  WALL: {
    id: "WALL",
    gesture: "WALL",
    category: SKILL_CATEGORY.DEFENSE,
    cost: 18,
    cd: 3.0,
    anim: { charge: 0.10, swing: 0.16, step: 0.0, lean: 0.0, slashFrom: 0.25, slashTo: 0.25 },
    meta: { durSec: 1.2 }
  },

  SPHERE: {
    id: "SPHERE",
    gesture: "SPHERE",
    category: SKILL_CATEGORY.DEFENSE,
    cost: 16,
    cd: 2.8,
    anim: { charge: 0.10, swing: 0.18, step: 0.0, lean: 0.0, slashFrom: 0.25, slashTo: 0.25 },
    meta: { durSec: 1.5, parrySec: 0.25 }
  },

  /**
   * SHAKA -> heal hoặc ULT (Vạn Kiếm Quy Tông)
   */
  SHAKA: {
    id: "SHAKA",
    gesture: "SHAKA",
    category: SKILL_CATEGORY.DEFENSE,
    cost: 12,
    cd: 4.0,
    anim: { charge: 0.12, swing: 0.22, step: 0.0, lean: 0.0, slashFrom: 0.18, slashTo: 0.18 },
    meta: {
      // heal
      heal: 12,
      ultGain: 6,

      // ULT base
      ultCd: 10.0,
      ultHits: 10,
      ultHitDmg: 7,
      ultProjectileSpeed: 120,

      // Vạn Kiếm visuals (instanced)
      ultVisualSwords: 56,
      ultOrbitSec: 0.45,
      ultLaunchSec: 0.58,
      ultSpread: 3.0,
      ultArc: 7.5,
      ultSword: { type: "classic", skin: "arcane", style: "energy" }
    }
  },
});

/**
 * Bật/tắt theo nhóm: chỉ cần sửa list ở đây
 */
export const SKILL_GROUPS = Object.freeze({
  normal: ["BASIC_ATTACK", "AIM"],
  attack: ["SPIN", "GIANT", "FAN", "LOTUS"],
  defense: ["WALL", "SPHERE", "SHAKA"],
});
