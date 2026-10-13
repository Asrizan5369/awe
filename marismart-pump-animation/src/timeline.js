// Deterministic animation state as a pure function of (clip, time).
// Clip 2 is computed as the exact time-reverse of Clip 1's movement phase, so
// every reassembly trajectory is the disassembly trajectory run backwards.

import { CLIPS, INSPECTION_STEPS, QUIZ_ORDER } from './config.js';

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
  } else if (clip === 4) {
    // Static, assembled, stopped. One component in focus at a time; no motion, no flow.
    for (const k of EXPLODE_ORDER) st.explode[k] = 0;
    const i = Math.floor((t - INSPECT_START) / INSPECT_EACH);
    if (t >= INSPECT_START && i < INSPECTION_STEPS.length) {
      const local = t - INSPECT_START - i * INSPECT_EACH;
      st.focus = INSPECTION_STEPS[i].k;
      st.focusIndex = i;
      st.focusAmount = Math.min(clamp01(local / 0.4), clamp01((INSPECT_EACH - local) / 0.4));
    }
    st.completed = Math.max(0, Math.min(INSPECTION_STEPS.length, Math.floor((t - INSPECT_START) / INSPECT_EACH)));
    st.summary = t >= INSPECT_END ? clamp01((t - INSPECT_END) / 0.5) : 0;
    st.status = 'System stopped and isolated (conceptual) — external observation only';
    st.caption = 'Inspection learning walkthrough — illustrative; not an approved inspection procedure.';
  } else if (clip === 5) {
    // Static, assembled, stopped. Highlight -> question + countdown (label hidden) -> reveal.
    for (const k of EXPLODE_ORDER) st.explode[k] = 0;
    const i = Math.floor((t - QUIZ_START) / QUIZ_EACH);
    let answered = Math.max(0, Math.min(QUIZ_ORDER.length, i));
    if (t >= QUIZ_START && i < QUIZ_ORDER.length) {
      const local = t - QUIZ_START - i * QUIZ_EACH;
      st.focusIndex = QUIZ_ORDER[i];
      st.focus = INSPECTION_STEPS[st.focusIndex].k;
      st.qNum = i + 1;
      st.focusAmount = Math.min(clamp01(local / 0.4), clamp01((QUIZ_EACH - local) / 0.4));
      st.reveal = local >= QUIZ_ASK;
      st.countdown = st.reveal ? 0 : Math.ceil(QUIZ_ASK - local);
      if (st.reveal) answered = i + 1;
    }
    st.revealed = QUIZ_ORDER.slice(0, answered).map((j) => INSPECTION_STEPS[j].k);
    st.summary = t >= QUIZ_END ? clamp01((t - QUIZ_END) / 0.5) : 0;
    st.status = 'System stopped and isolated (conceptual) — external observation only';
    st.caption = 'Knowledge check — pause the video if you need more time before the reveal.';
  }
  return st;
}

const QUIZ_START = 2.0;
const QUIZ_EACH = 6.5;
const QUIZ_ASK = 3.5;
const QUIZ_END = QUIZ_START + QUIZ_ORDER.length * QUIZ_EACH;

const INSPECT_START = 2.5;
const INSPECT_EACH = 4.6;
const INSPECT_END = INSPECT_START + INSPECTION_STEPS.length * INSPECT_EACH;

export function durationOf(clip) {
  return CLIPS[clip].duration;
}

export const TIMING = { MOVE_START, MOVE_EACH, MOVE_GAP, MOVE_END, REASSEMBLY_START, INSPECT_START, INSPECT_EACH, INSPECT_END, QUIZ_START, QUIZ_EACH, QUIZ_ASK, QUIZ_END };
