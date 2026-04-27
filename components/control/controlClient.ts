import { io } from 'socket.io-client';
import type {
  HandLandmarker,
  HandLandmarkerResult,
} from '@mediapipe/tasks-vision';
import {
  buildCalibration,
  clamp01,
  poseQuatFromDirs,
  quatSlerp,
  vec3Normalize,
} from '@/components/shared/ArmPoseTypes';
import type {
  ArmCalibration,
  ArmPosePacket,
  QuatArray,
  Vec3,
} from '@/components/shared/ArmPoseTypes';
import {
  calculateMotionSimilarity,
  calculateFrameSimilarity,
  calculateSimilarity,
  isSavedGesture,
  normalizeLandmarks,
  type GestureTemplateFrame,
  type HandLandmark,
  type NormalizedArmPose,
  type NormalizedVec3,
  type SavedGesture,
} from './gestureTemplate';
import {
  findControlSkillOption,
  GESTURE_TO_SKILL_NAME,
  type ControlSkillOption,
} from './skillCatalog';

const GESTURE_TEMPLATE_STORAGE_KEY = 'tuTienGestureTemplatesV1';
const TEMPLATE_MATCH_THRESHOLD = 0.3;
const GIANT_HOLD_MS = 3000;
const GIANT_RELEASE_THRESHOLD = TEMPLATE_MATCH_THRESHOLD * 1.5;
const GIANT_HOLD_LOST_GRACE_MS = 250;
const GIANT_RING_COUNT = 3;
const POST_RECORD_SUPPRESS_MS = 700;
const MATCH_RECAST_MS = 700;
const RECORD_COUNTDOWN_SECONDS = 3;
const RECORD_DURATION_MS = 500;
const RECORD_SAMPLE_INTERVAL_MS = 50;
const LIVE_MOTION_WINDOW_MS = 900;
const ARM_POSE_STALE_MS = 250;
const HAND_DETECT_HZ = 24;
const HAND_DETECT_MS = 1000 / HAND_DETECT_HZ;
const POSE_DETECT_HZ = 18;
const POSE_DETECT_MS = 1000 / POSE_DETECT_HZ;
const MEDIAPIPE_XNNPACK_INFO =
  "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.";

type HandednessLabel = SavedGesture['hand'];
type HandConnection = { start: number; end: number };
type VisionDelegate = "GPU" | "CPU";
type TemplateMatchResult = {
  saved: SavedGesture;
  error: number;
  landmarks: HandLandmark[] | null;
};

const FALLBACK_HAND_CONNECTIONS: HandConnection[] = [
  { start: 0, end: 1 },
  { start: 1, end: 2 },
  { start: 2, end: 3 },
  { start: 3, end: 4 },
  { start: 0, end: 5 },
  { start: 5, end: 6 },
  { start: 6, end: 7 },
  { start: 7, end: 8 },
  { start: 5, end: 9 },
  { start: 9, end: 10 },
  { start: 10, end: 11 },
  { start: 11, end: 12 },
  { start: 9, end: 13 },
  { start: 13, end: 14 },
  { start: 14, end: 15 },
  { start: 15, end: 16 },
  { start: 13, end: 17 },
  { start: 0, end: 17 },
  { start: 17, end: 18 },
  { start: 18, end: 19 },
  { start: 19, end: 20 },
];

declare global {
  interface Window {
    saveGesture?: (gestureName: string) => SavedGesture | null;
    startGestureRecord?: (gestureName?: string) => void;
    getSavedGestures?: () => SavedGesture[];
    clearSavedGestures?: () => void;
    __mediapipeLogFilter?: {
      count: number;
      originalError: typeof console.error;
      originalWarn: typeof console.warn;
      originalInfo: typeof console.info;
      filteredError: typeof console.error;
      filteredWarn: typeof console.warn;
      filteredInfo: typeof console.info;
    };
  }
}

function isMediapipeInfoLog(args: unknown[]) {
  return args.some(
    (arg) =>
      typeof arg === "string" && arg.includes(MEDIAPIPE_XNNPACK_INFO),
  );
}

function installMediapipeLogFilter() {
  const existing = window.__mediapipeLogFilter;
  if (existing) {
    existing.count += 1;
    return () => {
      existing.count -= 1;
      if (existing.count <= 0) {
        console.error = existing.originalError;
        console.warn = existing.originalWarn;
        console.info = existing.originalInfo;
        delete window.__mediapipeLogFilter;
      }
    };
  }

  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const filteredError: typeof console.error = (...args) => {
    if (isMediapipeInfoLog(args)) return;
    originalError(...args);
  };
  const filteredWarn: typeof console.warn = (...args) => {
    if (isMediapipeInfoLog(args)) return;
    originalWarn(...args);
  };
  const filteredInfo: typeof console.info = (...args) => {
    if (isMediapipeInfoLog(args)) return;
    originalInfo(...args);
  };

  window.__mediapipeLogFilter = {
    count: 1,
    originalError,
    originalWarn,
    originalInfo,
    filteredError,
    filteredWarn,
    filteredInfo,
  };
  console.error = filteredError;
  console.warn = filteredWarn;
  console.info = filteredInfo;

  return () => {
    const current = window.__mediapipeLogFilter;
    if (!current) return;
    current.count -= 1;
    if (current.count <= 0) {
      console.error = current.originalError;
      console.warn = current.originalWarn;
      console.info = current.originalInfo;
      delete window.__mediapipeLogFilter;
    }
  };
}

function normalizeGestureName(name: string) {
  return name.trim().toUpperCase();
}

function loadSavedGesturesFromStorage(): SavedGesture[] {
  try {
    const raw = window.localStorage.getItem(GESTURE_TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedGesture);
  } catch (_) {
    return [];
  }
}

function saveGesturesToStorage(gestures: SavedGesture[]) {
  try {
    window.localStorage.setItem(
      GESTURE_TEMPLATE_STORAGE_KEY,
      JSON.stringify(gestures),
    );
  } catch (_) {
    // ignore storage errors
  }
}

export function initControl({ socketUrl }: { socketUrl: string }) {
  const active = { current: true };

  // =========================
  // DOM + Secure context check
  // =========================
  const $ = (id: string) => document.getElementById(id);

  const loadingEl = $("loading");
  const startBtn = $("startBtn");
  const controlPanel = $("control-panel");
  const toggleControls = $("toggleControls") as HTMLButtonElement | null;

  const isLocalhost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const isSecure = window.isSecureContext || isLocalhost;

  if (!loadingEl || !startBtn) {
    return () => {};
  }

  const loadingElEl = loadingEl;
  const startBtnEl = startBtn;

  if (!isSecure) {
    loadingElEl.style.display = "block";
    loadingElEl.innerHTML =
      "Không thể mở camera vì trang chưa an toàn.<br/>" +
      "Hãy chạy bằng <b>https</b> hoặc <b>http://localhost</b>.";
    startBtnEl.style.display = "none";
    return () => {};
  }

  const restoreMediapipeLogFilter = installMediapipeLogFilter();

  const netText = $("netText");
  const roomInput = $("roomInput") as HTMLInputElement | null;
  const playerSelect = $("playerSelect") as HTMLSelectElement | null;
  const joinBtn = $("joinBtn");
  const calibrateBtn = $("calibrateBtn") as HTMLButtonElement | null;
  const mirrorToggle = $("mirrorToggle") as HTMLInputElement | null;
  const debugToggle = $("debugToggle") as HTMLInputElement | null;
  const armPoseToggle = $("armGestureToggle") as HTMLInputElement | null;
  const poseCanvas = $("poseDebug") as HTMLCanvasElement | null;
  const poseCtx = poseCanvas?.getContext("2d") || null;
  const handOverlay = $("handOverlay") as HTMLCanvasElement | null;
  const handCtx = handOverlay?.getContext("2d") || null;

  const gestureSelect = $("gestureSelect") as HTMLSelectElement | null;
  const startGestureRecordBtn = $("startGestureRecordBtn") as HTMLButtonElement | null;
  const clearGesturesBtn = $("clearGesturesBtn") as HTMLButtonElement | null;
  const gestureStoreText = $("gestureStoreText");
  const gestureMatchText = $("gestureMatchText");
  const recordCountdown = $("recordCountdown");

  const cameraMode = $("cameraMode") as HTMLSelectElement | null;
  const cameraTarget = $("cameraTarget") as HTMLSelectElement | null;
  const cameraYaw = $("cameraYaw") as HTMLInputElement | null;
  const cameraPitch = $("cameraPitch") as HTMLInputElement | null;
  const cameraDist = $("cameraDist") as HTMLInputElement | null;
  const cameraFov = $("cameraFov") as HTMLInputElement | null;
  const cameraYawValue = $("cameraYawValue");
  const cameraPitchValue = $("cameraPitchValue");
  const cameraDistValue = $("cameraDistValue");
  const cameraFovValue = $("cameraFovValue");

  const skillNameEl = $("skill-name");
  function showSkillName(name: string) {
    if (!skillNameEl) return;
    skillNameEl.textContent = name;
    skillNameEl.classList.add("show");
    clearTimeout((window as any).__skillT);
    (window as any).__skillT = setTimeout(
      () => skillNameEl.classList.remove("show"),
      900,
    );
  }

  const video = document.querySelector<HTMLVideoElement>(".input_video")!;
  const previewVideo = $("cameraPreview") as HTMLVideoElement | null;
  if (!video) {
    return () => {};
  }
  video.setAttribute("playsinline", "");
  video.muted = true;
  video.autoplay = true;
  if (previewVideo) {
    previewVideo.setAttribute("playsinline", "");
    previewVideo.muted = true;
    previewVideo.autoplay = true;
  }

  let mirrorOn = mirrorToggle?.checked ?? true;
  let debugOn = debugToggle?.checked ?? false;
  let armPoseEnabled = armPoseToggle?.checked ?? false;
  let toggleHandler: (() => void) | null = null;

  if (poseCanvas) {
    poseCanvas.style.display = debugOn ? "block" : "none";
  }

  const setLabel = (el: Element | null, value: string) => {
    if (!el) return;
    el.textContent = value;
  };

  const updateCameraLabels = () => {
    if (cameraYaw) setLabel(cameraYawValue, cameraYaw.value);
    if (cameraPitch) setLabel(cameraPitchValue, cameraPitch.value);
    if (cameraDist) setLabel(cameraDistValue, cameraDist.value);
    if (cameraFov) setLabel(cameraFovValue, cameraFov.value);
  };

  updateCameraLabels();

  // =========================
  // Socket (join / input / aim)
  // =========================
  const qs = new URLSearchParams(location.search);
  if (roomInput) {
    roomInput.value = (qs.get("room") || "demo").trim() || "demo";
  }
  if (playerSelect) {
    playerSelect.value = qs.get("player") === "2" ? "2" : "1";
  }

  let socket: ReturnType<typeof io> | null = null;
  let ROOM = roomInput?.value.trim() || "demo";
  let PLAYER = Number(playerSelect?.value) === 2 ? 2 : 1;
  let joinedOk = false;
  let lastCameraSentAt = 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const emitCameraCommand = (force = false) => {
    if (!socket || !socket.connected || !joinedOk) return;
    const now = performance.now();
    if (!force && now - lastCameraSentAt < 120) return;
    lastCameraSentAt = now;

    const yawDeg = Number(cameraYaw?.value ?? 0) || 0;
    const pitchDeg = Number(cameraPitch?.value ?? 10) || 0;
    const distVal = Number(cameraDist?.value ?? 44) || 44;
    const fovVal = Number(cameraFov?.value ?? 50) || 50;

    socket.emit("camera", {
      mode: cameraMode?.value || "TPS_BACK",
      target: cameraTarget?.value || "center",
      yaw: toRad(yawDeg),
      pitch: toRad(pitchDeg),
      dist: distVal,
      fov: fovVal,
    });
  };

  function setNet(s: string) {
    if (netText) netText.textContent = s;
  }

  function connectAndJoin() {
    if (!active.current) return;
    ROOM = roomInput?.value.trim() || "demo";
    PLAYER = Number(playerSelect?.value) === 2 ? 2 : 1;

    if (!socket) {
      socket = io(socketUrl || undefined);

      socket.on("connect", () => {
        joinedOk = false;
        setNet(`✅ Connected | room=${ROOM} | P${PLAYER}`);
        socket?.emit("join", { room: ROOM, role: "player", player: PLAYER });
      });

      socket.on("joined", (info) => {
        joinedOk = true;
        setNet(`🟢 Joined room=${info.room} | Player ${info.player}`);
        emitCameraCommand(true);
      });

      socket.on("roster", (r) => {
        if (!joinedOk) return;
        setNet(
          `🟢 room=${ROOM} | P1:${r.p1 ? "ON" : "OFF"} P2:${r.p2 ? "ON" : "OFF"} | Display:${r.displayCount}`,
        );
      });

      socket.on("join_error", (e) => {
        joinedOk = false;
        setNet(`❌ join_error: ${e?.message || "unknown"}`);
      });

      socket.on("disconnect", () => {
        joinedOk = false;
        setNet("⚠️ Disconnected");
      });
    } else {
      joinedOk = false;
      socket.emit("join", { room: ROOM, role: "player", player: PLAYER });
      setNet(`↻ Re-join… room=${ROOM} P${PLAYER}`);
    }
  }

  const joinHandler = () => connectAndJoin();
  joinBtn?.addEventListener("click", joinHandler);
  connectAndJoin();

  const cameraInputs: (HTMLInputElement | HTMLSelectElement | null)[] = [
    cameraMode,
    cameraTarget,
    cameraYaw,
    cameraPitch,
    cameraDist,
    cameraFov,
  ];
  const onCameraInput = () => {
    updateCameraLabels();
    emitCameraCommand();
  };
  for (const el of cameraInputs) {
    if (!el) continue;
    el.addEventListener("input", onCameraInput);
    el.addEventListener("change", onCameraInput);
  }

  const onMirrorChange = () => {
    mirrorOn = mirrorToggle?.checked ?? true;
    if (previewVideo) {
      previewVideo.classList.toggle("mirror", mirrorOn);
    }
    if (handOverlay) {
      handOverlay.classList.toggle("mirror", mirrorOn);
    }
  };

  const onDebugChange = () => {
    debugOn = debugToggle?.checked ?? false;
    if (poseCanvas) {
      poseCanvas.style.display = debugOn ? "block" : "none";
    }
  };

  const onArmPoseChange = () => {
    armPoseEnabled = armPoseToggle?.checked ?? false;
    if (armPoseEnabled) {
      initPoseLandmarker();
      return;
    }
    if (poseLandmarker?.close) {
      try {
        poseLandmarker.close();
      } catch (_) {
        // ignore
      }
      poseLandmarker = null;
      poseReady = false;
    }
    sendArmPose({
      t: performance.now(),
      calibrated: poseCalibrated,
      confidence: { right: 0, left: 0 },
    });
  };

  const onCalibrateClick = () => {
    if (lastPoseSample) {
      poseCalibration = buildCalibration(lastPoseSample);
      poseCalibrated = true;
      pendingCalibration = false;
      showSkillName("Calibrated");
    } else {
      pendingCalibration = true;
      showSkillName("Hold pose...");
    }
  };

  if (mirrorToggle) mirrorToggle.addEventListener("change", onMirrorChange);
  if (debugToggle) debugToggle.addEventListener("change", onDebugChange);
  if (armPoseToggle) armPoseToggle.addEventListener("change", onArmPoseChange);
  if (calibrateBtn) calibrateBtn.addEventListener("click", onCalibrateClick);

  if (previewVideo) {
    previewVideo.classList.toggle("mirror", mirrorOn);
  }
  if (handOverlay) {
    handOverlay.classList.toggle("mirror", mirrorOn);
  }

  if (toggleControls && controlPanel) {
    const applyCollapsed = (collapsed: boolean) => {
      controlPanel.classList.toggle("collapsed", collapsed);
      toggleControls.textContent = collapsed ? "Mở" : "Thu gọn";
    };
    let collapsed = false;
    try {
      collapsed = localStorage.getItem("controlPanelCollapsed") === "1";
    } catch (_) {
      // ignore
    }
    applyCollapsed(collapsed);
    const onToggle = () => {
      collapsed = !collapsed;
      applyCollapsed(collapsed);
      try {
        localStorage.setItem("controlPanelCollapsed", collapsed ? "1" : "0");
      } catch (_) {
        // ignore
      }
    };
    toggleControls.addEventListener("click", onToggle);
    toggleHandler = onToggle;
  }

  // =========================
  // Gestures + Names
  // =========================
  const GESTURE = {
    IDLE: "IDLE",
    LOTUS: "LOTUS",
    SPHERE: "SPHERE",
    ATTACK: "ATTACK",
    WALL: "WALL",
    SPIN: "SPIN",
    GIANT: "GIANT",
    GIANT_CHARGE: "GIANT_CHARGE",
    GIANT_CANCEL: "GIANT_CANCEL",
    POINT: "POINT",
    SHAKA: "SHAKA", // dùng cho ULT / Hồi Kiếm của bạn
    FAN: "FAN",
  } as const;

  const GESTURE_TO_SKILLNAME: Record<string, string> = GESTURE_TO_SKILL_NAME;

  // =========================
  // MediaPipe Tasks Vision
  // =========================
  const TASKS_VISION_VERSION = "0.10.32";
  const VISION_WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
  const HAND_MODEL_ASSET_PATH =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
  const POSE_MODEL_ASSET_PATH =
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task";

  let visionPromise:
    | Promise<{ vision: any; resolver: any }>
    | null = null;

  async function loadVision() {
    if (visionPromise) return visionPromise;
    visionPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const resolver = await vision.FilesetResolver.forVisionTasks(VISION_WASM_BASE);
      return { vision, resolver };
    })();
    return visionPromise;
  }

  async function createHandLandmarkerWithDelegate(
    vision: any,
    resolver: any,
    delegate: VisionDelegate,
  ) {
    return vision.HandLandmarker.createFromOptions(resolver, {
      baseOptions: {
        modelAssetPath: HAND_MODEL_ASSET_PATH,
        delegate,
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.65,
      minHandPresenceConfidence: 0.65,
      minTrackingConfidence: 0.65,
    });
  }

  async function createPoseLandmarkerWithDelegate(
    vision: any,
    resolver: any,
    delegate: VisionDelegate,
  ) {
    return vision.PoseLandmarker.createFromOptions(resolver, {
      baseOptions: {
        modelAssetPath: POSE_MODEL_ASSET_PATH,
        delegate,
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.55,
      minPosePresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });
  }

  let handLandmarker: HandLandmarker | null = null;
  let handsReady = false;
  let handConnections: HandConnection[] = FALLBACK_HAND_CONNECTIONS;
  let lastHandProcessedAt = 0;

  // =========================
  // Pose Landmarker (Arm tracking)
  // =========================
  const POSE_SEND_HZ = POSE_DETECT_HZ;
  const POSE_SEND_MS = POSE_DETECT_MS;
  const POSE_LOST_MS = 520;
  const DEFAULT_REST: Vec3 = { x: 0, y: -1, z: 0 };

  let poseLandmarker: any = null;
  let poseReady = false;
  let poseBusy = false;
  let lastPoseProcessedAt = 0;
  let lastPoseSentAt = 0;
  let lastPoseSeenAt = 0;
  let poseCalibration: ArmCalibration | null = null;
  let poseCalibrated = false;
  let pendingCalibration = false;
  let lastPoseSample: ArmCalibration | null = null;

  let smoothRightUpper: QuatArray | null = null;
  let smoothRightLower: QuatArray | null = null;
  let smoothLeftUpper: QuatArray | null = null;
  let smoothLeftLower: QuatArray | null = null;

  async function initHandLandmarker() {
    if (handsReady || handLandmarker) return;
    try {
      const { vision, resolver } = await loadVision();
      try {
        handLandmarker = await createHandLandmarkerWithDelegate(
          vision,
          resolver,
          "GPU",
        );
        console.info("HandLandmarker using GPU delegate");
      } catch (gpuErr) {
        console.warn("HandLandmarker GPU delegate failed; falling back to CPU:", gpuErr);
        handLandmarker = await createHandLandmarkerWithDelegate(
          vision,
          resolver,
          "CPU",
        );
      }
      const connections = vision.HandLandmarker.HAND_CONNECTIONS as HandConnection[];
      handConnections = connections?.length ? connections : FALLBACK_HAND_CONNECTIONS;
      handsReady = true;
    } catch (err) {
      console.warn("HandLandmarker init failed:", err);
      loadingElEl.style.display = "block";
      loadingElEl.innerHTML =
        "Không tải được model nhận diện tay.<br/>" +
        "Hãy kiểm tra kết nối mạng hoặc CDN bị chặn.";
      startBtnEl.style.display = "block";
    }
  }

  async function initPoseLandmarker() {
    if (poseReady || poseLandmarker) return;
    try {
      const { vision, resolver } = await loadVision();
      try {
        poseLandmarker = await createPoseLandmarkerWithDelegate(
          vision,
          resolver,
          "GPU",
        );
        console.info("PoseLandmarker using GPU delegate");
      } catch (gpuErr) {
        console.warn("PoseLandmarker GPU delegate failed; falling back to CPU:", gpuErr);
        poseLandmarker = await createPoseLandmarkerWithDelegate(
          vision,
          resolver,
          "CPU",
        );
      }
      poseReady = true;
    } catch (err) {
      console.warn("PoseLandmarker init failed:", err);
    }
  }

  // =========================
  // Hand assignment (Left/Right)
  // =========================
  function normalizeHandResults(results: HandLandmarkerResult | null) {
    if (!results) return { lms: [], handed: [] };
    if ("multiHandLandmarks" in results) {
      const legacyResults = results as unknown as {
        multiHandLandmarks?: HandLandmark[][];
        multiHandedness?: Array<{ label?: string } | null>;
      };
      return {
        lms: legacyResults.multiHandLandmarks || [],
        handed: legacyResults.multiHandedness || [],
      };
    }

    const lms = results.landmarks || [];
    const handednesses = results.handednesses || results.handedness || [];
    const handed = handednesses.map((entry: any) => {
      const item = Array.isArray(entry) ? entry[0] : entry;
      const raw =
        item?.categoryName ||
        item?.displayName ||
        item?.label ||
        item?.name ||
        "";
      const norm = typeof raw === "string" ? raw.toLowerCase() : "";
      const label = norm === "left" ? "Left" : norm === "right" ? "Right" : raw;
      return label ? { label } : null;
    });
    return { lms, handed };
  }

  function assignLR(results: HandLandmarkerResult | null) {
    const { lms, handed } = normalizeHandResults(results);

    let L: HandLandmark[] | null = null;
    let R: HandLandmark[] | null = null;

    for (let i = 0; i < lms.length; i += 1) {
      const label = handed[i]?.label;
      if (label === "Left") L = lms[i];
      else if (label === "Right") R = lms[i];
    }

    // fallback theo vị trí X của wrist
    if (!L || !R) {
      if (lms.length === 1) {
        // mặc định coi là Right
        R = R || lms[0];
      } else if (lms.length >= 2) {
        const w0 = lms[0][0].x;
        const w1 = lms[1][0].x;
        // camera selfie: tay trái người dùng thường nằm bên phải khung hình
        // nhưng ta chỉ cần ổn định tương đối => dùng x nhỏ làm Right
        if (w0 < w1) {
          R = R || lms[0];
          L = L || lms[1];
        } else {
          R = R || lms[1];
          L = L || lms[0];
        }
      }
    }

    return { L, R, lms };
  }

  // =========================
  // Hand overlay + template store
  // =========================
  let latestRecordHand: HandLandmark[] | null = null;
  let latestRecordHandLabel: HandednessLabel = "Unknown";
  let latestArmTemplatePose: NormalizedArmPose | null = null;
  let latestArmTemplatePoseAt = 0;
  let savedGestures = loadSavedGesturesFromStorage();
  let lastTemplateStatusAt = 0;
  let liveMotionFrames: GestureTemplateFrame[] = [];
  let recordingPhase: "idle" | "countdown" | "recording" = "idle";
  let recordingSkill: ControlSkillOption | null = null;
  let recordingStartedAt = 0;
  let lastRecordedSampleAt = 0;
  let recordingFrames: GestureTemplateFrame[] = [];
  let recordCountdownTimer: ReturnType<typeof setTimeout> | null = null;
  let recordStopTimer: ReturnType<typeof setTimeout> | null = null;
  let activeMatchedGesture: string | null = null;
  let lastMatchedGestureSentAt = 0;
  let suppressMatchingUntil = 0;
  let giantHoldActive = false;
  let giantHoldStartedAt = 0;
  let giantHoldLastMatchedAt = 0;
  let giantHoldCompleted = false;

  function resizeHandOverlay() {
    if (!handOverlay) return;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    if (handOverlay.width !== width) handOverlay.width = width;
    if (handOverlay.height !== height) handOverlay.height = height;
  }

  function clearHandOverlay() {
    if (!handCtx || !handOverlay) return;
    handCtx.clearRect(0, 0, handOverlay.width, handOverlay.height);
  }

  function drawHandOverlay(landmarkGroups: readonly HandLandmark[][]) {
    if (!handCtx || !handOverlay) return;
    resizeHandOverlay();
    const width = handOverlay.width;
    const height = handOverlay.height;

    handCtx.clearRect(0, 0, width, height);
    if (!landmarkGroups.length) return;

    handCtx.save();
    handCtx.lineCap = "round";
    handCtx.lineJoin = "round";

    for (const landmarks of landmarkGroups) {
      handCtx.strokeStyle = "rgba(255, 255, 255, 0.72)";
      handCtx.lineWidth = Math.max(2, width * 0.004);
      for (const connection of handConnections) {
        const from = landmarks[connection.start];
        const to = landmarks[connection.end];
        if (!from || !to) continue;
        handCtx.beginPath();
        handCtx.moveTo(from.x * width, from.y * height);
        handCtx.lineTo(to.x * width, to.y * height);
        handCtx.stroke();
      }

      handCtx.fillStyle = "#ff1b1b";
      handCtx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      handCtx.lineWidth = Math.max(1, width * 0.002);
      const radius = Math.max(4, Math.min(width, height) * 0.012);
      for (const point of landmarks) {
        handCtx.beginPath();
        handCtx.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
        handCtx.fill();
        handCtx.stroke();
      }
    }

    handCtx.restore();
  }

  function updateGestureTemplateStatus(matchText = "") {
    if (gestureStoreText) {
      const names = savedGestures
        .map((gesture) => gesture.displayName || gesture.name)
        .join(", ");
      gestureStoreText.textContent = savedGestures.length
        ? `Đã lưu ${savedGestures.length}: ${names}`
        : "Chưa có mẫu. Chọn chiêu rồi bấm Start Record.";
    }
    if (gestureMatchText && matchText) {
      gestureMatchText.textContent = matchText;
    }
  }

  function setRecordCountdownText(text: string | null) {
    if (!recordCountdown) return;
    if (!text) {
      recordCountdown.textContent = "";
      (recordCountdown as HTMLElement).style.display = "none";
      return;
    }
    recordCountdown.textContent = text;
    (recordCountdown as HTMLElement).style.display = "grid";
  }

  function clearRecordTimers() {
    if (recordCountdownTimer) {
      clearTimeout(recordCountdownTimer);
      recordCountdownTimer = null;
    }
    if (recordStopTimer) {
      clearTimeout(recordStopTimer);
      recordStopTimer = null;
    }
  }

  function getSelectedSkillOption(gestureName?: string) {
    const selectedGesture = gestureName || gestureSelect?.value || "";
    return findControlSkillOption(selectedGesture);
  }

  function createGestureFrame(
    landmarks: HandLandmark[] | null,
    handLabel: HandednessLabel,
    nowMs: number,
    frameTimeMs: number,
  ): GestureTemplateFrame | null {
    if (!landmarks) return null;
    const hand = normalizeLandmarks(landmarks);
    if (!hand) return null;
    const arm =
      latestArmTemplatePose && nowMs - latestArmTemplatePoseAt <= ARM_POSE_STALE_MS
        ? cloneArmPose(latestArmTemplatePose)
        : undefined;
    return { t: frameTimeMs, hand, arm, handLabel };
  }

  function appendLiveMotionFrame(
    landmarks: HandLandmark[] | null,
    handLabel: HandednessLabel,
    nowMs: number,
  ) {
    const frame = createGestureFrame(landmarks, handLabel, nowMs, nowMs);
    if (!frame) return null;
    liveMotionFrames.push(frame);
    const keepAfter = nowMs - LIVE_MOTION_WINDOW_MS;
    liveMotionFrames = liveMotionFrames.filter((item) => item.t >= keepAfter);
    return frame;
  }

  function captureRecordingFrame(
    landmarks: HandLandmark[] | null,
    handLabel: HandednessLabel,
    nowMs: number,
  ) {
    if (recordingPhase !== "recording") return;
    if (nowMs - lastRecordedSampleAt < RECORD_SAMPLE_INTERVAL_MS) return;
    const frame = createGestureFrame(
      landmarks,
      handLabel,
      nowMs,
      nowMs - recordingStartedAt,
    );
    if (!frame) return;
    recordingFrames.push(frame);
    lastRecordedSampleAt = nowMs;
    updateGestureTemplateStatus(
      `Đang ghi ${recordingSkill?.label || ""}: ${recordingFrames.length} frame`,
    );
  }

  function saveGestureTemplate(
    skill: ControlSkillOption,
    frames: GestureTemplateFrame[],
  ) {
    if (!frames.length) {
      updateGestureTemplateStatus("Không có frame hợp lệ để lưu.");
      return null;
    }

    const name = normalizeGestureName(skill.gesture);
    const saved: SavedGesture = {
      name,
      skillId: skill.skillId,
      displayName: skill.label,
      frames,
      points: frames[frames.length - 1]?.hand,
      durationMs: Math.max(...frames.map((frame) => frame.t)),
      createdAt: Date.now(),
      hand: frames[frames.length - 1]?.handLabel || latestRecordHandLabel,
    };

    savedGestures = [
      saved,
      ...savedGestures.filter((gesture) => gesture.name !== name),
    ];
    saveGesturesToStorage(savedGestures);
    updateGestureTemplateStatus(
      `Đã lưu ${skill.label}: ${frames.length} frame / ${Math.round(saved.durationMs || 0)}ms`,
    );
    showSkillName(`Saved ${skill.label}`);
    console.log(`Đã lưu mẫu cử chỉ: ${name}`, saved);
    return saved;
  }

  function saveGesture(gestureName: string) {
    const skill = getSelectedSkillOption(gestureName);
    if (!skill) {
      updateGestureTemplateStatus("Chưa chọn được chiêu hợp lệ.");
      return null;
    }
    const nowMs = performance.now();
    const frame = createGestureFrame(
      latestRecordHand,
      latestRecordHandLabel,
      nowMs,
      0,
    );
    if (!frame) {
      updateGestureTemplateStatus("Chưa thấy bàn tay để lưu mẫu.");
      return null;
    }
    return saveGestureTemplate(skill, [frame]);
  }

  function clearSavedGestures() {
    cancelGiantHold(
      latestRecordHand,
      performance.now(),
      "Đã xoá mẫu và huỷ tụ Tam Nhẫn Kiếm Chỉ.",
    );
    savedGestures = [];
    saveGesturesToStorage(savedGestures);
    updateGestureTemplateStatus("Đã xoá toàn bộ mẫu.");
    showSkillName("Cleared");
  }

  function beginGestureRecording() {
    if (!recordingSkill) return;
    recordingPhase = "recording";
    recordingStartedAt = performance.now();
    lastRecordedSampleAt = 0;
    recordingFrames = [];
    setRecordCountdownText("REC");
    updateGestureTemplateStatus(`Đang ghi ${recordingSkill.label} trong 0.5 giây...`);

    recordStopTimer = setTimeout(() => {
      finishGestureRecording();
    }, RECORD_DURATION_MS);
  }

  function finishGestureRecording() {
    const skill = recordingSkill;
    recordingPhase = "idle";
    recordingSkill = null;
    clearRecordTimers();
    liveMotionFrames = [];
    activeMatchedGesture = null;
    lastMatchedGestureSentAt = 0;
    resetGiantHoldState(true);
    suppressMatchingUntil = performance.now() + POST_RECORD_SUPPRESS_MS;
    resetCommittedGesture(null, true);

    if (!skill) {
      setRecordCountdownText(null);
      return;
    }

    const saved = saveGestureTemplate(skill, recordingFrames);
    setRecordCountdownText(saved ? "SAVED" : "NO HAND");
    recordCountdownTimer = setTimeout(() => {
      setRecordCountdownText(null);
    }, 450);
  }

  function runRecordCountdown(count: number) {
    if (recordingPhase !== "countdown") return;
    if (count <= 0) {
      beginGestureRecording();
      return;
    }

    setRecordCountdownText(String(count));
    recordCountdownTimer = setTimeout(() => {
      runRecordCountdown(count - 1);
    }, 1000);
  }

  function startGestureRecord(gestureName?: string) {
    const skill = getSelectedSkillOption(gestureName);
    if (!skill) {
      updateGestureTemplateStatus("Chưa chọn được chiêu hợp lệ.");
      return;
    }
    if (recordingPhase !== "idle") {
      updateGestureTemplateStatus("Đang record, chờ lần hiện tại kết thúc.");
      return;
    }

    cancelGiantHold(
      latestRecordHand,
      performance.now(),
      "Đang record, đã huỷ tụ Tam Nhẫn Kiếm Chỉ.",
    );
    initPoseLandmarker();
    clearRecordTimers();
    recordingSkill = skill;
    recordingFrames = [];
    recordingPhase = "countdown";
    updateGestureTemplateStatus(
      `Chuẩn bị ghi ${skill.label}. Giữ tay trong khung camera.`,
    );
    runRecordCountdown(RECORD_COUNTDOWN_SECONDS);
  }

  function findBestTemplateMatch(activeLandmarks: HandLandmark[] | null) {
    let best: TemplateMatchResult | null = null;

    const liveNormalized = activeLandmarks
      ? normalizeLandmarks(activeLandmarks)
      : null;

    for (const saved of savedGestures) {
      let error = Number.POSITIVE_INFINITY;
      if (saved.frames?.length) {
        error = calculateMotionSimilarity(liveMotionFrames, saved.frames);
      } else if (liveNormalized && saved.points) {
        error = calculateSimilarity(liveNormalized, saved.points);
      }
      if (!best || error < best.error) {
        best = { saved, error, landmarks: activeLandmarks };
      }
    }

    return best;
  }

  function findSavedGestureByName(gestureName: string) {
    const normalizedName = normalizeGestureName(gestureName);
    return (
      savedGestures.find(
        (gesture) => normalizeGestureName(gesture.name) === normalizedName,
      ) || null
    );
  }

  function calculateCurrentPoseError(
    activeLandmarks: HandLandmark[] | null,
    handLabel: HandednessLabel,
    saved: SavedGesture,
    nowMs: number,
  ) {
    const liveFrame =
      liveMotionFrames[liveMotionFrames.length - 1] ||
      createGestureFrame(activeLandmarks, handLabel, nowMs, 0);

    if (saved.frames?.length) {
      const savedPoseFrame = saved.frames[saved.frames.length - 1];
      if (!liveFrame || !savedPoseFrame) return Number.POSITIVE_INFINITY;
      return calculateFrameSimilarity(liveFrame, savedPoseFrame);
    }

    const liveNormalized =
      liveFrame?.hand ||
      (activeLandmarks ? normalizeLandmarks(activeLandmarks) : null);
    if (liveNormalized && saved.points) {
      return calculateSimilarity(liveNormalized, saved.points);
    }
    return Number.POSITIVE_INFINITY;
  }

  const startGestureRecordClickHandler = () => {
    startGestureRecord();
  };
  const clearGesturesClickHandler = () => {
    clearSavedGestures();
  };

  startGestureRecordBtn?.addEventListener(
    "click",
    startGestureRecordClickHandler,
  );
  clearGesturesBtn?.addEventListener("click", clearGesturesClickHandler);
  updateGestureTemplateStatus();

  window.saveGesture = saveGesture;
  window.startGestureRecord = startGestureRecord;
  window.getSavedGestures = () => savedGestures.slice();
  window.clearSavedGestures = clearSavedGestures;

  // =========================
  // Pose helpers (arm tracking)
  // =========================
  const POSE_INDEX = {
    left: { shoulder: 11, elbow: 13, wrist: 15 },
    right: { shoulder: 12, elbow: 14, wrist: 16 },
  };

  function readPoseLandmark(landmarks: any[], idx: number) {
    const lm = landmarks?.[idx];
    if (!lm) return null;
    const x = mirrorOn ? -lm.x : lm.x;
    const y = lm.y;
    const z = lm.z ?? 0;
    const visibility = clamp01(Number(lm.visibility ?? lm.presence ?? 1));
    return { x, y, z, visibility };
  }

  function extractArmDirs(landmarks: any[], side: "left" | "right") {
    const idx = POSE_INDEX[side];
    const s = readPoseLandmark(landmarks, idx.shoulder);
    const e = readPoseLandmark(landmarks, idx.elbow);
    const w = readPoseLandmark(landmarks, idx.wrist);
    if (!s || !e || !w) return null;
    const upper = vec3Normalize({ x: e.x - s.x, y: e.y - s.y, z: e.z - s.z });
    const lower = vec3Normalize({ x: w.x - e.x, y: w.y - e.y, z: w.z - e.z });
    const confidence = clamp01((s.visibility + e.visibility + w.visibility) / 3);
    return { upper, lower, confidence };
  }

  function cloneVec3(v: NormalizedVec3): NormalizedVec3 {
    return { x: v.x, y: v.y, z: v.z };
  }

  function cloneArmPose(pose: NormalizedArmPose): NormalizedArmPose {
    return {
      right: pose.right
        ? {
            upper: cloneVec3(pose.right.upper),
            lower: cloneVec3(pose.right.lower),
            confidence: pose.right.confidence,
          }
        : undefined,
      left: pose.left
        ? {
            upper: cloneVec3(pose.left.upper),
            lower: cloneVec3(pose.left.lower),
            confidence: pose.left.confidence,
          }
        : undefined,
    };
  }

  function shouldRunPoseTracking() {
    return (
      armPoseEnabled ||
      recordingPhase !== "idle" ||
      savedGestures.some((gesture) =>
        gesture.frames?.some((frame) => frame.arm?.right || frame.arm?.left),
      )
    );
  }

  function smoothQuat(current: QuatArray | null, next: QuatArray, alpha: number) {
    return current ? quatSlerp(current, next, alpha) : next;
  }

  function drawPoseDebug(landmarks: any[] | null) {
    if (!poseCtx || !poseCanvas || !debugOn) return;
    const w = poseCanvas.width;
    const h = poseCanvas.height;
    poseCtx.clearRect(0, 0, w, h);
    if (!landmarks) return;

    const mapPoint = (lm: any) => {
      const x = mirrorOn ? (1 - lm.x) * w : lm.x * w;
      const y = lm.y * h;
      return { x, y };
    };

    const drawLine = (aIdx: number, bIdx: number, color: string) => {
      const a = landmarks[aIdx];
      const b = landmarks[bIdx];
      if (!a || !b) return;
      const pa = mapPoint(a);
      const pb = mapPoint(b);
      poseCtx.strokeStyle = color;
      poseCtx.lineWidth = 3;
      poseCtx.beginPath();
      poseCtx.moveTo(pa.x, pa.y);
      poseCtx.lineTo(pb.x, pb.y);
      poseCtx.stroke();
    };

    const drawPoint = (idx: number, color: string) => {
      const lm = landmarks[idx];
      if (!lm) return;
      const p = mapPoint(lm);
      poseCtx.fillStyle = color;
      poseCtx.beginPath();
      poseCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      poseCtx.fill();
    };

    drawLine(POSE_INDEX.right.shoulder, POSE_INDEX.right.elbow, "#00ffff");
    drawLine(POSE_INDEX.right.elbow, POSE_INDEX.right.wrist, "#00ffff");
    drawLine(POSE_INDEX.left.shoulder, POSE_INDEX.left.elbow, "#ff4fd8");
    drawLine(POSE_INDEX.left.elbow, POSE_INDEX.left.wrist, "#ff4fd8");

    drawPoint(POSE_INDEX.right.shoulder, "#00ffff");
    drawPoint(POSE_INDEX.right.elbow, "#00ffff");
    drawPoint(POSE_INDEX.right.wrist, "#00ffff");
    drawPoint(POSE_INDEX.left.shoulder, "#ff4fd8");
    drawPoint(POSE_INDEX.left.elbow, "#ff4fd8");
    drawPoint(POSE_INDEX.left.wrist, "#ff4fd8");
  }

  function buildPosePacket(worldLandmarks: any[], nowMs: number): ArmPosePacket | null {
    const rightKey = mirrorOn ? "left" : "right";
    const leftKey = mirrorOn ? "right" : "left";

    const rightDirs = extractArmDirs(worldLandmarks, rightKey as "left" | "right");
    const leftDirs = extractArmDirs(worldLandmarks, leftKey as "left" | "right");

    if (!rightDirs && !leftDirs) {
      latestArmTemplatePose = null;
      return null;
    }

    latestArmTemplatePose = {
      right: rightDirs
        ? {
            upper: cloneVec3(rightDirs.upper),
            lower: cloneVec3(rightDirs.lower),
            confidence: rightDirs.confidence,
          }
        : undefined,
      left: leftDirs
        ? {
            upper: cloneVec3(leftDirs.upper),
            lower: cloneVec3(leftDirs.lower),
            confidence: leftDirs.confidence,
          }
        : undefined,
    };
    latestArmTemplatePoseAt = nowMs;

    lastPoseSample = {
      right: rightDirs ? { upper: rightDirs.upper, lower: rightDirs.lower } : undefined,
      left: leftDirs ? { upper: leftDirs.upper, lower: leftDirs.lower } : undefined,
    };

    if (pendingCalibration && lastPoseSample) {
      poseCalibration = buildCalibration(lastPoseSample);
      poseCalibrated = true;
      pendingCalibration = false;
      showSkillName("Calibrated");
    }

    const dt = lastPoseSeenAt ? (nowMs - lastPoseSeenAt) / 1000 : 1 / POSE_SEND_HZ;
    const alpha = clamp01(dt * 8);
    lastPoseSeenAt = nowMs;

    const packet: ArmPosePacket = { t: nowMs, calibrated: poseCalibrated, confidence: {} };

    if (rightDirs) {
      const restUpper = poseCalibration?.right?.upper ?? DEFAULT_REST;
      const restLower = poseCalibration?.right?.lower ?? DEFAULT_REST;
      const qUpper = poseQuatFromDirs(rightDirs.upper, restUpper);
      const qLower = poseQuatFromDirs(rightDirs.lower, restLower);
      smoothRightUpper = smoothQuat(smoothRightUpper, qUpper, alpha);
      smoothRightLower = smoothQuat(smoothRightLower, qLower, alpha);
      if (smoothRightUpper && smoothRightLower) {
        packet.right = { upper: smoothRightUpper, lower: smoothRightLower };
      }
      packet.confidence!.right = rightDirs.confidence;
    }

    if (leftDirs) {
      const restUpper = poseCalibration?.left?.upper ?? DEFAULT_REST;
      const restLower = poseCalibration?.left?.lower ?? DEFAULT_REST;
      const qUpper = poseQuatFromDirs(leftDirs.upper, restUpper);
      const qLower = poseQuatFromDirs(leftDirs.lower, restLower);
      smoothLeftUpper = smoothQuat(smoothLeftUpper, qUpper, alpha);
      smoothLeftLower = smoothQuat(smoothLeftLower, qLower, alpha);
      if (smoothLeftUpper && smoothLeftLower) {
        packet.left = { upper: smoothLeftUpper, lower: smoothLeftLower };
      }
      packet.confidence!.left = leftDirs.confidence;
    }

    return packet;
  }

  function sendArmPose(packet: ArmPosePacket) {
    if (!socket || !socket.connected || !joinedOk) return;
    const msg: ArmPosePacket = { ...packet, player: PLAYER };
    socket.emit("arm_pose", msg);
  }

  // =========================
  // Aim direction
  // =========================
  function computeAimDir(preferLm: HandLandmark[] | null) {
    const use = preferLm;
    if (!use) return { x: 0, y: 0, z: 0 };

    const w = use[0];
    const i = use[8];
    const dx = i.x - w.x;
    const dy = i.y - w.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: -dy / len, z: -0.35 };
  }

  // =========================
  // Aim stream
  // =========================
  let aimTimer: ReturnType<typeof setInterval> | null = null;
  let aimLmRef: HandLandmark[] | null = null;

  function startAimStream() {
    if (aimTimer) return;
    aimTimer = setInterval(() => {
      if (!socket || !socket.connected || !joinedOk) return;
      if (!aimLmRef) return;
      socket.emit("aim", { dir: computeAimDir(aimLmRef) });
    }, 100);
  }

  function stopAimStream() {
    if (!aimTimer) return;
    clearInterval(aimTimer);
    aimTimer = null;
  }

  // =========================
  // Commit policy (cooldown)
  // =========================
  const COOLDOWN_MS = 240;
  let lastCommittedGesture: string = GESTURE.IDLE;
  let lastGestureChangeAt = 0;

  function resetCommittedGesture(
    aimLm: HandLandmark[] | null,
    emitIdle = false,
  ) {
    if (lastCommittedGesture === GESTURE.POINT) {
      stopAimStream();
    }
    activeMatchedGesture = null;
    aimLmRef = null;
    lastCommittedGesture = GESTURE.IDLE;
    lastGestureChangeAt = 0;
    if (emitIdle) {
      sendInput(GESTURE.IDLE, aimLm);
    }
  }

  function sendInput(gesture: string, aimLm: HandLandmark[] | null) {
    if (!socket || !socket.connected || !joinedOk) return;
    const skillName = GESTURE_TO_SKILLNAME[gesture] || gesture;
    socket.emit("input", { gesture, skillName, dir: computeAimDir(aimLm) });
  }

  function resetGiantHoldState(clearCompleted = true) {
    giantHoldActive = false;
    giantHoldStartedAt = 0;
    giantHoldLastMatchedAt = 0;
    if (clearCompleted) {
      giantHoldCompleted = false;
    }
  }

  function cancelGiantHold(
    aimLm: HandLandmark[] | null,
    nowMs: number,
    statusText = "Tam Nhẫn Kiếm Chỉ bị huỷ vì mất pose.",
  ) {
    const hadActiveCharge = giantHoldActive;
    if (hadActiveCharge) {
      sendInput(GESTURE.GIANT_CANCEL, aimLm);
      console.log("Đã huỷ tụ chiêu: GIANT");
    }
    resetGiantHoldState(true);

    if (hadActiveCharge && nowMs - lastTemplateStatusAt > 120) {
      lastTemplateStatusAt = nowMs;
      updateGestureTemplateStatus(statusText);
    }
  }

  function updateGiantHoldStatus(
    text: string,
    nowMs: number,
    intervalMs = 180,
  ) {
    if (nowMs - lastTemplateStatusAt <= intervalMs) return;
    lastTemplateStatusAt = nowMs;
    updateGestureTemplateStatus(text);
  }

  function handleGiantHoldMatch(
    best: TemplateMatchResult,
    matched: boolean,
    nowMs: number,
  ) {
    const skillLabel =
      best.saved.displayName ||
      GESTURE_TO_SKILLNAME[GESTURE.GIANT] ||
      GESTURE.GIANT;

    if (!matched) {
      if (
        giantHoldActive &&
        nowMs - giantHoldLastMatchedAt <= GIANT_HOLD_LOST_GRACE_MS
      ) {
        return true;
      }

      if (giantHoldActive) {
        cancelGiantHold(best.landmarks, nowMs);
        return false;
      }

      if (giantHoldCompleted && best.error <= GIANT_RELEASE_THRESHOLD) {
        updateGiantHoldStatus(
          `${skillLabel}: đã bắn. Hạ tay ra rồi giữ lại để tụ lần tiếp theo.`,
          nowMs,
          300,
        );
        return true;
      }

      if (giantHoldCompleted) {
        resetGiantHoldState(true);
      }
      return false;
    }

    if (giantHoldCompleted) {
      updateGiantHoldStatus(
        `${skillLabel}: đã bắn. Hạ tay ra rồi giữ lại để tụ lần tiếp theo.`,
        nowMs,
        300,
      );
      return true;
    }

    if (!giantHoldActive) {
      giantHoldActive = true;
      giantHoldStartedAt = nowMs;
      giantHoldLastMatchedAt = nowMs;
      activeMatchedGesture = GESTURE.GIANT;
      lastMatchedGestureSentAt = nowMs;
      aimLmRef = best.landmarks;
      stopAimStream();
      sendInput(GESTURE.GIANT_CHARGE, best.landmarks);
      showSkillName(`${skillLabel}: Charge`);
      updateGestureTemplateStatus(
        `${skillLabel}: bắt đầu tụ kiếm, giữ pose 3 giây.`,
      );
      console.log("Bắt đầu tụ chiêu: GIANT_CHARGE");
      return true;
    }

    giantHoldLastMatchedAt = nowMs;
    aimLmRef = best.landmarks;
    const elapsedMs = nowMs - giantHoldStartedAt;
    const ringEveryMs = GIANT_HOLD_MS / GIANT_RING_COUNT;
    const ringCount = Math.min(
      GIANT_RING_COUNT,
      Math.max(1, Math.floor(elapsedMs / ringEveryMs) + 1),
    );

    if (elapsedMs < GIANT_HOLD_MS) {
      const remainingSec = Math.max(0, (GIANT_HOLD_MS - elapsedMs) / 1000);
      updateGiantHoldStatus(
        `${skillLabel}: giữ pose ${remainingSec.toFixed(1)}s | vòng ${ringCount}/${GIANT_RING_COUNT}`,
        nowMs,
      );
      return true;
    }

    resetGiantHoldState(false);
    giantHoldCompleted = true;
    const activated = commitGesture(GESTURE.GIANT, best.landmarks, {
      force: true,
    });
    activeMatchedGesture = GESTURE.GIANT;
    lastMatchedGestureSentAt = nowMs;
    updateGestureTemplateStatus(`${skillLabel}: đủ 3 giây, phóng kiếm.`);
    if (activated) {
      console.log(`Đã kích hoạt chiêu: ${GESTURE.GIANT}`);
    }
    return true;
  }

  function commitGesture(
    g: string,
    aimLm: HandLandmark[] | null,
    options: { force?: boolean } = {},
  ): boolean {
    const now = Date.now();
    const leavingPoint =
      lastCommittedGesture === GESTURE.POINT && g !== GESTURE.POINT;

    // rời POINT thì tắt aim ngay (không bị cooldown giữ lại)
    if (
      !options.force &&
      !leavingPoint &&
      now - lastGestureChangeAt < COOLDOWN_MS
    ) {
      return false;
    }

    // không spam cùng gesture (trừ POINT vì aim cần mượt)
    if (!options.force && g === lastCommittedGesture && g !== GESTURE.POINT) {
      return false;
    }

    // nếu IDLE thì stop aim + UI, và gửi 1 lần để reset pose ở display
    if (g === GESTURE.IDLE) {
      resetCommittedGesture(aimLm, true);
      return true;
    }

    lastCommittedGesture = g;
    lastGestureChangeAt = now;

    showSkillName(GESTURE_TO_SKILLNAME[g] || g);

    if (g === GESTURE.POINT) {
      aimLmRef = aimLm;
      startAimStream();
    } else {
      aimLmRef = aimLm;
      stopAimStream();
    }

    sendInput(g, aimLm);
    return true;
  }

  // =========================
  // Frame results
  // =========================
  let gotFirstResults = false;

  function handleHandResults(results: HandLandmarkerResult | null) {
    if (!active.current) return;
    if (!gotFirstResults) {
      gotFirstResults = true;
      loadingElEl.style.display = "none";
    }

    const now = performance.now();
    const { L, R, lms } = assignLR(results);
    drawHandOverlay(lms);

    if (!lms || lms.length === 0) {
      cancelGiantHold(null, now);
      resetGiantHoldState(true);
      latestRecordHand = null;
      latestRecordHandLabel = "Unknown";
      liveMotionFrames = [];
      suppressMatchingUntil = 0;
      activeMatchedGesture = null;
      lastMatchedGestureSentAt = 0;
      aimLmRef = null;
      stopAimStream();
      if (lastCommittedGesture !== GESTURE.IDLE) {
        resetCommittedGesture(null, true);
      }
      if (now - lastTemplateStatusAt > 180) {
        lastTemplateStatusAt = now;
        updateGestureTemplateStatus("Không thấy bàn tay.");
      }
      return;
    }

    const primaryHand = R || L || lms[0] || null;
    latestRecordHand = primaryHand;
    latestRecordHandLabel =
      primaryHand === R ? "Right" : primaryHand === L ? "Left" : "Unknown";
    appendLiveMotionFrame(primaryHand, latestRecordHandLabel, now);
    captureRecordingFrame(primaryHand, latestRecordHandLabel, now);

    if (recordingPhase !== "idle") {
      return;
    }

    if (!savedGestures.length) {
      cancelGiantHold(primaryHand, now);
      if (lastCommittedGesture !== GESTURE.IDLE) {
        commitGesture(GESTURE.IDLE, primaryHand);
      }
      if (now - lastTemplateStatusAt > 500) {
        lastTemplateStatusAt = now;
        updateGestureTemplateStatus("Đang thấy tay. Chưa có mẫu để Play.");
      }
      return;
    }

    const best = findBestTemplateMatch(primaryHand);
    if (!best) {
      cancelGiantHold(primaryHand, now);
      if (lastCommittedGesture !== GESTURE.IDLE) {
        commitGesture(GESTURE.IDLE, primaryHand);
      }
      if (now - lastTemplateStatusAt > 180) {
        lastTemplateStatusAt = now;
        updateGestureTemplateStatus("Không normalize được landmarks hiện tại.");
      }
      return;
    }

    if (now < suppressMatchingUntil) {
      if (now - lastTemplateStatusAt > 180) {
        lastTemplateStatusAt = now;
        updateGestureTemplateStatus("Đã lưu mẫu. Chuẩn bị nhận diện lại...");
      }
      return;
    }

    if (now - lastTemplateStatusAt > 180) {
      lastTemplateStatusAt = now;
      updateGestureTemplateStatus(
        `Best: ${best.saved.displayName || best.saved.name} | error=${best.error.toFixed(3)} | threshold=${TEMPLATE_MATCH_THRESHOLD}`,
      );
    }

    const matched = best.error < TEMPLATE_MATCH_THRESHOLD;
    const bestGestureName = normalizeGestureName(best.saved.name);
    if (bestGestureName === GESTURE.GIANT) {
      const poseError = calculateCurrentPoseError(
        primaryHand,
        latestRecordHandLabel,
        best.saved,
        now,
      );
      const giantBest = {
        ...best,
        error: Math.min(best.error, poseError),
      };
      if (
        handleGiantHoldMatch(
          giantBest,
          matched || poseError < TEMPLATE_MATCH_THRESHOLD,
          now,
        )
      ) {
        return;
      }
    } else if (giantHoldActive || giantHoldCompleted) {
      const giantSaved = findSavedGestureByName(GESTURE.GIANT);
      if (giantSaved) {
        const poseError = calculateCurrentPoseError(
          primaryHand,
          latestRecordHandLabel,
          giantSaved,
          now,
        );
        const giantBest: TemplateMatchResult = {
          saved: giantSaved,
          error: poseError,
          landmarks: primaryHand,
        };
        if (
          handleGiantHoldMatch(
            giantBest,
            poseError < TEMPLATE_MATCH_THRESHOLD,
            now,
          )
        ) {
          return;
        }
      }

      if (giantHoldActive) {
        cancelGiantHold(
          best.landmarks,
          now,
          "Tam Nhẫn Kiếm Chỉ bị huỷ vì chuyển sang pose khác.",
        );
      } else if (giantHoldCompleted) {
        resetGiantHoldState(true);
      }
    }

    if (matched) {
      const sameHeldGesture = activeMatchedGesture === best.saved.name;
      const canRecast =
        !sameHeldGesture || now - lastMatchedGestureSentAt >= MATCH_RECAST_MS;

      if (!canRecast) {
        if (lastCommittedGesture === GESTURE.POINT) {
          aimLmRef = best.landmarks;
        }
        return;
      }

      const activated = commitGesture(best.saved.name, best.landmarks, {
        force: true,
      });
      if (activated) {
        activeMatchedGesture = best.saved.name;
        lastMatchedGestureSentAt = now;
        console.log(`Đã kích hoạt chiêu: ${best.saved.name}`);
      } else if (lastCommittedGesture === GESTURE.POINT) {
        aimLmRef = best.landmarks;
      }
      return;
    }

    activeMatchedGesture = null;

    if (lastCommittedGesture !== GESTURE.IDLE) {
      commitGesture(GESTURE.IDLE, best.landmarks);
    }
  }

  // =========================
  // Camera start + loop
  // =========================
  let streamRef: MediaStream | null = null;
  let poseRaf = 0;

  async function startCameraManually() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ getUserMedia");
      }

      loadingElEl.style.display = "block";
      loadingElEl.innerHTML = "Đang mở camera...";

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      streamRef = stream;
      video.srcObject = stream;
      await video.play();
      if (previewVideo) {
        previewVideo.srcObject = stream;
        try {
          await previewVideo.play();
        } catch (_) {
          // ignore autoplay issues
        }
        previewVideo.style.display = "block";
      }
      if (handOverlay) {
        resizeHandOverlay();
        handOverlay.style.display = "block";
      }

      loadingElEl.innerHTML = "Đang nhận diện cử chỉ...";
      initHandLandmarker();
      if (shouldRunPoseTracking()) {
        initPoseLandmarker();
      }

      if (poseCanvas) {
        poseCanvas.width = video.videoWidth || 640;
        poseCanvas.height = video.videoHeight || 480;
      }

      let busy = false;
      function frameLoop() {
        try {
          if (!active.current) return;
          if (!busy && video.readyState >= 2) {
            const nowMs = performance.now();
            if (nowMs - lastHandProcessedAt >= HAND_DETECT_MS) {
              lastHandProcessedAt = nowMs;
              busy = true;
              if (handsReady && handLandmarker) {
                const results = handLandmarker.detectForVideo(video, nowMs);
                handleHandResults(results);
              }
              busy = false;
            }
          }
        } catch (e) {
          busy = false;
        }
        requestAnimationFrame(frameLoop);
      }
      frameLoop();

      const poseLoop = () => {
        if (!active.current) return;
        if (!shouldRunPoseTracking()) {
          poseRaf = requestAnimationFrame(poseLoop);
          return;
        }
        if (!poseReady || !poseLandmarker) {
          initPoseLandmarker();
          poseRaf = requestAnimationFrame(poseLoop);
          return;
        }
        if (poseReady && poseLandmarker && video.readyState >= 2 && !poseBusy) {
          poseBusy = true;
          try {
            const nowMs = performance.now();
            if (nowMs - lastPoseProcessedAt < POSE_SEND_MS) {
              poseBusy = false;
              poseRaf = requestAnimationFrame(poseLoop);
              return;
            }
            lastPoseProcessedAt = nowMs;
            const result = poseLandmarker.detectForVideo(video, nowMs);
            const world = result?.worldLandmarks?.[0] || result?.landmarks?.[0] || null;
            const screen = result?.landmarks?.[0] || null;
            drawPoseDebug(screen);

            if (world) {
              const packet = buildPosePacket(world, nowMs);
              if (armPoseEnabled && packet && nowMs - lastPoseSentAt >= POSE_SEND_MS) {
                lastPoseSentAt = nowMs;
                sendArmPose(packet);
              }
            } else if (nowMs - lastPoseSeenAt > POSE_LOST_MS) {
              latestArmTemplatePose = null;
              if (armPoseEnabled && nowMs - lastPoseSentAt >= POSE_SEND_MS) {
                lastPoseSentAt = nowMs;
                sendArmPose({
                  t: nowMs,
                  calibrated: poseCalibrated,
                  confidence: { right: 0, left: 0 },
                });
              }
            }
          } catch (_) {
            // ignore pose errors per frame
          } finally {
            poseBusy = false;
          }
        }
        poseRaf = requestAnimationFrame(poseLoop);
      };
      poseLoop();
    } catch (err: any) {
      let msg = "Không mở được camera. ";
      if (err.name === "NotAllowedError") msg += "Bạn đã chặn quyền camera.";
      else if (err.name === "NotFoundError") msg += "Không tìm thấy camera.";
      else if (err.name === "NotReadableError") msg += "Camera đang bị app khác dùng.";
      else msg += `Lỗi: ${err.name || err.message || err}`;

      loadingElEl.style.display = "block";
      loadingElEl.innerHTML =
        msg +
        "<br/>" +
        "Mẹo: vào <b>Site settings → Camera → Allow</b>,<br/>" +
        "và mở bằng <b>https</b> hoặc <b>http://localhost</b>.";
      startBtnEl.style.display = "block";
    }
  }

  const startHandler = () => {
    startBtnEl.style.display = "none";
    startCameraManually();
  };
  startBtnEl.addEventListener("click", startHandler);

  // =========================
  // Quick test keys
  // =========================
  const keyHandler = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "q") commitGesture(GESTURE.LOTUS, aimLmRef);
    if (k === "w") commitGesture(GESTURE.SPHERE, aimLmRef);
    if (k === "e") commitGesture(GESTURE.ATTACK, aimLmRef);
    if (k === "r") commitGesture(GESTURE.WALL, aimLmRef);
    if (k === "t") commitGesture(GESTURE.SPIN, aimLmRef);
    if (k === "y") commitGesture(GESTURE.GIANT, aimLmRef);
    if (k === "u") commitGesture(GESTURE.FAN, aimLmRef);
    if (k === "i") commitGesture(GESTURE.SHAKA, aimLmRef);
  };
  addEventListener("keydown", keyHandler);

  return () => {
    active.current = false;
    joinBtn?.removeEventListener("click", joinHandler);
    startBtnEl.removeEventListener("click", startHandler);
    removeEventListener("keydown", keyHandler);
    for (const el of cameraInputs) {
      if (!el) continue;
      el.removeEventListener("input", onCameraInput);
      el.removeEventListener("change", onCameraInput);
    }
    mirrorToggle?.removeEventListener("change", onMirrorChange);
    debugToggle?.removeEventListener("change", onDebugChange);
    armPoseToggle?.removeEventListener("change", onArmPoseChange);
    calibrateBtn?.removeEventListener("click", onCalibrateClick);
    startGestureRecordBtn?.removeEventListener(
      "click",
      startGestureRecordClickHandler,
    );
    clearGesturesBtn?.removeEventListener("click", clearGesturesClickHandler);
    if (toggleControls && toggleHandler) {
      toggleControls.removeEventListener("click", toggleHandler);
    }

    clearRecordTimers();
    cancelGiantHold(aimLmRef, performance.now(), "");
    resetGiantHoldState(true);
    setRecordCountdownText(null);
    restoreMediapipeLogFilter();

    delete window.saveGesture;
    delete window.startGestureRecord;
    delete window.getSavedGestures;
    delete window.clearSavedGestures;

    if (aimTimer) {
      clearInterval(aimTimer);
      aimTimer = null;
    }

    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    if (handLandmarker?.close) {
      try {
        handLandmarker.close();
      } catch (_) {
        // ignore
      }
    }

    if (poseRaf) {
      cancelAnimationFrame(poseRaf);
      poseRaf = 0;
    }

    if (poseLandmarker?.close) {
      try {
        poseLandmarker.close();
      } catch (_) {
        // ignore
      }
    }

    if (streamRef) {
      for (const track of streamRef.getTracks()) {
        track.stop();
      }
      streamRef = null;
    }
    if (previewVideo) {
      try {
        previewVideo.pause();
      } catch (_) {
        // ignore
      }
      previewVideo.srcObject = null;
      previewVideo.style.display = "none";
    }
    if (handOverlay) {
      clearHandOverlay();
      handOverlay.style.display = "none";
    }
  };
}
