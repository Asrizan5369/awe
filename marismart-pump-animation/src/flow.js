// Conceptual flow overlay. Particles travel only along the pipe centre-lines
// defined in model.js, between the external connection faces. They never
// enter the motor, coupling, guard, gauge, pump interior or cooling-module
// interior: at each equipment face they shrink to nothing (the equipment is
// opaque and its internal path is unverified).

import * as THREE from 'three';
import { PATHS, PIPE_R } from './model.js';

export function buildPaths() {
  const P = PATHS.upper;
  const upper = new THREE.CurvePath();
  upper.add(new THREE.LineCurve3(new THREE.Vector3(P.riserX, P.yStart, 0), new THREE.Vector3(P.riserX, P.yElbow, 0)));
  const c = new THREE.Vector3(P.riserX + P.bendR, P.yElbow, 0);
  upper.add(
    new THREE.CubicBezierCurve3(
      new THREE.Vector3(P.riserX, P.yElbow, 0),
      new THREE.Vector3(P.riserX, P.yElbow + P.bendR * 0.5523, 0),
      new THREE.Vector3(c.x - P.bendR * 0.4477, P.yRun, 0),
      new THREE.Vector3(c.x, P.yRun, 0)
    )
  );
  upper.add(new THREE.LineCurve3(new THREE.Vector3(c.x, P.yRun, 0), new THREE.Vector3(P.xEnd, P.yRun, 0)));

  const L = PATHS.lower;
  const lower = new THREE.CurvePath();
  lower.add(new THREE.LineCurve3(new THREE.Vector3(L.xStart, L.y, 0), new THREE.Vector3(L.xEnd, L.y, 0)));
  return { upper, lower };
}

const PARTICLE_R = PIPE_R * 0.42;
const SPACING = 0.32; // model units between particles
const SPEED = 0.55; // model units per second of video (illustrative only)

export function buildFlow() {
  const paths = buildPaths();
  const root = new THREE.Group();
  root.name = 'FlowOverlay_Conceptual';
  const pmat = new THREE.MeshBasicMaterial({ color: 0x00a3a3, transparent: true });
  const amat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
  const lines = [];
  for (const [key, path] of Object.entries(paths)) {
    const len = path.getLength();
    const n = Math.floor(len / SPACING);
    const spacing = len / n; // exact cycle = path length, so wrap occurs only at zero scale
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(PARTICLE_R, 12, 8), pmat, n);
    inst.name = 'FlowParticles_' + key;
    root.add(inst);
    // Static direction arrows as in the reference (white chevrons on the pipe run).
    const arrows = [];
    const arrowAt = key === 'upper' ? [0.62] : [0.45];
    for (const u of arrowAt) {
      const g = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 3), amat);
      cone.rotation.z = -Math.PI / 2; // tip along +X of group
      g.add(cone);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.07), amat);
      tail.position.x = -0.3;
      g.add(tail);
      const p = path.getPointAt(u);
      const tan = path.getTangentAt(u);
      g.position.copy(p).add(new THREE.Vector3(0, 0, PIPE_R + 0.09)); // just in front of the pipe wall
      g.rotation.z = Math.atan2(tan.y, tan.x);
      g.name = 'FlowArrow_' + key;
      root.add(g);
      arrows.push(g);
    }
    lines.push({ key, path, len, n, spacing, inst, arrows });
  }
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();

  function update(time, opacity, running) {
    pmat.opacity = opacity;
    amat.opacity = opacity;
    root.visible = opacity > 0.001;
    for (const L of lines) {
      for (let i = 0; i < L.n; i++) {
        // Monotonic forward travel; wrap happens only where particles are at zero scale.
        const d = (i * L.spacing + (running ? time * SPEED : 0)) % L.len;
        const u = Math.min(1, d / L.len);
        const p = L.path.getPointAt(u);
        const edge = Math.min(d, L.len - d);
        // zero-scale band (0.05) is wider than one frame of travel, so no visible jump at wrap
        const k = running ? THREE.MathUtils.clamp((edge - 0.05) / 0.25, 0, 1) : 0;
        s.setScalar(k);
        m.compose(p, q, s);
        L.inst.setMatrixAt(i, m);
      }
      L.inst.instanceMatrix.needsUpdate = true;
    }
  }
  return { root, update, paths, lines, PARTICLE_R };
}
