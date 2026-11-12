#!/usr/bin/env python3
"""Synthetic camera fixtures for the capture-advice benchmark. NON-CLINICAL sources only.

Source photos come from scripts/camera/fetch-cc0-sources.mjs (Wikimedia Commons, CC0 or public domain).
For every (source set, scenario) it writes:
  <out>/<set>-<scenario>.y4m   640x480 @ 10 fps, fed to Chromium with --use-file-for-fake-video-capture
  <out>/<set>-<scenario>.bin   128x128 RGBA frames (uint8) cropped exactly like guideCropRect() in the app
  <out>/<set>-<scenario>.json  ground truth: expected advice and frame count

Run with an isolated interpreter that has numpy and Pillow, for example:
  /tmp/bench-deps/venv/bin/python -I scripts/camera/make-fixture-videos.py --sources /tmp/camera-bench/sources --out /tmp/camera-bench/videos
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

W, H = 640, 480
PAD = 16          # canvas margin so hand-shake translations never expose an edge
SHAKE_BOUND = 10  # max excursion of the view from its rest position, in pixels (raised to the step size if larger)
FPS = 10
FRAMES = 120      # 12 s
ANALYSIS = 128
CROP_FRACTION = 0.72  # must match GUIDE_CROP_FRACTION in src/core/capture/constants.ts
CROP_SIDE = int(math.floor(min(W, H) * CROP_FRACTION))  # guide crop side in video pixels (345)

SETS = {
    "calib": {"subject": "cat", "texture": "gravel"},
    "holdout": {"subject": "coffee", "texture": "sand"},
    # Never used to choose a threshold: scored once, with the rules frozen.
    "test": {"subject": "cat2", "texture": "granite"},
}


@dataclass(frozen=True)
class Scenario:
    name: str
    expected: str
    size: float = 0.6            # subject diameter as a share of the guide crop side
    offset: tuple[float, float] = (0.0, 0.0)  # subject centre offset, as a share of the guide crop side
    gain: float = 1.0
    blur_sigma: float = 0.0
    motion_length: int = 0       # static horizontal motion blur, px
    glare_spots: int = 0
    shake: tuple[int, int] | None = None  # per-frame |delta| range in px (integer vectors)
    # Modelled auto-exposure hunting: per-frame gain drawn iid from N(0, sd), clipped to +-3 sd. NOT measured on
    # a phone; it stands in for the exposure/white-balance drift that phones show between frames.
    exposure_jitter: float = 0.0


SCENARIOS = [
    Scenario("sharp", "none"),
    Scenario("handshake", "none", shake=(1, 4)),
    Scenario("blurred", "check-focus", blur_sigma=5.0),
    Scenario("motionblur", "check-focus", motion_length=15),
    Scenario("dark", "more-light", gain=0.2),
    Scenario("overexposed", "less-light", gain=2.4),
    Scenario("glare", "avoid-glare", glare_spots=3),
    Scenario("small", "closer", size=0.3),
    Scenario("toofar", "farther", size=1.1),
    Scenario("offcenter", "center-area", size=0.5, offset=(0.22, -0.1)),
    Scenario("sustained", "hold-still", shake=(7, 9)),
    Scenario("steady-ae", "none", exposure_jitter=0.02),
    Scenario("handshake-ae", "none", shake=(1, 4), exposure_jitter=0.02),
]

# Sweep variants for offline threshold work (bins only, no y4m).
SWEEP = [
    Scenario("shake1", "none", shake=(1, 1)),
    Scenario("shake2", "none", shake=(2, 2)),
    Scenario("shake3", "none", shake=(3, 3)),
    Scenario("shake4", "none", shake=(4, 4)),
    Scenario("shake5", "none", shake=(5, 5)),
    Scenario("shake6", "none", shake=(6, 6)),
    Scenario("shake8", "hold-still", shake=(8, 8)),
    Scenario("shake12", "hold-still", shake=(12, 12)),
    Scenario("blur2", "check-focus", blur_sigma=2.0),
    Scenario("blur3", "check-focus", blur_sigma=3.0),
    Scenario("blur4", "check-focus", blur_sigma=4.0),
    Scenario("dark2", "more-light", gain=0.35),
    Scenario("dark3", "more-light", gain=0.5),
    Scenario("over2", "less-light", gain=1.6),
    Scenario("over3", "less-light", gain=2.0),
    Scenario("glare1", "avoid-glare", glare_spots=1),
    Scenario("small2", "closer", size=0.4),
    Scenario("small3", "closer", size=0.5),
    Scenario("far2", "farther", size=0.95),
    Scenario("off2", "center-area", size=0.5, offset=(0.12, 0.0)),
    Scenario("off3", "center-area", size=0.5, offset=(0.2, 0.0)),
    Scenario("dim", "none", gain=0.6),
    Scenario("dimmer", "none", gain=0.45),
]


def load_rgb(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def square_crop(img: Image.Image, side: int) -> Image.Image:
    w, h = img.size
    m = min(w, h)
    img = img.crop(((w - m) // 2, (h - m) // 2, (w - m) // 2 + m, (h - m) // 2 + m))
    return img.resize((side, side), Image.LANCZOS)


def background(texture: Image.Image, rng: np.random.Generator) -> np.ndarray:
    """Smooth, low-contrast backdrop from a real texture so only the subject carries detail."""
    cw, ch = W + 2 * PAD, H + 2 * PAD
    tex = texture.resize((cw, ch), Image.LANCZOS).filter(ImageFilter.GaussianBlur(10))
    arr = np.asarray(tex, dtype=np.float64)
    mean = arr.mean(axis=(0, 1), keepdims=True)
    arr = mean + (arr - mean) * 0.25
    shift = 150.0 - arr.mean()
    return np.clip(arr + shift + rng.normal(0, 0.6, arr.shape), 0, 255)


def compose(sc: Scenario, subject_img: Image.Image, texture_img: Image.Image, rng: np.random.Generator) -> np.ndarray:
    canvas = background(texture_img, rng)
    diameter = int(round(sc.size * CROP_SIDE))
    subject = np.asarray(square_crop(subject_img, diameter), dtype=np.float64)
    yy, xx = np.mgrid[0:diameter, 0:diameter]
    radius = diameter / 2
    dist = np.hypot((xx - radius + 0.5) / radius, (yy - radius + 0.5) / radius)
    alpha = np.clip((1.0 - dist) * radius / 3.0, 0, 1)[..., None]
    cx = PAD + W / 2 + sc.offset[0] * CROP_SIDE
    cy = PAD + H / 2 + sc.offset[1] * CROP_SIDE
    x0, y0 = int(round(cx - radius)), int(round(cy - radius))
    xa, ya = max(0, x0), max(0, y0)
    xb, yb = min(canvas.shape[1], x0 + diameter), min(canvas.shape[0], y0 + diameter)
    sub = subject[ya - y0: yb - y0, xa - x0: xb - x0]
    a = alpha[ya - y0: yb - y0, xa - x0: xb - x0]
    canvas[ya:yb, xa:xb] = canvas[ya:yb, xa:xb] * (1 - a) + sub * a
    if sc.glare_spots:
        add_glare(canvas, sc.glare_spots, (cx, cy), radius, rng)
    canvas = canvas * sc.gain
    if sc.motion_length:
        canvas = box_blur_horizontal(canvas, sc.motion_length)
    if sc.blur_sigma:
        img = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))
        canvas = np.asarray(img.filter(ImageFilter.GaussianBlur(sc.blur_sigma)), dtype=np.float64)
    return canvas


def add_glare(canvas: np.ndarray, spots: int, centre: tuple[float, float], radius: float, rng: np.random.Generator) -> None:
    """Specular highlights: saturated discs with a soft edge, placed on the subject."""
    yy, xx = np.mgrid[0:canvas.shape[0], 0:canvas.shape[1]]
    for _ in range(spots):
        angle, r = rng.uniform(0, 2 * math.pi), radius * rng.uniform(0.2, 0.6)
        gx, gy = centre[0] + r * math.cos(angle), centre[1] + r * math.sin(angle)
        spot_r = rng.uniform(18, 30)
        d = np.hypot(xx - gx, yy - gy)
        weight = np.clip((spot_r + 3 - d) / 6, 0, 1)
        canvas[:] = canvas * (1 - weight[..., None]) + 255 * weight[..., None]


def box_blur_horizontal(canvas: np.ndarray, length: int) -> np.ndarray:
    kernel = np.ones(length) / length
    padded = np.pad(canvas, ((0, 0), (length // 2, length // 2), (0, 0)), mode="edge")
    out = np.zeros_like(canvas)
    for k, w in enumerate(kernel):
        out += padded[:, k:k + canvas.shape[1], :] * w
    return out


def shake_path(sc: Scenario, rng: np.random.Generator) -> list[tuple[int, int]]:
    """Integer view offsets. Each step moves by an integer vector whose length is within the range;
    the view is kept inside SHAKE_BOUND by reversing the step, so the motion stays bounded."""
    lo, hi = sc.shake or (0, 0)
    bound = max(SHAKE_BOUND, hi)  # a step larger than the bound could never be placed
    path = [(0, 0)]
    px, py = 0, 0
    for _ in range(FRAMES - 1):
        while True:  # rejection sampling: the step length is in [lo, hi] and the new view stays in bounds
            dx, dy = int(rng.integers(-hi, hi + 1)), int(rng.integers(-hi, hi + 1))
            if not lo <= math.hypot(dx, dy) <= hi:
                continue
            if abs(px + dx) <= bound and abs(py + dy) <= bound:
                break
        px, py = px + dx, py + dy
        path.append((px, py))
    return path


def render_frame(static: np.ndarray, offset: tuple[int, int], rng: np.random.Generator, gain: float = 1.0) -> np.ndarray:
    ox, oy = offset
    view = static[PAD + oy: PAD + oy + H, PAD + ox: PAD + ox + W]
    noisy = view * gain + rng.normal(0, 2.0, view.shape)
    return np.clip(np.round(noisy), 0, 255).astype(np.uint8)


def analysis_crop(frame: np.ndarray) -> np.ndarray:
    side = int(math.floor(min(W, H) * CROP_FRACTION))
    sx, sy = (W - side) // 2, (H - side) // 2
    img = Image.fromarray(frame[sy:sy + side, sx:sx + side])
    small = np.asarray(img.resize((ANALYSIS, ANALYSIS), Image.BILINEAR), dtype=np.uint8)
    rgba = np.empty((ANALYSIS, ANALYSIS, 4), dtype=np.uint8)
    rgba[..., :3] = small
    rgba[..., 3] = 255
    return rgba


def write_y4m(frames: list[np.ndarray], path: Path) -> None:
    assert all(f.shape == (H, W, 3) for f in frames), "every frame must be 640x480 RGB"
    cmd = ["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-pix_fmt", "yuv420p", "-f", "yuv4mpegpipe", str(path)]
    subprocess.run(cmd, input=b"".join(f.tobytes() for f in frames), check=True)
    count = subprocess.run(
        ["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
         "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    assert int(count) == len(frames), f"{path.name}: wrote {count} frames, expected {len(frames)}"


def build(set_name: str, sc: Scenario, sources: Path, out: Path, with_video: bool) -> None:
    subject_id, texture_id = SETS[set_name]["subject"], SETS[set_name]["texture"]
    subject_img = load_rgb(sources / f"{subject_id}.jpg")
    texture_img = load_rgb(sources / f"{texture_id}.jpg")
    seed = 20261106 + sum(map(ord, sc.name)) + (0 if set_name == "calib" else 7919)
    rng = np.random.default_rng(seed)
    static = compose(sc, subject_img, texture_img, rng)
    path = shake_path(sc, rng) if sc.shake else [(0, 0)] * FRAMES
    gains = np.clip(1 + rng.normal(0, sc.exposure_jitter, FRAMES), 1 - 3 * sc.exposure_jitter, 1 + 3 * sc.exposure_jitter) if sc.exposure_jitter else np.ones(FRAMES)
    frames = [render_frame(static, offset, rng, float(g)) for offset, g in zip(path, gains)]
    stem = f"{set_name}-{sc.name}"
    bins = np.stack([analysis_crop(f) for f in frames])
    bins.tofile(out / f"{stem}.bin")
    if with_video:
        write_y4m(frames, out / f"{stem}.y4m")
    truth = {
        "scenario": sc.name, "set": set_name, "expected": sc.expected, "frames": FRAMES, "fps": FPS,
        "subject": subject_id, "texture": texture_id, "analysisEdge": ANALYSIS,
        "shakeRangePx": list(sc.shake) if sc.shake else None,
        "maxStepPx": float(max((math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(path, path[1:])), default=0.0)),
        "videoEncoding": "yuv420p y4m 640x480" if with_video else None,
        "source": "Wikimedia Commons CC0 / public domain photographs (see manifest.json)",
    }
    (out / f"{stem}.json").write_text(json.dumps(truth, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sources", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--sweep", action="store_true", help="also write bins-only sweep variants")
    parser.add_argument("--sets", default=",".join(SETS), help="comma-separated source sets to write")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for set_name in args.sets.split(","):
        for sc in SCENARIOS:
            build(set_name, sc, args.sources, args.out, with_video=True)
        if args.sweep:
            for sc in SWEEP:
                build(set_name, sc, args.sources, args.out, with_video=False)
    n_sets = len(args.sets.split(","))
    print(f"wrote {n_sets * len(SCENARIOS)} scenario videos" + (f" and {n_sets * len(SWEEP)} sweep bins" if args.sweep else ""))


if __name__ == "__main__":
    main()
