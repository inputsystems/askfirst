#!/usr/bin/env python3
"""
Generate animated terminal demo GIFs of askfirst explaining a risky command,
in any supported locale. Pure Pillow — no terminal-recording tools.

Every string is read from scripts/demo-strings/<locale>.json, which is produced
by `npx tsx scripts/demo-data.ts all` straight from the shipped locale packs.
The layout is "label-light": colour + symbols carry the meaning (red dot = stop,
green + = benefit, amber - = caution, blue -> = what to do), so the frames are
fully localized with zero hand-translation.

Usage:
    npx tsx scripts/demo-data.ts all
    python3 scripts/make-demo-gif.py en          # one locale -> docs/demo.gif
    python3 scripts/make-demo-gif.py all         # every locale -> docs/demo.<locale>.gif (en -> docs/demo.gif)
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

try:
    import arabic_reshaper
    from bidi.algorithm import get_display
    HAVE_BIDI = True
except Exception:
    HAVE_BIDI = False

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STRINGS = os.path.join(HERE, "demo-strings")
DOCS = os.path.join(ROOT, "docs")

# ---- palette --------------------------------------------------------------
BG = (21, 22, 30)
TITLE_BG = (32, 33, 43)
DOTS = [(255, 95, 86), (255, 189, 46), (39, 201, 63)]
C_PROMPT = (110, 231, 183)
C_CMD = (231, 232, 240)
C_HEAD = (244, 246, 252)   # the plain headline
C_MUTED = (150, 158, 178)  # why
C_GREEN = (95, 215, 135)
C_AMBER = (240, 168, 104)
C_BLUE = (108, 182, 255)
C_RED = (255, 107, 107)
C_DIM = (120, 128, 148)

# ---- geometry -------------------------------------------------------------
W = 700
PAD = 26
TITLEBAR = 38
FONT_SIZE = 17
MONO_SIZE = 16
LINE_H = 25
GAP = 12  # extra space between blocks

MONO = "/System/Library/Fonts/Menlo.ttc"

# per-locale body font (proportional reads better than monospace for prose)
LATIN = "/System/Library/Fonts/Menlo.ttc"
FONTS = {
    "ja": "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "ko": "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "zh": "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "zh-Hant": "/System/Library/Fonts/STHeiti Medium.ttc",
    "ar": "/System/Library/Fonts/SFArabic.ttf",
    "he": "/System/Library/Fonts/SFHebrew.ttf",
    "hi": "/System/Library/Fonts/Kohinoor.ttc",
}
RTL = {"ar", "he"}
CJK = {"ja", "ko", "zh", "zh-Hant"}


def load_fonts(locale):
    path = FONTS.get(locale, LATIN)
    body = ImageFont.truetype(path, FONT_SIZE, index=0)
    try:
        head = ImageFont.truetype(path, FONT_SIZE, index=1)  # bold if the .ttc has it
    except Exception:
        head = body
    mono = ImageFont.truetype(MONO, MONO_SIZE, index=0)
    mono_b = ImageFont.truetype(MONO, MONO_SIZE, index=1)
    return body, head, mono, mono_b


def shape(locale, text):
    """Apply Arabic reshaping + bidi reordering for RTL scripts."""
    if locale in RTL and HAVE_BIDI:
        if locale == "ar":
            text = arabic_reshaper.reshape(text)
        return get_display(text)
    return text


def wrap(text, font, max_w, locale):
    """Wrap to pixel width. CJK has no spaces, so wrap by character."""
    lines = []
    if locale in CJK:
        cur = ""
        for ch in text:
            if font.getlength(cur + ch) <= max_w:
                cur += ch
            else:
                lines.append(cur)
                cur = ch
        if cur:
            lines.append(cur)
    else:
        cur = ""
        for word in text.split():
            trial = (cur + " " + word).strip()
            if font.getlength(trial) <= max_w:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                cur = word
        if cur:
            lines.append(cur)
    return lines or [""]


def build_blocks(data, body, head, locale):
    """Return a flat list of render items: (kind, text, color, indent)."""
    text_w = W - PAD * 2
    items = []

    def add(kind, text, color, indent=0, font=body, marker=None, mcolor=None):
        avail = text_w - indent - (22 if marker else 0)
        for i, ln in enumerate(wrap(text, font, avail, locale)):
            items.append({
                "kind": kind, "text": ln, "color": color, "indent": indent,
                "font": font, "marker": marker if i == 0 else None, "mcolor": mcolor,
            })

    add("head", data["plain"], C_HEAD, indent=24, font=head, marker="dot", mcolor=C_RED)
    add("muted", data["why"], C_MUTED, indent=24)
    items.append({"kind": "gap"})
    for b in data["benefits"]:
        add("ben", b, C_CMD, indent=24, marker="+", mcolor=C_GREEN)
    for t in data["tradeoffs"]:
        add("tra", t, C_CMD, indent=24, marker="-", mcolor=C_AMBER)
    items.append({"kind": "gap"})
    add("step", data["step"], C_CMD, indent=24, marker=">", mcolor=C_BLUE)
    return items


def render(data, reveal_blocks, typed, cursor):
    locale = data["locale"]
    body, head, mono, mono_b = load_fonts(locale)
    items = build_blocks(data, body, head, locale)

    # measure height
    n_rows = 1  # command line
    rows = []
    for it in items:
        if it["kind"] == "gap":
            rows.append(it)
        else:
            rows.append(it)
    height = TITLEBAR + PAD + LINE_H  # title + command line
    for it in rows:
        height += GAP if it["kind"] == "gap" else LINE_H
    height += PAD
    height = int(height)

    img = Image.new("RGB", (W, height), BG)
    d = ImageDraw.Draw(img)
    # title bar
    d.rectangle([0, 0, W, TITLEBAR], fill=TITLE_BG)
    for i, col in enumerate(DOTS):
        cx, cy = 20 + i * 22, TITLEBAR // 2
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=col)
    tw = mono.getlength("askfirst")
    d.text((W / 2 - tw / 2, TITLEBAR / 2 - 9), "askfirst", font=mono, fill=C_DIM)

    # command line (always LTR, monospace, ASCII)
    y = TITLEBAR + PAD
    d.text((PAD, y), "❯", font=mono_b, fill=C_PROMPT)
    cmd = f'askfirst "{data["action"]}"'
    shown = cmd[:typed] if typed is not None else cmd
    d.text((PAD + mono.getlength("  "), y), shown, font=mono, fill=C_CMD)
    if cursor:
        cx = PAD + mono.getlength("  ") + mono.getlength(shown)
        d.rectangle([cx, y + 2, cx + 9, y + MONO_SIZE + 3], fill=C_CMD)

    # revealed content blocks
    y += LINE_H
    shown_rows = rows[:reveal_blocks]
    rtl = locale in RTL
    for it in shown_rows:
        if it["kind"] == "gap":
            y += GAP
            continue
        f = it["font"]
        txt = shape(locale, it["text"])
        marker = it["marker"]
        # markers are always drawn in Menlo (mono_b) so +/-/arrow never tofu in
        # fonts that lack those symbols (CJK, Arabic, Hebrew, Devanagari).
        if rtl:
            right = W - PAD
            if marker:
                if marker == "dot":
                    d.ellipse([right - 14, y + 6, right, y + 20], fill=it["mcolor"])
                else:
                    msym = {"+": "+", "-": "−", ">": "←"}[marker]
                    mw = mono_b.getlength(msym)
                    d.text((right - mw, y + 1), msym, font=mono_b, fill=it["mcolor"])
                right -= 22
            tw = f.getlength(txt)
            d.text((right - tw, y), txt, font=f, fill=it["color"])
        else:
            x = PAD + it["indent"]
            if marker:
                mx = PAD + 4
                if marker == "dot":
                    d.ellipse([mx, y + 6, mx + 14, y + 20], fill=it["mcolor"])
                else:
                    msym = {"+": "+", "-": "−", ">": "→"}[marker]
                    d.text((mx, y + 1), msym, font=mono_b, fill=it["mcolor"])
            d.text((x, y), txt, font=f, fill=it["color"])
        y += LINE_H
    return img


def make(locale):
    with open(os.path.join(STRINGS, f"{locale}.json"), encoding="utf-8") as fh:
        data = json.load(fh)

    cmd = f'askfirst "{data["action"]}"'

    # count rows for reveal
    body, head, _, _ = load_fonts(locale)
    rows = build_blocks(data, body, head, locale)
    n_rows = len(rows)

    frames, durations = [], []

    # Phase 1: type the command
    for n in range(0, len(cmd) + 1, 3):
        frames.append(render(data, 0, n, (n // 3) % 2 == 0))
        durations.append(70)
    # full command, blink
    for b in range(3):
        frames.append(render(data, 0, len(cmd), b % 2 == 0))
        durations.append(280)

    # Phase 2: reveal content gradually, pausing on each new line so it reads
    for r in range(1, n_rows + 1):
        frames.append(render(data, r, len(cmd), False))
        # longer pause when the just-revealed row is real text (not a gap)
        durations.append(60 if rows[r - 1]["kind"] == "gap" else 240)

    # Phase 3: long hold on the complete frame
    frames.append(render(data, n_rows, len(cmd), False))
    durations.append(5500)

    out = os.path.join(DOCS, "demo.gif" if locale == "en" else f"demo.{locale}.gif")
    frames[0].save(out, save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, optimize=True, disposal=2)
    kb = os.path.getsize(out) / 1024
    print(f"{locale:8} -> {os.path.relpath(out, ROOT)}  ({len(frames)} frames, {kb:.0f} KB)")


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "en"
    if arg == "all":
        for fn in sorted(os.listdir(STRINGS)):
            if fn.endswith(".json"):
                make(fn[:-5])
    else:
        make(arg)


if __name__ == "__main__":
    main()
