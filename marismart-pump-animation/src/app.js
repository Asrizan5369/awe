import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildModel, AXIS_Y, PIPE_R } from './model.js';
import { buildFlow } from './flow.js';
import { stateAt, durationOf, EXPLODE_ORDER, activeMover, ease, TIMING } from './timeline.js';
import { TECHNICAL, ILLUSTRATIVE_REV_PER_SECOND, CLIPS, FPS, INSPECTION_STEPS } from './config.js';

const W = 1920, H = 1080;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef1f4);
scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c0c8, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(6, 12, 9);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, 0.5);
fill.position.set(-8, 4, -6);
scene.add(fill);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: 0xe1e5ea, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.001;
scene.add(floor);

// One fixed, declared camera for all clips (no camera moves).
const camera = new THREE.PerspectiveCamera(27, W / H, 0.1, 200);
camera.position.set(4.2, 8.2, 19.5);
camera.lookAt(0.55, 2.0, -0.2);

const { root, groups, rotating } = buildModel();
scene.add(root);
const flow = buildFlow();
scene.add(flow.root);

// Remember assembled transforms; exploded = assembled + explode offset (pure translation).
const home = {};
for (const [k, g] of Object.entries(groups)) home[k] = g.position.clone();

// Overlay materials for clip 3 (guard and pipes become see-through teaching overlays).
const overlayMats = [];
function collectOverlay(g) {
  g.traverse((o) => {
    if (o.isMesh) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.userData.baseOpacity = 1;
      overlayMats.push({ group: g.name, mat: o.material, mesh: o });
    }
  });
}
collectOverlay(groups.guard);
collectOverlay(groups.up);
collectOverlay(groups.lo);

// Per-group materials for the Clip 4 focus highlight (shared cache must not leak a highlight).
const focusMats = {};
for (const S of INSPECTION_STEPS) {
  focusMats[S.k] = [];
  groups[S.k].traverse((o) => {
    if (o.isMesh) { o.material = o.material.clone(); focusMats[S.k].push(o.material); }
  });
}
const HIGHLIGHT = new THREE.Color(0xffffff); // neutral lift: preserves the supplied hues

// Clip 4 inspection card, leader line and progress strip.
const card = document.getElementById('card');
const leader = document.getElementById('leader');
const progress = document.getElementById('progress');
progress.innerHTML = INSPECTION_STEPS.map((S) => `<div class="step" style="--c:${S.color}"><span class="tag" style="background:${S.color}">${S.tag}</span>${S.title}<span class="tick">✓</span></div>`).join('');

// ------------------------------------------------------------------ overlays
const labelsEl = document.getElementById('labels');
const LABELS = [
  { k: 'motor', text: 'Drive (motor)', tag: '01', color: '#1f5fb8' },
  { k: 'pump', text: 'Pump', tag: '02', color: '#2e9b4f' },
  { k: 'gauge', text: 'Pressure indicator', tag: '03', color: '#d23b33' },
  { k: 'cool', text: 'Cooling module', tag: '04', color: '#f08a00' },
  { k: 'rec', text: 'Record & handover', tag: '05', color: '#6a3fb5' },
  { k: 'guard', text: 'Coupling guard', tag: 'G', color: '#b08d00' },
  { k: 'up', text: 'Upper pipe section', tag: 'P1', color: '#2f6fd0' },
  { k: 'lo', text: 'Lower pipe section', tag: 'P2', color: '#d23b33' },
];
for (const L of LABELS) {
  const el = document.createElement('div');
  el.className = 'label';
  el.innerHTML = `<span class="tag" style="background:${L.color}">${L.tag}</span><span>${L.text}</span>`;
  labelsEl.appendChild(el);
  L.el = el;
  L.anchor = groups[L.k].children.find((c) => c.userData.isAnchor);
}
const notes = {
  pump: mkNote('Pump interior opaque — internal flow path and port duties not verified'),
  cool: mkNote('Cooling-module passages opaque — internal flow path not verified'),
  guard: mkNote('Guard remains installed — shown transparent as a teaching overlay'),
  gauge: mkNote('Indicator connected via tapping (not a through-flow component). Needle static: no validated data'),
};
function mkNote(text) {
  const el = document.createElement('div');
  el.className = 'note';
  el.textContent = text;
  labelsEl.appendChild(el);
  return el;
}

const v = new THREE.Vector3();
function project(obj, dx = 0, dy = 0, dz = 0) {
  obj.getWorldPosition(v);
  v.x += dx; v.y += dy; v.z += dz;
  v.project(camera);
  return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H };
}
function place(el, p, show) {
  el.style.display = show ? 'flex' : 'none';
  el.style.left = p.x + 'px';
  el.style.top = p.y + 'px';
}

// -------------------------------------------------------------------- state
function rotationAllowed() {
  return TECHNICAL.rotationDirection === 'CW' || TECHNICAL.rotationDirection === 'CCW';
}

function applyState(st, doRender = true) {
  for (const k of EXPLODE_ORDER) {
    const g = groups[k];
    const off = g.userData.explode;
    const f = st.explode[k] || 0;
    g.position.set(home[k].x + off[0] * f, home[k].y + off[1] * f, home[k].z + off[2] * f);
  }
  // Directly coupled shafts: ONE angle, applied identically to both assemblies.
  let angle = 0;
  if (st.shaftsRotating && rotationAllowed()) {
    // Viewing convention: from motor NDE looking along +X. Right-hand rule about +X
    // appears clockwise from that viewpoint, so CW => positive angle.
    const sign = TECHNICAL.rotationDirection === 'CW' ? 1 : -1;
    angle = sign * 2 * Math.PI * ILLUSTRATIVE_REV_PER_SECOND * (st.t - 2.0);
  }
  for (const r of rotating) r.rotation.set(angle, 0, 0);

  for (const o of overlayMats) {
    const amt = o.group === 'CouplingGuard' ? st.guardOverlay * 0.72 : st.pipeOverlay * 0.55;
    o.mat.opacity = 1 - amt;
    o.mat.depthWrite = amt < 0.01;
  }
  flow.update(st.t, st.flowOpacity, st.flowRunning);

  for (const S of INSPECTION_STEPS) {
    const a = st.focus === S.k ? 0.22 * st.focusAmount : 0;
    for (const m of focusMats[S.k]) { m.emissive.copy(HIGHLIGHT); m.emissiveIntensity = a; }
  }

  // HUD
  document.getElementById('clipname').textContent = CLIPS[st.clip].name;
  document.getElementById('status').textContent = st.status;
  document.getElementById('caption').textContent = st.caption;
  const extra = [];
  if (st.clip === 3) {
    if (rotationAllowed()) {
      extra.push(`Shaft rotation: ${TECHNICAL.rotationDirection} — ${TECHNICAL.rotationViewConvention} (source: ${TECHNICAL.technicalSource?.document ?? 'not recorded'})`);
      extra.push('Animation slowed for learning — not actual operating speed.');
    } else {
      extra.push('Shaft rotation not shown: approved rotation direction and viewing convention have not been supplied.');
    }
    extra.push('Flow colours/arrows are a conceptual overlay; pipe colours do not prove fluid temperatures. No operating values shown.');
  } else if (st.clip === 4) {
    extra.push('Text from the reference illustration. No limits, values or OEM inspection intervals are supplied or implied.');
  } else {
    extra.push('Unverified from the image: pump type & internals, rotation direction, port duties, cooler passages, OEM sequence, operating values.');
  }
  document.getElementById('extra').innerHTML = extra.map((x) => `<div>${x}</div>`).join('');

  scene.updateMatrixWorld(true);
  const mover = activeMover(st.explode);
  const anyExploded = EXPLODE_ORDER.some((k) => st.explode[k] > 0.001);
  for (const L of LABELS) {
    const p = project(L.anchor);
    // Pipes/guard labelled when displaced or moving; main five always labelled.
    const isMain = ['01', '02', '03', '04', '05'].includes(L.tag);
    const show = isMain || anyExploded || L.k === mover;
    place(L.el, p, show);
    L.el.classList.toggle('active', L.k === mover);
    const focused = st.clip === 4 && L.k === st.focus;
    L.el.classList.toggle('focus', focused);
    L.el.style.setProperty('--c', L.color);
  }
  // Clip 4 card + leader line from card to the focused component.
  const step = st.clip === 4 && st.focus ? INSPECTION_STEPS[st.focusIndex] : null;
  card.style.display = step ? 'block' : 'none';
  leader.style.display = 'none'; // leader removed: it crossed other components
  progress.style.display = st.clip === 4 ? 'flex' : 'none';
  if (step) {
    card.style.opacity = st.focusAmount;
    card.style.setProperty('--c', step.color);
    card.innerHTML = `<div class="card-h"><span class="tag" style="background:${step.color}">${step.tag}</span>${step.title}</div>
      <div class="card-k">Function</div><div class="card-v">${step.fn}</div>
      <div class="card-k">Inspection learning purpose</div><div class="card-v">${step.purpose}</div>`;
    const L = LABELS.find((x) => x.k === step.k);
    const p = project(L.anchor);
    const line = leader.querySelector('line');
    line.setAttribute('x1', 44 + 600); line.setAttribute('y1', 300);
    line.setAttribute('x2', p.x); line.setAttribute('y2', p.y);
    line.setAttribute('stroke', step.color);
    leader.style.opacity = st.focusAmount;
  }
  if (st.clip === 4) {
    progress.querySelectorAll('.step').forEach((el, i) => {
      el.classList.toggle('done', i < st.completed);
      el.classList.toggle('now', i === st.focusIndex && st.focus);
    });
    const sum = document.getElementById('summary');
    sum.style.display = st.summary > 0 ? 'block' : 'none';
    sum.style.opacity = st.summary;
  } else document.getElementById('summary').style.display = 'none';
  place(notes.pump, project(groups.pump.children.find((c) => c.name === 'Pump_Casing'), 0, -0.95, 0.8), st.clip === 3);
  place(notes.cool, project(groups.cool.children.find((c) => c.name === 'CoolingModule_HeaderBottom'), 0.2, -0.75, 0.8), st.clip === 3);
  place(notes.guard, project(groups.guard.children.find((c) => c.name === 'CouplingGuard_Top'), -1.6, -2.15, 1.6), st.clip === 3 && st.guardOverlay > 0.5);
  place(notes.gauge, project(groups.gauge.children.find((c) => c.userData.isAnchor), -3.3, -0.2, 0), st.clip === 3);

  if (doRender) renderer.render(scene, camera);
}

window.renderAt = (clip, t) => applyState(stateAt(clip, t));

// --------------------------------------------------------------- verification
// Frame-by-frame automated checks, run before delivery. Returns a report object.
window.verify = () => {
  const report = { generated: new Date().toISOString(), checks: [], failures: [] };
  const fail = (m) => report.failures.push(m);
  const ok = (name, detail) => report.checks.push({ name, detail });
  const tol = 0.004;

  const meshBoxes = (g) => {
    const out = [];
    g.updateMatrixWorld(true);
    g.traverse((o) => { if (o.isMesh) out.push({ name: o.name, box: new THREE.Box3().setFromObject(o).expandByScalar(-tol) }); });
    return out;
  };
  const allKeys = Object.keys(groups);

  // 1. Collision sweep, every frame of Clip 1 (and therefore Clip 2, its exact reverse).
  const frames1 = Math.round(durationOf(1) * FPS);
  let collisions = 0, pairsTested = 0;
  const seen = new Set();
  for (let f = 0; f <= frames1; f++) {
    const st = stateAt(1, f / FPS);
    applyState(st, false);
    const mover = activeMover(st.explode);
    if (!mover) continue;
    const mb = meshBoxes(groups[mover]);
    for (const other of allKeys) {
      if (other === mover) continue;
      for (const ob of meshBoxes(groups[other])) {
        for (const a of mb) {
          pairsTested++;
          // Box tests are conservative for round parts; only report true overlaps of
          // part bounding boxes that are not the designed face contacts.
          if (a.box.intersectsBox(ob.box)) {
            const key = `${a.name} x ${ob.name}`;
            if (!seen.has(key)) { seen.add(key); fail(`Clip 1 frame ${f}: bounding-box overlap ${key}`); }
            collisions++;
          }
        }
      }
    }
  }
  ok('Collision sweep (mesh bounding boxes, every frame of Clip 1; Clip 2 is its exact reverse)', { frames: frames1 + 1, pairsTested, collisions });

  // 2. Clip 2 is the exact reverse of Clip 1.
  let maxRevErr = 0;
  const span = TIMING.MOVE_END - TIMING.MOVE_START;
  for (let f = 0; f <= Math.round(span * FPS); f++) {
    const tau = f / FPS;
    const a = stateAt(2, TIMING.REASSEMBLY_START + tau).explode;
    const b = stateAt(1, TIMING.MOVE_END - tau).explode;
    for (const k of EXPLODE_ORDER) maxRevErr = Math.max(maxRevErr, Math.abs(a[k] - b[k]));
  }
  if (maxRevErr > 1e-9) fail('Clip 2 is not the exact reverse of Clip 1');
  ok('Clip 2 reverses Clip 1 trajectories', { maxFractionError: maxRevErr });

  // 3. Start/end frame continuity.
  const end1 = stateAt(1, durationOf(1)).explode, start2 = stateAt(2, 0).explode;
  const cont = EXPLODE_ORDER.every((k) => end1[k] === 1 && start2[k] === 1);
  if (!cont) fail('Clip 2 does not start from Clip 1 final exploded state');
  ok('Clip 2 first frame equals Clip 1 final geometry', { allExploded: cont });

  // 4. Complete reassembly before operation; positions identical to the reference layout.
  applyState(stateAt(2, durationOf(2)), false);
  let maxPosErr = 0;
  for (const k of allKeys) maxPosErr = Math.max(maxPosErr, groups[k].position.distanceTo(home[k]));
  if (maxPosErr > 1e-9) fail('Reassembly does not return every component to its original position');
  applyState(stateAt(3, 0), false);
  const pos3 = Math.max(...allKeys.map((k) => groups[k].position.distanceTo(home[k])));
  if (pos3 > 1e-9) fail('Clip 3 does not begin fully assembled');
  ok('Complete reassembly; Clip 3 starts assembled with guard installed', { maxPosErrEndClip2: maxPosErr, maxPosErrClip3: pos3 });

  // 5. Shaft alignment: motor and pump rotating assemblies coaxial on one axis.
  const [ms, ps] = rotating.map((r) => r.getWorldPosition(new THREE.Vector3()));
  const coaxErr = Math.hypot(ms.y - ps.y, ms.z - ps.z);
  if (coaxErr > 1e-9 || Math.abs(ms.y - AXIS_Y) > 1e-9) fail('Motor and pump shafts not coaxial');
  ok('Motor and pump shafts share one coupling axis (assembled)', { coaxialErr: coaxErr, axisY: AXIS_Y });

  // 6. Rotation consistency: same angle, same sign, both assemblies, every Clip 3 frame.
  const frames3 = Math.round(durationOf(3) * FPS);
  let rotMismatch = 0, anyRotation = false;
  for (let f = 0; f <= frames3; f++) {
    applyState(stateAt(3, f / FPS), false);
    if (rotating[0].rotation.x !== rotating[1].rotation.x) rotMismatch++;
    if (rotating[0].rotation.x !== 0) anyRotation = true;
    if (rotating[0].rotation.y || rotating[0].rotation.z || rotating[1].rotation.y || rotating[1].rotation.z) rotMismatch++;
  }
  if (rotMismatch) fail('Directly coupled shafts disagree in rotation');
  if (anyRotation && !rotationAllowed()) fail('Rotation rendered without an approved direction');
  ok('Directly coupled shafts: identical angle and direction every frame', { rotMismatch, rotationRendered: anyRotation, approvedDirection: TECHNICAL.rotationDirection });

  // 7. Housings, guard, pipes, gauge, cooler, base stationary in Clips 3 and 4.
  let moved = 0;
  const frames4 = Math.round(durationOf(4) * FPS);
  const frames34 = [...Array(frames3 + 1).keys()].map((f) => [3, f]).concat([...Array(frames4 + 1).keys()].map((f) => [4, f]));
  for (const [c, f] of frames34) {
    applyState(stateAt(c, f / FPS), false);
    for (const r of rotating) if (r.rotation.x) moved++;
    for (const k of allKeys) if (groups[k].position.distanceTo(home[k]) > 0 || groups[k].rotation.x || groups[k].rotation.y || groups[k].rotation.z) moved++;
  }
  if (moved) fail('A stationary component moved in Clip 3');
  ok('Stationary parts remain stationary in Clips 3 and 4 (and no rotation in Clip 4)', { violations: moved });

  // 7b. Clip 4: every inspection step shown once, in order 01..05, no flow or motion.
  const order = [];
  let flowShown = 0;
  for (let f = 0; f <= frames4; f++) {
    const st = stateAt(4, f / FPS);
    if (st.focus && order[order.length - 1] !== st.focus) order.push(st.focus);
    if (st.flowOpacity > 0 || st.flowRunning) flowShown++;
  }
  const expected = INSPECTION_STEPS.map((S) => S.k);
  if (JSON.stringify(order) !== JSON.stringify(expected)) fail('Clip 4 inspection order incorrect: ' + order.join(','));
  if (flowShown) fail('Flow shown in Clip 4');
  ok('Clip 4 walkthrough order 01→05, each once; no flow, no motion', { order, flowShown });

  // 8. Flow particles: inside pipe bore, monotonic direction, matching reference arrows.
  let outside = 0, reversed = 0;
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const prevX = {};
  for (let f = 0; f <= frames3; f++) {
    const st = stateAt(3, f / FPS);
    applyState(st, false);
    for (const L of flow.lines) {
      for (let i = 0; i < L.n; i++) {
        L.inst.getMatrixAt(i, m); m.decompose(p, q, s);
        if (s.x === 0) { prevX[L.key + i] = undefined; continue; }
        // nearest distance to centre-line
        let best = Infinity;
        for (let k = 0; k <= 400; k++) best = Math.min(best, L.path.getPointAt(k / 400).distanceTo(p));
        if (best + flow.PARTICLE_R * s.x > PIPE_R + 0.006) outside++;
        const key = L.key + i;
        if (prevX[key] !== undefined) {
          const dx = p.x - prevX[key].x, dy = p.y - prevX[key].y;
          // upper: up the riser then left->right; lower: right->left
          if (L.key === 'upper' && (dx < -1e-6 || dy < -1e-6)) reversed++;
          if (L.key === 'lower' && dx > 1e-6) reversed++;
        }
        prevX[key] = p.clone();
      }
    }
  }
  if (outside) fail(`${outside} particle samples outside the pipe bore`);
  if (reversed) fail(`${reversed} particle reversals/teleports`);
  ok('Flow particles inside pipe bore, no reversal or teleport; upper L→R, lower R→L', { outside, reversed });

  // 9. Flow arrows match reference directions.
  const arrowDir = (key) => flow.root.children.find((c) => c.name === 'FlowArrow_' + key).rotation.z;
  const upOK = Math.abs(arrowDir('upper')) < 1e-6, loOK = Math.abs(Math.abs(arrowDir('lower')) - Math.PI) < 1e-6;
  if (!upOK || !loOK) fail('Flow arrows do not match the reference');
  ok('Reference arrows: upper pipe left→right, lower pipe right→left', { upOK, loOK });

  report.pass = report.failures.length === 0;
  return report;
};

// ---------------------------------------------------------------- GLB export
window.exportGLB = async () => {
  // Export geometry only (no flow overlay, no HUD). Translation tracks for
  // Clips 1 and 2. No rotation track: direction is unverified.
  const exportRoot = root.clone(true);
  for (const k of EXPLODE_ORDER) exportRoot.getObjectByName(groups[k].name).position.copy(home[k]);
  exportRoot.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = false; o.material.opacity = 1; } });
  exportRoot.userData.unverified = TECHNICAL.unknowns;
  exportRoot.userData.rotationTrack = 'omitted — approved rotation direction not supplied';

  const mkClip = (name, reverse) => {
    const tracks = [];
    EXPLODE_ORDER.forEach((k, i) => {
      const g = groups[k];
      const off = g.userData.explode;
      const s0 = TIMING.MOVE_START + i * (TIMING.MOVE_EACH + TIMING.MOVE_GAP);
      const times = [0], vals = [];
      const pushV = (f) => vals.push(home[k].x + off[0] * f, home[k].y + off[1] * f, home[k].z + off[2] * f);
      pushV(reverse ? 1 : 0);
      for (let j = 0; j <= 12; j++) {
        const t1 = s0 + (j / 12) * TIMING.MOVE_EACH;
        const f = ease(j / 12);
        const t = reverse ? TIMING.REASSEMBLY_START + (TIMING.MOVE_END - t1) : t1;
        times.push(t);
        pushV(reverse ? f : f);
      }
      if (reverse) {
        // times descend when reversed; sort pairs ascending
        const pairs = times.map((t, idx) => [t, vals.slice(idx * 3, idx * 3 + 3)]).sort((a, b) => a[0] - b[0]);
        times.length = 0; vals.length = 0;
        for (const [t, vv] of pairs) { times.push(t); vals.push(...vv); }
      }
      tracks.push(new THREE.VectorKeyframeTrack(`${g.name}.position`, times, vals, THREE.InterpolateLinear));
    });
    return new THREE.AnimationClip(name, -1, tracks);
  };
  const clips = [mkClip('Clip1_ConceptualDisassembly', false), mkClip('Clip2_ConceptualReassembly', true)];
  const exporter = new GLTFExporter();
  const buf = await exporter.parseAsync(exportRoot, { binary: true, animations: clips });
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

// ------------------------------------------------------- interactive viewer
const params = new URLSearchParams(location.search);
if (params.get('mode') !== 'render') {
  document.body.classList.add('viewer');
  const sel = document.getElementById('clipSel');
  const scrub = document.getElementById('scrub');
  let clip = 1, t0 = performance.now(), playing = true;
  sel.onchange = () => { clip = +sel.value; t0 = performance.now(); playing = true; };
  scrub.oninput = () => { playing = false; };
  document.getElementById('play').onclick = () => { playing = true; t0 = performance.now() - (+scrub.value / 1000) * durationOf(clip) * 1000; };
  const loop = () => {
    const d = durationOf(clip);
    let t;
    if (playing) { t = ((performance.now() - t0) / 1000) % d; scrub.value = Math.round((t / d) * 1000); }
    else t = (+scrub.value / 1000) * d;
    window.renderAt(clip, t);
    requestAnimationFrame(loop);
  };
  loop();
} else {
  window.renderAt(1, 0);
}
window.__ready = true;
