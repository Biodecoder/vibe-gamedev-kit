import { SCENE_MANIFEST } from './scene-manifest.js';

const IMAGE_CACHE = new Map();

export function loadImage(src) {
  if (IMAGE_CACHE.has(src)) return IMAGE_CACHE.get(src);
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  IMAGE_CACHE.set(src, promise);
  return promise;
}

/**
 * Mounts an animated floating island scene onto a container element.
 * Renders:
 * 1. Animated 16-frame 192x192 shoreline water foam tiles (terrain-tileset-water-foam.png)
 * 2. Crisp nearest-neighbor island base terrain (island-*.png)
 * 3. Y-sorted animated sprite-sheet actors (trees, sheep, boats, monsters, 9 helpers)
 * 4. Optional patrolling Pig Rider (extra-pig-rider-pig-rider-run.png) with live position callback
 * 5. Interactive numbered helper hotspot buttons (h1..h9)
 */
export async function mountIslandScene(container, options) {
  const {
    scene,
    onHelperClick,
    getHelperLabel,
    pigLoop = null,
    onPigMove = null,
    extraActors = []
  } = options;

  const islandDef = SCENE_MANIFEST.islands[scene];
  if (!islandDef) {
    console.warn(`[island-canvas] Unknown island scene: ${scene}`);
    return null;
  }

  container.innerHTML = '';
  container.classList.add('island-scene-wrap');
  container.style.setProperty('--island-w', `${islandDef.w}px`);
  container.style.setProperty('--island-h', `${islandDef.h}px`);

  const canvas = document.createElement('canvas');
  canvas.width = islandDef.w;
  canvas.height = islandDef.h;
  canvas.className = 'island-scene-canvas pixel';
  canvas.dataset.scene = scene;
  canvas.dataset.painted = 'false';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Build interactive hotspot buttons for helpers (h1..h9)
  const hotspotLayer = document.createElement('div');
  hotspotLayer.className = 'island-hotspot-layer';
  container.appendChild(hotspotLayer);

  const allHotspots = [
    ...(islandDef.hotspots || []),
    ...extraActors
      .filter((a) => a.helper)
      .map((a) => ({ id: a.helper, x: a.x - 32, y: a.y - 80, w: 64, h: 80 }))
  ];

  const hotspotButtons = [];
  for (const hs of allHotspots) {
    const num = Number(hs.id.replace('h', '')) || 1;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'island-helper-hotspot';
    btn.dataset.helperId = hs.id;
    const leftPct = (hs.x / islandDef.w) * 100;
    const topPct = (Math.max(0, hs.y - 26) / islandDef.h) * 100;
    const wPct = (Math.max(hs.w, 54) / islandDef.w) * 100;
    const hPct = ((hs.h + 26) / islandDef.h) * 100;
    btn.style.left = `${leftPct}%`;
    btn.style.top = `${topPct}%`;
    btn.style.width = `${wPct}%`;
    btn.style.height = `${hPct}%`;

    const labelText = getHelperLabel ? getHelperLabel(hs.id) : hs.id;
    btn.setAttribute('aria-label', `${num}. ${labelText}`);
    btn.title = `${num}. ${labelText}`;
    btn.innerHTML = `<span class="helper-badge-num">${num}</span>`;
    btn.addEventListener('click', () => {
      if (onHelperClick) onHelperClick(hs.id);
    });
    hotspotLayer.appendChild(btn);
    hotspotButtons.push({ id: hs.id, num, btn });
  }

  // Preload required textures for this island
  const actorList = [...(islandDef.actors || []), ...extraActors]
    .map((actor, idx) => ({
      ...actor,
      phaseOffset: (idx * 3) % Math.max(1, actor.frames || 1)
    }))
    .sort((a, b) => a.y - b.y);

  const foamSpots = (islandDef.foam || []).map((spot, idx) => ({
    x: spot.x,
    y: spot.y,
    phaseOffset: (idx * 2) % 16
  }));

  const uniqueSheetNames = new Set(actorList.map((a) => a.sheet));
  if (foamSpots.length > 0) uniqueSheetNames.add('terrain-tileset-water-foam');
  if (pigLoop) uniqueSheetNames.add('extra-pig-rider-pig-rider-run');

  const [islandImg, foamFallbackImg, ...sheetEntries] = await Promise.all([
    loadImage(`/game/islands/${islandDef.file}`),
    islandDef.foamFile ? loadImage(`/game/islands/${islandDef.foamFile}`) : Promise.resolve(null),
    ...Array.from(uniqueSheetNames).map(async (sheetName) => {
      const img = await loadImage(`/game/strips/${sheetName}.png`);
      return [sheetName, img];
    })
  ]);

  const sheetImages = Object.fromEntries(sheetEntries);
  const foamImg = sheetImages['terrain-tileset-water-foam'];
  const pigImg = sheetImages['extra-pig-rider-pig-rider-run'];

  let pigDist = 0;
  let lastTime = performance.now();
  let rafId = null;
  let destroyed = false;

  function renderFrame(now) {
    if (destroyed) return;
    const dtMs = Math.min(50, Math.max(0, now - lastTime));
    lastTime = now;
    const elapsedSec = now / 1000;

    ctx.clearRect(0, 0, islandDef.w, islandDef.h);
    ctx.imageSmoothingEnabled = false;

    // 1. Draw animated shoreline foam tiles (16 frames of 192x192 at 8 fps)
    if (foamImg && foamSpots.length > 0) {
      const foamFrames = 16;
      const foamFps = 8;
      for (const spot of foamSpots) {
        const frameIdx = (Math.floor(elapsedSec * foamFps) + spot.phaseOffset) % foamFrames;
        ctx.drawImage(
          foamImg,
          frameIdx * 192,
          0,
          192,
          192,
          spot.x,
          spot.y,
          192,
          192
        );
      }
    } else if (foamFallbackImg) {
      ctx.drawImage(foamFallbackImg, 0, 0, islandDef.w, islandDef.h);
    }

    // 2. Draw base island terrain PNG
    if (islandImg) {
      ctx.drawImage(islandImg, 0, 0, islandDef.w, islandDef.h);
    }

    // 3. Draw Y-sorted animated sprite-sheet actors
    for (const actor of actorList) {
      const img = sheetImages[actor.sheet];
      if (!img) continue;
      const frames = Math.max(1, actor.frames || 1);
      const fps = actor.fps || 8;
      const frameW = actor.frameW || Math.floor(img.naturalWidth / frames);
      const frameH = actor.frameH || img.naturalHeight;
      const frameIdx = frames > 1
        ? (Math.floor(elapsedSec * fps) + (actor.startFrame || 0) + actor.phaseOffset) % frames
        : 0;
      const anchorX = Array.isArray(actor.anchor) ? actor.anchor[0] : 0.5;
      const anchorY = Array.isArray(actor.anchor) ? actor.anchor[1] : 0.7;
      const drawX = Math.round(actor.x - anchorX * frameW);
      const drawY = Math.round(actor.y - anchorY * frameH);

      ctx.drawImage(
        img,
        frameIdx * frameW,
        0,
        frameW,
        frameH,
        drawX,
        drawY,
        frameW,
        frameH
      );
    }

    // 4. Draw patrolling Pig Rider ("The Button Guard") on the Arena island
    if (pigLoop && pigImg) {
      const rectW = pigLoop.right - pigLoop.left;
      const rectH = pigLoop.bottom - pigLoop.top;
      const perimeter = 2 * (rectW + rectH);
      pigDist = (pigDist + dtMs * 0.065) % perimeter;

      let px = pigLoop.left;
      let py = pigLoop.top;
      let flipX = false;

      if (pigDist < rectW) {
        px = pigLoop.left + pigDist;
        py = pigLoop.top;
        flipX = false;
      } else if (pigDist < rectW + rectH) {
        px = pigLoop.right;
        py = pigLoop.top + (pigDist - rectW);
        flipX = false;
      } else if (pigDist < 2 * rectW + rectH) {
        px = pigLoop.right - (pigDist - rectW - rectH);
        py = pigLoop.bottom;
        flipX = true;
      } else {
        px = pigLoop.left;
        py = pigLoop.bottom - (pigDist - 2 * rectW - rectH);
        flipX = true;
      }

      const pigFrame = Math.floor(elapsedSec * 10) % 4;
      const frameW = 256;
      const frameH = 256;
      const anchorX = 0.5;
      const anchorY = 0.78;

      ctx.save();
      ctx.translate(Math.round(px), Math.round(py));
      if (flipX) ctx.scale(-1, 1);
      ctx.drawImage(
        pigImg,
        pigFrame * frameW,
        0,
        frameW,
        frameH,
        Math.round(-anchorX * frameW),
        Math.round(-anchorY * frameH),
        frameW,
        frameH
      );
      ctx.restore();

      if (onPigMove) {
        const scale = canvas.clientWidth / islandDef.w || 1;
        onPigMove(px * scale, py * scale, canvas.clientWidth, canvas.clientHeight);
      }
    }

    if (canvas.dataset.painted !== 'true') {
      canvas.dataset.painted = 'true';
    }

    rafId = requestAnimationFrame(renderFrame);
  }

  // Paint initial frame immediately once textures resolve, then continue RAF loop
  renderFrame(performance.now());

  return {
    canvas,
    islandDef,
    updateLabels(getLabelFn) {
      for (const item of hotspotButtons) {
        const text = getLabelFn(item.id);
        item.btn.setAttribute('aria-label', `${item.num}. ${text}`);
        item.btn.title = `${item.num}. ${text}`;
      }
    },
    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
    }
  };
}

/**
 * Renders a character stage (e.g., TalkDialog stage-talk-h1..h9 or FAQ stage-faq-visitor/guide)
 * with its base stage PNG and animated sprite strip positioned at stage.spot.
 */
export function renderStageElement(container, { stageKey, animKey, glowAnimKey = null, hop = false }) {
  const stageDef = SCENE_MANIFEST.stages[stageKey];
  const animDef = SCENE_MANIFEST.anims[animKey];
  if (!stageDef || !animDef) return;

  container.innerHTML = '';
  container.className = `stage-figure-box ${hop ? 'hop' : ''}`;
  container.style.width = `${stageDef.w}px`;
  container.style.height = `${stageDef.h}px`;

  const stageImg = document.createElement('img');
  stageImg.src = `/game/stages/${stageDef.file}`;
  stageImg.width = stageDef.w;
  stageImg.height = stageDef.h;
  stageImg.alt = '';
  stageImg.className = 'pixel stage-bg-img';
  container.appendChild(stageImg);

  function appendStrip(def, extraClass = '') {
    const wrap = document.createElement('span');
    wrap.className = `stage-anim-clip ${extraClass}`;
    wrap.style.width = `${def.w}px`;
    wrap.style.height = `${def.h}px`;
    wrap.style.left = `${stageDef.spot.x - def.foot.x}px`;
    wrap.style.top = `${stageDef.spot.y - def.foot.y}px`;

    const strip = document.createElement('img');
    strip.src = `/game/anims/${def.file}`;
    strip.width = def.w * def.frames;
    strip.height = def.h;
    strip.alt = '';
    strip.className = 'sprite pixel stage-strip-img';
    strip.style.animationDuration = `${(def.frames / (def.fps || 8)).toFixed(3)}s`;
    strip.style.animationTimingFunction = `steps(${def.frames})`;
    wrap.appendChild(strip);
    container.appendChild(wrap);
  }

  appendStrip(animDef);
  if (glowAnimKey && SCENE_MANIFEST.anims[glowAnimKey]) {
    appendStrip(SCENE_MANIFEST.anims[glowAnimKey], 'stage-glow-layer');
  }
}
