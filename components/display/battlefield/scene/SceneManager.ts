// public/js/display/scene/SceneManager.js
import { getArenaConfig } from "./arenaConfig";
import { CameraManager } from "./CameraManager";

export class SceneManager {
  stageEl: HTMLElement;
  scene: any;
  camera: any;
  cameraManager: CameraManager;
  renderer: any;
  stars: any;
  composer: any;
  useComposer: boolean;

  constructor(stageEl: HTMLElement, { arenaId }: { arenaId?: string } = {}){
    const THREE = window.THREE;
    const arena = getArenaConfig(arenaId);

    this.stageEl = stageEl;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(arena.background);
    this.scene.fog = new THREE.FogExp2(arena.fogColor, arena.fogDensity);

    this.camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 1000);
    this.camera.position.set(0, 16, 66);
    this.camera.lookAt(0, 10, 0);
    this.cameraManager = new CameraManager(this.camera, {
      mode: "TPS_BACK",
      fov: 50,
      dist: 44,
      pitch: 0.18,
    });

    this.renderer = new THREE.WebGLRenderer({ antialias:true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ("outputColorSpace" in this.renderer) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else {
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;

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
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 180;
    key.shadow.camera.left = -80;
    key.shadow.camera.right = 80;
    key.shadow.camera.top = 80;
    key.shadow.camera.bottom = -80;
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
      new THREE.CircleGeometry(45, 72),
      new THREE.MeshStandardMaterial({
        color: arena.groundColor,
        roughness: 0.95,
        metalness: 0.05
      })
    );
    ground.rotation.x = -Math.PI/2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Arena ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(26, 28, 96),
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

  }

  _createStars() {
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

  _setupComposerSafe() {
    try {
      const THREE = window.THREE;
      this.composer = new THREE.EffectComposer(this.renderer);
      this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
      const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.18, 0.35, 0.6);
      this.composer.addPass(bloom);
      this.useComposer = true;
    } catch (_) {
      this.useComposer = false;
      this.composer = null;
    }
  }

  shake(amount: number) {
    this.cameraManager.addShake(amount);
  }

  applyCameraCommand(cmd: any) {
    this.cameraManager.applyCommand(cmd);
  }

  update(dt: number, targets?: { center: any; p1?: any; p2?: any }) {
    if (this.stars){
      this.stars.rotation.y += this.stars.userData.rot * dt * 0.06;
      this.stars.rotation.x += this.stars.userData.rot * dt * 0.02;
    }

    if (targets?.center) {
      this.cameraManager.update(dt, targets);
    }
  }

  render() {
    if (this.useComposer && this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    // this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // this.renderer.toneMapping = THREE.NoToneMapping;
  }

  resize() {
    this.cameraManager.resize(innerWidth, innerHeight);
    this.renderer.setSize(innerWidth, innerHeight);
    if (this.useComposer && this.composer) this.composer.setSize(innerWidth, innerHeight);
  }
}
