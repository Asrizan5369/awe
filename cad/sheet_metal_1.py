"""Parametric CadQuery model of drawing "sheet metal 1" (A3, scale 1:2).

Coordinate system: X = width (across the ears), Y = depth (0 = front edge of
base, 40 = back), Z = up (0 = top surface of the base).

Run:  python sheet_metal_1.py   -> writes sheet_metal_1.step / .stl
"""
import math
from pathlib import Path

import cadquery as cq

# --- Parameters (mm) -------------------------------------------------------
T = 1.0                 # sheet thickness
BASE_W = 60.0           # overall width over the ears
BASE_D = 40.0           # base depth
BEND_R = 6.0            # inside bend radius, base -> ears

EAR_DROP = 49.0         # ear length below base top
EAR_R = 20.0            # rounded ear end (= BASE_D / 2)
EAR_HOLE_D = 20.0       # ear hole, concentric with EAR_R

PLATE_W = 48.0          # back plate width
PLATE_H = 80.0          # back plate height above base top
PLATE_TOP_W = 28.0      # width at top after chamfers
CHAMFER_H = 10.0        # vertical size of top chamfers

HOLE_D = 10.0           # 4x holes in back plate
HOLE_PITCH_X = 30.43
HOLE_PITCH_Z = 29.85
HOLE_Z_LOW = 20.7       # lower hole row above base top (scaled from drawing)

RIB_W = 8.0             # lanced gusset strap / slot width (scaled)
RIB_DEPTH = 29.56       # gusset foot distance from plate inner face
RIB_HEIGHT = 49.26      # gusset attachment height on plate
SLOT_PLATE_TOP = 51.0   # top of slot in back plate (scaled)
SLOT_BASE_FRONT = 11.0  # front end of slot in base, from front edge (scaled)


def build() -> cq.Workplane:
    half = BASE_W / 2
    ri, ro = BEND_R, BEND_R + T
    cx = half - T - ri          # bend centre X
    cz = -T - ri                # bend centre Z
    ear_c_z = -EAR_DROP + EAR_R  # ear arc / hole centre Z
    s = math.sqrt(0.5)

    # U cross-section (base + two ears with bends), drawn in XZ, extruded in Y
    prof = (
        cq.Workplane("XZ")
        .moveTo(-cx, 0)
        .lineTo(cx, 0)
        .threePointArc((cx + ro * s, cz + ro * s), (half, cz))
        .lineTo(half, ear_c_z)
        .lineTo(half - T, ear_c_z)
        .lineTo(half - T, cz)
        .threePointArc((cx + ri * s, cz + ri * s), (cx, -T))
        .lineTo(-cx, -T)
        .threePointArc((-cx - ri * s, cz + ri * s), (-half + T, cz))
        .lineTo(-half + T, ear_c_z)
        .lineTo(-half, ear_c_z)
        .lineTo(-half, cz)
        .threePointArc((-cx - ro * s, cz + ro * s), (-cx, 0))
        .close()
        .extrude(-BASE_D)       # XZ normal is -Y, so this goes +Y
    )

    # Rounded ear ends + ear holes
    for x0 in (half - T, -half):
        disc = (
            cq.Workplane("YZ", origin=(x0, 0, 0))
            .center(BASE_D / 2, ear_c_z)
            .circle(EAR_R)
            .extrude(T)
        )
        prof = prof.union(disc)
    prof = prof.cut(
        cq.Workplane("YZ", origin=(-half - 1, 0, 0))
        .center(BASE_D / 2, ear_c_z)
        .circle(EAR_HOLE_D / 2)
        .extrude(BASE_W + 2)
    )

    # Back plate with chamfered top
    c = (PLATE_W - PLATE_TOP_W) / 2
    pw = PLATE_W / 2
    plate = (
        cq.Workplane("XZ", origin=(0, BASE_D, 0))
        .polyline([(-pw, -T), (pw, -T), (pw, PLATE_H - CHAMFER_H),
                   (pw - c, PLATE_H), (-pw + c, PLATE_H),
                   (-pw, PLATE_H - CHAMFER_H)])
        .close()
        .extrude(T)             # -> Y from BASE_D - T to BASE_D
    )
    body = prof.union(plate)

    # 4x holes in back plate
    pts = [(sx * HOLE_PITCH_X / 2, HOLE_Z_LOW + k * HOLE_PITCH_Z)
           for sx in (-1, 1) for k in (0, 1)]
    body = body.cut(
        cq.Workplane("XZ", origin=(0, BASE_D + 1, 0))
        .pushPoints(pts).circle(HOLE_D / 2).extrude(T + 2)
    )

    # Lance slots in plate and base (rounded at the free end)
    # Each slot is drawn overlong (rounded both ends) and clipped at the
    # bend so only the free end stays rounded.
    lp = SLOT_PLATE_TOP + T + RIB_W
    body = body.cut(
        cq.Workplane("XZ", origin=(0, BASE_D + 1, 0))
        .center(0, SLOT_PLATE_TOP - lp / 2)
        .slot2D(lp, RIB_W, angle=90)
        .extrude(T + 2)
        .intersect(cq.Workplane().box(RIB_W, 10, 100, centered=(True, False, False))
                   .translate((0, BASE_D - 5, -T)))
    )
    lb = BASE_D - SLOT_BASE_FRONT + RIB_W
    body = body.cut(
        cq.Workplane("XY", origin=(0, 0, -T - 1))
        .center(0, SLOT_BASE_FRONT + lb / 2)
        .slot2D(lb, RIB_W, angle=90)
        .extrude(T + 2)
        .intersect(cq.Workplane().box(RIB_W, BASE_D, 10, centered=(True, False, True)))
    )

    # Diagonal gusset strap from plate inner face to base top
    ang = math.atan2(RIB_HEIGHT, RIB_DEPTH)
    y_top, y_foot = BASE_D - T, BASE_D - T - RIB_DEPTH
    strap = (
        cq.Workplane("YZ", origin=(-RIB_W / 2, 0, 0))
        .polyline([(y_top, RIB_HEIGHT), (y_foot, 0),
                   (y_foot + T / math.sin(ang), 0),
                   (y_top, RIB_HEIGHT - T / math.cos(ang))])
        .close()
        .extrude(RIB_W)
    )
    return body.union(strap)


if __name__ == "__main__":
    out = Path(__file__).with_suffix("")
    part = build()
    cq.exporters.export(part, f"{out}.step")
    cq.exporters.export(part, f"{out}.stl")
    bb = part.val().BoundingBox()
    print(f"bbox X {bb.xmin:.2f}..{bb.xmax:.2f}  Y {bb.ymin:.2f}..{bb.ymax:.2f}  "
          f"Z {bb.zmin:.2f}..{bb.zmax:.2f}  vol {part.val().Volume():.1f} mm3  "
          f"valid {part.val().isValid()}  solids {part.solids().size()}")
