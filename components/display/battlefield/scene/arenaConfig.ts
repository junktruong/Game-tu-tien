const ARENAS = Object.freeze({
  "sky-temple": {
    id: "sky-temple",
    name: "Thiên Cung",
    background: 0x12121a,
    fogColor: 0x0b0b12,
    fogDensity: 0.010,
    groundColor: 0x1a1a26,
    ringColor: 0x00ffff,
    ringEmissiveIntensity: 0.16,
    ringOpacity: 0.24,
    ambientIntensity: 0.75,
    keyLightIntensity: 1.1,
    keyLightPosition: { x: 30, y: 62, z: 40 },
    pointLights: [
      {
        color: 0x00ffff,
        intensity: 1.4,
        distance: 200,
        decay: 2,
        x: -12,
        y: 12,
        z: 10,
      },
      {
        color: 0xff4fd8,
        intensity: 1.35,
        distance: 200,
        decay: 2,
        x: 12,
        y: 12,
        z: 10,
      },
    ],
  },

  "bamboo-forest": {
    id: "bamboo-forest",
    name: "Trúc Lâm",
    background: 0x101818,
    fogColor: 0x0b1210,
    fogDensity: 0.010,

    groundColor: 0x1a2a22,
    ringColor: 0x4cff9a,
    ringEmissiveIntensity: 0.12,
    ringOpacity: 0.22,
    ambientIntensity: 0.72,
    keyLightIntensity: 1.05,
    keyLightPosition: { x: 24, y: 60, z: 42 },
    pointLights: [
      {
        color: 0x4cff9a,
        intensity: 1.25,
        distance: 180,
        decay: 2,
        x: -14,
        y: 12,
        z: 8,
      },
      {
        color: 0x8af7ff,
        intensity: 1.2,
        distance: 180,
        decay: 2,
        x: 14,
        y: 12,
        z: 8,
      },
    ],
  },

  "lava-rift": {
    id: "lava-rift",
    name: "Vực Hỏa",
    background: 0x1a0b0b,
    fogColor: 0x140b0b,
    fogDensity: 0.010,

    groundColor: 0x2a1212,
    ringColor: 0xff6a1a,
    ringEmissiveIntensity: 0.18,
    ringOpacity: 0.26,
    ambientIntensity: 0.68,
    keyLightIntensity: 1.15,
    keyLightPosition: { x: 36, y: 64, z: 32 },
    pointLights: [
      {
        color: 0xff6a1a,
        intensity: 1.5,
        distance: 220,
        decay: 2,
        x: -10,
        y: 10,
        z: 10,
      },
      {
        color: 0xff2a55,
        intensity: 1.35,
        distance: 220,
        decay: 2,
        x: 10,
        y: 12,
        z: 12,
      },
    ],
  },
});

export function getArenaConfig(arenaId?: string) {
  if (arenaId && arenaId in ARENAS) {
    return ARENAS[arenaId as keyof typeof ARENAS];
  }
  return ARENAS["sky-temple"];
}

export { ARENAS };
