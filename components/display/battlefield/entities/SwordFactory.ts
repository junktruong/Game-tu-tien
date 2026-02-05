// public/js/display/entities/SwordFactory.js
export class SwordFactory {
  glowTex: any;
  swordTexture: any;
  swordTextureUrl: string;
  swordAspect: number;
  _swordMeshes: Set<any>;

  constructor(glowTex: any){
    this.glowTex = glowTex;
    this.swordTexture = null;
    this.swordTextureUrl = "";
    this.swordAspect = 0.22;
    this._swordMeshes = new Set();
  }

  createGlowTexture(){
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d") as CanvasRenderingContext2D;
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
  createSwordProjectile(colorHex: number){
    const THREE = window.THREE;
    if (this.swordTextureUrl) {
      return this._createSwordFromTexture(colorHex);
    }
    return this._createSwordDefault(colorHex);
  }

  setSwordTexture(url: string){
    const THREE = window.THREE;
    const nextUrl = (url || "").trim();
    if (!nextUrl) {
      this.swordTextureUrl = "";
      this.swordTexture = null;
      return;
    }
    if (nextUrl === this.swordTextureUrl && this.swordTexture) return;
    this.swordTextureUrl = nextUrl;
    const loader = new THREE.TextureLoader();
    loader.load(
      nextUrl,
      (tex: any) => {
        if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
        else if ("encoding" in tex) tex.encoding = THREE.sRGBEncoding;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        if (tex.image?.width && tex.image?.height) {
          this.swordAspect = tex.image.width / tex.image.height;
        }
        this.swordTexture = tex;
        this._applySwordTexture(tex);
      },
      undefined,
      () => {}
    );
  }

  _applySwordTexture(tex: any){
    for (const root of this._swordMeshes) {
      root.traverse((o: any) => {
        const info = o.userData?.__swordImage;
        if (!info || !o.material) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if ("map" in m) m.map = tex;
          m.needsUpdate = true;
        }
        const aspect = this.swordAspect || info.aspect || 0.22;
        const ratio = aspect / (info.aspect || aspect);
        o.scale.x = (info.baseScaleX || 1) * ratio;
        info.aspect = aspect;
      });
      if (root.userData?.glow?.material) {
        root.userData.glow.material.opacity = 0.22;
      }
      if (root.userData?.trail?.material) {
        root.userData.trail.material.opacity = 0.08;
      }
    }
  }

  _registerSword(mesh: any){
    this._swordMeshes.add(mesh);
  }

  _createSwordFromTexture(colorHex: number){
    const THREE = window.THREE;

    const grp = new THREE.Group();

    const baseHeight = 6.8;
    const aspect = this.swordAspect || 0.22;
    const baseWidth = baseHeight * aspect;

    const bladeGeo = new THREE.PlaneGeometry(baseWidth, baseHeight);
    bladeGeo.translate(0, baseHeight / 2, 0);
    const bladeMat = new THREE.MeshBasicMaterial({
      map: this.swordTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.userData.__swordImage = { aspect, baseScaleX: 1 };
    grp.add(blade);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex,
      color: colorHex,
      transparent:true,
      opacity:0.22,
      depthWrite:false,
      blending: THREE.AdditiveBlending
    }));
    glow.position.y = baseHeight * 0.52;
    glow.scale.set(3.0, 5.8, 1);

    const trail = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 8.0),
      new THREE.MeshBasicMaterial({
        map: this.glowTex,
        color: colorHex,
        transparent:true,
        opacity:0.08,
        blending: THREE.AdditiveBlending,
        depthWrite:false,
        side: THREE.DoubleSide
      })
    );
    trail.position.y = 2.4;
    trail.rotation.y = Math.PI / 2;

    grp.add(trail, glow);
    grp.userData = { glow, trail };
    this._registerSword(grp);
    return grp;
  }

  _createSwordDefault(colorHex: number){
    const THREE = window.THREE;

    const grp = new THREE.Group();

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: colorHex,
      emissiveIntensity: 0.2,
      metalness: 0.35,
      roughness: 0.18,
      transparent:true,
      opacity:0.94
    });

    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 6.2, 0.16),
      bladeMat
    );
    blade.position.y = 3.1;

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.7, 6),
      bladeMat.clone()
    );
    tip.position.y = 6.6;
    tip.rotation.x = Math.PI;

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex,
      color: colorHex,
      transparent:true,
      opacity:0.01,
      depthWrite:false,
      blending: THREE.AdditiveBlending
    }));
    glow.position.y = 3.1;
    glow.scale.set(3.6, 7.2, 1);

    // Trail (plane) kéo dài phía sau blade
    const trail = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 12.0),
      new THREE.MeshBasicMaterial({
        map: this.glowTex,
        color: colorHex,
        transparent:true,
        opacity:0.04,
        blending: THREE.AdditiveBlending,
        depthWrite:false,
        side: THREE.DoubleSide
      })
    );
    // đặt trail dọc theo blade (y là hướng tiến)
    trail.position.y = 1.5;
    trail.rotation.y = Math.PI / 2;

    grp.add(trail, glow, blade, tip);
    grp.userData = { glow, trail };
    return grp;
  }
}
