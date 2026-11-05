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
import shutil
import subprocess
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


TAIL_KEEP_S = 0.15


def trim_tail(path: Path) -> None:
    """Drop the ~1 s of silence the voice service appends, without re-encoding.

    Only whole MP3 frames at the end are removed (ffmpeg stream copy), so the
    audio itself is untouched. Skipped when ffmpeg is not installed.
    """
    if not shutil.which("ffmpeg"):
        return
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", "24000", "-"],
        capture_output=True, check=True,
    ).stdout
    samples = memoryview(pcm).cast("h")
    last = next((i for i in range(len(samples) - 1, -1, -1) if abs(samples[i]) > 130), None)
    if last is None:
        return
    end = last / 24000 + TAIL_KEEP_S
    if end >= len(samples) / 24000 - 0.05:
        return
    tmp = path.with_suffix(".trim.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-t", f"{end:.3f}", "-c", "copy", "-map_metadata", "-1", str(tmp)], check=True)
    tmp.replace(path)


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
                trim_tail(tmp.rename(path))
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

    if "--trim-all" in sys.argv:
        for f in OUT.glob("*.mp3"):
            trim_tail(f)

    sem = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*(record(t, OUT / f"{h}.mp3", sem) for h, t in todo), return_exceptions=True)
    failed = [r for r in results if isinstance(r, Exception)]
    for r in failed[:10]:
        print(r, file=sys.stderr)

    present = {h for h in say if (OUT / f"{h}.mp3").exists()}
    for f in OUT.glob("*.mp3"):
        if f.stem not in say:
            f.unlink()
    for f in [*OUT.glob("*.part"), *OUT.glob("*.trim.mp3")]:
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
