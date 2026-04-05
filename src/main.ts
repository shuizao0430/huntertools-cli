#!/usr/bin/env node
/**
 * HunterToolsCLI — recruiter-first browser automation CLI.
 */

// Ensure standard system paths are available for child processes.
// Some environments (GUI apps, cron, IDE terminals) launch with a minimal PATH
// that excludes /usr/local/bin, /usr/sbin, etc., causing external CLIs to fail.
if (process.platform !== 'win32') {
  const std = ['/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];
  const cur = new Set((process.env.PATH ?? '').split(':').filter(Boolean));
  for (const p of std) cur.add(p);
  process.env.PATH = [...cur].join(':');
}

import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverClis, discoverPlugins, ensureUserCliCompatShims, USER_CLIS_DIR, LEGACY_USER_CLIS_DIR } from './discovery.js';
import { getCompletions } from './completion.js';
import { runCli } from './cli.js';
import { emitHook } from './hooks.js';
import { installNodeNetwork } from './node-network.js';
import { registerUpdateNoticeOnExit, checkForUpdateBackground } from './update-check.js';
import { EXIT_CODES } from './errors.js';
import { ENABLE_RECRUITING_ONLY_MODE } from './product-profile.js';

installNodeNetwork();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUILTIN_CLIS = path.resolve(__dirname, 'clis');
const USER_CLIS = USER_CLIS_DIR;
const LEGACY_USER_CLIS = LEGACY_USER_CLIS_DIR;

// Sequential: plugins must run after built-in discovery so they can override built-in commands.
await ensureUserCliCompatShims();
if (ENABLE_RECRUITING_ONLY_MODE) {
  await discoverClis(BUILTIN_CLIS);
} else {
  await discoverClis(BUILTIN_CLIS, USER_CLIS, LEGACY_USER_CLIS);
  await discoverPlugins();
}

// Register exit hook: notice appears after command output (same as npm/gh/yarn)
registerUpdateNoticeOnExit();
// Kick off background fetch for next run (non-blocking)
checkForUpdateBackground();

// ── Fast-path: handle --get-completions before commander parses ─────────
// Usage: huntertools --get-completions --cursor <N> [word1 word2 ...]
const getCompIdx = process.argv.indexOf('--get-completions');
if (getCompIdx !== -1) {
  const rest = process.argv.slice(getCompIdx + 1);
  let cursor: number | undefined;
  const words: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--cursor' && i + 1 < rest.length) {
      cursor = parseInt(rest[i + 1], 10);
      i++; // skip the value
    } else {
      words.push(rest[i]);
    }
  }
  if (cursor === undefined) cursor = words.length;
  const candidates = getCompletions(words, cursor);
  process.stdout.write(candidates.join('\n') + '\n');
  process.exit(EXIT_CODES.SUCCESS);
}

await emitHook('onStartup', { command: '__startup__', args: {} });
runCli(BUILTIN_CLIS, USER_CLIS);
