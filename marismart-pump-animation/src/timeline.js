// Deterministic animation state as a pure function of (clip, time).
// Clip 2 is computed as the exact time-reverse of Clip 1's movement phase, so
// every reassembly trajectory is the disassembly trajectory run backwards.

import { CLIPS } from './config.js';

// Disassembly order: only external subassemblies, translations only.
export const EXPLODE_ORDER = ['guard', 'gauge', 'up', 'lo', 'motor', 'pump', 'cool'];

const MOVE_START = 2.5; // s, Clip 1
const MOVE_EACH = 1.2;
const MOVE_GAP = 0.3;
export const MOVE_END = MOVE_START + EXPLODE_ORDER.length * (MOVE_EACH + MOVE_GAP) - MOVE_GAP;
const MOVE_SPAN = MOVE_END - MOVE_START;

const REASSEMBLY_START = 1.0; // s, Clip 2

const clamp01 = (x) => Math.min(1, Math.max(0, x));
// Smooth, symmetric ease; symmetric so reversal is exact.
export const ease = (u) => u * u * (3 - 2 * u);

// Explode fraction (0 assembled .. 1 exploded) of each component at a Clip-1 time.
export function explodeAtClip1Time(t) {
  const out = {};
  EXPLODE_ORDER.forEach((k, i) => {
    const s = MOVE_START + i * (MOVE_EACH + MOVE_GAP);
    out[k] = ease(clamp01((t - s) / MOVE_EACH));
  });
  return out;
}

export function activeMover(fractions) {
  return EXPLODE_ORDER.find((k) => fractions[k] > 0 && fractions[k] < 1) || null;
}

export function stateAt(clip, t) {
  const st = {
    clip,
    t,
    explode: {},
    flowOpacity: 0,
    flowRunning: false,
    guardOverlay: 0, // 0 = opaque guard, 1 = transparent teaching overlay
    pipeOverlay: 0,
    shaftsRotating: false,
    status: '',
    caption: '',
    showLabels: true,
  };
  if (clip === 1) {
    st.explode = explodeAtClip1Time(t);
    // Reference arrows visible at start, then removed: system stopped & isolated.
    st.flowOpacity = 1 - clamp01((t - 0.8) / 0.9);
    st.status = t < 1.2 ? 'Reference layout' : 'System stopped and isolated (conceptual state) — shafts stationary, no flow';
    st.caption = 'Conceptual exploded view — not a maintenance procedure.';
  } else if (clip === 2) {
    const tau = t - REASSEMBLY_START; // elapsed reassembly time
    const t1 = MOVE_END - clamp01(tau / MOVE_SPAN) * MOVE_SPAN; // mirrored Clip-1 time
    st.explode = explodeAtClip1Time(t1);
    const done = tau >= MOVE_SPAN;
    st.status = done
      ? 'Reassembled — matches reference layout. Coupling guard installed.'
      : 'System stopped and isolated — no rotation, no flow during reassembly';
    st.caption = 'Reverse of the exploded view: reconstruction of the learning model, not a verified installation procedure.';
  } else if (clip === 3) {
    for (const k of EXPLODE_ORDER) st.explode[k] = 0;
    const ramp = clamp01((t - 1.0) / 1.0);
    st.guardOverlay = ramp;
    st.pipeOverlay = ramp;
    st.flowOpacity = clamp01((t - 1.6) / 0.6);
    st.flowRunning = t >= 1.6;
    st.shaftsRotating = t >= 2.0; // honoured only if an approved direction is configured
    st.status = 'Operating view (conceptual) — guard installed, shown as transparent teaching overlay';
    st.caption = 'Conceptual circulation — internal flow path requires equipment-specific verification.';
  }
  return st;
}

export function durationOf(clip) {
  return CLIPS[clip].duration;
}

export const TIMING = { MOVE_START, MOVE_EACH, MOVE_GAP, MOVE_END, REASSEMBLY_START };
