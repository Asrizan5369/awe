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
};
