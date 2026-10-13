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
  6: { id: 6, name: 'Clip 6 — Taking and recording the latest reading', duration: 37 },
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

// Clip 6: one inspection round, recorded into a log. Field entries are FORMATS,
// never numbers: the reference supplies no operating values or limits.
// (A verification check rejects any digit in these entries.)
export const RECORD_STEPS = [
  { k: 'pump', tag: '02', title: 'Prepare: identify the equipment', color: '#2e9b4f',
    action: 'Confirm the equipment tag, task scope and authorised observation points before approaching.',
    fields: [['Equipment tag', 'as on the site tag plate'], ['Task scope', 'external observation only'], ['Observation points', 'as briefed by the supervisor']] },
  { k: 'motor', tag: '01', title: 'Safe access: drive and guard', color: '#1f5fb8',
    action: 'Observe only the permitted external condition. Verify safe access and that guarding is in place.',
    fields: [['Guard in place', 'Yes / No, tick as observed'], ['External condition', 'describe what is seen; no contact']] },
  { k: 'gauge', tag: '03', title: 'Take the reading: pressure indicator', color: '#d23b33',
    action: 'Read at eye level, square to the dial, to avoid parallax. Record point, value, unit, time and reference.',
    fields: [['Point', 'pressure indicator, upper pipe tapping'], ['Value', 'enter exactly as read'], ['Unit', 'as marked on the dial'], ['Time', 'hh:mm'], ['Reference', 'instrument tag / procedure ref.']] },
  { k: 'cool', tag: '04', title: 'Cooling circuit observations', color: '#f08a00',
    action: 'Identify where approved temperature and water observations would be recorded. None are approved in this model.',
    fields: [['Temperature / water points', 'only where approved; not supplied here']] },
  { k: 'rec', tag: '05', title: 'Record and hand over', color: '#6a3fb5',
    action: 'Complete the record and inform the authorised person. This entry becomes the latest data for the next watch.',
    fields: [['Findings', 'as found; describe any abnormality'], ['Uncertainty', 'e.g. parallax, scale resolution'], ['Source references', 'drawing / manual / procedure'], ['Authorised person informed', 'name and time'], ['Observer signature', 'student name / ID']] },
];
