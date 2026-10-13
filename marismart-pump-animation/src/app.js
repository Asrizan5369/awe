import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildModel, AXIS_Y, PIPE_R } from './model.js';
import { buildFlow } from './flow.js';
import { stateAt, durationOf, EXPLODE_ORDER, activeMover, ease, TIMING } from './timeline.js';
import { TECHNICAL, ILLUSTRATIVE_REV_PER_SECOND, CLIPS, FPS, INSPECTION_STEPS, QUIZ_ORDER, RECORD_STEPS } from './config.js';

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
// Clip 6 uses a second fixed framing (scene shifted right) to leave room for the log sheet.
// It never changes within a clip.
const CAM_BASE = { pos: new THREE.Vector3(4.2, 8.2, 19.5), target: new THREE.Vector3(0.55, 2.0, -0.2) };
let framedFor = null;
function frameFor(clip) {
  const key = clip === 6 ? 6 : 0;
  if (framedFor === key) return;
  framedFor = key;
  // Clip 6: pan the camera left (scene appears right) and widen slightly. Pure translation of
  // camera + target, so the viewing direction is identical to the other clips.
  const pan = key === 6 ? -2.6 : 0, lift = key === 6 ? -0.2 : 0;
  const right = new THREE.Vector3().subVectors(CAM_BASE.target, CAM_BASE.pos).cross(new THREE.Vector3(0, 1, 0)).normalize();
  const d = right.multiplyScalar(pan).add(new THREE.Vector3(0, lift, 0));
  camera.position.copy(CAM_BASE.pos).add(d);
  camera.fov = key === 6 ? 34 : 27;
  camera.updateProjectionMatrix();
  camera.lookAt(CAM_BASE.target.clone().add(d));
}
// Close-up inset camera for the pressure indicator dial (Clip 6, reading step).
const insetCam = new THREE.PerspectiveCamera(22, 1, 0.05, 50);
const INSET = { x: 1556, y: 128, w: 320, h: 320 };

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

// Clip 4/5 card and progress strip.
const card = document.getElementById('card');
const progress = document.getElementById('progress');

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
  frameFor(st.clip);
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

  // Record board ticks: in Clip 6 they fill as steps are completed; elsewhere as in the reference.
  const ticked = st.clip === 6 ? Math.min(4, st.recDone) : 3;
  for (let i = 0; i < 4; i++) {
    const m = groups.rec.getObjectByName('RecordHandover_Checkbox_' + i).material;
    m.color.set(i < ticked ? 0x6a3fb5 : 0x8e959c);
  }
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
  } else if (st.clip === 6) {
    extra.push('Entries show the required format. Students enter real values from the actual instrument; no values, limits or trends are implied.');
  } else if (st.clip === 4 || st.clip === 5) {
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
    // Clip 5: a component's label stays hidden until its answer is revealed.
    // Clip 6: only the component in the current step is labelled (the log carries the rest).
    const show = st.clip === 5 ? isMain && st.revealed.includes(L.k)
      : st.clip === 6 ? L.k === st.focus
      : isMain || anyExploded || L.k === mover;
    place(L.el, p, show);
    L.el.classList.toggle('active', L.k === mover);
    const focused = Boolean((st.clip === 4 || st.clip === 6 || (st.clip === 5 && st.reveal)) && L.k === st.focus);
    L.el.classList.toggle('focus', focused);
    L.el.style.setProperty('--c', L.color);
  }
  // Clip 4 card (function + purpose) and Clip 5 card (question, then answer).
  const step = (st.clip === 4 || st.clip === 5) && st.focus ? INSPECTION_STEPS[st.focusIndex] : null;
  card.style.display = step ? 'block' : 'none';
  progress.style.display = st.clip === 4 || st.clip === 5 ? 'flex' : 'none';
  if (step) {
    card.style.opacity = st.focusAmount;
    if (st.clip === 4 || st.reveal) {
      card.style.setProperty('--c', step.color);
      const head = st.clip === 5 ? `<div class="card-k" style="margin:0 0 6px">Answer — Q${st.qNum}</div>` : '';
      card.innerHTML = `${head}<div class="card-h"><span class="tag" style="background:${step.color}">${step.tag}</span>${step.title}</div>
        <div class="card-k">Function</div><div class="card-v">${step.fn}</div>
        <div class="card-k">${st.clip === 5 ? 'Evidence to record' : 'Inspection learning purpose'}</div><div class="card-v">${step.purpose}</div>`;
    } else {
      // Question: neutral colour, no name, no tag — nothing that gives the answer away.
      card.style.setProperty('--c', '#1b2430');
      card.innerHTML = `<div class="card-h">Question ${st.qNum} of ${QUIZ_ORDER.length}</div>
        <div class="card-v">a) Name the highlighted component.</div>
        <div class="card-v">b) State what you would observe or record there.</div>
        <div class="countdown">${st.countdown}</div>`;
    }
  }
  if (st.clip === 4) {
    progress.innerHTML = INSPECTION_STEPS.map((S, i) => `<div class="step${i < st.completed ? ' done' : ''}${i === st.focusIndex && st.focus ? ' now' : ''}" style="--c:${S.color}"><span class="tag" style="background:${S.color}">${S.tag}</span>${S.title}<span class="tick">✓</span></div>`).join('');
  } else if (st.clip === 5) {
    progress.innerHTML = QUIZ_ORDER.map((_, i) => {
      const done = i < st.revealed.length, now = st.qNum === i + 1;
      return `<div class="step${done ? ' done' : ''}${now ? ' now' : ''}" style="--c:#1b2430">Q${i + 1}<span class="tick">✓</span></div>`;
    }).join('');
  }
  // Clip 5 question marker: shows WHICH component is asked about without naming it.
  const qm = document.getElementById('qmark');
  if (st.clip === 5 && step && !st.reveal) {
    place(qm, project(LABELS.find((x) => x.k === step.k).anchor), true);
    qm.style.opacity = st.focusAmount;
  } else qm.style.display = 'none';
  const sum = document.getElementById('summary');
  sum.classList.remove('wide');
  sum.style.display = (st.clip === 4 || st.clip === 5) && st.summary > 0 ? 'block' : 'none';
  sum.style.opacity = st.summary;
  sum.innerHTML = st.clip === 5
    ? `<b>Self-assessment</b>1 mark for each correct name and 1 mark for each correct evidence statement, giving a total out of ${QUIZ_ORDER.length * 2}. Review any items you missed in Clip 4.`
    : `<b>Walkthrough complete</b>Each observation links a component's function to the evidence recorded: point, value, unit, time, reference, uncertainty, and the authorised person informed at handover.`;
  place(notes.pump, project(groups.pump.children.find((c) => c.name === 'Pump_Casing'), 0, -0.95, 0.8), st.clip === 3);
  place(notes.cool, project(groups.cool.children.find((c) => c.name === 'CoolingModule_HeaderBottom'), 0.2, -0.75, 0.8), st.clip === 3);
  place(notes.guard, project(groups.guard.children.find((c) => c.name === 'CouplingGuard_Top'), -1.6, -2.15, 1.6), st.clip === 3 && st.guardOverlay > 0.5);
  place(notes.gauge, project(groups.gauge.children.find((c) => c.userData.isAnchor), -3.3, -0.2, 0), st.clip === 3);

  renderLog(st);

  if (doRender) {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    renderer.render(scene, camera);
    if (st.clip === 6 && st.inset > 0) {
      const dial = groups.gauge.getObjectByName('PressureIndicator_Dial').getWorldPosition(new THREE.Vector3());
      insetCam.position.set(dial.x, dial.y, dial.z + 1.55); // square to the dial: no parallax
      insetCam.lookAt(dial);
      const vy = H - INSET.y - INSET.h;
      renderer.setScissorTest(true);
      renderer.setViewport(INSET.x, vy, INSET.w, INSET.h);
      renderer.setScissor(INSET.x, vy, INSET.w, INSET.h);
      renderer.render(scene, insetCam);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, W, H);
    }
  }
}

// ------------------------------------------------------------- Clip 6 log sheet
const logEl = document.getElementById('log');
const insetEl = document.getElementById('inset');
function renderLog(st) {
  const show = st.clip === 6;
  logEl.style.display = show ? 'block' : 'none';
  insetEl.style.display = show && st.inset > 0 ? 'block' : 'none';
  insetEl.style.opacity = st.inset || 0;
  if (!show) return;
  let html = `<div class="log-h">Inspection record <span>Pump skid · learning model</span></div>
    <div class="log-row meta"><div>Date / time</div><div>dd/mm/yyyy · hh:mm</div></div>
    <div class="log-row meta"><div>Observer</div><div>student name / ID</div></div>`;
  RECORD_STEPS.forEach((S, i) => {
    const state = i < st.recDone ? 'done' : i === st.recStep ? 'now' : 'todo';
    html += `<div class="log-sec ${state}" style="--c:${S.color}"><span class="tag" style="background:${S.color}">${S.tag}</span>${S.title}${state === 'done' ? '<span class="tick">✓</span>' : ''}</div>`;
    S.fields.forEach(([k, v], j) => {
      const p = state === 'done' ? 1 : state === 'now' ? st.fieldProgress[j] : 0;
      const txt = v.slice(0, Math.round(v.length * p));
      const cursor = state === 'now' && p > 0 && p < 1 ? '<span class="cur">|</span>' : '';
      html += `<div class="log-row ${state === 'now' && p > 0 && p < 1 ? 'writing' : ''}"><div>${k}</div><div class="hand">${txt}${cursor}</div></div>`;
    });
  });
  logEl.innerHTML = html;
  const step = st.recStep >= 0 ? RECORD_STEPS[st.recStep] : null;
  const act = document.getElementById('action');
  act.style.display = step ? 'block' : 'none';
  if (step) {
    act.style.opacity = st.focusAmount;
    act.style.setProperty('--c', step.color);
    act.innerHTML = `<b>Step ${st.recStep + 1} of ${RECORD_STEPS.length}</b> ${step.action}`;
  }
  const sum = document.getElementById('summary');
  sum.style.display = st.summary > 0 ? 'block' : 'none';
  sum.style.opacity = st.summary;
  sum.classList.add('wide');
  sum.innerHTML = `<b>Latest data recorded and handed over</b>This entry is now the latest record. Compare it with earlier entries only against approved limits, and none are supplied with this model.`;
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
  const frames5 = Math.round(durationOf(5) * FPS);
  const frames34 = [...Array(frames3 + 1).keys()].map((f) => [3, f])
    .concat([...Array(frames4 + 1).keys()].map((f) => [4, f]))
    .concat([...Array(frames5 + 1).keys()].map((f) => [5, f]))
    .concat([...Array(Math.round(durationOf(6) * FPS) + 1).keys()].map((f) => [6, f]));
  for (const [c, f] of frames34) {
    applyState(stateAt(c, f / FPS), false);
    for (const r of rotating) if (r.rotation.x) moved++;
    for (const k of allKeys) if (groups[k].position.distanceTo(home[k]) > 0 || groups[k].rotation.x || groups[k].rotation.y || groups[k].rotation.z) moved++;
  }
  if (moved) fail('A stationary component moved in Clip 3');
  ok('Stationary parts remain stationary in Clips 3–5 (no rotation in Clips 4–5)', { violations: moved });

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

  // 7c. Clip 5: every component asked once; answer never visible before its reveal.
  const asked = [];
  let leaks = 0, flow5 = 0;
  for (let f = 0; f <= frames5; f++) {
    const st = stateAt(5, f / FPS);
    if (st.focus && asked[asked.length - 1] !== st.focus) asked.push(st.focus);
    if (st.focus && !st.reveal && st.revealed.includes(st.focus)) leaks++;
    if (st.flowOpacity > 0 || st.flowRunning) flow5++;
  }
  if ([...asked].sort().join() !== [...expected].sort().join() || asked.length !== expected.length) fail('Clip 5 does not ask each component exactly once');
  if (JSON.stringify(asked) === JSON.stringify(expected)) fail('Clip 5 order matches Clip 4 (answerable by sequence)');
  if (leaks) fail('Clip 5 shows an answer before its reveal');
  if (flow5) fail('Flow shown in Clip 5');
  ok('Clip 5 asks each component once, in a different order from Clip 4; no answer shown before reveal', { asked, leaks, flow5 });

  // 7d. Clip 6: steps in order, no flow, and NO numeric values anywhere in the log entries.
  const frames6 = Math.round(durationOf(6) * FPS);
  const seq6 = [];
  let flow6 = 0;
  for (let f = 0; f <= frames6; f++) {
    const st = stateAt(6, f / FPS);
    if (st.focus && seq6[seq6.length - 1] !== st.focus) seq6.push(st.focus);
    if (st.flowOpacity > 0 || st.flowRunning) flow6++;
  }
  const digits = RECORD_STEPS.flatMap((S) => S.fields.map((x) => x[1])).filter((v) => /\d/.test(v));
  if (JSON.stringify(seq6) !== JSON.stringify(RECORD_STEPS.map((S) => S.k))) fail('Clip 6 step order incorrect');
  if (flow6) fail('Flow shown in Clip 6');
  if (digits.length) fail('Clip 6 log contains numeric values: ' + digits.join(' | '));
  ok('Clip 6 recording round in order; no flow; no invented numeric values in the log', { seq6, flow6, numericEntries: digits.length });

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
