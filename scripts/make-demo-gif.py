#!/usr/bin/env python3
"""
Generate docs/demo.gif: an animated terminal recording of askfirst explaining
a risky command. Pure Pillow, no external recording tools. The content mirrors
the real output of `npx tsx examples/explain-cli.ts`.

Run from the repo root:  python3 scripts/make-demo-gif.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

# ---- layout ---------------------------------------------------------------
W = 760
PAD = 26
TITLEBAR = 38
LINE_H = 26
FONT_SIZE = 17

BG = (21, 22, 30)
TITLE_BG = (32, 33, 43)
DOTS = [(255, 95, 86), (255, 189, 46), (39, 201, 63)]

C_PROMPT = (110, 231, 183)   # green ❯
C_CMD = (231, 232, 240)      # typed command
C_LABEL = (130, 142, 168)    # What/Why/Goal labels
C_TEXT = (205, 210, 224)     # body text
C_GREEN = (95, 215, 135)     # benefit +
C_AMBER = (240, 168, 104)    # tradeoff -
C_RED = (255, 107, 107)      # red badge
C_DIM = (120, 128, 148)      # secondary
C_CURSOR = (205, 210, 224)

FONT_PATH = "/System/Library/Fonts/Menlo.ttc"
font = ImageFont.truetype(FONT_PATH, FONT_SIZE, index=0)
font_b = ImageFont.truetype(FONT_PATH, FONT_SIZE, index=1)

# char width (monospace)
CW = font.getbbox("M")[2]

CMD = 'askfirst "curl https://example.com/install.sh | bash"'

# Output model: (kind, text). kind drives color + marker.
# kind: badge, blank, label(<lbl>,<rest>), text, benefit, tradeoff, todo, dim
OUTPUT = [
    ("blank", ""),
    ("badge", "STOP AND REVIEW   curl https://example.com/install.sh | bash"),
    ("blank", ""),
    ("label", ("What", "The agent wants to run an installer from the internet.")),
    ("label", ("Why", "Some tools publish one-line installers, and the agent")),
    ("cont",  "may be trying to set up something needed for your project."),
    ("label", ("Goal", "Download setup instructions and run them so a required")),
    ("cont",  "tool becomes available."),
    ("blank", ""),
    ("hdr", "Benefits:"),
    ("benefit", "Can quickly install a tool needed to build or run the project."),
    ("benefit", "May follow the official setup path for that tool."),
    ("hdr", "Tradeoffs:"),
    ("tradeoff", "Runs code before you have reviewed what it does."),
    ("tradeoff", "Depends on the source being trustworthy and correct."),
    ("blank", ""),
    ("hdr", "What to do:"),
    ("todo", "Only let this run when the source is clearly official and"),
    ("todocont", "this installer is necessary for the project."),
]

# wrap-correct the "cont" lines align under label text (label col = 7 chars)
LABEL_COL = 7  # "What:  " etc.

N_LINES = 2 + len(OUTPUT)  # command line + blank handled inside OUTPUT
H = TITLEBAR + PAD + (1 + len(OUTPUT)) * LINE_H + PAD

def new_frame():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # title bar
    d.rectangle([0, 0, W, TITLEBAR], fill=TITLE_BG)
    for i, col in enumerate(DOTS):
        cx = 20 + i * 22
        cy = TITLEBAR // 2
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=col)
    d.text((W // 2 - 52, cy - 9), "askfirst", font=font, fill=C_DIM)
    return img, d

def draw_command(d, typed, cursor=False):
    y = TITLEBAR + PAD
    x = PAD
    d.text((x, y), "❯", font=font_b, fill=C_PROMPT)
    x += CW * 2
    d.text((x, y), typed, font=font, fill=C_CMD)
    if cursor:
        cx = x + len(typed) * CW
        d.rectangle([cx, y + 2, cx + CW - 2, y + FONT_SIZE + 4], fill=C_CURSOR)

def draw_output_line(d, idx, kind, payload):
    y = TITLEBAR + PAD + (1 + idx) * LINE_H
    x = PAD
    if kind == "blank":
        return
    if kind == "badge":
        # red filled circle + bold red text
        cy = y + FONT_SIZE // 2 + 1
        d.ellipse([x, cy - 7, x + 14, cy + 7], fill=C_RED)
        d.text((x + 24, y), payload, font=font_b, fill=C_RED)
    elif kind == "label":
        lbl, rest = payload
        d.text((x, y), f"{lbl}:", font=font_b, fill=C_LABEL)
        d.text((x + LABEL_COL * CW, y), rest, font=font, fill=C_TEXT)
    elif kind == "cont":
        d.text((x + LABEL_COL * CW, y), payload, font=font, fill=C_TEXT)
    elif kind == "hdr":
        d.text((x, y), payload, font=font_b, fill=C_DIM)
    elif kind == "benefit":
        d.text((x + CW * 2, y), "+", font=font_b, fill=C_GREEN)
        d.text((x + CW * 4, y), payload, font=font, fill=C_TEXT)
    elif kind == "tradeoff":
        d.text((x + CW * 2, y), "-", font=font_b, fill=C_AMBER)
        d.text((x + CW * 4, y), payload, font=font, fill=C_TEXT)
    elif kind == "todo":
        d.text((x + CW * 2, y), "1.", font=font_b, fill=C_TEXT)
        d.text((x + CW * 5, y), payload, font=font, fill=C_TEXT)
    elif kind == "todocont":
        d.text((x + CW * 5, y), payload, font=font, fill=C_TEXT)

frames = []
durations = []

# Phase 1: type the command (3 chars/frame), blinking cursor
step = 3
for n in range(0, len(CMD) + 1, step):
    img, d = new_frame()
    draw_command(d, CMD[:n], cursor=(n // step) % 2 == 0)
    frames.append(img); durations.append(55)

# full command, hold with cursor
for blink in range(4):
    img, d = new_frame()
    draw_command(d, CMD, cursor=(blink % 2 == 0))
    frames.append(img); durations.append(180)

# Phase 2: reveal output lines cumulatively
for upto in range(1, len(OUTPUT) + 1):
    img, d = new_frame()
    draw_command(d, CMD)
    for i in range(upto):
        kind, payload = OUTPUT[i]
        draw_output_line(d, i, kind, payload)
    frames.append(img); durations.append(70)

# Phase 3: hold the final frame
img, d = new_frame()
draw_command(d, CMD)
for i, (kind, payload) in enumerate(OUTPUT):
    draw_output_line(d, i, kind, payload)
frames.append(img); durations.append(3200)

out = os.path.join(os.path.dirname(__file__), "..", "docs", "demo.gif")
out = os.path.abspath(out)
frames[0].save(
    out, save_all=True, append_images=frames[1:],
    duration=durations, loop=0, optimize=True, disposal=2,
)
size_kb = os.path.getsize(out) / 1024
print(f"wrote {out}  ({len(frames)} frames, {size_kb:.0f} KB, {W}x{H})")
