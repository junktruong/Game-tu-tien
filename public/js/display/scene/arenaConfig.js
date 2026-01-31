// public/js/display/scene/arenaConfig.js
const ARENAS = Object.freeze({
  "sky-temple": {
    id: "sky-temple",
    name: "Thiên Cung",
    background: 0x05050a,
    fogColor: 0x05050a,
    fogDensity: 0.018,
    groundColor: 0x0b0b14,
    ringColor: 0x00ffff,
    ringEmissiveIntensity: 0.18,
    ringOpacity: 0.2,
    ambientIntensity: 0.45,
    keyLightIntensity: 0.8,
    keyLightPosition: { x: 30, y: 60, z: 40 },
    pointLights: [
      { color: 0x00ffff, intensity: 1.3, distance: 180, decay: 2, x: -12, y: 12, z: 10 },
      { color: 0xff4fd8, intensity: 1.3, distance: 180, decay: 2, x: 12, y: 12, z: 10 },
    ],
  },
  "bamboo-forest": {
    id: "bamboo-forest",
    name: "Trúc Lâm",
    background: 0x0c120d,
    fogColor: 0x0c120d,
    fogDensity: 0.02,
    groundColor: 0x0e1a13,
    ringColor: 0x4cff9a,
    ringEmissiveIntensity: 0.14,
    ringOpacity: 0.18,
    ambientIntensity: 0.5,
    keyLightIntensity: 0.75,
    keyLightPosition: { x: 24, y: 58, z: 42 },
    pointLights: [
      { color: 0x4cff9a, intensity: 1.1, distance: 160, decay: 2, x: -14, y: 12, z: 8 },
      { color: 0x8af7ff, intensity: 1.05, distance: 160, decay: 2, x: 14, y: 12, z: 8 },
    ],
  },
  "lava-rift": {
    id: "lava-rift",
    name: "Vực Hỏa",
    background: 0x140707,
    fogColor: 0x140707,
    fogDensity: 0.022,
    groundColor: 0x1d0a0a,
    ringColor: 0xff6a1a,
    ringEmissiveIntensity: 0.22,
    ringOpacity: 0.22,
    ambientIntensity: 0.4,
    keyLightIntensity: 0.9,
    keyLightPosition: { x: 36, y: 62, z: 32 },
    pointLights: [
      { color: 0xff6a1a, intensity: 1.4, distance: 200, decay: 2, x: -10, y: 10, z: 10 },
      { color: 0xff2a55, intensity: 1.2, distance: 200, decay: 2, x: 10, y: 12, z: 12 },
    ],
  },
});

export function getArenaConfig(arenaId) {
  if (arenaId && ARENAS[arenaId]) return ARENAS[arenaId];
  return ARENAS["sky-temple"];
}

export { ARENAS };
