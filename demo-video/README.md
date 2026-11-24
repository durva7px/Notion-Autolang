# Demo video

A scripted, frame-by-frame rendered demo of AutoLang for the website: a Notion-style
workspace where someone writes a developer guide with code blocks, and each block's
language flips from **Plain Text** to the right one (JSON, TypeScript, Python, SQL).

- `scene.html`: the whole video. The shot list (typing, clicks, camera pans/zooms,
  scrolling, detection moments) is the "Shot list" section of its script. Every frame
  is a pure function of time (`window.__render(t)`), so renders are deterministic.
- `render.mjs`: opens the scene in headless Chromium, screenshots every frame and
  pipes them into ffmpeg (H.264, CRF 12). The output goes in `out/`, which git ignores.

## Render

Needs `playwright-core` (`npm i playwright-core`), a Chromium binary and an ffmpeg
with libx264 (for example the one bundled by `pip install imageio-ffmpeg`).

```powershell
$env:CHROME = "path\to\chrome.exe"; $env:FFMPEG = "path\to\ffmpeg.exe"
node render.mjs --stills 3,13,25          # quick PNG checks in out/stills
node render.mjs --fps 60 --scale 1.3333334  # 2560x1440 @ 60fps
node render.mjs --fps 60 --scale 2          # 3840x2160 @ 60fps
node render.mjs --theme light --fps 60 --scale 1.3333334  # Notion light mode
```

`--theme light` renders the same script in Notion's light mode (open `scene.html?theme=light`
to see it); output files get a `-light` suffix. Each worker runs its own x264, so keep
`--workers` at 2 unless the machine has plenty of free memory.

`--scale` is the device pixel ratio on the 1920x1080 stage, so text stays sharp at any size.
