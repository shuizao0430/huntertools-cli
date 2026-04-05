#!/usr/bin/env node

/**
 * postinstall script - automatically install shell completion files.
 *
 * Detects the user's default shell and writes completion scripts for the
 * primary `huntertools` command while keeping the legacy `opencli` alias
 * available during migration.
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BASH_COMPLETION = `# Bash completion for huntertools (auto-installed)
_huntertools_completions() {
  local cur words cword
  _get_comp_words_by_ref -n : cur words cword

  local completions
  completions=$(huntertools --get-completions --cursor "$cword" "\${words[@]:1}" 2>/dev/null)

  COMPREPLY=( $(compgen -W "$completions" -- "$cur") )
  __ltrim_colon_completions "$cur"
}
complete -F _huntertools_completions huntertools
complete -F _huntertools_completions opencli
`;

const ZSH_COMPLETION = `#compdef huntertools opencli
# Zsh completion for huntertools (auto-installed)
_huntertools() {
  local -a completions
  local cword=$((CURRENT - 1))
  completions=(\${(f)"$(huntertools --get-completions --cursor "$cword" "\${words[@]:1}" 2>/dev/null)"})
  compadd -a completions
}
compdef _huntertools huntertools
compdef _huntertools opencli
`;

const FISH_COMPLETION = `# Fish completion for huntertools (auto-installed)
complete -c huntertools -f -a '(
  set -l tokens (commandline -cop)
  set -l cursor (count (commandline -cop))
  huntertools --get-completions --cursor $cursor $tokens[2..] 2>/dev/null
)'
complete -c opencli -w huntertools
`;

function detectShell() {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('bash')) return 'bash';
  if (shell.includes('fish')) return 'fish';
  return null;
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function ensureZshFpath(completionsDir, zshrcPath) {
  const fpathLine = `fpath=(${completionsDir} $fpath)`;
  const autoloadLine = `autoload -Uz compinit && compinit`;
  const marker = '# huntertools completion';

  if (!existsSync(zshrcPath)) {
    writeFileSync(zshrcPath, `${marker}\n${fpathLine}\n${autoloadLine}\n`, 'utf8');
    return;
  }

  const content = readFileSync(zshrcPath, 'utf8');
  if (content.includes(completionsDir)) return;

  const lines = content.split('\n');
  let insertIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('#')) continue;
    if (/compinit/.test(trimmed) || /source\s+.*oh-my-zsh\.sh/.test(trimmed)) {
      insertIdx = i;
      break;
    }
  }

  if (insertIdx !== -1) {
    lines.splice(insertIdx, 0, marker, fpathLine);
    writeFileSync(zshrcPath, lines.join('\n'), 'utf8');
    return;
  }

  appendFileSync(zshrcPath, `\n${marker}\n${fpathLine}\n${autoloadLine}\n`, 'utf8');
}

function main() {
  if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) return;

  const isGlobal = process.env.npm_config_global === 'true';
  if (!isGlobal) return;

  const shell = detectShell();
  if (!shell) return;

  const home = homedir();

  try {
    switch (shell) {
      case 'zsh': {
        const completionsDir = join(home, '.zsh', 'completions');
        const completionFile = join(completionsDir, '_huntertools');
        ensureDir(completionsDir);
        writeFileSync(completionFile, ZSH_COMPLETION, 'utf8');
        ensureZshFpath(completionsDir, join(home, '.zshrc'));
        console.log(`Installed Zsh completion to ${completionFile}`);
        console.log('  Restart your shell or run: source ~/.zshrc');
        break;
      }
      case 'bash': {
        const completionsDir = join(home, '.bash_completion.d');
        const completionFile = join(completionsDir, 'huntertools');
        ensureDir(completionsDir);
        writeFileSync(completionFile, BASH_COMPLETION, 'utf8');

        const bashrcPath = join(home, '.bashrc');
        if (existsSync(bashrcPath)) {
          const content = readFileSync(bashrcPath, 'utf8');
          if (!content.includes('.bash_completion.d/huntertools')) {
            appendFileSync(
              bashrcPath,
              `\n# huntertools completion\n[ -f "${completionFile}" ] && source "${completionFile}"\n`,
              'utf8',
            );
          }
        }

        console.log(`Installed Bash completion to ${completionFile}`);
        console.log('  Restart your shell or run: source ~/.bashrc');
        break;
      }
      case 'fish': {
        const completionsDir = join(home, '.config', 'fish', 'completions');
        const completionFile = join(completionsDir, 'huntertools.fish');
        ensureDir(completionsDir);
        writeFileSync(completionFile, FISH_COMPLETION, 'utf8');
        console.log(`Installed Fish completion to ${completionFile}`);
        console.log('  Restart your shell to activate.');
        break;
      }
    }
  } catch (err) {
    if (process.env.HUNTERTOOLS_VERBOSE || process.env.OPENCLI_VERBOSE) {
      console.error(`Warning: Could not install shell completion: ${err.message}`);
    }
  }

  console.log('');
  console.log('  \x1b[1mNext step - Browser Bridge setup\x1b[0m');
  console.log('  LinkedIn and Recruiter browser commands require the extension:');
  console.log('  1. Download: https://github.com/shuizao0430/huntertools-cli/releases');
  console.log('  2. Open chrome://extensions -> enable Developer Mode -> Load unpacked');
  console.log('');
  console.log('  Then run \x1b[36mhuntertools doctor\x1b[0m to verify.');
  console.log('  The legacy \x1b[36mopencli doctor\x1b[0m alias still works during migration.');
  console.log('');
}

main();
