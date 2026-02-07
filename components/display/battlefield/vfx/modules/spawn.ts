export function spawnSlash(vfx: any, pos: any, colorHex: number, yRot = 0) {
  const THREE = window.THREE;
  let mesh = vfx._pool?.slashes?.pop();
  if (!mesh) {
    const geo = new THREE.RingGeometry(3.5, 5.2, 44, 1, 0, Math.PI * 1.25);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    mesh = new THREE.Mesh(geo, mat);
  } else {
    mesh.material.color.setHex(colorHex);
    mesh.material.opacity = 0.45;
  }
  mesh.position.copy(pos);
  mesh.rotation.x = Math.PI / 2;
  mesh.rotation.y = yRot;
  mesh.rotation.z = Math.random() * 0.8;
  mesh.scale.setScalar(1);
  mesh.visible = true;
  mesh.userData = { life: 0.2, t: 0 };
  vfx.scene.add(mesh);
  vfx.slashes.push(mesh);
}

export function spawnShockwave(
  vfx: any,
  pos: any,
  colorHex: number,
  start = 2.0,
  end = 18.0,
  life = 0.28,
) {
  const THREE = window.THREE;
  let mesh = vfx._pool?.shockwaves?.pop();
  if (!mesh) {
    const geo = new THREE.RingGeometry(1.0, 1.6, 72);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    mesh = new THREE.Mesh(geo, mat);
  } else {
    mesh.material.color.setHex(colorHex);
    mesh.material.opacity = 0.3;
  }
  mesh.position.copy(pos);
  mesh.position.y = Math.max(mesh.position.y, 0.2);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData = { t: 0, life, start, end };
  mesh.scale.setScalar(start);
  mesh.visible = true;
  vfx.scene.add(mesh);
  vfx.shockwaves.push(mesh);
}

export function spawnSparks(
  vfx: any,
  pos: any,
  colorHex: number,
  count = 16,
  life = 0.22,
  speed = 14,
) {
  const THREE = window.THREE;
  if (!vfx._pool?.sparks) {
    vfx._pool = vfx._pool || {};
    vfx._pool.sparks = new Map();
  }

  const pool = vfx._pool.sparks.get(count) || [];
  let pts = pool.pop();
  if (!vfx._pool.sparks.has(count)) {
    vfx._pool.sparks.set(count, pool);
  }

  let geo;
  let positions;
  let velocities;
  if (!pts) {
    geo = new THREE.BufferGeometry();
    positions = new Float32Array(count * 3);
    velocities = new Float32Array(count * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.8,
      map: vfx.glowTex,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: colorHex,
    });

    pts = new THREE.Points(geo, mat);
  } else {
    geo = pts.geometry;
    positions = geo.getAttribute("position").array;
    velocities = geo.getAttribute("velocity").array;
    pts.material.color.setHex(colorHex);
    pts.material.opacity = 0.6;
    pts.scale.set(1, 1, 1);
  }

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    const a = Math.random() * Math.PI * 2;
    const u = Math.random();
    const s = (0.35 + 0.65 * u) * speed;

    velocities[i * 3 + 0] = Math.cos(a) * s * (0.7 + Math.random() * 0.6);
    velocities[i * 3 + 1] = (0.7 + Math.random() * 1.2) * s;
    velocities[i * 3 + 2] = Math.sin(a) * s * (0.7 + Math.random() * 0.6);
  }

  const posAttr = geo.getAttribute("position");
  const velAttr = geo.getAttribute("velocity");
  posAttr.needsUpdate = true;
  velAttr.needsUpdate = true;
  pts.position.copy(pos);
  pts.userData = { t: 0, life, gravity: 28 };
  pts.visible = true;
  vfx.scene.add(pts);
  vfx.sparkBursts.push(pts);
}

export function spawnBurstAt(
  vfx: any,
  pos: any,
  colorHex: number,
  scale = 1,
) {
  const THREE = window.THREE;
  let s = vfx._pool?.bursts?.pop();
  if (!s) {
    s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: vfx.glowTex,
        color: colorHex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
  } else {
    s.material.color.setHex(colorHex);
    s.material.opacity = 0.55;
  }
  s.scale.set(10 * scale, 10 * scale, 1);
  s.position.copy(pos);
  s.userData = { life: 0.24, t: 0 };
  s.visible = true;
  vfx.scene.add(s);
  vfx.bursts.push(s);

  spawnShockwave(vfx, pos, colorHex, 1.2 * scale, 14 * scale, 0.26);
  spawnSparks(vfx, pos, colorHex, Math.round(14 * scale), 0.22, 12 + 8 * scale);
}

export function spawnLightRays(
  vfx: any,
  pos: any,
  colorHex: number,
  count = 10,
  length = 12,
  life = 0.28,
  speed = 18,
  width = 0.5,
  explodeScale = 1.6,
  explodeYOffset = 0.8,
  downBias = 0,
) {
  const THREE = window.THREE;
  if (!vfx.rays) vfx.rays = [];
  vfx._pool = vfx._pool || {};
  vfx._pool.rays = vfx._pool.rays || [];
  if (!vfx._rayBatches) vfx._rayBatches = new Map();
  vfx._rayBatchId = (vfx._rayBatchId ?? 0) + 1;
  const batchId = vfx._rayBatchId;
  const burstOrigin = pos.clone();
  burstOrigin.y += explodeYOffset;
  vfx._rayBatches.set(batchId, { burst: false, origin: burstOrigin, colorHex, scale: explodeScale });

  for (let i = 0; i < count; i++) {
    let mesh = vfx._pool.rays.pop();
    if (!mesh) {
      const geo = new THREE.PlaneGeometry(width, length);
      geo.translate(0, length / 2, 0);
      const mat = new THREE.MeshBasicMaterial({
        map: vfx.glowTex,
        color: colorHex,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      mesh = new THREE.Mesh(geo, mat);
    } else {
      mesh.material.color.setHex(colorHex);
      mesh.material.opacity = 0.65;
    }

    const theta = Math.random() * Math.PI * 2;
    const y = -0.45 + Math.random() * 0.6; // bias downward, avoid too much up
    const h = Math.sqrt(Math.max(0.0001, 1 - y * y));
    const dir = new THREE.Vector3(
      Math.cos(theta) * h,
      y,
      Math.sin(theta) * h,
    ).normalize();

    mesh.position.copy(pos);
    mesh.visible = true;
    if (typeof vfx._alignMeshYToDir === "function") {
      vfx._alignMeshYToDir(mesh, dir);
    }
    mesh.userData = { t: 0, life, dir, speed, batchId, downBias };

    vfx.scene.add(mesh);
    vfx.rays.push(mesh);
  }
}

export function spawnMagicCircle(
  vfx: any,
  pos: any,
  colorHex: number,
  scale = 1,
  life = 0.8,
  rotSpeed = 2.2,
) {
  const THREE = window.THREE;
  const size = 26 * scale;

  const mat = new THREE.MeshBasicMaterial({
    map: vfx.glowTex,
    color: colorHex,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.position.copy(pos);
  mesh.position.y = Math.max(mesh.position.y, 0.55);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData = { t: 0, life, rotSpeed, base: size };
  vfx.scene.add(mesh);
  vfx.magicCircles.push(mesh);
  return mesh;
}
