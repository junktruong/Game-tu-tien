// public/js/display/entities/SwordFactory.js
const DEFAULT_SWORD_TYPE = "classic";
const DEFAULT_SWORD_SKIN = "arcane";

const SWORD_TYPES = Object.freeze({
  classic: {
    blade: { w: 0.34, h: 6.2, d: 0.16 },
    tip: { r: 0.22, h: 0.7, seg: 6 },
    glow: { w: 4.2, h: 8.6 },
    trail: { w: 2.6, h: 12.0 },
  },
  katana: {
    blade: { w: 0.28, h: 6.8, d: 0.12 },
    tip: { r: 0.18, h: 0.6, seg: 6 },
    glow: { w: 3.8, h: 8.8 },
    trail: { w: 2.3, h: 12.8 },
  },
  great: {
    blade: { w: 0.50, h: 7.4, d: 0.22 },
    tip: { r: 0.28, h: 0.9, seg: 6 },
    glow: { w: 5.4, h: 10.2 },
    trail: { w: 3.1, h: 14.5 },
  },
  spear: {
    blade: { w: 0.18, h: 8.6, d: 0.14 },
    tip: { r: 0.18, h: 0.8, seg: 6 },
    glow: { w: 3.6, h: 11.6 },
    trail: { w: 2.0, h: 15.5 },
  },
});

const SWORD_SKINS = Object.freeze({
  arcane: {
    baseColor: 0xffffff,
    emissiveIntensity: 1.0,
    metalness: 0.35,
    roughness: 0.18,
    opacity: 0.94,
    trailOpacity: 0.28,
    glowOpacity: 0.70,
  },
  obsidian: {
    baseColor: 0x141622,
    emissiveIntensity: 1.1,
    metalness: 0.6,
    roughness: 0.32,
    opacity: 0.92,
    trailOpacity: 0.22,
    glowOpacity: 0.58,
  },
  jade: {
    baseColor: 0xe2f7ee,
    emissiveIntensity: 0.95,
    metalness: 0.4,
    roughness: 0.22,
    opacity: 0.93,
    trailOpacity: 0.24,
    glowOpacity: 0.66,
  },
  crimson: {
    baseColor: 0xfff0f0,
    emissiveIntensity: 1.2,
    metalness: 0.3,
    roughness: 0.14,
    opacity: 0.95,
    trailOpacity: 0.30,
    glowOpacity: 0.74,
  },
});

export class SwordFactory {
  constructor(glowTex, options = {}){
    this.glowTex = glowTex;
    this.defaultType = options.defaultType ?? DEFAULT_SWORD_TYPE;
    this.defaultSkin = options.defaultSkin ?? DEFAULT_SWORD_SKIN;
  }

  _resolveSwordOptions(options = {}){
    const type = options.type ?? this.defaultType;
    const skin = options.skin ?? this.defaultSkin;
    return {
      type: SWORD_TYPES[type] ? type : DEFAULT_SWORD_TYPE,
      skin: SWORD_SKINS[skin] ? skin : DEFAULT_SWORD_SKIN,
    };
  }

  _getTypeSpec(type){
    return SWORD_TYPES[type] ?? SWORD_TYPES[DEFAULT_SWORD_TYPE];
  }

  _getSkinSpec(skin){
    return SWORD_SKINS[skin] ?? SWORD_SKINS[DEFAULT_SWORD_SKIN];
  }

  resolveSwordOptions(options = {}){
    return this._resolveSwordOptions(options);
  }

  getTypeSpec(type){
    return this._getTypeSpec(type);
  }

  getSkinSpec(skin){
    return this._getSkinSpec(skin);
  }

  createGlowTexture(){
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32,32,0, 32,32,32);
    grad.addColorStop(0.0,'rgba(255,255,255,1)');
    grad.addColorStop(0.18,'rgba(255,255,255,.7)');
    grad.addColorStop(0.55,'rgba(255,255,255,.20)');
    grad.addColorStop(1.0,'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0,0,64,64);
    const tex = new window.THREE.CanvasTexture(c);
    tex.minFilter = window.THREE.LinearFilter;
    tex.magFilter = window.THREE.LinearFilter;
    return tex;
  }

  /**
   * Projectile kiếm: nhẹ nhưng nhìn "đã":
   * - blade (box) + tip (cone)
   * - glow sprite
   * - trail plane (vệt sáng kéo dài) => đẹp hơn rất nhiều
   */
  createSwordProjectile(colorHex, options = {}){
    const THREE = window.THREE;
    const resolved = this._resolveSwordOptions(options);
    const typeSpec = this._getTypeSpec(resolved.type);
    const skinSpec = this._getSkinSpec(resolved.skin);

    const grp = new THREE.Group();

    const bladeMat = new THREE.MeshStandardMaterial({
      color: skinSpec.baseColor,
      emissive: colorHex,
      emissiveIntensity: skinSpec.emissiveIntensity,
      metalness: skinSpec.metalness,
      roughness: skinSpec.roughness,
      transparent:true,
      opacity: skinSpec.opacity
    });

    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(typeSpec.blade.w, typeSpec.blade.h, typeSpec.blade.d),
      bladeMat
    );
    blade.position.y = typeSpec.blade.h * 0.5;

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(typeSpec.tip.r, typeSpec.tip.h, typeSpec.tip.seg),
      bladeMat.clone()
    );
    tip.position.y = typeSpec.blade.h + (typeSpec.tip.h * 0.5);
    tip.rotation.x = Math.PI;

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex,
      color: colorHex,
      transparent:true,
      opacity: skinSpec.glowOpacity,
      depthWrite:false,
      blending: THREE.AdditiveBlending
    }));
    glow.position.y = typeSpec.blade.h * 0.5;
    glow.scale.set(typeSpec.glow.w, typeSpec.glow.h, 1);

    // Trail (plane) kéo dài phía sau blade
    const trail = new THREE.Mesh(
      new THREE.PlaneGeometry(typeSpec.trail.w, typeSpec.trail.h),
      new THREE.MeshBasicMaterial({
        map: this.glowTex,
        color: colorHex,
        transparent:true,
        opacity: skinSpec.trailOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite:false,
        side: THREE.DoubleSide
      })
    );
    // đặt trail dọc theo blade (y là hướng tiến)
    trail.position.y = typeSpec.blade.h * 0.25;
    trail.rotation.y = Math.PI / 2;

    grp.add(trail, glow, blade, tip);
    grp.userData = { glow, trail, sword: { ...resolved } };
    return grp;
  }

  createSwordInstancedMesh(colorHex, count, options = {}){
    const THREE = window.THREE;
    const resolved = this._resolveSwordOptions(options);
    const typeSpec = this._getTypeSpec(resolved.type);
    const skinSpec = this._getSkinSpec(resolved.skin);

    const height = typeSpec.blade.h + typeSpec.tip.h;
    const radiusTop = Math.max(0.05, typeSpec.blade.w * 0.18);
    const radiusBottom = Math.max(0.08, typeSpec.blade.w * 0.38);

    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 7);
    const mat = new THREE.MeshStandardMaterial({
      color: skinSpec.baseColor,
      emissive: colorHex,
      emissiveIntensity: skinSpec.emissiveIntensity,
      transparent:true,
      opacity: skinSpec.opacity,
      roughness: skinSpec.roughness,
      metalness: skinSpec.metalness
    });

    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    mesh.userData.sword = { ...resolved };
    return mesh;
  }
}
