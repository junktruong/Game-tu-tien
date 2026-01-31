// public/js/display/entities/SwordFactory.js
const DEFAULT_SWORD_TYPE = {
  blade: { width: 0.34, height: 6.2, depth: 0.16 },
  tip: { radius: 0.22, height: 0.7, radialSegments: 6 },
  glow: { width: 4.2, height: 8.6 },
  trail: { width: 2.6, height: 12.0, offsetY: 1.5 },
  instanced: { topRadius: 0.1, bottomRadius: 0.22, height: 6.2, radialSegments: 7 },
};

const DEFAULT_SWORD_SKIN = {
  bladeColor: 0xffffff,
  emissiveIntensity: 1.0,
  metalness: 0.35,
  roughness: 0.18,
  opacity: 0.94,
  glowOpacity: 0.7,
  trailOpacity: 0.28,
};

export class SwordFactory {
  constructor(glowTex, { types = {}, skins = {} } = {}){
    this.glowTex = glowTex;
    this.types = types;
    this.skins = skins;
  }

  _resolveType(typeKey){
    return this.types[typeKey] || this.types.default || DEFAULT_SWORD_TYPE;
  }

  _resolveSkin(skinKey){
    return this.skins[skinKey] || this.skins.default || DEFAULT_SWORD_SKIN;
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
  createSwordProjectile(colorHex, { type, skin } = {}){
    const THREE = window.THREE;
    const spec = this._resolveType(type);
    const skinSpec = this._resolveSkin(skin);

    const grp = new THREE.Group();

    const bladeMat = new THREE.MeshStandardMaterial({
      color: skinSpec.bladeColor,
      emissive: colorHex,
      emissiveIntensity: skinSpec.emissiveIntensity,
      metalness: skinSpec.metalness,
      roughness: skinSpec.roughness,
      transparent:true,
      opacity: skinSpec.opacity,
    });

    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(spec.blade.width, spec.blade.height, spec.blade.depth),
      bladeMat
    );
    blade.position.y = spec.blade.height * 0.5;

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(spec.tip.radius, spec.tip.height, spec.tip.radialSegments),
      bladeMat.clone()
    );
    tip.position.y = spec.blade.height + spec.tip.height * 0.5;
    tip.rotation.x = Math.PI;

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex,
      color: colorHex,
      transparent:true,
      opacity: skinSpec.glowOpacity,
      depthWrite:false,
      blending: THREE.AdditiveBlending
    }));
    glow.position.y = spec.blade.height * 0.5;
    glow.scale.set(spec.glow.width, spec.glow.height, 1);

    // Trail (plane) kéo dài phía sau blade
    const trail = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.trail.width, spec.trail.height),
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
    trail.position.y = spec.trail.offsetY ?? spec.blade.height * 0.25;
    trail.rotation.y = Math.PI / 2;

    grp.add(trail, glow, blade, tip);
    grp.userData = { glow, trail };
    return grp;
  }

  createInstancedSwordMesh({ colorHex, count, type, skin } = {}){
    const THREE = window.THREE;
    const spec = this._resolveType(type);
    const skinSpec = this._resolveSkin(skin);
    const instancedSpec = spec.instanced || DEFAULT_SWORD_TYPE.instanced;

    const geo = new THREE.CylinderGeometry(
      instancedSpec.topRadius,
      instancedSpec.bottomRadius,
      instancedSpec.height,
      instancedSpec.radialSegments
    );
    const mat = new THREE.MeshStandardMaterial({
      color: skinSpec.bladeColor,
      emissive: colorHex,
      emissiveIntensity: skinSpec.emissiveIntensity,
      transparent:true,
      opacity: skinSpec.opacity,
      roughness: skinSpec.roughness,
      metalness: skinSpec.metalness,
    });

    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    return mesh;
  }
}
