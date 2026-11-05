#!/usr/bin/env python3
"""Record every phrase in speech/phrases.json with Microsoft's he-IL-HilaNeural voice.

    pip install -r scripts/requirements-speech.txt
    python3 scripts/generate_speech.py

Each clip is named by a hash of (voice, rate, pitch, text), so only new or
changed phrases are recorded; clips no longer referenced are deleted. Writes
public/audio/he/<hash>.mp3 and public/audio/he/manifest.json.

edge-tts uses the unofficial Edge "Read aloud" endpoint. It is fine for this
non-commercial home app; a commercial build should use Azure Speech instead.
"""

import asyncio
import hashlib
import json
import sys
from pathlib import Path

import edge_tts

VOICE = "he-IL-HilaNeural"
RATE = "-8%"
PITCH = "+0Hz"
CONCURRENCY = 6
RETRIES = 5

ROOT = Path(__file__).resolve().parent.parent
PHRASES = ROOT / "speech" / "phrases.json"
OUT = ROOT / "public" / "audio" / "he"


def clip_id(text: str) -> str:
    return hashlib.sha1(f"{VOICE}|{RATE}|{PITCH}|{text}".encode()).hexdigest()[:16]


async def record(text: str, path: Path, sem: asyncio.Semaphore) -> None:
    async with sem:
        for attempt in range(RETRIES):
            try:
                tmp = path.with_suffix(".part")
                await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(str(tmp))
                if tmp.stat().st_size < 500:
                    raise RuntimeError("empty audio")
                tmp.rename(path)
                return
            except Exception as e:  # noqa: BLE001 - network hiccups are retried
                if attempt == RETRIES - 1:
                    raise RuntimeError(f"failed: {text!r}: {e}") from e
                await asyncio.sleep(2**attempt)


async def main() -> int:
    phrases = json.loads(PHRASES.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    clips = {p["key"]: clip_id(p["say"]) for p in phrases}
    say = {clip_id(p["say"]): p["say"] for p in phrases}
    todo = [(h, t) for h, t in say.items() if not (OUT / f"{h}.mp3").exists()]
    print(f"{len(say)} clips, {len(todo)} to record", flush=True)

    sem = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*(record(t, OUT / f"{h}.mp3", sem) for h, t in todo), return_exceptions=True)
    failed = [r for r in results if isinstance(r, Exception)]
    for r in failed[:10]:
        print(r, file=sys.stderr)

    present = {h for h in say if (OUT / f"{h}.mp3").exists()}
    for f in OUT.glob("*.mp3"):
        if f.stem not in say:
            f.unlink()
    for f in OUT.glob("*.part"):
        f.unlink()

    manifest = {
        "voice": VOICE,
        "rate": RATE,
        "clips": {k: h for k, h in sorted(clips.items()) if h in present},
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    size = sum(f.stat().st_size for f in OUT.glob("*.mp3"))
    print(f"{len(present)} clips on disk, {size / 1e6:.1f} MB; {len(failed)} failed", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
