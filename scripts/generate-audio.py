#!/usr/bin/env python3
"""
Records every narration line, one voice per character (content/voice.json).

Normally run by the GitHub Action (.github/workflows/narration.yml) on every content change.
To run locally from the repo root:
    pip install kokoro soundfile            # engine "kokoro" (plus espeak-ng and ffmpeg)
    pip install fish-audio-sdk soundfile    # engine "fish"  (plus FISH_API_KEY in the environment)
    python scripts/generate-audio.py            # only new or changed lines
    python scripts/generate-audio.py --force    # everything

Pacing: each sentence is recorded separately and joined with a natural pause; counting
lists ("8, 16, 24") get a pause after each number; questions get a short breath first.

For each line it writes public/audio/<...>.mp3 plus a .hash file (sha256 of the line's
hashInput: speaker voice + speed + pitch + pauses + text), and public/audio/manifest.json.
Lines come from `node scripts/list-lines.ts`, so naming lives in src/lesson/lines.ts.

If the chosen engine can't run, this stops and says so. It never swaps voices on its own.
"""
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
SR = 24000


def load_lines():
    node = shutil.which("node")
    if not node:
        sys.exit("Node.js is needed to list the lines (it reads src/lesson/lines.ts).")
    out = subprocess.run([node, os.path.join("scripts", "list-lines.ts")], cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(out.stdout)["lines"]


COUNT_LIST = re.compile(r"(\d[\d,]*\s*(,|and)\s*){2,}\d[\d,]*")


def chunks(text):
    """Split a line into (piece, pause-after). A whole line is spoken in one go, so the voice keeps
    its natural expression across sentences; only counting lists ("8, 16, 24") are split out, with a
    short beat after each number."""
    cfg = VOICE["pauses"]
    if not COUNT_LIST.search(text):
        return [(text, 0.0)]
    parts = []
    pos = 0
    for m in COUNT_LIST.finditer(text):
        before = text[pos:m.start()].strip()
        if before:
            parts.append((before, cfg["sentence"]))
        nums = [n.strip(" .") for n in re.split(r",\s*|\s+and\s+", m.group(0)) if n.strip(" .")]
        for i, n in enumerate(nums):
            parts.append((n + ("." if i == len(nums) - 1 else ","), cfg["count"]))
        pos = m.end()
    after = text[pos:].strip(" .")
    if after:
        parts.append((after if after[-1] in ".!?" else after + ".", 0.0))
    parts[-1] = (parts[-1][0], 0.0)
    return parts


class Kokoro:
    def __init__(self):
        try:
            import numpy as np  # noqa: F401
            from kokoro import KPipeline
        except Exception as e:  # noqa: BLE001
            sys.exit(f"Kokoro could not be imported ({e}). Try: pip install kokoro soundfile. Stopping rather than switching voices.")
        self.pipes = {}
        self.KPipeline = KPipeline

    def say(self, text, sp):
        import numpy as np
        v = sp["kokoro"]["voice"]
        lang = v[0]  # 'b' British, 'a' American, ...
        if lang not in self.pipes:
            self.pipes[lang] = self.KPipeline(lang_code=lang)
        audio = [np.asarray(a, dtype=np.float32) for _, _, a in self.pipes[lang](text, voice=v, speed=sp["kokoro"]["speed"])]
        return np.concatenate(audio) if audio else np.zeros(1, dtype=np.float32)


class Fish:
    def __init__(self):
        key = os.environ.get("FISH_API_KEY")
        if not key:
            sys.exit("engine is 'fish' but FISH_API_KEY isn't set (add it as a repository secret). Stopping rather than switching voices.")
        try:
            from fishaudio import FishAudio
        except Exception as e:  # noqa: BLE001
            sys.exit(f"fish-audio-sdk could not be imported ({e}). Try: pip install fish-audio-sdk")
        self.client = FishAudio(api_key=key)

    def say(self, text, sp):
        import numpy as np
        import soundfile as sf
        f = sp["fish"]
        if not f.get("voice"):
            sys.exit("A speaker has no Fish voice id in content/voice.json. Pick one from the voice samples first.")
        wav = self.client.tts.convert(text=text, reference_id=f["voice"], format="wav", speed=f.get("speed", 1.0), model=VOICE.get("fishModel", "s2.1-pro"))
        data, rate = sf.read(io.BytesIO(wav), dtype="float32")
        if data.ndim > 1:
            data = data.mean(axis=1)
        if rate != SR:  # resample simply to the shared rate
            idx = np.linspace(0, len(data) - 1, int(len(data) * SR / rate))
            data = np.interp(idx, np.arange(len(data)), data).astype(np.float32)
        return data


def to_mp3(audio, mp3, pitch=1.0):
    import soundfile as sf
    os.makedirs(os.path.dirname(mp3), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "line.wav")
        sf.write(wav, audio, SR)
        filters = ["loudnorm=I=-18:TP=-2:LRA=9"]
        if abs(pitch - 1.0) > 1e-3:  # raise the pitch without changing the speed
            filters.insert(0, f"asetrate={int(SR * pitch)},aresample={SR},atempo={1 / pitch:.4f}")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", ",".join(filters), "-ac", "1", "-ar", str(SR), "-b:a", "64k", mp3], check=True)


def main():
    global VOICE
    VOICE = json.load(open(os.path.join(ROOT, "content", "voice.json")))
    force = "--force" in sys.argv
    lines = load_lines()
    todo = []
    for line in lines:
        mp3 = os.path.join(PUBLIC, line["audio"])
        h = hashlib.sha256(line["hashInput"].encode("utf-8")).hexdigest()
        hash_file = mp3[:-4] + ".hash"
        fresh = os.path.exists(mp3) and os.path.exists(hash_file) and open(hash_file).read().strip() == h
        if force or not fresh:
            todo.append((line, mp3, hash_file, h))
    print(f"engine {VOICE['engine']}: {len(lines)} lines, {len(lines) - len(todo)} up to date, {len(todo)} to record")

    if todo:
        if not shutil.which("ffmpeg"):
            sys.exit("ffmpeg was not found on PATH.")
        import numpy as np
        engine = Fish() if VOICE["engine"] == "fish" else Kokoro()
        for i, (line, mp3, hash_file, h) in enumerate(todo, 1):
            sp = VOICE["speakers"].get(line.get("speaker", "narrator"), VOICE["speakers"]["narrator"])
            print(f"[{i}/{len(todo)}] {line['key']} ({line.get('speaker', 'narrator')}): {line['text']}")
            pieces = []
            if line["key"].endswith("-prompt"):
                pieces.append(np.zeros(int(SR * VOICE["pauses"]["beforeQuestion"]), dtype=np.float32))
            for text, pause in chunks(line["text"]):
                pieces.append(engine.say(text, sp))
                if pause:
                    pieces.append(np.zeros(int(SR * pause), dtype=np.float32))
            pitch = sp.get("kokoro", {}).get("pitch", 1.0) if VOICE["engine"] == "kokoro" else 1.0
            to_mp3(np.concatenate(pieces), mp3, pitch)
            with open(hash_file, "w") as f:
                f.write(h)

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


VOICE = {}
if __name__ == "__main__":
    main()
