const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

function safeRoom(str) {
  const s = String(str || "demo")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 32);
  return s || "demo";
}

const roomState = new Map();
// room -> { p1: socketId|null, p2: socketId|null, displays:Set<socketId> }

function getOrCreateRoom(room) {
  if (!roomState.has(room)) {
    roomState.set(room, { p1: null, p2: null, displays: new Set() });
  }
  return roomState.get(room);
}

function emitRoster(room) {
  const st = roomState.get(room);
  if (!st) return;
  io.to(room).emit("roster", {
    p1: Boolean(st.p1),
    p2: Boolean(st.p2),
    displayCount: st.displays.size,
  });
}

// token bucket simple rate limit
function makeLimiter({ ratePerSec, burst }) {
  let tokens = burst;
  let last = Date.now();
  return function allow() {
    const now = Date.now();
    const dt = (now - last) / 1000;
    last = now;
    tokens = Math.min(burst, tokens + dt * ratePerSec);
    if (tokens >= 1) {
      tokens -= 1;
      return true;
    }
    return false;
  };
}

function sanitizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
}

io.on("connection", (socket) => {
  socket.data.room = null;
  socket.data.role = null;
  socket.data.player = null;

  // rate limiters (per socket)
  const allowInput = makeLimiter({ ratePerSec: 10, burst: 12 }); // discrete skill
  const allowAim = makeLimiter({ ratePerSec: 25, burst: 30 }); // aim stream

  socket.on("join", ({ room, role, player }) => {
    const r = safeRoom(room);
    const st = getOrCreateRoom(r);

    if (socket.data.room) socket.leave(socket.data.room);

    const normalizedRole = role === "display" ? "display" : "player";
    const p = Number(player) === 2 ? 2 : 1;

    if (normalizedRole === "display") {
      st.displays.add(socket.id);
      socket.data.role = "display";
      socket.data.player = null;
    } else {
      if (p === 1) {
        if (st.p1 && st.p1 !== socket.id) {
          socket.emit("join_error", {
            message: "Player 1 đã có người vào. Hãy chọn Player 2 hoặc đổi room.",
          });
          return;
        }
        st.p1 = socket.id;
      } else {
        if (st.p2 && st.p2 !== socket.id) {
          socket.emit("join_error", {
            message: "Player 2 đã có người vào. Hãy chọn Player 1 hoặc đổi room.",
          });
          return;
        }
        st.p2 = socket.id;
      }
      socket.data.role = "player";
      socket.data.player = p;
    }

    socket.data.room = r;
    socket.join(r);

    socket.emit("joined", {
      room: r,
      role: socket.data.role,
      player: socket.data.player,
    });

    emitRoster(r);

    io.to(r).emit("system", {
      type: "join",
      at: Date.now(),
      role: socket.data.role,
      player: socket.data.player,
    });
  });

  // unified input handler
  function handleInput(payload) {
    const r = socket.data.room;
    if (!r) return;
    if (socket.data.role !== "player") return;
    if (!allowInput()) return;

    const player = socket.data.player;
    if (player !== 1 && player !== 2) return;

    const msg = {
      at: Date.now(),
      room: r,
      player,
      gesture: String(payload?.gesture || "IDLE"),
      skillName: String(payload?.skillName || ""),
      dir:
        payload?.dir && typeof payload.dir === "object"
          ? {
              x: Number(payload.dir.x) || 0,
              y: Number(payload.dir.y) || 0,
              z: Number(payload.dir.z) || 0,
            }
          : { x: 0, y: 0, z: 0 },
    };

    io.to(r).emit("input", msg);
  }

  socket.on("input", handleInput);
  socket.on("skill", handleInput); // backward compat

  socket.on("loadout", (payload) => {
    const r = socket.data.room;
    if (!r) return;
    if (socket.data.role !== "player") return;
    const player = socket.data.player;
    if (player !== 1 && player !== 2) return;

    const loadout = {
      skin: sanitizeKey(payload?.skin),
      swordType: sanitizeKey(payload?.swordType),
      swordSkin: sanitizeKey(payload?.swordSkin),
    };

    io.to(r).emit("loadout", {
      at: Date.now(),
      room: r,
      player,
      loadout,
    });
  });

  socket.on("aim", (payload) => {
    const r = socket.data.room;
    if (!r) return;
    if (socket.data.role !== "player") return;
    if (!allowAim()) return;

    const player = socket.data.player;
    if (player !== 1 && player !== 2) return;

    const dir =
      payload?.dir && typeof payload.dir === "object"
        ? {
            x: Number(payload.dir.x) || 0,
            y: Number(payload.dir.y) || 0,
            z: Number(payload.dir.z) || 0,
          }
        : { x: 0, y: 0, z: 0 };

    io.to(r).emit("aim", {
      at: Date.now(),
      room: r,
      player,
      dir,
    });
  });

  socket.on("disconnect", () => {
    const r = socket.data.room;
    if (!r) return;
    const st = roomState.get(r);
    if (!st) return;

    if (st.p1 === socket.id) st.p1 = null;
    if (st.p2 === socket.id) st.p2 = null;
    st.displays.delete(socket.id);

    emitRoster(r);

    io.to(r).emit("system", {
      type: "leave",
      at: Date.now(),
      role: socket.data.role,
      player: socket.data.player,
    });

    if (!st.p1 && !st.p2 && st.displays.size === 0) {
      roomState.delete(r);
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
