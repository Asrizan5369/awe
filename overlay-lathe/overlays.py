import math, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS, DUR = 1920, 1080, 30, 8.0
N = int(FPS * DUR)
GREEN = (0, 255, 0); WHITE=(255,255,255); YEL=(255,211,42); BLUE=(49,91,255); DARK=(20,34,29)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
OUT = "/home/user/awe/overlay-lathe"

def font(s): return ImageFont.truetype(FONT, s)

def text_sprite(t, size=80, fill=WHITE):
    f = font(size); b = f.getbbox(t, stroke_width=6)
    im = Image.new("RGBA", (b[2]-b[0]+8, b[3]-b[1]+8), (0,0,0,0))
    ImageDraw.Draw(im).text((4-b[0], 4-b[1]), t, font=f, fill=fill, stroke_width=6, stroke_fill=DARK)
    return im

def box_sprite(t, size=72, bg=BLUE, fg=WHITE, pad=28):
    f = font(size); b = f.getbbox(t, stroke_width=4)
    w, h = b[2]-b[0]+2*pad, b[3]-b[1]+2*pad
    im = Image.new("RGBA", (w+10, h+10), (0,0,0,0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((5,5,w+5,h+5), 18, fill=bg, outline=DARK, width=6)
    d.text((5+pad-b[0], 5+pad-b[1]), t, font=f, fill=fg, stroke_width=(0 if fg==DARK else 4), stroke_fill=DARK)
    return im

def arrow_sprite(length, thick, color, direction="left"):
    head = thick*2.2; hl = thick*1.8
    im = Image.new("RGBA", (int(length)+20, int(head)+20), (0,0,0,0)); d = ImageDraw.Draw(im)
    cy = im.height/2; x0, x1 = 10, 10+length
    pts = [(x0,cy),(x0+hl,cy-head/2),(x0+hl,cy-thick/2),(x1,cy-thick/2),(x1,cy+thick/2),(x0+hl,cy+thick/2),(x0+hl,cy+head/2)]
    d.polygon(pts, fill=color, outline=DARK, width=6)
    if direction == "down": im = im.rotate(90, expand=True)
    return im

def curved_sprite(r=90, thick=28, color=YEL):
    s = int(2*r+4*thick); im = Image.new("RGBA", (s,s), (0,0,0,0)); d = ImageDraw.Draw(im)
    c = s/2; pts_o, pts_i = [], []
    for a in np.linspace(0, 270, 60):
        ra = math.radians(a)
        pts_o.append((c+(r+thick/2)*math.cos(ra), c+(r+thick/2)*math.sin(ra)))
        pts_i.append((c+(r-thick/2)*math.cos(ra), c+(r-thick/2)*math.sin(ra)))
    ra = math.radians(270); ex, ey = c+r*math.cos(ra), c+r*math.sin(ra)
    tip = [(ex-thick*1.1, ey), (ex+thick*1.6, ey-thick*1.1+thick*1.1), (ex-thick*1.1, ey)]
    head = [(ex, ey-thick*1.2), (ex, ey+thick*1.2), (ex+thick*1.6, ey)]
    d.polygon(pts_o+pts_i[::-1], fill=color, outline=DARK, width=6)
    d.polygon(head, fill=color, outline=DARK, width=6)
    return im

def ease(x): x=max(0,min(1,x)); return 1-(1-x)**3

class El:
    def __init__(s, spr, cx, cy, t_in, t_out=None, path=None, spin=None):
        s.spr, s.cx, s.cy, s.t_in, s.t_out, s.path, s.spin = spr, cx, cy, t_in, t_out, path, spin
    def draw(s, frame, t):
        if t < s.t_in: return
        spr = s.spr
        if s.spin: spr = spr.rotate(-s.spin*(t-s.t_in), resample=Image.BICUBIC)
        sc = ease((t-s.t_in)/0.3)
        if sc <= 0.02: return
        cx, cy = s.cx, s.cy
        if s.path:
            (a,b,dx,dy) = s.path; k = ease((t-a)/(b-a)) if t>a else 0
            cx += dx*k; cy += dy*k
        if s.t_out is not None and t > s.t_out:
            k = ease((t-s.t_out)/0.5); cy -= 520*k
        if sc < 1: spr = spr.resize((max(1,int(spr.width*sc)), max(1,int(spr.height*sc))), Image.BICUBIC)
        a = spr.split()[3].point(lambda v: 255 if v > 128 else 0)  # hard edge: no blending with green
        frame.paste(spr.convert("RGB"), (int(cx-spr.width/2), int(cy-spr.height/2)), a)

def render(name, els):
    path = f"{OUT}/{name}"
    p = subprocess.Popen([FF,"-y","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-",
        "-c:v","libx264","-pix_fmt","yuv420p","-crf","12","-an","-movflags","+faststart",path], stdin=subprocess.PIPE)
    for i in range(N):
        t = i/FPS; fr = Image.new("RGB",(W,H),GREEN)
        for e in els: e.draw(fr, t)
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait()

# Scene 02: Headstock + Chuck
render("scene-02-overlay.mp4", [
    El(text_sprite("Headstock",90), 420, 140, 0.5),
    El(text_sprite("Chuck",90), 820, 110, 4.0),
    El(arrow_sprite(110,30,YEL,"down"), 820, 250, 4.0),
])
# Scene 03: Tailstock
render("scene-03-overlay.mp4", [
    El(text_sprite("Tailstock",90), 1400, 140, 0.5),
    El(arrow_sprite(110,30,YEL,"down"), 1400, 280, 0.5),
])
# Scene 04: Carriage arrow moving left + Bed label
render("scene-04-overlay.mp4", [
    El(arrow_sprite(300,40,YEL), 1500, 230, 0.5, 7.5, path=(1.0,4.0,-400,0)),
    El(text_sprite("Carriage",80), 1500, 110, 0.5, 7.5, path=(1.0,4.0,-400,0)),
    El(box_sprite("Bed",72), 760, 120, 4.5, 7.5),
    El(arrow_sprite(90,30,YEL,"down"), 760, 270, 4.5, 7.5),
])
# Scene 05: rotation + straight movement
render("scene-05-overlay.mp4", [
    El(curved_sprite(), 380, 180, 1.0, 7.5, spin=180),
    El(text_sprite("Berputar",80), 680, 180, 1.0, 7.5),
    El(arrow_sprite(420,40,BLUE), 1500, 250, 3.0, 7.5, path=(3.3,5.5,-150,0)),
    El(text_sprite("Bergerak lurus",80), 1500, 120, 3.0, 7.5, path=(3.3,5.5,-150,0)),
])
# Scene 06: answer options + highlight B
opts = [("A Headstock",400),("B Tailstock",960),("C Carriage",1520)]
els = [El(box_sprite(t,56), x, 160, 2.5+0.3*i) for i,(t,x) in enumerate(opts)]
els.append(El(box_sprite("B Tailstock",56,bg=YEL,fg=DARK), 960, 160, 7.0))
render("scene-06-overlay.mp4", els)
print("done")
