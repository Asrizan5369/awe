// Headless pipeline: verify -> render frames -> encode MP4 -> export GLB.
// Usage: node scripts/render.mjs [--clips 1,2,3] [--stills] [--no-video] [--no-glb]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'renders');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const clips = (args[args.indexOf('--clips') + 1] && flag('--clips') ? args[args.indexOf('--clips') + 1] : '1,2,3,4').split(',').map(Number);
const FPS = 30;
const DUR = { 1: 16, 2: 14, 3: 14, 4: 29 };

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html?mode=render`;

const exe = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => { console.error('[pageerror]', e); process.exitCode = 1; });
await page.goto(url);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
fs.mkdirSync(OUT, { recursive: true });

// 1. Verification gate.
const report = await page.evaluate(() => window.verify());
fs.writeFileSync(path.join(OUT, 'verification_report.json'), JSON.stringify(report, null, 2));
console.log('verification pass =', report.pass, report.failures.slice(0, 20));
if (!report.pass && !flag('--force')) { console.error('Verification failed: clips NOT rendered.'); await browser.close(); server.close(); process.exit(2); }

// 2. Review stills.
if (flag('--stills')) {
  const stillDir = path.join(OUT, 'stills');
  fs.mkdirSync(stillDir, { recursive: true });
  const marks = { 1: [0, 1.9, 3.1, 6.2, 9.2, 12.2, 15.9], 2: [0, 4, 8, 13.9], 3: [0.5, 3, 8], 4: [1.5, 4.5, 9.5, 13.5, 18.5, 23, 27.5] };
  for (const c of clips) for (const t of marks[c]) {
    await page.evaluate(([c, t]) => window.renderAt(c, t), [c, t]);
    await page.screenshot({ path: path.join(stillDir, `clip${c}_t${t.toFixed(1)}.png`) });
  }
}

// 3. Frames -> MP4.
if (!flag('--no-video')) {
  for (const c of clips) {
    const dir = path.join(OUT, `frames_clip${c}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const n = Math.round(DUR[c] * FPS);
    const t0 = Date.now();
    for (let f = 0; f < n; f++) {
      await page.evaluate(([c, t]) => window.renderAt(c, t), [c, f / FPS]);
      await page.screenshot({ path: path.join(dir, `f${String(f).padStart(5, '0')}.png`) });
    }
    console.log(`clip ${c}: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    const names = { 1: 'Clip1_Conceptual_Disassembly', 2: 'Clip2_Conceptual_Reassembly', 3: 'Clip3_Mechanical_Motion_and_Flow', 4: 'Clip4_Inspection_Walkthrough' };
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.png'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', path.join(OUT, `MARISMART_${names[c]}.mp4`)]);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// 4. GLB.
if (!flag('--no-glb')) {
  const b64 = await page.evaluate(() => window.exportGLB());
  fs.writeFileSync(path.join(OUT, 'MARISMART_PumpSkid_LearningModel.glb'), Buffer.from(b64, 'base64'));
  console.log('GLB written');
}

await browser.close();
server.close();
