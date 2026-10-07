# sheet metal 1 — parametric model

CadQuery model of the "sheet metal 1" bracket drawing (1 mm sheet, A3 @ 1:2).

```
pip install cadquery
python sheet_metal_1.py      # regenerates sheet_metal_1.step / .stl
```

All dimensions are parameters at the top of `sheet_metal_1.py`.

Values taken from the drawing: 48/28 plate width, 80 plate height, 10 chamfer,
4x Ø10 at 30.43 x 29.85, 60 x 40 base, R6 bends, 49 ear drop, R20 ear ends,
Ø20 ear holes, gusset 29.56 x 49.26.

Assumed (scaled from the drawing, not dimensioned): lower hole row 20.7 above
base, gusset/slot width 8, plate slot top at 51, base slot front end 11 from
the front edge. Ear holes are taken as concentric with the R20 ends. The
plate-to-base junction is modelled sharp.

The model is a plain solid (not a CadQuery sheet-metal feature), so no flat
pattern is generated.
