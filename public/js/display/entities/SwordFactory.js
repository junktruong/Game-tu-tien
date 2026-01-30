// public/js/display/entities/SwordFactory.js
export class SwordFactory {
  constructor(glowTex){
    this.glowTex = glowTex;
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
  createSwordProjectile(colorHex){
    const THREE = window.THREE;

    const grp = new THREE.Group();

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: colorHex,
      emissiveIntensity: 1.0,
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
      opacity:0.70,
      depthWrite:false,
      blending: THREE.AdditiveBlending
    }));
    glow.position.y = 3.1;
    glow.scale.set(4.2, 8.6, 1);

    // Trail (plane) kéo dài phía sau blade
    const trail = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 12.0),
      new THREE.MeshBasicMaterial({
        map: this.glowTex,
        color: colorHex,
        transparent:true,
        opacity:0.28,
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
