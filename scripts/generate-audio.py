#!/usr/bin/env python3
"""
Pre-generates every narration line with Kokoro TTS (voice bm_lewis, British male).

Run on the laptop, from the repo root:
    pip install kokoro soundfile        # plus ffmpeg on PATH
    python scripts/generate-audio.py            # only new or changed lines
    python scripts/generate-audio.py --force    # regenerate everything

For each line it writes public/audio/<lesson>/<step>.mp3 and a .hash file next to
it (sha256 of "voice|speed|text"). Unchanged lines are skipped. It also writes
public/audio/manifest.json, which the parent screen and the audio check read.

The list of lines comes from `node scripts/list-lines.ts`, so the naming rules
live in one place (src/lesson/lines.ts) and captions always match the audio.

If Kokoro will not install, this script stops and says so. It never switches to
a different voice on its own.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
SAMPLE_RATE = 24000
QUESTION_PAUSE_S = 0.35  # a short breath before every question prompt


def line_hash(voice: str, speed: float, text: str) -> str:
    # must match hashInput() in src/lesson/lines.ts: `${VOICE}|${SPEED}|${text}`
    speed_str = ("%g" % speed)
    return hashlib.sha256(f"{voice}|{speed_str}|{text}".encode("utf-8")).hexdigest()


def load_lines():
    node = shutil.which("node")
    if not node:
        sys.exit("Node.js is needed to list the lines (it reads src/lesson/lines.ts).")
    out = subprocess.run([node, os.path.join("scripts", "list-lines.ts")], cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(out.stdout)


def main():
    force = "--force" in sys.argv
    data = load_lines()
    voice, speed, lines = data["voice"], float(data["speed"]), data["lines"]

    todo = []
    for line in lines:
        mp3 = os.path.join(PUBLIC, line["audio"])
        h = line_hash(voice, speed, line["text"])
        hash_file = mp3[:-4] + ".hash"
        up_to_date = os.path.exists(mp3) and os.path.exists(hash_file) and open(hash_file).read().strip() == h
        if force or not up_to_date:
            todo.append((line, mp3, hash_file, h))

    print(f"{len(lines)} lines, {len(lines) - len(todo)} up to date, {len(todo)} to generate")

    if todo:
        if not shutil.which("ffmpeg"):
            sys.exit("ffmpeg was not found on PATH. Install it (e.g. `winget install ffmpeg`) and run again.")
        try:
            import numpy as np
            import soundfile as sf
            from kokoro import KPipeline
        except Exception as e:  # noqa: BLE001
            sys.exit(
                "Kokoro could not be imported, so no audio was generated.\n"
                f"  ({e})\n"
                "Try: pip install kokoro soundfile\n"
                "Stopping here rather than switching to a different voice."
            )
        pipeline = KPipeline(lang_code="b")  # 'b' = British English
        for i, (line, mp3, hash_file, h) in enumerate(todo, 1):
            print(f"[{i}/{len(todo)}] {line['key']}: {line['text']}")
            chunks = [audio for _, _, audio in pipeline(line["text"], voice=voice, speed=speed)]
            audio = np.concatenate([np.asarray(c, dtype=np.float32) for c in chunks]) if chunks else np.zeros(1, dtype=np.float32)
            if line["key"].endswith("-prompt"):
                audio = np.concatenate([np.zeros(int(SAMPLE_RATE * QUESTION_PAUSE_S), dtype=np.float32), audio])
            os.makedirs(os.path.dirname(mp3), exist_ok=True)
            with tempfile.TemporaryDirectory() as tmp:
                wav = os.path.join(tmp, "line.wav")
                sf.write(wav, audio, SAMPLE_RATE)
                subprocess.run(
                    ["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", str(SAMPLE_RATE), "-b:a", "64k", mp3],
                    check=True,
                )
            with open(hash_file, "w") as f:
                f.write(h)

    # manifest of every up-to-date file: { "stack-64/hook.mp3": "<hash>" }
    manifest = {}
    for line in lines:
        mp3 = os.path.join(PUBLIC, line["audio"])
        hash_file = mp3[:-4] + ".hash"
        if os.path.exists(mp3) and os.path.exists(hash_file):
            manifest[line["audio"][len("audio/"):]] = open(hash_file).read().strip()
    os.makedirs(os.path.join(PUBLIC, "audio"), exist_ok=True)
    with open(os.path.join(PUBLIC, "audio", "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)
    print(f"manifest: {len(manifest)} of {len(lines)} lines recorded")


if __name__ == "__main__":
    main()
