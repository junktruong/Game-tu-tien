import { clamp, easeInOutSine, easeOutCubic, lerp } from "../utils";
import type { ArmPosePacket, QuatArray } from "../../../shared/ArmPoseTypes";

const DEFAULT_MODEL_URL = "/models/model06.glb";
const MODEL_TARGET_HEIGHT = 14;
const MODEL_MIN_SCALE = 0.2;
const MODEL_MAX_SCALE = 8.0;
const DEFAULT_MODEL_SCALE = 1;
const MODEL_FORWARD_AXIS: Record<string, "X" | "Z"> = {
  "/models/model01.glb": "X",
  "/models/model02.glb": "Z",
  "/models/model04.glb": "Z",
  "/models/model05.glb": "Z",
  "/models/model06.glb": "Z",
  "/models/stick_fighter.glb": "Z",
};
const MODEL_YAW_OFFSET: Record<string, number> = {
  "/models/model05.glb": Math.PI, 
  "/models/model06.glb": Math.PI,
};
const SKINNABLE_MODEL_URLS = new Set(["/models/stick_fighter.glb"]);
const FORCE_SOLID_MATERIAL_MODELS = new Set(["/models/model02.glb", "/models/model04.glb"]);
const FORCE_UNLIT_MATERIAL_MODELS = new Set(["/models/model04.glb"]);
const MODEL_DIM_COLOR = 0xb8b8b8;
const DEFAULT_SKIN_URL = "/skins/stick_skin.png";
const MODEL_ANIM_CLIPS: Record<
  string,
  {
    attack?: string;
    heavy?: string;
    skill?: string;
    defend?: string;
    hit?: string;
    ult?: string;
    recover?: string;
  }
> = {
  "/models/model05.glb": {
    attack: "Fighting Left Jab",
    heavy: "Backflip",
    skill: "Bow",
    defend: "Defend",
    hit: "Hit_Knockback_RM",
    ult: "Levitate Entrance",
    recover: "LayToIdle",
  },
  "/models/model06.glb": {
    attack: "Sword_Regular_A",
    heavy: "Sword_Regular_B",
    skill: "Sword_Regular_Combo",
    defend: "Defend",
    hit: "Hit_Chest",
    ult: "Levitate Entrance",
  },
};
const SHOW_HAND_SWORD = false;
const MODEL_ANIM_IDLE_MAP: Record<string, string> = {
  "/models/model06.glb": "Levitate Idle",
};
const MODEL_ANIM_HIT_MAP: Record<string, Record<string, string>> = {
  "/models/model06.glb": {
    FAN: "Hit_Knockback_RM",
  },
};
const MODEL_ANIM_RECOVERY_MAP: Record<string, Record<string, string>> = {
  "/models/model06.glb": {
    FAN: "LayToIdle",
  },
};
const MODEL_ANIM_SKILL_MAP: Record<string, Record<string, string>> = {
  "/models/model05.glb": {
    BASIC_ATTACK: "Fighting Left Jab",
    SPIN: "Backflip",
    GIANT: "Levitate Entrance",
    FAN: "Backflip",
    LOTUS: "Bow",
    WALL: "Defend",
    SPHERE: "Defend",
    SHAKA: "Bow",
    ULT: "Levitate Entrance",
  },
  "/models/model06.glb": {
    BASIC_ATTACK: "Sword_Regular_A",
    SPIN: "Sword_Regular_Combo",
    GIANT: "Levitate Entrance",
    FAN: "Meditate",
    LOTUS: "Meditate",
    WALL: "Defend",
    SPHERE: "Defend",
    SHAKA: "Meditate",
    ULT: "Levitate Entrance",
  },
};
const DISABLE_PROCEDURAL_POSE_MODELS = new Set(["/models/model06.glb"]);

const MODEL_METRICS = Object.freeze({
  upperLegH: 3.8,
  lowerLegH: 3.6,
  torsoH: 5.2,
  headH: 2.4,
  upperArmH: 3.0,
  lowerArmH: 2.6,
  legW: 1.4,
  legD: 1.4,
  torsoW: 3.6,
  torsoD: 1.8,
  headW: 2.6,
  headD: 2.4,
  armW: 1.1,
  armD: 1.1,
  legX: 1.0,
  shoulderGap: 0.2,
  shoulderDrop: 0.4,
});

type ActionName = "IDLE" | "RUN" | "ATTACK" | "HEAVY_ATTACK" | "SKILL" | "HURT";

type CastConfig = {
  charge?: number;
  swing?: number;
  step?: number;
  lean?: number;
  slashFrom?: number;
  slashTo?: number;
  isSkill?: boolean;
  heavy?: boolean;
  skillId?: string;
};

type GesturePose = {
  armRX?: number;
  armLX?: number;
  armRZ?: number;
  armLZ?: number;
  forearmRZ?: number;
  forearmLZ?: number;
};

type StickFighterInit = {
  colorHex: number;
  x: number;
  facing: number;
  textureUrl?: string;
  modelUrl?: string;
  swordFactory?: any;
};

const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

const GESTURE_POSES: Record<string, GesturePose> = Object.freeze({
  IDLE: {},
  LOTUS: { armRX: -0.25, armLX: -0.25, armRZ: 0.8, armLZ: -0.8, forearmRZ: 0.25, forearmLZ: -0.25 },
  SPHERE: { armRX: -0.35, armLX: -0.35, armRZ: 0.2, armLZ: -0.2, forearmRZ: 1.0, forearmLZ: -1.0 },
  ATTACK: { armRX: -0.25, armRZ: 0.55, forearmRZ: 1.1, armLX: -0.15, armLZ: -0.2, forearmLZ: -0.3 },
  WALL: { armRX: -0.55, armLX: -0.55, armRZ: -0.4, forearmRZ: -0.8, armLZ: 0.4, forearmLZ: 0.8 },
  SPIN: { armRX: -0.2, armLX: -0.2, armRZ: 1.0, armLZ: -1.0, forearmRZ: 0.6, forearmLZ: -0.6 },
  POINT: { armRX: -0.4, armRZ: 0.4, forearmRZ: 1.25 },
  GIANT: { armRX: -1.1, armLX: -1.1, forearmRZ: 0.15, forearmLZ: -0.15 },
  FAN: { armRX: -0.6, armLX: -0.6, armRZ: 0.7, armLZ: -0.7, forearmRZ: 0.4, forearmLZ: -0.4 },
  SHAKA: { armRX: -0.35, armLX: -0.35, armRZ: 0.15, armLZ: -0.15, forearmRZ: 0.9, forearmLZ: -0.9 },
});

export class StickFighter {
  static _modelUrl: string | null = null;
  static _modelPromise: Promise<any> | null = null;

  scene: any;
  baseX: number;
  baseY: number;
  baseRotZ: number;
  baseRotY: number;
  modelYOffset: number;
  modelScale: number;
  facing: number;
  offsetX: number;
  returnToBase: boolean;
  textureUrl: string;
  modelUrl: string;
  texture: any;
  skinMat: any;
  group: any;
  rig: any;
  shadow: any;
  handRAnchor: any;
  sword: any;
  swordFactory: any;
  swordColor: number;
  pendingSword: { factory: any; colorHex: number } | null;
  currentAction: ActionName;
  runSpeed: number;
  castConfig: CastConfig | null;
  parts: Record<string, any>;
  basePose: Record<string, any>;
  pose: Record<string, number>;
  tmpEuler: any;
  tmpQuat: any;
  mixer: any;
  clipActions: Record<string, any>;
  activeAction: any;
  activeClip: string | null;
  recoveryClip: string | null;
  idleHoldClip: string | null;
  idleHoldUntil: number;
  modelRoot: any;
  baseModelPos: any;
  baseModelQuat: any;
  pendingRecoveryClip: string | null;
  armPose: {
    right: {
      upper: any;
      lower: any;
      hand: any;
      hasUpper: boolean;
      hasLower: boolean;
      hasHand: boolean;
      confidence: number;
    };
    left: {
      upper: any;
      lower: any;
      hand: any;
      hasUpper: boolean;
      hasLower: boolean;
      hasHand: boolean;
      confidence: number;
    };
    lastAt: number;
    calibrated: boolean;
  };
  armPoseBlend: number;
  gesturePoseName: string;
  gestureBlend: number;
  flashT: number;
  flashDur: number;
  liftT: number;
  liftDur: number;
  liftHeight: number;
  liftTiltDeg: number;
  hitLockUntil: number;
  anim: {
    mode: string;
    t: number;
    hitBack: number;
    hitRecover: number;
    hitDist: number;
    hitDir: number;
  };
  hasRigParts: boolean;
  hasSkin: boolean;

  constructor(scene: any, { colorHex, x, facing, textureUrl, modelUrl, swordFactory }: StickFighterInit) {
    const THREE = window.THREE;

    this.scene = scene;
    this.baseX = x;
    this.baseY = 0;
    this.baseRotZ = 0;
    this.baseRotY = 0;
    this.modelYOffset = 0;
    this.modelScale = DEFAULT_MODEL_SCALE;
    this.facing = facing;
    this.offsetX = 0;
    this.returnToBase = false;
    this.modelUrl = modelUrl || DEFAULT_MODEL_URL;

    // Character skin flow: resolve URL -> load texture -> bind to shared skin material.
    this.textureUrl = this.resolveTextureUrl(textureUrl);
    this.texture = this.createTexture(this.textureUrl);

    this.skinMat = new THREE.MeshStandardMaterial({
      map: this.texture,
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.05,
      flatShading: false,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
    });

    this.group = new THREE.Group();
    this.rig = new THREE.Group();
    this.group.add(this.rig);
    this.group.position.set(this.baseX, this.baseY, 0);
    this.group.rotation.z = this.baseRotZ;
    // Face opponent along X axis, based on model forward axis.
    this.baseRotY = this.getFacingRotationY();
    this.group.rotation.y = this.baseRotY;
    this.group.scale.setScalar(DEFAULT_MODEL_SCALE);

    this.shadow = this.createShadow();
    this.group.add(this.shadow);

    this.handRAnchor = null;
    this.sword = null;
    this.swordFactory = swordFactory || null;
    this.swordColor = colorHex;
    this.pendingSword = null;

    this.currentAction = "IDLE";
    this.runSpeed = 7.0;
    this.castConfig = null;

    this.parts = {};
    this.basePose = {};
    this.pose = {
      torsoBob: 0,
      torsoTilt: 0,
      headTilt: 0,
      armRX: 0,
      armRZ: 0,
      forearmRZ: 0,
      armLX: 0,
      armLZ: 0,
      forearmLZ: 0,
      legRX: 0,
      legLX: 0,
      calfRX: 0,
      calfLX: 0,
      bodyTilt: 0,
    };
    this.tmpEuler = new THREE.Euler(0, 0, 0, "XYZ");
    this.tmpQuat = new THREE.Quaternion();
    this.mixer = null;
    this.clipActions = {};
    this.activeAction = null;
    this.activeClip = null;
    this.recoveryClip = null;
    this.idleHoldClip = null;
    this.idleHoldUntil = 0;
    this.modelRoot = null;
    this.baseModelPos = null;
    this.baseModelQuat = null;
    this.pendingRecoveryClip = null;

    this.flashT = 0;
    this.flashDur = 0;
    this.liftT = 0;
    this.liftDur = 0;
    this.liftHeight = 0;
    this.liftTiltDeg = 0;
    this.hitLockUntil = 0;

    this.anim = {
      mode: "idle",
      t: 0,
      hitBack: 0.2,
      hitRecover: 0.4,
      hitDist: 3.0,
      hitDir: 0,
    };
    this.hasRigParts = false;
    this.hasSkin = false;

    this.armPose = {
      right: {
        upper: new THREE.Quaternion(),
        lower: new THREE.Quaternion(),
        hand: new THREE.Quaternion(),
        hasUpper: false,
        hasLower: false,
        hasHand: false,
        confidence: 0,
      },
      left: {
        upper: new THREE.Quaternion(),
        lower: new THREE.Quaternion(),
        hand: new THREE.Quaternion(),
        hasUpper: false,
        hasLower: false,
        hasHand: false,
        confidence: 0,
      },
      lastAt: 0,
      calibrated: false,
    };
    this.armPoseBlend = 0;
    this.gesturePoseName = "IDLE";
    this.gestureBlend = 0;

    scene.add(this.group);

    this.buildCharacter();

    if (this.swordFactory) {
      this.attachSword(this.swordFactory, this.swordColor);
    }
  }

  static async loadModel(url: string) {
    if (!this._modelPromise || this._modelUrl !== url) {
      this._modelUrl = url;
      this._modelPromise = (async () => {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();
        return new Promise((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });
      })();
    }
    return this._modelPromise;
  }

  async buildCharacter() {
    const THREE = window.THREE;
    this.rig.clear();
    this.parts = {};
    this.basePose = {};
    this.hasRigParts = false;
    this.hasSkin = false;
    this.modelYOffset = 0;
    this.modelScale = DEFAULT_MODEL_SCALE;
    this.resetAnimations();

    try {
      const gltf = await StickFighter.loadModel(this.modelUrl);
      const source = gltf.scene;
      const hasSkinnedMesh = this.detectSkinnedMesh(source);
      let model = source;
      if (hasSkinnedMesh) {
        const skelMod = (await import(
          "three/examples/jsm/utils/SkeletonUtils.js"
        )) as {
          clone?: (root: any) => any;
          SkeletonUtils?: { clone?: (root: any) => any };
        };
        const cloneFn = skelMod.clone ?? skelMod.SkeletonUtils?.clone;
        model = cloneFn ? cloneFn(source) : source.clone(true);
      } else {
        model = source.clone(true);
      }
      if (this.shouldApplySkinMaterial()) {
        this.applySkinMaterial(model);
      } else {
        this.applyModelShadows(model);
        this.ensureModelVisible(model);
        if (FORCE_SOLID_MATERIAL_MODELS.has(this.modelUrl)) {
          this.applySolidMaterial(model);
        }
      }
      this.hasSkin = this.detectSkinnedMesh(model);
      if (this.hasSkin) {
        this.prepareSkinnedMeshes(model);
      }
      this.rig.add(model);
      this.modelRoot = model;
      this.baseModelPos = model.position.clone();
      this.baseModelQuat = model.quaternion.clone();
      this.setupAnimations(gltf, model);
      this.bindParts(model);
      this.hasRigParts = this.hasBoundParts();
      this.updateModelMetrics(model);
      if (!this.handRAnchor) {
        this.createFallbackHandAnchor(model);
      }
    } catch (err) {
      console.error("Failed to load model", this.modelUrl, err);
      const fallback = this.buildProcedural(THREE);
      this.rig.add(fallback);
      this.modelRoot = fallback;
      this.baseModelPos = fallback.position.clone();
      this.baseModelQuat = fallback.quaternion.clone();
      this.bindParts(fallback);
      this.hasRigParts = this.hasBoundParts();
      this.updateModelMetrics(fallback);
    }

    if (this.pendingSword) {
      this.attachSword(this.pendingSword.factory, this.pendingSword.colorHex);
      this.pendingSword = null;
    }

    if (this.hasRigParts && !this.hasSkin) {
      console.warn("Model has bones but no skin weights; limb animation may not affect the mesh.", this.modelUrl);
    }

    if (!this.hasRigParts) {
      console.warn("No rig parts found. Check bone names or mapping.", this.modelUrl);
    }

    console.info("Model loaded", {
      url: this.modelUrl,
      hasSkin: this.hasSkin,
      hasRigParts: this.hasRigParts,
      scale: this.modelScale,
      yOffset: this.modelYOffset,
    });
  }

  shouldApplySkinMaterial() {
    return SKINNABLE_MODEL_URLS.has(this.modelUrl);
  }

  getFacingRotationY() {
    const axis = MODEL_FORWARD_AXIS[this.modelUrl] || "X";
    const base = axis === "Z" ? -Math.PI / 2 : 0;
    const offset = MODEL_YAW_OFFSET[this.modelUrl] || 0;
    return base + (this.facing === 1 ? 0 : Math.PI) + offset;
  }

  applyModelShadows(model: any) {
    model.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = false;
      }
    });
  }

  ensureModelVisible(model: any) {
    const THREE = window.THREE;
    model.traverse((obj: any) => {
      if (obj.isMesh || obj.isSkinnedMesh) {
        obj.visible = true;
        obj.frustumCulled = false;
        const applyMat = (mat: any) => {
          if (!mat) return;
          if ("side" in mat) mat.side = THREE.DoubleSide;
          if ("transparent" in mat && mat.transparent) {
            mat.transparent = false;
            if ("opacity" in mat) mat.opacity = 1;
          }
          if ("alphaTest" in mat) mat.alphaTest = 0;
          if ("depthWrite" in mat) mat.depthWrite = true;
          if ("depthTest" in mat) mat.depthTest = true;
          mat.needsUpdate = true;
        };
        if (Array.isArray(obj.material)) obj.material.forEach(applyMat);
        else applyMat(obj.material);
      }
    });
  }

  applySolidMaterial(model: any) {
    const THREE = window.THREE;
    const useUnlit = FORCE_UNLIT_MATERIAL_MODELS.has(this.modelUrl);
    model.traverse((obj: any) => {
      if (obj.isMesh || obj.isSkinnedMesh) {
        const mat = useUnlit
          ? new THREE.MeshBasicMaterial({
              color: MODEL_DIM_COLOR,
              skinning: Boolean(obj.isSkinnedMesh),
            })
          : new THREE.MeshStandardMaterial({
              color: MODEL_DIM_COLOR,
              roughness: 0.9,
              metalness: 0.05,
              emissive: new THREE.Color(0x000000),
              emissiveIntensity: 0,
              skinning: Boolean(obj.isSkinnedMesh),
            });
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
        obj.material = mat;
        obj.castShadow = true;
        obj.receiveShadow = false;
      }
    });
  }

  prepareSkinnedMeshes(model: any) {
    model.traverse((obj: any) => {
      if (obj.isSkinnedMesh) {
        obj.frustumCulled = false;
        if (obj.normalizeSkinWeights) {
          obj.normalizeSkinWeights();
        }
        if (obj.geometry) {
          if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
          if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
        }
      }
    });
  }

  resetAnimations() {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    this.mixer = null;
    this.clipActions = {};
    this.activeAction = null;
    this.activeClip = null;
    this.recoveryClip = null;
    this.idleHoldClip = null;
    this.idleHoldUntil = 0;
    this.modelRoot = null;
    this.baseModelPos = null;
    this.baseModelQuat = null;
  }

  setupAnimations(gltf: any, model: any) {
    const THREE = window.THREE;
    this.resetAnimations();
    if (!gltf?.animations || gltf.animations.length === 0) {
      return;
    }
    this.mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip: any) => {
      this.clipActions[clip.name] = this.mixer.clipAction(clip);
    });
  }

  getClipForCast(cfg: CastConfig | null) {
    const clips = MODEL_ANIM_CLIPS[this.modelUrl];
    if (!clips) return null;
    const skillId = cfg?.skillId;
    if (skillId) {
      const skillMap = MODEL_ANIM_SKILL_MAP[this.modelUrl];
      if (skillMap && skillMap[skillId]) return skillMap[skillId];
      if (skillId === "ULT" && clips.ult) return clips.ult;
    }
    if (cfg?.isSkill) return clips.skill || clips.attack || null;
    if (cfg?.heavy) return clips.heavy || clips.attack || null;
    return clips.attack || null;
  }

  getClipForHit() {
    const clips = MODEL_ANIM_CLIPS[this.modelUrl];
    return clips?.hit || null;
  }

  getClipForRecovery() {
    const clips = MODEL_ANIM_CLIPS[this.modelUrl];
    return clips?.recover || null;
  }

  getIdleClip() {
    return MODEL_ANIM_IDLE_MAP[this.modelUrl] || null;
  }

  getHitClipForSkill(skillId?: string) {
    if (skillId) {
      const hitMap = MODEL_ANIM_HIT_MAP[this.modelUrl];
      if (hitMap && hitMap[skillId]) return hitMap[skillId];
    }
    return this.getClipForHit();
  }

  getRecoveryClipForSkill(skillId?: string) {
    if (skillId) {
      const recMap = MODEL_ANIM_RECOVERY_MAP[this.modelUrl];
      if (recMap && recMap[skillId]) return recMap[skillId];
    }
    return this.getClipForRecovery();
  }

  getHitTimingForSkill(skillId?: string, heavy = false) {
    if (skillId === "GIANT") {
      return {
        hitBack: heavy ? 0.075 : 0.045,
        hitRecover: heavy ? 0.14 : 0.09,
        hitDist: heavy ? 1.8 : 0.95,
      };
    }

    return {
      hitBack: 0.2,
      hitRecover: 0.4,
      hitDist: heavy ? 4.0 : 2.5,
    };
  }

  playClip(name: string | null, durationSec?: number) {
    if (!name || !this.mixer) return false;
    const action = this.clipActions[name];
    if (!action) return false;
    const THREE = window.THREE;
    const fadeSec =
      durationSec && durationSec > 0.01
        ? Math.min(0.08, Math.max(0.02, durationSec * 0.24))
        : 0.08;

    if (this.activeAction && this.activeAction !== action) {
      this.activeAction.fadeOut(fadeSec);
    }

    action.reset();
    action.enabled = true;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    if (durationSec && durationSec > 0.01) {
      const clipDur = action.getClip()?.duration || 0;
      if (clipDur > 0.01) {
        action.setEffectiveTimeScale(clipDur / durationSec);
      }
    } else {
      action.setEffectiveTimeScale(1);
    }
    action.fadeIn(fadeSec);
    action.play();

    this.activeAction = action;
    this.activeClip = name;
    return true;
  }

  playLoopClip(name: string | null) {
    if (!name || !this.mixer) return false;
    const action = this.clipActions[name];
    if (!action) return false;
    if (this.activeAction === action && typeof action.isRunning === "function" && action.isRunning()) {
      return true;
    }
    const THREE = window.THREE;
    const fadeSec = 0.12;

    if (this.activeAction && this.activeAction !== action) {
      this.activeAction.fadeOut(fadeSec);
    }

    action.reset();
    action.enabled = true;
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.setEffectiveTimeScale(1);
    action.fadeIn(fadeSec);
    action.play();

    this.activeAction = action;
    this.activeClip = name;
    return true;
  }

  resetModelRoot() {
    if (!this.modelRoot || !this.baseModelPos || !this.baseModelQuat) return;
    this.modelRoot.position.copy(this.baseModelPos);
    this.modelRoot.quaternion.copy(this.baseModelQuat);
  }

  setIdleHold(clipName: string | null, durationSec?: number) {
    if (!clipName) {
      this.idleHoldClip = null;
      this.idleHoldUntil = 0;
      return;
    }
    this.idleHoldClip = clipName;
    if (durationSec && Number.isFinite(durationSec) && durationSec > 0) {
      this.idleHoldUntil = performance.now() + durationSec * 1000;
    } else {
      this.idleHoldUntil = Number.POSITIVE_INFINITY;
    }
  }

  clearIdleHold() {
    this.idleHoldClip = null;
    this.idleHoldUntil = 0;
  }

  getActiveIdleHold() {
    if (!this.idleHoldClip) return null;
    if (this.idleHoldUntil === Number.POSITIVE_INFINITY) return this.idleHoldClip;
    return performance.now() < this.idleHoldUntil ? this.idleHoldClip : null;
  }

  updateAnimationMixer(dt: number) {
    if (!this.mixer) return false;
    const THREE = window.THREE;
    this.mixer.update(dt);
    if (this.activeAction) {
      const loopOnce = this.activeAction.loop === THREE.LoopOnce;
      const clip = typeof this.activeAction.getClip === "function" ? this.activeAction.getClip() : null;
      const finishedByTime = loopOnce && clip && this.activeAction.time >= clip.duration - 1e-3;
      const finishedByState =
        typeof this.activeAction.isRunning === "function" ? !this.activeAction.isRunning() : false;

      if (finishedByTime || finishedByState || this.activeAction.paused || !this.activeAction.enabled) {
        this.activeAction.stop?.();
        if (this.activeClip && this.activeClip === this.recoveryClip) {
          this.recoveryClip = null;
        }
        this.activeAction = null;
        this.activeClip = null;
        if (this.pendingRecoveryClip) {
          const recover = this.pendingRecoveryClip;
          this.pendingRecoveryClip = null;
          this.recoveryClip = recover;
          this.playClip(recover, 0.8);
        } else if (this.anim.mode !== "hit") {
          const holdClip = this.getActiveIdleHold();
          this.resetModelRoot();
          if (holdClip) {
            this.playLoopClip(holdClip);
          } else {
            this.playLoopClip(this.getIdleClip());
          }
          if (this.returnToBase) {
            this.returnToBase = false;
            this.offsetX = 0;
          }
        }
      }
    }
    return Boolean(this.activeAction);
  }

  detectSkinnedMesh(model: any) {
    let hasSkin = false;
    model.traverse((obj: any) => {
      if (obj.isSkinnedMesh) {
        hasSkin = true;
      }
    });
    return hasSkin;
  }

  computeMeshBounds(model: any) {
    const THREE = window.THREE;
    const bounds = new THREE.Box3();
    let hasMesh = false;
    model.traverse((obj: any) => {
      if (obj.isMesh || obj.isSkinnedMesh) {
        const box = new THREE.Box3().setFromObject(obj);
        if (!box.isEmpty()) {
          if (!hasMesh) {
            bounds.copy(box);
            hasMesh = true;
          } else {
            bounds.union(box);
          }
        }
      }
    });
    return hasMesh ? bounds : null;
  }

  updateModelMetrics(model: any) {
    const THREE = window.THREE;
    if (!THREE || !model) {
      this.modelYOffset = 0;
      this.modelScale = DEFAULT_MODEL_SCALE;
      return;
    }
    const box = this.computeMeshBounds(model);
    if (!box || box.isEmpty()) {
      this.modelYOffset = 0;
      this.modelScale = DEFAULT_MODEL_SCALE;
      this.group.scale.setScalar(this.modelScale);
      return;
    }
    const size = new THREE.Vector3();
    box.getSize(size);
    const rawHeight = Math.max(0.001, size.y);
    // Heuristic: normalize common unit scales (mm/cm) to game units.
    let normalizedHeight = rawHeight;
    if (rawHeight > 5000) normalizedHeight = rawHeight * 0.001; // mm -> m
    else if (rawHeight > 500) normalizedHeight = rawHeight * 0.01; // cm -> m

    const baseScale = MODEL_TARGET_HEIGHT / Math.max(0.001, normalizedHeight);
    const unclampedScale = baseScale * DEFAULT_MODEL_SCALE;
    this.modelScale = clamp(unclampedScale, MODEL_MIN_SCALE, MODEL_MAX_SCALE);
    this.group.scale.setScalar(this.modelScale);
    const offset = -box.min.y * this.modelScale;
    this.modelYOffset = Number.isFinite(offset) ? offset : 0;

    if (unclampedScale !== this.modelScale) {
      console.warn(
        "Model scale clamped",
        { rawHeight, normalizedHeight, unclampedScale, modelScale: this.modelScale, modelUrl: this.modelUrl }
      );
    }
  }

  buildProcedural(THREE: any) {
    const metrics = MODEL_METRICS;
    const root = new THREE.Group();
    root.name = "StickFighterRoot";

    const rig = new THREE.Group();
    rig.name = "Rig";
    root.add(rig);

    const legTotal = metrics.upperLegH + metrics.lowerLegH;
    const hipY = legTotal;
    const torsoCenterY = hipY + metrics.torsoH / 2;
    const shoulderY = hipY + metrics.torsoH - metrics.shoulderDrop;

    const shoulderX = metrics.torsoW / 2 + metrics.armW / 2 + metrics.shoulderGap;

    const makeCapsule = (w: number, h: number, d: number) => {
      const radius = Math.max(0.05, w / 2);
      const length = Math.max(0.05, h - radius * 2);
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 12), this.skinMat);
      mesh.scale.z = d / w;
      mesh.castShadow = true;
      return mesh;
    };

    const makeCylinder = (w: number, h: number, d: number, taper = 0.08) => {
      const radiusTop = Math.max(0.05, (w / 2) * (1 - taper));
      const radiusBottom = Math.max(0.05, (w / 2) * (1 + taper * 0.6));
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, h, 16, 1), this.skinMat);
      mesh.scale.z = d / w;
      mesh.castShadow = true;
      return mesh;
    };

    const makeSphere = (w: number, h: number, d: number) => {
      const radius = Math.max(0.05, w / 2);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), this.skinMat);
      mesh.scale.y = h / w;
      mesh.scale.z = d / w;
      mesh.castShadow = true;
      return mesh;
    };

    const torso = new THREE.Group();
    torso.name = "Torso";
    torso.position.set(0, torsoCenterY, 0);
    const torsoMesh = makeCylinder(metrics.torsoW, metrics.torsoH, metrics.torsoD);
    torso.add(torsoMesh);
    rig.add(torso);

    const head = new THREE.Group();
    head.name = "Head";
    head.position.set(0, metrics.torsoH / 2 + metrics.headH / 2, 0);
    const headMesh = makeSphere(metrics.headW, metrics.headH, metrics.headD);
    head.add(headMesh);
    torso.add(head);

    const buildArm = (side: "L" | "R") => {
      const sign = side === "L" ? -1 : 1;
      const arm = new THREE.Group();
      arm.name = side === "L" ? "ArmL" : "ArmR";
      arm.position.set(sign * shoulderX, shoulderY - torsoCenterY, 0);
      const upper = makeCapsule(metrics.armW, metrics.upperArmH, metrics.armD);
      upper.position.set(0, -metrics.upperArmH / 2, 0);
      arm.add(upper);

      const forearm = new THREE.Group();
      forearm.name = side === "L" ? "ForearmL" : "ForearmR";
      forearm.position.set(0, -metrics.upperArmH, 0);
      const lower = makeCapsule(metrics.armW * 0.95, metrics.lowerArmH, metrics.armD * 0.95);
      lower.position.set(0, -metrics.lowerArmH / 2, 0);
      forearm.add(lower);

      if (side === "R") {
        const hand = new THREE.Group();
        hand.name = "RightHand";
        hand.position.set(0, -metrics.lowerArmH, 0);
        forearm.add(hand);
      }

      arm.add(forearm);
      return arm;
    };

    torso.add(buildArm("L"));
    torso.add(buildArm("R"));

    const buildLeg = (side: "L" | "R") => {
      const sign = side === "L" ? -1 : 1;
      const leg = new THREE.Group();
      leg.name = side === "L" ? "LegL" : "LegR";
      leg.position.set(sign * metrics.legX, hipY, 0);
      const upper = makeCapsule(metrics.legW, metrics.upperLegH, metrics.legD);
      upper.position.set(0, -metrics.upperLegH / 2, 0);
      leg.add(upper);

      const calf = new THREE.Group();
      calf.name = side === "L" ? "CalfL" : "CalfR";
      calf.position.set(0, -metrics.upperLegH, 0);
      const lower = makeCapsule(metrics.legW * 0.95, metrics.lowerLegH, metrics.legD * 0.95);
      lower.position.set(0, -metrics.lowerLegH / 2, 0);
      calf.add(lower);
      leg.add(calf);
      return leg;
    };

    rig.add(buildLeg("L"));
    rig.add(buildLeg("R"));

    return root;
  }

  applySkinMaterial(model: any) {
    model.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.material = this.skinMat;
        obj.castShadow = true;
        obj.receiveShadow = false;
      }
    });
  }

  hasBoundParts() {
    return Boolean(
      this.parts.torso ||
        this.parts.head ||
        this.parts.armL ||
        this.parts.armR ||
        this.parts.legL ||
        this.parts.legR
    );
  }

  createFallbackHandAnchor(model: any) {
    const THREE = window.THREE;
    const box = new THREE.Box3().setFromObject(model);
    if (!box.isEmpty()) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const hand = new THREE.Group();
      hand.name = "RightHandFallback";
      hand.position.set(size.x * 0.28, center.y + size.y * 0.08, size.z * 0.15);
      this.rig.add(hand);
      this.handRAnchor = hand;
    }
  }

  bindParts(model: any) {
    const lookup = (name: string) => model.getObjectByName?.(name) || null;
    const lookupAny = (...names: string[]) => {
      for (const name of names) {
        const obj = lookup(name);
        if (obj) return obj;
      }
      return null;
    };
    this.parts = {
      torso: lookupAny("spine_03", "spine_02", "spine_01", "Torso", "Spine", "pelvis", "root", "Hips", "Root"),
      spine1: lookupAny("spine_01", "Spine1"),
      spine2: lookupAny("spine_02", "Spine2"),
      spine3: lookupAny("spine_03", "Spine3"),
      neck: lookupAny("neck_01", "Neck"),
      head: lookupAny("head", "Head"),
      clavicleL: lookupAny("clavicle_l", "ClavicleL", "ShoulderL"),
      clavicleR: lookupAny("clavicle_r", "ClavicleR", "ShoulderR"),
      armL: lookupAny("upperarm_l", "ArmL", "UpperArmL", "LeftArm", "Arm_L"),
      forearmL: lookupAny("lowerarm_l", "ForearmL", "LowerArmL", "LeftForeArm", "ForeArm_L"),
      handL: lookupAny("hand_l", "LeftHand", "HandL", "Hand_L"),
      armR: lookupAny("upperarm_r", "ArmR", "UpperArmR", "RightArm", "Arm_R"),
      forearmR: lookupAny("lowerarm_r", "ForearmR", "LowerArmR", "RightForeArm", "ForeArm_R"),
      handR: lookupAny("hand_r", "RightHand", "HandR", "Hand_R", "RightWrist"),
      legL: lookupAny("thigh_l", "LegL", "LegL.001", "UpperLegL", "LeftUpLeg", "Leg_L", "Thigh_L"),
      calfL: lookupAny("calf_l", "CalfL", "CalfL.001", "LowerLegL", "LeftLeg", "Calf_L", "Shin_L"),
      footL: lookupAny("foot_l", "FootL", "LeftFoot"),
      ballL: lookupAny("ball_l", "BallL", "LeftToe", "ToeL"),
      legR: lookupAny("thigh_r", "LegR", "LegR.001", "UpperLegR", "RightUpLeg", "Leg_R", "Thigh_R"),
      calfR: lookupAny("calf_r", "CalfR", "CalfR.001", "LowerLegR", "RightLeg", "Calf_R", "Shin_R"),
      footR: lookupAny("foot_r", "FootR", "RightFoot"),
      ballR: lookupAny("ball_r", "BallR", "RightToe", "ToeR"),
    };

    this.handRAnchor = this.parts.handR || null;

    this.basePose = {
      torsoPos: this.parts.torso?.position.clone() || null,
      torsoRot: this.parts.torso?.quaternion.clone() || null,
      spine1Pos: this.parts.spine1?.position.clone() || null,
      spine1Rot: this.parts.spine1?.quaternion.clone() || null,
      spine2Pos: this.parts.spine2?.position.clone() || null,
      spine2Rot: this.parts.spine2?.quaternion.clone() || null,
      spine3Pos: this.parts.spine3?.position.clone() || null,
      spine3Rot: this.parts.spine3?.quaternion.clone() || null,
      neckPos: this.parts.neck?.position.clone() || null,
      neckRot: this.parts.neck?.quaternion.clone() || null,
      headPos: this.parts.head?.position.clone() || null,
      headRot: this.parts.head?.quaternion.clone() || null,
      clavicleLPos: this.parts.clavicleL?.position.clone() || null,
      clavicleLRot: this.parts.clavicleL?.quaternion.clone() || null,
      clavicleRPos: this.parts.clavicleR?.position.clone() || null,
      clavicleRRot: this.parts.clavicleR?.quaternion.clone() || null,
      armLPos: this.parts.armL?.position.clone() || null,
      armLRot: this.parts.armL?.quaternion.clone() || null,
      forearmLRot: this.parts.forearmL?.quaternion.clone() || null,
      handLRot: this.parts.handL?.quaternion.clone() || null,
      armRPos: this.parts.armR?.position.clone() || null,
      armRRot: this.parts.armR?.quaternion.clone() || null,
      forearmRRot: this.parts.forearmR?.quaternion.clone() || null,
      handRRot: this.parts.handR?.quaternion.clone() || null,
      legLPos: this.parts.legL?.position.clone() || null,
      legLRot: this.parts.legL?.quaternion.clone() || null,
      calfLRot: this.parts.calfL?.quaternion.clone() || null,
      footLPos: this.parts.footL?.position.clone() || null,
      footLRot: this.parts.footL?.quaternion.clone() || null,
      ballLPos: this.parts.ballL?.position.clone() || null,
      ballLRot: this.parts.ballL?.quaternion.clone() || null,
      legRPos: this.parts.legR?.position.clone() || null,
      legRRot: this.parts.legR?.quaternion.clone() || null,
      calfRRot: this.parts.calfR?.quaternion.clone() || null,
      footRPos: this.parts.footR?.position.clone() || null,
      footRRot: this.parts.footR?.quaternion.clone() || null,
      ballRPos: this.parts.ballR?.position.clone() || null,
      ballRRot: this.parts.ballR?.quaternion.clone() || null,
    };
  }

  resolveTextureUrl(url?: string) {
    const trimmed = (url || "").trim();
    return trimmed || DEFAULT_SKIN_URL;
  }

  createTexture(url: string) {
    const THREE = window.THREE;
    const loader = new THREE.TextureLoader();
    const texture = loader.load(
      url,
      () => {
        texture.needsUpdate = true;
      },
      undefined,
      (err: any) => console.error("Lỗi load ảnh:", err)
    );

    if ("colorSpace" in texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
    } else if ("encoding" in texture) {
      texture.encoding = THREE.sRGBEncoding;
    }

    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;

    return texture;
  }

  setTexture(url: string) {
    const nextUrl = this.resolveTextureUrl(url);
    if (nextUrl === this.textureUrl) {
      return;
    }
    this.textureUrl = nextUrl;
    const newTexture = this.createTexture(nextUrl);
    if (this.skinMat) {
      this.skinMat.map = newTexture;
      this.skinMat.needsUpdate = true;
    }
    this.texture = newTexture;
  }

  createShadow() {
    const THREE = window.THREE;
    const shadowGeo = new THREE.CircleGeometry(4.2, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.05, 0);
    return shadow;
  }

  getHandRAnchor() {
    return this.handRAnchor || null;
  }

  attachSword(factory: any, colorHex: number) {
    this.swordFactory = factory;
    this.swordColor = colorHex;
    if (!SHOW_HAND_SWORD) {
      if (this.sword && this.sword.parent) {
        this.sword.parent.remove(this.sword);
      }
      this.sword = null;
      return;
    }
    if (!this.handRAnchor) {
      this.pendingSword = { factory, colorHex };
      return;
    }

    if (this.sword && this.sword.parent) {
      this.sword.parent.remove(this.sword);
    }

    const sword = factory.createSwordProjectile(colorHex);
    sword.scale.set(0.35, 0.35, 0.35);
    sword.position.set(0, -0.1, 0.35);
    sword.rotation.set(0, 0, 0);
    if (sword.userData?.glow?.material) sword.userData.glow.material.opacity = 0.08;
    if (sword.userData?.trail?.material) sword.userData.trail.material.opacity = 0.03;

    this.handRAnchor.add(sword);
    this.sword = sword;
  }

  setHitFlash(ms: number) {
    this.flashDur = Math.max(0.06, ms / 1000);
    this.flashT = 0;
    if (this.skinMat) {
      this.skinMat.emissive.setHex(0xff3333);
      this.skinMat.emissiveIntensity = 0.9;
    }
  }

  playLift(height = 4.5, duration = 0.4, tiltDeg = 18) {
    this.liftHeight = Math.max(0, height);
    this.liftDur = Math.max(0.12, duration);
    this.liftT = 0;
    this.liftTiltDeg = tiltDeg;
  }

  playCast(cfg: CastConfig | null) {
    if (performance.now() < this.hitLockUntil) {
      return;
    }
    if (this.anim.mode === "hit" && this.anim.t < this.anim.hitBack + this.anim.hitRecover) {
      return;
    }
    this.anim.mode = "cast";
    this.anim.t = 0;

    const safeCfg = cfg || {};
    this.castConfig = safeCfg;
    this.pendingRecoveryClip = null;

    if (safeCfg.isSkill) {
      this.currentAction = "SKILL";
    } else if (safeCfg.heavy) {
      this.currentAction = "HEAVY_ATTACK";
    } else {
      this.currentAction = Math.random() > 0.5 ? "HEAVY_ATTACK" : "ATTACK";
    }

    const charge = Math.max(0.04, safeCfg.charge ?? 0.12);
    const swing = Math.max(0.08, safeCfg.swing ?? 0.2);
    const recover = Math.max(0.12, swing * 0.6);
    const total = charge + swing + recover;
    this.playClip(this.getClipForCast(safeCfg), total);
  }

  playHit(heavy = false, skillId?: string) {
    const hitTiming = this.getHitTimingForSkill(skillId, heavy);
    this.anim.mode = "hit";
    this.anim.t = 0;
    this.anim.hitBack = hitTiming.hitBack;
    this.anim.hitRecover = hitTiming.hitRecover;
    this.anim.hitDir = this.baseX < 0 ? -1 : 1;
    this.anim.hitDist = hitTiming.hitDist;

    this.currentAction = "HURT";
    this.hitLockUntil = performance.now() + (this.anim.hitBack + this.anim.hitRecover) * 1000;
    const hitClip = this.getHitClipForSkill(skillId);
    const recoveryClip = this.getRecoveryClipForSkill(skillId);
    this.playClip(hitClip, this.anim.hitBack + this.anim.hitRecover);
    this.pendingRecoveryClip = recoveryClip;
    this.returnToBase = Boolean(recoveryClip) || hitClip === "Hit_Knockback_RM";
  }

  setAction(action: ActionName) {
    this.currentAction = action;
  }

  setGesturePose(gesture: string) {
    const raw = String(gesture || "").toUpperCase();
    if (raw === "GIANT_CHARGE") {
      this.gesturePoseName = "GIANT";
      return;
    }
    if (raw === "GIANT_CANCEL") {
      this.gesturePoseName = "IDLE";
      return;
    }
    if (raw === "AIM") {
      this.gesturePoseName = "POINT";
      return;
    }
    this.gesturePoseName = raw || "IDLE";
  }

  setArmPose(payload: ArmPosePacket) {
    if (!payload) return;
    const now = performance.now();
    const applyQuat = (target: any, arr?: QuatArray | null) => {
      if (!arr || arr.length < 4) return false;
      target.set(arr[0], arr[1], arr[2], arr[3]);
      if (target.lengthSq() > 0) target.normalize();
      return true;
    };

    this.armPose.lastAt = now;
    this.armPose.calibrated = Boolean(payload.calibrated);

    if (payload.right) {
      this.armPose.right.hasUpper = applyQuat(this.armPose.right.upper, payload.right.upper);
      this.armPose.right.hasLower = applyQuat(this.armPose.right.lower, payload.right.lower);
      this.armPose.right.hasHand = applyQuat(this.armPose.right.hand, payload.right.hand);
    }

    if (payload.left) {
      this.armPose.left.hasUpper = applyQuat(this.armPose.left.upper, payload.left.upper);
      this.armPose.left.hasLower = applyQuat(this.armPose.left.lower, payload.left.lower);
      this.armPose.left.hasHand = applyQuat(this.armPose.left.hand, payload.left.hand);
    }

    if (payload.confidence?.right != null) {
      this.armPose.right.confidence = clamp(payload.confidence.right, 0, 1);
    }
    if (payload.confidence?.left != null) {
      this.armPose.left.confidence = clamp(payload.confidence.left, 0, 1);
    }
  }

  getCorePos(y = 9.0) {
    const THREE = window.THREE;
    return new THREE.Vector3(this.group.position.x, y, 0);
  }

  getMuzzlePos() {
    const THREE = window.THREE;
    if (this.handRAnchor) {
      const p = new THREE.Vector3();
      this.handRAnchor.getWorldPosition(p);
      p.x += this.facing * 0.8;
      p.y += 0.2;
      p.z += 0.2;
      return p;
    }
    const p = this.group.position.clone();
    p.x += this.facing * 4.5;
    p.y += 7.0;
    return p;
  }

  update(dt: number, elapsedTime: number) {
    const now = performance.now();
    const a = this.anim;
    a.t += dt;
    const animationActive = this.updateAnimationMixer(dt);
    const allowProcedural = !DISABLE_PROCEDURAL_POSE_MODELS.has(this.modelUrl);
    if (this.anim.mode === "idle" && !this.recoveryClip) {
      const holdClip = this.getActiveIdleHold();
      const desiredClip = holdClip || this.getIdleClip();
      if (desiredClip && this.activeClip !== desiredClip) {
        this.resetModelRoot();
        this.playLoopClip(desiredClip);
        if (this.returnToBase) {
          this.returnToBase = false;
          this.offsetX = 0;
        }
      }
    }

    const forceHit = now < this.hitLockUntil;
    if (forceHit && a.mode !== "hit") {
      a.mode = "hit";
      a.t = 0;
      this.currentAction = "HURT";
    }

    if (this.flashDur > 0 && this.skinMat) {
      this.flashT += dt;
      const p = clamp(this.flashT / this.flashDur, 0, 1);
      this.skinMat.emissiveIntensity = (1 - p) * 0.9;
      if (p >= 1) {
        this.flashDur = 0;
        this.skinMat.emissiveIntensity = 0;
      }
    }

    let targetOffsetX = 0;
    let bodyTilt = 0;
    let torsoLean = 0;
    let attackSwing = 0;
    let castWeight = 0;
    let hitWeight = 0;
    let hitLeanX = 0;

    if (a.mode === "hit") {
      hitWeight = 1;
      const totalHitTime = a.hitBack + a.hitRecover;
      if (a.t < totalHitTime) {
        const p = clamp(a.t / a.hitBack, 0, 1);
        const hitDist = a.hitDist * (this.hasRigParts ? 1 : 2.6);
        targetOffsetX = a.hitDir * hitDist * p;
        bodyTilt = lerp(0, -0.18, easeOutCubic(p));
        const hitPhase = clamp(a.t / totalHitTime, 0, 1);
        const hitPulse = Math.sin(hitPhase * Math.PI);
        hitLeanX = -hitPulse * (this.hasRigParts ? 0.12 : 0.28);
      } else {
        a.mode = "idle";
        this.currentAction = "IDLE";
      }
    } else if (a.mode === "cast") {
      castWeight = 1;
      const cfg = this.castConfig || {};
      const charge = Math.max(0.04, cfg.charge ?? 0.12);
      const swing = Math.max(0.08, cfg.swing ?? 0.2);
      const recover = Math.max(0.12, swing * 0.6);
      const total = charge + swing + recover;
      const step = cfg.step ?? 0;
      const lean = cfg.lean ?? 0;
      const slashFrom = cfg.slashFrom ?? 0.45;
      const slashTo = cfg.slashTo ?? -0.85;
      const power = cfg.heavy ? 1.25 : 1.0;

      if (a.t > total) {
        a.mode = "idle";
        this.currentAction = "IDLE";
      } else {
        const progress = clamp(a.t / total, 0, 1);
        targetOffsetX = step * Math.sin(progress * Math.PI) * this.facing;
        torsoLean = lean * Math.sin(progress * Math.PI);

        if (a.t < charge) {
          const p = clamp(a.t / charge, 0, 1);
          attackSwing = lerp(0, slashFrom, easeOutCubic(p));
        } else if (a.t < charge + swing) {
          const p = clamp((a.t - charge) / swing, 0, 1);
          attackSwing = lerp(slashFrom, slashTo, easeInOutSine(p));
        } else {
          const p = clamp((a.t - charge - swing) / recover, 0, 1);
          attackSwing = lerp(slashTo, 0, easeOutCubic(p));
        }
        attackSwing *= power;
      }
    } else {
      if (this.currentAction !== "RUN") {
        this.currentAction = "IDLE";
      }
    }

    let liftOffset = 0;
    let liftTilt = 0;
    if (this.liftDur > 0) {
      this.liftT += dt;
      const p = clamp(this.liftT / this.liftDur, 0, 1);
      liftOffset = Math.sin(p * Math.PI) * this.liftHeight;
      liftTilt = Math.sin(p * Math.PI) * (this.liftTiltDeg * Math.PI / 180);
      if (p >= 1) {
        this.liftDur = 0;
        this.liftT = 0;
        this.liftTiltDeg = 0;
      }
    }

    if (!allowProcedural) {
      bodyTilt = 0;
      torsoLean = 0;
      hitLeanX = 0;
    }

    let offsetLambda = a.mode === "hit" ? 18 : (a.mode === "cast" ? 14 : 8);
    if (this.returnToBase && a.mode !== "hit") {
      targetOffsetX = 0;
      offsetLambda = 16;
    }
    this.offsetX = damp(this.offsetX, targetOffsetX, offsetLambda, dt);
    if (this.returnToBase && Math.abs(this.offsetX) < 0.02 && a.mode !== "hit") {
      this.returnToBase = false;
      this.offsetX = 0;
    }
    this.group.position.x = this.baseX + this.offsetX;
    this.group.position.y = this.baseY + liftOffset + this.modelYOffset;
    const tiltInput = allowProcedural ? bodyTilt + liftTilt : 0;
    this.pose.bodyTilt = damp(this.pose.bodyTilt, tiltInput, 8, dt);
    this.group.rotation.z = this.baseRotZ + this.pose.bodyTilt;
    this.group.rotation.y = this.baseRotY;
    this.group.rotation.x = allowProcedural ? hitLeanX : 0;

    const idlePhase = elapsedTime * 1.8;
    const idleScale = allowProcedural ? 1.0 : 0.0;
    const idleBob = Math.sin(idlePhase) * 0.12 * idleScale;
    const idleSway = Math.sin(idlePhase * 0.7) * 0.06 * idleScale;
    const idleSwing = Math.sin(idlePhase * 1.4) * 0.18 * idleScale;

    const runActive = this.currentAction === "RUN" && a.mode === "idle";
    const runPhase = elapsedTime * this.runSpeed;
    const runSwing = Math.sin(runPhase);
    const runSwingOpp = Math.sin(runPhase + Math.PI);

    const motionBlend = clamp(1 - (castWeight + hitWeight), 0, 1);
    const idleBlend = runActive ? 0.2 : 1.0;

    const torsoBobTarget = idleBob * motionBlend * idleBlend;
    const torsoTiltTarget = (idleSway * motionBlend * idleBlend) + torsoLean + (hitWeight ? -0.12 : 0);

    let armRXTarget =
      motionBlend *
      (runActive ? runSwing * 0.55 : idleSwing * 0.15) +
      (hitWeight ? -0.1 : 0);
    let armLXTarget =
      motionBlend *
      (runActive ? runSwingOpp * 0.55 : -idleSwing * 0.12) +
      (hitWeight ? -0.1 : 0);

    let armRZTarget = attackSwing;
    let forearmRZTarget = attackSwing * 0.65;
    let armLZTarget = -attackSwing * 0.2;
    let forearmLZTarget = -attackSwing * 0.1;

    if (hitWeight) {
      armRZTarget = lerp(armRZTarget, -0.35, hitWeight);
      armLZTarget = lerp(armLZTarget, -0.25, hitWeight);
      forearmRZTarget = lerp(forearmRZTarget, -0.2, hitWeight);
      forearmLZTarget = lerp(forearmLZTarget, -0.15, hitWeight);
    }

    const gesturePose = GESTURE_POSES[this.gesturePoseName] || GESTURE_POSES.IDLE;
    const gestureTarget = this.gesturePoseName !== "IDLE" ? 1 : 0;
    const gestureActionBlend = a.mode === "cast" || a.mode === "hit" ? 0.35 : 1.0;
    this.gestureBlend = damp(this.gestureBlend, gestureTarget, 8, dt);
    const g = this.gestureBlend * gestureActionBlend;

    if (g > 0.001) {
      armRXTarget += (gesturePose.armRX || 0) * g;
      armLXTarget += (gesturePose.armLX || 0) * g;
      armRZTarget += (gesturePose.armRZ || 0) * g;
      armLZTarget += (gesturePose.armLZ || 0) * g;
      forearmRZTarget += (gesturePose.forearmRZ || 0) * g;
      forearmLZTarget += (gesturePose.forearmLZ || 0) * g;
    }

    const legRXTarget = motionBlend * (runActive ? runSwingOpp * 0.65 : -idleSwing * 0.06) + (hitWeight ? 0.12 : 0);
    const legLXTarget = motionBlend * (runActive ? runSwing * 0.65 : idleSwing * 0.06) + (hitWeight ? 0.12 : 0);
    const calfRXTarget = motionBlend * (runActive ? -runSwingOpp * 0.35 : 0) + (hitWeight ? 0.15 : 0);
    const calfLXTarget = motionBlend * (runActive ? -runSwing * 0.35 : 0) + (hitWeight ? 0.15 : 0);

    this.pose.torsoBob = damp(this.pose.torsoBob, torsoBobTarget, 6, dt);
    this.pose.torsoTilt = damp(this.pose.torsoTilt, torsoTiltTarget, 8, dt);
    this.pose.headTilt = damp(this.pose.headTilt, -this.pose.torsoTilt * 0.6, 8, dt);

    this.pose.armRX = damp(this.pose.armRX, armRXTarget, 10, dt);
    this.pose.armLX = damp(this.pose.armLX, armLXTarget, 10, dt);
    this.pose.armRZ = damp(this.pose.armRZ, armRZTarget, 12, dt);
    this.pose.armLZ = damp(this.pose.armLZ, armLZTarget, 12, dt);
    this.pose.forearmRZ = damp(this.pose.forearmRZ, forearmRZTarget, 12, dt);
    this.pose.forearmLZ = damp(this.pose.forearmLZ, forearmLZTarget, 12, dt);

    this.pose.legRX = damp(this.pose.legRX, legRXTarget, 10, dt);
    this.pose.legLX = damp(this.pose.legLX, legLXTarget, 10, dt);
    this.pose.calfRX = damp(this.pose.calfRX, calfRXTarget, 10, dt);
    this.pose.calfLX = damp(this.pose.calfLX, calfLXTarget, 10, dt);

    const applyLocalRotation = (part: any, baseQuat: any, x = 0, y = 0, z = 0) => {
      if (!part || !baseQuat) return;
      this.tmpEuler.set(x, y, z, "XYZ");
      this.tmpQuat.setFromEuler(this.tmpEuler);
      part.quaternion.copy(baseQuat).multiply(this.tmpQuat);
    };

    if (allowProcedural && !animationActive) {
      if (this.parts.torso && this.basePose.torsoPos) {
        this.parts.torso.position.y = this.basePose.torsoPos.y + this.pose.torsoBob;
        applyLocalRotation(this.parts.torso, this.basePose.torsoRot, 0, 0, this.pose.torsoTilt);
      }
      const spineTilt = this.pose.torsoTilt;
      applyLocalRotation(this.parts.spine1, this.basePose.spine1Rot, 0, 0, spineTilt * 0.35);
      applyLocalRotation(this.parts.spine2, this.basePose.spine2Rot, 0, 0, spineTilt * 0.55);
      applyLocalRotation(this.parts.spine3, this.basePose.spine3Rot, 0, 0, spineTilt * 0.75);
      applyLocalRotation(this.parts.neck, this.basePose.neckRot, 0, 0, spineTilt * 0.4 + this.pose.headTilt * 0.25);
      applyLocalRotation(this.parts.head, this.basePose.headRot, 0, 0, this.pose.headTilt);

      applyLocalRotation(this.parts.armR, this.basePose.armRRot, this.pose.armRX, 0, this.pose.armRZ);
      applyLocalRotation(this.parts.forearmR, this.basePose.forearmRRot, 0, 0, this.pose.forearmRZ);
      applyLocalRotation(this.parts.armL, this.basePose.armLRot, this.pose.armLX, 0, this.pose.armLZ);
      applyLocalRotation(this.parts.forearmL, this.basePose.forearmLRot, 0, 0, this.pose.forearmLZ);

      applyLocalRotation(this.parts.clavicleR, this.basePose.clavicleRRot, this.pose.armRX * 0.1, 0, this.pose.armRZ * 0.2);
      applyLocalRotation(this.parts.clavicleL, this.basePose.clavicleLRot, this.pose.armLX * 0.1, 0, this.pose.armLZ * 0.2);

      if (this.parts.handR && !this.armPose.right.hasHand) {
        applyLocalRotation(this.parts.handR, this.basePose.handRRot, 0, 0, this.pose.forearmRZ * 0.4);
      }
      if (this.parts.handL) {
        applyLocalRotation(this.parts.handL, this.basePose.handLRot, 0, 0, this.pose.forearmLZ * 0.4);
      }

      applyLocalRotation(this.parts.legR, this.basePose.legRRot, this.pose.legRX, 0, 0);
      applyLocalRotation(this.parts.legL, this.basePose.legLRot, this.pose.legLX, 0, 0);
      applyLocalRotation(this.parts.calfR, this.basePose.calfRRot, this.pose.calfRX, 0, 0);
      applyLocalRotation(this.parts.calfL, this.basePose.calfLRot, this.pose.calfLX, 0, 0);
      applyLocalRotation(this.parts.footR, this.basePose.footRRot, -this.pose.calfRX * 0.6, 0, 0);
      applyLocalRotation(this.parts.footL, this.basePose.footLRot, -this.pose.calfLX * 0.6, 0, 0);
      applyLocalRotation(this.parts.ballR, this.basePose.ballRRot, -this.pose.calfRX * 0.3, 0, 0);
      applyLocalRotation(this.parts.ballL, this.basePose.ballLRot, -this.pose.calfLX * 0.3, 0, 0);
    }

    if (!this.hasRigParts && allowProcedural) {
      this.rig.position.y = this.pose.torsoBob;
      this.rig.rotation.z = this.pose.torsoTilt * 0.65;
    }

    const poseAge = now - this.armPose.lastAt;
    const poseFade = poseAge < 450 ? 1 - poseAge / 450 : 0;
    const actionBlend = a.mode === "cast" || a.mode === "hit" ? 0.2 : 1.0;
    const blendTarget = poseFade * actionBlend;
    this.armPoseBlend = damp(this.armPoseBlend, blendTarget, 8, dt);

    const rightBlend = this.armPoseBlend * clamp(this.armPose.right.confidence || 0, 0, 1);
    const leftBlend = this.armPoseBlend * clamp(this.armPose.left.confidence || 0, 0, 1);

    if (allowProcedural && !animationActive) {
      if (rightBlend > 0.001) {
        if (this.parts.armR && this.armPose.right.hasUpper) {
          this.parts.armR.quaternion.slerp(this.armPose.right.upper, rightBlend);
        }
        if (this.parts.forearmR && this.armPose.right.hasLower) {
          this.parts.forearmR.quaternion.slerp(this.armPose.right.lower, rightBlend);
        }
        if (this.handRAnchor && this.armPose.right.hasHand) {
          this.handRAnchor.quaternion.slerp(this.armPose.right.hand, rightBlend);
        }
      }

      if (leftBlend > 0.001) {
        if (this.parts.armL && this.armPose.left.hasUpper) {
          this.parts.armL.quaternion.slerp(this.armPose.left.upper, leftBlend);
        }
        if (this.parts.forearmL && this.armPose.left.hasLower) {
          this.parts.forearmL.quaternion.slerp(this.armPose.left.lower, leftBlend);
        }
      }
    }
  }
}
