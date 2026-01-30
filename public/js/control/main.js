const loadingEl = document.getElementById('loading');
const startBtn = document.getElementById('startBtn');

const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const isSecure = window.isSecureContext || isLocalhost;

if (!isSecure) {
  loadingEl.style.display = 'block';
  loadingEl.innerHTML =
    'Không thể mở camera vì trang chưa an toàn.<br/>' +
    'Hãy chạy bằng <b>https</b> hoặc <b>http://localhost</b>.';
  startBtn.style.display = 'none';
}

const netText = document.getElementById('netText');
const roomInput = document.getElementById('roomInput');
const playerSelect = document.getElementById('playerSelect');
const joinBtn = document.getElementById('joinBtn');

const qs = new URLSearchParams(location.search);
roomInput.value = (qs.get('room') || 'demo').trim() || 'demo';
playerSelect.value = qs.get('player') === '2' ? '2' : '1';

let socket = null;
let ROOM = roomInput.value.trim() || 'demo';
let PLAYER = Number(playerSelect.value) === 2 ? 2 : 1;
let joinedOk = false;

function setNet(s) {
  netText.textContent = s;
}

function connectAndJoin() {
  ROOM = roomInput.value.trim() || 'demo';
  PLAYER = Number(playerSelect.value) === 2 ? 2 : 1;

  if (!socket) {
    socket = window.io(window.__SOCKET_URL || undefined);
    socket.on('connect', () => {
      joinedOk = false;
      setNet(`✅ Connected | room=${ROOM} | P${PLAYER}`);
      socket.emit('join', { room: ROOM, role: 'player', player: PLAYER });
    });
    socket.on('joined', (info) => {
      joinedOk = true;
      setNet(`🟢 Joined room=${info.room} | Player ${info.player}`);
    });
    socket.on('roster', (r) => {
      if (!joinedOk) return;
      setNet(
        `🟢 room=${ROOM} | P1:${r.p1 ? 'ON' : 'OFF'} P2:${r.p2 ? 'ON' : 'OFF'} | Display:${r.displayCount}`,
      );
    });
    socket.on('join_error', (e) => {
      joinedOk = false;
      setNet(`❌ join_error: ${e?.message || 'unknown'}`);
    });
    socket.on('disconnect', () => {
      joinedOk = false;
      setNet('⚠️ Disconnected');
    });
  } else {
    joinedOk = false;
    socket.emit('join', { room: ROOM, role: 'player', player: PLAYER });
    setNet(`↻ Re-join… room=${ROOM} P${PLAYER}`);
  }
}

joinBtn.addEventListener('click', connectAndJoin);
connectAndJoin();

const GESTURE = {
  IDLE: 'IDLE',
  LOTUS: 'LOTUS',
  SPHERE: 'SPHERE',
  ATTACK: 'ATTACK',
  WALL: 'WALL',
  SPIN: 'SPIN',
  GIANT: 'GIANT',
  POINT: 'POINT',
  SHAKA: 'SHAKA',
  FAN: 'FAN',
};

const GESTURE_TO_SKILLNAME = {
  LOTUS: 'Liên Hoa Trận',
  SPHERE: 'Hộ Thân Kiếm Cầu',
  ATTACK: 'Phá Thiên Kích',
  WALL: 'Thiên La Địa Võng',
  SPIN: 'Spin',
  GIANT: 'Giant',
  POINT: 'AIM',
  SHAKA: 'ULT / Hồi Kiếm',
  FAN: 'Fan',
  IDLE: '—',
};

const skillNameEl = document.getElementById('skill-name');
function showSkillName(name) {
  skillNameEl.textContent = name;
  skillNameEl.classList.add('show');
  clearTimeout(window.__skillT);
  window.__skillT = setTimeout(
    () => skillNameEl.classList.remove('show'),
    900,
  );
}

const video = document.querySelector('.input_video');
video.setAttribute('playsinline', '');
video.muted = true;
video.autoplay = true;

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.65,
  minTrackingConfidence: 0.65,
});

let gotFirstResults = false;
let handDetected = false;
let handRawL = null;
let handRawR = null;
let primaryHandRaw = null;

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function handSize(lm) {
  return Math.max(0.12, dist2(lm[0], lm[9]));
}
function isExtended(lm, tipIdx, mcpIdx, extMul) {
  const wrist = lm[0];
  const tip = lm[tipIdx];
  const mcp = lm[mcpIdx];
  return dist2(tip, wrist) > dist2(mcp, wrist) * extMul;
}

function isOpenPalm(lm) {
  const extMul = 1.24;
  const thumbOut = isExtended(lm, 4, 2, extMul);
  const indexOut = isExtended(lm, 8, 5, extMul);
  const middleOut = isExtended(lm, 12, 9, extMul);
  const ringOut = isExtended(lm, 16, 13, extMul);
  const pinkyOut = isExtended(lm, 20, 17, extMul);
  const extCount = [
    thumbOut,
    indexOut,
    middleOut,
    ringOut,
    pinkyOut,
  ].filter(Boolean).length;
  return extCount >= 4;
}

function isFist(lm) {
  const wrist = lm[0];
  const middleMCP = lm[9];
  const hs = Math.max(0.12, dist2(wrist, middleMCP));
  const fistTh = hs * 0.92;

  const tips = [lm[8], lm[12], lm[16], lm[20]];
  const avg =
    (dist2(tips[0], wrist) +
      dist2(tips[1], wrist) +
      dist2(tips[2], wrist) +
      dist2(tips[3], wrist)) /
    4;

  const extMul = 1.18;
  const indexOut = isExtended(lm, 8, 5, extMul);
  const middleOut = isExtended(lm, 12, 9, extMul);
  const ringOut = isExtended(lm, 16, 13, extMul);
  const pinkyOut = isExtended(lm, 20, 17, extMul);
  const extCount = [indexOut, middleOut, ringOut, pinkyOut].filter(Boolean)
    .length;

  return avg < fistTh && extCount <= 1;
}

let baseOrderSign = 0;
let crossHold = 0;
const CROSS_NEED = 8;
const CROSS_GAP = 0.06;

function palmCenter(lm) {
  return lm ? lm[9] : null;
}

function detectTwoHandsGesture(lmList, handed) {
  if (!lmList || lmList.length < 2) {
    baseOrderSign = 0;
    crossHold = 0;
    return null;
  }

  const a = lmList[0];
  const b = lmList[1];

  if (isOpenPalm(a) && isOpenPalm(b)) {
    const ca = a[9];
    const cb = b[9];
    const d = dist2(ca, cb);
    const s = (handSize(a) + handSize(b)) * 0.5;
    const NEAR = 0.78;
    if (d < s * NEAR) return GESTURE.SHAKA;
  }

  let L = null;
  let R = null;
  if (handed && handed.length >= 2) {
    for (let i = 0; i < 2; i += 1) {
      const label = handed[i]?.label;
      if (label === 'Left') L = lmList[i];
      else if (label === 'Right') R = lmList[i];
    }
  }
  if (!L || !R) {
    const w0 = lmList[0][0].x;
    const w1 = lmList[1][0].x;
    if (w0 < w1) {
      R = lmList[0];
      L = lmList[1];
    } else {
      R = lmList[1];
      L = lmList[0];
    }
  }

  const cL = palmCenter(L);
  const cR = palmCenter(R);
  if (cL && cR) {
    const dx = cR.x - cL.x;
    const sign = Math.sign(dx) || 0;
    if (baseOrderSign === 0) baseOrderSign = sign || 1;

    const crossed = sign !== 0 && sign !== baseOrderSign && Math.abs(dx) > CROSS_GAP;
    crossHold = crossed
      ? Math.min(CROSS_NEED + 2, crossHold + 1)
      : Math.max(0, crossHold - 1);

    if (crossHold >= CROSS_NEED) return GESTURE.SHAKA;

    if (!crossed && Math.abs(dx) > 0.04) baseOrderSign = sign || baseOrderSign;
  }

  const g0 = detectGestureSingle(a);
  const g1 = detectGestureSingle(b);
  const aF = isFist(a);
  const bF = isFist(b);

  const fistPoint = (aF && g1 === GESTURE.POINT) || (bF && g0 === GESTURE.POINT);

  if (fistPoint) return GESTURE.SHAKA;

  return null;
}

const GIANT_RAISE_Y = 0.48;
const GIANT_HOLD_MS = 3000;

function isTwoHandsRaised(lmList) {
  if (!lmList || lmList.length < 2) return false;
  const a = lmList[0];
  const b = lmList[1];
  if (!isOpenPalm(a) || !isOpenPalm(b)) return false;
  const ca = a[9];
  const cb = b[9];
  return ca.y < GIANT_RAISE_Y && cb.y < GIANT_RAISE_Y;
}

let giantCharging = false;
let giantChargeStartAt = 0;
let giantFired = false;

function sendAuxGesture(gesture) {
  if (!socket || !socket.connected || !joinedOk) return;
  socket.emit('input', { gesture, skillName: gesture, dir: computeAimDir() });
}

function handleGiantHold(raised) {
  const now = Date.now();

  if (raised) {
    if (!giantCharging) {
      giantCharging = true;
      giantFired = false;
      giantChargeStartAt = now;
      sendAuxGesture('GIANT_CHARGE');
      showSkillName('Giant (Charge)');
    }

    if (!giantFired && now - giantChargeStartAt >= GIANT_HOLD_MS) {
      giantFired = true;
      giantCharging = false;
      sendAuxGesture('GIANT_CANCEL');
      commitGesture(GESTURE.GIANT);
    }
    return true;
  }

  if (giantCharging) {
    giantCharging = false;
    giantFired = false;
    giantChargeStartAt = 0;
    sendAuxGesture('GIANT_CANCEL');
  }
  return false;
}

function detectGestureSingle(lm) {
  const wrist = lm[0];
  const thumbTip = lm[4];
  const indexTip = lm[8];
  const middleTip = lm[12];
  const ringTip = lm[16];
  const pinkyTip = lm[20];

  const thumbMCP = lm[2];
  const indexMCP = lm[5];
  const middleMCP = lm[9];
  const ringMCP = lm[13];
  const pinkyMCP = lm[17];

  const hs = Math.max(0.12, dist2(wrist, middleMCP));
  const pinchTh = hs * 0.17;
  const extMul = 1.26;

  const thumbOut = dist2(thumbTip, wrist) > dist2(thumbMCP, wrist) * extMul;
  const indexOut = dist2(indexTip, wrist) > dist2(indexMCP, wrist) * extMul;
  const middleOut = dist2(middleTip, wrist) > dist2(middleMCP, wrist) * extMul;
  const ringOut = dist2(ringTip, wrist) > dist2(ringMCP, wrist) * extMul;
  const pinkyOut = dist2(pinkyTip, wrist) > dist2(pinkyMCP, wrist) * extMul;

  const pinchThumbIndex = dist2(thumbTip, indexTip) < pinchTh;

  if (pinchThumbIndex && (middleOut || ringOut || pinkyOut || !indexOut))
    return GESTURE.SPIN;

  if (indexOut && pinkyOut && !middleOut && !ringOut) return GESTURE.WALL;

  if (indexOut && middleOut && !ringOut && !pinkyOut) return GESTURE.ATTACK;

  if (indexOut && !middleOut && !ringOut && !pinkyOut && !thumbOut)
    return GESTURE.POINT;

  if (!thumbOut && indexOut && middleOut && ringOut && pinkyOut)
    return GESTURE.FAN;

  if (thumbOut && !indexOut && !middleOut && !ringOut && !pinkyOut)
    return GESTURE.SPHERE;

  return GESTURE.LOTUS;
}

function isUltComboAttackWall(lmList) {
  if (!lmList || lmList.length < 2) return false;
  const g0 = detectGestureSingle(lmList[0]);
  const g1 = detectGestureSingle(lmList[1]);
  return (
    (g0 === GESTURE.ATTACK && g1 === GESTURE.WALL) ||
    (g0 === GESTURE.WALL && g1 === GESTURE.ATTACK)
  );
}

function computeAimDir() {
  let use = null;

  if (handRawL && detectGestureSingle(handRawL) === GESTURE.POINT) use = handRawL;
  if (handRawR && detectGestureSingle(handRawR) === GESTURE.POINT) use = handRawR;

  if (!use) use = primaryHandRaw || handRawR || handRawL;
  if (!use) return { x: 0, y: 0, z: 0 };

  const w = use[0];
  const i = use[8];
  const dx = i.x - w.x;
  const dy = i.y - w.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: -dy / len, z: -0.35 };
}

const STABLE_FRAMES = 4;
const GESTURE_COOLDOWN_MS = 240;
const gestureQueue = [];
let lastCommittedGesture = GESTURE.IDLE;
let lastGestureChangeAt = 0;

let aimTimer = null;
function startAimStream() {
  if (aimTimer) return;
  aimTimer = setInterval(() => {
    if (!socket || !socket.connected || !joinedOk) return;
    if (!handDetected) return;
    socket.emit('aim', { dir: computeAimDir() });
  }, 100);
}
function stopAimStream() {
  if (!aimTimer) return;
  clearInterval(aimTimer);
  aimTimer = null;
}

function sendInput(gesture) {
  if (!socket || !socket.connected || !joinedOk) return;
  const skillName = GESTURE_TO_SKILLNAME[gesture] || gesture;
  socket.emit('input', { gesture, skillName, dir: computeAimDir() });
}

function commitGesture(g) {
  const now = Date.now();
  if (now - lastGestureChangeAt < GESTURE_COOLDOWN_MS) return;
  if (g === lastCommittedGesture && g !== GESTURE.POINT) return;

  lastCommittedGesture = g;
  lastGestureChangeAt = now;

  showSkillName(GESTURE_TO_SKILLNAME[g] || g);

  if (g === GESTURE.POINT) startAimStream();
  else stopAimStream();

  sendInput(g);
}

function assignLR(results) {
  handRawL = null;
  handRawR = null;
  primaryHandRaw = null;

  const lms = results.multiHandLandmarks || [];
  const handed = results.multiHandedness || [];
  if (lms.length === 0) return;

  primaryHandRaw = lms[0];

  for (let i = 0; i < lms.length; i += 1) {
    const lm = lms[i];
    const label = handed[i]?.label;
    if (label === 'Left') handRawL = lm;
    else if (label === 'Right') handRawR = lm;
  }

  if (!handRawL && !handRawR && lms.length >= 2) {
    const w0 = lms[0][0].x;
    const w1 = lms[1][0].x;
    if (w0 < w1) {
      handRawR = lms[0];
      handRawL = lms[1];
    } else {
      handRawR = lms[1];
      handRawL = lms[0];
    }
  } else if (!handRawL && lms.length === 1) {
    handRawR = lms[0];
  }
}

hands.onResults((results) => {
  if (!gotFirstResults) {
    gotFirstResults = true;
    loadingEl.style.display = 'none';
  }

  const lms = results.multiHandLandmarks || [];
  const handed = results.multiHandedness || [];

  if (lms.length > 0) {
    handDetected = true;
    assignLR(results);

    const raised = isTwoHandsRaised(lms);
    if (handleGiantHold(raised)) {
      gestureQueue.length = 0;
      return;
    }

    if (isUltComboAttackWall(lms)) {
      gestureQueue.length = 0;
      commitGesture(GESTURE.SHAKA);
      return;
    }

    const twoHand = detectTwoHandsGesture(lms, handed);

    const g = twoHand || detectGestureSingle(lms[0]);

    gestureQueue.push(g);
    if (gestureQueue.length > STABLE_FRAMES) gestureQueue.shift();

    if (gestureQueue.length === STABLE_FRAMES) {
      const same = gestureQueue.every((x) => x === gestureQueue[0]);
      if (same && gestureQueue[0]) commitGesture(gestureQueue[0]);
    }
  } else {
    handleGiantHold(false);
    handDetected = false;
    handRawL = null;
    handRawR = null;
    primaryHandRaw = null;
    gestureQueue.length = 0;
    stopAimStream();
  }
});

async function startCameraManually() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Trình duyệt không hỗ trợ getUserMedia');
    }

    loadingEl.style.display = 'block';
    loadingEl.innerHTML = 'Đang mở camera...';

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();

    loadingEl.innerHTML = 'Đang nhận diện bàn tay...';

    let busy = false;
    async function frameLoop() {
      try {
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
  } catch (err) {
    let msg = 'Không mở được camera. ';
    if (err.name === 'NotAllowedError') msg += 'Bạn đã chặn quyền camera.';
    else if (err.name === 'NotFoundError') msg += 'Không tìm thấy camera.';
    else if (err.name === 'NotReadableError') msg += 'Camera đang bị app khác dùng.';
    else msg += `Lỗi: ${err.name || err.message || err}`;

    loadingEl.style.display = 'block';
    loadingEl.innerHTML =
      msg +
      '<br/>' +
      'Mẹo: vào <b>Site settings → Camera → Allow</b>,<br/>' +
      'và mở bằng <b>https</b> hoặc <b>http://localhost</b>.';
    startBtn.style.display = 'block';
  }
}

startBtn.addEventListener('click', () => {
  startBtn.style.display = 'none';
  startCameraManually();
});

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'q') commitGesture(GESTURE.LOTUS);
  if (k === 'w') commitGesture(GESTURE.SPHERE);
  if (k === 'e') commitGesture(GESTURE.ATTACK);
  if (k === 'r') commitGesture(GESTURE.WALL);
  if (k === 't') commitGesture(GESTURE.SPIN);
  if (k === 'y') commitGesture(GESTURE.GIANT);
  if (k === 'u') commitGesture(GESTURE.FAN);
  if (k === 'i') commitGesture(GESTURE.SHAKA);
});
