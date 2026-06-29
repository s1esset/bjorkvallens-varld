#!/usr/bin/env python
"""Pre-generera svenska röstklipp (build-time) med lokal F5-TTS (svenska modellen
EkhoCollective/f5-tts-swedish) + röstkloning. Klippen bäddas in i appen och spelas
helt offline i runtime (inga nätanrop när barnet spelar).

Körs med narrator-venvens python (som har f5-tts installerat), t.ex:

  C:/repos/storygen/services/narrator/.venv/Scripts/python.exe scripts/gen-voice.py \
      --phrases scripts/voice-phrases.json \
      --ref  C:/repos/storygen/services/narrator/src/narrator/assets/narrator_default.wav \
      --ref-text "Some call me nature, others call me mother nature." \
      --out public/audio/voice

Indata (scripts/voice-phrases.json): en JSON-lista med exakta svenska repliker, t.ex.
  ["Tryck på bubblorna!", "Bra jobbat!", "ett", "två", "tre"]

Utdata:
  public/audio/voice/<md5[:10]>.mp3            ett klipp per replik
  public/audio/voice/manifest.json             { "<exakt text>": "<filnamn>" }

VoiceService laddar manifest.json en gång och spelar klippet om repliken finns,
annars faller den tillbaka på Web Speech.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

SWEDISH_HF_REPO = "EkhoCollective/f5-tts-swedish"
SWEDISH_HF_CKPT_FILE = "model_last.pt"
SWEDISH_HF_VOCAB_FILE = "vocab.txt"


def fname_for(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:10] + ".mp3"


def find_ffmpeg() -> str:
    for cand in ("ffmpeg", r"C:\ffmpeg-shared\bin\ffmpeg.exe",
                 os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe")):
        try:
            subprocess.run([cand, "-version"], capture_output=True, check=True)
            return cand
        except Exception:
            continue
    raise SystemExit("ffmpeg not found (need it to encode mp3)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phrases", required=True)
    ap.add_argument("--ref", required=True, help="reference voice wav to clone")
    ap.add_argument("--ref-text", required=True, help="transcript of the reference wav")
    ap.add_argument("--out", default="public/audio/voice")
    ap.add_argument("--ckpt", default=os.environ.get("F5_TTS_SWEDISH_CKPT", ""))
    ap.add_argument("--vocab", default=os.environ.get("F5_TTS_SWEDISH_VOCAB", ""))
    ap.add_argument("--speed", type=float, default=0.95, help="<1 = lugnare/tydligare för barn")
    ap.add_argument("--limit", type=int, default=0, help="0 = alla")
    ap.add_argument("--force", action="store_true", help="generera om även om filen finns")
    args = ap.parse_args()

    phrases = json.loads(Path(args.phrases).read_text(encoding="utf-8"))
    if isinstance(phrases, dict):
        phrases = list(phrases.values())
    phrases = [p for p in dict.fromkeys(p.strip() for p in phrases if p and p.strip())]
    if args.limit:
        phrases = phrases[: args.limit]

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    ffmpeg = find_ffmpeg()

    print(f"[gen-voice] {len(phrases)} phrases -> {out}")

    # --- ladda svenska F5-TTS-modellen (samma som storygen-narratorn) ---
    from f5_tts.api import F5TTS  # type: ignore
    import soundfile as sf  # noqa: F401  (validerar att deps finns)
    import numpy as np

    ckpt, vocab = args.ckpt, args.vocab
    if not ckpt or not vocab:
        from huggingface_hub import hf_hub_download
        if not ckpt:
            ckpt = hf_hub_download(SWEDISH_HF_REPO, SWEDISH_HF_CKPT_FILE)
        if not vocab:
            vocab = hf_hub_download(SWEDISH_HF_REPO, SWEDISH_HF_VOCAB_FILE)
    print(f"[gen-voice] ckpt={ckpt}\n[gen-voice] vocab={vocab}")

    model = F5TTS(ckpt_file=ckpt, vocab_file=vocab)
    print("[gen-voice] Swedish F5-TTS model loaded")

    manifest = {}
    manifest_path = out / "manifest.json"
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:
            manifest = {}

    made, skipped, failed = 0, 0, 0
    for i, text in enumerate(phrases, 1):
        fn = fname_for(text)
        manifest[text] = fn
        dest = out / fn
        if dest.exists() and not args.force:
            skipped += 1
            continue
        try:
            wav, sr, _ = model.infer(
                ref_file=args.ref, ref_text=args.ref_text, gen_text=text, speed=args.speed,
            )
            if hasattr(wav, "numpy"):
                wav = wav.numpy()
            wav = np.array(wav, dtype=np.float32)
            if wav.ndim > 1:
                wav = wav[:, 0]
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
                tmpwav = tf.name
            sf.write(tmpwav, wav, sr)
            subprocess.run(
                [ffmpeg, "-y", "-i", tmpwav, "-ac", "1", "-ar", "24000",
                 "-codec:a", "libmp3lame", "-b:a", "48k", str(dest)],
                capture_output=True, check=True,
            )
            os.unlink(tmpwav)
            made += 1
            print(f"[{i}/{len(phrases)}] {fn}  «{text}»")
        except Exception as e:
            failed += 1
            print(f"[{i}/{len(phrases)}] FAILED «{text}»: {e}", file=sys.stderr)

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"[gen-voice] done: {made} made, {skipped} skipped, {failed} failed. manifest: {manifest_path}")


if __name__ == "__main__":
    main()
