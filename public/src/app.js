import {
  DISTRICTS,
  HELPERS_META,
  AI_TOOLS,
  SEA_PESTS,
  VISITOR_FAQ_ANIMS,
  DICTIONARIES
} from './gamedev-data.js';
import { mountIslandScene, renderStageElement } from './island-canvas.js';
import { SCENE_MANIFEST } from './scene-manifest.js';

const state = {
  edition: 'gamedev', // 'gamedev' | 'classic'
  compareWithKit: true,
  activeHelperId: 'h1',
  talkPlayingAction: false,
  faqIndex: 0,
  pigJokeIndex: 0,
  workspaceGames: [],
  selectedGamePath: '',
  mountedScenes: new Map(),
  lastCliCommand: ''
};

function t(key) {
  const dict = DICTIONARIES[state.edition] || DICTIONARIES.gamedev;
  return dict[key] ?? DICTIONARIES.gamedev[key] ?? key;
}

function getHelperMeta(id) {
  return HELPERS_META.find((h) => h.id === id) || HELPERS_META[0];
}

// 1. Update all [data-i18n] text nodes and dynamic lists
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  const editionLabel = document.getElementById('edition-label');
  if (editionLabel) {
    editionLabel.textContent =
      state.edition === 'gamedev' ? 'Mode: Game-Dev Edition (VGDK)' : 'Mode: Classic Camera.ai.vn';
  }

  renderProblemsGrid();
  renderCompareRows();
  renderDistrictsList();
  renderWhoGrid();
  renderToolsGrid();
  renderFaqView();
  updatePigJokeText();
  renderSeaPests();

  // Refresh hotspot aria-labels on mounted island canvases
  for (const sceneHandle of state.mountedScenes.values()) {
    if (sceneHandle && sceneHandle.updateLabels) {
      sceneHandle.updateLabels((id) => t(`${id}/name`));
    }
  }
}

// 2. Render 6 Problem Monsters Grid
function renderProblemsGrid() {
  const ul = document.getElementById('problems-grid');
  if (!ul) return;
  ul.innerHTML = '';
  for (let i = 1; i <= 6; i++) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel problem-card';
    btn.innerHTML = `
      <img src="/game/ui/avatar-e${i}.png" alt="" width="64" height="64" class="pixel" style="flex-shrink:0;" />
      <div>
        <p style="font-weight:800;font-size:19px;">${t(`problems/e${i}/title`)}</p>
        <p style="font-size:16px;margin-top:2px;">${t(`problems/e${i}`)}</p>
        <span class="problem-counter-pill">${t(`problems/e${i}/counter`)}</span>
      </div>
    `;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.problem-card').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      // Map each problem monster to its counter helper modal
      const counterMap = { 1: 'h4', 2: 'h7', 3: 'h5', 4: 'h1', 5: 'h8', 6: 'h9' };
      openTalkModal(counterMap[i] || 'h4');
    });
    li.appendChild(btn);
    ul.appendChild(li);
  }
}

// 3. Render With vs Without the Kit Compare Rows & Island
async function mountCompareScene() {
  const container = document.getElementById('scene-compare');
  if (!container) return;
  const prev = state.mountedScenes.get('compare');
  if (prev) prev.destroy();

  const sceneKey = state.compareWithKit ? 'compare-with' : 'compare-without';
  const handle = await mountIslandScene(container, {
    scene: sceneKey,
    onHelperClick: openTalkModal,
    getHelperLabel: (id) => t(`${id}/name`)
  });
  state.mountedScenes.set('compare', handle);
}

function renderCompareRows() {
  const wrap = document.getElementById('compare-rows');
  if (!wrap) return;
  wrap.innerHTML = '';

  const track = document.getElementById('compare-switch-track');
  const btn = document.getElementById('btn-compare-toggle');
  if (track) track.classList.toggle('on', state.compareWithKit);
  if (btn) btn.setAttribute('aria-pressed', String(state.compareWithKit));

  const modeKey = state.compareWithKit ? 'with' : 'without';
  const iconFile = state.compareWithKit ? 'icon-shield.png' : 'icon-close.png';

  for (let i = 1; i <= 6; i++) {
    const row = document.createElement('div');
    row.className = `chip compare-row ${modeKey}`;
    row.innerHTML = `
      <span class="compare-topic">
        <img src="/game/ui/${iconFile}" alt="" width="24" height="24" class="pixel" />
        <span>${t(`compare/r${i}/topic`)}</span>
      </span>
      <span style="flex:1;font-size:16px;">${t(`compare/r${i}/${modeKey}`)}</span>
    `;
    wrap.appendChild(row);
  }
}

// 4. Render 3 Island Districts (9 Village Helpers)
async function renderDistrictsList() {
  const container = document.getElementById('districts-container');
  if (!container) return;

  // Only build DOM structure once so island canvases stay smooth
  if (!container.dataset.mounted) {
    container.dataset.mounted = 'true';
    container.innerHTML = '';

    for (let idx = 0; idx < DISTRICTS.length; idx++) {
      const d = DISTRICTS[idx];
      const row = document.createElement('div');
      row.className = `district-row ${idx % 2 === 1 ? 'reverse' : ''}`;

      const sceneDiv = document.createElement('div');
      sceneDiv.id = `scene-${d.scene}`;
      row.appendChild(sceneDiv);

      const card = document.createElement('div');
      card.className = 'panel district-card';
      card.innerHTML = `
        <h3 style="display:flex;align-items:center;gap:10px;font-size:23px;font-weight:800;">
          <img src="/game/ui/${d.icon}" alt="" width="28" height="28" class="pixel" />
          <span data-district-title="${d.id}">${t(`village/${d.id}`)}</span>
        </h3>
        <div class="district-helpers-wrap" data-district-helpers="${d.id}" style="display:flex;flex-direction:column;gap:10px;"></div>
        <p style="color:var(--color-muted-ink);font-size:15px;" data-i18n="village/tap">${t('village/tap')}</p>
      `;
      row.appendChild(card);
      container.appendChild(row);

      mountIslandScene(sceneDiv, {
        scene: d.scene,
        onHelperClick: openTalkModal,
        getHelperLabel: (id) => t(`${id}/name`)
      }).then((h) => state.mountedScenes.set(d.scene, h));
    }
  }

  // Update district titles and helper buttons
  for (const d of DISTRICTS) {
    const titleEl = container.querySelector(`[data-district-title="${d.id}"]`);
    if (titleEl) titleEl.textContent = t(`village/${d.id}`);

    const listWrap = container.querySelector(`[data-district-helpers="${d.id}"]`);
    if (listWrap) {
      listWrap.innerHTML = '';
      for (const hId of d.helpers) {
        const meta = getHelperMeta(hId);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip helper-list-btn';
        btn.dataset.openHelper = hId;
        btn.innerHTML = `
          <span class="helper-badge-num">${meta.number}</span>
          <span style="flex:1;">${t(`${hId}/name`)}</span>
          <span style="font-family:var(--font-mono);font-size:13px;color:var(--color-muted-ink);">${meta.skillDir}</span>
          <img src="/game/ui/icon-play.png" alt="" width="22" height="22" class="pixel" />
        `;
        btn.addEventListener('click', () => openTalkModal(hId));
        listWrap.appendChild(btn);
      }
    }
  }
}

// 5. Render Who & Tools Grids
function renderWhoGrid() {
  const ul = document.getElementById('who-grid');
  if (!ul) return;
  ul.innerHTML = '';
  for (let i = 1; i <= 4; i++) {
    const li = document.createElement('li');
    li.className = 'panel who-card';
    li.innerHTML = `
      <img src="/game/ui/persona-p${i}.png" alt="" width="112" height="112" class="pixel" />
      <p style="font-weight:800;font-size:21px;">${t(`who/p${i}/title`)}</p>
      <p style="font-size:16px;">${t(`who/p${i}`)}</p>
    `;
    ul.appendChild(li);
  }
}

function renderToolsGrid() {
  const ul = document.getElementById('tools-grid');
  if (!ul) return;
  ul.innerHTML = '';
  for (const tool of AI_TOOLS) {
    const li = document.createElement('li');
    li.className = 'tool-badge-item';
    const textColor = tool.ribbon === 'yellow' ? 'color:var(--color-ink);' : 'color:#fff;';
    const shadowClass = tool.ribbon === 'yellow' ? '' : 'text-shadow-ink';
    li.innerHTML = `
      <span class="tool-circle" style="outline:4px solid ${tool.ring};outline-offset:-12px;">
        <img src="/game/logos/${tool.logo}" alt="${tool.label}" width="44" height="44" />
      </span>
      <span class="tool-ribbon pixel ${shadowClass}" style="background-image:url(/game/ui/ribbon-${tool.ribbon}.png);${textColor}">
        ${tool.label}
      </span>
    `;
    ul.appendChild(li);
  }
}

// 6. Pig Button Guard Speech Bubble & Joke Loop
function updatePigJokeText() {
  const el = document.getElementById('pig-joke-text');
  if (el) {
    el.textContent = t(`joke/${state.pigJokeIndex + 1}`);
  }
}

function handlePigMove(px, py, sceneW) {
  const bubble = document.getElementById('pig-speech-bubble');
  if (!bubble || !sceneW) return;
  const bubbleW = bubble.offsetWidth || 320;
  const clampedLeft = Math.min(Math.max(px - bubbleW / 2, -sceneW * 0.25), sceneW * 0.25);
  const tailOffset = Math.min(Math.max(bubbleW / 2 + (px - sceneW / 2) * 0.35, 28), bubbleW - 28);
  bubble.style.transform = `translateX(${Math.round(clampedLeft)}px)`;
  bubble.style.setProperty('--tail-x', `${Math.round(tailOffset)}px`);
}

// 7. Interactive FAQ Stage (Visitor + Monk Guide)
function renderFaqView() {
  const qNum = state.faqIndex + 1;
  const qEl = document.getElementById('faq-current-q');
  const aEl = document.getElementById('faq-current-a');
  if (qEl) qEl.textContent = t(`faq/q${qNum}`);
  if (aEl) aEl.textContent = t(`faq/a${qNum}`);

  const visitorMount = document.getElementById('faq-visitor-stage');
  const guideMount = document.getElementById('faq-guide-stage');

  if (visitorMount) {
    const visitorAnim = VISITOR_FAQ_ANIMS[state.faqIndex % VISITOR_FAQ_ANIMS.length];
    renderStageElement(visitorMount, {
      stageKey: 'faq-visitor',
      animKey: visitorAnim,
      hop: true
    });
  }

  if (guideMount) {
    renderStageElement(guideMount, {
      stageKey: 'faq-guide',
      animKey: 'guide-heal',
      glowAnimKey: 'guide-heal-glow',
      hop: false
    });
  }

  const tabsWrap = document.getElementById('faq-tabs');
  if (tabsWrap) {
    tabsWrap.innerHTML = '';
    for (let i = 1; i <= 8; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.role = 'tab';
      const selected = i === qNum;
      btn.setAttribute('aria-selected', String(selected));
      btn.className = 'chip';
      btn.style.padding = '8px 16px';
      btn.style.borderRadius = '999px';
      btn.style.fontWeight = selected ? '800' : '600';
      if (selected) btn.style.background = 'var(--color-gold)';
      btn.textContent = `${i}. ${t(`faq/q${i}`)}`;
      btn.addEventListener('click', () => {
        state.faqIndex = i - 1;
        renderFaqView();
      });
      tabsWrap.appendChild(btn);
    }
  }
}

// 8. Interactive TalkDialog Modal (h1..h9)
function openTalkModal(helperId) {
  state.activeHelperId = helperId;
  state.talkPlayingAction = false;
  updateTalkModalContent();
  const modal = document.getElementById('talk-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeTalkModal() {
  const modal = document.getElementById('talk-modal');
  if (modal) modal.classList.add('hidden');
}

function updateTalkModalContent() {
  const meta = getHelperMeta(state.activeHelperId);
  const numEl = document.getElementById('talk-helper-num');
  const titleEl = document.getElementById('talk-modal-title');
  const greetEl = document.getElementById('talk-greet-text');
  const kitEl = document.getElementById('talk-kitname-text');
  const jobEl = document.getElementById('talk-job-text');
  const withoutEl = document.getElementById('talk-without-text');
  const stageMount = document.getElementById('talk-stage-mount');
  const actBtn = document.getElementById('btn-trigger-act');

  if (numEl) numEl.textContent = String(meta.number);
  if (titleEl) titleEl.textContent = t(`${meta.id}/name`);
  if (greetEl) greetEl.textContent = t(`talk/${meta.id}/greet`);
  if (kitEl) kitEl.textContent = `${t(`${meta.id}/kitname`)} (.vibekit/skills/${meta.skillDir}/SKILL.md)`;
  if (jobEl) jobEl.textContent = t(`${meta.id}/job`);
  if (withoutEl) withoutEl.textContent = t(`${meta.id}/without`);

  if (actBtn) {
    actBtn.textContent = state.talkPlayingAction ? 'Switch to Idle Pose' : 'Play Action Animation';
  }

  if (stageMount) {
    const animKey = state.talkPlayingAction ? meta.actAnim : meta.idleAnim;
    const glowKey = state.talkPlayingAction && meta.glowAnim ? meta.glowAnim : null;
    renderStageElement(stageMount, {
      stageKey: meta.stage,
      animKey,
      glowAnimKey: glowKey,
      hop: true
    });
  }
}

// 9. Swimming Sea Pests along Ocean Edges
function renderSeaPests() {
  const container = document.getElementById('sea-pests-container');
  if (!container) return;
  container.innerHTML = '';

  for (const pest of SEA_PESTS) {
    const animDef = SCENE_MANIFEST.anims[pest.anim];
    if (!animDef) continue;

    const unit = document.createElement('div');
    unit.className = 'sea-pest-unit';
    unit.style.top = `${pest.topPct}%`;
    if (pest.side === 'left') unit.style.left = '14px';
    else unit.style.right = '14px';

    let step = 0;
    const bubble = document.createElement('div');
    bubble.className = 'chip sea-pest-bubble';
    bubble.innerHTML = `<strong style="display:block;color:var(--color-ribbon-red-ink);">${t(`pest/${pest.id}/name`)}</strong><span>${t(`pest/${pest.id}/l1`)}</span>`;

    const spriteBtn = document.createElement('button');
    spriteBtn.type = 'button';
    spriteBtn.style.background = 'transparent';
    spriteBtn.style.border = 'none';
    spriteBtn.style.overflow = 'hidden';
    spriteBtn.style.width = `${animDef.w}px`;
    spriteBtn.style.height = `${animDef.h}px`;
    spriteBtn.title = `Tap to shoo ${t(`pest/${pest.id}/name`)}`;

    const img = document.createElement('img');
    img.src = `/game/anims/${animDef.file}`;
    img.width = animDef.w * animDef.frames;
    img.height = animDef.h;
    img.alt = t(`pest/${pest.id}/name`);
    img.className = 'sprite pixel';
    img.style.animationDuration = `${(animDef.frames / (animDef.fps || 8)).toFixed(2)}s`;
    img.style.animationTimingFunction = `steps(${animDef.frames})`;
    spriteBtn.appendChild(img);

    spriteBtn.addEventListener('click', () => {
      unit.classList.add('active');
      step++;
      if (step === 1) {
        bubble.innerHTML = `<strong style="display:block;color:var(--color-ribbon-red-ink);">${t(`pest/${pest.id}/name`)}</strong><span>${t(`pest/${pest.id}/l2`)}</span>`;
        unit.classList.remove('hop');
        void unit.offsetWidth;
        unit.classList.add('hop');
      } else {
        bubble.innerHTML = `<strong style="display:block;color:var(--color-emerald);">Shooed!</strong><span>${t(`pest/${pest.id}/shoo`)}</span>`;
        const splashDef = SCENE_MANIFEST.anims.splash;
        if (splashDef) {
          spriteBtn.style.width = `${splashDef.w}px`;
          spriteBtn.style.height = `${splashDef.h}px`;
          img.src = `/game/anims/${splashDef.file}`;
          img.width = splashDef.w * splashDef.frames;
          img.height = splashDef.h;
          img.style.animationDuration = `${(splashDef.frames / (splashDef.fps || 14)).toFixed(2)}s`;
          img.style.animationTimingFunction = `steps(${splashDef.frames})`;
        }
        setTimeout(() => {
          step = 0;
          spriteBtn.style.width = `${animDef.w}px`;
          spriteBtn.style.height = `${animDef.h}px`;
          img.src = `/game/anims/${animDef.file}`;
          img.width = animDef.w * animDef.frames;
          img.height = animDef.h;
          img.style.animationDuration = `${(animDef.frames / (animDef.fps || 8)).toFixed(2)}s`;
          img.style.animationTimingFunction = `steps(${animDef.frames})`;
          bubble.innerHTML = `<strong style="display:block;color:var(--color-ribbon-red-ink);">${t(`pest/${pest.id}/name`)}</strong><span>${t(`pest/${pest.id}/l1`)}</span>`;
        }, 1600);
      }
    });

    unit.appendChild(bubble);
    unit.appendChild(spriteBtn);
    container.appendChild(unit);
  }
}

// 10. Live Game-Dev Command Center (Workspace Game Scanner, Village Doctor & Installer)
async function initWorkshopCommandCenter() {
  const selectEl = document.getElementById('workspace-game-select');
  if (!selectEl) return;

  try {
    const res = await fetch('/api/workspace-games');
    const data = await res.json();
    state.workspaceGames = data.games || [];

    selectEl.innerHTML = '';
    for (const g of state.workspaceGames) {
      const opt = document.createElement('option');
      opt.value = g.path;
      const badge = g.vgdkInstalled ? '✓ VGDK' : g.engine;
      opt.textContent = `${g.folderName} — [${badge}] (${g.fileCount} files)`;
      selectEl.appendChild(opt);
    }

    // Default to Sauria-Prime or too-cute-to-handle if present
    const preferred =
      state.workspaceGames.find((g) => g.id === 'sauria-prime-root') ||
      state.workspaceGames.find((g) => g.folderName === 'too-cute-to-handle') ||
      state.workspaceGames[0];

    if (preferred) {
      state.selectedGamePath = preferred.path;
      selectEl.value = preferred.path;
      await refreshSelectedGameDoctor();
      await previewSelectedGameBundle();
    }
  } catch (err) {
    console.error('[workshop] Failed to load workspace games:', err);
  }

  selectEl.addEventListener('change', async () => {
    state.selectedGamePath = selectEl.value;
    await refreshSelectedGameDoctor();
    await previewSelectedGameBundle();
  });

  document.getElementById('btn-run-doctor')?.addEventListener('click', refreshSelectedGameDoctor);
  document.getElementById('btn-preview-kit')?.addEventListener('click', previewSelectedGameBundle);
  document.getElementById('btn-dryrun-kit')?.addEventListener('click', () => runInstallKit(true));
  document.getElementById('btn-install-kit')?.addEventListener('click', () => runInstallKit(false));

  for (const id of ['cfg-target-fps', 'cfg-draw-calls', 'cfg-coding-level', 'cfg-trash-first']) {
    document.getElementById(id)?.addEventListener('change', previewSelectedGameBundle);
  }

  document.getElementById('btn-copy-cli')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-copy-cli');
    if (state.lastCliCommand && navigator.clipboard) {
      await navigator.clipboard.writeText(state.lastCliCommand);
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = 'Copy CLI Command';
        }, 1500);
      }
    }
  });
}

function getWorkshopConfig() {
  return {
    targetFps: Number(document.getElementById('cfg-target-fps')?.value || 60),
    maxDrawCalls: Number(document.getElementById('cfg-draw-calls')?.value || 250),
    codingLevel: Number(document.getElementById('cfg-coding-level')?.value || 3),
    trashFirst: Boolean(document.getElementById('cfg-trash-first')?.checked ?? true)
  };
}

async function refreshSelectedGameDoctor() {
  if (!state.selectedGamePath) return;
  const res = await fetch('/api/doctor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gamePath: state.selectedGamePath })
  });
  const report = await res.json();

  const pillsEl = document.getElementById('selected-game-pills');
  if (pillsEl && report.game) {
    const g = report.game;
    pillsEl.innerHTML = `
      <span class="meta-pill">${g.engine}</span>
      <span class="meta-pill">${g.artStyle}</span>
      <span class="meta-pill ${g.hasQaScript ? 'ok' : ''}">QA: ${g.hasQaScript ? 'Detected' : 'Template Ready'}</span>
      <span class="meta-pill ${g.vgdkInstalled ? 'ok' : ''}">${g.vgdkInstalled ? 'VGDK Installed' : 'Ready to Install'}</span>
    `;
  }

  const scoreEl = document.getElementById('doctor-score-badge');
  if (scoreEl) scoreEl.textContent = `Village Doctor: ${report.score}`;

  const listEl = document.getElementById('doctor-checks-list');
  if (listEl && report.checks) {
    listEl.innerHTML = '';
    for (const c of report.checks) {
      const num = c.helperId.replace('h', '');
      const item = document.createElement('div');
      item.className = 'doctor-check-item';
      item.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="helper-badge-num" style="width:26px;height:26px;font-size:13px;">${num}</span>
          <div>
            <p style="font-weight:800;font-size:15px;">${c.helperName} <code style="font-size:12px;color:var(--color-muted-ink);">(${c.skill})</code></p>
            <p style="font-size:13px;color:var(--color-muted-ink);">${c.summary}</p>
          </div>
        </div>
        <span class="status-tag ${c.status}">${c.status}</span>
      `;
      item.addEventListener('click', () => openTalkModal(c.helperId));
      listEl.appendChild(item);
    }
  }
}

async function previewSelectedGameBundle() {
  if (!state.selectedGamePath) return;
  const res = await fetch('/api/preview-install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gamePath: state.selectedGamePath,
      config: getWorkshopConfig()
    })
  });
  const bundle = await res.json();
  state.lastCliCommand = bundle.cliCommand || '';

  const titleEl = document.getElementById('preview-box-title');
  if (titleEl) titleEl.textContent = `Preview: ${bundle.game?.folderName}/backbone.yml`;

  const codeEl = document.getElementById('workshop-code-preview');
  if (codeEl) {
    codeEl.textContent = `# CLI Command:\n# ${bundle.cliCommand}\n\n${bundle.backboneContent}`;
  }
}

async function runInstallKit(dryRun) {
  if (!state.selectedGamePath) return;
  const res = await fetch('/api/install-kit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gamePath: state.selectedGamePath,
      dryRun,
      config: getWorkshopConfig()
    })
  });
  const result = await res.json();

  const titleEl = document.getElementById('preview-box-title');
  if (titleEl) {
    titleEl.textContent = dryRun
      ? `Dry-Run Summary for ${result.game?.folderName} (No files modified)`
      : `Installed VGDK into ${result.game?.folderName}!`;
  }

  const lines = (result.actions || []).map((a) => `• [${a.type}] ${a.file || a.dir}`);
  const codeEl = document.getElementById('workshop-code-preview');
  if (codeEl) {
    codeEl.textContent = `${dryRun ? '=== DRY-RUN ACTIONS ===' : '=== APPLIED ACTIONS ==='}\n${lines.join('\n')}\n\n${result.backbonePreview}`;
  }

  if (!dryRun) {
    await refreshSelectedGameDoctor();
  }
}

// 11. Boot All Island Scenes & Event Listeners
async function initApp() {
  applyTranslations();

  // Mount main static islands
  const heroEl = document.getElementById('scene-hero');
  if (heroEl) {
    mountIslandScene(heroEl, {
      scene: 'hero',
      onHelperClick: openTalkModal,
      getHelperLabel: (id) => t(`${id}/name`)
    }).then((h) => state.mountedScenes.set('hero', h));
  }

  const problemsEl = document.getElementById('scene-problems');
  if (problemsEl) {
    mountIslandScene(problemsEl, {
      scene: 'problems',
      onHelperClick: openTalkModal,
      getHelperLabel: (id) => t(`${id}/name`)
    }).then((h) => state.mountedScenes.set('problems', h));
  }

  mountCompareScene();

  const priceEl = document.getElementById('scene-price');
  if (priceEl) {
    mountIslandScene(priceEl, {
      scene: 'price',
      onHelperClick: openTalkModal,
      getHelperLabel: (id) => t(`${id}/name`)
    }).then((h) => state.mountedScenes.set('price', h));
  }

  const arenaEl = document.getElementById('scene-arena');
  if (arenaEl) {
    mountIslandScene(arenaEl, {
      scene: 'arena',
      pigLoop: { left: 172, right: 532, top: 150, bottom: 308 },
      onPigMove: handlePigMove
    }).then((h) => state.mountedScenes.set('arena', h));
  }

  // Footer strip has all 9 helpers standing across the island waving goodbye!
  const footerEl = document.getElementById('scene-footer-strip');
  if (footerEl) {
    const footerHelpers = [
      { sheet: 'units-blue-pawn-pawn-idle', x: 300, y: 270, anchor: [0.5, 0.7], frames: 8, fps: 8, frameW: 192, frameH: 192, helper: 'h1' },
      { sheet: 'units-blue-pawn-pawn-idle-wood', x: 390, y: 278, anchor: [0.5, 0.7], frames: 8, fps: 8, frameW: 192, frameH: 192, helper: 'h2' },
      { sheet: 'units-blue-monk-monk-idle', x: 480, y: 270, anchor: [0.5, 0.7], frames: 6, fps: 8, frameW: 192, frameH: 192, helper: 'h3' },
      { sheet: 'units-yellow-warrior-warrior-idle', x: 580, y: 274, anchor: [0.5, 0.7], frames: 8, fps: 8, frameW: 192, frameH: 192, helper: 'h4' },
      { sheet: 'units-yellow-pawn-pawn-idle-hammer', x: 670, y: 278, anchor: [0.5, 0.7], frames: 8, fps: 8, frameW: 192, frameH: 192, helper: 'h5' },
      { sheet: 'units-yellow-pawn-pawn-run', x: 760, y: 274, anchor: [0.5, 0.7], frames: 6, fps: 10, frameW: 192, frameH: 192, helper: 'h6' },
      { sheet: 'units-red-archer-archer-idle', x: 860, y: 272, anchor: [0.5, 0.7], frames: 6, fps: 8, frameW: 192, frameH: 192, helper: 'h7' },
      { sheet: 'units-red-lancer-lancer-idle', x: 960, y: 278, anchor: [0.47, 0.62], frames: 12, fps: 8, frameW: 320, frameH: 320, helper: 'h8' },
      { sheet: 'units-red-warrior-warrior-idle', x: 1060, y: 272, anchor: [0.5, 0.7], frames: 8, fps: 8, frameW: 192, frameH: 192, helper: 'h9' }
    ];
    mountIslandScene(footerEl, {
      scene: 'footer-strip',
      extraActors: footerHelpers,
      onHelperClick: openTalkModal,
      getHelperLabel: (id) => t(`${id}/name`)
    }).then((h) => state.mountedScenes.set('footer-strip', h));
  }

  // Edition Switcher
  document.getElementById('btn-toggle-edition')?.addEventListener('click', () => {
    state.edition = state.edition === 'gamedev' ? 'classic' : 'gamedev';
    applyTranslations();
  });

  // Compare Toggle
  document.getElementById('btn-compare-toggle')?.addEventListener('click', async () => {
    state.compareWithKit = !state.compareWithKit;
    renderCompareRows();
    await mountCompareScene();
  });

  // Pig Joke rotator (every 3.5s + on click)
  setInterval(() => {
    state.pigJokeIndex = (state.pigJokeIndex + 1) % 8;
    updatePigJokeText();
  }, 3500);

  document.getElementById('scene-arena')?.addEventListener('click', () => {
    state.pigJokeIndex = (state.pigJokeIndex + 1) % 8;
    updatePigJokeText();
  });

  // FAQ Next Question
  document.getElementById('btn-next-faq')?.addEventListener('click', () => {
    state.faqIndex = (state.faqIndex + 1) % 8;
    renderFaqView();
  });

  // TalkDialog Controls
  document.getElementById('btn-close-talk')?.addEventListener('click', closeTalkModal);
  document.getElementById('talk-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'talk-modal') closeTalkModal();
  });
  document.getElementById('btn-talk-to-workshop')?.addEventListener('click', closeTalkModal);

  document.getElementById('btn-trigger-act')?.addEventListener('click', () => {
    state.talkPlayingAction = !state.talkPlayingAction;
    updateTalkModalContent();
  });

  document.getElementById('btn-prev-helper')?.addEventListener('click', () => {
    const idx = HELPERS_META.findIndex((h) => h.id === state.activeHelperId);
    const prevIdx = (idx - 1 + HELPERS_META.length) % HELPERS_META.length;
    state.activeHelperId = HELPERS_META[prevIdx].id;
    state.talkPlayingAction = false;
    updateTalkModalContent();
  });

  document.getElementById('btn-next-helper')?.addEventListener('click', () => {
    const idx = HELPERS_META.findIndex((h) => h.id === state.activeHelperId);
    const nextIdx = (idx + 1) % HELPERS_META.length;
    state.activeHelperId = HELPERS_META[nextIdx].id;
    state.talkPlayingAction = false;
    updateTalkModalContent();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTalkModal();
  });

  await initWorkshopCommandCenter();
}

initApp();
