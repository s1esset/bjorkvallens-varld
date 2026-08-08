"""Pre-generate real game sound effects with the local MOSS-SoundEffect service.

Mirrors the neural-voice pipeline (scripts/gen-voice.py): idempotent, offline at
runtime, writes one clip per key + a manifest the app loads.

Flow per key in scripts/sfx-phrases.json:
  POST {description, duration} -> http://127.0.0.1:8003/generate  (N takes)
  -> decode WAV, trim silence, pick the best-sounding take, peak-normalize, fade
  -> ffmpeg -> public/audio/sfx/<key>.mp3
  -> rebuild public/audio/sfx/manifest.json from EVERY mp3 in the folder, so
     clips imported by other tools (kenney-sfx.mjs) survive the rebuild

The MOSS service must be running (see services/moss-sfx/README.md). Tiny UI blips
(tap/pling/flip/correct/match/soft) deliberately are NOT listed in the phrases file —
they stay procedural in AudioService.js. Missing keys fall back to synth/voice.

Usage:
  python scripts/gen-sfx.py                      # generate everything missing
  python scripts/gen-sfx.py --force              # regenerate all
  python scripts/gen-sfx.py --only pop,djur_ko   # just these keys
  python scripts/gen-sfx.py --takes 5            # more candidates per key
"""
import argparse
import base64
import io
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import requests
import soundfile as sf

REPO = Path(__file__).resolve().parents[1]


def find_ffmpeg() -> str:
    for cand in (
        "ffmpeg",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe"),
        r"C:\ffmpeg-shared\bin\ffmpeg.exe",
    ):
        try:
            subprocess.run([cand, "-version"], capture_output=True, check=True)
            return cand
        except Exception:
            continue
    raise SystemExit("ffmpeg not found (need it to encode mp3)")


def trim_silence(x: np.ndarray, sr: int, thresh_db: float = -45.0, pad_ms: int = 25) -> np.ndarray:
    if x.size == 0:
        return x
    peak = float(np.max(np.abs(x))) or 1.0
    thresh = peak * (10 ** (thresh_db / 20.0))
    above = np.where(np.abs(x) > thresh)[0]
    if above.size == 0:
        return x
    pad = int(sr * pad_ms / 1000.0)
    s = max(0, int(above[0]) - pad)
    e = min(len(x), int(above[-1]) + pad)
    return x[s:e]


def score_take(x: np.ndarray, sr: int) -> float:
    """Higher is better. Reject silent / too-short / heavily-clipped takes."""
    if x.size < int(sr * 0.05):
        return -1.0
    peak = float(np.max(np.abs(x)))
    if peak < 0.05:
        return -1.0
    rms = float(np.sqrt(np.mean(x ** 2)))
    clip_frac = float(np.mean(np.abs(x) > 0.985))
    score = rms  # present, audible takes win
    if clip_frac > 0.02:
        score *= 0.3  # punish flat-top clipping (harsh)
    if len(x) / sr > 4.0:
        score *= 0.7  # the model rambled
    return score


def normalize_peak(x: np.ndarray, target: float = 0.95) -> np.ndarray:
    peak = float(np.max(np.abs(x)))
    if peak < 1e-6:
        return x
    return x * (target / peak)


def fade(x: np.ndarray, sr: int, fin_ms: float = 5.0, fout_ms: float = 45.0) -> np.ndarray:
    x = x.copy()
    n_in = min(len(x), int(sr * fin_ms / 1000.0))
    n_out = min(len(x), int(sr * fout_ms / 1000.0))
    if n_in > 0:
        x[:n_in] *= np.linspace(0.0, 1.0, n_in, dtype=np.float32)
    if n_out > 0:
        x[-n_out:] *= np.linspace(1.0, 0.0, n_out, dtype=np.float32)
    return x


def request_take(url: str, prompt: str, duration: float):
    r = requests.post(url, json={"description": prompt, "duration": duration}, timeout=180)
    r.raise_for_status()
    d = r.json()
    if not d.get("success"):
        raise RuntimeError(d.get("error", "generation failed"))
    wav = base64.b64decode(d["audio_base64"])
    x, sr = sf.read(io.BytesIO(wav), dtype="float32")
    if x.ndim > 1:
        x = x.mean(axis=1)
    return x.astype(np.float32), int(sr)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--phrases", default=str(REPO / "scripts" / "sfx-phrases.json"))
    ap.add_argument("--out", default=str(REPO / "public" / "audio" / "sfx"))
    ap.add_argument("--url", default=os.environ.get("MOSS_SFX_URL", "http://127.0.0.1:8003") + "/generate")
    ap.add_argument("--takes", type=int, default=3)
    ap.add_argument("--bitrate", default="96k")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", default="")
    args = ap.parse_args()

    ffmpeg = find_ffmpeg()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    phrases = json.loads(Path(args.phrases).read_text(encoding="utf-8"))
    only = {k.strip() for k in args.only.split(",") if k.strip()}
    keys = [k for k in phrases if not k.startswith("_") and (not only or k in only)]

    for key in keys:
        dest = out_dir / f"{key}.mp3"
        if dest.exists() and not args.force:
            print(f"  = {key:14s} (exists, skip)")
            continue

        spec = phrases[key]
        prompt, duration = spec["prompt"], float(spec.get("duration", 2.0))

        best, best_score, best_sr = None, -1.0, 24000
        for t in range(args.takes):
            try:
                x, sr = request_take(args.url, prompt, duration)
            except Exception as e:
                print(f"  ! {key} take {t} failed: {e}")
                continue
            xt = trim_silence(x, sr)
            s = score_take(xt, sr)
            if s > best_score:
                best, best_score, best_sr = xt, s, sr

        if best is None or best_score < 0:
            print(f"  x {key:14s} no usable take (left to fallback)")
            continue

        audio = fade(normalize_peak(best), best_sr)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
            tmpwav = tf.name
        try:
            sf.write(tmpwav, audio, best_sr)
            subprocess.run(
                [ffmpeg, "-y", "-i", tmpwav, "-ac", "1", "-ar", str(best_sr),
                 "-codec:a", "libmp3lame", "-b:a", args.bitrate, str(dest)],
                capture_output=True, check=True,
            )
        finally:
            try:
                os.unlink(tmpwav)
            except OSError:
                pass
        print(f"  + {key:14s} {len(audio)/best_sr:4.2f}s  score={best_score:.4f}  -> {dest.name}")

    # Rebuild the manifest from every mp3 that exists on disk -- NOT from this
    # phrases file. Other tools write clips into the same folder
    # (scripts/kenney-sfx.mjs imports the CC0 UI blips tap/soft/flip); rebuilding
    # from `phrases` alone dropped those keys silently and muted the tap sounds
    # the clip path serves. See ATGARDER V6.
    manifest = {p.stem: p.name for p in sorted(out_dir.glob("*.mp3"))}
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    other = [k for k in manifest if k not in phrases]
    print(f"\nmanifest.json: {len(manifest)} clips -> {out_dir / 'manifest.json'}")
    if other:
        print(f"  (kept {len(other)} clip(s) from other sources: {', '.join(other)})")


if __name__ == "__main__":
    main()
