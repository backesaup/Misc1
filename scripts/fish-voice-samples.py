#!/usr/bin/env python3
"""
Renders the same sample lines in several Fish Audio voices so a grown-up can listen and pick.
Writes public/voice-samples/<voice-id>.mp3 and public/voice-samples/index.json, which the
parent screen lists. Then put the chosen id into content/voice.json (speakers.<name>.fish.voice).

    FISH_API_KEY=... python scripts/fish-voice-samples.py "british male narrator" "friendly young man"
Each search phrase gets its top voices; or pass voice ids directly with --ids id1 id2.
"""
import json
import os
import sys

SAMPLE = {
    "narrator": "In Minecraft, a stack of blocks stops at 64. Let's find out what is special about 64. Count this row with me: 1, 2, 3, 4, 5, 6, 7, 8.",
    "steve": "Oh no! My bed broke! Can you build me a new one? Tap the glowing squares to put blocks down.",
}


def main():
    key = os.environ.get("FISH_API_KEY")
    if not key:
        sys.exit("Set FISH_API_KEY (a repository secret in the workflow).")
    from fishaudio import FishAudio

    client = FishAudio(api_key=key)
    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "voice-samples")
    os.makedirs(out_dir, exist_ok=True)
    args = sys.argv[1:]
    picks = []
    if args and args[0] == "--ids":
        picks = [(i, i, "chosen", "narrator") for i in args[1:]]
    else:
        for q in args or ["british male narrator", "friendly young man"]:
            role = "steve" if "young" in q.lower() else "narrator"
            page = client.voices.list(title=q, page_size=6, language="en")
            for v in page.items:
                picks.append((v.id, v.title, q, role))
    index = []
    for vid, title, query, role in picks:
        path = os.path.join(out_dir, f"{vid}.mp3")
        audio = client.tts.convert(text=SAMPLE[role], reference_id=vid, format="mp3", model="s2.1-pro")
        with open(path, "wb") as f:
            f.write(audio)
        index.append({"id": vid, "title": title, "search": query, "role": role, "file": f"voice-samples/{vid}.mp3"})
        print(f"✓ {title} ({vid})")
    with open(os.path.join(out_dir, "index.json"), "w") as f:
        json.dump(index, f, indent=2)


if __name__ == "__main__":
    main()
