// MARISMART AR — pump-skid learning model: technical configuration.
//
// Everything the reference illustration does NOT establish is held here as
// `null` (unknown). The animation code refuses to show motion that depends on
// an unknown value. Fill these in ONLY from an approved technical authority
// (manufacturer drawing, rotation arrow on the casing, CAD model, maintenance
// manual) and record that source in `technicalSource`.

export const TECHNICAL = {
  // e.g. { document: 'Pump GA drawing XYZ-001 rev C', supplied: '2026-10-20' }
  technicalSource: null,

  // Shaft rotation as seen under the declared viewing convention below.
  // Allowed: 'CW' | 'CCW' | null. null => no shaft rotation is rendered.
  rotationDirection: null,

  // The single viewpoint used to state rotation. Never changes with the camera.
  rotationViewConvention:
    'Viewed from the motor non-drive (fan) end, looking along the shaft towards the pump',

  // Unknown items are listed so the overlays and report can declare them.
  unknowns: [
    'Exact pump type and internal construction',
    'Approved direction of shaft rotation',
    'Suction and discharge port identities',
    'Internal heat-exchanger flow passages',
    "Manufacturer's disassembly sequence",
    'Actual operating speed, temperature and pressure',
  ],
};

// Illustrative playback rate for shaft rotation (revolutions per second of
// video). Deliberately slow; not related to any real operating speed.
export const ILLUSTRATIVE_REV_PER_SECOND = 0.35;

export const FPS = 30;

export const CLIPS = {
  1: { id: 1, name: 'Clip 1 — Conceptual disassembly', duration: 16 },
  2: { id: 2, name: 'Clip 2 — Conceptual reassembly', duration: 14 },
  3: { id: 3, name: 'Clip 3 — Mechanical motion and flow', duration: 14 },
  4: { id: 4, name: 'Clip 4 — Inspection walkthrough: function to evidence', duration: 29 },
  5: { id: 5, name: 'Clip 5 — Knowledge check: identify and record', duration: 38 },
};

// Clip 4 card text, taken from the reference illustration's five cards.
export const INSPECTION_STEPS = [
  { k: 'motor', tag: '01', title: 'Drive', color: '#1f5fb8',
    fn: 'Provides mechanical motion in this generic system.',
    purpose: 'Observe and record only the permitted external condition. Safe access and guarding requirements must be verified.' },
  { k: 'pump', tag: '02', title: 'Pump', color: '#2e9b4f',
    fn: 'Transfers fluid through the conceptual system.',
    purpose: 'Identify the equipment tag, task scope and authorised observation points.' },
  { k: 'gauge', tag: '03', title: 'Pressure indicator', color: '#d23b33',
    fn: 'Displays a pressure reading.',
    purpose: 'Record point, value, unit, time and reference. No approved limits are supplied.' },
  { k: 'cool', tag: '04', title: 'Cooling circuit', color: '#f08a00',
    fn: 'Represents heat transfer in the learning map.',
    purpose: 'Identify where approved temperature and water observations would be recorded.' },
  { k: 'rec', tag: '05', title: 'Record & handover', color: '#6a3fb5',
    fn: 'Connects observations to the inspection record.',
    purpose: 'Record findings, uncertainty, source references and the authorised person informed.' },
];

// Clip 5 asks in a different order from Clip 4 so learners cannot answer by sequence.
export const QUIZ_ORDER = [2, 0, 3, 1, 4]; // indices into INSPECTION_STEPS
