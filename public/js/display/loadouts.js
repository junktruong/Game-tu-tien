// public/js/display/loadouts.js

export const FIGHTER_SKINS = Object.freeze({
  default: {
    textureUrl: "/img/stick_fighter_sheet.png",
  },
  chuan: {
    textureUrl: "/img/stick_fighter_sheet_chuan.png",
  },
  alt: {
    textureUrl: "/img/stick_fighter_sheet123.png",
  },
});

export const SWORD_TYPES = Object.freeze({
  katana: {
    blade: { width: 0.34, height: 6.2, depth: 0.16 },
    tip: { radius: 0.22, height: 0.7, radialSegments: 6 },
    glow: { width: 4.2, height: 8.6 },
    trail: { width: 2.6, height: 12.0, offsetY: 1.5 },
    instanced: { topRadius: 0.1, bottomRadius: 0.22, height: 6.2, radialSegments: 7 },
  },
  greatsword: {
    blade: { width: 0.52, height: 7.8, depth: 0.22 },
    tip: { radius: 0.32, height: 0.9, radialSegments: 8 },
    glow: { width: 5.2, height: 10.2 },
    trail: { width: 3.4, height: 14.5, offsetY: 1.9 },
    instanced: { topRadius: 0.14, bottomRadius: 0.28, height: 7.6, radialSegments: 8 },
  },
  needle: {
    blade: { width: 0.24, height: 5.6, depth: 0.12 },
    tip: { radius: 0.18, height: 0.6, radialSegments: 6 },
    glow: { width: 3.6, height: 7.4 },
    trail: { width: 2.1, height: 10.6, offsetY: 1.25 },
    instanced: { topRadius: 0.08, bottomRadius: 0.18, height: 5.4, radialSegments: 6 },
  },
});

export const SWORD_SKINS = Object.freeze({
  default: {
    bladeColor: 0xffffff,
    emissiveIntensity: 1.0,
    metalness: 0.35,
    roughness: 0.18,
    opacity: 0.94,
    glowOpacity: 0.7,
    trailOpacity: 0.28,
  },
  moonlight: {
    bladeColor: 0xf5fbff,
    emissiveIntensity: 1.2,
    metalness: 0.55,
    roughness: 0.12,
    opacity: 0.9,
    glowOpacity: 0.82,
    trailOpacity: 0.32,
  },
  dusk: {
    bladeColor: 0x1b1b1b,
    emissiveIntensity: 0.9,
    metalness: 0.2,
    roughness: 0.45,
    opacity: 0.88,
    glowOpacity: 0.55,
    trailOpacity: 0.22,
  },
});

export const PLAYER_LOADOUTS = Object.freeze([
  {
    skin: "default",
    swordType: "katana",
    swordSkin: "default",
  },
  {
    skin: "chuan",
    swordType: "greatsword",
    swordSkin: "moonlight",
  },
]);
