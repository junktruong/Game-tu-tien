import { io } from 'socket.io-client';

export function initControl({ socketUrl }: { socketUrl: string }) {
  const active = { current: true };

  // =========================
  // DOM + Secure context check
  // =========================
  const $ = (id: string) => document.getElementById(id);

  const loadingEl = $("loading");
  const startBtn = $("startBtn");

  const isLocalhost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const isSecure = window.isSecureContext || isLocalhost;

  if (!loadingEl || !startBtn) {
    return () => {};
  }

  if (!isSecure) {
    loadingEl.style.display = "block";
    loadingEl.innerHTML =
      "Không thể mở camera vì trang chưa an toàn.<br/>" +
      "Hãy chạy bằng <b>https</b> hoặc <b>http://localhost</b>.";
    startBtn.style.display = "none";
    return () => {};
  }

  const netText = $("netText");
  const roomInput = $("roomInput") as HTMLInputElement | null;
  const playerSelect = $("playerSelect") as HTMLSelectElement | null;
  const joinBtn = $("joinBtn");

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

  const video = document.querySelector<HTMLVideoElement>(".input_video");
  if (!video) {
    return () => {};
  }
  video.setAttribute("playsinline", "");
  video.muted = true;
  video.autoplay = true;

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
    POINT: "POINT",
    SHAKA: "SHAKA", // dùng cho ULT / Hồi Kiếm của bạn
    FAN: "FAN",
  } as const;

  const GESTURE_TO_SKILLNAME: Record<string, string> = {
    LOTUS: "Liên Hoa Trận",
    SPHERE: "Hộ Thân Kiếm Cầu",
    ATTACK: "Phá Thiên Kích",
    WALL: "Thiên La Địa Võng",
    SPIN: "Kiếm Vũ",
    GIANT: "Tam Nhẫn Kiếm Chỉ",
    POINT: "AIM",
    SHAKA: "Song Long Quá Hải / Hồi Kiếm",
    FAN: "Việt Tự Kiếm Tiên",
    IDLE: "—",
  };

  // =========================
  // MediaPipe Hands
  // =========================
  const handsClass = (window as any).Hands;
  if (!handsClass) {
    loadingEl.style.display = "block";
    loadingEl.innerHTML = "Thiếu MediaPipe Hands (hands.js chưa load).";
    return () => {};
  }

  const hands = new handsClass({
    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.65,
  });

  // =========================
  // Geometry helpers (stable)
  // =========================
  function dist2(a: any, b: any) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function handScale(lm: any[]) {
    // scale ~ wrist(0) -> middle_mcp(9)
    return Math.max(0.12, dist2(lm[0], lm[9]));
  }

  function angleDeg(a: any, b: any, c: any) {
    // angle ABC (2D)
    const abx = a.x - b.x,
      aby = a.y - b.y;
    const cbx = c.x - b.x,
      cby = c.y - b.y;
    const dot = abx * cbx + aby * cby;
    const nab = Math.hypot(abx, aby);
    const ncb = Math.hypot(cbx, cby);
    const cos = dot / (nab * ncb + 1e-9);
    const clamped = Math.max(-1, Math.min(1, cos));
    return (Math.acos(clamped) * 180) / Math.PI;
  }

  function fingerExtended(lm: any[], mcp: number, pip: number, dip: number, tip: number) {
    const a1 = angleDeg(lm[mcp], lm[pip], lm[dip]);
    const a2 = angleDeg(lm[pip], lm[dip], lm[tip]);
    return a1 > 160 && a2 > 160;
  }

  function thumbExtended(lm: any[]) {
    // thumb: 1-2-3-4
    const a1 = angleDeg(lm[1], lm[2], lm[3]);
    const a2 = angleDeg(lm[2], lm[3], lm[4]);
    return a1 > 150 && a2 > 150;
  }

  function fingerState(lm: any[]) {
    return {
      thumb: thumbExtended(lm),
      index: fingerExtended(lm, 5, 6, 7, 8),
      middle: fingerExtended(lm, 9, 10, 11, 12),
      ring: fingerExtended(lm, 13, 14, 15, 16),
      pinky: fingerExtended(lm, 17, 18, 19, 20),
    };
  }

  function isOpenPalm(lm: any[]) {
    const f = fingerState(lm);
    const cnt = Object.values(f).filter(Boolean).length;
    if (cnt < 4) return false;

    // thêm điều kiện "xòe" để giảm accidental open palm
    const s = handScale(lm);
    const spreadRatio = dist2(lm[8], lm[20]) / (s + 1e-9); // indexTip - pinkyTip
    return spreadRatio > 1.05;
  }

  function isOpenPalmRelaxed(lm: any[]) {
    const f = fingerState(lm);
    const cnt = Object.values(f).filter(Boolean).length;
    if (cnt < 3) return false;
    const s = handScale(lm);
    const spreadRatio = dist2(lm[8], lm[20]) / (s + 1e-9);
    return spreadRatio > 0.85;
  }

  function detectGestureSingle(lm: any[]) {
    const f = fingerState(lm);
    const s = handScale(lm);

    // SPIN (OK): thumb tip gần index tip
    const pinch = dist2(lm[4], lm[8]) < s * 0.22;
    if (pinch && (f.middle || f.ring || f.pinky)) return GESTURE.SPIN;

    // WALL: index + pinky, middle/ring gập
    if (f.index && f.pinky && !f.middle && !f.ring) return GESTURE.WALL;

    // ATTACK: index + middle
    if (f.index && f.middle && !f.ring && !f.pinky) return GESTURE.ATTACK;

    // POINT: chỉ index, thumb gập (đỡ nhầm khi "chỉ" nhưng thumb mở)
    if (f.index && !f.middle && !f.ring && !f.pinky && !f.thumb)
      return GESTURE.POINT;

    // FAN: 4 ngón, thumb gập
    if (!f.thumb && f.index && f.middle && f.ring && f.pinky) return GESTURE.FAN;

    // SPHERE: chỉ thumb
    if (f.thumb && !f.index && !f.middle && !f.ring && !f.pinky)
      return GESTURE.SPHERE;

    // LOTUS: open palm đúng nghĩa
    if (isOpenPalm(lm)) return GESTURE.LOTUS;

    // Không chắc => IDLE (FIX quan trọng)
    return GESTURE.IDLE;
  }

  // =========================
  // Hand assignment (Left/Right)
  // =========================
  function assignLR(results: any) {
    const lms = results.multiHandLandmarks || [];
    const handed = results.multiHandedness || [];

    let L: any = null,
      R: any = null;

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
  // Aim direction
  // =========================
  function computeAimDir(preferLm: any) {
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
  // Stabilizers (ms-based)
  // =========================
  const STABLE_MS = 140;
  const LOST_MS = 220;

  function makeStab() {
    return {
      cand: GESTURE.IDLE,
      candSince: 0,
      stable: GESTURE.IDLE,
      lastSeen: 0,
      update(now: number, g: string) {
        this.lastSeen = now;
        if (g !== this.cand) {
          this.cand = g;
          this.candSince = now;
        }
        if (this.stable !== this.cand && now - this.candSince >= STABLE_MS) {
          this.stable = this.cand;
          return true;
        }
        return false;
      },
      decay(now: number) {
        if (now - this.lastSeen > LOST_MS) {
          this.cand = GESTURE.IDLE;
          this.stable = GESTURE.IDLE;
          this.candSince = now;
          return true;
        }
        return false;
      },
    };
  }

  const stabL = makeStab();
  const stabR = makeStab();
  const stabAll = makeStab(); // ổn định cho gesture tổng (ULT vs single-hand)

  // =========================
  // GIANT hold (2 hands raised)
  // =========================
  const GIANT_RAISE_Y = 0.56;
  const GIANT_HOLD_MS = 3000;
  const GIANT_GRACE_MS = 220;

  let giantCharging = false;
  let giantChargeStartAt = 0;
  let giantFired = false;
  let giantLastSeenAt = 0;

  function isTwoHandsRaised(L: any, R: any) {
    if (!L || !R) return false;
    if (!isOpenPalmRelaxed(L) || !isOpenPalmRelaxed(R)) return false;
    const cL = L[9];
    const cR = R[9];
    return cL.y < GIANT_RAISE_Y && cR.y < GIANT_RAISE_Y;
  }

  function sendAuxGesture(gesture: string, aimLm: any) {
    if (!socket || !socket.connected || !joinedOk) return;
    socket.emit("input", {
      gesture,
      skillName: gesture,
      dir: computeAimDir(aimLm),
    });
  }

  function handleGiantHold(raised: boolean, aimLm: any) {
    const now = Date.now();

    if (raised) {
      giantLastSeenAt = now;
      if (!giantCharging) {
        giantCharging = true;
        giantFired = false;
        giantChargeStartAt = now;
        sendAuxGesture("GIANT_CHARGE", aimLm);
        showSkillName("Giant (Charge)");
      }

      if (!giantFired && now - giantChargeStartAt >= GIANT_HOLD_MS) {
        giantFired = true;
        giantCharging = false;
        sendAuxGesture("GIANT_CANCEL", aimLm);
        commitGesture(GESTURE.GIANT, aimLm);
      }
      return true;
    }

    if (giantCharging && now - giantLastSeenAt <= GIANT_GRACE_MS) {
      if (!giantFired && now - giantChargeStartAt >= GIANT_HOLD_MS) {
        giantFired = true;
        giantCharging = false;
        sendAuxGesture("GIANT_CANCEL", aimLm);
        commitGesture(GESTURE.GIANT, aimLm);
      }
      return true;
    }

    if (giantCharging) {
      giantCharging = false;
      giantFired = false;
      giantChargeStartAt = 0;
      sendAuxGesture("GIANT_CANCEL", aimLm);
    }
    return false;
  }

  // =========================
  // ULT combo: ATTACK + WALL (2 hands)
  // =========================
  function isUltCombo(gL: string, gR: string) {
    return (
      (gL === GESTURE.ATTACK && gR === GESTURE.WALL) ||
      (gL === GESTURE.WALL && gR === GESTURE.ATTACK)
    );
  }

  // =========================
  // Output selection priority
  // =========================
  function pickPrimary(gL: string, gR: string) {
    // ưu tiên aim trước
    if (gL === GESTURE.POINT || gR === GESTURE.POINT) return GESTURE.POINT;
    if (gL === GESTURE.SPHERE || gR === GESTURE.SPHERE) return GESTURE.SPHERE;
    if (gL === GESTURE.SPIN || gR === GESTURE.SPIN) return GESTURE.SPIN;

    if (gL === GESTURE.ATTACK || gR === GESTURE.ATTACK) return GESTURE.ATTACK;
    if (gL === GESTURE.WALL || gR === GESTURE.WALL) return GESTURE.WALL;

    if (gL === GESTURE.FAN || gR === GESTURE.FAN) return GESTURE.FAN;
    if (gL === GESTURE.LOTUS || gR === GESTURE.LOTUS) return GESTURE.LOTUS;

    return GESTURE.IDLE;
  }

  // =========================
  // Aim stream
  // =========================
  let aimTimer: ReturnType<typeof setInterval> | null = null;
  let aimLmRef: any = null;

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
  let lastCommittedGesture = GESTURE.IDLE;
  let lastGestureChangeAt = 0;

  function sendInput(gesture: string, aimLm: any) {
    if (!socket || !socket.connected || !joinedOk) return;
    const skillName = GESTURE_TO_SKILLNAME[gesture] || gesture;
    socket.emit("input", { gesture, skillName, dir: computeAimDir(aimLm) });
  }

  function commitGesture(g: string, aimLm: any) {
    const now = Date.now();
    const leavingPoint =
      lastCommittedGesture === GESTURE.POINT && g !== GESTURE.POINT;

    // rời POINT thì tắt aim ngay (không bị cooldown giữ lại)
    if (!leavingPoint && now - lastGestureChangeAt < COOLDOWN_MS) return;

    // không spam cùng gesture (trừ POINT vì aim cần mượt)
    if (g === lastCommittedGesture && g !== GESTURE.POINT) return;

    // nếu IDLE thì chỉ stop aim + UI, không gửi input (giống behavior cũ khi mất tay)
    if (g === GESTURE.IDLE) {
      if (lastCommittedGesture === GESTURE.POINT) stopAimStream();
      lastCommittedGesture = GESTURE.IDLE;
      lastGestureChangeAt = now;
      return;
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
  }

  // =========================
  // Frame results
  // =========================
  let gotFirstResults = false;

  hands.onResults((results: any) => {
    if (!active.current) return;
    if (!gotFirstResults) {
      gotFirstResults = true;
      loadingEl.style.display = "none";
    }

    const now = Date.now();
    const { L, R, lms } = assignLR(results);

    if (!lms || lms.length === 0) {
      // mất tay
      handleGiantHold(false, null);
      stabL.decay(now);
      stabR.decay(now);
      stabAll.decay(now);

      aimLmRef = null;
      stopAimStream();
      return;
    }

    // update per-hand gesture
    const gL_raw = L ? detectGestureSingle(L) : GESTURE.IDLE;
    const gR_raw = R ? detectGestureSingle(R) : GESTURE.IDLE;

    stabL.update(now, gL_raw);
    stabR.update(now, gR_raw);

    const gL = stabL.stable;
    const gR = stabR.stable;

    // aim landmark ưu tiên: tay đang POINT (stable)
    let aimLm = null;
    if (gL === GESTURE.POINT) aimLm = L;
    else if (gR === GESTURE.POINT) aimLm = R;
    else aimLm = R || L || lms[0];

    // GIANT hold có ưu tiên cao nhất
    const raised = isTwoHandsRaised(L, R);
    if (handleGiantHold(raised, aimLm)) {
      // đang charge/giữ -> không commit gesture khác
      stabAll.update(now, GESTURE.IDLE);
      return;
    }

    // ULT: ATTACK + WALL (2 tay)
    const ult = L && R && isUltCombo(gL, gR);
    const primary = ult ? GESTURE.SHAKA : pickPrimary(gL, gR);

    // ổn định gesture tổng
    const changed = stabAll.update(now, primary);

    // commit khi stable tổng thay đổi
    if (changed) {
      const g = stabAll.stable;

      // cập nhật aim ref nếu đang POINT
      if (g === GESTURE.POINT) aimLmRef = aimLm;

      commitGesture(g, aimLm);
    } else {
      // nếu đang POINT thì update aimLmRef để aim stream dùng tay đúng
      if (lastCommittedGesture === GESTURE.POINT) aimLmRef = aimLm;
    }
  });

  // =========================
  // Camera start + loop
  // =========================
  let streamRef: MediaStream | null = null;

  async function startCameraManually() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ getUserMedia");
      }

      loadingEl.style.display = "block";
      loadingEl.innerHTML = "Đang mở camera...";

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

      loadingEl.innerHTML = "Đang nhận diện bàn tay...";

      let busy = false;
      async function frameLoop() {
        try {
          if (!active.current) return;
          if (!busy && video.readyState >= 2) {
            busy = true;
            await hands.send({ image: video });
            busy = false;
          }
        } catch (e) {
          busy = false;
        }
        requestAnimationFrame(frameLoop);
      }
      frameLoop();
    } catch (err: any) {
      let msg = "Không mở được camera. ";
      if (err.name === "NotAllowedError") msg += "Bạn đã chặn quyền camera.";
      else if (err.name === "NotFoundError") msg += "Không tìm thấy camera.";
      else if (err.name === "NotReadableError") msg += "Camera đang bị app khác dùng.";
      else msg += `Lỗi: ${err.name || err.message || err}`;

      loadingEl.style.display = "block";
      loadingEl.innerHTML =
        msg +
        "<br/>" +
        "Mẹo: vào <b>Site settings → Camera → Allow</b>,<br/>" +
        "và mở bằng <b>https</b> hoặc <b>http://localhost</b>.";
      startBtn.style.display = "block";
    }
  }

  const startHandler = () => {
    startBtn.style.display = "none";
    startCameraManually();
  };
  startBtn.addEventListener("click", startHandler);

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
    startBtn?.removeEventListener("click", startHandler);
    removeEventListener("keydown", keyHandler);

    if (aimTimer) {
      clearInterval(aimTimer);
      aimTimer = null;
    }

    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    if (hands?.close) {
      try {
        hands.close();
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
  };
}
