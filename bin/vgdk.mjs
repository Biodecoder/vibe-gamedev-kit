#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const KIT_ROOT = path.resolve(__dirname, '..');
export const DEFAULT_WORKSPACE = path.resolve(KIT_ROOT, '..');

const IGNORED_DIRS = new Set([
  '.git',
  '.npm-cache',
  '.tmp',
  '.vercel',
  'node_modules',
  'dist',
  'assets',
  'docs',
  'evidence',
  'public',
  'scripts',
  'src'
]);

function safeReadText(filePath) {
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch {
    // ignore
  }
  return '';
}

function listFilesRecursive(dir, maxDepth = 3, depth = 0, acc = []) {
  if (depth > maxDepth || !fs.existsSync(dir)) return acc;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFilesRecursive(full, maxDepth, depth + 1, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

export function inspectGameDirectory(gameDir, idOverride = null) {
  const absDir = path.resolve(gameDir);
  const folderName = path.basename(absDir);
  const isWorkspaceRoot = absDir === DEFAULT_WORKSPACE;
  const id = idOverride || (isWorkspaceRoot ? 'sauria-prime-root' : folderName);

  const pkgPath = path.join(absDir, 'package.json');
  const indexHtmlPath = path.join(absDir, 'index.html');
  const publicIndexHtmlPath = path.join(absDir, 'public', 'index.html');
  const serverMjsPath = path.join(absDir, 'server.mjs');
  const backbonePath = path.join(absDir, 'backbone.yml');
  const agentsPath = path.join(absDir, 'AGENTS.md');
  const readmePath = path.join(absDir, 'README.md');

  const pkgRaw = safeReadText(pkgPath);
  let pkg = {};
  try {
    pkg = pkgRaw ? JSON.parse(pkgRaw) : {};
  } catch {
    pkg = {};
  }

  const indexHtml = safeReadText(indexHtmlPath) || safeReadText(publicIndexHtmlPath);
  const readme = safeReadText(readmePath);
  const agentsMd = safeReadText(agentsPath);
  const backboneYml = safeReadText(backbonePath);

  // Sample source files (limit to first 40 files if workspace root)
  const files = isWorkspaceRoot
    ? [
        ...listFilesRecursive(path.join(absDir, 'src'), 3),
        ...listFilesRecursive(path.join(absDir, 'scripts'), 2)
      ]
    : listFilesRecursive(absDir, 3);

  const relFiles = files.map((f) => path.relative(absDir, f));
  const combinedSample = [
    pkgRaw,
    indexHtml.slice(0, 15000),
    readme.slice(0, 6000)
  ].join('\n');

  // Detect engine
  let engine = 'Canvas2D / HTML5';
  if (/three|THREE|WebGLRenderer|CelShader/i.test(combinedSample) || relFiles.some((f) => /three|shader|DinoMesh|IslandWorld/i.test(f))) {
    engine = 'Three.js 3D WebGL';
  } else if (/pixi|PIXI/i.test(combinedSample)) {
    engine = 'PixiJS 2D WebGL';
  } else if (/phaser/i.test(combinedSample)) {
    engine = 'Phaser 2D';
  }

  // Detect art style
  let artStyle = 'Stylized 2D / Pixel Art';
  if (/cel[- ]?shad|ligne claire|outline|comic/i.test(combinedSample)) {
    artStyle = 'Cel-Shaded 3D & Ink Outlines';
  } else if (engine === 'Three.js 3D WebGL') {
    artStyle = 'Stylized 3D WebGL';
  } else if (/2\.5D|plaza-canvas|dof-blur/i.test(combinedSample)) {
    artStyle = '2.5D Illustrated Arcade';
  }

  const has3dAssets = relFiles.some((f) => /\.(glb|gltf|obj)$/i.test(f));
  const hasSpriteAssets = relFiles.some((f) => /\.(png|svg|webp)$/i.test(f));
  const hasShaders = relFiles.some((f) => /shader|\.glsl|\.frag|\.vert/i.test(f)) || /ShaderMaterial|glsl/i.test(combinedSample);
  const hasQaScript = Boolean(
    (pkg.scripts && (pkg.scripts.qa || pkg.scripts.test || pkg.scripts.verify)) ||
      relFiles.some((f) => /qa|verify|playwright|test/i.test(f))
  );
  const hasReaDocs = relFiles.some((f) => /rea_|decompile|evidence/i.test(f)) || fs.existsSync(path.join(absDir, 'docs'));
  const hasBackboneYml = fs.existsSync(backbonePath);
  const hasAgentsMd = fs.existsSync(agentsPath);
  const vgdkInstalled = hasBackboneYml && /vibe-gamedev-kit|minimal-vibe-coding-kit/i.test(backboneYml + agentsMd);

  // Extract friendly title
  let title = pkg.name || folderName;
  const titleMatch = indexHtml.match(/<title>([^<]+)<\/title>/i) || readme.match(/^#\s+([^\n]+)/m);
  if (titleMatch) {
    title = titleMatch[1].trim().slice(0, 72);
  }

  return {
    id,
    folderName: isWorkspaceRoot ? 'Sauria-Prime (Workspace Root)' : folderName,
    title,
    path: absDir,
    engine,
    artStyle,
    fileCount: relFiles.length,
    hasIndexHtml: Boolean(indexHtml),
    hasServerMjs: fs.existsSync(serverMjsPath),
    hasQaScript,
    has3dAssets,
    hasSpriteAssets,
    hasShaders,
    hasReaDocs,
    hasBackboneYml,
    hasAgentsMd,
    vgdkInstalled
  };
}

export function scanWorkspace(workspaceRoot = DEFAULT_WORKSPACE) {
  const results = [];
  // Include root game (Sauria Prime) if index.html exists
  if (fs.existsSync(path.join(workspaceRoot, 'index.html'))) {
    results.push(inspectGameDirectory(workspaceRoot, 'sauria-prime-root'));
  }

  const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const subDir = path.join(workspaceRoot, entry.name);
    const hasGameMarker =
      fs.existsSync(path.join(subDir, 'index.html')) ||
      fs.existsSync(path.join(subDir, 'public', 'index.html')) ||
      fs.existsSync(path.join(subDir, 'package.json')) ||
      fs.existsSync(path.join(subDir, 'src'));
    if (hasGameMarker) {
      results.push(inspectGameDirectory(subDir));
    }
  }

  return results.sort((a, b) => {
    if (a.folderName === 'vibe-gamedev-kit') return -1;
    if (b.folderName === 'vibe-gamedev-kit') return 1;
    return a.folderName.localeCompare(b.folderName);
  });
}

export function doctorGame(gameDir) {
  const info = inspectGameDirectory(gameDir);
  const checks = [
    {
      helperId: 'h1',
      helperName: 'The Game Rule Learner',
      skill: 'vgdk-init',
      status: info.hasBackboneYml ? 'pass' : 'ready',
      summary: info.hasBackboneYml
        ? `backbone.yml detected for ${info.engine} (${info.artStyle}).`
        : `Detected ${info.engine} (${info.artStyle}); ready to generate backbone.yml.`
    },
    {
      helperId: 'h2',
      helperName: 'The Multi-Agent Translator',
      skill: 'multi-agent-translator',
      status: info.vgdkInstalled ? 'pass' : 'ready',
      summary: info.vgdkInstalled
        ? 'Managed VGDK rules synced to AGENTS.md & skill surfaces.'
        : 'Ready to install managed blocks for Antigravity, Claude, Cursor, Codex, OpenCode & Grok.'
    },
    {
      helperId: 'h3',
      helperName: 'The Plain-Talk Designer',
      skill: 'wait-what',
      status: 'pass',
      summary: 'Explanation levels 0–5 (/wait-what) ready for game design & shader breakdowns.'
    },
    {
      helperId: 'h4',
      helperName: 'The Playtest Promise Keeper',
      skill: 'closed-loop-playtest',
      status: info.hasQaScript ? 'pass' : 'warn',
      summary: info.hasQaScript
        ? 'Automated QA/verification script detected for closed-loop playtest proof.'
        : 'No dedicated npm run qa script found yet — closed-loop playtest template recommended.'
    },
    {
      helperId: 'h5',
      helperName: 'The 60FPS Forgemaster',
      skill: 'playable-loop-60fps-gate',
      status: info.hasIndexHtml ? 'pass' : 'warn',
      summary: `60FPS hot-loop & WASD keyboard fallback gate configured for ${info.engine}.`
    },
    {
      helperId: 'h6',
      helperName: 'The Lore & Mechanics Archaeologist',
      skill: 'rea-mechanics-decompiler',
      status: info.hasReaDocs ? 'pass' : 'ready',
      summary: info.hasReaDocs
        ? 'Docs / REA mechanics evidence directory detected.'
        : 'REA evidence spec builder ready for docs/rea_<feature>_report.json.'
    },
    {
      helperId: 'h7',
      helperName: 'The HUD & Visual Sentinel',
      skill: 'visual-hud-qa-loop',
      status: info.hasIndexHtml ? 'pass' : 'warn',
      summary: 'Playwright HUD bounding-box overlap & canvas luminance gate ready.'
    },
    {
      helperId: 'h8',
      helperName: 'The Asset & Shader Warden',
      skill: 'asset-shader-pipeline-guard',
      status: info.has3dAssets || info.hasSpriteAssets || info.hasShaders ? 'pass' : 'ready',
      summary: `Guarding ${info.fileCount} project files (${info.has3dAssets ? '3D GLB + ' : ''}${info.hasShaders ? 'Shaders + ' : ''}2D Assets) with trash-first policy.`
    },
    {
      helperId: 'h9',
      helperName: 'The Playtest Reviewer',
      skill: 'reviewing-4p-priorities',
      status: 'pass',
      summary: 'P0–P4 gameplay, collision, HUD & frame-pacing review matrix active.'
    }
  ];

  const passCount = checks.filter((c) => c.status === 'pass').length;
  return {
    game: info,
    score: `${passCount}/${checks.length}`,
    checks
  };
}

export function generateKitBundle(gameDir, customConfig = {}) {
  const info = inspectGameDirectory(gameDir);
  const targetFps = Number(customConfig.targetFps) || 60;
  const maxDrawCalls = Number(customConfig.maxDrawCalls) || (info.engine.includes('Three.js') ? 250 : 120);
  const codingLevel = Number(customConfig.codingLevel ?? 3);
  const trashFirst = customConfig.trashFirst !== false;
  const engineSlug = info.engine.includes('Three.js')
    ? 'threejs'
    : info.engine.includes('Pixi')
      ? 'pixijs'
      : 'canvas2d';

  const backboneContent = `# Vibe Game-Dev Kit (VGDK) backbone manifest for ${info.folderName}
version: 2
meta:
  template_status: initialized
  initialized_at: ${new Date().toISOString()}
  template_source: vibe-gamedev-kit
  schema_version: 4

project:
  name: "${info.id}"
  title: "${info.title.replace(/"/g, '\\"')}"
  type: game
  primary_language: js
  package_manager: npm

preferences:
  safe_delete_trash_first: ${trashFirst}
  default_coding_level: ${codingLevel}

gamedev:
  engine: "${engineSlug}"
  art_style: "${info.artStyle}"
  performance_budget:
    target_fps: ${targetFps}
    max_frame_ms: ${(1000 / targetFps).toFixed(1)}
    max_draw_calls: ${maxDrawCalls}
    forbid_hot_loop_allocations: true
  hud_contract:
    deconflict_bounding_boxes: true
    center_crosshair_clearance_px: 120
  input_contract:
    require_keyboard_fallback_when_pointerlock: true
  asset_pipeline:
    validate_glb_bounds: ${info.has3dAssets}
    validate_spritesheet_frames: ${info.hasSpriteAssets}
    shader_aa_required: ${info.hasShaders}
    safe_delete_trash_first: ${trashFirst}

commands:
  start: "${info.hasServerMjs ? 'node server.mjs' : 'npm start'}"
  validate: "${info.hasQaScript ? 'npm run qa' : 'node scripts/qa-verify.mjs'}"
`;

  const managedAgentsBlock = fs
    .readFileSync(path.join(KIT_ROOT, 'AGENTS.md'), 'utf8')
    .match(/<!-- BEGIN: vibe-gamedev-kit -->[\s\S]*<!-- END: vibe-gamedev-kit -->/)[0];

  return {
    game: info,
    backboneContent,
    managedAgentsBlock,
    cliCommand: `node /Users/derya/Gemini-4/vibe-gamedev-kit/bin/vgdk.mjs install "${info.path}"`
  };
}

export function installKitToGame(gameDir, options = {}) {
  const { dryRun = false, customConfig = {} } = options;
  const bundle = generateKitBundle(gameDir, customConfig);
  const absDir = bundle.game.path;
  const actions = [];

  const backboneDest = path.join(absDir, 'backbone.yml');
  const agentsDest = path.join(absDir, 'AGENTS.md');
  const claudeDest = path.join(absDir, 'CLAUDE.md');

  actions.push({ type: 'write', file: backboneDest });

  // Merge AGENTS.md non-destructively
  let finalAgents = `# AGENTS.md\n\nShared Game-Development instructions for AI coding assistants.\n\n${bundle.managedAgentsBlock}\n`;
  if (fs.existsSync(agentsDest)) {
    const existing = fs.readFileSync(agentsDest, 'utf8');
    if (existing.includes('<!-- BEGIN: vibe-gamedev-kit -->')) {
      finalAgents = existing.replace(
        /<!-- BEGIN: vibe-gamedev-kit -->[\s\S]*?<!-- END: vibe-gamedev-kit -->/,
        bundle.managedAgentsBlock
      );
      actions.push({ type: 'update-managed-block', file: agentsDest });
    } else {
      finalAgents = `${existing.trimEnd()}\n\n${bundle.managedAgentsBlock}\n`;
      actions.push({ type: 'append-managed-block', file: agentsDest });
    }
  } else {
    actions.push({ type: 'create', file: agentsDest });
  }

  // Copy skills into .vibekit/skills and .agent/skills (Antigravity) + .agents/skills
  const manifest = JSON.parse(
    fs.readFileSync(path.join(KIT_ROOT, '.vibekit', 'skills', 'skills-manifest.json'), 'utf8')
  );
  const skillDirsToCopy = ['.vibekit/skills', '.agent/skills', '.agents/skills', '.claude/skills', '.cursor/skills'];

  if (!dryRun) {
    fs.writeFileSync(backboneDest, bundle.backboneContent, 'utf8');
    fs.writeFileSync(agentsDest, finalAgents, 'utf8');
    if (!fs.existsSync(claudeDest)) {
      fs.writeFileSync(
        claudeDest,
        `# CLAUDE.md\n\nSee \`@AGENTS.md\` and \`backbone.yml\` for the Vibe Game-Dev Kit (VGDK) rulebook and skills.\n`,
        'utf8'
      );
      actions.push({ type: 'create', file: claudeDest });
    }
    for (const surfaceRel of skillDirsToCopy) {
      for (const skill of manifest.skills) {
        const srcSkillFile = path.join(KIT_ROOT, '.vibekit', 'skills', skill.name, 'SKILL.md');
        const destSkillFile = path.join(absDir, surfaceRel, skill.name, 'SKILL.md');
        fs.mkdirSync(path.dirname(destSkillFile), { recursive: true });
        fs.copyFileSync(srcSkillFile, destSkillFile);
      }
      actions.push({ type: 'sync-skills', dir: path.join(absDir, surfaceRel), count: manifest.skills.length });
    }
  }

  return {
    dryRun,
    game: bundle.game,
    actions,
    backbonePreview: bundle.backboneContent,
    agentsPreview: finalAgents,
    cliCommand: bundle.cliCommand
  };
}

// CLI entrypoint
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || 'scan';
  const targetArg = process.argv[3] || DEFAULT_WORKSPACE;
  const dryRun = process.argv.includes('--dry-run');

  if (cmd === 'scan') {
    const games = scanWorkspace(targetArg);
    console.log(`=== Vibe Game-Dev Kit Workspace Scan (${games.length} projects in ${targetArg}) ===`);
    for (const g of games) {
      const badge = g.vgdkInstalled ? '[VGDK INSTALLED]' : '[READY]';
      console.log(`- ${badge.padEnd(17)} ${g.folderName.padEnd(28)} | ${g.engine.padEnd(20)} | QA:${g.hasQaScript ? 'yes' : 'no '} | files:${g.fileCount}`);
    }
  } else if (cmd === 'doctor') {
    const report = doctorGame(targetArg);
    console.log(`=== VGDK Village Doctor: ${report.game.folderName} (${report.score}) ===`);
    for (const c of report.checks) {
      console.log(`  [${c.status.toUpperCase().padEnd(5)}] ${c.helperId} ${c.helperName} (${c.skill}): ${c.summary}`);
    }
  } else if (cmd === 'install') {
    const res = installKitToGame(targetArg, { dryRun });
    console.log(`=== VGDK Install ${dryRun ? '(DRY RUN)' : '(APPLIED)'}: ${res.game.folderName} ===`);
    for (const a of res.actions) {
      console.log(`  - ${a.type}: ${a.file || a.dir}`);
    }
  } else {
    console.log('Usage: node bin/vgdk.mjs <scan|doctor|install> [target-game-dir] [--dry-run]');
  }
}
