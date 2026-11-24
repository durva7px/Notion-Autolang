// Renders scene.html frame by frame and encodes it with ffmpeg.
//
//   node render.mjs --stills 3,10,20         -> PNG stills into out/stills/
//   node render.mjs --fps 60 --scale 1.3334  -> out/autolang-demo-1440p60.mp4 (2560x1440)
//   add --theme light for Notion's light mode   -> out/autolang-demo-light-1440p60.mp4
//
// Needs: playwright-core, a Chromium build (CHROME env var) and ffmpeg with libx264 (FFMPEG env var).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : acc), []),
);
const FPS = Number(args.fps || 60);
const SCALE = Number(args.scale || 4 / 3);
const WORKERS = Number(args.workers || 2); // each worker runs its own x264; more can run out of memory
const THEME = args.theme === 'light' ? 'light' : 'dark';
const SUFFIX = THEME === 'light' ? '-light' : '';
const OUT = path.join(here, 'out');
const CHROME = process.env.CHROME;
const FFMPEG = process.env.FFMPEG;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, args: ['--font-render-hinting=none', '--disable-lcd-text'] });
const url = `${pathToFileURL(path.join(here, 'scene.html')).href}?theme=${THEME}`;

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: SCALE });
  await page.goto(url);
  await page.evaluate(() => window.__ready);
  return page;
}

if (args.stills) {
  const page = await openPage();
  mkdirSync(path.join(OUT, `stills${SUFFIX}`), { recursive: true });
  for (const t of String(args.stills).split(',').map(Number)) {
    await page.evaluate((t) => window.__render(t), t);
    writeFileSync(path.join(OUT, `stills${SUFFIX}`, `t${t.toFixed(2)}.png`), await page.screenshot({ type: 'png' }));
  }
  console.log('duration', await page.evaluate(() => window.__DURATION), JSON.stringify(await page.evaluate(() => window.__MARK)));
  await browser.close();
  process.exit(0);
}

const probe = await openPage();
const duration = await probe.evaluate(() => window.__DURATION);
await probe.close();
const total = Math.ceil(duration * FPS);
console.log(`duration ${duration.toFixed(2)}s, ${total} frames @ ${FPS}fps, ${WORKERS} workers`);

const segDir = path.join(OUT, `segments${SUFFIX}`);
rmSync(segDir, { recursive: true, force: true });
mkdirSync(segDir, { recursive: true });
const per = Math.ceil(total / WORKERS);
let done = 0;
const started = Date.now();

async function worker(w) {
  const from = w * per, to = Math.min(total, from + per);
  if (from >= to) return null;
  const page = await openPage();
  const seg = path.join(segDir, `seg${w}.mp4`);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-threads', '4', '-rc-lookahead', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = from; f < to; f++) {
    await page.evaluate((t) => window.__render(t), f / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (++done % 120 === 0) console.log(`${done}/${total} frames, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
  await page.close();
  return seg;
}

const segs = (await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)))).filter(Boolean);
await browser.close();
const list = path.join(segDir, 'list.txt');
writeFileSync(list, segs.map((s) => `file '${s.replace(/\\/g, '/')}'`).join('\n'));
const final = path.join(OUT, `autolang-demo${SUFFIX}-${Math.round(1080 * SCALE)}p${FPS}.mp4`);
await new Promise((r, j) => spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', final], { stdio: 'inherit' })
  .on('close', (c) => (c === 0 ? r() : j(new Error('concat ' + c)))));
console.log('wrote', final, `in ${((Date.now() - started) / 1000).toFixed(0)}s`);
