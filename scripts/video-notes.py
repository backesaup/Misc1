#!/usr/bin/env python3
"""
Turns videos into notes Claude can read: a transcript and a frame every few seconds.
Sources: links in requests/videos/sources.txt (downloaded with yt-dlp) and video files
uploaded to requests/videos/. Output per video: requests/videos/<slug>/
    transcript.txt   timestamped Whisper transcript
    frames/          one JPEG every N seconds (small, so the repo stays light)
    info.json        title, source, duration
Videos already processed (folder exists) are skipped. The video file itself is not committed.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "requests", "videos")
EVERY = int(os.environ.get("FRAME_EVERY", "5"))


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60] or "video"


def run(*cmd):
    subprocess.run(cmd, check=True)


def process(path, title, source, out):
    os.makedirs(os.path.join(out, "frames"), exist_ok=True)
    run("ffmpeg", "-loglevel", "error", "-y", "-i", path, "-vf", f"fps=1/{EVERY},scale=640:-2", "-q:v", "5", os.path.join(out, "frames", "t%04d.jpg"))
    import whisper

    model = whisper.load_model(os.environ.get("WHISPER_MODEL", "small"))
    result = model.transcribe(path, language="en")
    with open(os.path.join(out, "transcript.txt"), "w") as f:
        for seg in result["segments"]:
            m, s = divmod(int(seg["start"]), 60)
            f.write(f"[{m:02d}:{s:02d}] {seg['text'].strip()}\n")
    frames = sorted(os.listdir(os.path.join(out, "frames")))
    with open(os.path.join(out, "info.json"), "w") as f:
        json.dump({"title": title, "source": source, "frameEverySeconds": EVERY, "frames": len(frames)}, f, indent=2)
    print(f"✓ {title}: {len(frames)} frames, {len(result['segments'])} transcript lines")


def main():
    os.makedirs(DIR, exist_ok=True)
    todo = []
    src = os.path.join(DIR, "sources.txt")
    if os.path.exists(src):
        for line in open(src):
            url = line.strip()
            if url and not url.startswith("#"):
                todo.append(("url", url))
    for name in os.listdir(DIR):
        if name.lower().endswith((".mp4", ".mov", ".m4v", ".webm", ".mkv")):
            todo.append(("file", os.path.join(DIR, name)))
    for kind, ref in todo:
        if kind == "url":
            title = subprocess.run(["yt-dlp", "--get-title", ref], capture_output=True, text=True).stdout.strip() or ref
            out = os.path.join(DIR, slug(title))
            if os.path.exists(os.path.join(out, "transcript.txt")):
                continue
            tmp = os.path.join("/tmp", slug(title) + ".mp4")
            run("yt-dlp", "-f", "best[height<=720]/best", "-o", tmp, ref)
            process(tmp, title, ref, out)
        else:
            title = os.path.splitext(os.path.basename(ref))[0]
            out = os.path.join(DIR, slug(title))
            if os.path.exists(os.path.join(out, "transcript.txt")):
                continue
            process(ref, title, os.path.basename(ref), out)


if __name__ == "__main__":
    sys.exit(main())
