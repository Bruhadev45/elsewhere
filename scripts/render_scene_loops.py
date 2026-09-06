#!/usr/bin/env python3
"""Render seamless ambient loops for the journey scenes.

Unlike render_scenery_video.py — which carries hand-traced polygons for one
specific still — this derives its masks from the image itself, so it works on
any scene. Motion is confined to regions that can be displaced without tearing:
smooth, low-detail areas (sky, mist, water). Detailed architecture and rock stay
locked in place.

    python3 -m venv .venv-video
    .venv-video/bin/pip install -r scripts/requirements-video.txt
    .venv-video/bin/python scripts/render_scene_loops.py
"""
from pathlib import Path
from contextlib import suppress
import json
import math
import subprocess
import tempfile

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets'
WIDTH, HEIGHT, FPS, SECONDS = 1280, 720, 24, 8
FRAMES = FPS * SECONDS

# drift: horizontal sky travel (px). swell: vertical low-region travel (px).
# glow: how much the warm highlights breathe.
SCENES = [
    {'source': 'sky-library.png', 'output': 'sky-library-loop.mp4', 'drift': 6.5, 'swell': 2.2, 'glow': 0.22},
    {'source': 'neon-city.png', 'output': 'neon-city-loop.mp4', 'drift': 5.5, 'swell': 1.8, 'glow': 0.30},
    {'source': 'alien-ocean.png', 'output': 'alien-ocean-loop.mp4', 'drift': 6.0, 'swell': 3.4, 'glow': 0.16},
]

yy, xx = np.mgrid[:HEIGHT, :WIDTH].astype(np.float32)
rows = (yy / HEIGHT).astype(np.float32)


def build_masks(base):
    """Smooth regions move; detailed ones do not."""
    grey = cv2.cvtColor(base, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    # Local detail energy — high on architecture and foliage, low on sky and water.
    detail = cv2.GaussianBlur(np.abs(cv2.Laplacian(grey, cv2.CV_32F, ksize=3)), (0, 0), 9)
    detail /= max(detail.max(), 1e-6)
    smooth = np.clip(1.0 - detail * 5.5, 0, 1)
    smooth = cv2.GaussianBlur(smooth, (0, 0), 11)

    # Sky sits high and bright; water sits low. Both are smooth.
    sky_band = np.clip((0.62 - rows) / 0.5, 0, 1)
    water_band = np.clip((rows - 0.5) / 0.36, 0, 1)
    brightness = np.clip((grey - 0.16) / 0.4, 0, 1)

    sky = smooth * sky_band * brightness
    water = smooth * water_band
    sky = cv2.GaussianBlur(sky, (0, 0), 13)
    water = cv2.GaussianBlur(water, (0, 0), 13)

    # Warm highlights: lanterns, neon, sun. These pulse rather than move.
    red, _, blue = base[..., 0].astype(np.float32), base[..., 1], base[..., 2].astype(np.float32)
    warm = np.clip((red - blue) / 60.0, 0, 1) * np.clip((grey - 0.42) / 0.35, 0, 1)
    warm = cv2.GaussianBlur(warm, (0, 0), 4)
    return sky[..., None], water[..., None], warm[..., None]


def render(scene):
    source = ASSETS / scene['source']
    if not source.exists():
        source = source.with_suffix('.webp')
    output = ASSETS / scene['output']
    base = np.array(Image.open(source).convert('RGB').resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS))
    float_base = base.astype(np.float32)
    sky_mask, water_mask, warm_mask = build_masks(base)

    with tempfile.NamedTemporaryFile(prefix=f".{output.stem}-", suffix='.mp4', dir=output.parent, delete=False) as tmp:
        temporary = Path(tmp.name)

    cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', f'{WIDTH}x{HEIGHT}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow',
           '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(temporary)]
    proc = None
    try:
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        assert proc.stdin is not None
        for index in range(FRAMES):
            # One exact cycle per loop, so the last frame hands back to the first.
            phase = 2 * math.pi * index / FRAMES

            # The sky travels a closed ellipse rather than a sine sweep. A sine passes
            # through zero displacement, where remap returns the source unresampled and
            # therefore sharper than every other frame — that pops at the loop seam.
            # A rotating offset keeps the resample cost constant on every frame.
            drift_x = scene['drift'] * math.cos(phase)
            drift_y = scene['drift'] * 0.42 * math.sin(phase)
            sky_x = xx + drift_x * (0.78 + 0.22 * np.sin(yy / 140.0))
            sky_y = yy + drift_y * (0.8 + 0.2 * np.cos(xx / 210.0))
            skies = cv2.remap(base, sky_x, sky_y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101).astype(np.float32)
            frame = float_base + (skies - float_base) * sky_mask

            # A travelling wave at fixed amplitude: the pattern shifts but never flattens.
            ripple = np.sin(yy / 26.0 - phase * 2 + 0.5 * np.sin(xx / 90.0))
            water = cv2.remap(base, xx + 0.8 * ripple, yy + scene['swell'] * ripple, cv2.INTER_CUBIC,
                              borderMode=cv2.BORDER_REFLECT_101).astype(np.float32)
            frame += (water - float_base) * water_mask

            frame += (26.0 * scene['glow'] * math.sin(phase * 2)) * warm_mask
            proc.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
        proc.stdin.close()
        if proc.wait() != 0:
            raise RuntimeError(f'ffmpeg failed for {output.name}')
        probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                'stream=codec_name,width,height,nb_frames', '-of', 'json', str(temporary)],
                               check=True, capture_output=True, text=True)
        stream = json.loads(probe.stdout)['streams'][0]
        if stream.get('nb_frames') != str(FRAMES) or stream.get('width') != WIDTH:
            raise RuntimeError(f'Unexpected output for {output.name}: {stream}')
        temporary.replace(output)
    finally:
        try:
            if proc is not None:
                if proc.poll() is None:
                    proc.kill()
                proc.wait()
                if proc.stdin is not None and not proc.stdin.closed:
                    with suppress(OSError):
                        proc.stdin.close()
        finally:
            temporary.unlink(missing_ok=True)
    print(f'{output.name}  {output.stat().st_size // 1024} KB', flush=True)


for entry in SCENES:
    render(entry)
