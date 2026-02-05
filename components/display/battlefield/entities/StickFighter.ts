// public/js/display/entities/StickFighter.js
import { clamp } from "../utils";

export class StickFighter {
  scene: any;
  baseX: number;
  baseY: number;
  baseRotZ: number;
  facing: number;
  tilesHoriz: number;
  tilesVert: number;
  tileDispDuration: number;
  actions: Record<string, number>;
  actionFrames: Record<number, number>;
  textureUrl: string;
  texture: any;
  mat: any;
  mesh: any;
  group: any;
  flashOverlay: any;
  _flashT: number;
  _flashDur: number;
  liftT: number;
  liftDur: number;
  liftHeight: number;
  liftTiltDeg: number;
  hitLockUntil: number;
  currentAction: number;
  currentFrame: number;
  lastFrameTime: number;
  frameTimer: number;
  anim: {
    mode: string;
    t: number;
    hitBack: number;
    hitRecover: number;
    hitDist: number;
    hitDir: number;
    castSwing: number;
  };

  constructor(scene: any, { colorHex, x, facing, textureUrl }: { colorHex: number; x: number; facing: number; textureUrl?: string }) {
    const THREE = window.THREE;

    this.scene = scene;
    this.baseX = x;
    this.facing = facing; // 1: Phải, -1: Trái

    // --- 1. CẤU HÌNH SPRITE SHEET (2816x1536) ---
    this.tilesHoriz = 8; // 8 cột (frames)
    this.tilesVert = 6;  // 5 hàng (actions)

    // Tốc độ animation (ms/frame)
    this.tileDispDuration = 70;

    // Định nghĩa hành động map với số hàng (Row Index 0 -> 4)
    this.actions = {
      IDLE: 0,          // Hàng 1
      ATTACK: 5,        // Hàng 2
      SKILL: 1,         // Hàng 3
      RUN: 3,           // Hàng 4
      HEAVY_ATTACK: 4,  // Hàng 5
      HURT: 2
    };

    // Số lượng frame thực tế cho mỗi hành động
    this.actionFrames = {
      [this.actions.IDLE]: 8,
      [this.actions.ATTACK]: 8,
      [this.actions.SKILL]: 4,      // Hàng 3 chỉ có 4 frame đầu
      [this.actions.RUN]: 8,
      [this.actions.HEAVY_ATTACK]: 8,
      [this.actions.HURT]: 8
    };

    // Load Texture
    const url = textureUrl || "/img/stick_fighter_sheet.png";
    this.textureUrl = url;
    this.texture = this.createTexture(url);

    // ===== Material CHÍNH: luôn trắng để KHÔNG bị tint (đè màu) =====
    this.mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide,
      color: 0xffffff,      // <<< giữ nguyên màu ảnh
      depthWrite: false
    });

    // --- TÍNH TOÁN TỶ LỆ ---
    const sheetWidth = 2816;
    const sheetHeight = 1536;
    const tileW = sheetWidth / this.tilesHoriz;
    const tileH = sheetHeight / this.tilesVert;
    const spriteRatio = tileW / tileH;

    const planeHeight = 15;
    const planeWidth = planeHeight * spriteRatio;

    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    this.mesh = new THREE.Mesh(geometry, this.mat);

    // Group chính
    this.group = new THREE.Group();
    this.group.add(this.mesh);

    // Căn chân chạm đất
    this.baseY = planeHeight / 2;
    this.group.position.set(x, this.baseY, 0);
    this.baseRotZ = 0;
    this.group.rotation.z = this.baseRotZ;

    if (this.facing === -1) {
      this.mesh.scale.x = -1;
    }

    // Shadow
    const shadowGeo = new THREE.CircleGeometry(4.0, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -planeHeight / 2 + 0.2, 0);
    this.group.add(shadow);

    // ===== FIX HIT FLASH: dùng overlay additive, KHÔNG đổi mat.color của texture =====
    const flashMat = new THREE.MeshBasicMaterial({
      map: this.texture,
      color: 0xff3333,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.flashOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(planeWidth, planeHeight),
      flashMat
    );
    this.flashOverlay.position.set(0, 0, 0.01); // nhích lên tránh z-fight
    if (this.facing === -1) this.flashOverlay.scale.x = -1;
    this.group.add(this.flashOverlay);

    // flash state
    this._flashT = 0;
    this._flashDur = 0;
    this.liftT = 0;
    this.liftDur = 0;
    this.liftHeight = 0;
    this.liftTiltDeg = 0;
    this.hitLockUntil = 0;

    scene.add(this.group);

    // --- ANIMATION STATE ---
    this.currentAction = this.actions.IDLE;
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    this.frameTimer = 0;

    this.anim = {
      mode: "idle",
      t: 0,
      hitBack: 0.2,
      hitRecover: 0.4,
      hitDist: 3.0,
      hitDir: 0,
      castSwing: 0.5
    };

    // set frame initial
    this.updateTextureOffset();
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

    // ===== FIX MÀU: đảm bảo texture dùng sRGB =====
    if ("colorSpace" in texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
    } else if ("encoding" in texture) {
      texture.encoding = THREE.sRGBEncoding;
    }

    // Wrap + repeat đúng sprite sheet
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1 / this.tilesHoriz, 1 / this.tilesVert);
    texture.offset.set(0, 1 - (1 / this.tilesVert));

    // Filter: sprite bạn là vẽ smooth -> Linear đẹp hơn Nearest
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;

    return texture;
  }

  setTexture(url: string) {
    if (!url || url === this.textureUrl) {
      return;
    }
    this.textureUrl = url;
    const newTexture = this.createTexture(url);
    if (this.mat) {
      this.mat.map = newTexture;
      this.mat.needsUpdate = true;
    }
    if (this.flashOverlay?.material) {
      this.flashOverlay.material.map = newTexture;
      this.flashOverlay.material.needsUpdate = true;
    }
    this.texture = newTexture;
    this.updateTextureOffset();
  }

  // ===== Flash overlay (không tint texture) =====
  setHitFlash(ms: number) {
    this._flashDur = Math.max(0.06, ms / 1000);
    this._flashT = 0;
    if (this.flashOverlay?.material) {
      this.flashOverlay.material.opacity = 0.85;
    }
  }

  playLift(height = 4.5, duration = 0.4, tiltDeg = 18) {
    this.liftHeight = Math.max(0, height);
    this.liftDur = Math.max(0.12, duration);
    this.liftT = 0;
    this.liftTiltDeg = tiltDeg;
  }

  playCast(cfg: { isSkill?: boolean } | null) {
    if (performance.now() < this.hitLockUntil) {
      return;
    }
    if (this.anim.mode === "hit" && this.anim.t < this.anim.hitBack + this.anim.hitRecover) {
      return;
    }
    this.anim.mode = "cast";
    this.anim.t = 0;

    if (cfg && cfg.isSkill) {
      this.changeAction(this.actions.SKILL);
    } else {
      const useHeavy = Math.random() > 0.5;
      this.changeAction(useHeavy ? this.actions.HEAVY_ATTACK : this.actions.ATTACK);
    }
  }

  playHit(heavy = false) {
    this.anim.mode = "hit";
    this.anim.t = 0;
    this.anim.hitDir = (this.baseX < 0 ? -1 : 1);
    this.anim.hitDist = heavy ? 4.0 : 2.5;

    this.changeAction(this.actions.HURT);
    this.hitLockUntil = performance.now() + (this.anim.hitBack + this.anim.hitRecover) * 1000;

  }

  changeAction(newAction: number) {
    if (this.currentAction !== newAction) {
      this.currentAction = newAction;
      this.currentFrame = 0;
      this.lastFrameTime = 0;
      this.frameTimer = 0;
      this.updateTextureOffset();
    }
  }

  getCorePos(y = 9.0) {
    const THREE = window.THREE;
    return new THREE.Vector3(this.group.position.x, y, 0);
  }

  getMuzzlePos() {
    const THREE = window.THREE;
    const p = this.group.position.clone();
    p.x += this.facing * 4.5;
    p.y -= 0.5;
    return p;
  }

  update(dt: number, elapsedTime: number) {
    const now = performance.now();
    const a = this.anim;
    a.t += dt;
    let offsetX = 0;
    const forceHit = now < this.hitLockUntil;
    if (forceHit && a.mode !== "hit") {
      a.mode = "hit";
      a.t = 0;
      this.changeAction(this.actions.HURT);
    }

    // ===== Update flash overlay fade =====
    if (this._flashDur > 0 && this.flashOverlay?.material) {
      this._flashT += dt;
      const p = clamp(this._flashT / this._flashDur, 0, 1);
      // fade out nhanh rồi tắt
      this.flashOverlay.material.opacity = (1 - p) * 0.85;
      if (p >= 1) {
        this._flashDur = 0;
        this.flashOverlay.material.opacity = 0;
      }
    }

    // --- A. LOGIC GAME ---
    if (a.mode === "hit") {
      if (this.currentAction !== this.actions.HURT) {
        this.changeAction(this.actions.HURT);
      }
      const totalHitTime = a.hitBack + a.hitRecover;
      if (a.t < totalHitTime) {
        const p = clamp(a.t / a.hitBack, 0, 1);
        offsetX = a.hitDir * a.hitDist * p;
      } else {
        a.mode = "idle";
        this.changeAction(this.actions.IDLE);
      }
    } else if (a.mode === "cast") {
      const frames = this.actionFrames[this.currentAction] || 8;
      const duration = (frames * this.tileDispDuration) / 1000;

      if (a.t > duration) {
        a.mode = "idle";
        this.changeAction(this.actions.IDLE);
      }
    } else {
      this.changeAction(this.actions.IDLE);
    }

    let liftOffset = 0;
    let liftTilt = 0;
    if (this.liftDur > 0) {
      this.liftT += dt;
      const p = clamp(this.liftT / this.liftDur, 0, 1);
      liftOffset = Math.sin(p * Math.PI) * this.liftHeight;
      liftTilt = Math.sin(p * Math.PI) * (this.liftTiltDeg * Math.PI / 180);
      liftTilt *= (this.facing === -1 ? -1 : 1);
      if (p >= 1) {
        this.liftDur = 0;
        this.liftT = 0;
        this.liftTiltDeg = 0;
      }
    }

    this.group.position.x = this.baseX + offsetX;
    this.group.position.y = this.baseY + liftOffset;
    this.group.rotation.z = this.baseRotZ + liftTilt;

    // --- B. ANIMATION SPRITE ---
    this.frameTimer += dt;
    const frameDuration = this.tileDispDuration / 1000;
    if (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration;
      this.lastFrameTime = now;

      const maxFrames = this.actionFrames[this.currentAction] || this.tilesHoriz;

      this.currentFrame = (this.currentFrame + 1) % maxFrames;

      this.updateTextureOffset();
    }
  }

  updateTextureOffset() {
    // u theo frame
    const u = this.currentFrame / this.tilesHoriz;

    // v đảo trục: row 0 là hàng trên cùng
    const v = 1.0 - ((this.currentAction + 1) / this.tilesVert);

    this.texture.offset.x = u;
    this.texture.offset.y = v;
  }
}
