import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    constructor() {
      this.onload = null;
      this.onloadend = null;
      this.onerror = null;
      this.result = null;
    }
    _finish(buffer, blob) {
      this.result = buffer;
      const evt = { target: this };
      if (this.onload) this.onload(evt);
      if (this.onloadend) this.onloadend(evt);
    }
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buffer) => this._finish(buffer, blob))
        .catch((err) => {
          if (this.onerror) this.onerror(err);
        });
    }
    readAsDataURL(blob) {
      blob
        .arrayBuffer()
        .then((buffer) => {
          const base64 = Buffer.from(buffer).toString('base64');
          const dataUrl = `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
          this._finish(dataUrl, blob);
        })
        .catch((err) => {
          if (this.onerror) this.onerror(err);
        });
    }
  };
}

const outPath = path.resolve('public/models/stick_fighter.glb');
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.75,
  metalness: 0.05,
});

function applyBoxUV(geometry, u0, v0, u1, v1) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, u0 + (u1 - u0) * u, v0 + (v1 - v0) * v);
  }
  uv.needsUpdate = true;
}

function makeCapsule(w, h, d, uv) {
  const radius = Math.max(0.05, w / 2);
  const length = Math.max(0.05, h - radius * 2);
  const geo = new THREE.CapsuleGeometry(radius, length, 6, 12);
  if (uv) applyBoxUV(geo, uv[0], uv[1], uv[2], uv[3]);
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.z = d / w;
  return mesh;
}

function makeCylinder(w, h, d, uv, taper = 0.08) {
  const radiusTop = Math.max(0.05, (w / 2) * (1 - taper));
  const radiusBottom = Math.max(0.05, (w / 2) * (1 + taper * 0.6));
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, h, 16, 1);
  if (uv) applyBoxUV(geo, uv[0], uv[1], uv[2], uv[3]);
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.z = d / w;
  return mesh;
}

function makeSphere(w, h, d, uv) {
  const radius = Math.max(0.05, w / 2);
  const geo = new THREE.SphereGeometry(radius, 16, 12);
  if (uv) applyBoxUV(geo, uv[0], uv[1], uv[2], uv[3]);
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.y = h / w;
  mesh.scale.z = d / w;
  return mesh;
}

const root = new THREE.Group();
root.name = 'StickFighterRoot';
const rig = new THREE.Group();
rig.name = 'Rig';
root.add(rig);

// Metrics (total height ~ 15)
const upperLegH = 3.8;
const lowerLegH = 3.6;
const torsoH = 5.2;
const headH = 2.4;
const upperArmH = 3.0;
const lowerArmH = 2.6;

const legW = 1.4;
const legD = 1.4;
const torsoW = 3.6;
const torsoD = 1.8;
const headW = 2.6;
const headD = 2.4;
const armW = 1.1;
const armD = 1.1;

const legTotal = upperLegH + lowerLegH;
const hipY = legTotal;
const torsoCenterY = hipY + torsoH / 2;
const shoulderY = hipY + torsoH - 0.4;

const legX = 1.0;
const shoulderX = torsoW / 2 + armW / 2 + 0.2;

// Torso group
const torso = new THREE.Group();
torso.name = 'Torso';
torso.position.set(0, torsoCenterY, 0);
const torsoMesh = makeCylinder(torsoW, torsoH, torsoD, [0.25, 0.5, 0.5, 1.0]);
torso.add(torsoMesh);
rig.add(torso);

// Head
const head = new THREE.Group();
head.name = 'Head';
head.position.set(0, torsoH / 2 + headH / 2, 0);
const headMesh = makeSphere(headW, headH, headD, [0.0, 0.5, 0.25, 1.0]);
head.add(headMesh);
torso.add(head);

// Arms
function buildArm(side) {
  const sign = side === 'L' ? -1 : 1;
  const arm = new THREE.Group();
  arm.name = side === 'L' ? 'ArmL' : 'ArmR';
  arm.position.set(sign * shoulderX, shoulderY - torsoCenterY, 0);

  const upper = makeCapsule(armW, upperArmH, armD, [0.5, 0.5, 0.75, 1.0]);
  upper.position.set(0, -upperArmH / 2, 0);
  arm.add(upper);

  const forearm = new THREE.Group();
  forearm.name = side === 'L' ? 'ForearmL' : 'ForearmR';
  forearm.position.set(0, -upperArmH, 0);

  const lower = makeCapsule(armW * 0.95, lowerArmH, armD * 0.95, [0.5, 0.5, 0.75, 1.0]);
  lower.position.set(0, -lowerArmH / 2, 0);
  forearm.add(lower);

  if (side === 'R') {
    const hand = new THREE.Group();
    hand.name = 'RightHand';
    hand.position.set(0, -lowerArmH, 0);
    forearm.add(hand);
  }

  arm.add(forearm);
  return arm;
}

torso.add(buildArm('L'));
torso.add(buildArm('R'));

// Legs
function buildLeg(side) {
  const sign = side === 'L' ? -1 : 1;
  const leg = new THREE.Group();
  leg.name = side === 'L' ? 'LegL' : 'LegR';
  leg.position.set(sign * legX, hipY, 0);

  const upper = makeCapsule(legW, upperLegH, legD, [0.75, 0.5, 1.0, 1.0]);
  upper.position.set(0, -upperLegH / 2, 0);
  leg.add(upper);

  const calf = new THREE.Group();
  calf.name = side === 'L' ? 'CalfL' : 'CalfR';
  calf.position.set(0, -upperLegH, 0);

  const lower = makeCapsule(legW * 0.95, lowerLegH, legD * 0.95, [0.75, 0.5, 1.0, 1.0]);
  lower.position.set(0, -lowerLegH / 2, 0);
  calf.add(lower);

  leg.add(calf);
  return leg;
}

rig.add(buildLeg('L'));
rig.add(buildLeg('R'));

const exporter = new GLTFExporter();

const data = await new Promise((resolve, reject) => {
  exporter.parse(
    root,
    (result) => resolve(result),
    (error) => reject(error),
    { binary: true }
  );
});

const buffer = Buffer.from(data);
fs.writeFileSync(outPath, buffer);
console.log('GLB written to', outPath);
