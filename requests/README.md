# Requests from Ismaeel

Exports from the app's parent screen land here (`requests-YYYY-MM-DD.zip`).
Each zip holds:

- `requests.json`: every request, newest first: `{ kind: "voice" | "photo" | "text", at, file?, text? }`
- voice notes (`.m4a` / `.webm`) and photos (`.jpg` / `.png` / `.heic`)
- `activity.json`: what he did in the app (finished lessons, replays, wrong answers chosen, where he stopped)

## For Claude

When asked to make lessons from these:

1. Unzip into `requests/<date>/` (don't commit large media unless asked).
2. Listen to / read each request. Photos of homework show what he's being taught at school.
3. Use `activity.json` to adjust: steps he replays may be unclear; repeated wrong answers name a
   misunderstanding to address; where he stops may be too long or too hard.
4. Write lessons following `docs/LESSON_DIRECTION.md` and `docs/briefs/`, using what exists in
   `docs/ASSET_LIBRARY.md`. Mark them `"status": "draft"` until a grown-up checks the facts.
5. Note in the lesson's `_source` which request it came from.
