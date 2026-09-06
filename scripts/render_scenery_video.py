#!/usr/bin/env python3
"""Render the original ELSEWHERE still as a subtle, seamless local cinemagraph.
Requires Pillow, numpy, opencv-python-headless and ffmpeg. No generated imagery.

From the project root, regenerate with an isolated environment:
    python3 -m venv .venv-video
    .venv-video/bin/pip install -r scripts/requirements-video.txt
    .venv-video/bin/python scripts/render_scenery_video.py
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
WIDTH, HEIGHT, FPS, SECONDS = 1280, 720, 24, 10
SOURCE = ROOT / 'public/assets/hero-forest.png'
OUTPUT = ROOT / 'public/assets/hero-forest-loop.mp4'
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
(ROOT / 'qa').mkdir(parents=True, exist_ok=True)
base = np.array(Image.open(SOURCE).convert('RGB').resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS))
scale = np.array([WIDTH / 1672, HEIGHT / 941], dtype=np.float32)
yy, xx = np.mgrid[:HEIGHT, :WIDTH].astype(np.float32)

def polygon(points):
    mask = np.zeros((HEIGHT, WIDTH), dtype=np.float32)
    cv2.fillPoly(mask, [np.round(np.array(points) * scale).astype(np.int32)], 1.0)
    return mask

# Broad protection contour intentionally includes air outside leaves and hanging vines.
island = polygon([(665,410),(703,317),(819,259),(862,167),(988,139),(1008,89),
 (1210,80),(1290,159),(1428,158),(1444,254),(1559,315),(1591,444),(1530,603),
 (1342,730),(1202,892),(1080,920),(898,776),(773,656),(696,553)])
island = cv2.dilate(island, np.ones((17,17), np.uint8))
cloud_mask = 1 - cv2.GaussianBlur(island, (0,0), 15)
cloud_mask[island > 0] = 0
main_fall = polygon([(974,391),(991,386),(978,420),(968,485),(962,581),(965,641),
 (953,728),(935,752),(931,694),(936,568),(946,451),(958,414)])
small_fall = polygon([(1123,374),(1135,374),(1137,466),(1140,519),(1134,582),
 (1123,625),(1117,613),(1126,561),(1128,507),(1126,445)])
fall_mask = cv2.GaussianBlur(np.maximum(main_fall, small_fall * .6), (0,0), 1.3)
# Only pale original water pixels shimmer; adjacent stone stays fixed.
luminance = base.mean(axis=2) / 255.0
fall_mask *= np.clip((luminance - .19) / .25, 0, 1)
cloud_mask = cloud_mask[...,None]
fall_mask = fall_mask[...,None]
float_base = base.astype(np.float32)

with tempfile.NamedTemporaryFile(prefix='.hero-forest-loop-', suffix='.mp4',
                                 dir=OUTPUT.parent, delete=False) as temporary:
    temporary_output = Path(temporary.name)

cmd = ['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24',
 '-s',f'{WIDTH}x{HEIGHT}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','slow',
 '-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(temporary_output)]
proc = None
try:
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None
    for index in range(FPS * SECONDS):
        phase = 2 * math.pi * index / (FPS * SECONDS)
        # Periodic image-space drift only in sky: one exact cycle per loop.
        cloud_x = xx + (7.0 * math.sin(phase)) * (.8 + .2 * np.sin(yy / 160))
        cloud_y = yy + (2.8 * math.sin(phase + .8) - 2.8 * math.sin(.8)) * (.8 + .2 * np.cos(xx / 230))
        clouds = cv2.remap(base, cloud_x, cloud_y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101).astype(np.float32)
        frame = float_base + (clouds - float_base) * cloud_mask
        # Downward-travelling texture phase stays confined to the two actual falls.
        ripple = np.sin(yy / 8.0 - phase * 14 + .35 * np.sin(xx / 3))
        water = cv2.remap(base, xx, yy + 2.6 * ripple, cv2.INTER_CUBIC,
                          borderMode=cv2.BORDER_REFLECT_101).astype(np.float32)
        glint = (1.8 * ripple + 1.1 * np.sin(yy / 3.4 - phase * 26 + xx / 6))[...,None]
        frame += (water - float_base + glint) * fall_mask
        frame = np.clip(frame,0,255).astype(np.uint8)
        if index in (0, FPS*SECONDS//2, FPS*SECONDS-1):
            Image.fromarray(frame).save(ROOT / f'qa/video-{index:03}.png')
        proc.stdin.write(frame.tobytes())
        if index % FPS == 0:
            print(f'Rendered {index // FPS}/{SECONDS}s', flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError('ffmpeg encode failed')
    probe = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
         '-show_entries', 'stream=codec_name,width,height,pix_fmt,nb_frames',
         '-of', 'json', str(temporary_output)],
        check=True, capture_output=True, text=True,
    )
    stream = json.loads(probe.stdout)['streams'][0]
    expected = {'codec_name': 'h264', 'width': WIDTH, 'height': HEIGHT,
                'pix_fmt': 'yuv420p', 'nb_frames': str(FPS * SECONDS)}
    if any(stream.get(key) != value for key, value in expected.items()):
        raise RuntimeError(f'Unexpected video output: {stream}')
    temporary_output.replace(OUTPUT)
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
        temporary_output.unlink(missing_ok=True)
print(OUTPUT, flush=True)
