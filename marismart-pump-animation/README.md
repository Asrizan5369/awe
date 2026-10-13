# MARISMART AR: pump skid learning model (3 clips + GLB)

This is an illustrative learning model built from a 2D illustration titled "2D inspection studio". It is **not** an approved maintenance, installation or operating procedure, and it has **not** been validated technically from the image alone.

## Deliverables (`renders/`)

| File | Content |
|---|---|
| `MARISMART_Clip1_Conceptual_Disassembly.mp4` | 16 s, 1920×1080, 30 fps. The system is stopped and isolated, then shown as an external-component exploded view. |
| `MARISMART_Clip2_Conceptual_Reassembly.mp4` | 14 s. The exact time-reverse of the Clip 1 trajectories, ending in the reference layout with the guard installed. |
| `MARISMART_Clip3_Mechanical_Motion_and_Flow.mp4` | 14 s. The guard stays installed and is shown as a transparent teaching overlay, with a conceptual flow overlay. **No shaft rotation** (see the gate below). |
| `MARISMART_PumpSkid_LearningModel.glb` | The same geometry as named nodes, with translation tracks `Clip1_ConceptualDisassembly` and `Clip2_ConceptualReassembly`. It has no rotation track. |
| `verification_report.json` | Automated checks. If any check fails, the renderer refuses to produce clips. |
| `stills/` | Key frames for review. |

The MP4 files are rendered video. They are **not** an interactive AR model. The GLB is the asset to take into an AR development workflow such as Unity, model-viewer or Reality Composer.

## Technical validation gate

**What the image establishes:** the layout from left to right (motor, coupling guard, pump, pressure indicator on the upper pipe, cooling module, record board), the shared base frame, the component colours, the upper pipe arrow pointing left to right, and the lower pipe arrow pointing right to left.

**What the image does not establish, and so the model does not invent** (see `src/config.js`):

- The pump type and its internals. Only the external casing is modelled: there is no impeller, seal or bearing arrangement.
- The suction and discharge identities. The connections are named `ConnectionA` (top) and `ConnectionB` (side) only.
- The internal heat-exchanger passages. The cooling module stays opaque.
- The manufacturer's disassembly sequence. The model uses translations of whole external subassemblies only: no bolts, electrical disconnection, flanges or lifting.
- The direction of shaft rotation. **Clip 3 therefore shows no rotation**, and an on-screen notice says so.
- Operating speed, temperature and pressure. The gauge needle is static, the dial has no numbers, and blue and red are not presented as temperatures.

Assumptions you should review:

- The two in-line valves (red handwheels) are drawn from the image, and flow is shown passing through them. Their open or closed state has not been verified.
- Dimensions are proportional model units, not measurements.

## Adding rotation once an approved direction is supplied

1. In `src/config.js`, set `rotationDirection: 'CW'` or `'CCW'` as seen under `rotationViewConvention` (from the motor non-drive end, looking towards the pump). Also fill in `technicalSource`.
2. Run `node scripts/render.mjs --clips 3`.

Both shaft assemblies and the two coupling halves are driven by **one** angle. They therefore turn at the same speed in the same direction, with no counter-rotation. The label "Animation slowed for learning — not actual operating speed." is added automatically. If the supplied source conflicts with the illustration, flag the conflict before rendering.

## Automated review (every frame)

- Collisions: mesh bounding boxes are checked on every frame of Clip 1. Clip 2 is the mathematically exact reverse of Clip 1.
- Clip 2 starts from Clip 1's final geometry. At the end of Clip 2 every part is back at its original position (zero error).
- The shafts are coaxial. Directly coupled parts always share an identical angle. No rotation is rendered without approval.
- The housings, guard, pipes, gauge, cooler and base stay stationary in Clip 3.
- Flow particles stay inside the pipe bore. They never reverse or teleport, and they match the reference arrows. They are never routed through the motor, coupling, guard or gauge.

## Rebuild

```bash
npm install
node scripts/render.mjs --stills   # verify, then render clips, stills and GLB
npx http-server .                  # or any static server, then open index.html to scrub the clips interactively
```
