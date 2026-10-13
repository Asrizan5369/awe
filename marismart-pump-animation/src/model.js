// Procedural, external-only geometry of the reference pump skid.
//
// Axes: +X runs left -> right as in the reference image, +Y is up, +Z points
// towards the viewer. Units are model units (not millimetres): the reference
// image supplies no dimensions.
//
// Only externally visible subassemblies are modelled. No impeller, seal,
// bearing arrangement or internal heat-exchanger passage is created.

import * as THREE from 'three';

export const AXIS_Y = 1.1; // shared motor/pump shaft centre-line height
export const PIPE_R = 0.13;

// Pipe centre-lines (world, assembled). Shared by geometry and flow overlay so
// particles always follow the drawn pipe.
export const PATHS = {
  // Upper (blue) line: pump top connection -> riser -> elbow -> run -> cooling module.
  upper: { riserX: -0.2, yStart: 2.06, yElbow: 2.8, bendR: 0.3, xEnd: 2.75 },
  // Lower (red) line: cooling module -> pump-side connection.
  lower: { y: AXIS_Y, xStart: 2.75, xEnd: 0.72 },
};
PATHS.upper.yRun = PATHS.upper.yElbow + PATHS.upper.bendR;

const C = {
  motor: 0x1f5fb8,
  motorDark: 0x174a8f,
  steel: 0x8e959c,
  steelDark: 0x5d646b,
  frame: 0x6f7780,
  guard: 0xf2c418,
  guardSlot: 0x5a4a08,
  pump: 0x2e9b4f,
  pumpDark: 0x23793d,
  pipeBlue: 0x2f6fd0,
  pipeRed: 0xd23b33,
  valveRed: 0xc62828,
  gaugeBody: 0xb8bec4,
  gaugeFace: 0xfafafa,
  cooler: 0x2a62b5,
  core: 0x9aa3ab,
  coreDark: 0x4b5258,
  cabinet: 0xc5cad0,
  board: 0xffffff,
  purple: 0x6a3fb5,
  black: 0x222222,
};

const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...opts })
    );
  }
  return matCache.get(key);
}

function box(name, sx, sy, sz, x, y, z, color, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(color, opts));
  m.position.set(x, y, z);
  m.name = name;
  return m;
}

// Cylinder whose axis lies along X, spanning x0..x1.
function cylX(name, r, x0, x1, y, z, color, seg = 40) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, x1 - x0, seg), mat(color));
  m.rotation.z = Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, z);
  m.name = name;
  return m;
}

// Cylinder whose axis lies along Y, spanning y0..y1.
function cylY(name, r, y0, y1, x, z, color, seg = 32) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, seg), mat(color));
  m.position.set(x, (y0 + y1) / 2, z);
  m.name = name;
  return m;
}

// Cylinder whose axis lies along Z, spanning z0..z1.
function cylZ(name, r, z0, z1, x, y, color, seg = 48) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, z1 - z0, seg), mat(color));
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, (z0 + z1) / 2);
  m.name = name;
  return m;
}

function group(name, meta = {}) {
  const g = new THREE.Group();
  g.name = name;
  g.userData = { ...meta };
  return g;
}

function anchor(g, x, y, z) {
  const a = new THREE.Object3D();
  a.name = g.name + '_LabelAnchor';
  a.position.set(x, y, z);
  a.userData.isAnchor = true;
  g.add(a);
  return a;
}

function handwheel(prefix, x, y, z) {
  const parts = [];
  parts.push(cylY(prefix + '_Stem', 0.035, y, y + 0.32, x, z, C.steelDark));
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 10, 32), mat(C.valveRed));
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(x, y + 0.34, z);
  wheel.name = prefix + '_Handwheel';
  parts.push(wheel);
  parts.push(box(prefix + '_HandwheelSpoke1', 0.3, 0.02, 0.03, x, y + 0.34, z, C.valveRed));
  parts.push(box(prefix + '_HandwheelSpoke2', 0.03, 0.02, 0.3, x, y + 0.34, z, C.valveRed));
  return parts;
}

export function buildModel() {
  const root = group('MARISMART_PumpSkid_LearningModel', {
    disclaimer:
      'Illustrative learning model reconstructed from a 2D illustration. Not an approved maintenance or installation procedure. Internal construction not modelled.',
  });

  // ---------------------------------------------------------------- Base frame
  const base = group('BaseFrame', { label: 'Base frame', stationary: true });
  const bx0 = -6.4, bx1 = 7.2;
  for (const z of [-0.95, 0.95]) {
    base.add(box('BaseFrame_Rail_' + (z < 0 ? 'Rear' : 'Front'), bx1 - bx0, 0.18, 0.2, (bx0 + bx1) / 2, 0.09, z, C.frame));
  }
  for (let x = bx0 + 0.1; x <= bx1; x += 1.35) {
    base.add(box('BaseFrame_CrossMember_' + x.toFixed(2), 0.16, 0.14, 1.7, x, 0.07, 0, C.frame));
  }
  root.add(base);

  // --------------------------------------------------------------------- Motor
  const motor = group('Motor', { label: '01 Drive — electric motor', tag: '01', explode: [-1.2, 0, 0] });
  const mx0 = -4.6, mx1 = -2.6;
  motor.add(cylX('Motor_Body', 0.72, mx0, mx1, AXIS_Y, 0, C.motor, 48));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rib = box('Motor_CoolingRib_' + i, mx1 - mx0 - 0.1, 0.07, 0.07, (mx0 + mx1) / 2, AXIS_Y + Math.sin(a) * 0.74, Math.cos(a) * 0.74, C.motorDark);
    rib.rotation.x = -a;
    if (Math.sin(a) > -0.5) motor.add(rib); // keep ribs clear of the feet
  }
  motor.add(cylX('Motor_FanCowl', 0.68, -5.1, mx0, AXIS_Y, 0, C.motorDark, 48));
  motor.add(cylX('Motor_FanCowlEnd', 0.6, -5.16, -5.1, AXIS_Y, 0, C.steelDark, 48));
  motor.add(cylX('Motor_DriveEndShield', 0.6, mx1, -2.48, AXIS_Y, 0, C.motorDark, 48));
  motor.add(box('Motor_TerminalBox', 0.55, 0.32, 0.55, -3.4, AXIS_Y + 0.88, 0, C.motor));
  motor.add(box('Motor_TerminalBoxLid', 0.6, 0.05, 0.6, -3.4, AXIS_Y + 1.06, 0, C.motorDark));
  for (const fx of [-4.25, -2.95]) {
    motor.add(box('Motor_Foot_' + fx, 0.4, 0.24, 1.9, fx, 0.3, 0, C.motorDark));
    motor.add(box('Motor_FootWeb_' + fx, 0.3, 0.2, 0.9, fx, 0.5, 0, C.motorDark));
  }
  // Rotating assembly pivot on the common shaft axis (visible shaft end + coupling half only).
  const motorShaft = group('Motor_ShaftAssembly', { rotating: true, axis: 'X' });
  motorShaft.position.set(0, AXIS_Y, 0);
  motorShaft.add(cylX('Motor_ShaftExtension', 0.09, -2.48, -2.05, 0, 0, C.steel, 24));
  motorShaft.add(cylX('Coupling_HalfMotorSide', 0.28, -2.05, -1.86, 0, 0, C.steel, 40));
  motorShaft.add(cylX('Coupling_FlexibleElement', 0.22, -1.86, -1.84, 0, 0, C.black, 40));
  const markA = box('Coupling_RotationMarker_MotorSide', 0.19, 0.06, 0.06, -1.955, 0.27, 0, 0xff8f00);
  motorShaft.add(markA);
  motor.add(motorShaft);
  anchor(motor, -3.6, AXIS_Y + 1.2, 0);
  root.add(motor);

  // ------------------------------------------------------------ Coupling guard
  const guard = group('CouplingGuard', { label: 'Coupling guard', tag: 'G', explode: [0, 2.0, 0] });
  const gx0 = -2.4, gx1 = -1.12, gy0 = 0.45, gy1 = 1.78, gz = 0.5;
  const gcx = (gx0 + gx1) / 2, gw = gx1 - gx0, gh = gy1 - gy0;
  guard.add(box('CouplingGuard_Top', gw, 0.05, gz * 2 + 0.05, gcx, gy1, 0, C.guard));
  guard.add(box('CouplingGuard_Front', gw, gh, 0.05, gcx, (gy0 + gy1) / 2, gz, C.guard));
  guard.add(box('CouplingGuard_Rear', gw, gh, 0.05, gcx, (gy0 + gy1) / 2, -gz, C.guard));
  for (let i = 0; i < 5; i++) {
    guard.add(box('CouplingGuard_VentSlot_' + i, gw * 0.62, 0.06, 0.01, gcx, gy0 + 0.35 + i * 0.18, gz + 0.03, C.guardSlot));
  }
  anchor(guard, gcx, gy1 + 0.25, 0);
  root.add(guard);

  // ---------------------------------------------------------------------- Pump
  const pump = group('Pump', { label: '02 Pump — external casing only', tag: '02', explode: [0, 0, -1.6] });
  pump.add(cylX('Pump_BearingFrame', 0.32, -1.18, -0.55, AXIS_Y, 0, C.pumpDark, 40));
  pump.add(cylX('Pump_Casing', 0.78, -0.55, 0.15, AXIS_Y, 0, C.pump, 56));
  pump.add(cylX('Pump_CasingCover', 0.6, 0.15, 0.32, AXIS_Y, 0, C.pump, 56));
  // Connection A: top. Connection B: right-hand side. Suction/discharge identity NOT asserted.
  pump.add(cylY('Pump_ConnectionA_Neck', 0.16, AXIS_Y + 0.6, PATHS.upper.yStart - 0.06, PATHS.upper.riserX, 0, C.pump));
  pump.add(cylY('Pump_ConnectionA_Flange', 0.26, PATHS.upper.yStart - 0.06, PATHS.upper.yStart, PATHS.upper.riserX, 0, C.pumpDark));
  pump.add(cylX('Pump_ConnectionB_Neck', 0.16, 0.32, 0.66, AXIS_Y, 0, C.pump));
  pump.add(cylX('Pump_ConnectionB_Flange', 0.26, 0.66, PATHS.lower.xEnd, AXIS_Y, 0, C.pumpDark));
  pump.add(box('Pump_Pedestal', 0.7, 0.18, 1.9, -0.2, 0.27, 0, C.pumpDark));
  pump.add(box('Pump_PedestalWeb', 0.5, 0.12, 0.7, -0.2, 0.42, 0, C.pumpDark));
  pump.add(box('Pump_BearingFoot', 0.3, 0.6, 0.5, -0.85, 0.48, 0, C.pumpDark));
  pump.add(box('Pump_BearingFootPlate', 0.4, 0.06, 1.9, -0.85, 0.21, 0, C.pumpDark));
  const pumpShaft = group('Pump_ShaftAssembly', { rotating: true, axis: 'X' });
  pumpShaft.position.set(0, AXIS_Y, 0);
  pumpShaft.add(cylX('Coupling_HalfPumpSide', 0.28, -1.84, -1.65, 0, 0, C.steel, 40));
  pumpShaft.add(cylX('Pump_ShaftExtension', 0.09, -1.65, -1.18, 0, 0, C.steel, 24));
  pumpShaft.add(box('Coupling_RotationMarker_PumpSide', 0.19, 0.06, 0.06, -1.745, 0.27, 0, 0xff8f00));
  pump.add(pumpShaft);
  anchor(pump, -0.3, AXIS_Y + 1.15, 0.2);
  root.add(pump);

  // ---------------------------------------------------------- Upper pipe (blue)
  const P = PATHS.upper;
  const up = group('Pipe_Upper', { label: 'Upper pipe section', tag: 'P1', explode: [0, 0.8, 0] });
  up.add(cylY('Pipe_Upper_Flange_PumpEnd', 0.24, P.yStart, P.yStart + 0.06, P.riserX, 0, C.pipeBlue));
  up.add(cylY('Pipe_Upper_Riser', PIPE_R, P.yStart + 0.06, P.yElbow, P.riserX, 0, C.pipeBlue));
  const elbow = new THREE.Mesh(new THREE.TorusGeometry(P.bendR, PIPE_R, 16, 24, Math.PI / 2), mat(C.pipeBlue));
  elbow.position.set(P.riserX + P.bendR, P.yElbow, 0);
  elbow.rotation.z = Math.PI / 2; // quarter bend from vertical (riser) to horizontal (run)
  elbow.name = 'Pipe_Upper_Elbow';
  up.add(elbow);
  up.add(cylX('Pipe_Upper_Run', PIPE_R, P.riserX + P.bendR, P.xEnd - 0.06, P.yRun, 0, C.pipeBlue));
  up.add(cylX('Pipe_Upper_Flange_CoolerEnd', 0.24, P.xEnd - 0.06, P.xEnd, P.yRun, 0, C.pipeBlue));
  // Gauge tapping boss (part of the pipe). The gauge is a separate component.
  up.add(cylY('Pipe_Upper_GaugeTappingBoss', 0.06, P.yRun + PIPE_R - 0.02, P.yRun + 0.3, 0.6, 0, C.steelDark));
  // In-line valve (external body only).
  up.add(cylX('Pipe_Upper_ValveBody', 0.2, 1.65, 1.95, P.yRun, 0, C.steelDark));
  for (const p of handwheel('Pipe_Upper_Valve', 1.8, P.yRun + 0.2, 0)) up.add(p);
  anchor(up, 1.0, P.yRun + 0.4, 0);
  root.add(up);

  // ---------------------------------------------------------- Lower pipe (red)
  const L = PATHS.lower;
  const lo = group('Pipe_Lower', { label: 'Lower pipe section', tag: 'P2', explode: [0, 0, 1.9] });
  lo.add(cylX('Pipe_Lower_Flange_PumpEnd', 0.24, L.xEnd, L.xEnd + 0.06, L.y, 0, C.pipeRed));
  lo.add(cylX('Pipe_Lower_Run', PIPE_R, L.xEnd + 0.06, L.xStart - 0.06, L.y, 0, C.pipeRed));
  lo.add(cylX('Pipe_Lower_Flange_CoolerEnd', 0.24, L.xStart - 0.06, L.xStart, L.y, 0, C.pipeRed));
  lo.add(cylX('Pipe_Lower_ValveBody', 0.2, 1.35, 1.65, L.y, 0, C.steelDark));
  for (const p of handwheel('Pipe_Lower_Valve', 1.5, L.y + 0.2, 0)) lo.add(p);
  anchor(lo, 2.1, L.y - 0.45, 0.3);
  root.add(lo);

  // --------------------------------------------------------- Pressure indicator
  const gauge = group('PressureIndicator', { label: '03 Pressure indicator', tag: '03', explode: [0, 1.4, 0] });
  const gyStem0 = P.yRun + 0.3;
  gauge.add(cylY('PressureIndicator_Connection', 0.05, gyStem0, gyStem0 + 0.08, 0.6, 0, C.steel, 6));
  gauge.add(cylY('PressureIndicator_Stem', 0.035, gyStem0 + 0.08, gyStem0 + 0.32, 0.6, 0, C.steel));
  const dialY = gyStem0 + 0.32 + 0.34;
  gauge.add(cylZ('PressureIndicator_Case', 0.36, -0.07, 0.07, 0.6, dialY, C.gaugeBody));
  gauge.add(cylZ('PressureIndicator_Dial', 0.31, 0.07, 0.08, 0.6, dialY, C.gaugeFace));
  // Scale ticks only: no numbers, no limits, no operating value implied.
  for (let i = 0; i <= 10; i++) {
    const a = THREE.MathUtils.degToRad(225 - i * 27);
    const t = box('PressureIndicator_Tick_' + i, 0.06, 0.015, 0.004, 0.6 + Math.cos(a) * 0.24, dialY + Math.sin(a) * 0.24, 0.083, C.black);
    t.rotation.z = a;
    gauge.add(t);
  }
  const needle = box('PressureIndicator_Needle_Static', 0.22, 0.02, 0.006, 0.6 + 0.07, dialY + 0.07, 0.087, 0xc62828);
  needle.rotation.z = THREE.MathUtils.degToRad(45);
  needle.userData.static = 'Needle is not animated: no validated pressure data supplied.';
  gauge.add(needle);
  anchor(gauge, 0.6, dialY + 0.5, 0);
  root.add(gauge);

  // ------------------------------------------------------------ Cooling module
  const cool = group('CoolingModule', { label: '04 Cooling module — external only', tag: '04', explode: [0, 0, -1.7] });
  const cx0 = 2.9, cx1 = 4.6, cy0 = 0.5, cy1 = 3.55, cz = 0.75;
  cool.add(box('CoolingModule_HeaderTop', cx1 - cx0, 0.3, cz * 2, (cx0 + cx1) / 2, cy1 - 0.15, 0, C.cooler));
  cool.add(box('CoolingModule_HeaderBottom', cx1 - cx0, 0.3, cz * 2, (cx0 + cx1) / 2, cy0 + 0.15, 0, C.cooler));
  cool.add(box('CoolingModule_SideLeft', 0.12, cy1 - cy0, cz * 2, cx0 + 0.06, (cy0 + cy1) / 2, 0, C.cooler));
  cool.add(box('CoolingModule_SideRight', 0.12, cy1 - cy0, cz * 2, cx1 - 0.06, (cy0 + cy1) / 2, 0, C.cooler));
  cool.add(box('CoolingModule_Core', cx1 - cx0 - 0.24, cy1 - cy0 - 0.6, cz * 2 - 0.1, (cx0 + cx1) / 2, (cy0 + cy1) / 2, 0, C.core));
  for (let i = 0; i < 14; i++) {
    cool.add(box('CoolingModule_CoreFin_' + i, 0.025, cy1 - cy0 - 0.62, 0.02, cx0 + 0.2 + i * 0.095, (cy0 + cy1) / 2, cz - 0.04, C.coreDark));
  }
  cool.add(cylX('CoolingModule_FanShroud', 1.1, cx1, cx1 + 0.3, (cy0 + cy1) / 2, 0, C.coreDark, 48));
  cool.add(cylX('CoolingModule_FanGuard', 1.0, cx1 + 0.3, cx1 + 0.34, (cy0 + cy1) / 2, 0, C.black, 48));
  for (const [nm, y] of [['Upper', P.yRun], ['Lower', L.y]]) {
    cool.add(cylX(`CoolingModule_Connection${nm}_Flange`, 0.24, P.xEnd, P.xEnd + 0.06, y, 0, C.cooler));
    cool.add(cylX(`CoolingModule_Connection${nm}_Neck`, 0.15, P.xEnd + 0.06, cx0, y, 0, C.cooler));
  }
  for (const lx of [cx0 + 0.25, cx1 - 0.25]) {
    cool.add(box('CoolingModule_Leg_' + lx.toFixed(2), 0.14, cy0 - 0.18, 1.6, lx, (cy0 + 0.18) / 2, 0, C.cooler));
  }
  anchor(cool, (cx0 + cx1) / 2, cy1 + 0.3, 0);
  root.add(cool);

  // ----------------------------------------------- Record & handover (static)
  const rec = group('RecordHandoverBoard', { label: '05 Record & handover', tag: '05', stationary: true });
  rec.add(box('RecordHandover_Cabinet', 1.3, 2.0, 0.6, 6.25, 2.4, 0, C.cabinet));
  rec.add(box('RecordHandover_CabinetDoorLine', 0.02, 1.9, 0.01, 6.25, 2.4, 0.305, C.steelDark));
  rec.add(box('RecordHandover_Board', 0.85, 1.15, 0.03, 6.25, 2.4, 0.32, C.board));
  rec.add(box('RecordHandover_Clip', 0.35, 0.1, 0.05, 6.25, 3.0, 0.34, C.steelDark));
  for (let i = 0; i < 4; i++) {
    rec.add(box('RecordHandover_Checkbox_' + i, 0.12, 0.12, 0.01, 5.98, 2.75 - i * 0.24, 0.34, i < 3 ? C.purple : C.steel));
    rec.add(box('RecordHandover_Line_' + i, 0.45, 0.04, 0.01, 6.33, 2.75 - i * 0.24, 0.34, C.steel));
  }
  for (const lx of [5.75, 6.75]) rec.add(box('RecordHandover_Leg_' + lx, 0.1, 1.22, 0.1, lx, 0.79, 0, C.steelDark));
  anchor(rec, 6.25, 3.75, 0);
  root.add(rec);

  const groups = { base, motor, guard, pump, up, lo, gauge, cool, rec };
  const rotating = [motorShaft, pumpShaft];
  return { root, groups, rotating };
}
