export type QuatArray = [number, number, number, number];

export type ArmPoseSide = {
  upper: QuatArray;
  lower: QuatArray;
  hand?: QuatArray;
};

export type ArmPosePayload = {
  t: number;
  right?: ArmPoseSide;
  left?: ArmPoseSide;
  confidence?: {
    right?: number;
    left?: number;
  };
  calibrated?: boolean;
};

export type ArmPosePacket = ArmPosePayload & {
  player?: number;
};

export type Vec3 = { x: number; y: number; z: number };

export type ArmCalibration = {
  right?: { upper: Vec3; lower: Vec3 };
  left?: { upper: Vec3; lower: Vec3 };
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function vec3Normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function quatNormalize(q: QuatArray): QuatArray {
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

export function quatFromUnitVectors(a: Vec3, b: Vec3): QuatArray {
  const v1 = vec3Normalize(a);
  const v2 = vec3Normalize(b);
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;

  if (dot < -0.999999) {
    const axis = Math.abs(v1.x) > Math.abs(v1.z)
      ? vec3Normalize({ x: -v1.y, y: v1.x, z: 0 })
      : vec3Normalize({ x: 0, y: -v1.z, z: v1.y });
    return quatNormalize([axis.x, axis.y, axis.z, 0]);
  }

  const cross = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };

  return quatNormalize([cross.x, cross.y, cross.z, 1 + dot]);
}

export function quatMultiply(a: QuatArray, b: QuatArray): QuatArray {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3];
  const bx = b[0], by = b[1], bz = b[2], bw = b[3];
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function quatInvert(q: QuatArray): QuatArray {
  const lenSq = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
  if (!lenSq) return [0, 0, 0, 1];
  const inv = 1 / lenSq;
  return [-q[0] * inv, -q[1] * inv, -q[2] * inv, q[3] * inv];
}

export function quatSlerp(a: QuatArray, b: QuatArray, t: number): QuatArray {
  let ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];

  let cos = ax * bx + ay * by + az * bz + aw * bw;
  if (cos < 0) {
    cos = -cos;
    bx = -bx; by = -by; bz = -bz; bw = -bw;
  }

  if (cos > 0.9995) {
    return quatNormalize([
      ax + (bx - ax) * t,
      ay + (by - ay) * t,
      az + (bz - az) * t,
      aw + (bw - aw) * t,
    ]);
  }

  const theta = Math.acos(Math.max(-1, Math.min(1, cos)));
  const sin = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / sin;
  const w2 = Math.sin(t * theta) / sin;

  return [
    ax * w1 + bx * w2,
    ay * w1 + by * w2,
    az * w1 + bz * w2,
    aw * w1 + bw * w2,
  ];
}

export function buildCalibration(sample: ArmCalibration): ArmCalibration {
  return {
    right: sample.right
      ? {
          upper: vec3Normalize(sample.right.upper),
          lower: vec3Normalize(sample.right.lower),
        }
      : undefined,
    left: sample.left
      ? {
          upper: vec3Normalize(sample.left.upper),
          lower: vec3Normalize(sample.left.lower),
        }
      : undefined,
  };
}

export function poseQuatFromDirs(dir: Vec3, rest: Vec3): QuatArray {
  return quatFromUnitVectors(rest, dir);
}
