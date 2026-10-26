#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_GAME = path.join(ROOT, 'public', 'game');
const MANIFEST_OUT = path.join(ROOT, 'public', 'src', 'scene-manifest.js');
const BASE_URL = 'https://camera.ai.vn';

function fetchText(url) {
  return execFileSync('curl', ['-sL', '--fail', url], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

function downloadFile(relPath) {
  const cleanRel = relPath.replace(/\?.*$/, '').replace(/^\/game\//, '');
  const dest = path.join(PUBLIC_GAME, cleanRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    return { rel: cleanRel, status: 'cached', size: fs.statSync(dest).size };
  }
  const url = `${BASE_URL}/game/${cleanRel}`;
  execFileSync('curl', ['-sL', '--fail', '-o', dest, url]);
  const size = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
  return { rel: cleanRel, status: 'downloaded', size };
}

async function main() {
  const verifyOnly = process.argv.includes('--verify');
  fs.mkdirSync(PUBLIC_GAME, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true });

  console.log('[mirror] Fetching scene manifest bundle from camera.ai.vn...');
  const manifestBundle = fetchText(`${BASE_URL}/assets/useReducedMotion-CE1HoTJq.js`);

  // Extract full `var r={...},i=e=>` object
  const rStart = manifestBundle.indexOf('var r={');
  const rEnd = manifestBundle.indexOf('},i=e=>', rStart);
  if (rStart === -1 || rEnd === -1) {
    throw new Error('Could not locate var r={...} in useReducedMotion-CE1HoTJq.js');
  }
  const rLiteral = manifestBundle.slice(rStart + 6, rEnd + 1);
  const parsedManifest = Function(`return (${rLiteral})`)();
  const islands = parsedManifest.islands || {};
  const animsObj = parsedManifest.anims || {};
  const stagesObj = parsedManifest.stages || {};
  const upstreamSheets = parsedManifest.sheets || {};

  // Gather all unique asset relative paths under /game/
  const assetSet = new Set([
    // Foam & special strips
    'strips/terrain-tileset-water-foam.png',
    'strips/extra-pig-rider-pig-rider-run.png',
    'strips/terrain-decorations-rubber-duck-rubber-duck.png',
    'strips/terrain-decorations-water-rocks-water-rocks-01.png',
    'strips/terrain-decorations-water-rocks-water-rocks-02.png',
    'strips/terrain-decorations-water-rocks-water-rocks-03.png',
    'strips/terrain-decorations-water-rocks-water-rocks-04.png',
    // UI boards, ribbons, clouds, avatars, personas, icons, cursors
    'ui/wood-header-desktop.png',
    'ui/wood-board-desktop.png',
    'ui/wood-board-mobile.png',
    'ui/ribbon-black.png',
    'ui/ribbon-blue.png',
    'ui/ribbon-purple.png',
    'ui/ribbon-red.png',
    'ui/ribbon-yellow.png',
    'ui/cloud-1.png',
    'ui/cloud-2.png',
    'ui/cloud-3.png',
    'ui/cloud-5.png',
    'ui/cloud-6.png',
    'ui/cloud-7.png',
    'ui/avatar-e1.png',
    'ui/avatar-e2.png',
    'ui/avatar-e3.png',
    'ui/avatar-e4.png',
    'ui/avatar-e5.png',
    'ui/avatar-e6.png',
    'ui/persona-p1.png',
    'ui/persona-p2.png',
    'ui/persona-p3.png',
    'ui/persona-p4.png',
    'ui/icon-close.png',
    'ui/icon-coin.png',
    'ui/icon-hammer.png',
    'ui/icon-info.png',
    'ui/icon-play.png',
    'ui/icon-shield.png',
    'ui/cursor-hand.png',
    'ui/cursor-hand@2x.png',
    // Logos & Flags
    'logos/claude-color.svg',
    'logos/codex-color.svg',
    'logos/cursor.svg',
    'logos/grok.svg',
    'logos/kimi.svg',
    'logos/opencode.svg',
    'flags/us.svg',
    'flags/vn.svg',
    'flags/cn.svg',
    'flags/jp.svg',
    'flags/kr.svg',
    'flags/de.svg',
    'flags/bg.svg'
  ]);

  const sheetsMeta = {
    ...upstreamSheets,
    'terrain-tileset-water-foam': { frames: 16, fps: 8, frameW: 192, frameH: 192 },
    'extra-pig-rider-pig-rider-run': { frames: 4, fps: 10, frameW: 256, frameH: 256, anchor: [0.5, 0.78] },
    'terrain-decorations-rubber-duck-rubber-duck': { frames: 1, fps: 1, frameW: 32, frameH: 27 }
  };

  for (const sheetName of Object.keys(upstreamSheets)) {
    assetSet.add(`strips/${sheetName}.png`);
  }

  for (const [, island] of Object.entries(islands)) {
    if (island.file) assetSet.add(`islands/${island.file}`);
    if (island.foamFile) assetSet.add(`islands/${island.foamFile}`);
    for (const actor of island.actors || []) {
      if (actor.sheet) {
        assetSet.add(`strips/${actor.sheet}.png`);
        sheetsMeta[actor.sheet] = {
          frames: actor.frames,
          fps: actor.fps,
          frameW: actor.frameW,
          frameH: actor.frameH,
          anchor: actor.anchor,
          prop: !!actor.prop
        };
      }
    }
  }

  for (const [, anim] of Object.entries(animsObj)) {
    if (anim.file) assetSet.add(`anims/${anim.file}`);
  }
  for (const [, stage] of Object.entries(stagesObj)) {
    if (stage.file) assetSet.add(`stages/${stage.file}`);
  }

  // Write scene-manifest.js
  const manifestSource = `// Auto-generated from camera.ai.vn scene manifest
export const SCENE_MANIFEST = ${JSON.stringify({
    tile: 64,
    displayScale: 1,
    islands,
    sheets: sheetsMeta,
    anims: animsObj,
    stages: stagesObj
  }, null, 2)};
`;
  fs.writeFileSync(MANIFEST_OUT, manifestSource, 'utf8');
  console.log(`[mirror] Wrote scene manifest to ${MANIFEST_OUT} (${Object.keys(islands).length} islands, ${Object.keys(sheetsMeta).length} sprite sheets, ${Object.keys(animsObj).length} anims, ${Object.keys(stagesObj).length} stages)`);

  let downloaded = 0;
  let cached = 0;
  let missing = 0;
  for (const rel of sorted(assetSet)) {
    const dest = path.join(PUBLIC_GAME, rel);
    if (verifyOnly) {
      if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
        console.error(`[verify] MISSING: ${rel}`);
        missing++;
      } else {
        cached++;
      }
      continue;
    }
    try {
      const res = downloadFile(rel);
      if (res.status === 'downloaded') downloaded++;
      else cached++;
    } catch (err) {
      console.warn(`[mirror] Optional/missing asset ${rel}: ${err.message}`);
      missing++;
    }
  }

  console.log(`[mirror] Summary: ${downloaded} downloaded, ${cached} cached/verified, ${missing} missing out of ${assetSet.size} assets.`);
  if (verifyOnly && missing > 0) {
    process.exit(1);
  }
}

function sorted(set) {
  return Array.from(set).sort();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
