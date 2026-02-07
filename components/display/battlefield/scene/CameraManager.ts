import { clamp } from "../utils";

export type CameraMode =
  | "TPS_BACK"
  | "TPS_FRONT"
  | "FPS"
  | "ORBIT"
  | "TOP"
  | "SIDE"
  | "CINEMATIC_A"
  | "CINEMATIC_B";

export type CameraTarget = "center" | "p1" | "p2";

export type CameraCmd = {
  mode?: CameraMode;
  yaw?: number;
  pitch?: number;
  dist?: number;
  fov?: number;
  target?: CameraTarget | number | null;
};

type CameraTargets = {
  center: any;
  p1?: any;
  p2?: any;
};

const DEFAULTS = Object.freeze({
  yaw: 0,
  pitch: 0.18,
  dist: 44,
  fov: 50,
});

export class CameraManager {
  camera: any;
  mode: CameraMode;
  yaw: number;
  pitch: number;
  dist: number;
  fov: number;
  target: CameraTarget;
  smoothingPos: number;
  smoothingRot: number;
  shake: number;
  cinematicT: number;
  _desiredPos: any;
  _desiredQuat: any;
  _tmpMatrix: any;
  _tmpVec: any;

  constructor(camera: any, opts: Partial<Pick<CameraCmd, "mode" | "yaw" | "pitch" | "dist" | "fov">> = {}) {
    const THREE = window.THREE;

    this.camera = camera;
    this.mode = opts.mode || "TPS_BACK";
    this.yaw = Number.isFinite(opts.yaw) ? (opts.yaw as number) : DEFAULTS.yaw;
    this.pitch = Number.isFinite(opts.pitch) ? (opts.pitch as number) : DEFAULTS.pitch;
    this.dist = Number.isFinite(opts.dist) ? (opts.dist as number) : DEFAULTS.dist;
    this.fov = Number.isFinite(opts.fov) ? (opts.fov as number) : DEFAULTS.fov;
    this.target = "center";
    this.smoothingPos = 5.6;
    this.smoothingRot = 7.8;
    this.shake = 0;
    this.cinematicT = 0;

    this._desiredPos = new THREE.Vector3();
    this._desiredQuat = new THREE.Quaternion();
    this._tmpMatrix = new THREE.Matrix4();
    this._tmpVec = new THREE.Vector3();

    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode: CameraMode) {
    this.mode = mode;
  }

  applyCommand(cmd: CameraCmd) {
    if (!cmd) return;
    if (cmd.mode) this.mode = cmd.mode;
    if (cmd.yaw != null && Number.isFinite(cmd.yaw)) this.yaw = cmd.yaw as number;
    if (cmd.pitch != null && Number.isFinite(cmd.pitch)) this.pitch = cmd.pitch as number;
    if (cmd.dist != null && Number.isFinite(cmd.dist)) this.dist = Math.max(6, cmd.dist as number);
    if (cmd.fov != null && Number.isFinite(cmd.fov)) {
      this.fov = clamp(cmd.fov as number, 30, 90);
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
    if (cmd.target != null) {
      if (cmd.target === 1 || cmd.target === "p1") this.target = "p1";
      else if (cmd.target === 2 || cmd.target === "p2") this.target = "p2";
      else this.target = "center";
    }
  }

  addShake(amount: number) {
    this.shake = Math.max(this.shake, amount);
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  _resolveTarget(targets: CameraTargets) {
    if (this.target === "p1" && targets.p1) return targets.p1;
    if (this.target === "p2" && targets.p2) return targets.p2;
    return targets.center;
  }

  update(dt: number, targets: CameraTargets) {
    const THREE = window.THREE;
    if (!this.camera || !THREE || !targets?.center) return;

    this.cinematicT += dt;

    const baseTarget = this._resolveTarget(targets).clone();
    let yaw = this.yaw;
    let pitch = clamp(this.pitch, -1.2, 1.2);
    let dist = this.dist;

    if (this.mode === "TPS_FRONT") {
      yaw = this.yaw + Math.PI;
    }

    if (this.mode === "FPS") {
      dist = 2.2;
      baseTarget.y += 3.0;
    }

    if (this.mode === "TOP") {
      pitch = 1.45;
      dist = Math.max(24, this.dist * 0.9);
    }

    if (this.mode === "SIDE") {
      yaw = Math.PI / 2;
      pitch = 0.12;
      dist = Math.max(22, this.dist * 0.9);
    }

    if (this.mode === "CINEMATIC_A") {
      yaw = this.cinematicT * 0.22;
      pitch = 0.22 + Math.sin(this.cinematicT * 0.4) * 0.08;
      dist = this.dist + Math.sin(this.cinematicT * 0.2) * 6;
      baseTarget.y += 1.2;
    }

    if (this.mode === "CINEMATIC_B") {
      yaw = this.cinematicT * -0.18 + 0.6;
      pitch = 0.12 + Math.sin(this.cinematicT * 0.6) * 0.05;
      dist = this.dist * 0.8 + 4;
      baseTarget.y += 2.0;
    }

    const offset = this._tmpVec.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch)
    ).multiplyScalar(dist);

    this._desiredPos.copy(baseTarget).add(offset);

    const posAlpha = 1 - Math.exp(-this.smoothingPos * dt);
    this.camera.position.lerp(this._desiredPos, posAlpha);

    this._tmpMatrix.lookAt(this._desiredPos, baseTarget, new THREE.Vector3(0, 1, 0));
    this._desiredQuat.setFromRotationMatrix(this._tmpMatrix);

    const rotAlpha = 1 - Math.exp(-this.smoothingRot * dt);
    this.camera.quaternion.slerp(this._desiredQuat, rotAlpha);

    this.shake = Math.max(0, this.shake - dt * 1.8);
    if (this.shake > 0) {
      const sx = (Math.random() - 0.5) * 0.45 * this.shake;
      const sy = (Math.random() - 0.5) * 0.28 * this.shake;
      this.camera.position.x += sx;
      this.camera.position.y += sy;
    }
  }
}
