import { StickFighter } from "../display/entities/StickFighter.js";

const initProfileCanvas = () => {
  const canvas = document.getElementById("profile-canvas");
  if (!canvas) {
    return false;
  }

  const container = canvas.parentElement;
  const THREE = window.THREE;
  if (!THREE) {
    return false;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else if ("outputEncoding" in renderer) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 10, 30);
  camera.lookAt(0, 8, 0);

  const defaultTexture = "/img/stick_fighter_sheet.png";
  const initialTexture =
    window.__pendingProfileTextureUrl ||
    container?.dataset?.textureUrl ||
    defaultTexture;

  const fighter = new StickFighter(scene, {
    colorHex: "#ffffff",
    x: 0,
    facing: 1,
    textureUrl: initialTexture,
  });

  fighter.group.position.set(0, fighter.group.position.y, 0);

  const resize = () => {
    const width = container?.clientWidth ?? 320;
    const height = container?.clientHeight ?? 240;
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  resize();
  window.addEventListener("resize", resize);

  window.updateProfileSkin = (textureUrl) => {
    if (!textureUrl) {
      return;
    }
    fighter.setTexture(textureUrl);
  };

  if (window.__pendingProfileTextureUrl) {
    window.updateProfileSkin(window.__pendingProfileTextureUrl);
    window.__pendingProfileTextureUrl = undefined;
  }

  const clock = new THREE.Clock();

  const animate = () => {
    const dt = clock.getDelta();
    fighter.update(dt, clock.elapsedTime);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  animate();
  return true;
};

const boot = () => {
  let attempts = 0;
  const tryInit = () => {
    if (initProfileCanvas()) {
      return;
    }
    attempts += 1;
    if (attempts < 60) {
      requestAnimationFrame(tryInit);
    }
  };
  tryInit();
};

boot();
