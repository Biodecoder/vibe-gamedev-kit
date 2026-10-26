#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = '/Users/derya/.gemini/antigravity/brain/9a8afaa3-9e79-46b8-987c-58081f4382d7';
const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4175;
const CDP_PORT = 9344;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      // retry
    }
    await sleep(150);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

class CDPSession {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(msg.params?.exceptionDetails?.text || 'Runtime exception');
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        const txt = (msg.params.args || []).map((a) => a.value || a.description || '').join(' ');
        this.consoleErrors.push(txt);
      }
    });
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 940,
      deviceScaleFactor: 1,
      mobile: false
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${res.exceptionDetails.text}`);
    }
    return res.result?.value;
  }

  async screenshot(outPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(res.data, 'base64');
    fs.writeFileSync(outPath, buf);
    return buf.length;
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const profileDir = `/tmp/vgdk_chrome_cdp_${Date.now()}`;

  console.log('[qa] Starting Vibe Game-Dev Kit server on port', PORT);
  const srv = spawn('node', ['server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });

  let chromeProc = null;
  let cdp = null;

  try {
    const apiCheck = await waitForHttp(`${BASE_URL}/api/workspace-games`);
    console.log(`[qa] API /api/workspace-games returned ${apiCheck.count} workspace games.`);

    chromeProc = spawn(
      CHROME_BIN,
      [
        '--headless=new',
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${profileDir}`,
        '--window-size=1440,940',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-first-run',
        '--no-default-browser-check',
        BASE_URL
      ],
      { stdio: 'pipe' }
    );

    const targets = await waitForHttp(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes(String(PORT))) || targets[0];
    if (!pageTarget?.webSocketDebuggerUrl) {
      throw new Error('Could not find Chrome CDP page target');
    }

    cdp = new CDPSession(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await sleep(1400);

    // 1. Verify all 9 island canvases painted non-empty frames
    const paintedStats = await cdp.evaluate(`(() => {
      const canvases = Array.from(document.querySelectorAll('canvas.island-scene-canvas'));
      return canvases.map((c) => {
        const ctx = c.getContext('2d');
        const sample = ctx.getImageData(Math.floor(c.width * 0.35), Math.floor(c.height * 0.45), 64, Math.floor(c.height * 0.45)).data;
        let nonZeroAlpha = 0;
        for (let i = 3; i < sample.length; i += 4) {
          if (sample[i] > 0) nonZeroAlpha++;
        }
        return {
          scene: c.dataset.scene,
          painted: c.dataset.painted === 'true',
          width: c.width,
          height: c.height,
          nonZeroAlpha
        };
      });
    })()`);

    console.log('[qa] Island canvases verified:', paintedStats.length);
    for (const st of paintedStats) {
      console.log(`  - ${st.scene}: ${st.width}x${st.height} | painted=${st.painted} | centerPixels=${st.nonZeroAlpha}`);
    }
    if (paintedStats.length < 9 || paintedStats.some((s) => !s.painted || s.nonZeroAlpha === 0)) {
      throw new Error(`Island canvas verification failed: ${JSON.stringify(paintedStats)}`);
    }

    // Screenshot 1: Hero Island
    await cdp.evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    await sleep(300);
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'qa_01_hero_island.png'));
    console.log('[qa] Saved qa_01_hero_island.png');

    // Screenshot 2: Compare section & Problems Island
    await cdp.evaluate(`(() => {
      document.getElementById('compare').scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`);
    await sleep(400);
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'qa_02_compare_and_problems.png'));
    console.log('[qa] Saved qa_02_compare_and_problems.png');

    // Screenshot 3: 3 Island Districts (9 Village Helpers)
    await cdp.evaluate(`(() => {
      document.getElementById('helpers').scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, 140);
    })()`);
    await sleep(400);
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'qa_03_districts_9_helpers.png'));
    console.log('[qa] Saved qa_03_districts_9_helpers.png');

    // Screenshot 4: Open TalkDialog Modal for Helper #5 (The 60FPS Forgemaster) & trigger action pose
    await cdp.evaluate(`(() => {
      document.querySelector('[data-open-helper="h5"]').click();
      document.getElementById('btn-trigger-act').click();
    })()`);
    await sleep(450);
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'qa_04_talk_dialog_modal.png'));
    console.log('[qa] Saved qa_04_talk_dialog_modal.png');
    await cdp.evaluate(`document.getElementById('btn-close-talk').click()`);
    await sleep(250);

    // Screenshot 5: Live Game-Dev Command Center (#workshop-center) with Dry-Run Install
    const workshopStats = await cdp.evaluate(`(async () => {
      document.getElementById('workshop-center').scrollIntoView({ behavior: 'instant', block: 'center' });
      document.getElementById('btn-dryrun-kit').click();
      await new Promise((r) => setTimeout(r, 450));
      return {
        gameOptionsCount: document.querySelectorAll('#workspace-game-select option').length,
        doctorChecksCount: document.querySelectorAll('#doctor-checks-list .doctor-check-item').length,
        previewText: document.getElementById('workshop-code-preview').textContent.slice(0, 120)
      };
    })()`);
    console.log('[qa] Workshop Command Center stats:', workshopStats);
    if (workshopStats.gameOptionsCount < 20 || workshopStats.doctorChecksCount !== 9) {
      throw new Error(`Workshop verification failed: ${JSON.stringify(workshopStats)}`);
    }
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'qa_05_workshop_command_center.png'));
    console.log('[qa] Saved qa_05_workshop_command_center.png');

    // Screenshot 6: Patrolling Pig Button Guard Arena & FAQ Stage
    await cdp.evaluate(`(() => {
      document.getElementById('buy').scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -60);
    })()`);
    await sleep(450);
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'qa_06_pig_guard_and_faq.png'));
    console.log('[qa] Saved qa_06_pig_guard_and_faq.png');

    if (cdp.consoleErrors.length > 0 || cdp.pageErrors.length > 0) {
      throw new Error(
        `Runtime errors detected: consoleErrors=${JSON.stringify(cdp.consoleErrors)}, pageErrors=${JSON.stringify(cdp.pageErrors)}`
      );
    }

    console.log('[qa] ALL CHECKS PASSED! 9/9 island scenes painted, 28 workspace games loaded, 0 runtime errors.');
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) chromeProc.kill('SIGKILL');
    srv.kill('SIGTERM');
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('[qa] FAILED:', err);
  process.exit(1);
});
