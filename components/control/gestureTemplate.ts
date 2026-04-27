import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type HandLandmark = Pick<NormalizedLandmark, "x" | "y" | "z"> & {
  visibility?: number;
};

export type NormalizedGesturePoint = {
  x: number;
  y: number;
  z: number;
};

export type NormalizedGesture = NormalizedGesturePoint[];

export type NormalizedVec3 = {
  x: number;
  y: number;
  z: number;
};

export type NormalizedArmSide = {
  upper: NormalizedVec3;
  lower: NormalizedVec3;
  confidence?: number;
};

export type NormalizedArmPose = {
  right?: NormalizedArmSide;
  left?: NormalizedArmSide;
};

export type GestureTemplateFrame = {
  t: number;
  hand: NormalizedGesture;
  arm?: NormalizedArmPose;
  handLabel?: "Left" | "Right" | "Unknown";
};

export type SavedGesture = {
  name: string;
  skillId?: string;
  displayName?: string;
  points?: NormalizedGesture;
  frames?: GestureTemplateFrame[];
  durationMs?: number;
  createdAt: number;
  hand?: "Left" | "Right" | "Unknown";
};

export const HAND_LANDMARK_COUNT = 21;

const EPSILON_SCALE = 1e-6;
const MISSING_ARM_POSE_PENALTY = 0.55;
const HAND_WEIGHT_WITH_ARM = 0.72;
const ARM_WEIGHT_WITH_ARM = 0.28;

export function normalizeLandmarks(
  landmarks: readonly HandLandmark[],
): NormalizedGesture | null {
  if (!landmarks || landmarks.length < HAND_LANDMARK_COUNT) {
    return null;
  }

  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  if (!wrist || !middleMcp) {
    return null;
  }

  const wristZ = wrist.z ?? 0;
  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  const dz = (middleMcp.z ?? 0) - wristZ;
  const scale = Math.hypot(dx, dy, dz);

  if (!Number.isFinite(scale) || scale < EPSILON_SCALE) {
    return null;
  }

  return landmarks.slice(0, HAND_LANDMARK_COUNT).map((point) => ({
    x: (point.x - wrist.x) / scale,
    y: (point.y - wrist.y) / scale,
    z: ((point.z ?? 0) - wristZ) / scale,
  }));
}

export function calculateSimilarity(
  liveNormalized: readonly NormalizedGesturePoint[],
  savedNormalized: readonly NormalizedGesturePoint[],
): number {
  if (
    !liveNormalized ||
    !savedNormalized ||
    liveNormalized.length !== HAND_LANDMARK_COUNT ||
    savedNormalized.length !== HAND_LANDMARK_COUNT
  ) {
    return Number.POSITIVE_INFINITY;
  }

  let totalError = 0;
  for (let i = 0; i < HAND_LANDMARK_COUNT; i += 1) {
    const live = liveNormalized[i];
    const saved = savedNormalized[i];
    if (!live || !saved) {
      return Number.POSITIVE_INFINITY;
    }

    const dx = live.x - saved.x;
    const dy = live.y - saved.y;
    const dz = live.z - saved.z;
    totalError += Math.hypot(dx, dy, dz);
  }

  return totalError / HAND_LANDMARK_COUNT;
}

export function calculateArmPoseSimilarity(
  liveArm: NormalizedArmPose | null | undefined,
  savedArm: NormalizedArmPose | null | undefined,
): number {
  if (!savedArm || (!savedArm.right && !savedArm.left)) {
    return 0;
  }
  if (!liveArm) {
    return MISSING_ARM_POSE_PENALTY;
  }

  let total = 0;
  let count = 0;

  const addSide = (
    liveSide: NormalizedArmSide | undefined,
    savedSide: NormalizedArmSide | undefined,
  ) => {
    if (!savedSide) return;
    if (!liveSide) {
      total += MISSING_ARM_POSE_PENALTY;
      count += 1;
      return;
    }

    total += vec3Distance(liveSide.upper, savedSide.upper);
    total += vec3Distance(liveSide.lower, savedSide.lower);
    count += 2;
  };

  addSide(liveArm.right, savedArm.right);
  addSide(liveArm.left, savedArm.left);

  return count ? total / count : 0;
}

export function calculateFrameSimilarity(
  liveFrame: GestureTemplateFrame,
  savedFrame: GestureTemplateFrame,
): number {
  const handError = calculateSimilarity(liveFrame.hand, savedFrame.hand);
  const armError = calculateArmPoseSimilarity(liveFrame.arm, savedFrame.arm);
  const savedUsesArm = Boolean(savedFrame.arm?.right || savedFrame.arm?.left);

  if (!savedUsesArm) {
    return handError;
  }

  return handError * HAND_WEIGHT_WITH_ARM + armError * ARM_WEIGHT_WITH_ARM;
}

export function calculateMotionSimilarity(
  liveFrames: readonly GestureTemplateFrame[],
  savedFrames: readonly GestureTemplateFrame[],
): number {
  if (!liveFrames.length || !savedFrames.length) {
    return Number.POSITIVE_INFINITY;
  }

  const liveEnd = liveFrames[liveFrames.length - 1]?.t ?? 0;
  const liveStart = liveFrames[0]?.t ?? liveEnd;
  const liveDuration = liveEnd - liveStart;
  const savedDuration = savedFrames[savedFrames.length - 1]?.t ?? 0;
  if (savedDuration > 0 && liveDuration < savedDuration * 0.75) {
    return Number.POSITIVE_INFINITY;
  }
  const liveWindowStart = liveEnd - savedDuration;

  let total = 0;
  let count = 0;
  for (const savedFrame of savedFrames) {
    const targetTime = liveWindowStart + savedFrame.t;
    const liveFrame = findNearestFrame(liveFrames, targetTime);
    if (!liveFrame) continue;
    total += calculateFrameSimilarity(liveFrame, savedFrame);
    count += 1;
  }

  return count ? total / count : Number.POSITIVE_INFINITY;
}

export function isNormalizedGesture(value: unknown): value is NormalizedGesture {
  return (
    Array.isArray(value) &&
    value.length === HAND_LANDMARK_COUNT &&
    value.every(
      (point) =>
        point &&
        typeof point === "object" &&
        Number.isFinite((point as NormalizedGesturePoint).x) &&
        Number.isFinite((point as NormalizedGesturePoint).y) &&
        Number.isFinite((point as NormalizedGesturePoint).z),
    )
  );
}

export function isGestureTemplateFrame(
  value: unknown,
): value is GestureTemplateFrame {
  if (!value || typeof value !== "object") return false;
  const frame = value as GestureTemplateFrame;
  return Number.isFinite(frame.t) && isNormalizedGesture(frame.hand);
}

export function isSavedGesture(value: unknown): value is SavedGesture {
  if (!value || typeof value !== "object") return false;
  const gesture = value as SavedGesture;
  const hasLegacyPoints = isNormalizedGesture(gesture.points);
  const hasMotionFrames =
    Array.isArray(gesture.frames) &&
    gesture.frames.length > 0 &&
    gesture.frames.every(isGestureTemplateFrame);

  return (
    typeof gesture.name === "string" &&
    Number.isFinite(gesture.createdAt) &&
    (hasLegacyPoints || hasMotionFrames)
  );
}

function vec3Distance(a: NormalizedVec3, b: NormalizedVec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function findNearestFrame(
  frames: readonly GestureTemplateFrame[],
  targetTime: number,
) {
  let best: GestureTemplateFrame | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const frame of frames) {
    const delta = Math.abs(frame.t - targetTime);
    if (delta < bestDelta) {
      best = frame;
      bestDelta = delta;
    }
  }

  return best;
}
