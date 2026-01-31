// public/js/display/scene/SceneManager.js
import { getArenaConfig } from "./arenaConfig.js";

export class SceneManager {
  constructor(stageEl, { arenaId } = {}){
    const THREE = window.THREE;
    const arena = getArenaConfig(arenaId);

    this.stageEl = stageEl;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(arena.background);
    this.scene.fog = new THREE.FogExp2(arena.fogColor, arena.fogDensity);

    this.camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 1000);
    this.camera.position.set(0, 16, 66);
    this.camera.lookAt(0, 10, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias:true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.10;

    stageEl.appendChild(this.renderer.domElement);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, arena.ambientIntensity));
    const key = new THREE.DirectionalLight(0xffffff, 0.80);
    key.intensity = arena.keyLightIntensity;
    key.position.set(
      arena.keyLightPosition.x,
      arena.keyLightPosition.y,
      arena.keyLightPosition.z
    );
    this.scene.add(key);

    for (const light of arena.pointLights) {
      const point = new THREE.PointLight(
        light.color,
        light.intensity,
        light.distance,
        light.decay
      );
      point.position.set(light.x, light.y, light.z);
      this.scene.add(point);
    }

    // Ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(60, 72),
      new THREE.MeshStandardMaterial({
        color: arena.groundColor,
        roughness: 0.95,
        metalness: 0.05
      })
    );
    ground.rotation.x = -Math.PI/2;
    ground.position.y = 0;
    this.scene.add(ground);

    // Arena ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(34, 36, 96),
      new THREE.MeshStandardMaterial({
        color: arena.ringColor,
        emissive: arena.ringColor,
        emissiveIntensity: arena.ringEmissiveIntensity,
        transparent:true,
        opacity: arena.ringOpacity,
        side: THREE.DoubleSide
      })
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.y = 0.02;
    this.scene.add(ring);

    // Stars
    this.stars = this._createStars();

    // Postprocessing bloom (safe)
    this.composer = null;
    this.useComposer = false;
    this._setupComposerSafe();

    this.camShake = 0;
  }

  _createStars(){
    const THREE = window.THREE;
    const starCount = 1200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(starCount * 3);
    for(let i=0;i<starCount;i++){
      pos[i*3+0] = (Math.random()-0.5)*360;
      pos[i*3+1] = (Math.random())*180 + 10;
      pos[i*3+2] = -30 - Math.random()*560;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.75, transparent:true, opacity:0.75, depthWrite:false });
    const pts = new THREE.Points(geo, mat);
    pts.userData.rot = (Math.random()*0.5 + 0.15) * (Math.random()<0.5?-1:1);
    this.scene.add(pts);
    return pts;
  }

  _setupComposerSafe(){
    try{
      const THREE = window.THREE;
      this.composer = new THREE.EffectComposer(this.renderer);
      this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
      const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.15, 0.85, 0.22);
      this.composer.addPass(bloom);
      this.useComposer = true;
    }catch(_){
      this.useComposer = false;
      this.composer = null;
    }
  }

  shake(amount){
    this.camShake = Math.max(this.camShake, amount);
  }

  update(dt){
    if (this.stars){
      this.stars.rotation.y += this.stars.userData.rot * dt * 0.06;
      this.stars.rotation.x += this.stars.userData.rot * dt * 0.02;
    }

    this.camShake = Math.max(0, this.camShake - dt * 1.8);
    const sx = (Math.random()-0.5) * 0.45 * this.camShake;
    const sy = (Math.random()-0.5) * 0.28 * this.camShake;
    this.camera.position.x = sx;
    this.camera.position.y = 16 + sy;
    this.camera.lookAt(0, 10, 0);
  }

  render(){
    if (this.useComposer && this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    // this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // this.renderer.toneMapping = THREE.NoToneMapping;
  }

  resize(){
    this.camera.aspect = innerWidth/innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    if (this.useComposer && this.composer) this.composer.setSize(innerWidth, innerHeight);
  }
}
